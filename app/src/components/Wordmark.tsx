import { cn } from '@/lib/cn';

interface WordmarkProps {
  /** Render on a dark background (light text). */
  onDark?: boolean;
  className?: string;
}

/**
 * FGA logo lockup: a purple "FGA" badge with a green accent dot, paired with
 * an "Inspection Studio" label.
 */
export function Wordmark({ onDark = false, className }: WordmarkProps) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <span className="inline-flex items-center gap-1 rounded-lg bg-gradient-to-br from-brand-600 to-brand-800 px-2 py-1 shadow-sm">
        <span className="text-sm font-extrabold tracking-tight text-white">FGA</span>
        <span className="h-1.5 w-1.5 rounded-full bg-accent-400" />
      </span>
      <span
        className={cn(
          'text-sm font-semibold tracking-tight',
          onDark ? 'text-white/80' : 'text-ink-700',
        )}
      >
        Inspection Studio
      </span>
    </div>
  );
}
