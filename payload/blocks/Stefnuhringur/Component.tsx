import React from 'react'
import type { Media, StefnuhringurBlock } from '@/payload-types'

const WIDGET_URL = 'https://reykjanesbaer.github.io/stefnuhringur/widget/'

/*
 * Grunnslóð vefsins, notuð til að gera fulla https-slóð úr slóð í
 * myndasafninu (Payload skilar oft „/api/media/file/barn.svg“).
 */
const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL || ''

const ICON_KEYS = ['born', 'vell', 'fjol', 'skil', 'kraf', 'vist'] as const

/*
 * Rúmfræði græjunnar (sama og frame() í widget/config.js). Hæðin ræðst
 * alfarið af breiddinni, svo aspect-ratio dugar: ekkert autt svæði, ekkert
 * klippist af, og engin skilaboð þarf frá iframe-inum. Íhluturinn er því
 * hreinn server-íhlutur, án JavaScript í vafra.
 */
const E = 318
const HUB = 98

function aspect(synilegt: number, midja: string): string {
  const cropY = -E + (2 * E * synilegt) / 100
  const bottom = midja === 'cut' ? cropY : Math.max(cropY, HUB + 12)
  return `${2 * E} / ${Math.round(bottom + E)}`
}

function margins(jofnun: string): Pick<React.CSSProperties, 'marginLeft' | 'marginRight'> {
  if (jofnun === 'center') return { marginLeft: 'auto', marginRight: 'auto' }
  if (jofnun === 'right') return { marginLeft: 'auto', marginRight: 0 }
  return { marginLeft: 0, marginRight: 'auto' }
}

/* Sjálfgefnir litir — sömu og í widget/content.js */
const COLOR_DEFAULTS: Record<string, string> = {
  born: 'BF4C37', vell: 'D69348', fjol: '823E92', skil: '5BA1B4', kraf: '2760AB', vist: '81BA50',
  text: 'FFFFFF', hubbg: 'FFFFFF', hubtitle: '2760AB', hubtext: '6D6E70', bgcolor: '',
}

