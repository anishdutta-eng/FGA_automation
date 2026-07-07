import { create } from 'zustand';
import { nanoid } from 'nanoid';
import type {
  InspectionMeta,
  Observation,
  Phase,
  PhotoRef,
  RiskLevel,
} from '@/types';
import { PHASE_TEMPLATES } from '@/config/phases';

type Stage = 'setup' | 'capture';

function buildPhases(): Phase[] {
  return PHASE_TEMPLATES.map((t) => ({
    ...t,
    photos: [],
    observations: [],
  }));
}

const emptyMeta: InspectionMeta = {
  fgaJira: '',
  sku: '',
  productName: '',
  date: new Date().toISOString().slice(0, 10),
  dri: '',
  sampleCount: 1,
  region: '',
};

interface InspectionState {
  stage: Stage;
  meta: InspectionMeta;
  phases: Phase[];
  activePhaseId: string | null;

  // lifecycle
  startInspection: (meta: InspectionMeta) => void;
  updateMeta: (patch: Partial<InspectionMeta>) => void;
  resetInspection: () => void;
  setActivePhase: (id: string) => void;

  // photos
  addPhotos: (phaseId: string, files: File[]) => void;
  removePhoto: (phaseId: string, photoId: string) => void;
  reorderPhotos: (phaseId: string, fromIndex: number, toIndex: number) => void;

  // observations
  addObservation: (phaseId: string, risk?: RiskLevel) => void;
  updateObservation: (
    phaseId: string,
    obsId: string,
    patch: Partial<Observation>,
  ) => void;
  removeObservation: (phaseId: string, obsId: string) => void;
}

const IMAGE_TYPES = /^image\//;

export const useInspection = create<InspectionState>((set) => ({
  stage: 'setup',
  meta: emptyMeta,
  phases: buildPhases(),
  activePhaseId: null,

  startInspection: (meta) =>
    set(() => {
      const phases = buildPhases();
      return {
        stage: 'capture',
        meta,
        phases,
        activePhaseId: phases[0]?.id ?? null,
      };
    }),

  updateMeta: (patch) =>
    set((s) => ({ meta: { ...s.meta, ...patch } })),

  resetInspection: () =>
    set(() => {
      const phases = buildPhases();
      return {
        stage: 'setup',
        meta: { ...emptyMeta, date: new Date().toISOString().slice(0, 10) },
        phases,
        activePhaseId: null,
      };
    }),

  setActivePhase: (id) => set(() => ({ activePhaseId: id })),

  addPhotos: (phaseId, files) =>
    set((s) => {
      const images = files.filter((f) => IMAGE_TYPES.test(f.type));
      if (images.length === 0) return s;
      const newPhotos: PhotoRef[] = images.map((file) => ({
        id: nanoid(),
        name: file.name,
        url: URL.createObjectURL(file),
        type: file.type,
        size: file.size,
        file,
      }));
      return {
        phases: s.phases.map((p) =>
          p.id === phaseId ? { ...p, photos: [...p.photos, ...newPhotos] } : p,
        ),
      };
    }),

  removePhoto: (phaseId, photoId) =>
    set((s) => ({
      phases: s.phases.map((p) => {
        if (p.id !== phaseId) return p;
        const target = p.photos.find((ph) => ph.id === photoId);
        if (target) URL.revokeObjectURL(target.url);
        return { ...p, photos: p.photos.filter((ph) => ph.id !== photoId) };
      }),
    })),

  reorderPhotos: (phaseId, fromIndex, toIndex) =>
    set((s) => ({
      phases: s.phases.map((p) => {
        if (p.id !== phaseId) return p;
        const next = [...p.photos];
        const [moved] = next.splice(fromIndex, 1);
        if (!moved) return p;
        next.splice(toIndex, 0, moved);
        return { ...p, photos: next };
      }),
    })),

  addObservation: (phaseId, risk = 'good') =>
    set((s) => {
      const obs: Observation = {
        id: nanoid(),
        text: '',
        risk,
        status: 'normal',
        failedSamples: risk === 'fail' ? 1 : 0,
      };
      return {
        phases: s.phases.map((p) =>
          p.id === phaseId
            ? { ...p, observations: [...p.observations, obs] }
            : p,
        ),
      };
    }),

  updateObservation: (phaseId, obsId, patch) =>
    set((s) => ({
      phases: s.phases.map((p) =>
        p.id === phaseId
          ? {
              ...p,
              observations: p.observations.map((o) =>
                o.id === obsId ? { ...o, ...patch } : o,
              ),
            }
          : p,
      ),
    })),

  removeObservation: (phaseId, obsId) =>
    set((s) => ({
      phases: s.phases.map((p) =>
        p.id === phaseId
          ? {
              ...p,
              observations: p.observations.filter((o) => o.id !== obsId),
            }
          : p,
      ),
    })),
}));
