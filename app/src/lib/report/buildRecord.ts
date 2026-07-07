import type { Inspection } from '@/types';
import { phaseFr, computeFr, aggregateRisk } from '@/lib/fr';

/**
 * Full inspection record as a portable JSON document — the durable data behind
 * the deck. Photo binaries are referenced by name/size (the deck carries the
 * images themselves); everything else is captured verbatim plus derived FR.
 */
export interface InspectionRecord {
  generatedAt: string;
  meta: {
    fgaJira: string;
    sku: string;
    productName: string;
    region: string;
    date: string;
    dri: string;
    sampleCount: number;
  };
  overallRisk: 'good' | 'low' | 'fail';
  phases: Array<{
    id: string;
    title: string;
    slideOrder: number;
    risk: 'good' | 'low' | 'fail' | null;
    fr: { failed: number; trials: number; ratio: number; label: string; percent: string };
    photos: Array<{ name: string; type: string; size: number }>;
    observations: Array<{
      text: string;
      risk: string;
      status: string;
      failedSamples: number;
      fr: { label: string; percent: string };
      failureMode?: string;
      nextSteps?: string;
      dri?: string;
    }>;
  }>;
}

export function buildRecord(ins: Inspection): InspectionRecord {
  const anyFail = ins.phases.some((p) => aggregateRisk(p.observations) === 'fail');
  const anyLow = ins.phases.some((p) => aggregateRisk(p.observations) === 'low');

  return {
    generatedAt: new Date().toISOString(),
    meta: {
      fgaJira: ins.fgaJira,
      sku: ins.sku,
      productName: ins.productName,
      region: ins.region,
      date: ins.date,
      dri: ins.dri,
      sampleCount: ins.sampleCount,
    },
    overallRisk: anyFail ? 'fail' : anyLow ? 'low' : 'good',
    phases: ins.phases.map((phase) => {
      const fr = phaseFr(phase, ins.sampleCount);
      return {
        id: phase.id,
        title: phase.title,
        slideOrder: phase.slideOrder,
        risk: aggregateRisk(phase.observations),
        fr,
        photos: phase.photos.map((ph) => ({
          name: ph.name,
          type: ph.type,
          size: ph.size,
        })),
        observations: phase.observations.map((o) => {
          const ofr = computeFr(o.failedSamples, ins.sampleCount);
          return {
            text: o.text,
            risk: o.risk,
            status: o.status,
            failedSamples: o.failedSamples,
            fr: { label: ofr.label, percent: ofr.percent },
            failureMode: o.failureMode,
            nextSteps: o.nextSteps,
            dri: o.dri,
          };
        }),
      };
    }),
  };
}

function sanitize(s: string): string {
  return s.replace(/[^a-z0-9._-]+/gi, '_').replace(/^_+|_+$/g, '') || 'inspection';
}

/** Trigger a browser download of the JSON record. */
export function downloadRecord(ins: Inspection): void {
  const record = buildRecord(ins);
  const blob = new Blob([JSON.stringify(record, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `FGA_${sanitize(ins.sku)}_${ins.date}_record.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
