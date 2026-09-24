# stefnuhringur

Stefnuhringur Reykjanesbæjar sem hægt er að fella inn á vefsíður: sexhyrndur
hringur með framtíðarsýn bæjarins í miðju, sex áherslum og heimsmarkmiðum
Sameinuðu þjóðanna, sem snýst hægt. Engin byggingarskref og engir pakkar,
bara statískar skrár sem eru hýstar á GitHub Pages og hægt er að fella inn hvar
sem er, þar á meðal í Payload CMS.

**Forskoðun og kóðasmiður:** <https://reykjanesbaer.github.io/stefnuhringur/>

- Hringurinn snýst hægt rangsælis. Hann stöðvast mjúklega þegar bent er á
  hann og fer aftur af stað þegar músin fer.
- Smellt, snert eða ýtt á Enter á áherslu: hún snýst upp, þysjað er inn og
  lýsingin birtist. Hinar áherslurnar dofna.
- Textar og tákn eru alltaf upprétt, hvernig sem hringurinn snýr.

---

## Innfelling í Payload CMS

### 1. Með iframe (mælt með)

Öruggasta leiðin. Virkar alls staðar þar sem HTML er leyft og krefst ekki
`<script>`. Límdu þetta í HTML-reit eða `Code`/`HTML` blokk í Payload:

```html
<iframe
  src="https://reykjanesbaer.github.io/stefnuhringur/widget/"
  title="Stefnuhringur Reykjanesbæjar"
  loading="lazy"
  scrolling="no"
  style="width:100%;max-width:min(640px,100%);aspect-ratio:636 / 428;border:0;display:block;margin-left:0;margin-right:auto;color-scheme:normal">
</iframe>
```

Hæðin fylgir breiddinni með `aspect-ratio`, svo ekkert autt svæði verður
eftir og ekkert klippist af, hver sem breiddin er. Hlutfallið breytist
aðeins með `visible` og `hub`. Kóðasmiðurinn reiknar það, svo afritaðu
kóðann þaðan frekar en að breyta honum í höndunum:

| Stillingar | `aspect-ratio` |
| --- | --- |
| sjálfgefið (`visible=50`), allt upp í `visible=65` | `636 / 428` |
| `visible=70` | `636 / 445` |
| `visible=75` | `636 / 477` |
| `visible=80` | `636 / 509` |
| `visible=100` | `636 / 636` |
| `hub=cut` (með `visible=50`) | `636 / 318` |

Upp að um 67 % ræður neðri brún miðjunnar hæðinni, því hún sést alltaf öll.

Breiddin er `width` og hámarksbreiddin `max-width`, bæði í `%` eða `px`.
Hámarksbreiddin er alltaf höfð sem `min(<gildi>, 100%)` (eða `100%` ef
ekkert hámark er), svo hringurinn flæðir aldrei út fyrir á síma:

| Dæmi | `style` |
| --- | --- |
| Full breidd, mest 640 px (sjálfgefið) | `width:100%;max-width:min(640px,100%)` |
| 480 px, ekkert hámark | `width:480px;max-width:100%` |
| 80 %, mest 900 px | `width:80%;max-width:min(900px,100%)` |

Spássíurnar ráða staðsetningunni á síðunni: `margin-left:0;margin-right:auto`
setur hringinn vinstra megin, `margin-left:auto;margin-right:auto` í miðju og
`margin-left:auto;margin-right:0` hægra megin.

### 2. Með skriftu

Ef Payload-uppsetningin leyfir `<script>` býr þessi útgáfa til iframe-inn og
stillir hæðina sjálf:

```html
<script
  src="https://reykjanesbaer.github.io/stefnuhringur/embed.js"
  data-speed="90"
  data-born="BF4C37"
  data-align="center"
  data-width="80%"
  data-max-width="900px">
</script>
```

Allar `data-*` færibreytur samsvara færibreytunum í töflunni hér að neðan
(`data-speed` → `?speed=`).

Þrjár eru undantekning. Þær eru ekki sendar áfram á græjuna, heldur
stýra þær aðeins iframe-inum sjálfum:

