import { usePersistence } from '@/store/usePersistence';
import { cn } from '@/lib/cn';

export function SaveIndicator() {
  const status = usePersistence((s) => s.status);

  const label =
    status === 'saving'
      ? 'Saving…'
      : status === 'saved'
        ? 'Saved locally'
        : 'Saved offline';

  return (
    <span
      className={cn(
        'hidden items-center gap-1.5 text-xs font-medium transition sm:inline-flex',
        status === 'saving' ? 'text-ink-400' : 'text-risk-good',
      )}
      title="Your inspection is stored on this device and survives refresh and offline use."
    >
      {status === 'saving' ? (
        <span className="h-3 w-3 animate-spin rounded-full border-2 border-ink-200 border-t-ink-400" />
      ) : (
        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      )}
      {label}
    </span>
  );
}
