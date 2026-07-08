import { cn } from '@/lib/cn';

interface WordmarkProps {
  /** Render on a dark background (light text). */
  onDark?: boolean;
  className?: string;
}

/**
 * eero-style wordmark: the brand is always lowercase. Paired with a subtle
 * "Inspection Studio" label so the tool reads as an eero property.
 */
export function Wordmark({ onDark = false, className }: WordmarkProps) {
  return (
    <div className={cn('flex items-baseline gap-2.5', className)}>
      <span
        className={cn(
          'text-lg font-bold lowercase tracking-tight',
          onDark ? 'text-white' : 'text-ink-900',
        )}
      >
        eero
      </span>
      <span
        className={cn('h-3 w-px', onDark ? 'bg-white/25' : 'bg-ink-200')}
        aria-hidden
      />
      <span
        className={cn(
          'text-sm font-medium tracking-tight',
          onDark ? 'text-white/70' : 'text-ink-500',
        )}
      >
        Inspection Studio
      </span>
    </div>
  );
}
