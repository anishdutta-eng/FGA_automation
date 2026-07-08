import type { Inspection } from '@/types';
import {
  phaseFr,
  observationFr,
  aggregateColor,
  colorOf,
  totalUnits,
  phasePhotoCount,
  deckDisplayName,
} from '@/lib/fr';
import { boxType } from '@/config/options';

/**
 * Full inspection record as a portable JSON document — the durable data behind
 * the deck. Photo binaries are referenced by name/size; everything else is
 * captured verbatim plus derived FR and colors.
 */
export interface InspectionRecord {
  generatedAt: string;
  deckName: string;
  meta: {
    fgaJira: string;
    sku: string;
    productName: string;
    phaseGate: string;
    countryCode: string;
    boxType: string;
    unitsPerPack: number;
    sampleCount: number;
    totalUnits: number;
    date: string;
    dri: string;
  };
  overall: string;
  phases: Array<{
    id: string;
    title: string;
    slideOrder: number;
    color: string | null;
    fr: { failed: number; trials: number; ratio: number; label: string; percent: string };
    photoCount: number;
    slides: Array<{ index: number; photos: Array<{ name: string; type: string; size: number }> }>;
    observations: Array<{
      text: string;
      risk: string;
      status: string;
      color: string;
      affectedSamples: number;
      fr: { label: string; percent: string };
      failureMode?: string;
      nextSteps?: string;
      dri?: string;
    }>;
  }>;
}

export function buildRecord(ins: Inspection): InspectionRecord {
  const units = totalUnits(ins);
  const worst = ins.phases
    .map((p) => aggregateColor(p.observations))
    .filter(Boolean) as string[];

  return {
    generatedAt: new Date().toISOString(),
    deckName: deckDisplayName(ins, boxType(ins.boxType).fileLabel),
    meta: {
      fgaJira: ins.fgaJira,
      sku: ins.sku,
      productName: ins.productName,
      phaseGate: ins.phaseGate,
      countryCode: ins.countryCode,
      boxType: boxType(ins.boxType).label,
      unitsPerPack: ins.unitsPerPack,
      sampleCount: ins.sampleCount,
      totalUnits: units,
      date: ins.date,
      dri: ins.dri,
    },
    overall: worst.includes('high')
      ? 'high'
      : worst.includes('medium')
        ? 'medium'
        : worst.includes('low')
          ? 'low'
          : worst.includes('discuss')
            ? 'discuss'
            : 'good',
    phases: ins.phases.map((phase) => ({
      id: phase.id,
      title: phase.title,
      slideOrder: phase.slideOrder,
      color: aggregateColor(phase.observations),
      fr: phaseFr(phase, units),
      photoCount: phasePhotoCount(phase),
      slides: phase.slides.map((s, i) => ({
        index: i + 1,
        photos: s.photos.map((ph) => ({ name: ph.name, type: ph.type, size: ph.size })),
      })),
      observations: phase.observations.map((o) => {
        const ofr = observationFr(o, units);
        return {
          text: o.text,
          risk: o.risk,
          status: o.status,
          color: colorOf(o),
          affectedSamples: o.affectedSamples,
          fr: { label: ofr.label, percent: ofr.percent },
          failureMode: o.failureMode,
          nextSteps: o.nextSteps,
          dri: o.dri,
        };
      }),
    })),
  };
}

function sanitize(s: string): string {
  return s.replace(/[^a-z0-9._-]+/gi, '_').replace(/^_+|_+$/g, '') || 'inspection';
}

export function downloadRecord(ins: Inspection): void {
  const record = buildRecord(ins);
  const blob = new Blob([JSON.stringify(record, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${sanitize(record.deckName)}_record.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
