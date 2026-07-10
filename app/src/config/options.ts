/**
 * Selectable inspection options: box types and phase gates.
 * Box types carry a display label, a filename label (used in the deck
 * nomenclature), and the default number of devices per pack.
 */

export type BoxTypeId = 'pk1' | 'pk2' | 'pk3' | 'basic' | 'bulk';

export interface BoxTypeOption {
  id: BoxTypeId;
  label: string;
  /** Label used in the exported deck name, per the agreed nomenclature. */
  fileLabel: string;
  /** Default devices per pack; editable for basic/bulk. */
  unitsPerPack: number;
}

export const BOX_TYPES: BoxTypeOption[] = [
  { id: 'pk1', label: '1 PK', fileLabel: '1 Case', unitsPerPack: 1 },
  { id: 'pk2', label: '2 PK', fileLabel: '2 Case', unitsPerPack: 2 },
  { id: 'pk3', label: '3 PK', fileLabel: '3 Case Pack', unitsPerPack: 3 },
  { id: 'basic', label: 'Basic Box', fileLabel: 'Basic Box', unitsPerPack: 1 },
  { id: 'bulk', label: 'Bulk Pack', fileLabel: 'Bulk Pack', unitsPerPack: 1 },
];

export function boxType(id: BoxTypeId): BoxTypeOption {
  return BOX_TYPES.find((b) => b.id === id) ?? BOX_TYPES[0];
}

export type PhaseGateId = 'EVT' | 'DVT' | 'PVT' | 'MP';

export interface PhaseGateOption {
  id: PhaseGateId;
  label: string;
}

export const PHASE_GATES: PhaseGateOption[] = [
  { id: 'EVT', label: 'EVT' },
  { id: 'DVT', label: 'DVT' },
  { id: 'PVT', label: 'PVT' },
  { id: 'MP', label: 'MP' },
];

/** Max photos allowed on a single deck slide. */
export const PHOTOS_PER_SLIDE = 4;
