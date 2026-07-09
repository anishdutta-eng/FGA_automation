import type { Phase } from '@/types';
import { useInspection } from '@/store/useInspection';
import {
  phaseFr,
  aggregateColor,
  phaseObservations,
  phasePhotoCount,
  phaseUnits,
  RISK_META,
} from '@/lib/fr';
import { PHOTOS_PER_SLIDE } from '@/config/options';
import { PhotoDropzone } from './PhotoDropzone';
import { PhotoGrid } from './PhotoGrid';
import { ObservationRow } from './ObservationEditor';
import { RiskBadge } from './RiskBadge';
import { cn } from '@/lib/cn';

interface PhasePanelProps {
  phase: Phase;
}

export function PhasePanel({ phase }: PhasePanelProps) {
  const meta = useInspection((s) => s.meta);
  const addSlide = useInspection((s) => s.addSlide);
  const removeSlide = useInspection((s) => s.removeSlide);
  const addPhotos = useInspection((s) => s.addPhotos);
  const removePhoto = useInspection((s) => s.removePhoto);
  const reorderPhotos = useInspection((s) => s.reorderPhotos);
  const addObservation = useInspection((s) => s.addObservation);
  const updateObservation = useInspection((s) => s.updateObservation);
  const removeObservation = useInspection((s) => s.removeObservation);

  const units = phaseUnits(meta, phase);
  const observations = phaseObservations(phase);
  const color = aggregateColor(observations);
  const fr = phaseFr(phase, units);
  const showFr = observations.some(
    (o) => o.status !== 'waived' && o.risk !== 'good' && o.affectedSamples > 0,
  );
  const photoCount = phasePhotoCount(phase);

  return (
    <div className="mx-auto max-w-4xl animate-fade-in">
      {/* Header */}
      <header className="mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-700 text-sm font-bold text-white">
            {phase.slideOrder}
          </span>
          <h2 className="text-2xl font-bold tracking-tight text-ink-900">
            {phase.title}
          </h2>
          {color && <RiskBadge color={color} />}
          {showFr && (
            <span className="rounded-full bg-risk-highSoft px-2.5 py-1 font-mono text-xs font-semibold text-risk-high">
              FR {fr.label} · {fr.percent}
            </span>
          )}
        </div>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-500">
          {phase.guidance}
        </p>
      </header>

      {/* Slides: photos + observations per slide */}
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-ink-500">
          Slides
          <span className="ml-2 rounded-full bg-ink-100 px-2 py-0.5 text-xs font-semibold text-ink-600">
            {phase.slides.length}
          </span>
        </h3>
        <span className="text-xs text-ink-400">
          {photoCount} photo{photoCount === 1 ? '' : 's'} · T = {units}{' '}
          {phase.unitBasis === 'pack' ? 'per box' : 'units'}
        </span>
      </div>

      <div className="space-y-4">
        {phase.slides.map((slide, i) => {
          const full = slide.photos.length >= PHOTOS_PER_SLIDE;
          return (
            <div key={slide.id} className="card p-5">
              <div className="mb-3 flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm font-bold text-ink-800">
                  Slide {i + 1}
                  <span
                    className={cn(
                      'rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums',
                      full ? 'bg-risk-goodSoft text-risk-good' : 'bg-ink-100 text-ink-500',
                    )}
                  >
                    {slide.photos.length}/{PHOTOS_PER_SLIDE}
                  </span>
                </span>
                {(phase.slides.length > 1 ||
                  slide.photos.length > 0 ||
                  slide.observations.length > 0) && (
                  <button
                    type="button"
                    onClick={() => removeSlide(phase.id, slide.id)}
                    className="text-xs font-semibold text-ink-400 transition hover:text-risk-high"
                  >
                    {phase.slides.length > 1 ? 'Remove slide' : 'Clear'}
                  </button>
                )}
              </div>

              {/* Photos */}
              {slide.photos.length > 0 && (
                <div className="mb-3">
                  <PhotoGrid
                    photos={slide.photos}
                    onRemove={(id) => removePhoto(phase.id, slide.id, id)}
                    onReorder={(from, to) =>
                      reorderPhotos(phase.id, slide.id, from, to)
                    }
                  />
                </div>
              )}
              {full ? (
                <p className="rounded-xl bg-risk-goodSoft px-3 py-2 text-center text-xs font-medium text-risk-good">
                  Slide full — add another slide for more photos
                </p>
              ) : (
                <PhotoDropzone
                  onFiles={(files) => addPhotos(phase.id, slide.id, files)}
                  compact={slide.photos.length > 0}
                />
              )}

              {/* Observations for this slide */}
              <div className="mt-4 border-t border-ink-100 pt-4">
                <h4 className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-ink-400">
                  Observations
                </h4>
                <div className="space-y-2.5">
                  {slide.observations.map((obs) => (
                    <ObservationRow
                      key={obs.id}
                      observation={obs}
                      units={units}
                      onChange={(patch) =>
                        updateObservation(phase.id, slide.id, obs.id, patch)
                      }
                      onRemove={() => removeObservation(phase.id, slide.id, obs.id)}
                    />
                  ))}
                </div>
                {slide.observations.length === 0 && (
                  <p className="mb-3 rounded-xl bg-ink-50 px-4 py-4 text-center text-sm text-ink-400">
                    No observations yet for this slide.
                  </p>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  {(['good', 'low', 'medium', 'high'] as const).map((r) => {
                    const rm = RISK_META[r];
                    return (
                      <button
                        key={r}
                        type="button"
                        onClick={() => addObservation(phase.id, slide.id, r)}
                        className="inline-flex items-center gap-2 rounded-full border border-ink-200 px-3 py-1.5 text-xs font-semibold transition hover:shadow-card"
                      >
                        <span className={cn('h-2.5 w-2.5 rounded-full', rm.dot)} />
                        {rm.label.split(' ')[0]}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => addSlide(phase.id)}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-ink-200 py-3 text-sm font-semibold text-ink-500 transition hover:border-brand-400 hover:bg-brand-50/40 hover:text-brand-700"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        Add slide
      </button>
    </div>
  );
}
