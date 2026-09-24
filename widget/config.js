/*
 * Stefnuhringur — sjálfgefnar stillingar, lestur færibreyta, litir, breidd,
 * rúmfræði og listi heimsmarkmiðanna. Hleðst á eftir content.js og á undan
 * widget.js. embed.js hleður þessa skrá líka (án content.js) til að nota
 * parseSize og frame.
 *
 * Kóðasmiðurinn (index.html í rót) notar þessa sömu skrá, svo sjálfgefin
 * gildi, gildisathugun og hlutföll eru skilgreind á einum stað.
 */
(function (global) {
  'use strict';

  /* --------------------------------------------------------------------
   * Stillingar. Hver lína: sjálfgefið gildi + hvernig gildi er athugað.
   * Ógild gildi (utan bils, óþekkt orð) falla á sjálfgefið.
   * ------------------------------------------------------------------ */
  var SPEC = {
    speed:   { def: 120,    num: [0, 600] },
    dir:     { def: 'ccw',  one: ['ccw', 'cw'] },
    visible: { def: 50,     num: [50, 100] },
    zoom:    { def: 1.8,    num: [1.2, 2.5] },
    start:   { def: 'mynd', one: null /* mynd + lyklar úr content.js */ },
    hub:     { def: 'full', one: ['full', 'cut'] },
    pause:   { def: 1,      bit: true },
    desc:    { def: 1,      bit: true },
    sdg:     { def: 1,      bit: true },
    icons:   { def: 1,      bit: true },
    theme:   { def: 'auto', one: ['auto', 'light', 'dark'] },
    bg:      { def: '',     one: ['', 'transparent'] },
    radius:  { def: 14,     num: [0, 40] },
    iconsize: { def: 100,   num: [60, 140] },
    icontint: { def: 'none', color: true, none: true }
  };

  /* --------------------------------------------------------------------
   * Litir. Hex án #, en # og %23 leyfð, hvaða hástafir sem er.
   * Sjálfgefin gildi koma úr content.js. bgcolor er tómt = eftir þema.
   * ------------------------------------------------------------------ */
  var content = global.StefnuContent || { segments: [], colors: {} };
  var COLOR_KEYS = content.segments.map(function (s) { return s.key; })
    .concat(['text', 'hubbg', 'hubtitle', 'hubtext', 'bgcolor']);

  function hexOf(c) { return c ? String(c).replace(/^#/, '').toUpperCase() : ''; }

  content.segments.forEach(function (s) { SPEC[s.key] = { def: hexOf(s.color), color: true }; });
  ['text', 'hubbg', 'hubtitle', 'hubtext'].forEach(function (k) {
    SPEC[k] = { def: hexOf(content.colors && content.colors[k]), color: true };
  });
  SPEC.bgcolor = { def: '', color: true, empty: true };

  /* „BF4C37“, „#bf4c37“, „%23BF4C37“ og „f00“ → „BF4C37“ / „FF0000“; annars null */
  function parseColor(raw) {
    if (raw === null || raw === undefined) return null;
    var v = String(raw).trim().replace(/^(#|%23)/i, '');
    if (/^[0-9a-f]{3}$/i.test(v)) v = v.replace(/./g, function (c) { return c + c; });
    return /^[0-9a-f]{6}$/i.test(v) ? v.toUpperCase() : null;
  }

  /* --------------------------------------------------------------------
   * Eigin tákn: ?icon-born=<slóð> eða none. Ógild slóð → sjálfgefið tákn.
   * ------------------------------------------------------------------ */
  var ICON_KEYS = content.segments.map(function (s) { return 'icon-' + s.key; });
  ICON_KEYS.forEach(function (k) { SPEC[k] = { def: '', icon: true }; });

  var ICON_EXT = /\.(svg|png|webp)$/i;

  /*
   * Leyfð: https://-slóðir, eða slóðir innan repósins (icons/minn.svg,
   * /stefnuhringur/widget/icons/…), með endingunni .svg, .png eða .webp.
   * Allt annað (javascript:, data:, http:, //host, .gif …) → null.
   * Skilar hreinsaðri slóð, 'none' eða null.
   */
  function parseIcon(raw) {
    if (raw === null || raw === undefined) return null;
    var v = String(raw).trim();
    if (v.toLowerCase() === 'none') return 'none';
    if (!v || v.length > 2000 || /[\s\\"'<>`]/.test(v)) return null;
    if (/^https:\/\//i.test(v)) {
      var u;
      try { u = new URL(v); } catch (e) { return null; }
      if (u.protocol !== 'https:' || u.username || u.password) return null;
      return ICON_EXT.test(u.pathname) ? u.href : null;
    }
    /* Innan repósins: engin skema (ekkert „:“) og ekki „//host“ */
    if (v.indexOf(':') !== -1 || /^\/\//.test(v)) return null;
    if (!/^[\w\-./%~]+$/.test(v)) return null;
    return ICON_EXT.test(v.split(/[?#]/)[0]) ? v : null;
  }

  var KEYS = Object.keys(SPEC);

  function startKeys() {
    var segs = (global.StefnuContent && global.StefnuContent.segments) || [];
    return ['mynd'].concat(segs.map(function (s) { return s.key; }));
  }

  function defaults() {
    var o = {};
    KEYS.forEach(function (k) { o[k] = SPEC[k].def; });
    return o;
  }

  /* Eitt gildi athugað; skilar sjálfgefnu ef það stenst ekki */
  function check(key, raw) {
    var s = SPEC[key];
    if (raw === null || raw === undefined) return s.def;
    if (s.color) {
      if (s.empty && String(raw).trim() === '') return '';
      if (s.none && String(raw).trim().toLowerCase() === 'none') return 'none';
      return parseColor(raw) || s.def;
    }
    if (s.icon) return parseIcon(raw) || s.def;
    var v = String(raw).trim().toLowerCase();
    if (s.num) {
      if (!/^-?\d+(\.\d+)?$/.test(v)) return s.def;
      var n = parseFloat(v);
      return n >= s.num[0] && n <= s.num[1] ? n : s.def;
    }
    if (s.bit) return v === '1' ? 1 : v === '0' ? 0 : s.def;
    var allowed = s.one || startKeys();
    return allowed.indexOf(v) !== -1 ? v : s.def;
  }

  /* Allar stillingar úr query-streng eða hlut (t.d. frá kóðasmiðnum) */
  function parse(source) {
    var get;
    if (typeof source === 'string' || source === undefined) {
      var q = new URLSearchParams(source === undefined ? global.location.search : source);
      get = function (k) { return q.get(k); };
    } else {
      get = function (k) { return source[k]; };
    }
    var o = {};
    KEYS.forEach(function (k) { o[k] = check(k, get(k)); });
    return o;
  }

  /* Aðeins þær stillingar sem víkja frá sjálfgefnu, í fastri röð */
  function changed(o) {
    var out = [];
    KEYS.forEach(function (k) {
      if (o[k] !== SPEC[k].def) out.push([k, String(o[k])]);
    });
    return out;
  }

  /* --------------------------------------------------------------------
   * Rúmfræði, í SVG-einingum með miðju í 0,0. Sjá README.
   * ------------------------------------------------------------------ */
  var GEO = {
    RV: 300,          /* umritaður radíus sexhyrnings, horn beint upp   */
    HUB: 98,          /* radíus miðjunnar                                */
    GAP: 18,          /* bil milli hluta (samsíða, jöfn breidd)          */
    HUB_GAP: 9,       /* bil milli hluta og miðju                        */
    CORNER: 12,       /* rúnnun ytri horna                               */
    BUB_R: 27,        /* radíus táknbólu                                 */
    BUB_RAD: 283,     /* fjarlægð táknbólu frá miðju                     */
    BUB_OFF: 17,      /* táknbóla, gráður frá miðlínu                    */
    GLYPH: 34,        /* stærð tákns                                     */
    LABEL_R: 186,     /* miðja texta á miðlínu                           */
    TILE: 24,         /* heimsmarkmiðareitur                             */
    TILE_GAP: 3,
    TILE_OFF: -12,    /* reitaröð, gráður frá miðlínu                    */
    TILE_OUT: 6,      /* fjarlægð reita út fyrir brúnina                 */
    E: 318,           /* hálf breidd rammans (nær yfir allan snúning)    */
    T_LH: 19,         /* línubil heitis                                  */
    D_LH: 10.4,       /* línubil lýsingar                                */
    D_GAP: 7,         /* bil milli heitis og lýsingar                    */
    D_WRAP: 27        /* stafir í línu lýsingar                          */
  };

  /*
   * Lóðrétt afmörkun. cropY er klippilínan; bottom er neðri brún rammans.
   * Með hub=full nær ramminn niður fyrir miðjuna svo hún sjáist öll.
   */
  function frame(o) {
    var E = GEO.E;
    var cropY = -E + 2 * E * (o.visible / 100);
    var bottom = o.hub === 'full' ? Math.max(cropY, GEO.HUB + 12) : cropY;
    return { cropY: cropY, bottom: bottom, width: 2 * E, height: bottom + E };
  }

  /* --------------------------------------------------------------------
   * Breidd iframe-sins (umgjörð, fer ekki í slóð græjunnar).
   * „80%“, „480px“ eða „480“ (= px). Gildi utan marka → null.
   * ------------------------------------------------------------------ */
  var SIZE = {
    width:    { def: '100%',  pct: [1, 100], px: [200, 2000], none: false },
    maxWidth: { def: '640px', pct: [1, 100], px: [200, 2000], none: true }
  };

  function parseSize(raw, kind) {
    var s = SIZE[kind];
    if (raw === null || raw === undefined) return null;
    var v = String(raw).trim().toLowerCase().replace(/\s+/g, '');
    if (s.none && v === 'none') return 'none';
    var m = /^(\d+(?:\.\d+)?)(%|px)?$/.exec(v);
    if (!m) return null;
    var n = parseFloat(m[1]), unit = m[2] || 'px';
    var lim = unit === '%' ? s.pct : s.px;
    return n >= lim[0] && n <= lim[1] ? n + unit : null;
  }

  /* Gilt gildi eða sjálfgefið */
  function size(raw, kind) { return parseSize(raw, kind) || SIZE[kind].def; }

  /*
   * CSS fyrir breidd iframe-sins. max-width er alltaf klemmt við 100% svo
   * græjan flæði aldrei út fyrir á mjóum skjá.
   */
  function sizeCss(width, maxWidth) {
    var w = size(width, 'width'), m = size(maxWidth, 'maxWidth');
    return 'width:' + w + ';max-width:' + (m === 'none' ? '100%' : 'min(' + m + ',100%)');
  }

  /* Hlutfall breiddar/hæðar, t.d. "636 / 428" fyrir aspect-ratio */
  function aspect(o) {
    var f = frame(o);
    return f.width + ' / ' + Math.round(f.height);
  }

  /* --------------------------------------------------------------------
   * Heimsmarkmið Sameinuðu þjóðanna — íslensk heiti og opinberir litir.
   * ------------------------------------------------------------------ */
  var SDG = {
    1:  ['Engin fátækt', '#E5243B'],
    2:  ['Ekkert hungur', '#DDA63A'],
    3:  ['Heilsa og vellíðan', '#4C9F38'],
    4:  ['Menntun fyrir alla', '#C5192D'],
    5:  ['Jafnrétti kynjanna', '#FF3A21'],
    6:  ['Hreint vatn og salernisaðstaða', '#26BDE2'],
    7:  ['Sjálfbær orka', '#FCC30B'],
    8:  ['Góð atvinna og hagvöxtur', '#A21942'],
    9:  ['Nýsköpun og uppbygging', '#FD6925'],
    10: ['Aukinn jöfnuður', '#DD1367'],
    11: ['Sjálfbærar borgir og samfélög', '#FD9D24'],
    12: ['Ábyrg neysla og framleiðsla', '#BF8B2E'],
    13: ['Aðgerðir í loftslagsmálum', '#3F7E44'],
    14: ['Líf í vatni', '#0A97D9'],
    15: ['Líf á landi', '#56C02B'],
    16: ['Friður og réttlæti', '#00689D'],
    17: ['Samvinna um markmiðin', '#19486A']
  };

  /*
   * true: reitirnir eru opinberu íslensku táknin í widget/sdg/<nr>.svg.
   * false: einfaldaðir reitir (litur + númer + heiti) teiknaðir í kóða,
   * eins og í frumgerðinni. Sjá README, „Tákn og leyfi“.
   */
  var SDG_OFFICIAL = false;

  global.StefnuConfig = {
    SPEC: SPEC,
    KEYS: KEYS,
    GEO: GEO,
    SDG: SDG,
    SDG_OFFICIAL: SDG_OFFICIAL,
    COLOR_KEYS: COLOR_KEYS,
    ICON_KEYS: ICON_KEYS,
    parseIcon: parseIcon,
    parseColor: parseColor,
    SIZE: SIZE,
    parseSize: parseSize,
    size: size,
    sizeCss: sizeCss,
    defaults: defaults,
    startKeys: startKeys,
    parse: parse,
    changed: changed,
    frame: frame,
    aspect: aspect
  };
})(window);
