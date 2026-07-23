import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setAuthToken } from '../data/api/client';
import { withQuizAnswer } from '../utils/quizAnswers';

export type Role = 'seeker' | 'practitioner';
// The account type an active token actually belongs to, confirmed by a real auth response —
// distinct from `role`, which is just the onboarding choice made before any account exists.
export type UserType = 'client' | 'praticien';

interface AuthenticatedPayload {
  token: string;
  userType: UserType;
  firstName: string;
  lastName?: string | null;
  verificationStatus?: string | null;
}

interface SessionState {
  hasSeenOnboarding: boolean;
  role: Role | null;
  userType: UserType | null;
  firstName: string | null;
  lastName: string | null;
  // Praticien only: 'en_attente' | 'en_cours' | 'valide' | 'rejete'. Null for clients or
  // before any praticien auth response has set it.
  verificationStatus: string | null;
  token: string | null;
  quizAnswers: number[];
  setOnboardingSeen: () => void;
  setRole: (role: Role) => void;
  setAuthenticated: (payload: AuthenticatedPayload) => void;
  setQuizAnswer: (step: number, optionIndex: number) => void;
  // Keeps the header/menu display in sync after a profile edit — without this,
  // (tabs)/profil.tsx and dashboard.tsx would keep showing the pre-edit name until
  // the next full login, since they read firstName/lastName from this store, not
  // from a live profile fetch.
  setName: (firstName: string, lastName: string | null) => void;
  signOut: () => void;
}

export const useSession = create<SessionState>()(
  persist(
    (set) => ({
      hasSeenOnboarding: false,
      role: null,
      userType: null,
      firstName: null,
      lastName: null,
      verificationStatus: null,
      token: null,
      quizAnswers: [],
      setOnboardingSeen: () => set({ hasSeenOnboarding: true }),
      setRole: (role) => set({ role }),
      setAuthenticated: ({ token, userType, firstName, lastName, verificationStatus }) => {
        setAuthToken(token);
        set({
          token,
          userType,
          firstName,
          lastName: lastName ?? null,
          verificationStatus: verificationStatus ?? null,
        });
      },
      setQuizAnswer: (step, optionIndex) =>
        set((s) => ({ quizAnswers: withQuizAnswer(s.quizAnswers, step, optionIndex) })),
      setName: (firstName, lastName) => set({ firstName, lastName }),
      signOut: () => {
        setAuthToken(null);
        set({
          role: null, userType: null, firstName: null, lastName: null, verificationStatus: null,
          hasSeenOnboarding: false, token: null, quizAnswers: [],
        });
      },
    }),
    {
      name: 'guerienergies.session',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        if (state?.token) setAuthToken(state.token);
      },
    }
  )
);
