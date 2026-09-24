/*
 * Stefnuhringur — efni hringsins.
 *
 * Þetta er EINA skráin sem ritstjórar þurfa að snerta: textar, litir,
 * tákn og heimsmarkmið hverrar áherslu. Allt annað (lögun, hreyfing,
 * stillingar) er í widget.js og config.js.
 *
 * Textarnir eru orðréttir úr upprunalegu myndinni, líka bandstrikuðu
 * línuskiptin í miðjunni. Lýsingar áherslnanna eru brotnar sjálfkrafa.
 *
 *   key    Stuttur lykill, notaður í ?start=<lykill>. Ekki breyta nema
 *          uppfæra líka payload/blocks/Stefnuhringur/config.ts.
 *   angle  Stefna miðlínu hlutans í gráðum, réttsælis frá 12 (−30 = efst
 *          til vinstri eins og á myndinni). Sex hlutar með 60° millibili.
 *   color  Litur hlutans (hex).
 *   title  Heiti, ein lína á hvert stak.
 *   desc   Lýsing (sýnd alltaf eða aðeins við aðdrátt, sjá ?desc=).
 *   sdg    Númer heimsmarkmiða sem birtast utan við brúnina, í þessari röð.
 *   icon   Hvítt SVG-tákn í widget/icons/.
 */
(function (global) {
  'use strict';

  global.StefnuContent = {
    label: 'Stefnuhringur Reykjanesbæjar',

    hub: {
      title: 'Framtíðarsýn',
      lines: [
        'Reykjanesbær er fjölskylduvænn',
        'bær sem þroskar og nærir hæfi-',
        'leika allra í gegnum öflugt skóla-,',
        'íþrótta- og menningarstarf. Íbúar',
        'sinna fjölbreyttum störfum í vist-',
        'vænu fjölmenningarsamfélagi',
        'sem einkennist af virðingu,',
        'eldmóði og framsækni.'
      ]
    },

    segments: [
      {
        key: 'born', angle: -30, color: '#BF4C37',
        title: ['Börnin', 'mikilvægust'],
        desc: 'Styðjum börn svo þau blómstri í fjölskyldunni, skólum, íþróttum og tómstundum – til að auka kraft samfélagsins.',
        sdg: [1, 4, 5, 10],
        icon: 'icons/born.svg'
      },
      {
        key: 'vell', angle: 30, color: '#D69348',
        title: ['Vellíðan', 'íbúa'],
        desc: 'Aukum lífsgæði og samskipti bæjarbúa og veitum jöfn tækifæri til heilbrigðs lífs og hamingju.',
        sdg: [3, 5],
        icon: 'icons/vell.svg'
      },
      {
        key: 'fjol', angle: 90, color: '#823E92',
        title: ['Fjölbreytt', 'störf'],
        desc: 'Nýtum framsækna skóla til að næra nýsköpun, skapa vel launuð störf og gera bæinn eftirsóttan til búsetu.',
        sdg: [8, 9, 10],
        icon: 'icons/fjol.svg'
      },
      {
        key: 'skil', angle: 150, color: '#5BA1B4',
        title: ['Skilvirk', 'þjónusta'],
        desc: 'Þróum í sameiningu þjónustu sveitarfélagsins og mætum síbreytilegum þörfum íbúa.',
        sdg: [9, 10],
        icon: 'icons/skil.svg'
      },
      {
        key: 'kraf', angle: 210, color: '#2760AB',
        title: ['Kraftur', 'fjölbreytileikans'],
        desc: 'Nýtum til fulls kosti fjölbreytileikans og eflum alla bæjarbúa til að búa sér og börnum gott líf með virkri þátttöku í samfélaginu.',
        sdg: [10, 16],
        icon: 'icons/kraf.svg'
      },
      {
        key: 'vist', angle: 270, color: '#81BA50',
        title: ['Vistvænt', 'samfélag'],
        desc: 'Vinnum í átt að sjálfbærni fyrir komandi kynslóðir, hömpum náttúrufegurðinni og gerum bæinn grænan og áhugaverðari.',
        sdg: [7, 11, 12, 13],
        icon: 'icons/vist.svg'
      }
    ]
  };
})(window);
