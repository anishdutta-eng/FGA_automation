import type { ColorKey } from '@/types';
import { RISK_META } from '@/lib/fr';
import { cn } from '@/lib/cn';

interface RiskDotProps {
  color: ColorKey | null;
  className?: string;
}

/** A small status dot; grey-hollow when color is null (empty phase). */
export function RiskDot({ color, className }: RiskDotProps) {
  return (
    <span
      className={cn(
        'inline-block h-2.5 w-2.5 rounded-full',
        color ? RISK_META[color].dot : 'bg-ink-300',
        className,
      )}
    />
  );
}

interface RiskBadgeProps {
  color: ColorKey;
  className?: string;
}

export function RiskBadge({ color, className }: RiskBadgeProps) {
  const meta = RISK_META[color];
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
