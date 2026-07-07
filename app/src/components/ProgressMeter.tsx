import { cn } from '@/lib/cn';

interface ProgressMeterProps {
  completed: number;
  total: number;
}

export function ProgressMeter({ completed, total }: ProgressMeterProps) {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-xs font-semibold text-ink-500">
        <span>Documented</span>
        <span className="tabular-nums text-ink-700">
          {completed} of {total}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-ink-200">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500',
            pct === 100 ? 'bg-risk-good' : 'bg-brand-600',
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
