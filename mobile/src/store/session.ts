import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setAuthToken } from '../data/api/client';

export type Role = 'seeker' | 'practitioner';

interface SessionState {
  hasSeenOnboarding: boolean;
  role: Role | null;
  firstName: string | null;
  practitionerActive: boolean;
  trialDaysLeft: number;
  token: string | null;
  setOnboardingSeen: () => void;
  setRole: (role: Role) => void;
  setFirstName: (name: string) => void;
  togglePractitionerActive: () => void;
  setToken: (token: string | null) => void;
  signOut: () => void;
}

export const useSession = create<SessionState>()(
  persist(
    (set) => ({
      hasSeenOnboarding: false,
      role: null,
      firstName: 'Sarah',
      practitionerActive: true,
      trialDaysLeft: 23,
      token: null,
      setOnboardingSeen: () => set({ hasSeenOnboarding: true }),
      setRole: (role) => set({ role }),
      setFirstName: (firstName) => set({ firstName }),
      togglePractitionerActive: () =>
        set((s) => ({ practitionerActive: !s.practitionerActive })),
      setToken: (token) => {
        setAuthToken(token);
        set({ token });
      },
      signOut: () => {
        setAuthToken(null);
        set({ role: null, firstName: null, hasSeenOnboarding: false, token: null });
      },
    }),
    {
      name: 'aura.session',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        if (state?.token) setAuthToken(state.token);
      },
    }
  )
);
