import type { Block, Field, TextField } from 'payload'

/**
 * Stefnuhringur — fellir stefnuhring Reykjanesbæjar inn á síðu.
 *
 * Græjan sjálf er hýst á GitHub Pages og birtist í iframe, svo hún dregur
 * engar dependencies inn í Payload-verkefnið. Sjá payload/README.md.
 *
 * Lyklarnir í „Upphafsstaða“ verða að haldast í takt við `key` í
 * widget/content.js.
 */
const UNITS = [
  { label: '%', value: '%' },
  { label: 'px', value: 'px' },
]

/* Sömu mörk og parseSize í widget/config.js */
function sizeValidate(unitField: string, optional: boolean) {
  return (value: number | null | undefined, { siblingData }: { siblingData: Record<string, unknown> }) => {
    if (value === null || value === undefined) {
      return optional ? true : 'Settu inn breidd.'
    }
    const unit = siblingData?.[unitField] === '%' ? '%' : 'px'
    const [min, max] = unit === '%' ? [1, 100] : [200, 2000]
    return value >= min && value <= max ? true : `Gildið verður að vera ${min}–${max} ${unit}.`
  }
}

/* Valfrjáls hex-litur; tómt = upprunalegi liturinn */
function colorField(name: string, label: string, placeholder: string): TextField {
  return {
    name,
    type: 'text',
    label,
    admin: { placeholder, width: '50%' },
    validate: (value: string | null | undefined) => {
      if (!value) return true
      return /^(#|%23)?([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value.trim())
        ? true
        : 'Hex-litur, t.d. BF4C37'
    },
  }
}

/* Áherslur: lykill (sama og `key` í widget/content.js) og heiti */
const AHERSLUR: [string, string][] = [
  ['Born', 'Börnin mikilvægust'],
  ['Vell', 'Vellíðan íbúa'],
  ['Fjol', 'Fjölbreytt störf'],
  ['Skil', 'Skilvirk þjónusta'],
  ['Kraf', 'Kraftur fjölbreytileikans'],
  ['Vist', 'Vistvænt samfélag'],
]

/* Ein röð á hverja áherslu: mynd úr myndasafni + „Fela tákn“ */
function iconRow([key, label]: [string, string]): Field {
  return {
    type: 'row',
    fields: [
      {
        name: `takn${key}`,
        type: 'upload',
        relationTo: 'media',
        label,
        required: false,
        filterOptions: {
          mimeType: { in: ['image/svg+xml', 'image/png', 'image/webp'] },
        },
        admin: { width: '70%', description: 'SVG, PNG eða WebP. Tómt = sjálfgefið tákn.' },
      },
      {
        name: `fela${key}`,
        type: 'checkbox',
        label: 'Fela tákn',
        defaultValue: false,
        admin: { width: '30%' },
      },
    ],
  }
}

export const Stefnuhringur: Block = {
  slug: 'stefnuhringur',
  interfaceName: 'StefnuhringurBlock',
  labels: {
    singular: 'Stefnuhringur',
    plural: 'Stefnuhringir',
  },
  fields: [
    {
      name: 'hradi',
      type: 'select',
      label: 'Hraði',
      required: true,
      defaultValue: '120',
      options: [
        { label: 'Kyrr', value: '0' },
        { label: '1 hringur á 10 mín', value: '600' },
        { label: '1 hringur á 5 mín', value: '300' },
        { label: '1 hringur á 3 mín', value: '180' },
        { label: '1 hringur á 2 mín (sjálfgefið)', value: '120' },
        { label: '1 hringur á 1 mín 30 sek', value: '90' },
        { label: '1 hringur á 1 mín', value: '60' },
        { label: '1 hringur á 40 sek', value: '40' },
        { label: '1 hringur á 20 sek', value: '20' },
      ],
    },
    {
      name: 'att',
      type: 'radio',
      label: 'Snúningsátt',
      defaultValue: 'ccw',
      options: [
        { label: 'Rangsælis', value: 'ccw' },
        { label: 'Réttsælis', value: 'cw' },
      ],
      admin: { layout: 'horizontal' },
    },
    {
      name: 'synilegt',
      type: 'number',
      label: 'Sýnilegur hluti (%)',
      defaultValue: 50,
      min: 50,
      max: 100,
      admin: {
        step: 5,
        description: '50 = efri helmingur hringsins, 100 = allur hringurinn.',
      },
    },
    {
      name: 'upphaf',
      type: 'select',
      label: 'Upphafsstaða',
      defaultValue: 'mynd',
      options: [
        { label: 'Eins og á myndinni', value: 'mynd' },
        { label: 'Börnin mikilvægust efst', value: 'born' },
        { label: 'Vellíðan íbúa efst', value: 'vell' },
        { label: 'Fjölbreytt störf efst', value: 'fjol' },
        { label: 'Skilvirk þjónusta efst', value: 'skil' },
        { label: 'Kraftur fjölbreytileikans efst', value: 'kraf' },
        { label: 'Vistvænt samfélag efst', value: 'vist' },
      ],
    },
    {
      name: 'midja',
      type: 'radio',
      label: 'Miðjan',
      defaultValue: 'full',
      options: [
        { label: 'Alltaf heil', value: 'full' },
        { label: 'Klippist með', value: 'cut' },
      ],
      admin: { layout: 'horizontal' },
    },
    {
      name: 'adrattur',
      type: 'number',
      label: 'Aðdráttur við smell',
      defaultValue: 1.8,
      min: 1.2,
      max: 2.5,
      admin: { step: 0.1 },
    },
    { name: 'stodva', type: 'checkbox', label: 'Stöðva þegar bent er á', defaultValue: true },
    { name: 'lysingar', type: 'checkbox', label: 'Lýsingar alltaf sýnilegar', defaultValue: true },
    { name: 'heimsmarkmid', type: 'checkbox', label: 'Sýna heimsmarkmið', defaultValue: true },
    { name: 'takn', type: 'checkbox', label: 'Sýna tákn', defaultValue: true },
    {
      name: 'thema',
      type: 'select',
      label: 'Litaþema',
      defaultValue: 'light',
      options: [
        { label: 'Ljóst', value: 'light' },
        { label: 'Dökkt', value: 'dark' },
        { label: 'Fylgir stillingum notanda', value: 'auto' },
      ],
    },
    {
      name: 'gegnsaer',
      type: 'checkbox',
      label: 'Gegnsær bakgrunnur',
      defaultValue: false,
      admin: { description: 'Fellir hringinn inn í síðuna, án bakgrunnslitar.' },
    },
    {
      name: 'hornarunnun',
      type: 'number',
      label: 'Hornarúnnun (px)',
      defaultValue: 14,
      min: 0,
      max: 40,
    },
    {
      type: 'row',
      fields: [
        {
          name: 'breidd',
          type: 'number',
          label: 'Breidd',
          defaultValue: 100,
          validate: sizeValidate('breiddEining', false),
          admin: { width: '60%', description: '1–100 % eða 200–2000 px' },
        },
        {
          name: 'breiddEining',
          type: 'select',
          label: 'Eining',
          defaultValue: '%',
          options: UNITS,
          admin: { width: '40%' },
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'hamarksbreidd',
          type: 'number',
          label: 'Hámarksbreidd',
          defaultValue: 640,
          validate: sizeValidate('hamarksbreiddEining', true),
          admin: {
            width: '60%',
            description: '1–100 % eða 200–2000 px. Tómt = ekkert hámark.',
          },
        },
        {
          name: 'hamarksbreiddEining',
          type: 'select',
          label: 'Eining',
          defaultValue: 'px',
          options: UNITS,
          admin: { width: '40%' },
        },
      ],
    },
    {
      name: 'jofnun',
      type: 'radio',
      label: 'Staðsetning á síðu',
      defaultValue: 'left',
      options: [
        { label: 'Vinstri', value: 'left' },
        { label: 'Miðja', value: 'center' },
        { label: 'Hægri', value: 'right' },
      ],
      admin: { layout: 'horizontal' },
    },
    {
      name: 'litir',
      type: 'group',
      label: 'Litir',
      admin: {
        description:
          'Hex-litur án #, t.d. BF4C37. Tómt = upprunalegi liturinn. ' +
          'Heimsmarkmiðareitir halda alltaf opinberu litunum.',
      },
      fields: [
        colorField('born', 'Börnin mikilvægust', 'BF4C37'),
        colorField('vell', 'Vellíðan íbúa', 'D69348'),
        colorField('fjol', 'Fjölbreytt störf', '823E92'),
        colorField('skil', 'Skilvirk þjónusta', '5BA1B4'),
        colorField('kraf', 'Kraftur fjölbreytileikans', '2760AB'),
        colorField('vist', 'Vistvænt samfélag', '81BA50'),
        colorField('text', 'Texti á áherslum', 'FFFFFF'),
        colorField('hubbg', 'Bakgrunnur miðju', 'FFFFFF'),
        colorField('hubtitle', '„Framtíðarsýn“', '2760AB'),
        colorField('hubtext', 'Texti miðju', '6D6E70'),
        colorField('bgcolor', 'Bakgrunnur græju', 'eftir þema'),
      ],
    },
    {
      type: 'collapsible',
      label: 'Tákn',
      admin: {
        initCollapsed: true,
        description:
          'Eigin tákn í stað sjálfgefinna. Best er einlitt SVG með gegnsæjum ' +
          'bakgrunni, ferningslaga. PNG helst 256×256 eða stærra.',
      },
      fields: [
        ...AHERSLUR.map(iconRow),
        {
          type: 'row',
          fields: [
            {
              name: 'taknStaerd',
              type: 'number',
              label: 'Stærð tákna (%)',
              defaultValue: 100,
              min: 60,
              max: 140,
              admin: { width: '50%', step: 5 },
            },
            {
              name: 'taknLitur',
              type: 'text',
              label: 'Litur tákna',
              admin: {
                width: '50%',
                placeholder: 'óbreytt',
                description: 'Hex, t.d. FFFFFF, litar öll tákn í einum lit. Tómt = óbreytt.',
              },
              validate: (value: string | null | undefined) => {
                if (!value || value.trim().toLowerCase() === 'none') return true
                return /^(#|%23)?([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value.trim())
                  ? true
                  : 'Hex-litur, t.d. FFFFFF'
              },
            },
          ],
        },
      ],
    },
  ],
}
