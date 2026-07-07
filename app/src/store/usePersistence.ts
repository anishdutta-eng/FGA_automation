import { create } from 'zustand';

export type SaveStatus = 'idle' | 'saving' | 'saved';

interface PersistenceState {
  status: SaveStatus;
  hydrated: boolean;
  setStatus: (status: SaveStatus) => void;
  setHydrated: (hydrated: boolean) => void;
}

/** Lightweight store for persistence UI state, kept separate from inspection
 *  data so writing save-status never re-triggers the persistence subscription. */
export const usePersistence = create<PersistenceState>((set) => ({
  status: 'idle',
  hydrated: false,
  setStatus: (status) => set({ status }),
  setHydrated: (hydrated) => set({ hydrated }),
}));