| Eigind | Gildi | Sjálfgefið | Lýsing |
| --- | --- | --- | --- |
| `data-align` | `left`, `center`, `right` | `left` | Staðsetning á síðunni |
| `data-width` | `1`–`100%` eða `200`–`2000px` | `100%` | Breidd |
| `data-max-width` | `1`–`100%`, `200`–`2000px` eða `none` | `640px` | Hámarksbreidd, alltaf klemmd við 100 % |

Tala án einingar er px og gildi utan marka falla á sjálfgefið. `embed.js`
staðfestir breiddirnar með sama falli og kóðasmiðurinn (`parseSize` í
[`widget/config.js`](widget/config.js)).

> **Ath.** Margar Payload-uppsetningar hreinsa `<script>` úr ritlinum
> (`lexical`/`slate` sanitizing). Ef skriftan skilar engu skaltu nota
> iframe-leiðina. Hún gefur sömu útkomu.

### 3. Sem eigin Payload-blokk

Ef þið viljið gefa ritstjórum val í stað þess að líma HTML er tilbúin blokk í
[`payload/`](payload/). Afritið möppuna inn í verkefnið og fylgið
[`payload/README.md`](payload/README.md). Í stuttu máli lítur hún svona út:

```ts
// blocks/Stefnuhringur/config.ts (stytt)
export const Stefnuhringur: Block = {
  slug: 'stefnuhringur',
  interfaceName: 'StefnuhringurBlock',
  labels: { singular: 'Stefnuhringur', plural: 'Stefnuhringir' },
  fields: [
    { name: 'hradi', type: 'select', label: 'Hraði', defaultValue: '120', options: [/* … */] },
    { name: 'synilegt', type: 'number', label: 'Sýnilegur hluti (%)', defaultValue: 50, min: 50, max: 100 },
    { name: 'upphaf', type: 'select', label: 'Upphafsstaða', defaultValue: 'mynd', options: [/* … */] },
    { name: 'gegnsaer', type: 'checkbox', label: 'Gegnsær bakgrunnur' },
    // … og fleiri, sjá config.ts
  ],
}
```

Og samsvarandi React-íhlutur í framendanum, hreinn server-íhlutur án
JavaScript í vafra:

```tsx
export function StefnuhringurComponent({ synilegt = 50, midja = 'full', gegnsaer }: Props) {
  const q = new URLSearchParams()
  if (synilegt !== 50) q.set('visible', String(synilegt))
  if (gegnsaer) q.set('bg', 'transparent')

  return (
    <iframe
      src={`https://reykjanesbaer.github.io/stefnuhringur/widget/?${q}`}
      title="Stefnuhringur Reykjanesbæjar"
      loading="lazy"
      scrolling="no"
      style={{ width: '100%', maxWidth: 640, border: 0, display: 'block',
               aspectRatio: aspect(synilegt, midja) }}
    />
  )
}
```

---

## Stillingar

Allar stillingar eru færibreytur í slóðinni. Ógild gildi (utan bils eða
óþekkt orð) falla á sjálfgefið gildi.

| Færibreyta | Gildi | Sjálfgefið | Lýsing |
| --- | --- | --- | --- |
| `speed` | `0`–`600` | `120` | Sekúndur á hvern hring, `0` = kyrr |
| `dir` | `ccw`, `cw` | `ccw` | Rangsælis / réttsælis |
| `visible` | `50`–`100` | `50` | Hve stór hluti hringsins sést (%) |
| `zoom` | `1.2`–`2.5` | `1.8` | Aðdráttur þegar smellt er á áherslu |
| `start` | `mynd`, `born`, `vell`, `fjol`, `skil`, `kraf`, `vist` | `mynd` | Upphafsstaða: eins og á myndinni, eða sú áhersla efst |
| `hub` | `full`, `cut` | `full` | Miðjan alltaf heil, eða klippist með hringnum |
| `pause` | `0`, `1` | `1` | Stöðvast þegar bent er á |
| `desc` | `0`, `1` | `1` | Lýsingar alltaf sýnilegar (`0` = aðeins í aðdrætti) |
| `sdg` | `0`, `1` | `1` | Sýna heimsmarkmiðareiti |
| `icons` | `0`, `1` | `1` | Sýna tákn |
| `theme` | `auto`, `light`, `dark` | `auto` | Litaþema |
| `bg` | `transparent` | — | Gegnsær bakgrunnur |
| `radius` | `0`–`40` | `14` | Hornarúnnun í px |
| `icon-born` | slóð eða `none` | — | Tákn fyrir Börnin mikilvægust |
| `icon-vell` | slóð eða `none` | — | Tákn fyrir Vellíðan íbúa |
| `icon-fjol` | slóð eða `none` | — | Tákn fyrir Fjölbreytt störf |
| `icon-skil` | slóð eða `none` | — | Tákn fyrir Skilvirk þjónusta |
| `icon-kraf` | slóð eða `none` | — | Tákn fyrir Kraftur fjölbreytileikans |
| `icon-vist` | slóð eða `none` | — | Tákn fyrir Vistvænt samfélag |
| `iconsize` | `60`–`140` | `100` | Stærð allra tákna (%) |
| `icontint` | hex án `#`, eða `none` | `none` | Litar öll tákn í einum lit |

