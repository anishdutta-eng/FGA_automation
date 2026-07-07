import { useState } from 'react';
import type { InspectionMeta } from '@/types';
import { useInspection } from '@/store/useInspection';

const FIELD_HINTS: Record<string, string> = {
  fgaJira: 'e.g. FGA-1234',
  sku: 'e.g. 860-00181',
  productName: 'e.g. Snowbird / Goldfinch',
  dri: 'e.g. @JC',
  region: 'e.g. EU / NA',
};

export function SetupScreen() {
  const startInspection = useInspection((s) => s.startInspection);
  const [meta, setMeta] = useState<InspectionMeta>({
    fgaJira: '',
    sku: '',
    productName: '',
    date: new Date().toISOString().slice(0, 10),
    dri: '',
    sampleCount: 1,
    region: '',
  });

  const canStart =
    meta.fgaJira.trim() !== '' &&
    meta.sku.trim() !== '' &&
    meta.productName.trim() !== '' &&
    meta.sampleCount >= 1;

  const set = (patch: Partial<InspectionMeta>) =>
    setMeta((m) => ({ ...m, ...patch }));

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-ink-50 to-ink-100 p-6">
      <div className="w-full max-w-xl animate-fade-in">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-ink-900 shadow-lift">
            <span className="h-5 w-5 rounded-full border-[3px] border-brand-400">
              <span className="block h-full w-full scale-[0.35] rounded-full bg-risk-good" />
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-ink-900">
            FGA Inspection Studio
          </h1>
          <p className="mt-1.5 text-sm text-ink-500">
            Document a hardware inspection and generate a review-ready deck.
          </p>
        </div>

        <form
          className="card space-y-5 p-6"
          onSubmit={(e) => {
            e.preventDefault();
            if (canStart) startInspection(meta);
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">FGA JIRA</label>
              <input
                className="input"
                placeholder={FIELD_HINTS.fgaJira}
                value={meta.fgaJira}
                onChange={(e) => set({ fgaJira: e.target.value })}
              />
            </div>
            <div>
              <label className="label">SKU</label>
              <input
                className="input"
                placeholder={FIELD_HINTS.sku}
                value={meta.sku}
                onChange={(e) => set({ sku: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="label">eero Product Name</label>
            <input
              className="input"
              placeholder={FIELD_HINTS.productName}
              value={meta.productName}
              onChange={(e) => set({ productName: e.target.value })}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="label">Date</label>
              <input
                type="date"
                className="input"
                value={meta.date}
                onChange={(e) => set({ date: e.target.value })}
              />
            </div>
            <div>
              <label className="label">DRI</label>
              <input
                className="input"
                placeholder={FIELD_HINTS.dri}
                value={meta.dri}
                onChange={(e) => set({ dri: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Region</label>
              <input
                className="input"
                placeholder={FIELD_HINTS.region}
                value={meta.region}
                onChange={(e) => set({ region: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="label">Samples inspected (T)</label>
            <input
              type="number"
              min={1}
              className="input"
              value={meta.sampleCount}
              onChange={(e) =>
                set({ sampleCount: Math.max(1, Number(e.target.value)) })
              }
            />
            <p className="mt-1.5 text-xs text-ink-400">
              Failure Rate is computed as failed samples ÷ this count.
            </p>
          </div>

          <button type="submit" className="btn-primary w-full" disabled={!canStart}>
            Start inspection
          </button>
        </form>
      </div>
    </div>
  );
}
