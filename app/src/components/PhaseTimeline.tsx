import type { Phase, RiskLevel } from '@/types';
import { aggregateRisk, isPhaseComplete, RISK_META } from '@/lib/fr';
import { cn } from '@/lib/cn';

interface PhaseTimelineProps {
  phases: Phase[];
  activePhaseId: string | null;
  onSelect: (id: string) => void;
}

/** Status light: grey when incomplete, risk-colored (green/yellow/red) when the
 *  phase is complete. Complete + good shows a check for an at-a-glance scan. */
function StatusLight({
  complete,
  risk,
  active,
}: {
  complete: boolean;
  risk: RiskLevel | null;
  active: boolean;
}) {
  if (!complete) {
    return (
      <span
        className={cn(
          'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2',
          active ? 'border-white/40' : 'border-ink-300 bg-white',
        )}
      >
        <span className={cn('h-1.5 w-1.5 rounded-full', active ? 'bg-white/40' : 'bg-ink-300')} />
      </span>
    );
  }
  const level = risk ?? 'good';
  const meta = RISK_META[level];
  return (
    <span
      className={cn(
        'flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-white shadow-sm',
        meta.dot,
      )}
    >
      {level === 'good' ? (
        <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ) : level === 'fail' ? (
        <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      ) : (
        <span className="h-1.5 w-1.5 rounded-full bg-white" />
      )}
    </span>
  );
}

export function PhaseTimeline({
  phases,
  activePhaseId,
  onSelect,
}: PhaseTimelineProps) {
  return (
    <nav className="space-y-0.5">
      {phases.map((phase) => {
        const active = phase.id === activePhaseId;
        const complete = isPhaseComplete(phase);
        const risk = aggregateRisk(phase.observations);
        return (
          <button
            key={phase.id}
            type="button"
            onClick={() => onSelect(phase.id)}
            className={cn(
              'group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition',
              active ? 'bg-ink-900 text-white shadow-lift' : 'hover:bg-ink-100',
            )}
          >
            <StatusLight complete={complete} risk={risk} active={active} />
            <span className="flex-1 truncate text-sm font-medium">
              {phase.title}
            </span>
            <span
              className={cn(
                'rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums',
                active
                  ? 'bg-white/15 text-white'
                  : phase.photos.length > 0
                    ? 'bg-brand-100 text-brand-700'
                    : 'bg-ink-100 text-ink-400',
              )}
            >
              {phase.photos.length}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
