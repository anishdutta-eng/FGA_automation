/**
 * Core data model for the FGA inspection tool.
 *
 * An Inspection covers one SKU and may span multiple physical samples/units.
 * Failure Rate (FR) is always expressed as F / T where:
 *   F = number of samples that failed a given check
 *   T = number of samples inspected (Inspection.sampleCount)
 * FR is a DERIVED value and is never stored directly.
 */

/** Risk level drives the color coding across the app and exported deck. */
export type RiskLevel = 'good' | 'low' | 'fail';

/** Status annotations that can override the plain pass/fail reading. */
export type ObservationStatus = 'normal' | 'waived';

export interface PhotoRef {
  id: string;
  /** Original file name from the dropped file. */
  name: string;
  /** In-memory object URL for preview (revoked on removal). */
  url: string;
  /** MIME type, e.g. image/jpeg. */
  type: string;
  /** Byte size of the source file. */
  size: number;
  /** The underlying File, kept for later upload/export. */
  file: File;
}

export interface Observation {
  id: string;
  /** Free-text note describing what was seen. */
  text: string;
  risk: RiskLevel;
  status: ObservationStatus;
  /** F — number of samples that failed this specific check. */
  failedSamples: number;
  /** Optional structured fields that feed the summary table. */
  failureMode?: string;
  nextSteps?: string;
  dri?: string;
}

export interface Phase {
  id: string;
  /** Slide/section title, e.g. "Tear label inspection". */
  title: string;
  /** Short helper shown under the title to guide the engineer. */
  guidance: string;
  /** Determines slide ordering in the exported deck. */
  slideOrder: number;
  /** Whether photos are required before the deck can be generated. */
  required: boolean;
  photos: PhotoRef[];
  observations: Observation[];
}

export interface InspectionMeta {
  fgaJira: string;
  sku: string;
  productName: string;
  /** ISO date string (yyyy-mm-dd). */
  date: string;
  dri: string;
  /** T — total number of samples/units inspected in this session. */
  sampleCount: number;
  /** Optional free-form region/market note for the title slide. */
  region: string;
}

export interface Inspection extends InspectionMeta {
  phases: Phase[];
}
