import { useState } from 'react';
import { useInspection } from '@/store/useInspection';
import { aggregateRisk } from '@/lib/fr';
import type { ProgressInfo } from '@/lib/report/buildDeck';
import { downloadRecord } from '@/lib/report/buildRecord';
import type { Inspection } from '@/types';
import { cn } from '@/lib/cn';

interface GenerateModalProps {
  onClose: () => void;
}

type Status = 'idle' | 'building' | 'done' | 'error';

export function GenerateModal({ onClose }: GenerateModalProps) {
  const meta = useInspection((s) => s.meta);
  const phases = useInspection((s) => s.phases);
  const [status, setStatus] = useState<Status>('idle');
  const [progress, setProgress] = useState<ProgressInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  const inspection: Inspection = { ...meta, phases };
  const photoCount = phases.reduce((n, p) => n + p.photos.length, 0);
  const documentedPhases = phases.filter(
    (p) => p.photos.length > 0 || p.observations.length > 0,
  ).length;
  const anyFail = phases.some((p) => aggregateRisk(p.observations) === 'fail');

  const handleDeck = async () => {
    setStatus('building');
    setError(null);
    try {
      const { generateDeck } = await import('@/lib/report/buildDeck');
      await generateDeck(inspection, setProgress);
      setStatus('done');
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to generate the deck.');
      setStatus('error');
    }
  };

  const pct = progress
    ? Math.round((progress.phase / progress.totalPhases) * 100)
    : 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/60 p-6 backdrop-blur-sm animate-fade-in"
      onClick={status === 'building' ? undefined : onClose}
    >
      <div className="card w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h3 className="text-lg font-bold text-ink-900">Generate report</h3>
            <p className="mt-0.5 text-sm text-ink-500">
              {inspection.productName || 'Inspection'} · {inspection.sku || '—'}
            </p>
          </div>
          {status !== 'building' && (
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-400 hover:bg-ink-100"
              aria-label="Close"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>

        {/* Snapshot */}
        <div className="mb-5 grid grid-cols-3 gap-3">
          <Stat label="Phases" value={String(documentedPhases)} />
          <Stat label="Photos" value={String(photoCount)} />
          <Stat
            label="Samples (T)"
            value={String(inspection.sampleCount)}
          />
        </div>

        {anyFail && (
          <div className="mb-5 flex items-center gap-2 rounded-xl bg-risk-failSoft px-3.5 py-2.5 text-sm font-semibold text-risk-fail">
            <span className="h-2 w-2 rounded-full bg-risk-fail" />
            Failures recorded — flagged in the deck summary
          </div>
        )}

        {status === 'building' && (
          <div className="mb-5">
            <div className="mb-1.5 flex justify-between text-xs font-medium text-ink-500">
              <span>{progress?.label ?? 'Preparing…'}</span>
              <span className="tabular-nums">{pct}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-ink-200">
              <div
                className="h-full rounded-full bg-brand-600 transition-all duration-300"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )}

        {status === 'done' && (
          <div className="mb-5 flex items-center gap-2 rounded-xl bg-risk-goodSoft px-3.5 py-2.5 text-sm font-semibold text-risk-good">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Deck downloaded — import it into Google Slides
          </div>
        )}

        {status === 'error' && (
          <div className="mb-5 rounded-xl bg-risk-failSoft px-3.5 py-2.5 text-sm text-risk-fail">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            className="btn-primary w-full"
            disabled={status === 'building'}
            onClick={handleDeck}
          >
            {status === 'building' ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                Building deck…
              </>
            ) : status === 'done' ? (
              'Download deck again'
            ) : (
              'Download slide deck (.pptx)'
            )}
          </button>
          <button
            type="button"
            className="btn-ghost w-full"
            disabled={status === 'building'}
            onClick={() => downloadRecord(inspection)}
          >
            Download inspection record (.json)
          </button>
        </div>

        <p className="mt-4 text-center text-xs leading-relaxed text-ink-400">
          The deck opens in Google Slides (File → Import slides) and in
          PowerPoint / Keynote. Downloads land in your browser's Downloads
          folder.
        </p>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className={cn('rounded-xl bg-ink-50 px-3 py-2.5 text-center')}>
      <div className="text-xl font-bold tabular-nums text-ink-900">{value}</div>
      <div className="text-[11px] font-medium uppercase tracking-wide text-ink-400">
        {label}
      </div>
    </div>
  );
}
