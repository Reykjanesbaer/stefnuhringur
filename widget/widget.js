/*
 * Stefnuhringur — rúmfræði, teikning, hreyfing og samskipti.
 *
 * Uppbygging SVG (sjá widget/index.html):
 *
 *   crop (clipPath)         klippir hringinn við klippilínuna
 *   └─ cam1                 aðdráttur
 *      ├─ ring              snúningur: fleygar, táknbólur, heimsmarkmið
 *      └─ glyphs            tákn, fylgja bólunum en alltaf upprétt; eigin
 *                           myndir (?icon-born=…) með <image>, aldrei innerHTML
 *   cam2 (ekki klippt)      sami aðdráttur
 *   └─ hub                  hvít miðja með framtíðarsýn, snýst aldrei
 *
 *   lbl-layer (HTML)        heiti og lýsingar, alltaf upprétt og lárétt.
 *   └─ lbl-stage            fylgir sömu myndavél og klippingu og SVG-ið.
 *                           HTML en ekki SVG-texti, því SVG-texti smellist
 *                           á heila pixla lóðrétt og titrar á hreyfingu.
 *
 * Ein requestAnimationFrame-lykkja sem sefur þegar ekkert hreyfist, þegar
 * græjan er utan skjás eða flipinn falinn. Öll gildi ná markgildi sínu
 * (approach) og aðeins er skrifað í DOM þegar gildi breytist (setA/setS),
 * svo kyrr hringur veldur engri endurteiknun.
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
  var sh = $('sh'), svg = $('svg'), cam1 = $('cam1'), cam2 = $('cam2');
  var ringG = $('ring'), glyphsG = $('glyphs');
  var lblLayer = $('lblLayer'), lblStage = $('lblStage');
  var hubG = $('hub'), cropRect = $('cropRect'), live = $('live');
  var defs = svg.querySelector('defs');
  var segs = [];

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

      /* Innihald táknsins er sett í applyIcons(); hér er aðeins hópurinn sem hreyfist */
      var glyph = el('g', { 'class': 'glyph' }, glyphsG);

      /* Heiti og lýsing sem HTML — staðsett í hverjum ramma, alltaf upprétt */
      var lg = document.createElement('div');
      lg.className = 'hl moving';
      var tH = s.title.length * G.T_LH;
      var tg = htmlLines('hl-t', s.title);
      var lines = wrap(s.desc, G.D_WRAP), dH = lines.length * G.D_LH;
      var dg = htmlLines('hl-d', lines);
      lg.appendChild(tg);
      lg.appendChild(dg);
      lblStage.appendChild(lg);

      g.addEventListener('click', function () { toggleZoom(i); });
      g.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleZoom(i); }
      });

      segs.push({ g: g, shape: shape, tiles: tiles, glyph: glyph, iconSig: null, lg: lg, tg: tg, dg: dg, tH: tH, dH: dH, open: 0, dim: false });
    });

    hubG.setAttribute('class', 'hub');
    el('circle', { r: G.HUB }, hubG);
    el('text', { 'class': 'hub-t', 'text-anchor': 'middle', y: -49 }, hubG).textContent = content.hub.title;
    var hd = el('text', { 'class': 'hub-d', 'text-anchor': 'middle' }, hubG);
    content.hub.lines.forEach(function (line, j) {
      el('tspan', { x: 0, y: -27 + j * 12 }, hd).textContent = line;
    });
    hubG.addEventListener('click', function () { setZoom(null); });

    /* Klippiramminn er alltaf jafn breiður; aðeins hæðin breytist */
    cropRect.setAttribute('x', -G.E - 10);
    cropRect.setAttribute('y', -G.E - 60);
    cropRect.setAttribute('width', 2 * G.E + 20);
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
    idle: true         /* lykkjan stöðvuð og allt kyrrt */
  };

  function startAngle(key) {
    for (var i = 0; i < SEGMENTS.length; i++) {
      if (SEGMENTS[i].key === key) return -SEGMENTS[i].angle;
    }
    return 0;
  }

  function applyOptions(o) {
    var prevStart = opts.start;
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

    while (S.glyph.firstChild) S.glyph.removeChild(S.glyph.firstChild);
    if (S.mask) { S.mask.parentNode.removeChild(S.mask); S.mask = null; }

    var box = { x: f2(-h), y: f2(-h), width: f2(size), height: f2(size) };
    var img;
    if (tint === 'none') {
      img = el('image', { href: href, x: box.x, y: box.y, width: box.width, height: box.height,
        preserveAspectRatio: 'xMidYMid meet' }, S.glyph);
    } else {
      var id = 'glyph-mask-' + s.key;
      S.mask = el('mask', { id: id, 'mask-type': 'alpha', maskUnits: 'userSpaceOnUse',
        maskContentUnits: 'userSpaceOnUse', x: box.x, y: box.y, width: box.width, height: box.height }, defs);
      img = el('image', { href: href, x: box.x, y: box.y, width: box.width, height: box.height,
        preserveAspectRatio: 'xMidYMid meet' }, S.mask);
      el('rect', { x: box.x, y: box.y, width: box.width, height: box.height,
        fill: '#' + tint, mask: 'url(#' + id + ')' }, S.glyph);
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
    running = true;
    st.idle = false;
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
    if (tgt === null) {
      var tv = targetVel();
      st.vel = approach(st.vel, tv, ease(dt, 3.5), 0.01);
      st.rotation += st.vel * dt;
      /* tv líka: fyrsti rammi getur fengið dt = 0 og þá hefur hraðinn ekki breyst */
      moving = tv !== 0 || st.vel !== 0;
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
    setA(cam1, 'transform', tf);
    setA(cam2, 'transform', tf);
    setA(ringG, 'transform', 'rotate(' + st.rotation.toFixed(3) + ')');

    /* Í aðdrætti færist klippilínan niður svo hlutinn klippist ekki */
    var clipY = st.cropY + (st.bottom - st.cropY) * st.zOpen;
    setA(cropRect, 'height', f2(clipY + G.E + 60));

    /* HTML-textinn fylgir sömu myndavél: px-kvarði · viewBox · myndavél */
    setS(lblStage, 'transform', 'scale(' + pxScale.toFixed(5) + ') translate(' +
      (-vb.x + st.F[0]).toFixed(3) + 'px, ' + (-vb.y + st.F[1]).toFixed(3) + 'px) scale(' +
      c.k.toFixed(4) + ') translate(' + (-c.px).toFixed(3) + 'px, ' + (-c.py).toFixed(3) + 'px)');
    /* …og sömu klippilínu og hringurinn, líka á meðan aðdráttur hreyfist */
    setS(lblLayer, 'clipPath', 'inset(0 0 ' +
      Math.max(0, (1 - (clipY - vb.y) / vb.h) * 100).toFixed(3) + '% 0)');

    /*
     * Samsett lag (will-change) á meðan eitthvað hreyfist, svo textinn renni
     * um brot úr pixli; tekið af þegar aðdráttur er kyrr eða lykkjan hefur
     * stöðvast (hover, speed=0) svo hann teiknist skarpur.
     */
    var zoomed = st.zoomed !== null;
    var settled = st.idle || (zoomed && c.k === opts.zoom && st.zOpen === 1);

    SEGMENTS.forEach(function (s, i) {
      var S = segs[i], a = s.angle + st.rotation;
      var p = pt(G.LABEL_R, a);
      var H = S.tH + G.D_GAP + S.dH, off = S.open * (-H / 2 + S.tH / 2);
      /*
       * rotate(0.01deg) á hreyfingu: Chrome smellir ás-samsíða hliðrunum á
       * heila tækjapixla (sést við devicePixelRatio 2), en ekki snúnum lögum.
       * Tilfærslan er < 0,02 px yfir heila línu. Tekið af í kyrrum aðdrætti.
       */
      setS(S.lg, 'transform', 'translate3d(' + p[0].toFixed(3) + 'px, ' + p[1].toFixed(3) + 'px, 0)' +
        (settled ? '' : ' rotate(0.01deg)'));
      setS(S.tg, 'transform', 'translate(-50%, ' + (off - S.tH / 2).toFixed(3) + 'px)');
      setS(S.dg, 'transform', 'translate(-50%, ' + (off + S.tH / 2 + G.D_GAP).toFixed(3) + 'px)');
      setS(S.dg, 'opacity', S.open.toFixed(3));
      if (S.settled !== settled) {
        S.settled = settled;
        S.lg.classList.toggle('moving', !settled);
      }

      var gp = pt(G.BUB_RAD, a + G.BUB_OFF);
      setA(S.glyph, 'transform', 'translate(' + gp[0].toFixed(3) + ' ' + gp[1].toFixed(3) + ')');

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
    if (!moving) st.idle = true;
    draw();
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
          st.rotation = +deg;
          st.vel = 0;
          st.seek = null;
          st.idle = false;   /* mælir hreyfiferilinn, eins og í snúningi */
          draw();
        }
      };
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
