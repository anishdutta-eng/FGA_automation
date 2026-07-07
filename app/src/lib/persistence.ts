import type { InspectionMeta, Phase, PhotoRef } from '@/types';
import { useInspection } from '@/store/useInspection';
import { usePersistence } from '@/store/usePersistence';
import { saveState, loadState, clearState } from './db';

/** Photo as persisted: identical to PhotoRef but without the ephemeral url. */
type PersistedPhoto = Omit<PhotoRef, 'url'>;
type PersistedPhase = Omit<Phase, 'photos'> & { photos: PersistedPhoto[] };

interface Snapshot {
  stage: 'setup' | 'capture';
  meta: InspectionMeta;
  activePhaseId: string | null;
  phases: PersistedPhase[];
  savedAt: number;
}

const SAVE_DEBOUNCE_MS = 400;
const SAVED_FLASH_MS = 1200;

function stripUrls(phases: Phase[]): PersistedPhase[] {
  return phases.map((p) => ({
    ...p,
    photos: p.photos.map(({ url: _url, ...rest }) => rest),
  }));
}

function restoreUrls(phases: PersistedPhase[]): Phase[] {
  return phases.map((p) => ({
    ...p,
    photos: p.photos.map((ph) => ({
      ...ph,
      url: URL.createObjectURL(ph.file),
    })),
  }));
}

/** Load any saved inspection from IndexedDB into the store. Call once on boot. */
export async function hydrate(): Promise<void> {
  try {
    const snap = await loadState<Snapshot>();
    if (snap && snap.stage === 'capture') {
      useInspection.setState({
        stage: snap.stage,
        meta: snap.meta,
        activePhaseId: snap.activePhaseId,
        phases: restoreUrls(snap.phases),
      });
    }
  } catch (err) {
    console.warn('Failed to hydrate inspection from IndexedDB:', err);
  } finally {
    usePersistence.getState().setHydrated(true);
  }
}

let timer: ReturnType<typeof setTimeout> | undefined;
let flashTimer: ReturnType<typeof setTimeout> | undefined;

/** Subscribe the store to IndexedDB with debounced writes. Returns unsubscribe. */
export function startPersistence(): () => void {
  return useInspection.subscribe((state) => {
    if (timer) clearTimeout(timer);

    // Setup stage means no active inspection — clear any saved snapshot.
    if (state.stage === 'setup') {
      void clearState();
      usePersistence.getState().setStatus('idle');
      return;
    }

    usePersistence.getState().setStatus('saving');
    timer = setTimeout(async () => {
      const snapshot: Snapshot = {
        stage: state.stage,
        meta: state.meta,
        activePhaseId: state.activePhaseId,
        phases: stripUrls(state.phases),
        savedAt: Date.now(),
      };
      try {
        await saveState(snapshot);
        usePersistence.getState().setStatus('saved');
        if (flashTimer) clearTimeout(flashTimer);
        flashTimer = setTimeout(
          () => usePersistence.getState().setStatus('idle'),
          SAVED_FLASH_MS,
        );
      } catch (err) {
        console.warn('Failed to persist inspection:', err);
        usePersistence.getState().setStatus('idle');
      }
    }, SAVE_DEBOUNCE_MS);
  });
}