### Litir

Allir litir eru hex án `#` (en `#` og `%23` eru líka leyfð, og hástafir
skipta ekki máli). Ógildur litur fellur á sjálfgefið. Heimsmarkmiðareitir
halda alltaf opinberu litunum.

| Færibreyta | Sjálfgefið | Litar |
| --- | --- | --- |
| `born` | `BF4C37` | Börnin mikilvægust (fleygur og táknbóla) |
| `vell` | `D69348` | Vellíðan íbúa |
| `fjol` | `823E92` | Fjölbreytt störf |
| `skil` | `5BA1B4` | Skilvirk þjónusta |
| `kraf` | `2760AB` | Kraftur fjölbreytileikans |
| `vist` | `81BA50` | Vistvænt samfélag |
| `text` | `FFFFFF` | Heiti og lýsingar á áherslum |
| `hubbg` | `FFFFFF` | Bakgrunnur miðju |
| `hubtitle` | `2760AB` | „Framtíðarsýn“ |
| `hubtext` | `6D6E70` | Texti miðju |
| `bgcolor` | tómt = eftir þema | Bakgrunnur græju. Yfirskrifar `theme`, hunsað ef `bg=transparent` |

### Áherslur

| Lykill | Áhersla | Heimsmarkmið |
| --- | --- | --- |
| `born` | Börnin mikilvægust | 1, 4, 5, 10 |
| `vell` | Vellíðan íbúa | 3, 5 |
| `fjol` | Fjölbreytt störf | 8, 9, 10 |
| `skil` | Skilvirk þjónusta | 9, 10 |
| `kraf` | Kraftur fjölbreytileikans | 10, 16 |
| `vist` | Vistvænt samfélag | 7, 11, 12, 13 |

### Dæmi

```
widget/?speed=60&dir=cw
widget/?visible=100&desc=0
widget/?start=vist&speed=0
widget/?bg=transparent&theme=dark&radius=0
widget/?born=123456&hubbg=FFE9A8
widget/?bgcolor=1E2A33&text=FFFFFF&hubtitle=%23BF4C37
widget/?icon-born=https%3A%2F%2Fwww.reykjanesbaer.is%2Fmedia%2Fbarn.svg&icontint=FFFFFF
widget/?icon-vist=none&iconsize=120
```

### Hvernig hreyfingin virkar

| Staða | Kveikja | Hegðun |
| --- | --- | --- |
| Snýst | sjálfgefið | Einn hringur á `speed` sekúndum í áttina `dir` |
| Stöðvast | mús yfir, eða lyklaborðsfókus (ef `pause=1`) | Hægir mjúklega á sér og stöðvast |
| Aðdráttur | smellur, snerting, Enter eða bil á áherslu | Snýst stystu leið upp, þysjar inn, sýnir lýsingu, hinar dofna |
| Skipta | smellt á aðra áherslu í aðdrætti | Fer beint yfir á hana |
| Til baka | mús fer út, sama áhersla aftur, miðjan, Esc, snerting utan áherslu, fókus fer | Aftur í 1×, snúningurinn fer mjúklega af stað |

