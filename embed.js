/*
 * Stefnuhringur — innfellingarskrifta (embed loader).
 *
 * Notkun á hvaða vefsíðu sem er:
 *
 *   <script src="https://reykjanesbaer.github.io/stefnuhringur/embed.js"
 *           data-speed="90"
 *           data-visible="60"
 *           data-align="center"
 *           data-max-width="640px"></script>
 *
 * Skriftan býr til iframe á staðnum þar sem hún stendur. Hæðin fylgir
 * breiddinni (aspect-ratio) og græjan staðfestir hana með postMessage, svo
 * ekkert autt svæði verður eftir og ekkert klippist af. Allar data-*
 * færibreytur eru sendar áfram á græjuna (data-speed -> ?speed=...), nema
 * data-align og data-max-width sem stýra aðeins iframe-inum sjálfum.
 */
(function () {
  'use strict';

  var script = document.currentScript;
  if (!script) return;

  /* Slóð á möppuna sem embed.js er í */
  var base = script.src.replace(/[^/]*$/, '');
  var frameId = 'sh-' + Math.random().toString(36).slice(2, 10);

  /* Öll data-* gildi verða að URL-færibreytum */
  var params = new URLSearchParams();
  for (var i = 0; i < script.attributes.length; i++) {
    var attr = script.attributes[i];
    if (attr.name.indexOf('data-') !== 0) continue;
    var key = attr.name.slice(5).replace(/-([a-z])/g, function (m, c) {
      return c.toUpperCase();
    });
    /* Þessar stýra umgjörðinni, ekki græjunni — ekki sendar áfram */
    if (key === 'width' || key === 'maxWidth' || key === 'align' || key === 'title') continue;
    params.set(key, attr.value);
  }
  params.set('frameId', frameId);

  var iframe = document.createElement('iframe');
  iframe.src = base + 'widget/?' + params.toString();
  iframe.title = script.getAttribute('data-title') || 'Stefnuhringur Reykjanesbæjar';
  iframe.loading = 'lazy';
  iframe.setAttribute('scrolling', 'no');
  iframe.setAttribute('frameborder', '0');
  iframe.style.cssText = 'display:block;border:0;width:100%;height:auto;' +
    'aspect-ratio:' + aspect(script) + ';max-width:' +
    (script.getAttribute('data-max-width') || '640px') + ';' +
    margins(script.getAttribute('data-align')) +
    'color-scheme:normal;overflow:hidden';

  script.parentNode.insertBefore(iframe, script);

  /* Hæð staðfest þegar græjan lætur vita (t.d. ef aspect-ratio er hunsað) */
  window.addEventListener('message', function (event) {
    var data = event.data;
    if (!data || data.type !== 'stefnuhringur:height') return;
    if (data.id && data.id !== frameId) return;
    if (event.source !== iframe.contentWindow) return;
    var h = parseInt(data.height, 10);
    if (isFinite(h) && h > 0 && h < 3000) iframe.style.height = h + 'px';
  });

  /*
   * Staðsetning á síðunni. Auto-spássíur yfirskrifa miðjun sem kemur úr
   * umlykjandi gámi, hvort sem hún er gerð með text-align eða flex.
   */
  function margins(align) {
    if (align === 'center') return 'margin-left:auto;margin-right:auto;';
    if (align === 'right') return 'margin-left:auto;margin-right:0;';
    return 'margin-left:0;margin-right:auto;';
  }

  /*
   * Hlutfall breiddar/hæðar. Sama reikniregla og frame() í
   * widget/config.js — haldið í takt ef rúmfræðinni er breytt.
   */
  function aspect(el) {
    var E = 318, HUB = 98;
    var v = parseFloat(el.getAttribute('data-visible'));
    if (!(v >= 50 && v <= 100)) v = 50;
    var cropY = -E + 2 * E * v / 100;
    var bottom = el.getAttribute('data-hub') === 'cut' ? cropY : Math.max(cropY, HUB + 12);
    return 2 * E + ' / ' + Math.round(bottom + E);
  }
})();
