import type { ColorKey } from '@/types';

/**
 * Visual theme for the exported deck. Colors are hex strings without the
 * leading '#', as pptxgenjs expects. The title page uses an elegant blue
 * theme; content slides are light with dark text for legibility.
 */

export const COLORS = {
  ink: '111114',
  inkSoft: '3A3B45',
  muted: '8A8C99',
  line: 'DCDCE1',
  paper: 'FFFFFF',
  panel: 'F7F7F8',
  brand: '7C3AED',
  white: 'FFFFFF',
} as const;

/** Title-slide palette: elegant purple. */
export const TITLE = {
  bg: '3A1D6E',
  band: '2C1556',
  accent: 'A78BFA',
  text: 'FFFFFF',
  sub: 'E3DAF7',
  muted: 'B4A3DE',
} as const;

export interface RiskPalette {
  label: string;
  desc: string;
  solid: string;
  soft: string;
  text: string;
}

export const RISK_PALETTE: Record<ColorKey, RiskPalette> = {
  good: {
    label: 'Good / Passed',
    desc: 'Pass / verified',
    solid: '16A34A',
    soft: 'DCFCE7',
    text: '166534',
  },
  low: {
    label: 'Low risk',
    desc: 'Minor issue',
    solid: 'CA8A04',
    soft: 'FEF9C3',
    text: '854D0E',
  },
  medium: {
    label: 'Medium risk',
    desc: 'Notable issue',
    solid: 'EA580C',
    soft: 'FFEDD5',
    text: '9A3412',
  },
  high: {
    label: 'High risk',
    desc: 'Stop ship / major failure',
    solid: 'DC2626',
    soft: 'FEE2E2',
    text: '991B1B',
  },
  waived: {
    label: 'Waived',
    desc: 'Accepted / dismissed',
    solid: '2563EB',
    soft: 'DBEAFE',
    text: '1E40AF',
  },
  discuss: {
    label: 'Needs discussion',
    desc: 'Pending team review',
    solid: '475569',
    soft: 'E2E8F0',
    text: '334155',
  },
};

/** Order used for the deck legend. */
export const LEGEND_ORDER: ColorKey[] = [
  'good',
  'low',
  'medium',
  'high',
  'waived',
  'discuss',
];

export const FONT = {
  face: 'Arial',
  title: 32,
  heading: 22,
  subheading: 14,
  body: 12,
  small: 10,
  tiny: 8,
} as const;

export const LAYOUT = {
  name: 'WIDE_16x9',
  width: 13.333,
  height: 7.5,
  margin: 0.5,
} as const;

export const CONFIDENTIAL = 'eero / Amazon Confidential';