Hreyfingin keyrir í einni `requestAnimationFrame`-lykkju sem sefur þegar
ekkert hreyfist, þegar hringurinn er utan skjás eða þegar flipinn er falinn.

---

## Efni

Allir textar, sjálfgefnir litir, tákn og heimsmarkmið hverrar áherslu eru í einni skrá,
[`widget/content.js`](widget/content.js). Til að breyta orðalagi, lit eða
heimsmarkmiðum þarf aðeins að breyta henni. Textarnir eru orðréttir úr
upprunalegu myndinni, líka bandstrikuðu línuskiptin í miðjunni.

Íslensk heiti og litir allra 17 heimsmarkmiðanna eru í
[`widget/config.js`](widget/config.js) (`SDG`).

---

## Eigin tákn

Táknunum sex má skipta út fyrir eigin SVG-, PNG- eða WebP-myndir með
`icon-<lykill>=<slóð>`, eða fela þau með `icon-<lykill>=none` (bólan helst).
Í kóðasmiðnum er þetta í hlutanum **Tákn**, og í Payload-blokkinni í hópnum
**Tákn**.

### Kröfur til myndarinnar

- **Ferningslaga** og með **gegnsæjum bakgrunni**. Myndin er skölud inn í
  bóluna án þess að teygjast (`preserveAspectRatio="xMidYMid meet"`).
- **Helst einlitt SVG.** Þá getur `icontint` litað það í hvaða lit sem er, t.d.
  svart tákn → `icontint=FFFFFF` fyrir hvítt.
- **PNG að lágmarki 256×256 px**, svo það haldist skarpt á háupplausnarskjám
  og í aðdrætti.
- Marglita myndir: hafðu `icontint=none` (sjálfgefið), þá birtast þær óbreyttar.

### Hvaða slóðir eru leyfðar

- `https://`-slóðir, t.d. úr myndasafni Payload
  (`https://www.reykjanesbaer.is/api/media/file/barn.svg`).
- Slóðir innan repósins, t.d. `icons/minn.svg` (miðað við `widget/`) eða
  `/stefnuhringur/widget/icons/minn.svg`.
- Endingin verður að vera `.svg`, `.png` eða `.webp`.

Öllu öðru er hafnað (`javascript:`, `data:`, `http://`, `//hýsill`, `.gif` …)
og sjálfgefna táknið notað. Ef mynd hleðst ekki (t.d. 404) birtist sjálfgefna
táknið í staðinn og `console.warn` skrifar slóðina.

**Öryggi.** Myndirnar eru teiknaðar með `<image href="…">` inni í SVG-inu.
SVG-kóðinn er aldrei sóttur og settur inn á síðuna, svo skriftur í ytri SVG
keyra ekki.

### Úr myndasafni Payload

1. Hladdu myndinni upp í **Media** í Payload.
2. Í blokkinni: opnaðu **Tákn** og veldu myndina við áhersluna. Blokkin býr til
   fulla slóð sjálf. Sjá [`payload/README.md`](payload/README.md) um
   `NEXT_PUBLIC_SERVER_URL`.
3. Í HTML-reit: afritaðu slóð myndarinnar úr Media, límdu hana í
   kóðasmiðinn undir **Tákn** og afritaðu kóðann.

### Að skipta um sjálfgefin tákn

Sjálfgefnu táknin eru skrár í [`widget/icons/`](widget/icons/) (`born.svg`,
`vell.svg`, `fjol.svg`, `skil.svg`, `kraf.svg`, `vist.svg`) og
[`widget/content.js`](widget/content.js) vísar á þær (`icon`). Til að skipta
um sjálfgefið tákn fyrir alla: settu nýja skrá með sama nafni í möppuna, eða
nýja skrá og uppfærðu `icon` í `content.js`. Sjálfgefnu táknin eru hvít á
gegnsæjum grunni.

---

