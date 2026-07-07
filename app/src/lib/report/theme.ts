import type { RiskLevel } from '@/types';

/**
 * Visual theme for the exported deck. Colors are hex strings without the
 * leading '#', as pptxgenjs expects. Kept in sync with the app's Tailwind
 * risk palette and the reference deck's restrained look.
 */

export const COLORS = {
  ink: '181C26',
  inkSoft: '4C5870',
  muted: '808DA4',
  line: 'D4D9E2',
  paper: 'FFFFFF',
  panel: 'F6F7F9',
  brand: '1F47F5',
  white: 'FFFFFF',
} as const;

export interface RiskPalette {
  label: string;
  solid: string;
  soft: string;
  text: string;
}

export const RISK_PALETTE: Record<RiskLevel, RiskPalette> = {
  good: { label: 'Good', solid: '16A34A', soft: 'DCFCE7', text: '166534' },
  low: { label: 'Low risk', solid: 'D97706', soft: 'FEF3C7', text: '92400E' },
  fail: { label: 'Failure', solid: 'DC2626', soft: 'FEE2E2', text: '991B1B' },
};

export const FONT = {
  face: 'Arial',
  title: 32,
  heading: 22,
  subheading: 14,
  body: 12,
  small: 10,
  tiny: 8,
} as const;

/** 16:9 wide layout in inches. */
export const LAYOUT = {
  name: 'WIDE_16x9',
  width: 13.333,
  height: 7.5,
  margin: 0.5,
} as const;

export const CONFIDENTIAL = 'eero / Amazon Confidential';

/** Max photos placed on a single phase slide before continuing to a new one. */
export const PHOTOS_PER_SLIDE = 6;
