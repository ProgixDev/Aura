'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { setAuthToken } from './api';

/**
 * Admin identity store — a separate token slot from `web/lib/auth-store.js`
 * (client login). Admin and client sessions must never share storage: this
 * store owns its own `localStorage` key (`aura.admin.session`). The one
 * exception to "never imported outside /admin" is the unified `/connexion`
 * page — a single login form checks credentials against both account types
 * server-side and populates whichever store actually matched.
 *
 * `skipHydration: true` + a manual `useAdminAuth.persist.rehydrate()` call
 * (done once, by `AdminAuthGate` — Task 14) avoids a server/client hydration
 * mismatch: the server has no `localStorage`, so auto-hydrating during store
 * creation would render one thing during SSR and flip to another on the
 * client on the very first paint.
 */
export const useAdminAuth = create(
  persist(
    (set) => ({
      token: null,
      admin: null,
      hasHydrated: false,
      setSession: (token, admin) => {
        setAuthToken(token);
        set({ token, admin });
      },
      signOut: () => {
        setAuthToken(null);
        set({ token: null, admin: null });
      },
      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
    }),
    {
      name: 'aura.admin.session',
      // `create(persist(...))` runs once, synchronously, at module import time —
      // before any consumer (e.g. a test's `beforeEach`) has a chance to install
      // `globalThis.localStorage`. Passing `() => localStorage` directly to
      // `createJSONStorage` would resolve that global immediately and freeze the
      // (possibly-still-missing) reference into a closure forever. Wrapping it in
      // an object whose methods each look up `localStorage` at call time keeps the
      // resolution lazy, so it still finds the real (or test-mocked) storage
      // whenever `getItem`/`setItem`/`removeItem` actually run.
      storage: createJSONStorage(() => ({
        getItem: (name) => localStorage.getItem(name),
        setItem: (name, value) => localStorage.setItem(name, value),
        removeItem: (name) => localStorage.removeItem(name),
      })),
      skipHydration: true,
      partialize: (state) => ({ token: state.token, admin: state.admin }),
      onRehydrateStorage: () => (state) => {
        if (state?.token) setAuthToken(state.token);
        state?.setHasHydrated(true);
      },
    },
  ),
);
