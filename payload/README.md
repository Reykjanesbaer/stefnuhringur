# Stefnuhringsblokk fyrir Payload 3

Blokk sem lætur ritstjóra setja stefnuhringinn inn á síðu án þess að líma
HTML. Græjan sjálf er hýst á GitHub Pages og birtist í iframe, svo hér bætast
engar dependencies við verkefnið — bara tvær skrár.

```
payload/blocks/Stefnuhringur/
  config.ts       Skilgreining blokkarinnar (svið sem ritstjóri fyllir út)
  Component.tsx   Framendinn sem teiknar iframe-inn
```

## Uppsetning

### 1. Afritaðu möppuna

Settu `blocks/Stefnuhringur/` inn í verkefnið þar sem aðrar blokkir eru, t.d.
`src/blocks/Stefnuhringur/`.

### 2. Bættu blokkinni við `layout` á Pages

```ts
// src/collections/Pages/index.ts
import { Stefnuhringur } from '../../blocks/Stefnuhringur/config'

export const Pages: CollectionConfig = {
  slug: 'pages',
  fields: [
    {
      name: 'layout',
      type: 'blocks',
      blocks: [
        // … blokkirnar sem fyrir eru
        Stefnuhringur,
      ],
    },
  ],
}
```

### 3. Skráðu íhlutinn í `RenderBlocks.tsx`

```tsx
// src/blocks/RenderBlocks.tsx
import { StefnuhringurComponent } from '@/blocks/Stefnuhringur/Component'

const blockComponents = {
  // … það sem fyrir er
  stefnuhringur: StefnuhringurComponent,
}
```

Lykillinn `stefnuhringur` verður að vera sá sami og `slug` í `config.ts`.

### 4. Búðu til týpur

```bash
pnpm payload generate:types
```

Þetta býr til `StefnuhringurBlock` í `payload-types.ts` (nafnið kemur úr
`interfaceName`), sem `Component.tsx` flytur inn.

### 5. Migration — aðeins ef Postgres er undir

Postgres-adapterinn býr til töflur fyrir nýjar blokkir, svo breytingin þarf
migration:

```bash
pnpm payload migrate:create stefnuhringur_block
pnpm payload migrate
```

MongoDB þarf ekkert af þessu.

## CSP

Ef framendinn keyrir með `Content-Security-Policy` þarf að hleypa græjunni í
gegn, annars birtist tómur rammi:

```
frame-src https://reykjanesbaer.github.io;
```

## Hvað ritstjóri stillir

| Svið | Lýsing |
| --- | --- |
| Hraði | Kyrr, eða einn hringur á 10 mín – 20 sek (sjálfgefið 2 mín) |
| Snúningsátt | Rangsælis (sjálfgefið) eða réttsælis |
| Sýnilegur hluti | 50–100 %, 50 = efri helmingurinn |
| Upphafsstaða | Eins og á myndinni, eða ein áhersla efst |
| Miðjan | Alltaf heil, eða klippist með hringnum |
| Aðdráttur við smell | 1,2–2,5 (sjálfgefið 1,8) |
| Stöðva þegar bent er á | Hringurinn stöðvast mjúklega undir mús |
| Lýsingar alltaf sýnilegar | Annars aðeins í aðdrætti |
| Sýna heimsmarkmið / tákn | Kveikja og slökkva á reitum og táknum |
| Litaþema | Ljóst (sjálfgefið í blokkinni), dökkt eða eftir stillingum notanda |
| Gegnsær bakgrunnur | Fellir hringinn inn í síðuna |
| Hornarúnnun | 0–40 px |
| Hámarksbreidd | 280–1000 px (sjálfgefið 640) |
| Staðsetning á síðu | Vinstri, miðja eða hægri |

## Hæð

Hæð hringsins ræðst eingöngu af breiddinni og tveimur stillingum (sýnilegum
hluta og miðjunni). `Component.tsx` reiknar því `aspect-ratio` beint með
sömu reglu og græjan sjálf (`frame()` í `widget/config.js`). Ekkert autt
svæði, ekkert klippist af, og engin `postMessage`-skilaboð þarf — íhluturinn
er hreinn server-íhlutur án JavaScript í vafra.

Ef rúmfræðinni er breytt í `widget/config.js` þarf að uppfæra `E` og `HUB`
í `Component.tsx` (og `aspect()` í `embed.js`).

## Af hverju ekki `embed.js`?

Skriftan `embed.js` í rót verkefnisins gerir sama gagn á venjulegum vefsíðum,
en hún virkar ekki inni í React:

- Skriftur sem React setur inn (t.d. gegnum `dangerouslySetInnerHTML`) eru
  ekki keyrðar af vafranum.
- `document.currentScript` er `null` þegar skrifta er sett inn eftir á, svo
  `embed.js` fyndi ekki staðinn til að setja iframe-inn á.
