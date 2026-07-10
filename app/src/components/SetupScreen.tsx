import { useState } from 'react';
import type { InspectionMeta } from '@/types';
import { useInspection } from '@/store/useInspection';
import {
  BOX_TYPES,
  PHASE_GATES,
  boxType,
  type BoxTypeId,
  type PhaseGateId,
} from '@/config/options';
import { totalUnits, deckDisplayName } from '@/lib/fr';
import { VERSION_LABEL } from '@/version';
import { cn } from '@/lib/cn';

export function SetupScreen() {
  const startInspection = useInspection((s) => s.startInspection);
  const [meta, setMeta] = useState<InspectionMeta>({
    fgaJira: '',
    sku: '',
    productName: '',
    date: new Date().toISOString().slice(0, 10),
    dri: '',
    boxType: 'pk1',
    phaseGate: 'EVT',
    countryCode: '',
    unitsPerPack: boxType('pk1').unitsPerPack,
    sampleCount: 1,
  });

  const set = (patch: Partial<InspectionMeta>) => setMeta((m) => ({ ...m, ...patch }));

  const setBox = (id: BoxTypeId) =>
    set({ boxType: id, unitsPerPack: boxType(id).unitsPerPack });

  const T = totalUnits(meta);
  const canStart =
    meta.fgaJira.trim() !== '' &&
    meta.sku.trim() !== '' &&
    meta.productName.trim() !== '' &&
    meta.sampleCount >= 1 &&
    meta.unitsPerPack >= 1;

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-b from-brand-50 via-ink-50 to-ink-50 p-6">
      {/* Decorative product imagery — subtle, flanking the card on wide screens */}
      <img
        src="/left_picture.webp"
        alt=""
        aria-hidden="true"
        decoding="async"
        className="pointer-events-none absolute left-0 top-1/2 hidden -translate-y-1/2 select-none opacity-80 drop-shadow-xl lg:block lg:w-[32vw] lg:max-w-md xl:w-[34vw] xl:max-w-lg [mask-image:linear-gradient(to_right,transparent,black_50%)]"
      />
      <img
        src="/right_picture.webp"
        alt=""
        aria-hidden="true"
        decoding="async"
        className="pointer-events-none absolute right-0 top-1/2 hidden -translate-y-1/2 select-none opacity-80 drop-shadow-xl lg:block lg:w-[32vw] lg:max-w-md xl:w-[34vw] xl:max-w-lg [mask-image:linear-gradient(to_left,transparent,black_50%)]"
      />

      <div className="relative z-10 w-full max-w-2xl animate-fade-in">
        <div className="mb-9 text-center">
          <div className="mx-auto mb-5 inline-flex items-center gap-1.5 rounded-2xl bg-gradient-to-br from-brand-600 to-brand-800 px-4 py-3 shadow-lift">
            <span className="text-2xl font-extrabold tracking-tight text-white">
              FGA
            </span>
            <span className="h-2 w-2 rounded-full bg-accent-400" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-ink-900">
            Inspection Studio
          </h1>
          <p className="mt-3 text-sm text-ink-400">
            Document a product inspection and generate a review-ready presentation.
          </p>
        </div>

        <form
          className="card space-y-5 p-8"
          onSubmit={(e) => {
            e.preventDefault();
            if (canStart) startInspection(meta);
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="FGA JIRA">
              <input
                className="input"
                placeholder="e.g. LUX-1234"
                value={meta.fgaJira}
                onChange={(e) => set({ fgaJira: e.target.value })}
              />
            </Field>
            <Field label="SKU">
              <input
                className="input"
                placeholder="e.g. SN1111"
                value={meta.sku}
                onChange={(e) => set({ sku: e.target.value })}
              />
            </Field>
          </div>

          <Field label="eero Product Name">
            <input
              className="input"
              placeholder="e.g. eero Max 7"
              value={meta.productName}
              onChange={(e) =>
                set({ productName: e.target.value.replace(/eero/gi, 'eero') })
              }
            />
          </Field>

          {/* Box type */}
          <Field label="Box type">
            <div className="flex flex-wrap gap-2">
              {BOX_TYPES.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setBox(b.id)}
                  className={cn(
                    'rounded-full border px-4 py-2 text-sm font-semibold transition',
                    meta.boxType === b.id
                      ? 'border-brand-600 bg-brand-600 text-white shadow-card'
                      : 'border-ink-200 bg-white text-ink-700 hover:border-brand-300',
                  )}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </Field>

          {/* Phase gate */}
          <Field label="Phase gate">
            <div className="flex flex-wrap gap-2">
              {PHASE_GATES.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => set({ phaseGate: g.id as PhaseGateId })}
                  className={cn(
                    'rounded-full border px-4 py-2 text-sm font-semibold transition',
                    meta.phaseGate === g.id
                      ? 'border-brand-600 bg-brand-600 text-white shadow-card'
                      : 'border-ink-200 bg-white text-ink-700 hover:border-brand-300',
                  )}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </Field>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Country code">
              <input
                className="input"
                placeholder="e.g. US / EU / JP"
                value={meta.countryCode}
                onChange={(e) => set({ countryCode: e.target.value.toUpperCase() })}
              />
            </Field>
            <Field label="DRI">
              <input
                className="input"
                placeholder="e.g. Anish"
                value={meta.dri}
                onChange={(e) => set({ dri: e.target.value })}
              />
            </Field>
            <Field label="Date">
              <input
                type="date"
                className="input"
                value={meta.date}
                onChange={(e) => set({ date: e.target.value })}
              />
            </Field>
          </div>

          {/* Sampling */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Units per pack">
              <input
                type="number"
                min={1}
                inputMode="numeric"
                className="input"
                value={meta.unitsPerPack === 0 ? '' : meta.unitsPerPack}
                onChange={(e) => {
                  const raw = e.target.value;
                  set({
                    unitsPerPack:
                      raw === '' ? 0 : Math.max(0, Math.floor(Number(raw) || 0)),
                  });
                }}
                onBlur={(e) => {
                  if (e.target.value === '' || Number(e.target.value) < 1) {
                    set({ unitsPerPack: 1 });
                  }
                }}
              />
            </Field>
            <Field label="Samples (boxes) inspected">
              <input
                type="number"
                min={1}
                inputMode="numeric"
                className="input"
                value={meta.sampleCount === 0 ? '' : meta.sampleCount}
                onChange={(e) => {
                  const raw = e.target.value;
                  set({
                    sampleCount:
                      raw === '' ? 0 : Math.max(0, Math.floor(Number(raw) || 0)),
                  });
                }}
                onBlur={(e) => {
                  if (e.target.value === '' || Number(e.target.value) < 1) {
                    set({ sampleCount: 1 });
                  }
                }}
              />
            </Field>
          </div>

          {/* Derived total + name preview */}
          <div className="rounded-xl bg-brand-50 px-4 py-3">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-ink-600">
                Total inspected units (T)
              </span>
              <span className="font-mono text-base font-bold text-brand-700">
                {meta.unitsPerPack} × {meta.sampleCount} = {T}
              </span>
            </div>
            <div className="mt-2 truncate border-t border-brand-100 pt-2 text-xs text-ink-500">
              Deck name:{' '}
              <span className="font-medium text-ink-700">
                {deckDisplayName(meta, boxType(meta.boxType).fileLabel)}
              </span>
            </div>
          </div>

          <button type="submit" className="btn-primary w-full" disabled={!canStart}>
            Start inspection
          </button>
        </form>

        <p className="mt-4 text-center text-[11px] text-ink-400">
          FGA Inspection Studio · {VERSION_LABEL}
        </p>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
    </div>
  );
}
