import type { Phase } from '@/types';
import { useInspection } from '@/store/useInspection';
import { phaseFr, aggregateRisk, RISK_META } from '@/lib/fr';
import { PhotoDropzone } from './PhotoDropzone';
import { PhotoGrid } from './PhotoGrid';
import { ObservationRow } from './ObservationEditor';
import { RiskBadge } from './RiskBadge';
import { cn } from '@/lib/cn';

interface PhasePanelProps {
  phase: Phase;
}

export function PhasePanel({ phase }: PhasePanelProps) {
  const sampleCount = useInspection((s) => s.meta.sampleCount);
  const addPhotos = useInspection((s) => s.addPhotos);
  const removePhoto = useInspection((s) => s.removePhoto);
  const reorderPhotos = useInspection((s) => s.reorderPhotos);
  const addObservation = useInspection((s) => s.addObservation);
  const updateObservation = useInspection((s) => s.updateObservation);
  const removeObservation = useInspection((s) => s.removeObservation);

  const risk = aggregateRisk(phase.observations);
  const fr = phaseFr(phase, sampleCount);

  return (
    <div className="mx-auto max-w-4xl animate-fade-in">
      {/* Header */}
      <header className="mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink-900 text-sm font-bold text-white">
            {phase.slideOrder}
          </span>
          <h2 className="text-2xl font-bold tracking-tight text-ink-900">
            {phase.title}
          </h2>
          {risk && <RiskBadge risk={risk} />}
          {phase.observations.some((o) => o.status !== 'waived' && o.failedSamples > 0) && (
            <span className="rounded-full bg-risk-failSoft px-2.5 py-1 font-mono text-xs font-semibold text-risk-fail">
              FR {fr.label} · {fr.percent}
            </span>
          )}
        </div>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-500">
          {phase.guidance}
        </p>
      </header>

      {/* Photos */}
      <section className="card mb-6 p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-ink-500">
            Photos
            <span className="ml-2 rounded-full bg-ink-100 px-2 py-0.5 text-xs font-semibold text-ink-600">
              {phase.photos.length}
            </span>
          </h3>
        </div>

        {phase.photos.length > 0 && (
          <div className="mb-4">
            <PhotoGrid
              photos={phase.photos}
              onRemove={(id) => removePhoto(phase.id, id)}
              onReorder={(from, to) => reorderPhotos(phase.id, from, to)}
            />
          </div>
        )}

        <PhotoDropzone
          onFiles={(files) => addPhotos(phase.id, files)}
          compact={phase.photos.length > 0}
        />
      </section>

      {/* Observations */}
      <section className="card p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-ink-500">
            Observations
          </h3>
        </div>

        <div className="space-y-2.5">
          {phase.observations.map((obs) => (
            <ObservationRow
              key={obs.id}
              observation={obs}
              sampleCount={sampleCount}
              onChange={(patch) => updateObservation(phase.id, obs.id, patch)}
              onRemove={() => removeObservation(phase.id, obs.id)}
            />
          ))}
        </div>

        {phase.observations.length === 0 && (
          <p className="mb-4 rounded-xl bg-ink-50 px-4 py-6 text-center text-sm text-ink-400">
            No observations yet. Add one and tag it by risk.
          </p>
        )}

        {/* Quick-add buttons */}
        <div className="mt-4 flex flex-wrap gap-2">
          {(['good', 'low', 'fail'] as const).map((r) => {
            const rm = RISK_META[r];
            return (
              <button
                key={r}
                type="button"
                onClick={() => addObservation(phase.id, r)}
                className={cn(
                  'inline-flex items-center gap-2 rounded-xl border border-ink-200 px-3 py-2 text-sm font-semibold transition hover:shadow-card',
                  'hover:' + rm.border.replace('border-', 'border-'),
                )}
              >
                <span className={cn('h-2.5 w-2.5 rounded-full', rm.dot)} />
                Add {rm.label.toLowerCase()}
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
