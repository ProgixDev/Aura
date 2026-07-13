# Aura — Full Implementation Roadmap

> **This is a program roadmap, not a single executable plan.** "Implement everything the frontend implies" spans ~25 subsystems across 3 codebases (`server/` NestJS, `web/` Next.js, `mobile/` Expo). Per the writing-plans skill's Scope Check, it is decomposed into one master roadmap (this file) + a numbered series of per-phase implementation plans. Each numbered plan produces working, testable software on its own and is executed via `superpowers:subagent-driven-development`.

**Goal:** Turn two fully-static frontend prototypes into a working product backed by the real NestJS API, filling backend gaps as needed.

**Source of truth for scope:** [frontend-functionality-checklist.md](../../frontend-functionality-checklist.md) (inventory) — this roadmap sequences it.

**Verified 2026-07-13** by three parallel exploration passes (web wiring, mobile wiring, backend module inventory). The checklist is accurate; corrections captured below.

---

## Locked decisions (D-table)

| # | Decision | Choice | Consequence |
|---|---|---|---|
| R1 | Client (end-customer) auth model | **Clients are `users` rows** — signup creates a `users` record (`is_admin=false`) + a linked `clients` profile keyed by email | Reuses existing JWT strategy + `ClientGuard` (which already maps `req.user.email` → `clients` row). No new auth infra. No password column added to `clients`. |
| R2 | Real payment processing | **Stripe now** (PaymentIntents) | Booking + event registration + promo redemption wire to Stripe. Backend gains a Stripe service + webhook. |
| R3 | Bookings/reservations subsystem | **Lightweight rendez-vous** | New `rendez_vous` table/module: a booking request (praticien + datetime + mode + tarif) → creates a rendez_vous + a `paiement` record. No calendar/availability engine yet. Populates the dangling `paiement.rendez_vous_id`. |
| R4 | Web vs mobile sequencing | **Parallel per-domain** | Each domain plan wires web AND mobile together, on a shared api-client approach proven in Plan 01. |
| R5 | Frontend data layer | Web adopts `@tanstack/react-query` (mirrors mobile, already present there) | Consistent fetch/caching model on both platforms. Web gains a `<Providers>` wrapper. |

---

## Verification corrections to the checklist (2026-07-13)

These change the plans; the checklist has been annotated accordingly.

1. **`GET /api/praticiens/:id` does NOT exist** — the praticiens controller only has `index()`. Both frontends' practitioner-detail screens have nothing to call. → **Plan 01** adds the endpoint.
2. **Many admin CRUD controllers have NO guard** — articles, cercles, disciplines, events, notifications, emails, promotions, and the admin halves of echanges/paiements/remboursements are effectively public. → **Plan 06** applies `AdminGuard` alongside admin-auth wiring.
3. **`avis` (reviews), `signalements` (reports), `programmes` DB tables already exist** with no entity/module/controller. Reviews & Reports are *not* greenfield — cheap to build on existing schema. → **Plan 07**.
4. **`clients` table has no password column**; `ClientGuard` maps a JWT `users` identity → `clients` row by email. Confirms R1.
5. **`paiement.entity` has a dangling `rendez_vous_id`** → confirms bookings were intended; R3 populates it.
6. **No global API versioning** — only `praticien-auth` and `praticien-verification` hard-code `v1/`; everything else is `/api/*`. Api-client paths must be per-endpoint, not a single version prefix.
7. **Backend runs on `PORT ?? 8000`** → api base URL is `http://localhost:8000/api`. (Web dev = 3000, no conflict.)
8. Mobile nuances: Messages search + "Non lus" filter already work; home "Lire l'article" reuses `/domain/[slug]`. Web: extra `/recherche` dead links in `ReservationsBody.jsx:58` + `compte/reservation/[id]:114`; extra plural `/praticiens/${id}` in `admin/praticien/[id]:41`. All folded into the Plan 01 bug batch.

---

## Architecture / foundations (established in Plan 01)

- **Response envelope:** backend returns `{ status, data, pagination?, message? }`. The api client returns the full payload; callers read `.data` / `.pagination`.
- **Auth:** single JWT (`Authorization: Bearer <token>`). Guards: `JwtAuthGuard`, `AdminGuard` (`is_admin`), `ClientGuard` (email→clients row), `OptionalJwtGuard`.
- **Web api client:** `web/lib/api.js` (fetch wrapper + `ApiError` + `setAuthToken`) + react-query provider. Test harness: **Vitest** + testing-library (web currently has none).
- **Mobile api client:** `mobile/src/data/api/client.ts` (same shape, TS) consumed by swapping the bodies of `src/data/repos/*` — screens never change. Test harness: **jest-expo** (mobile currently has none). react-query provider already exists in `app/_layout.tsx`.
- **Slug↔id:** web routes use slugs (`/discipline/[slug]`), backend uses numeric `:id`. Resolution strategy decided per-domain in Plan 02 (add `slug` to responses, or resolve slug→id client-side from the list).

---

## Phase / plan sequence

Status legend: **READY** = can be written & executed now (no open design questions) · **NEEDS BRAINSTORM** = run `superpowers:brainstorming` to settle schema/flow before the concrete plan is written.

### Plan 01 — Foundation `READY` ✅ written: `2026-07-13-aura-01-foundation.md`
Backend `GET /api/praticiens/:id`; web api client + react-query + Vitest; mobile api client + jest-expo; env config both platforms; auth-token plumbing; web route-link bug batch (7 fixes).
**Exit:** both frontends can reach the backend; one real endpoint proven end-to-end (praticien detail); test harnesses green on all three codebases.

