import { create } from 'zustand';
import { nanoid } from 'nanoid';
import type {
  InspectionMeta,
  Observation,
  Phase,
  PhotoRef,
  RiskSeverity,
} from '@/types';
import { PHASE_TEMPLATES } from '@/config/phases';
import { PHOTOS_PER_SLIDE, boxType } from '@/config/options';

type Stage = 'setup' | 'capture';

function newSlide() {
  return { id: nanoid(), photos: [] as PhotoRef[] };
}

function buildPhases(): Phase[] {
  return PHASE_TEMPLATES.map((t) => ({
    ...t,
    slides: [newSlide()],
    observations: [],
  }));
}

function makeEmptyMeta(): InspectionMeta {
  return {
    fgaJira: '',
    sku: '',
    productName: '',
    date: new Date().toISOString().slice(0, 10),
    dri: '',
    boxType: 'pk1',
    phaseGate: 'EVT',
    countryCode: '',
    unitsPerPack: boxType('pk1').unitsPerPack,
    sampleCount: 1,
  };
}

const IMAGE_TYPES = /^image\//;

interface InspectionState {
  stage: Stage;
  meta: InspectionMeta;
  phases: Phase[];
  activePhaseId: string | null;

  startInspection: (meta: InspectionMeta) => void;
  updateMeta: (patch: Partial<InspectionMeta>) => void;
  resetInspection: () => void;
  setActivePhase: (id: string) => void;

  // photo slides
  addSlide: (phaseId: string) => void;
  removeSlide: (phaseId: string, slideId: string) => void;
  addPhotos: (phaseId: string, slideId: string, files: File[]) => void;
  removePhoto: (phaseId: string, slideId: string, photoId: string) => void;
  reorderPhotos: (
    phaseId: string,
    slideId: string,
    fromIndex: number,
    toIndex: number,
  ) => void;

  // observations
  addObservation: (phaseId: string, risk?: RiskSeverity) => void;
  updateObservation: (
    phaseId: string,
    obsId: string,
    patch: Partial<Observation>,
  ) => void;
  removeObservation: (phaseId: string, obsId: string) => void;
}

export const useInspection = create<InspectionState>((set) => ({
  stage: 'setup',
  meta: makeEmptyMeta(),
  phases: buildPhases(),
  activePhaseId: null,

  startInspection: (meta) =>
    set(() => {
      const phases = buildPhases();
      return { stage: 'capture', meta, phases, activePhaseId: phases[0]?.id ?? null };
    }),

  updateMeta: (patch) => set((s) => ({ meta: { ...s.meta, ...patch } })),

  resetInspection: () =>
    set(() => {
      const phases = buildPhases();
      return {
        stage: 'setup',
        meta: makeEmptyMeta(),
        phases,
        activePhaseId: null,
      };
    }),

  setActivePhase: (id) => set(() => ({ activePhaseId: id })),

  addSlide: (phaseId) =>
    set((s) => ({
      phases: s.phases.map((p) =>
        p.id === phaseId ? { ...p, slides: [...p.slides, newSlide()] } : p,
      ),
    })),

  removeSlide: (phaseId, slideId) =>
    set((s) => ({
      phases: s.phases.map((p) => {
        if (p.id !== phaseId) return p;
        if (p.slides.length <= 1) {
          // keep at least one slide — just clear it
          const only = p.slides[0];
          only.photos.forEach((ph) => URL.revokeObjectURL(ph.url));
          return { ...p, slides: [newSlide()] };
        }
        const target = p.slides.find((sl) => sl.id === slideId);
        target?.photos.forEach((ph) => URL.revokeObjectURL(ph.url));
        return { ...p, slides: p.slides.filter((sl) => sl.id !== slideId) };
      }),
    })),

  addPhotos: (phaseId, slideId, files) =>
    set((s) => {
      const images = files.filter((f) => IMAGE_TYPES.test(f.type));
      if (images.length === 0) return s;
      return {
        phases: s.phases.map((p) => {
          if (p.id !== phaseId) return p;
          return {
            ...p,
            slides: p.slides.map((sl) => {
              if (sl.id !== slideId) return sl;
              const capacity = PHOTOS_PER_SLIDE - sl.photos.length;
              if (capacity <= 0) return sl;
              const toAdd: PhotoRef[] = images.slice(0, capacity).map((file) => ({
                id: nanoid(),
                name: file.name,
                url: URL.createObjectURL(file),
                type: file.type,
                size: file.size,
                file,
              }));
              return { ...sl, photos: [...sl.photos, ...toAdd] };
            }),
          };
        }),
      };
    }),

  removePhoto: (phaseId, slideId, photoId) =>
    set((s) => ({
      phases: s.phases.map((p) => {
        if (p.id !== phaseId) return p;
        return {
          ...p,
          slides: p.slides.map((sl) => {
            if (sl.id !== slideId) return sl;
            const target = sl.photos.find((ph) => ph.id === photoId);
            if (target) URL.revokeObjectURL(target.url);
            return { ...sl, photos: sl.photos.filter((ph) => ph.id !== photoId) };
          }),
        };
      }),
    })),

  reorderPhotos: (phaseId, slideId, fromIndex, toIndex) =>
    set((s) => ({
      phases: s.phases.map((p) => {
        if (p.id !== phaseId) return p;
        return {
          ...p,
          slides: p.slides.map((sl) => {
            if (sl.id !== slideId) return sl;
            const next = [...sl.photos];
            const [moved] = next.splice(fromIndex, 1);
            if (!moved) return sl;
            next.splice(toIndex, 0, moved);
            return { ...sl, photos: next };
          }),
        };
      }),
    })),

  addObservation: (phaseId, risk = 'good') =>
    set((s) => {
      const obs: Observation = {
        id: nanoid(),
        text: '',
        risk,
        status: 'normal',
        affectedSamples: risk === 'good' ? 0 : 1,
      };
      return {
        phases: s.phases.map((p) =>
          p.id === phaseId ? { ...p, observations: [...p.observations, obs] } : p,
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
          ? { ...p, observations: p.observations.filter((o) => o.id !== obsId) }
          : p,
      ),
    })),
}));
