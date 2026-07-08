import type {
  ColorKey,
  InspectionMeta,
  Observation,
  Phase,
} from '@/types';

/**
 * Failure Rate + risk color helpers.
 *
 *   T  = unitsPerPack * sampleCount        (total inspected units)
 *   FR = affectedSamples / T               (per observation, 0% for "good")
 */

export function totalUnits(meta: {
  unitsPerPack: number;
  sampleCount: number;
}): number {
  return Math.max(0, Math.floor(meta.unitsPerPack)) * Math.max(0, Math.floor(meta.sampleCount));
}

export interface FrResult {
  failed: number;
  trials: number;
  ratio: number;
  label: string;
  percent: string;
}

export function computeFr(failed: number, trials: number): FrResult {
  const safeTrials = Math.max(0, Math.floor(trials));
  const safeFailed = Math.max(0, Math.min(Math.floor(failed), safeTrials || failed));
  const ratio = safeTrials > 0 ? safeFailed / safeTrials : 0;
  return {
    failed: safeFailed,
    trials: safeTrials,
    ratio,
    label: `${safeFailed}/${safeTrials}`,
    percent: `${Math.round(ratio * 100)}%`,
  };
}

/** FR for a single observation. "Good" is always 0%. */
export function observationFr(o: Observation, units: number): FrResult {
  if (o.risk === 'good') return computeFr(0, units);
  return computeFr(o.affectedSamples, units);
}

/** Total photos across all of a phase's slides. */
export function phasePhotoCount(phase: Phase): number {
  return phase.slides.reduce((n, s) => n + s.photos.length, 0);
}

/** All observations across a phase's slides. */
export function phaseObservations(phase: Phase): Observation[] {
  return phase.slides.flatMap((s) => s.observations);
}

/**
 * A phase is "complete" once it has at least one photo and one observation.
 */
export function isPhaseComplete(phase: Phase): boolean {
  return phasePhotoCount(phase) > 0 && phaseObservations(phase).length > 0;
}

/** Aggregate FR across a set of observations. */
export function observationsFr(observations: Observation[], units: number): FrResult {
  const failed = observations.reduce(
    (sum, o) =>
      sum + (o.status === 'waived' || o.risk === 'good' ? 0 : o.affectedSamples),
    0,
  );
  return computeFr(failed, units);
}

/** Aggregate FR for a phase: affected units across non-waived observations. */
export function phaseFr(phase: Phase, units: number): FrResult {
  return observationsFr(phaseObservations(phase), units);
}

/** The display color for a single observation (status overrides severity). */
export function colorOf(o: Observation): ColorKey {
  if (o.status === 'waived') return 'waived';
  if (o.status === 'discuss') return 'discuss';
  return o.risk;
}

const COLOR_WEIGHT: Record<ColorKey, number> = {
  good: 1,
  discuss: 1.5,
  low: 2,
  medium: 3,
  high: 4,
  waived: 0,
};

/** The most significant color across a phase's observations (waived ignored). */
export function aggregateColor(observations: Observation[]): ColorKey | null {
  const active = observations.filter((o) => o.status !== 'waived');
  if (active.length === 0) return null;
  let best: ColorKey = 'good';
  for (const o of active) {
    const c = colorOf(o);
    if (COLOR_WEIGHT[c] > COLOR_WEIGHT[best]) best = c;
  }
  return best;
}

export interface ColorMeta {
  label: string;
  dot: string;
  text: string;
  bg: string;
  border: string;
  chip: string;
}

export const RISK_META: Record<ColorKey, ColorMeta> = {
  good: {
    label: 'Good / Passed',
    dot: 'bg-risk-good',
    text: 'text-risk-good',
    bg: 'bg-risk-goodSoft',
    border: 'border-risk-good',
    chip: 'bg-risk-goodSoft text-risk-good',
  },
  low: {
    label: 'Low risk',
    dot: 'bg-risk-low',
    text: 'text-risk-low',
    bg: 'bg-risk-lowSoft',
    border: 'border-risk-low',
    chip: 'bg-risk-lowSoft text-risk-low',
  },
  medium: {
    label: 'Medium risk',
    dot: 'bg-risk-medium',
    text: 'text-risk-medium',
    bg: 'bg-risk-mediumSoft',
    border: 'border-risk-medium',
    chip: 'bg-risk-mediumSoft text-risk-medium',
  },
  high: {
    label: 'High risk / Stop ship',
    dot: 'bg-risk-high',
    text: 'text-risk-high',
    bg: 'bg-risk-highSoft',
    border: 'border-risk-high',
    chip: 'bg-risk-highSoft text-risk-high',
  },
  waived: {
    label: 'Waived',
    dot: 'bg-risk-waived',
    text: 'text-risk-waived',
    bg: 'bg-risk-waivedSoft',
    border: 'border-risk-waived',
    chip: 'bg-risk-waivedSoft text-risk-waived',
  },
  discuss: {
    label: 'Needs discussion',
    dot: 'bg-risk-discuss',
    text: 'text-risk-discuss',
    bg: 'bg-risk-discussSoft',
    border: 'border-risk-discuss',
    chip: 'bg-risk-discussSoft text-risk-discuss',
  },
};

/** Order used for legends and selectors. */
export const SEVERITY_ORDER: ColorKey[] = ['good', 'low', 'medium', 'high'];
export const STATUS_COLORS: ColorKey[] = ['waived', 'discuss'];

function clean(s: string): string {
  return s.trim().replace(/\s+/g, ' ');
}

/**
 * Deck / file name per the agreed nomenclature:
 *   FGA <Product Name> <SKU> <Phase Gate> <Country Code> <Box file label>
 */
export function deckDisplayName(
  meta: InspectionMeta,
  boxFileLabel: string,
): string {
  return [
    'FGA',
    clean(meta.productName),
    clean(meta.sku),
    meta.phaseGate,
    clean(meta.countryCode),
    boxFileLabel,
  ]
    .filter(Boolean)
    .join(' ');
}
