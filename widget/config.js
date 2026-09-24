/*
 * Stefnuhringur — sjálfgefnar stillingar, lestur færibreyta, rúmfræði og
 * listi heimsmarkmiðanna. Hleðst á eftir content.js og á undan widget.js.
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
    radius:  { def: 14,     num: [0, 40] }
  };

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
    defaults: defaults,
    startKeys: startKeys,
    parse: parse,
    changed: changed,
    frame: frame,
    aspect: aspect
  };
})(window);
