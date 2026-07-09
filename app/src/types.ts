/**
 * Core data model for the FGA inspection tool.
 *
 * An Inspection covers one SKU across a chosen box type and phase gate. It may
 * span multiple physical samples (boxes), each containing `unitsPerPack`
 * devices. The total inspected units is:
 *
 *   T = unitsPerPack * sampleCount
 *
 * Failure Rate (FR) for any observation is:
 *
 *   FR = affectedSamples / T
 *
 * where affectedSamples is the number of units that exhibited that behavior.
 * FR is a DERIVED value and is never stored directly. "Good" observations are
 * always 0%.
 */

import type { BoxTypeId, PhaseGateId } from '@/config/options';

/** Severity of an observation. */
export type RiskSeverity = 'good' | 'low' | 'medium' | 'high';

/** Status annotations that recolor an observation. */
export type ObservationStatus = 'normal' | 'waived' | 'discuss';

/** All possible display colors (severity + status overrides). */
export type ColorKey = RiskSeverity | 'waived' | 'discuss';

export interface PhotoRef {
  id: string;
  name: string;
  url: string; // ephemeral object URL (regenerated on load)
  type: string;
  size: number;
  /**
   * App-owned copy of the image bytes. We store a Blob (not the original File)
   * so the data is persisted by value in IndexedDB and stays readable after a
   * reload — reading the original File can throw NotFoundError once the OS file
   * reference goes stale.
   */
  blob: Blob;
}

/**
 * A single deck slide: up to 4 photos plus the observations recorded for that
 * slide. Each photo slide carries its own observations so they export together.
 */
export interface PhotoSlide {
  id: string;
  photos: PhotoRef[];
  observations: Observation[];
}

export interface Observation {
  id: string;
  text: string;
  risk: RiskSeverity;
  status: ObservationStatus;
  /** Number of units that exhibited this behavior (0..T). */
  affectedSamples: number;
  failureMode?: string;
  nextSteps?: string;
  dri?: string;
}

/**
 * How many of an item are inspected per box:
 * - 'unit': one per device  -> T = unitsPerPack * sampleCount
 * - 'pack': one per box/pack -> T = sampleCount
 */
export type UnitBasis = 'unit' | 'pack';

export interface Phase {
  id: string;
  title: string;
  guidance: string;
  slideOrder: number;
  required: boolean;
  /** Basis for this phase's Failure Rate denominator (default 'unit'). */
  unitBasis: UnitBasis;
  /** One or more slides, each with photos + observations. Always at least one. */
  slides: PhotoSlide[];
}

export interface InspectionMeta {
  fgaJira: string;
  sku: string;
  productName: string;
  date: string;
  dri: string;
  /** Packaging configuration. */
  boxType: BoxTypeId;
  /** Development phase gate. */
  phaseGate: PhaseGateId;
  /** Destination country code, e.g. US / EU / UK / JP. */
  countryCode: string;
  /** Devices per box/pack (auto from box type, editable). */
  unitsPerPack: number;
  /** Number of samples (boxes/packs) inspected. */
  sampleCount: number;
}

export interface Inspection extends InspectionMeta {
  phases: Phase[];
}
