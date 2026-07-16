import { create } from 'zustand';
import type { PraticienRegistrationDraft } from '@data/types';

interface State {
  draft: PraticienRegistrationDraft;
  patchDraft: (patch: Partial<PraticienRegistrationDraft>) => void;
  clearDraft: () => void;
}

export const usePraticienRegistration = create<State>((set) => ({
  draft: {},
  patchDraft: (patch) => set((s) => ({ draft: { ...s.draft, ...patch } })),
  clearDraft: () => set({ draft: {} }),
}));
