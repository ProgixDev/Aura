# Aura — Web

The marketing **landing site** + full **admin back-office** for **Aura**, the French marketplace of verified energy-wellness practitioners (magnétisme, Reiki, hypnose, chamanisme…).

Built with **Next.js 15 (App Router)** and plain JSX. **No backend** — every screen is driven by mock data under `lib/data/`, so the whole product is browsable end-to-end (every list, modal and action works).

## Highlights

- **100+ pages** — 86 route templates (17 dynamic) → ~224 prerendered pages, plus ~35 reusable modals.
- **Public site**: home, practitioner directory + profiles, disciplines, events, cercles, journal, pricing, become-a-practitioner, trust & safety, help center, legal, auth, a 4-step booking flow, and a full client account area.
- **Admin**: dashboard & analytics, practitioners + verification, clients, bookings, payments/refunds/disputes, subscriptions, promos, moderation (reviews/reports/messages), content CMS, support, team & roles, audit log, and settings.
- **Design system** ported from the Aura mobile app: Cormorant Garamond + Outfit, aurora gradients, soft editorial palette.

## Run locally

```bash
npm install
npm run dev      # http://localhost:3000
```

Production build:

```bash
npm run build && npm run start
```

The admin area is open (no auth, by design) at `/admin`.

## Stack

Next.js 15 · React 19 · Zustand (modal/toast store) · CSS design system. No database, no API — mock data only.