/* Sama regla og parseColor í widget/config.js; ógilt → null */
function parseColor(raw: string | null | undefined): string | null {
  if (!raw) return null
  let v = raw.trim().replace(/^(#|%23)/i, '')
  if (/^[0-9a-f]{3}$/i.test(v)) v = v.replace(/./g, (c) => c + c)
  return /^[0-9a-f]{6}$/i.test(v) ? v.toUpperCase() : null
}

/* Sömu mörk og parseSize í widget/config.js; ógilt → null */
function parseSize(n: number | null | undefined, unit: string | null | undefined): string | null {
  if (typeof n !== 'number') return null
  const u = unit === '%' ? '%' : 'px'
  const [min, max] = u === '%' ? [1, 100] : [200, 2000]
  return n >= min && n <= max ? `${n}${u}` : null
}

/*
 * Full https-slóð á mynd úr myndasafni, eða null. Sömu reglur og parseIcon
 * í widget/config.js: aðeins https og endingin .svg, .png eða .webp.
 * Óinnfyllt tengsl (bara id) eru hunsuð; sækja þarf síðuna með depth ≥ 1.
 */
function mediaUrl(media: number | string | Media | null | undefined): string | null {
  if (!media || typeof media !== 'object' || !media.url) return null
  let u: URL
  try {
    u = SERVER_URL ? new URL(media.url, SERVER_URL) : new URL(media.url)
  } catch {
    return null
  }
  if (u.protocol !== 'https:') return null
  return /\.(svg|png|webp)$/i.test(u.pathname) ? u.href : null
}

function inRange(n: number | null | undefined, min: number, max: number, def: number): number {
  return typeof n === 'number' && n >= min && n <= max ? n : def
}

/*
 * Athugið: embed.js er vísvitandi EKKI notuð hér. Skriftur sem React setur
 * inn keyra ekki, og document.currentScript er null þegar skrifta er sett
 * inn eftir á. Iframe-inn er því búinn til beint.
 */
export const StefnuhringurComponent: React.FC<StefnuhringurBlock> = ({
  hradi = '120',
  att = 'ccw',
  synilegt,
  upphaf = 'mynd',
  midja = 'full',
  adrattur,
  stodva = true,
  lysingar = true,
  heimsmarkmid = true,
  takn = true,
  thema = 'light',
  gegnsaer,
  hornarunnun,
  breidd,
  breiddEining,
  hamarksbreidd,
  hamarksbreiddEining,
  jofnun = 'left',
  litir,
  taknStaerd,
  taknLitur,
  ...rest
}) => {
  const visible = inRange(synilegt, 50, 100, 50)
  const zoom = inRange(adrattur, 1.2, 2.5, 1.8)
  const radius = inRange(hornarunnun, 0, 40, 14)

  /*
   * Breidd iframe-sins; max-width alltaf klemmt við 100% (flæðir ekki út á
   * síma). null = ritstjóri tæmdi reitinn (ekkert hámark); undefined = eldra
   * efni án reitsins (sjálfgefið 640px).
   */
  const width = parseSize(breidd, breiddEining) ?? '100%'
  const maxWidth =
    hamarksbreidd === null
      ? '100%'
      : `min(${parseSize(hamarksbreidd, hamarksbreiddEining) ?? '640px'}, 100%)`

  /* Aðeins það sem víkur frá sjálfgefnu fer í slóðina */
  const params = new URLSearchParams()
  if (hradi && hradi !== '120') params.set('speed', hradi)
  if (att === 'cw') params.set('dir', 'cw')
  if (visible !== 50) params.set('visible', String(visible))
  if (zoom !== 1.8) params.set('zoom', String(zoom))
  if (upphaf && upphaf !== 'mynd') params.set('start', upphaf)
  if (midja === 'cut') params.set('hub', 'cut')
  if (stodva === false) params.set('pause', '0')
  if (lysingar === false) params.set('desc', '0')
  if (heimsmarkmid === false) params.set('sdg', '0')
  if (takn === false) params.set('icons', '0')
  if (thema && thema !== 'auto') params.set('theme', thema)
  if (gegnsaer) params.set('bg', 'transparent')
  if (radius !== 14) params.set('radius', String(radius))

  /* Eigin tákn: fela, eða full https-slóð úr myndasafninu */
  const icons = rest as Record<string, unknown>
  const cap = (k: string) => k[0].toUpperCase() + k.slice(1)
  for (const key of ICON_KEYS) {
    if (icons[`fela${cap(key)}`] === true) {
      params.set(`icon-${key}`, 'none')
      continue
    }
    const url = mediaUrl(icons[`takn${cap(key)}`] as Media | number | string | null | undefined)
    if (url) params.set(`icon-${key}`, url)
  }
  const iconSize = inRange(taknStaerd, 60, 140, 100)
  if (iconSize !== 100) params.set('iconsize', String(iconSize))
  const tint = parseColor(taknLitur)
  if (tint) params.set('icontint', tint)

  /* Litir: aðeins gildir litir sem víkja frá sjálfgefnum */
  const colors = (litir ?? {}) as Record<string, string | null | undefined>
  for (const key of Object.keys(COLOR_DEFAULTS)) {
    const c = parseColor(colors[key])
    if (c && c !== COLOR_DEFAULTS[key]) params.set(key, c)
  }

  const query = params.toString()

  return (
    <iframe
      src={WIDGET_URL + (query ? `?${query}` : '')}
      title="Stefnuhringur Reykjanesbæjar"
      loading="lazy"
      scrolling="no"
      style={{
        display: 'block',
        width,
        maxWidth,
        aspectRatio: aspect(visible, midja ?? 'full'),
        border: 0,
        overflow: 'hidden',
        colorScheme: 'normal',
        ...margins(jofnun ?? 'left'),
      }}
    />
  )
}

export default StefnuhringurComponent
