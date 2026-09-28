/*
 * Stefnuhringur — rúmfræði, teikning, hreyfing og samskipti.
 *
 * Uppbygging (sjá widget/index.html):
 *
 *   svg                     ákvarðar stærð græjunnar
 *   └─ cam                  aðdráttur
 *      └─ hub               hvít miðja með framtíðarsýn, snýst aldrei
 *
 *   lbl-layer (HTML)        klippt við klippilínuna
 *   └─ lbl-stage            SVG-einingar → px og sama myndavél og cam
 *      └─ rot               snýst með hringnum
 *         ├─ ring-svg       fleygar og heimsmarkmið
 *         └─ orb → up       tákn og heiti; .up mótsnýst svo þau haldist upprétt
 *
 * Af hverju HTML-lag en ekki SVG: SVG-hópur sem snýst er endurteiknaður
 * (rasteraður) í hverjum ramma á aðalþræðinum, og hver ný transform-strengur
 * er rusl sem safnast upp; ruslasöfnun (major GC) á nokkurra sek. fresti olli
 * hiksta. Nú snýst .rot (og mótsnúningur .up) sem Web Animation sem vafrinn
 * keyrir á compositor-þræði: lagið er teiknað einu sinni og aðalþráðurinn
 * gerir ekkert í jöfnum snúningi. HTML-texti rennur líka um brot úr pixli.
 *
 * JavaScript tekur aðeins við í umbreytingum (hægja á við hover, aðdráttur,
 * lyklaborðsfókus, ný upphafsstaða): þá eru hreyfingarnar settar á pásu og
 * currentTime stillt í hverjum ramma. Þegar hraðinn er aftur jafn fá
 * hreyfingarnar að spila sjálfar og lykkjan sofnar.
 */
