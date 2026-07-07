import { useCallback, useRef, useState } from 'react';
import { cn } from '@/lib/cn';

interface PhotoDropzoneProps {
  onFiles: (files: File[]) => void;
  compact?: boolean;
}

/**
 * Drag-and-drop target for photos. Accepts multi-file drops (and folder drops
 * where the browser expands them into files), plus a click-to-browse fallback.
 * Files are handed up as-is; the store creates object URLs.
 */
export function PhotoDropzone({ onFiles, compact = false }: PhotoDropzoneProps) {
  const [isOver, setIsOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsOver(false);
      const files = Array.from(e.dataTransfer.files);
      if (files.length) onFiles(files);
    },
    [onFiles],
  );

  const handleSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      if (files.length) onFiles(files);
      e.target.value = '';
    },
    [onFiles],
  );

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click();
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setIsOver(true);
      }}
      onDragLeave={() => setIsOver(false)}
      onDrop={handleDrop}
      className={cn(
        'group flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed text-center transition',
        compact ? 'gap-1 p-4' : 'gap-2 p-8',
        isOver
          ? 'border-brand-500 bg-brand-50'
          : 'border-ink-200 bg-ink-50/50 hover:border-brand-300 hover:bg-brand-50/40',
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleSelect}
      />
      <div
        className={cn(
          'flex items-center justify-center rounded-full bg-white shadow-card transition group-hover:scale-105',
          compact ? 'h-9 w-9' : 'h-12 w-12',
        )}
      >
        <svg
          className={cn('text-brand-600', compact ? 'h-4 w-4' : 'h-6 w-6')}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
      </div>
      <div>
        <p
          className={cn(
            'font-semibold text-ink-800',
            compact ? 'text-sm' : 'text-base',
          )}
        >
          {isOver ? 'Drop to add photos' : 'Drag photos here'}
        </p>
        {!compact && (
          <p className="mt-0.5 text-sm text-ink-500">
            or click to browse — drop multiple files or a whole folder
          </p>
        )}
      </div>
    </div>
  );
}
