import { useMemo, useState } from 'react';
import { useInspection } from '@/store/useInspection';
import { PhaseTimeline } from './PhaseTimeline';
import { ProgressMeter } from './ProgressMeter';
import { PhasePanel } from './PhasePanel';
import { aggregateRisk } from '@/lib/fr';
import { cn } from '@/lib/cn';

export function CaptureScreen() {
  const meta = useInspection((s) => s.meta);
  const phases = useInspection((s) => s.phases);
  const activePhaseId = useInspection((s) => s.activePhaseId);
  const setActivePhase = useInspection((s) => s.setActivePhase);
  const resetInspection = useInspection((s) => s.resetInspection);
  const [exportNote, setExportNote] = useState(false);

  const activePhase = phases.find((p) => p.id === activePhaseId) ?? phases[0];

  const requiredPhases = phases.filter((p) => p.required);
  const completed = requiredPhases.filter((p) => p.photos.length > 0).length;
  const allRequiredDone = completed === requiredPhases.length;

  const anyFail = useMemo(
    () => phases.some((p) => aggregateRisk(p.observations) === 'fail'),
    [phases],
  );

  return (
    <div className="flex min-h-screen flex-col bg-ink-50">
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-ink-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink-900">
              <span className="h-3.5 w-3.5 rounded-full border-2 border-brand-400" />
            </span>
            <span className="font-bold tracking-tight text-ink-900">
              FGA Inspection Studio
            </span>
          </div>

          <div className="hidden items-center gap-x-4 gap-y-0.5 text-xs text-ink-500 sm:flex sm:flex-wrap">
            <Meta label="JIRA" value={meta.fgaJira} />
            <Meta label="SKU" value={meta.sku} />
            <Meta label="Product" value={meta.productName} />
            <Meta label="T" value={String(meta.sampleCount)} />
          </div>

          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (confirm('Discard this inspection and start over?')) {
                  resetInspection();
                }
              }}
              className="btn-ghost"
            >
              New
            </button>
            <button
              type="button"
              disabled={!allRequiredDone}
              onClick={() => setExportNote(true)}
              className="btn-primary"
              title={
                allRequiredDone
                  ? 'Generate the slide deck'
                  : 'Add photos to all required phases first'
              }
            >
              Generate Deck
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-7xl flex-1 gap-6 px-4 py-6">
        {/* Sidebar */}
        <aside className="hidden w-72 shrink-0 lg:block">
          <div className="sticky top-20 space-y-4">
            <div className="card p-4">
              <ProgressMeter completed={completed} total={requiredPhases.length} />
              {anyFail && (
                <div className="mt-3 flex items-center gap-2 rounded-lg bg-risk-failSoft px-3 py-2 text-xs font-semibold text-risk-fail">
                  <span className="h-2 w-2 rounded-full bg-risk-fail" />
                  Failures recorded — review before shipping
                </div>
              )}
            </div>
            <div className="card p-2">
              <PhaseTimeline
                phases={phases}
                activePhaseId={activePhase?.id ?? null}
                onSelect={setActivePhase}
              />
            </div>
          </div>
        </aside>

        {/* Main */}
        <main className="min-w-0 flex-1">
          {activePhase && <PhasePanel phase={activePhase} />}
        </main>
      </div>

      {exportNote && (
        <ExportNote onClose={() => setExportNote(false)} />
      )}
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <span className="inline-flex items-center gap-1">
      <span className="font-semibold uppercase tracking-wide text-ink-400">
        {label}
      </span>
      <span className="font-medium text-ink-700">{value}</span>
    </span>
  );
}

function ExportNote({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/60 p-6 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className={cn('card max-w-md p-6 text-center')}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand-50">
          <svg className="h-6 w-6 text-brand-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-ink-900">Ready to export</h3>
        <p className="mt-1.5 text-sm text-ink-500">
          All required phases are documented. Google Slides export lands in the
          next build step — your captured photos and observations are all held
          and ready to assemble into the deck.
        </p>
        <button type="button" onClick={onClose} className="btn-primary mt-5 w-full">
          Got it
        </button>
      </div>
    </div>
  );
}
