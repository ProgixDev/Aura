import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type Role = 'seeker' | 'practitioner';

interface SessionState {
  hasSeenOnboarding: boolean;
  role: Role | null;
  firstName: string | null;
  practitionerActive: boolean;
  trialDaysLeft: number;
  setOnboardingSeen: () => void;
  setRole: (role: Role) => void;
  setFirstName: (name: string) => void;
  togglePractitionerActive: () => void;
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
      setOnboardingSeen: () => set({ hasSeenOnboarding: true }),
      setRole: (role) => set({ role }),
      setFirstName: (firstName) => set({ firstName }),
      togglePractitionerActive: () =>
        set((s) => ({ practitionerActive: !s.practitionerActive })),
      signOut: () =>
        set({
          role: null,
          firstName: null,
          hasSeenOnboarding: false,
        }),
    }),
    {
      name: 'aura.session',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