(function () {
  'use strict';

  var cfg = window.StefnuConfig;
  var content = window.StefnuContent;
  var G = cfg.GEO;
  var SEGMENTS = content.segments;

  /* ================================================================== */
  /* Hjálparföll                                                         */
  /* ================================================================== */

  var NS = 'http://www.w3.org/2000/svg';

  function el(tag, attrs, parent) {
    var n = document.createElementNS(NS, tag);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }

  function rad(d) { return d * Math.PI / 180; }
  /* Punktur í fjarlægð r, d gráður réttsælis frá 12 */
  function pt(r, d) { return [r * Math.sin(rad(d)), -r * Math.cos(rad(d))]; }
  function add(a, b) { return [a[0] + b[0], a[1] + b[1]]; }
  function sub(a, b) { return [a[0] - b[0], a[1] - b[1]]; }
  function mul(a, s) { return [a[0] * s, a[1] * s]; }
  function len(a) { return Math.hypot(a[0], a[1]); }
  function unit(a) { return mul(a, 1 / len(a)); }
  function towards(p, q, d) { return add(p, mul(unit(sub(q, p)), d)); }
  function P(p) { return p[0].toFixed(2) + ' ' + p[1].toFixed(2); }
  function f2(n) { return n.toFixed(2); }

  /* Brýtur texta í línur sem eru mest `max` stafir */
  function wrap(text, max) {
    var out = [], cur = '';
    text.split(' ').forEach(function (w) {
      var next = (cur + ' ' + w).trim();
      if (next.length > max && cur) { out.push(cur); cur = w; } else cur = next;
    });
    if (cur) out.push(cur);
    return out;
  }

  /*
   * Fleygur með miðlínu í ci gráðum: samsíða bil að nágrönnum, rúnnuð ytri
   * horn og íhvolf innri brún í radíus HUB + HUB_GAP.
   */
  function wedgePath(ci) {
    var g = G.GAP / 2, A = pt(G.RV, ci - 30), B = pt(G.RV, ci + 30);
    var u = unit(sub(B, A)), sh = g / Math.sin(rad(60));
    var Ap = add(A, mul(u, sh)), Bp = sub(B, mul(u, sh));
    var rIn = G.HUB + G.HUB_GAP, s = Math.sqrt(rIn * rIn - g * g);
    var a = rad(ci - 30), b = rad(ci + 30);
    var IA = add(mul([Math.sin(a), -Math.cos(a)], s), mul([Math.cos(a), Math.sin(a)], g));
    var IB = add(mul([Math.sin(b), -Math.cos(b)], s), mul([-Math.cos(b), -Math.sin(b)], g));
    var A1 = towards(Ap, IA, G.CORNER), A2 = towards(Ap, Bp, G.CORNER);
    var B1 = towards(Bp, Ap, G.CORNER), B2 = towards(Bp, IB, G.CORNER);
    return 'M' + P(IA) + ' L' + P(A1) + ' Q' + P(Ap) + ' ' + P(A2) +
      ' L' + P(B1) + ' Q' + P(Bp) + ' ' + P(B2) + ' L' + P(IB) +
      ' A' + rIn + ' ' + rIn + ' 0 0 0 ' + P(IA) + 'Z';
  }

  /* Samfelldur texti úr línum miðjunnar: „hæfi-“ + „leika“ → „hæfileika“ */
  function joinLines(lines) {
    return lines.reduce(function (acc, line) {
      if (!acc) return line;
      return /[^\s-]-$/.test(acc) ? acc.slice(0, -1) + line : acc + ' ' + line;
    }, '');
  }

  function segLabel(s) { return s.title.join(' ') + '. ' + s.desc; }

  /* ================================================================== */
  /* Teikning                                                            */
  /* ================================================================== */

  var $ = function (id) { return document.getElementById(id); };
  var root = document.documentElement;
  var sh = $('sh'), svg = $('svg'), cam = $('cam');
  var ringG = $('ring'), ringSvg = $('ringSvg'), rot = $('rot');
  var lblLayer = $('lblLayer'), lblStage = $('lblStage');
  var hubG = $('hub'), live = $('live');
  var segs = [];

  /* Ytri mörk hringsins (fleygar + heimsmarkmið), í SVG-einingum */
  var RING_EXT = G.RV + G.TILE_OUT + G.TILE + 12;

  /* Staðsettur hópur í snúningslaginu með mótsnúnum innri hluta (.up) */
  function orb(p, cls) {
    var o = document.createElement('div');
    o.className = 'orb';
    o.style.transform = 'translate(' + p[0].toFixed(3) + 'px, ' + p[1].toFixed(3) + 'px)';
    var u = document.createElement('div');
    u.className = 'up ' + cls;
    u.setAttribute('aria-hidden', 'true');
    o.appendChild(u);
    rot.appendChild(o);
    return u;
  }

  function drawTiles(parent, s) {
    var M = pt(G.RV * Math.cos(rad(30)), s.angle);
    var u = unit(sub(pt(G.RV, s.angle + 30), pt(G.RV, s.angle - 30))), n = unit(M);
    var t0 = G.RV * Math.cos(rad(30)) * Math.tan(rad(G.TILE_OFF));
    var T = G.TILE;

    s.sdg.forEach(function (num, j) {
      var info = cfg.SDG[num];
      if (!info) return;
      var t = t0 + (j - (s.sdg.length - 1) / 2) * (T + G.TILE_GAP);
      var c = add(add(M, mul(u, t)), mul(n, G.TILE_OUT + T / 2));
      var tg = el('g', { 'class': 'tile', transform: 'translate(' + P(c) + ') rotate(' + s.angle + ')' }, parent);
      el('title', {}, tg).textContent = 'Heimsmarkmið ' + num + ': ' + info[0];

      if (cfg.SDG_OFFICIAL) {
        el('image', { href: 'sdg/' + num + '.svg', x: -T / 2, y: -T / 2, width: T, height: T }, tg);
        return;
      }
      /* Einfaldaður reitur: litur, númer og heiti */
      el('rect', { x: -T / 2, y: -T / 2, width: T, height: T, fill: info[1] }, tg);
      el('text', { x: -T / 2 + 2, y: -T / 2 + 9, 'font-size': 8.5, 'font-weight': 800 }, tg).textContent = num;
      var nm = el('text', { 'font-size': 2.4, 'font-weight': 700 }, tg);
      wrap(info[0].toUpperCase(), 12).slice(0, 3).forEach(function (w, k) {
        el('tspan', { x: num > 9 ? -1 : -5, y: -T / 2 + 4 + k * 2.8 }, nm).textContent = w;
      });
    });
  }

  /* Línur aðskildar með <br>; textContent, aldrei innerHTML */
  function htmlLines(cls, lines) {
    var d = document.createElement('div');
    d.className = cls;
    lines.forEach(function (line, j) {
      if (j) d.appendChild(document.createElement('br'));
      d.appendChild(document.createTextNode(line));
    });
    return d;
  }

  function build() {
    sh.setAttribute('aria-label', content.label);
    document.title = content.label;
    $('summary').textContent = content.hub.title + ': ' + joinLines(content.hub.lines);

    var ext = RING_EXT;
    ringSvg.setAttribute('viewBox', -ext + ' ' + -ext + ' ' + 2 * ext + ' ' + 2 * ext);
    ringSvg.setAttribute('width', 2 * ext);
    ringSvg.setAttribute('height', 2 * ext);
    ringSvg.style.left = ringSvg.style.top = -ext + 'px';

    SEGMENTS.forEach(function (s, i) {
      var g = el('g', {
        'class': 'seg', tabindex: '0', role: 'button',
        'aria-label': segLabel(s), 'aria-pressed': 'false'
      }, ringG);
      var shape = el('g', { 'class': 'shape', fill: s.color }, g);
      el('path', { d: wedgePath(s.angle) }, shape);
      var bub = pt(G.BUB_RAD, s.angle + G.BUB_OFF);
      el('circle', { cx: f2(bub[0]), cy: f2(bub[1]), r: G.BUB_R }, shape);

      var tiles = el('g', { 'class': 'tiles' }, g);
      drawTiles(tiles, s);

      /* Tákn: upprétt á miðri bólunni. Innihaldið er sett í applyIcons() */
      var glyph = orb(bub, 'glyph');
      var glyphSvg = el('svg', { focusable: 'false' }, glyph);

      /* Heiti og lýsing sem HTML, upprétt á miðlínu hlutans */
      var lg = orb(pt(G.LABEL_R, s.angle), 'hl');
      var tH = s.title.length * G.T_LH;
      var tg = htmlLines('hl-t', s.title);
      var lines = wrap(s.desc, G.D_WRAP), dH = lines.length * G.D_LH;
      var dg = htmlLines('hl-d', lines);
      lg.appendChild(tg);
      lg.appendChild(dg);

      g.addEventListener('click', function () { toggleZoom(i); });
      g.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleZoom(i); }
      });

      segs.push({ g: g, shape: shape, tiles: tiles, glyph: glyph, glyphSvg: glyphSvg, iconSig: null, lg: lg, tg: tg, dg: dg, tH: tH, dH: dH, open: 0, dim: false });
    });

    hubG.setAttribute('class', 'hub');
    el('circle', { r: G.HUB }, hubG);
    el('text', { 'class': 'hub-t', 'text-anchor': 'middle', y: -49 }, hubG).textContent = content.hub.title;
    var hd = el('text', { 'class': 'hub-d', 'text-anchor': 'middle' }, hubG);
    content.hub.lines.forEach(function (line, j) {
      el('tspan', { x: 0, y: -27 + j * 12 }, hd).textContent = line;
    });
    hubG.addEventListener('click', function () { setZoom(null); });
  }

  /* ================================================================== */
  /* Stillingar og staða                                                 */
  /* ================================================================== */

  var opts = cfg.parse();
  var frameId = new URLSearchParams(window.location.search).get('frameId') || '';
  var reduceMq = window.matchMedia('(prefers-reduced-motion: reduce)');

  var st = {
    rotation: 0,       /* snúningur hringsins í gráðum                    */
    vel: 0,            /* gráður á sekúndu                                */
    seek: null,        /* horn sem hringurinn snýst að (t.d. ný upphafsstaða) */
    hovered: false,    /* mús yfir græjunni                               */
    kbFocus: null,     /* hluti með lyklaborðsfókus                       */
    zoomed: null,      /* hluti í aðdrætti                                */
    zOpen: 0,          /* 0–1, hve langt aðdráttur er kominn               */
    cam: { k: 1, px: 0, py: 0 },
    F: [0, 0],         /* miðja rammans                                   */
    cropY: 0,
    bottom: 0,
    vb: { x: 0, y: 0, w: 1, h: 1 },
    wantCruise: false  /* jafn hraði náður: compositor tekur við snúningnum */
  };

  function startAngle(key) {
    for (var i = 0; i < SEGMENTS.length; i++) {
      if (SEGMENTS[i].key === key) return -SEGMENTS[i].angle;
    }
    return 0;
  }

  function applyOptions(o) {
    var prevStart = opts.start, prevDir = opts.dir;
    opts = o;

    var f = cfg.frame(opts);
    st.cropY = f.cropY;
    st.bottom = f.bottom;
    svg.setAttribute('viewBox', -G.E + ' ' + -G.E + ' ' + f.width + ' ' + f.height);
    st.vb = { x: -G.E, y: -G.E, w: f.width, h: f.height };
    measure();
    st.F = [0, -G.E + f.height / 2];
    if (st.zoomed === null) { st.cam.px = st.F[0]; st.cam.py = st.F[1]; }

    if (opts.theme === 'auto') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', opts.theme);
    if (opts.bg === 'transparent') root.setAttribute('data-bg', 'transparent');
    else root.removeAttribute('data-bg');
    root.style.setProperty('--sh-radius', opts.radius + 'px');
    applyColors();
    applyIcons();

    /* Stefnan er í keyframe-unum: ný stefna → nýjar hreyfingar á sama horni */
    if (!spin.built || opts.dir !== prevDir) {
      cruiseStop();
      buildSpin();
      spin.built = true;
    }

    segs.forEach(function (S) {
      S.tiles.style.display = opts.sdg ? '' : 'none';
    });

    /* Ný upphafsstaða: hringurinn snýst mjúklega þangað, ekkert stökk */
    if (opts.start !== prevStart) {
      setZoom(null);
      st.seek = startAngle(opts.start);
    }

    draw();
    kick();
    postHeight();
  }

  /*
   * Litir úr slóð (?born=, ?hubbg= …). Þeir eru þegar staðfestir í
   * config.js. bgcolor yfirskrifar þemað en víkur fyrir bg=transparent.
   */
  function applyColors() {
    segs.forEach(function (S, i) { S.shape.setAttribute('fill', '#' + opts[SEGMENTS[i].key]); });
    root.style.setProperty('--sh-label', '#' + opts.text);
    root.style.setProperty('--sh-hub-bg', '#' + opts.hubbg);
    root.style.setProperty('--sh-hub-title', '#' + opts.hubtitle);
    root.style.setProperty('--sh-hub-text', '#' + opts.hubtext);
    if (opts.bgcolor && opts.bg !== 'transparent') root.style.setProperty('--sh-bg', '#' + opts.bgcolor);
    else root.style.removeProperty('--sh-bg');
  }

  /*
   * Tákn. Eigin myndir eru teiknaðar með <image href>, aldrei með því að
   * sækja SVG-kóðann og setja hann inn: <image> keyrir engar skriftur úr
   * ytri SVG. Slóðirnar eru þegar staðfestar í config.js (parseIcon).
   *
   * icontint: myndin verður alfa-maski og rect í litnum er fyllt í gegnum
   * hann, svo einlit tákn (t.d. svört SVG) fá hvaða lit sem er. Án litunar
   * birtist myndin óbreytt, svo marglita PNG virka líka.
   */
  function applyIcons() {
    SEGMENTS.forEach(function (s, i) {
      var S = segs[i], v = opts['icon-' + s.key];
      var hidden = v === 'none' || !opts.icons;
      S.glyph.style.display = hidden ? 'none' : '';
      drawIcon(S, s, v && v !== 'none' ? v : s.icon);
    });
  }

  function drawIcon(S, s, href) {
    var size = G.GLYPH * opts.iconsize / 100, h = size / 2;
    var tint = opts.icontint;
    var sig = href + '|' + tint + '|' + size;
    if (sig === S.iconSig) return;
    S.iconSig = sig;

    var gs = S.glyphSvg;
    while (gs.firstChild) gs.removeChild(gs.firstChild);
    gs.setAttribute('viewBox', f2(-h) + ' ' + f2(-h) + ' ' + f2(size) + ' ' + f2(size));
    gs.setAttribute('width', f2(size));
    gs.setAttribute('height', f2(size));
    gs.style.left = gs.style.top = f2(-h) + 'px';

    var box = { x: f2(-h), y: f2(-h), width: f2(size), height: f2(size) };
    var img;
    if (tint === 'none') {
      img = el('image', { href: href, x: box.x, y: box.y, width: box.width, height: box.height,
        preserveAspectRatio: 'xMidYMid meet' }, gs);
    } else {
      var id = 'glyph-mask-' + s.key;
      var mask = el('mask', { id: id, 'mask-type': 'alpha', maskUnits: 'userSpaceOnUse',
        maskContentUnits: 'userSpaceOnUse', x: box.x, y: box.y, width: box.width, height: box.height },
        el('defs', {}, gs));
      img = el('image', { href: href, x: box.x, y: box.y, width: box.width, height: box.height,
        preserveAspectRatio: 'xMidYMid meet' }, mask);
      el('rect', { x: box.x, y: box.y, width: box.width, height: box.height,
        fill: '#' + tint, mask: 'url(#' + id + ')' }, gs);
    }

    /* Mynd sem hleðst ekki: sjálfgefna táknið í staðinn */
    if (href !== s.icon) {
      img.addEventListener('error', function () {
        if (window.console && console.warn) console.warn('[stefnuhringur] Ekki tókst að hlaða tákni:', href);
        img.setAttribute('href', s.icon);
        if (window.parent !== window) {
          try {
            window.parent.postMessage({ type: 'stefnuhringur:iconerror', id: frameId, key: s.key, url: href }, '*');
          } catch (e) { /* hunsum */ }
        }
      });
    }
  }

  function setZoom(i) {
    if (st.zoomed === i) return;
    st.zoomed = i;
    segs.forEach(function (S, j) { S.g.setAttribute('aria-pressed', j === i ? 'true' : 'false'); });
    live.textContent = i === null ? '' : segLabel(SEGMENTS[i]);
    kick();
  }

  function toggleZoom(i) { setZoom(st.zoomed === i ? null : i); }

  /* ================================================================== */
  /* Samskipti                                                           */
  /* ================================================================== */

  function segIndex(node) {
    for (var i = 0; i < segs.length; i++) if (segs[i].g === node) return i;
    return -1;
  }

  function isFocusVisible(node) {
    try { return node.matches(':focus-visible'); } catch (e) { return true; }
  }

  function bindEvents() {
    /*
     * Snertiskjáir senda pointerleave strax á eftir snertingu, svo við
     * hunsum snertibendla í enter/leave. Á snertiskjá stöðvast hringurinn
     * því ekki, heldur fer beint í aðdrátt við snertingu.
     */
    sh.addEventListener('pointerenter', function (e) {
      if (e.pointerType === 'touch') return;
      st.hovered = true;
      kick();
    });
    sh.addEventListener('pointerleave', function (e) {
      if (e.pointerType === 'touch') return;
      st.hovered = false;
      setZoom(null);
      kick();
    });

    /* Snerting eða smellur utan hluta (bakgrunnur, horn) lokar aðdrætti */
    document.addEventListener('pointerdown', function (e) {
      var t = e.target;
      while (t && t !== document) {
        if (t.classList && t.classList.contains('seg')) return;
        t = t.parentNode;
      }
      setZoom(null);
    });

    /*
     * Lyklaborðsfókus: hringurinn stöðvast og snýr hlutanum með fókus upp,
     * svo fókushringurinn sjáist líka þegar hlutinn var undir klippilínunni.
     * Músar- og snertifókus (ekki :focus-visible) hefur engin áhrif.
     */
    sh.addEventListener('focusin', function (e) {
      var i = segIndex(e.target);
      if (i === -1 || !isFocusVisible(e.target)) return;
      st.kbFocus = i;
      if (st.zoomed !== null) setZoom(i);
      kick();
    });
    sh.addEventListener('focusout', function (e) {
      if (e.relatedTarget && sh.contains(e.relatedTarget)) return;
      st.kbFocus = null;
      setZoom(null);
      kick();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' || e.key === 'Esc') setZoom(null);
    });

    if (reduceMq.addEventListener) reduceMq.addEventListener('change', kick);

    /* Kóðasmiðurinn (sami uppruni) sendir nýjar stillingar án endurhleðslu */
    window.addEventListener('message', function (e) {
      if (e.origin !== window.location.origin || e.source !== window.parent) return;
      var data = e.data;
      if (!data || data.type !== 'stefnuhringur:options' || !data.options) return;
      applyOptions(cfg.parse(data.options));
    });
  }

  /* ================================================================== */
  /* Hreyfing                                                            */
  /* ================================================================== */

  function ease(dt, rate) { return 1 - Math.exp(-dt * rate); }

  /*
   * Snúningsvél. Ein hreyfing á .rot (0 → ±360°) og mótsnúningur á hverju
   * .up. duration 360 s þýðir 1°/s við playbackRate 1, svo playbackRate er
   * hraðinn í °/s og currentTime/1000 er hornið. Stefnan er í keyframe-
   * unum (sign) svo playbackRate er alltaf jákvætt.
   *
   * cruise: hreyfingarnar spila sjálfar á compositor-þræðinum (jafn hraði).
   * Annars eru þær á pásu og setAngle() stillir currentTime úr lykkjunni.
   */
  var PERIOD = 360000;
  var spin = { anims: [], sign: 1, cruise: false, t: null, ups: [] };

  function buildSpin() {
    spin.anims.forEach(function (a) { a.cancel(); });
    spin.anims = [];
    spin.cruise = false;
    spin.t = null;
    spin.sign = opts.dir === 'cw' ? 1 : -1;
    spin.ups = [];
    segs.forEach(function (S) { spin.ups.push(S.glyph, S.lg); });
    if (typeof rot.animate === 'function') {
      var d = 360 * spin.sign, o = { duration: PERIOD, iterations: Infinity, easing: 'linear' };
      spin.anims.push(rot.animate([{ transform: 'rotate(0deg)' }, { transform: 'rotate(' + d + 'deg)' }], o));
      spin.ups.forEach(function (n) {
        spin.anims.push(n.animate([{ transform: 'rotate(0deg)' }, { transform: 'rotate(' + -d + 'deg)' }], o));
      });
      spin.anims.forEach(function (a) { a.pause(); });
    }
    setAngle(st.rotation);
  }

  function angleTime(deg) {
    return Math.round((((spin.sign * deg) % 360 + 360) % 360) * 1000 * 1000) / 1000;
  }

  /* Setur hornið beint (aðeins utan cruise) */
  function setAngle(deg) {
    var t = angleTime(deg);
    if (t === spin.t) return;
    spin.t = t;
    if (!spin.anims.length) {
      /* Vafrar án Web Animations: bein transform, eins og áður */
      var r = (t / 1000 * spin.sign).toFixed(3);
      rot.style.transform = 'rotate(' + r + 'deg)';
      spin.ups.forEach(function (n) { n.style.transform = 'rotate(' + -r + 'deg)'; });
      return;
    }
    spin.anims.forEach(function (a) { a.currentTime = t; });
  }

  /* Afhendir snúninginn compositor-þræðinum á jöfnum hraða vel (°/s) */
  function cruiseStart(vel) {
    if (spin.cruise || !spin.anims.length) return;
    var rate = Math.abs(vel), t = angleTime(st.rotation);
    var now = document.timeline.currentTime;
    /* Sami startTime á öllum svo hringur, tákn og heiti séu alltaf samstillt */
    spin.anims.forEach(function (a) {
      a.playbackRate = rate;
      a.startTime = now - t / rate;
    });
    spin.cruise = true;
    spin.t = null;
  }

  /* Tekur snúninginn aftur yfir: les hornið og setur á pásu */
  function cruiseStop() {
    if (!spin.cruise) return;
    var t = spin.anims[0].currentTime || 0;
    st.rotation = ((spin.sign * t / 1000) % 360 + 360) % 360;
    spin.anims.forEach(function (a) { a.pause(); });
    spin.cruise = false;
    spin.t = null;
    setAngle(st.rotation);
  }

  /* Næsta jafngilda horn við núverandi snúning (stysta leið) */
  function nearest(t) {
    return st.rotation + (((((t - st.rotation) % 360) + 540) % 360) - 180);
  }

  /* Horn sem hringurinn á að snúast að, eða null ef hann snýst frjálst */
  function targetAngle() {
    if (st.zoomed !== null) return -SEGMENTS[st.zoomed].angle;
    if (st.kbFocus !== null) return -SEGMENTS[st.kbFocus].angle;
    return st.seek;
  }

  function targetVel() {
    var paused = (opts.pause && (st.hovered || st.kbFocus !== null)) ||
      !opts.speed || reduceMq.matches;
    return paused ? 0 : (opts.dir === 'cw' ? 1 : -1) * 360 / opts.speed;
  }

  var running = false, last = 0, onScreen = true;

  function canRun() { return onScreen && !document.hidden; }

  function kick() {
    if (running || !canRun()) return;
    cruiseStop();
    running = true;
    last = performance.now();
    requestAnimationFrame(tick);
  }

  /*
   * Mjúk nálgun sem smellir á markgildið þegar munurinn er undir eps.
   * Án þess næst markgildið aldrei og skrifað væri í DOM að eilífu.
   */
  function approach(cur, target, f, eps) {
    var n = cur + (target - cur) * f;
    return Math.abs(target - n) < eps ? target : n;
  }

  /* Skrifa aðeins þegar gildi breytist (eigind / style) */
  function setA(node, name, value) {
    var c = node.__shA || (node.__shA = {});
    if (c[name] !== value) { c[name] = value; node.setAttribute(name, value); }
  }
  function setS(node, prop, value) {
    var c = node.__shS || (node.__shS = {});
    if (c[prop] !== value) { c[prop] = value; node.style[prop] = value; }
  }

  /* SVG-einingar → CSS-pixlar, fyrir HTML-textalagið */
  var pxScale = 1;
  function measure() {
    var w = svg.clientWidth;
    if (w > 0) pxScale = w / st.vb.w;
  }

  /* Uppfærir stöðu um dt sekúndur; skilar true meðan eitthvað hreyfist */
  function step(dt) {
    var zoomed = st.zoomed !== null;
    var moving = false;

    var tgt = targetAngle();
    st.wantCruise = false;
    if (tgt === null) {
      var tv = targetVel();
      st.vel = approach(st.vel, tv, ease(dt, 3.5), 0.01);
      st.rotation += st.vel * dt;
      /* Jafn hraði: compositor tekur við og snúningurinn heldur lykkjunni ekki vakandi.
         tv líka: fyrsti rammi getur fengið dt = 0 og þá hefur hraðinn ekki breyst */
      if (st.vel === tv && tv !== 0) st.wantCruise = true;
      else moving = tv !== 0 || st.vel !== 0;
    } else {
      st.vel = 0;
      var goal = nearest(tgt);
      st.rotation = approach(st.rotation, goal, ease(dt, 7), 0.005);
      if (st.rotation === goal) {
        if (!zoomed && st.kbFocus === null) st.seek = null;
      } else moving = true;
    }
    /* Höldum horninu litlu svo nákvæmni tapist ekki eftir langa keyrslu */
    if (Math.abs(st.rotation) > 3600 && st.seek === null) st.rotation %= 360;

    var f = ease(dt, 7), c = st.cam;
    var kT = zoomed ? opts.zoom : 1;
    var pxT = zoomed ? 0 : st.F[0];
    var pyT = zoomed ? -G.LABEL_R + 8 : st.F[1];
    var zT = zoomed ? 1 : 0;
    c.k = approach(c.k, kT, f, 0.0002);
    c.px = approach(c.px, pxT, f, 0.01);
    c.py = approach(c.py, pyT, f, 0.01);
    st.zOpen = approach(st.zOpen, zT, f, 0.001);
    if (c.k !== kT || c.px !== pxT || c.py !== pyT || st.zOpen !== zT) moving = true;

    var fo = ease(dt, 8);
    segs.forEach(function (S, i) {
      var oT = opts.desc || st.zoomed === i ? 1 : 0;
      S.open = approach(S.open, oT, fo, 0.001);
      if (S.open !== oT) moving = true;
    });

    return moving;
  }

  function draw() {
    var c = st.cam, vb = st.vb;
    var tf = 'translate(' + st.F[0] + ' ' + f2(st.F[1]) + ') scale(' + c.k.toFixed(4) +
      ') translate(' + (-c.px).toFixed(3) + ' ' + (-c.py).toFixed(3) + ')';
    setA(cam, 'transform', tf);
    if (!spin.cruise) setAngle(st.rotation);

    /* Í aðdrætti færist klippilínan niður svo hlutinn klippist ekki */
    var clipY = st.cropY + (st.bottom - st.cropY) * st.zOpen;

    /* Hringlagið fylgir sömu myndavél: px-kvarði · viewBox · myndavél */
    setS(lblStage, 'transform', 'scale(' + pxScale.toFixed(5) + ') translate(' +
      (-vb.x + st.F[0]).toFixed(3) + 'px, ' + (-vb.y + st.F[1]).toFixed(3) + 'px) scale(' +
      c.k.toFixed(4) + ') translate(' + (-c.px).toFixed(3) + 'px, ' + (-c.py).toFixed(3) + 'px)');
    /* …og klippist við klippilínuna, líka á meðan aðdráttur hreyfist */
    setS(lblLayer, 'clipPath', 'inset(0 0 ' +
      Math.max(0, (1 - (clipY - vb.y) / vb.h) * 100).toFixed(3) + '% 0)');

    var zoomed = st.zoomed !== null;
    SEGMENTS.forEach(function (s, i) {
      var S = segs[i];
      var H = S.tH + G.D_GAP + S.dH, off = S.open * (-H / 2 + S.tH / 2);
      setS(S.tg, 'transform', 'translate(-50%, ' + (off - S.tH / 2).toFixed(3) + 'px)');
      setS(S.dg, 'transform', 'translate(-50%, ' + (off + S.tH / 2 + G.D_GAP).toFixed(3) + 'px)');
      setS(S.dg, 'opacity', S.open.toFixed(3));

      var dim = zoomed && st.zoomed !== i;
      if (dim !== S.dim) {
        S.dim = dim;
        S.g.classList.toggle('dim', dim);
        S.lg.classList.toggle('dim', dim);
        S.glyph.classList.toggle('dim', dim);
      }
    });
  }

  function tick(now) {
    if (!canRun()) { running = false; return; }
    var dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
    last = now;
    var moving = step(dt);
    draw();
    if (st.wantCruise) cruiseStart(st.vel);
    if (moving) requestAnimationFrame(tick);
    else running = false;
  }

  /* ================================================================== */
  /* Hæð send á foreldrasíðu (fyrir sjálfvirka stærð á iframe)           */
  /* ================================================================== */

  var lastHeight = 0;

  function postHeight() {
    if (window.parent === window) return;
    var h = Math.ceil(sh.getBoundingClientRect().height);
    if (h === lastHeight || h === 0) return;
    lastHeight = h;
    try {
      window.parent.postMessage({ type: 'stefnuhringur:height', id: frameId, height: h }, '*');
    } catch (e) { /* hunsum */ }
  }

  /* ================================================================== */
  /* Keyrsla                                                             */
  /* ================================================================== */

  function start() {
    build();
    bindEvents();

    st.rotation = startAngle(opts.start);
    segs.forEach(function (S) { S.open = opts.desc ? 1 : 0; });
    var initial = opts;
    opts = cfg.parse('');
    opts.start = initial.start;
    applyOptions(initial);
    st.cam.px = st.F[0];
    st.cam.py = st.F[1];
    draw();

    if (typeof IntersectionObserver !== 'undefined') {
      new IntersectionObserver(function (entries) {
        onScreen = entries[entries.length - 1].isIntersecting;
        kick();
      }).observe(sh);
    }
    document.addEventListener('visibilitychange', kick);

    /* Ný stærð: nýr px-kvarði fyrir textalagið, teiknað strax (lykkjan getur sofið) */
    function onResize() { measure(); draw(); postHeight(); }
    if (typeof ResizeObserver !== 'undefined') {
      new ResizeObserver(onResize).observe(sh);
    } else {
      window.addEventListener('resize', onResize);
    }

    /* Prófunarkrókur, aðeins með ?debug=1 */
    if (new URLSearchParams(window.location.search).get('debug') === '1') {
      window.__stefnuhringur = {
        setRotation: function (deg) {
          cruiseStop();
          st.rotation = +deg;
          st.vel = 0;
          st.seek = null;
          draw();
        },
        state: function () { return { rotation: st.rotation, vel: st.vel, cruise: spin.cruise, running: running }; }
      };
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
