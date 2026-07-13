import { create } from 'zustand';
import type { BookingDraft } from '@data/types';

interface State {
  draft: BookingDraft | null;
  setDraft: (draft: BookingDraft) => void;
  patchDraft: (patch: Partial<BookingDraft>) => void;
  clearDraft: () => void;
}

export const useBooking = create<State>((set) => ({
  draft: null,
  setDraft: (draft) => set({ draft }),
  patchDraft: (patch) =>
    set((s) => ({ draft: s.draft ? { ...s.draft, ...patch } : null })),
  clearDraft: () => set({ draft: null }),
}));
