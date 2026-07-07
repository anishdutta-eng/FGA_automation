import type { Observation, Phase, RiskLevel } from '@/types';

/**
 * Failure Rate helpers.
 *
 * FR = F / T
 *   F = number of failed samples for a given check/observation
 *   T = number of samples inspected (sampleCount)
 */

export interface FrResult {
  failed: number;
  trials: number;
  /** Ratio in [0, 1]. 0 when trials is 0. */
  ratio: number;
  /** Human label, e.g. "1/4". */
  label: string;
  /** Percentage label, e.g. "25%". */
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

/** Aggregate FR for a phase: total failed samples across observations over T. */
export function phaseFr(phase: Phase, sampleCount: number): FrResult {
  const failed = phase.observations.reduce(
    (sum, o) => sum + (o.status === 'waived' ? 0 : o.failedSamples),
    0,
  );
  return computeFr(failed, sampleCount);
}

/**
 * A phase is "complete" once it has been both documented (at least one photo)
 * and assessed (at least one observation). This drives the green/grey status
 * light in the timeline and the overall progress + export gate.
 */
export function isPhaseComplete(phase: Phase): boolean {
  return phase.photos.length > 0 && phase.observations.length > 0;
}

/** The worst (highest) risk level present in a set of observations. */
export function aggregateRisk(observations: Observation[]): RiskLevel | null {
  if (observations.length === 0) return null;
  const active = observations.filter((o) => o.status !== 'waived');
  if (active.some((o) => o.risk === 'fail')) return 'fail';
  if (active.some((o) => o.risk === 'low')) return 'low';
  if (active.length === 0) return 'good';
  return 'good';
}

export const RISK_META: Record<
  RiskLevel,
  { label: string; dot: string; text: string; bg: string; border: string; chip: string }
> = {
  good: {
    label: 'Good',
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
  fail: {
    label: 'Failure',
    dot: 'bg-risk-fail',
    text: 'text-risk-fail',
    bg: 'bg-risk-failSoft',
    border: 'border-risk-fail',
    chip: 'bg-risk-failSoft text-risk-fail',
  },
};
