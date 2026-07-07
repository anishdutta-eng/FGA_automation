import { useState } from 'react';
import type { PhotoRef } from '@/types';
import { cn, formatBytes } from '@/lib/cn';

interface PhotoGridProps {
  photos: PhotoRef[];
  onRemove: (photoId: string) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
}

export function PhotoGrid({ photos, onRemove, onReorder }: PhotoGridProps) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const [lightbox, setLightbox] = useState<PhotoRef | null>(null);

  if (photos.length === 0) return null;

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {photos.map((photo, index) => (
          <figure
            key={photo.id}
            draggable
            onDragStart={() => setDragIndex(index)}
            onDragEnter={() => setOverIndex(index)}
            onDragEnd={() => {
              if (dragIndex !== null && overIndex !== null && dragIndex !== overIndex) {
                onReorder(dragIndex, overIndex);
              }
              setDragIndex(null);
              setOverIndex(null);
            }}
            onDragOver={(e) => e.preventDefault()}
            className={cn(
              'group relative aspect-square overflow-hidden rounded-xl border bg-ink-100 shadow-card transition',
              dragIndex === index && 'opacity-40',
              overIndex === index && dragIndex !== index
                ? 'border-brand-500 ring-2 ring-brand-500/30'
                : 'border-ink-200',
            )}
          >
            <img
              src={photo.url}
              alt={photo.name}
              className="h-full w-full cursor-zoom-in object-cover"
              onClick={() => setLightbox(photo)}
            />
            <figcaption className="pointer-events-none absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-ink-950/70 to-transparent px-2 py-1.5 text-[11px] font-medium text-white opacity-0 transition group-hover:opacity-100">
              {photo.name} · {formatBytes(photo.size)}
            </figcaption>
            <button
              type="button"
              aria-label={`Remove ${photo.name}`}
              onClick={(e) => {
                e.stopPropagation();
                onRemove(photo.id);
              }}
              className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-ink-950/60 text-white opacity-0 backdrop-blur transition hover:bg-risk-fail group-hover:opacity-100"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </figure>
        ))}
      </div>

      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/80 p-6 backdrop-blur-sm animate-fade-in"
          onClick={() => setLightbox(null)}
        >
          <img
            src={lightbox.url}
            alt={lightbox.name}
            className="max-h-full max-w-full rounded-xl shadow-lift"
          />
        </div>
      )}
    </>
  );
}
