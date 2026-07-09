import { create } from 'zustand';
import { nanoid } from 'nanoid';
import type {
  InspectionMeta,
  Observation,
  Phase,
  PhotoRef,
  PhotoSlide,
  RiskSeverity,
} from '@/types';
import { PHASE_TEMPLATES } from '@/config/phases';
import { PHOTOS_PER_SLIDE, boxType } from '@/config/options';

type Stage = 'setup' | 'capture';

function newSlide(): PhotoSlide {
  return { id: nanoid(), photos: [], observations: [] };
}

function buildPhases(): Phase[] {
  return PHASE_TEMPLATES.map((t) => ({
    ...t,
    unitBasis: t.unitBasis ?? 'unit',
    slides: [newSlide()],
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

  // per-phase trials override (null clears back to calculated max)
  setPhaseTrials: (phaseId: string, trials: number | null) => void;

  // slides
  addSlide: (phaseId: string) => void;
  removeSlide: (phaseId: string, slideId: string) => void;

  // photos (scoped to a slide)
  addPhotos: (phaseId: string, slideId: string, files: File[]) => Promise<void>;
  removePhoto: (phaseId: string, slideId: string, photoId: string) => void;
  reorderPhotos: (
    phaseId: string,
    slideId: string,
    fromIndex: number,
    toIndex: number,
  ) => void;

  // observations (scoped to a slide)
  addObservation: (phaseId: string, slideId: string, risk?: RiskSeverity) => void;
  updateObservation: (
    phaseId: string,
    slideId: string,
    obsId: string,
    patch: Partial<Observation>,
  ) => void;
  removeObservation: (phaseId: string, slideId: string, obsId: string) => void;
}

/** Helper: map over a specific phase's slides. */
function updateSlide(
  phases: Phase[],
  phaseId: string,
  slideId: string,
  fn: (slide: PhotoSlide) => PhotoSlide,
): Phase[] {
  return phases.map((p) =>
    p.id === phaseId
      ? { ...p, slides: p.slides.map((s) => (s.id === slideId ? fn(s) : s)) }
      : p,
  );
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
      return { stage: 'setup', meta: makeEmptyMeta(), phases, activePhaseId: null };
    }),

  setActivePhase: (id) => set(() => ({ activePhaseId: id })),

  setPhaseTrials: (phaseId, trials) =>
    set((s) => ({
      phases: s.phases.map((p) =>
        p.id === phaseId
          ? { ...p, trialsOverride: trials == null ? undefined : trials }
          : p,
      ),
    })),

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
        const target = p.slides.find((sl) => sl.id === slideId);
        target?.photos.forEach((ph) => URL.revokeObjectURL(ph.url));
        if (p.slides.length <= 1) {
          // keep at least one slide — replace with a fresh empty one
          return { ...p, slides: [newSlide()] };
        }
        return { ...p, slides: p.slides.filter((sl) => sl.id !== slideId) };
      }),
    })),

  addPhotos: async (phaseId, slideId, files) => {
    const images = files.filter((f) => IMAGE_TYPES.test(f.type));
    if (images.length === 0) return;

    // Determine remaining capacity for this slide right now.
    const state = useInspection.getState();
    const slide = state.phases
      .find((p) => p.id === phaseId)
      ?.slides.find((sl) => sl.id === slideId);
    if (!slide) return;
    const capacity = PHOTOS_PER_SLIDE - slide.photos.length;
    if (capacity <= 0) return;

    // Copy each file's bytes into an app-owned Blob so the data is self-
    // contained and survives reloads / stale OS file references.
    const toAdd: PhotoRef[] = [];
    for (const file of images.slice(0, capacity)) {
      try {
        const buf = await file.arrayBuffer();
        const blob = new Blob([buf], { type: file.type || 'image/jpeg' });
        toAdd.push({
          id: nanoid(),
          name: file.name,
          url: URL.createObjectURL(blob),
          type: blob.type,
          size: blob.size,
          blob,
        });
      } catch (err) {
        console.warn('Could not read dropped file:', file.name, err);
      }
    }
    if (toAdd.length === 0) return;

    set((s) => ({
      phases: updateSlide(s.phases, phaseId, slideId, (sl) => {
        // Re-check capacity in case state changed while reading.
        const room = PHOTOS_PER_SLIDE - sl.photos.length;
        return { ...sl, photos: [...sl.photos, ...toAdd.slice(0, room)] };
      }),
    }));
  },

  removePhoto: (phaseId, slideId, photoId) =>
    set((s) => ({
      phases: updateSlide(s.phases, phaseId, slideId, (sl) => {
        const target = sl.photos.find((ph) => ph.id === photoId);
        if (target) URL.revokeObjectURL(target.url);
        return { ...sl, photos: sl.photos.filter((ph) => ph.id !== photoId) };
      }),
    })),

  reorderPhotos: (phaseId, slideId, fromIndex, toIndex) =>
    set((s) => ({
      phases: updateSlide(s.phases, phaseId, slideId, (sl) => {
        const next = [...sl.photos];
        const [moved] = next.splice(fromIndex, 1);
        if (!moved) return sl;
        next.splice(toIndex, 0, moved);
        return { ...sl, photos: next };
      }),
    })),

  addObservation: (phaseId, slideId, risk = 'good') =>
    set((s) => ({
      phases: updateSlide(s.phases, phaseId, slideId, (sl) => ({
        ...sl,
        observations: [
          ...sl.observations,
          {
            id: nanoid(),
            text: '',
            risk,
            status: 'normal',
            affectedSamples: risk === 'good' ? 0 : 1,
          } satisfies Observation,
        ],
      })),
    })),

  updateObservation: (phaseId, slideId, obsId, patch) =>
    set((s) => ({
      phases: updateSlide(s.phases, phaseId, slideId, (sl) => ({
        ...sl,
        observations: sl.observations.map((o) =>
          o.id === obsId ? { ...o, ...patch } : o,
        ),
      })),
    })),

  removeObservation: (phaseId, slideId, obsId) =>
    set((s) => ({
      phases: updateSlide(s.phases, phaseId, slideId, (sl) => ({
        ...sl,
        observations: sl.observations.filter((o) => o.id !== obsId),
      })),
    })),
}));
