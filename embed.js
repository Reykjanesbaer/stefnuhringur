/*
 * Stefnuhringur — innfellingarskrifta (embed loader).
 *
 * Notkun á hvaða vefsíðu sem er:
 *
 *   <script src="https://reykjanesbaer.github.io/stefnuhringur/embed.js"
 *           data-speed="90"
 *           data-born="BF4C37"
 *           data-align="center"
 *           data-width="80%"
 *           data-max-width="900px"></script>
 *
 * Skriftan býr til iframe á staðnum þar sem hún stendur. Hæðin fylgir
 * breiddinni (aspect-ratio) og græjan staðfestir hana með postMessage, svo
 * ekkert autt svæði verður eftir og ekkert klippist af. Allar data-*
 * færibreytur eru sendar áfram á græjuna (data-speed -> ?speed=...,
 * data-icon-born -> ?icon-born=...), nema
 * data-align, data-width og data-max-width sem stýra aðeins iframe-inum.
 *
 *   data-width      1–100% eða 200–2000px, sjálfgefið 100%
 *   data-max-width  1–100%, 200–2000px eða none, sjálfgefið 640px
 *
 * Tala án einingar er px og ógild gildi falla á sjálfgefið. max-width er
 * alltaf klemmt við 100% svo græjan flæði aldrei út fyrir á síma.
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
    /* data-icon-born → icon-born: nafnið helst óbreytt (lágstafir, bandstrik) */
    var key = attr.name.slice(5);
    /* Þessar stýra umgjörðinni (iframe-inum), ekki græjunni — ekki sendar áfram */
    if (key === 'width' || key === 'max-width' || key === 'align' || key === 'title') continue;
    params.set(key, attr.value);
  }
  params.set('frameId', frameId);

  /*
   * Breidd og hlutföll eru staðfest með sömu föllum og kóðasmiðurinn notar
   * (parseSize, sizeCss og aspect í widget/config.js). Skráin er sótt einu
   * sinni, sama hve margar græjur eru á síðunni.
   */
  withConfig(base, function (cfg) {
    var iframe = document.createElement('iframe');
    iframe.src = base + 'widget/?' + params.toString();
    iframe.title = script.getAttribute('data-title') || 'Stefnuhringur Reykjanesbæjar';
    iframe.loading = 'lazy';
    iframe.setAttribute('scrolling', 'no');
    iframe.setAttribute('frameborder', '0');
    iframe.style.cssText = 'display:block;border:0;height:auto;' +
      cfg.sizeCss(script.getAttribute('data-width'), script.getAttribute('data-max-width')) + ';' +
      'aspect-ratio:' + cfg.aspect(cfg.parse({
        visible: script.getAttribute('data-visible'),
        hub: script.getAttribute('data-hub')
      })) + ';' +
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
      if (!isFinite(h) || h <= 0 || h >= 3000) return;
      /* aspect-ratio er nákvæmara (brot úr px); aðeins gripið inn ef það bregst */
      if (Math.abs(h - iframe.getBoundingClientRect().height) > 1) iframe.style.height = h + 'px';
    });
  });

  function withConfig(base, done) {
    if (window.StefnuConfig) { done(window.StefnuConfig); return; }
    var waiting = window.__stefnuConfigWaiting;
    if (waiting) { waiting.push(done); return; }
    waiting = window.__stefnuConfigWaiting = [done];
    var s = document.createElement('script');
    s.src = base + 'widget/config.js';
    s.onload = function () {
      window.__stefnuConfigWaiting = null;
      waiting.forEach(function (fn) { fn(window.StefnuConfig); });
    };
    (document.head || document.documentElement).appendChild(s);
  }

  /*
   * Staðsetning á síðunni. Auto-spássíur yfirskrifa miðjun sem kemur úr
   * umlykjandi gámi, hvort sem hún er gerð með text-align eða flex.
   */
  function margins(align) {
    if (align === 'center') return 'margin-left:auto;margin-right:auto;';
    if (align === 'right') return 'margin-left:auto;margin-right:0;';
    return 'margin-left:0;margin-right:auto;';
  }
})();
