import React from 'react'
import type { StefnuhringurBlock } from '@/payload-types'

const WIDGET_URL = 'https://reykjanesbaer.github.io/stefnuhringur/widget/'

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
  hamarksbreidd,
  jofnun = 'left',
}) => {
  const visible = inRange(synilegt, 50, 100, 50)
  const zoom = inRange(adrattur, 1.2, 2.5, 1.8)
  const radius = inRange(hornarunnun, 0, 40, 14)
  const maxWidth = inRange(hamarksbreidd, 280, 1000, 640)

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

  const query = params.toString()

  return (
    <iframe
      src={WIDGET_URL + (query ? `?${query}` : '')}
      title="Stefnuhringur Reykjanesbæjar"
      loading="lazy"
      scrolling="no"
      style={{
        display: 'block',
        width: '100%',
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
