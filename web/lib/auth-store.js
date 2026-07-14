'use client';

// Web auth store. Mirrors mobile/src/store/session.ts's token/setToken/signOut
// shape: persists { token, client } to localStorage and keeps web/lib/api.js's
// in-memory bearer token in sync.
//
// skipHydration + a manual rehydrate() call (see compte/layout.jsx) is used
// instead of the default auto-hydration, for two reasons:
//   1. Next.js renders this 'use client' module's first pass on the server,
//      where `localStorage` does not exist — auto-hydration would read
//      storage synchronously at store-creation time and crash SSR.
//   2. Even client-side, hydrating synchronously at import time would make
//      the very first client render differ from the server-rendered HTML
//      (a hydration mismatch) on any component that reads `token` on mount —
//      exactly what the /compte guard does.
// Deferring hydration to an effect (after the first render matches SSR)
// avoids both problems. This also means importing this module never touches
// `localStorage`, so it loads cleanly under Vitest's plain `node` environment.
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { setAuthToken } from './api';

export const useAuthStore = create(
  persist(
    (set) => ({
      token: null,
      client: null,
      hasHydrated: false,
      // setSession/signOut also force hasHydrated: true. Both are the result
      // of an explicit, authoritative action (a successful login/register
      // call, or a deliberate sign-out) — there is no need to wait for a
      // storage read to "confirm" state we just set ourselves. Without this,
      // a fresh login immediately followed by navigating to /compte would
      // show a needless "Chargement…" flash until rehydrate() caught up.
      setSession: (token, client) => {
        setAuthToken(token);
        set({ token, client, hasHydrated: true });
      },
      signOut: () => {
        setAuthToken(null);
        set({ token: null, client: null, hasHydrated: true });
      },
      setHasHydrated: (value) => set({ hasHydrated: value }),
    }),
    {
      name: 'aura.auth',
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      onRehydrateStorage: () => (state) => {
        if (state?.token) setAuthToken(state.token);
        state?.setHasHydrated(true);
      },
    },
  ),
);
