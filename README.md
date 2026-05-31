# Aura — Marketplace énergétique & bien-être

Expo SDK 54 React Native app for the Aura two-sided wellbeing marketplace
(seekers ↔ practitioners). **Frontend-only** — all data is served from
in-memory mocks. All UI is in French.

The design system, screens, copy and palette are reproduced from the approved
HTML prototype (`Aura.html` / `Aura v1 (clear).html`).

## Stack

- **Expo SDK 54** (Expo-Go-compatible — no custom native modules)
- **Expo Router** (file-based, typed routes)
- **TypeScript** strict mode
- **TanStack Query** for the data fetching shell, **Zustand + AsyncStorage** for
  session / booking-draft state
- **react-hook-form + zod** for forms
- **expo-google-fonts** — Cormorant Garamond (display) + Outfit (body)
- **expo-linear-gradient + react-native-svg** — aurora gradients & lotus rating
- **expo-blur** — tab-bar glassmorphism
- **react-native-safe-area-context** — notch / home-indicator awareness

No Supabase, no Stripe, no backend SDK — everything is local.

## Folder structure

```
aura/
├── app/                            # expo-router screens
│   ├── _layout.tsx                 # providers, fonts, root Stack
│   ├── index.tsx                   # Splash
│   ├── onboarding/                 # carousel · role · auth · 4-step quiz
│   ├── (tabs)/                     # Accueil · Recherche · Messages · Événements · Profil
│   ├── praticien/[id].tsx          # Fiche praticien
│   ├── domain/[slug].tsx           # "Qu'est-ce que le Reiki ?" pages
│   ├── booking/{slot,payment,confirmation}.tsx
│   ├── chat/[id].tsx               # 1:1 chat
│   ├── event/[id].tsx              # Event / retreat detail
│   ├── exchange/{index,[id],create}.tsx
│   ├── review.tsx                  # Lotus-petal rating
│   ├── report.tsx                  # Moderation flow
│   ├── dashboard.tsx               # Practitioner space
│   ├── subscription.tsx            # 1 mois offert puis 9,90€/mois (UI only)
│   └── founder.tsx                 # "L'âme du projet"
├── src/
│   ├── theme/                      # colors · typography · spacing · shadows
│   ├── components/                 # Button, Card, Chip, Input, Rating (lotus),
│   │                               # Avatar, ScreenHeader, AuroraBackground,
│   │                               # EscrowNotice, PractitionerCard, EventCard,
│   │                               # ExchangeCard, MenuRow, Toggle, Icon, Lotus
│   ├── data/
│   │   ├── types.ts
│   │   ├── mock/                   # French seed data
│   │   └── repos/                  # Single swap-point per resource (mock-backed)
│   └── store/                      # session · booking
└── assets/images/
```

## Running locally (Expo Go)

Requires Node ≥ 20.

```bash
cd aura
npm install
npm run start              # opens Metro + Expo Go QR code
```

Scan the QR with the Expo Go iOS / Android app — the entire app is clickable
end-to-end on mock data.

## Building for TestFlight (EAS)

```bash
npm install -g eas-cli
eas login
eas init --id <your-eas-project-id>   # then put it in app.json -> extra.eas.projectId

# Internal preview (ad-hoc install)
eas build --profile preview --platform ios

# TestFlight build
eas build --profile production --platform ios
eas submit --platform ios --latest
```

## Design decisions

- **One theme file in plain StyleSheet** — keeps the prototype's CSS variables
  1:1, helps proof the build against the HTML.
- **Aurora gradient as a component** (`AuroraBackground`) — used in hero,
  avatars, confirm orb, founder hero. Single source of truth for the brand mood.
- **Lotus rating, not stars** — matches the prototype's "soft rating symbol".
- **Repository layer** — every read goes through `src/data/repos`. If a backend
  is ever added, replace function bodies in that one folder. Screens never call
  network code directly.
- **All copy in French**, lifted verbatim from the prototype.

## Screens implemented (18+)

Splash · 3-slide onboarding · Role choice · Auth · 4-step quiz · Accueil ·
Recherche + filters · Domain detail · Fiche praticien · Booking slot ·
Booking mode + paiement · Confirmation · Messages list · Chat ·
Événements list · Event detail · Exchange list · Exchange detail ·
Exchange create · Review (lotus) · Report · Tableau de bord praticien ·
Abonnement · Profil · L'âme du projet.

All navigable from the seed data — no dead links.
