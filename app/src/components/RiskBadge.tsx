import type { RiskLevel } from '@/types';
import { RISK_META } from '@/lib/fr';
import { cn } from '@/lib/cn';

interface RiskDotProps {
  risk: RiskLevel | null;
  className?: string;
}

/** A small status dot; grey when risk is null (empty phase). */
export function RiskDot({ risk, className }: RiskDotProps) {
  return (
    <span
      className={cn(
        'inline-block h-2.5 w-2.5 rounded-full',
        risk ? RISK_META[risk].dot : 'bg-ink-300',
        className,
      )}
    />
  );
}

interface RiskBadgeProps {
  risk: RiskLevel;
  className?: string;
}

export function RiskBadge({ risk, className }: RiskBadgeProps) {
  const meta = RISK_META[risk];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold',
        meta.chip,
        className,
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', meta.dot)} />
      {meta.label}
    </span>
  );
}
