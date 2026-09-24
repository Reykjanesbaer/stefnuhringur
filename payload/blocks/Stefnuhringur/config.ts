import type { Block } from 'payload'

/**
 * Stefnuhringur — fellir stefnuhring Reykjanesbæjar inn á síðu.
 *
 * Græjan sjálf er hýst á GitHub Pages og birtist í iframe, svo hún dregur
 * engar dependencies inn í Payload-verkefnið. Sjá payload/README.md.
 *
 * Lyklarnir í „Upphafsstaða“ verða að haldast í takt við `key` í
 * widget/content.js.
 */
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
      name: 'hamarksbreidd',
      type: 'number',
      label: 'Hámarksbreidd (px)',
      defaultValue: 640,
      min: 280,
      max: 1000,
      admin: { step: 20 },
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
  ],
}
