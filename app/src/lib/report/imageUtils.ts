import type { PhotoRef } from '@/types';

export interface EncodedPhoto {
  id: string;
  name: string;
  dataUrl: string;
  width: number;
  height: number;
}

/** Read a File/Blob into a base64 data URL. */
export function fileToDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/** Measure an image's natural dimensions from a data URL. */
export function measureImage(
  dataUrl: string,
): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => resolve({ width: 1, height: 1 });
    img.src = dataUrl;
  });
}

/**
 * Encode a list of photos for embedding, preserving order. Resilient: if a
 * single photo can't be read, it is skipped rather than failing the whole deck.
 */
export async function encodePhotos(photos: PhotoRef[]): Promise<EncodedPhoto[]> {
  const out: EncodedPhoto[] = [];
  for (const photo of photos) {
    try {
      const dataUrl = await fileToDataUrl(photo.blob);
      const { width, height } = await measureImage(dataUrl);
      out.push({ id: photo.id, name: photo.name, dataUrl, width, height });
    } catch (err) {
      console.warn('Skipping unreadable photo in export:', photo.name, err);
    }
  }
  return out;
}

/**
 * Fit a source image (w x h) into a box, centered, preserving aspect ratio.
 * Returns the placement rectangle in the same units as the box.
 */
export function fitContain(
  srcW: number,
  srcH: number,
  boxX: number,
  boxY: number,
  boxW: number,
  boxH: number,
): { x: number; y: number; w: number; h: number } {
  if (srcW <= 0 || srcH <= 0) return { x: boxX, y: boxY, w: boxW, h: boxH };
  const scale = Math.min(boxW / srcW, boxH / srcH);
  const w = srcW * scale;
  const h = srcH * scale;
  return {
    x: boxX + (boxW - w) / 2,
    y: boxY + (boxH - h) / 2,
    w,
    h,
  };
}
