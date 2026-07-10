import type { Phase, UnitBasis } from '@/types';

/**
 * Canonical inspection phase list, seeded from the reference FGA deck.
 *
 * Config-driven: reordering, adding, or removing a phase here changes both the
 * capture workflow and the generated slide deck 1:1, without touching code.
 */
export type PhaseTemplate = Pick<
  Phase,
  'id' | 'title' | 'guidance' | 'slideOrder' | 'required'
> & { unitBasis?: UnitBasis };

export const PHASE_TEMPLATES: PhaseTemplate[] = [
  {
    id: 'external-case-pack',
    title: 'External Box — Case Pack',
    guidance:
      'Photograph the outer cardboard case pack on all sides. Check for crushing, tears, water damage, and label legibility.',
    slideOrder: 1,
    required: true,
  },
  {
    id: 'external-retail-box',
    title: 'External Retail Box',
    guidance:
      'Photograph the retail box exterior, all faces. Verify print quality, artwork alignment, and seals.',
    slideOrder: 2,
    required: true,
  },
  {
    id: 'artwork-validation',
    title: 'Artwork Validation',
    guidance:
      'Validate printed artwork against the approved reference: logos, legal marks, text, colors, barcodes, and placement.',
    slideOrder: 3,
    required: true,
  },
  {
    id: 'tear-label',
    title: 'Tear Label Inspection',
    guidance:
      'Inspect the tear label / tamper evidence. Confirm placement, adhesion, and that it tears correctly.',
    slideOrder: 4,
    required: true,
  },
  {
    id: 'internal-sku-box',
    title: 'Internal SKU Box tray',
    guidance:
      'Photograph the inner SKU packaging and tray, and how the device is seated. Verify fit and protective materials.',
    slideOrder: 5,
    required: true,
  },
  {
    id: 'device',
    title: 'Device Inspection',
    guidance:
      'Remove the device and inspect it. Confirm the "Not For Sale" label is attached, and check for surface cracks, fractures, and dirt.',
    slideOrder: 6,
    required: true,
  },
  {
    id: 'packing-tray',
    title: 'Packing Tray',
    guidance:
      'Photograph the packing tray. Verify structure, fit, and absence of damage.',
    slideOrder: 7,
    required: true,
  },
  {
    id: 'psu',
    title: 'PSU',
    guidance:
      'Inspect and photograph the power supply unit. Check condition, labels, cable, and connector.',
    slideOrder: 8,
    required: true,
  },
  {
    id: 'ethernet-cable',
    title: 'Ethernet Cable',
    guidance:
      'Inspect and photograph the ethernet cable(s). Check condition, length, and connectors. One cable per box, so FR is over the number of samples.',
    slideOrder: 9,
    required: true,
    // Exactly one ethernet cable per box (1PK/2PK/3PK/Basic Box), so the FR
    // denominator is the number of samples, not units-per-pack x samples.
    unitBasis: 'pack',
  },
  {
    id: 'wsl',
    title: 'WSL',
    guidance:
      'Inspect and photograph the WSL. Verify presence, correctness, and condition. One per box, so FR is over the number of samples.',
    slideOrder: 10,
    required: true,
    unitBasis: 'pack',
  },
  {
    id: 'accessories',
    title: 'Accessories',
    guidance:
      'Inspect and photograph the remaining accessories (clamps, adapters, etc.). One set per box, so FR is over the number of samples.',
    slideOrder: 11,
    required: true,
    unitBasis: 'pack',
  },
  {
    id: 'qr-signs',
    title: 'QR Codes',
    guidance:
      'Verify all QR codes are present and scannable. Capture a photo of each and note scan results.',
    slideOrder: 12,
    required: true,
  },
  {
    id: 'power-on',
    title: 'Power-On Test',
    guidance:
      'Confirm the device powers on. Photograph the LED/boot state and note the result.',
    slideOrder: 13,
    required: true,
  },
];