### Plan 02 — Read-only public domains (web + mobile) `READY`
Wire list + detail for the 5 already-supported read domains: **disciplines, praticiens, events, articles, cercles**. Resolve slug↔id. Mobile parity: **build the missing mobile articles/blog screens and cercle screens** (neither exists today).
**Depends on:** Plan 01. **Exit:** every public browse/detail screen shows live backend data on both platforms.

### Plan 03 — Client auth `READY` (design settled by R1)
Backend: client signup/login endpoints creating `users`(+`clients`) and issuing JWT; forgot-password stub or real reset. Web: wire `/connexion`, `/inscription`, `/mot-de-passe-oublie`, token persistence, replace `AuthModal` fake submit. Mobile: wire `/onboarding/auth`, persist token in `session` store, implement or remove Apple/Google buttons. Guard the `/compte/*` and mobile authed screens.
**Depends on:** Plan 01. **Exit:** a real client can register, log in, and stay logged in on both platforms.

### Plan 04 — Client-authenticated read/write domains `READY`
Wire client-scoped features (require Plan 03 token): **paiements history**, **échanges CRUD**, **remboursements (client request/cancel)**. Mobile parity: build **payment-history** screen and **refund-request** flow (both absent).
**Depends on:** Plan 03. **Exit:** logged-in clients see their payments, manage échanges, request refunds — live — on both platforms.

### Plan 05 — Bookings + Payments (Stripe) `NEEDS BRAINSTORM`
Backend: `rendez_vous` module (R3) + Stripe PaymentIntents service + webhook + promo-code redemption/validate endpoint. Web: wire `/reserver/[id]` 4-step flow + payment step. Mobile: wire `/booking/slot|payment|confirmation` + event registration.
**Brainstorm before writing:** rendez_vous schema (fields, statuses, relation to paiement), Stripe flow (intent creation point, confirmation, webhook idempotency), promo validation contract.
**Depends on:** Plan 03. **Exit:** a client can book+pay a session and register+pay for an event for real.

### Plan 06 — Admin auth + guard hardening + admin wiring `READY` (some sub-items need backend design)
Web admin login gate for `/admin/*` (currently zero auth); apply `AdminGuard` to all unguarded admin controllers (correction #2); wire every admin CRUD screen (disciplines, events, articles, cercles, praticiens, verification, paiements, remboursements, échanges, notifications, emails, promotions, clients-list); praticien verification review + **document-upload UI** (5 docs); build the missing web `/admin/echange/[id]` detail page.
**Needs backend design (sub-plan):** client-detail endpoints — notes/ban/reset-password/export (`/admin/clients` today is list-only).
**Depends on:** Plans 01–02. **Exit:** admins log in, and every admin screen backed by an existing endpoint is live + protected.

### Plan 07 — Greenfield backend modules, cheap first `NEEDS BRAINSTORM (light)`
Build code on existing/new schema: **reviews/avis** (table exists), **reports/signalements** (table exists), **favorites** (new table), **notification preferences** (new table). Wire the matching web + mobile surfaces (`/compte/avis`, `/admin/avis`, mobile `review.tsx`; `/admin/signalements`, mobile `report.tsx`; `/compte/favoris`, mobile hearts; settings toggles).
**Depends on:** Plan 03 (client identity for authored content). **Exit:** these four features are real end-to-end.

### Plan 08 — Greenfield backend modules, heavy `NEEDS BRAINSTORM (each its own)`
Each is a full subsystem needing its own brainstorm + plan: **messaging/chat**, **subscriptions/abonnements**, **disputes/litiges**, **granular roles & permissions**, **audit log**, **analytics aggregation** (beyond existing `statistics` endpoints), **integrations/OAuth** (Stripe Connect / Google Calendar / Mailchimp / Twilio / Zapier).
**Exit:** delivered feature-by-feature; scope-trim candidates — confirm which are actually in product scope before building.

### Plan 09 — Polish `READY`
Remaining mobile dead-ends (Profil rows, filter/sort chips made real, chat `send()` persistence, quiz answers used downstream, parameterize `review.tsx`/`report.tsx` by target), residual cosmetic no-ops. Absorbed opportunistically whenever a plan touches the relevant file; this catches the leftovers.

---

## Execution model

- Run each numbered plan through `superpowers:subagent-driven-development`: fresh subagent per task, two-stage review between tasks.
- Prefer a git worktree per plan (`superpowers:using-git-worktrees`) so web/mobile/server changes for a phase stay isolated.
- **Parallel per-domain (R4):** within a domain plan, the backend task lands first, then web + mobile wiring tasks can run concurrently (independent files).
- Before Plan 05, 07, and each Plan 08 item: run `superpowers:brainstorming` to settle schema/flow, then write that plan with `superpowers:writing-plans`.

## Dependency graph (quick view)

```
01 Foundation
├─ 02 Public reads ─┬─ 06 Admin (also needs 01)
│                   └─ 09 Polish (opportunistic)
└─ 03 Client auth ──┬─ 04 Client domains
                    ├─ 05 Bookings+Stripe (brainstorm)
                    └─ 07 Greenfield-cheap (brainstorm-light)
08 Greenfield-heavy — independent, each its own brainstorm+plan
```
