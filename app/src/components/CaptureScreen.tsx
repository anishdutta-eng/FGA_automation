import { useMemo, useState } from 'react';
import { useInspection } from '@/store/useInspection';
import { PhaseTimeline } from './PhaseTimeline';
import { ProgressMeter } from './ProgressMeter';
import { PhasePanel } from './PhasePanel';
import { SaveIndicator } from './SaveIndicator';
import { GenerateModal } from './GenerateModal';
import { Wordmark } from './Wordmark';
import { VERSION_LABEL } from '@/version';
import {
  aggregateColor,
  isPhaseComplete,
  phaseObservations,
  phasePhotoCount,
  totalUnits,
} from '@/lib/fr';

export function CaptureScreen() {
  const meta = useInspection((s) => s.meta);
  const phases = useInspection((s) => s.phases);
  const activePhaseId = useInspection((s) => s.activePhaseId);
  const setActivePhase = useInspection((s) => s.setActivePhase);
  const resetInspection = useInspection((s) => s.resetInspection);
  const [showGenerate, setShowGenerate] = useState(false);

  const activePhase = phases.find((p) => p.id === activePhaseId) ?? phases[0];

  const requiredPhases = phases.filter((p) => p.required);
  const completed = requiredPhases.filter(isPhaseComplete).length;
  // Report can be generated at any time, as long as there's something to show.
  const hasContent = phases.some(
    (p) => phasePhotoCount(p) > 0 || phaseObservations(p).length > 0,
  );

  const anyFail = useMemo(
    () => phases.some((p) => aggregateColor(phaseObservations(p)) === 'high'),
    [phases],
  );

  return (
    <div className="flex min-h-screen flex-col bg-ink-50">
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-ink-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
          <Wordmark />
          <span className="hidden rounded-full bg-ink-100 px-2 py-0.5 text-[10px] font-semibold text-ink-500 sm:inline">
            {VERSION_LABEL}
          </span>

          <div className="hidden items-center gap-x-4 gap-y-0.5 text-xs text-ink-500 sm:flex sm:flex-wrap">
            <Meta label="JIRA" value={meta.fgaJira} />
            <Meta label="SKU" value={meta.sku} />
            <Meta label="Product" value={meta.productName} />
            <Meta label="T" value={String(totalUnits(meta))} />
          </div>

          <div className="ml-auto flex items-center gap-3">
            <SaveIndicator />
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
              disabled={!hasContent}
              onClick={() => setShowGenerate(true)}
              className="btn-primary"
              title={
                hasContent
                  ? 'Generate the report'
                  : 'Add at least one photo or observation first'
              }
            >
              Generate Report
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
                <div className="mt-3 flex items-center gap-2 rounded-lg bg-risk-highSoft px-3 py-2 text-xs font-semibold text-risk-high">
                  <span className="h-2 w-2 rounded-full bg-risk-high" />
                  High-risk failures recorded — review before shipping
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

      {showGenerate && <GenerateModal onClose={() => setShowGenerate(false)} />}
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

