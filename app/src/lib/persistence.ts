import type { InspectionMeta, Phase, PhotoRef, PhotoSlide } from '@/types';
import { useInspection } from '@/store/useInspection';
import { usePersistence } from '@/store/usePersistence';
import { saveState, loadState, clearState } from './db';

/** Bump when the persisted shape changes; older snapshots are discarded. */
const SCHEMA_VERSION = 2;

type PersistedPhoto = Omit<PhotoRef, 'url'>;
type PersistedSlide = Omit<PhotoSlide, 'photos'> & { photos: PersistedPhoto[] };
type PersistedPhase = Omit<Phase, 'slides'> & { slides: PersistedSlide[] };

interface Snapshot {
  schema: number;
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
    slides: p.slides.map((s) => ({
      ...s,
      photos: s.photos.map(({ url: _url, ...rest }) => rest),
    })),
  }));
}

function restoreUrls(phases: PersistedPhase[]): Phase[] {
  return phases.map((p) => ({
    ...p,
    slides: p.slides.map((s) => ({
      ...s,
      photos: s.photos.map((ph) => ({ ...ph, url: URL.createObjectURL(ph.file) })),
    })),
  }));
}

export async function hydrate(): Promise<void> {
  try {
    const snap = await loadState<Snapshot>();
    if (snap && snap.schema === SCHEMA_VERSION && snap.stage === 'capture') {
      useInspection.setState({
        stage: snap.stage,
        meta: snap.meta,
        activePhaseId: snap.activePhaseId,
        phases: restoreUrls(snap.phases),
      });
    } else if (snap && snap.schema !== SCHEMA_VERSION) {
      // Old/incompatible snapshot — clear it.
      await clearState();
    }
  } catch (err) {
    console.warn('Failed to hydrate inspection from IndexedDB:', err);
  } finally {
    usePersistence.getState().setHydrated(true);
  }
}

let timer: ReturnType<typeof setTimeout> | undefined;
let flashTimer: ReturnType<typeof setTimeout> | undefined;

export function startPersistence(): () => void {
  return useInspection.subscribe((state) => {
    if (timer) clearTimeout(timer);

    if (state.stage === 'setup') {
      void clearState();
      usePersistence.getState().setStatus('idle');
      return;
    }

    usePersistence.getState().setStatus('saving');
    timer = setTimeout(async () => {
      const snapshot: Snapshot = {
        schema: SCHEMA_VERSION,
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
