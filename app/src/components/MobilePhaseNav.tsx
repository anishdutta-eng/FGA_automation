import type { Phase, ColorKey } from '@/types';
import {
  aggregateColor,
  isPhaseComplete,
  phaseObservations,
  RISK_META,
} from '@/lib/fr';
import { cn } from '@/lib/cn';

interface MobilePhaseNavProps {
  phases: Phase[];
  activePhaseId: string | null;
  onSelect: (id: string) => void;
}

/** Small status dot mirroring the desktop timeline light. */
function Dot({ complete, color }: { complete: boolean; color: ColorKey | null }) {
  if (!complete) {
    return <span className="h-2 w-2 shrink-0 rounded-full border border-ink-300 bg-white" />;
  }
  const meta = RISK_META[color ?? 'good'];
  return <span className={cn('h-2 w-2 shrink-0 rounded-full', meta.dot)} />;
}

/**
 * Bottom navigation bar for phones / narrow screens, where the desktop sidebar
 * timeline is hidden. Provides Prev / Next buttons plus a dropdown to jump
 * directly to any phase.
 */
export function MobilePhaseNav({
  phases,
  activePhaseId,
  onSelect,
}: MobilePhaseNavProps) {
  if (phases.length === 0) return null;

  const index = Math.max(
    0,
    phases.findIndex((p) => p.id === activePhaseId),
  );
  const activePhase = phases[index];
  const isFirst = index <= 0;
  const isLast = index >= phases.length - 1;

  const goPrev = () => {
    if (!isFirst) onSelect(phases[index - 1].id);
  };
  const goNext = () => {
    if (!isLast) onSelect(phases[index + 1].id);
  };

  return (
    <nav
      className="sticky bottom-0 z-40 border-t border-ink-200 bg-white/95 backdrop-blur lg:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="mx-auto flex max-w-7xl items-center gap-2 px-3 py-2.5">
        <button
          type="button"
          onClick={goPrev}
          disabled={isFirst}
          aria-label="Previous phase"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-ink-200 text-ink-700 transition active:scale-95 disabled:opacity-30"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        {/* Phase selector — tappable dropdown to jump anywhere */}
        <label className="relative flex min-w-0 flex-1 items-center">
          <span className="pointer-events-none absolute left-3 flex items-center gap-2">
            <Dot
              complete={activePhase ? isPhaseComplete(activePhase) : false}
              color={activePhase ? aggregateColor(phaseObservations(activePhase)) : null}
            />
            <span className="text-[11px] font-bold tabular-nums text-ink-400">
              {index + 1}/{phases.length}
            </span>
          </span>
          <select
            value={activePhase?.id ?? ''}
            onChange={(e) => onSelect(e.target.value)}
            aria-label="Jump to phase"
            className="w-full truncate rounded-xl border border-ink-200 bg-ink-50 py-2.5 pl-[4.5rem] pr-8 text-sm font-semibold text-ink-800 focus:border-brand-400 focus:outline-none"
          >
            {phases.map((p, i) => (
              <option key={p.id} value={p.id}>
                {i + 1}. {p.title}
              </option>
            ))}
          </select>
          <svg className="pointer-events-none absolute right-3 h-4 w-4 text-ink-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </label>

        <button
          type="button"
          onClick={goNext}
          disabled={isLast}
          aria-label="Next phase"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-700 text-white transition active:scale-95 disabled:opacity-30"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>
    </nav>
  );
}
