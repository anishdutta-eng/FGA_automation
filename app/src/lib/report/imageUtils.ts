import type { PhotoRef } from '@/types';

const MAX_EXPORT_EDGE_PX = 3200;
const JPEG_QUALITY = 0.92;

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
    reader.onerror = () => reject(reader.error ?? new Error('Could not read image'));
    reader.readAsDataURL(file);
  });
}

/** Measure a browser-decodable image and reject malformed/unsupported input. */
export function measureImage(
  dataUrl: string,
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error('Could not decode image'));
    img.src = dataUrl;
  });
}

interface LoadedImage {
  image: HTMLImageElement;
  width: number;
  height: number;
  release: () => void;
}

/**
 * Decode through the browser's normal image pipeline. This is deliberately the
 * same EXIF-aware path used by the in-app preview: iPhone Orientation metadata
 * is applied once before the pixels reach the canvas.
 */
function loadBrowserOrientedImage(blob: Blob): Promise<LoadedImage> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const image = new Image();
    let settled = false;

    const release = () => URL.revokeObjectURL(url);
    image.onload = () => {
      settled = true;
      const width = image.naturalWidth;
      const height = image.naturalHeight;
      if (width <= 0 || height <= 0) {
        release();
        reject(new Error('Decoded image has invalid dimensions'));
        return;
      }
      resolve({ image, width, height, release });
    };
    image.onerror = () => {
      if (!settled) release();
      reject(new Error('Could not decode image'));
    };
    image.decoding = 'async';
    image.src = url;
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: 'image/jpeg' | 'image/png',
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob
          ? resolve(blob)
          : reject(new Error(`Could not encode normalized ${type} image`)),
      type,
      type === 'image/jpeg' ? JPEG_QUALITY : undefined,
    );
  });
}

/**
 * Convert a browser-oriented image to metadata-free pixels for PowerPoint.
 *
 * Browser previews honor iPhone EXIF orientation, but Office versions differ.
 * Embedding the original JPEG therefore lets Office rotate it a second time or
 * ignore the rotation entirely. Drawing the browser-correct image to a canvas
 * applies orientation exactly once and strips EXIF before PptxGenJS embeds it.
 * Existing IndexedDB photos benefit automatically because normalization occurs
 * only at export time.
 */
export async function normalizePhotoForPptx(
  blob: Blob,
): Promise<{ dataUrl: string; width: number; height: number }> {
  const loaded = await loadBrowserOrientedImage(blob);
  const scale = Math.min(
    1,
    MAX_EXPORT_EDGE_PX / Math.max(loaded.width, loaded.height),
  );
  const width = Math.max(1, Math.round(loaded.width * scale));
  const height = Math.max(1, Math.round(loaded.height * scale));
  const outputType = blob.type.toLowerCase() === 'image/png' ? 'image/png' : 'image/jpeg';
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  try {
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas 2D context is unavailable');

    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    if (outputType === 'image/jpeg') {
      // JPEG has no alpha channel; use a predictable background for PNG/WebP/
      // HEIC inputs containing transparency instead of browser-dependent black.
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, width, height);
    }
    context.drawImage(loaded.image, 0, 0, width, height);

    const normalized = await canvasToBlob(canvas, outputType);
    return {
      dataUrl: await fileToDataUrl(normalized),
      width,
      height,
    };
  } finally {
    loaded.release();
    // Release the backing pixel buffer promptly; iPhone camera photos are large.
    canvas.width = 1;
    canvas.height = 1;
  }
}

/**
 * Encode a list of photos for embedding, preserving order. Resilient: if a
 * single photo can't be decoded, it is skipped rather than failing the deck.
 */
export async function encodePhotos(photos: PhotoRef[]): Promise<EncodedPhoto[]> {
  const out: EncodedPhoto[] = [];
  for (const photo of photos) {
    try {
      const normalized = await normalizePhotoForPptx(photo.blob);
      out.push({ id: photo.id, name: photo.name, ...normalized });
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
