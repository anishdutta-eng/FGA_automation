import type { Phase, ColorKey } from '@/types';
import { aggregateColor, isPhaseComplete, phasePhotoCount, RISK_META } from '@/lib/fr';
import { cn } from '@/lib/cn';

interface PhaseTimelineProps {
  phases: Phase[];
  activePhaseId: string | null;
  onSelect: (id: string) => void;
}

/** Status light: grey-hollow when incomplete, color-filled when complete. */
function StatusLight({
  complete,
  color,
  active,
}: {
  complete: boolean;
  color: ColorKey | null;
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
  const key = color ?? 'good';
  const meta = RISK_META[key];
  return (
    <span
      className={cn(
        'flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-white shadow-sm',
        meta.dot,
      )}
    >
      {key === 'good' ? (
        <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ) : key === 'high' ? (
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
        const color = aggregateColor(phase.observations);
        const count = phasePhotoCount(phase);
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
            <StatusLight complete={complete} color={color} active={active} />
            <span className="flex-1 truncate text-sm font-medium">{phase.title}</span>
            <span
              className={cn(
                'rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums',
                active
                  ? 'bg-white/15 text-white'
                  : count > 0
                    ? 'bg-brand-100 text-brand-700'
                    : 'bg-ink-100 text-ink-400',
              )}
            >
              {count}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
