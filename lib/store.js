'use client';

import { create } from 'zustand';

/**
 * Global UI store — modals + toasts. No backend; everything is client state.
 *
 * Modals are opened by name with optional props:
 *   const open = useUI((s) => s.openModal);
 *   open('confirm', { title: 'Supprimer ?', onConfirm: () => ... });
 *
 * The set of available modal names is registered in
 * components/modals/registry.jsx.
 */
export const useUI = create((set, get) => ({
  // ---- Modals (stack so confirm-over-detail works) ----
  modals: [],
  openModal: (name, props = {}) =>
    set((s) => ({ modals: [...s.modals, { id: Math.random().toString(36).slice(2), name, props }] })),
  closeModal: (id) =>
    set((s) => ({
      modals: id ? s.modals.filter((m) => m.id !== id) : s.modals.slice(0, -1),
    })),
  closeAllModals: () => set({ modals: [] }),

  // ---- Toasts ----
  toasts: [],
  toast: (message, tone = 'default') => {
    const id = Math.random().toString(36).slice(2);
    set((s) => ({ toasts: [...s.toasts, { id, message, tone }] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, 3200);
    return id;
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

/** Convenience hook returning the modal opener. */
export const useModal = () => useUI((s) => s.openModal);
/** Convenience hook returning the toast trigger. */
export const useToast = () => useUI((s) => s.toast);