## Tákn, letur og leyfi

### Tákn áherslnanna

Engin SVG-frumrit voru til, svo öll sex táknin í
[`widget/icons/`](widget/icons/) voru **endurteiknuð í höndunum** sem hvít,
einlita SVG eftir upprunalegu myndinni:

| Skrá | Áhersla | Uppruni |
| --- | --- | --- |
| `born.svg` | Börnin mikilvægust | Endurteiknað |
| `vell.svg` | Vellíðan íbúa | Endurteiknað |
| `fjol.svg` | Fjölbreytt störf | Endurteiknað |
| `skil.svg` | Skilvirk þjónusta | Endurteiknað |
| `kraf.svg` | Kraftur fjölbreytileikans | Endurteiknað |
| `vist.svg` | Vistvænt samfélag | Endurteiknað |

Ef frumritin finnast (t.d. hjá hönnuði upprunalegu myndarinnar) er nóg að
skipta skránum út. Þau verða að vera hvít á gegnsæjum grunni og ferningslaga.

### Heimsmarkmiðin

Opinberu íslensku heimsmarkmiðatáknin eru **ekki enn** í safninu. Þangað
til teiknar græjan einfaldaða reiti með lit, númeri og heiti, eins og
frumgerðin. Til að nota opinberu táknin:

