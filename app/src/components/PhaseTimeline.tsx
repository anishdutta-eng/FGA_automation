import type { Phase } from '@/types';
import { aggregateRisk } from '@/lib/fr';
import { RiskDot } from './RiskBadge';
import { cn } from '@/lib/cn';

interface PhaseTimelineProps {
  phases: Phase[];
  activePhaseId: string | null;
  onSelect: (id: string) => void;
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
        const risk = aggregateRisk(phase.observations);
        const hasPhotos = phase.photos.length > 0;
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
            <RiskDot risk={risk} className={cn(!risk && active && 'bg-ink-500')} />
            <span className="flex-1 truncate text-sm font-medium">
              {phase.title}
            </span>
            <span
              className={cn(
                'rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums',
                active
                  ? 'bg-white/15 text-white'
                  : hasPhotos
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