1. Sækið íslensku táknin sem SVG (Stjórnarráðið,
   [heimsmarkmidin.is](https://www.heimsmarkmidin.is)) og vistið sem
   `widget/sdg/1.svg` … `widget/sdg/17.svg`.
2. Setjið `SDG_OFFICIAL = true` í [`widget/config.js`](widget/config.js).

Hver reitur fær `<title>` með númeri og heiti, t.d. „Heimsmarkmið 10:
Aukinn jöfnuður“.

**Notkunarskilmálar.** Sameinuðu þjóðirnar leyfa notkun heimsmarkmiðatáknanna
í upplýsingaskyni án sérstaks leyfis, en samkvæmt leiðbeiningum þeirra
(*SDG Guidelines for the use of the SDG logo including the colour wheel,
and 17 icons*) má **ekki breyta táknunum**: hvorki litum, hlutföllum né
letri. Merki Sameinuðu þjóðanna sjálft má ekki nota án leyfis. Farið yfir
nýjustu útgáfu leiðbeininganna á
[un.org/sustainabledevelopment](https://www.un.org/sustainabledevelopment/news/communications-material/)
áður en opinberu táknin fara í loftið.

> **Ath.** Í hringnum snúast reitirnir með brún áherslunnar, eins og á
> upprunalegu myndinni. Ef það telst breyting á táknunum er einfalt að
> láta þá standa upprétta. Hafið þá samband við þann sem sér um kóðann.

### Letur

Græjan notar breytuna `--sh-font` í [`widget/widget.css`](widget/widget.css):
`"Circular Std"`, svo `"Figtree"`, svo kerfisletur. Leturskrárnar eru
skilgreindar í [`widget/fonts/fonts.css`](widget/fonts/fonts.css).

- **Circular Std** (letur Reykjanesbæjar, Lineto) er leyfisskylt. Bærinn á
  leyfið. Til að virkja það: breytið `.otf` í `.woff2`, setjið
  `CircularStd-Book.woff2`, `CircularStd-Bold.woff2` og
  `CircularStd-Black.woff2` í `widget/fonts/` og takið athugasemdina af
  `@font-face`-reglunum í `fonts.css`. Leiðbeiningar eru í skránni.
- **Figtree** er notað þangað til. Það er undir SIL Open Font License 1.1,
  sjá [`widget/fonts/OFL-Figtree.txt`](widget/fonts/OFL-Figtree.txt).

Letrið er hýst með græjunni, ekki sótt frá Google Fonts eða öðrum þriðja
aðila.

---

## Uppbygging

```
index.html          Forskoðun og kóðasmiður fyrir ritstjóra
embed.js            Innfellingarskrifta: býr til iframe, hæð, data-align / data-max-width
reference-demo.html Samþykkt frumgerð (til viðmiðunar)
widget/
  index.html        Sjálf græjan (það sem iframe vísar á)
  widget.css        Útlit, þemu og viðbrögð við þröngu plássi
  widget.js         Rúmfræði, teikning, hreyfing og samskipti
  config.js         Sjálfgefnar stillingar, lestur færibreyta, heimsmarkmið
  content.js        Textar, litir, tákn og heimsmarkmið áherslna
  fonts/            Letur (Figtree, pláss fyrir Circular Std)
  icons/            Sex tákn áherslnanna sem SVG
payload/            Tilbúin Payload 3 blokk (afritast inn í vefverkefnið)
  blocks/Stefnuhringur/config.ts
  blocks/Stefnuhringur/Component.tsx
.github/workflows/
  deploy.yml        Sjálfvirk birting á GitHub Pages
```

Engin dependencies, ekkert build. Til að keyra staðbundið dugar hvaða
statíski þjónn sem er:

```bash
npx http-server . -p 8080
# opnaðu http://127.0.0.1:8080/
```

Kóðasmiðurinn notar raunverulegu græjuna (`widget/`) í iframe og sendir
henni nýjar stillingar með `postMessage` (aðeins frá sama uppruna), svo
hringurinn hoppar ekki þegar stillingum er breytt.

### Rúmfræði

Allt er teiknað í SVG-einingum með miðju í 0,0. Gildin eru í `GEO` í
[`widget/config.js`](widget/config.js):

| Stærð | Gildi | Athugasemd |
| --- | --- | --- |
| Umritaður radíus sexhyrnings | 300 | Horn beint upp |
| Radíus miðju | 98 | Alltaf hvít (`#FFFFFF`), líka í dökku þema |
| Bil milli hluta | 18 | Samsíða, jöfn breidd |
| Bil hluta og miðju | 9 | Innri brún er íhvolfur bogi í radíus 107 |
| Rúnnun ytri horna | 12 | |
| Táknbóla | r 27, í radíus 283, miðlína + 17° | Tákn 34×34, upprétt |
| Miðja texta | radíus 186 á miðlínu | |
| Heimsmarkmiðareitir | 24 ferningar, 3 bil, 6 utan brúnar | miðlína − 12° |
| Hálf breidd ramma | 318 | Nær yfir allan snúninginn |

Klippilínan er `cropY = −318 + 636 × visible/100`. Með `hub=full` nær
ramminn niður fyrir miðjuna svo hún sjáist öll. Í aðdrætti færist
klippilínan niður svo áherslan klippist ekki af.

### Hýsing

`deploy.yml` birtir `main` á GitHub Pages sjálfkrafa. Til að virkja þetta í
fyrsta sinn: **Settings → Pages → Source → GitHub Actions**.

Líka er hægt að hýsa græjuna annars staðar, því ekkert bindur hana við
GitHub Pages. Afritið bara skrárnar og uppfærið slóðirnar í
innfellingarkóðanum og í `payload/blocks/Stefnuhringur/Component.tsx`.

### Aðgengi

- Hringurinn er merktur sem svæði (`role="region"`, „Stefnuhringur
  Reykjanesbæjar“) og framtíðarsýnin er líka til sem samfelldur texti fyrir
  skjálesara.
- Hver áhersla er hnappur (`role="button"`) sem hægt er að ná í með Tab. Heiti
  og lýsing eru nafn hnappsins og `aria-pressed` segir hvort hann er í
  aðdrætti.
- Sýnilegur fókushringur. Þegar áhersla fær lyklaborðsfókus stöðvast
  hringurinn og snýr henni upp, svo fókusinn sjáist líka á áherslum sem voru
  undir klippilínunni.
- Enter eða bil þysjar inn og Esc lokar. `aria-live` svæði les upp áhersluna
  sem þysjað er inn á.
- Virðir `prefers-reduced-motion`: hringurinn snýst þá ekki, en aðdráttur
  virkar áfram.
- Virðir `prefers-color-scheme` (`theme=auto`). Miðjan er alltaf hvít og
  hvítur texti á áherslunum helst óbreyttur í báðum þemum.
