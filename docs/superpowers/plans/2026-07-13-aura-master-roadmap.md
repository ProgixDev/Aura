# Aura — Full Implementation Roadmap

> **This is a program roadmap, not a single executable plan.** "Implement everything the frontend implies" spans ~25 subsystems across 3 codebases (`server/` NestJS, `web/` Next.js, `mobile/` Expo). Per the writing-plans skill's Scope Check, it is decomposed into one master roadmap (this file) + a numbered series of per-phase implementation plans. Each numbered plan produces working, testable software on its own and is executed via `superpowers:subagent-driven-development`.

**Goal:** Turn two fully-static frontend prototypes into a working product backed by the real NestJS API, filling backend gaps as needed.

**Source of truth for scope:** [frontend-functionality-checklist.md](../../frontend-functionality-checklist.md) (inventory) — this roadmap sequences it.

**Verified 2026-07-13** by three parallel exploration passes (web wiring, mobile wiring, backend module inventory). The checklist is accurate; corrections captured below.

**Update 2026-07-13 (later same day):** Plans 02–07 and 09 are now written (Plan 01 already executed and merged). Plans 05 and 07 were flagged "needs brainstorm" — rather than a separate interactive brainstorming session, the schema/flow design was settled directly (by the session's controller, informed by full codebase research) and handed to each plan as locked decisions; see each plan's "Locked decisions" section for the reasoning. **Plan 08 (messaging, subscriptions, disputes, roles, audit log, analytics, integrations) is deferred indefinitely** — user decision: revisit once the core product (bookings, payments, client auth) is live, rather than speculatively building 7 unvalidated subsystems now.

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

### Plan 02 — Read-only public domains (web + mobile) `WRITTEN` ✅ `2026-07-13-aura-02-public-reads.md`
Wire list + detail for the 5 already-supported read domains: **disciplines, praticiens, events, articles, cercles**. Slug↔id: disciplines resolved client-side from the (unpaginated) full list; articles gets a small `?slug=` backend filter addition; events/cercles/praticiens use numeric id directly (no slug column). Small justified backend addition: `?status=` filter on events (mirrors articles) so drafts don't leak publicly. Mobile parity: **builds the missing mobile Cercles and Blog/Articles list+detail screens** (neither exists today), forked from `EventCard`/`event/[id]`/`domain/[slug]` templates. Cercles' fake feed/members/status (no backend support) dropped rather than faked.
**Depends on:** Plan 01. **Exit:** every public browse/detail screen shows live backend data on both platforms.

### Plan 03 — Client auth `WRITTEN` ✅ `2026-07-13-aura-03-client-auth.md`
Backend: new `ClientAuthModule` mirroring `praticien-auth`'s dual-write pattern (one transaction: `users` row + linked `clients` row by email) — register/login/logout/refresh/profile/check-token. Web: new `web/lib/auth-store.js` (Zustand + persist + localStorage, mirrors mobile's `session.ts` token pattern from Plan 01), wires `/connexion`, `/inscription`, `/mot-de-passe-oublie`, replaces `AuthModal`'s fake submit, guards `/compte/*`. Mobile: wires `/onboarding/auth`'s existing react-hook-form+zod submit to the real endpoint + `session.ts`'s already-built `setToken()`. Apple/Google buttons stay decorative (no OAuth in scope) — removed properly in Plan 09.
**Depends on:** Plan 01. **Exit:** a real client can register, log in, and stay logged in on both platforms.

### Plan 04 — Client-authenticated read/write domains `WRITTEN` ✅ `2026-07-13-aura-04-client-domains.md`
Backend already 100% complete for this plan (paiements/échanges/remboursements client routes all exist, all `ClientGuard`-protected) — pure frontend wiring. Web: paiements history, échanges CRUD (first real `onSubmit`/`onConfirm` wiring into the generic `FormModal`/`ConfirmModal` components), new `compte/remboursements` page + refund-request action (there was no client-facing refund UI at all — only the admin side had one). Mobile: new **payment-history** and **refund-request** screens (absent today), built on `booking/payment.tsx`'s `submitting`/try-finally pattern.
**Depends on:** Plan 03. **Exit:** logged-in clients see their payments, manage échanges, request refunds — live — on both platforms.

### Plan 05 — Bookings + Payments (Stripe) `WRITTEN` ✅ `2026-07-13-aura-05-bookings-stripe.md`
Design locked (was flagged needs-brainstorm, settled directly): new `rendez_vous` table (`client_id, praticien_id, date_heure, duree_minutes, mode, statut, tarif, promotion_id, stripe_payment_intent_id`) — lightweight, no calendar/availability engine per R3. Stripe PaymentIntent flow: booking creates the intent, a webhook (`POST /api/webhooks/stripe`, raw-body signature verification, idempotent) is the *only* place `statut→confirme` + the `paiements` row (finally populating the dangling `rendez_vous_id` column) get created — client-reported success is never trusted. New `POST /api/promotions/validate` for server-side discount computation. Web gets Stripe Elements, mobile gets `@stripe/stripe-react-native`'s payment sheet — both looked up via context7 rather than guessed. Requires the user to supply their own Stripe test-mode keys before running.
**Depends on:** Plan 03. **Exit:** a client can book+pay a session for real.

### Plan 06 — Admin auth + guard hardening + admin wiring `WRITTEN` ✅ `2026-07-13-aura-06-admin-wiring.md`
Complete guard-status table produced (every controller in `server/src/` audited) — 7 fully-public CRUD controllers (articles/cercles/disciplines/email-templates/events/notifications/promotions/clients) get class-level `AdminGuard`; 3 mixed client/admin controllers (échanges/paiements/remboursements) get method-level `AdminGuard` on just their admin routes. **This breaks every existing e2e test hitting those routes without a token** — plan handles it as TDD (update specs to expect 401→200-with-token before/alongside adding each guard). New separate `web/lib/admin-auth-store.js` (own token slot, doesn't collide with Plan 03's client store) + `/admin/connexion` + real layout guard. Every admin CRUD screen wired to its real backend; fake-with-no-backend sections (cercle members/feed, event attendees, notification send-log, client ban/notes/reset-password) removed or disabled rather than left fabricated. New `/admin/echange/[id]` detail page (previously a dead link).
**Depends on:** Plans 01–02. **Exit:** admins log in, and every admin screen backed by an existing endpoint is live + protected.

### Plan 07 — Greenfield backend modules, cheap first `WRITTEN` ✅ `2026-07-13-aura-07-greenfield-cheap.md`
Design locked (was flagged needs-brainstorm-light, settled directly): **avis** (reviews) and **signalements** (reports) built on their existing-but-unused DB tables — noting the real schema limitation that `avis` has no `client_id` column (ownership approximated by `full_name_author` string match) and `signalements.signale_par_id` points at `users` not `clients` (so `JwtAuthGuard` alone suffices there, no `ClientGuard` needed). **favorites** and **notification_preferences** are two small new tables (new migration). Web + mobile surfaces wired: `/compte/avis` + `/admin/avis`, mobile `review.tsx`/`report.tsx` (finally parameterized by target + real submit), `/admin/signalements`, `/compte/favoris` + heart icons, the 4 real notification toggles on `/compte/parametres`.
**Depends on:** Plan 03 (client identity for authored content). **Exit:** these four features are real end-to-end.

### Plan 08 — Greenfield backend modules, heavy `DEFERRED (user decision, 2026-07-13)`
**Not written.** Bundles 7 speculative subsystems: **messaging/chat**, **subscriptions/abonnements**, **disputes/litiges**, **granular roles & permissions**, **audit log**, **analytics aggregation** (beyond existing `statistics` endpoints), **integrations/OAuth** (Stripe Connect / Google Calendar / Mailchimp / Twilio / Zapier). None have validated product requirements and the core product (bookings/payments/client-auth) wasn't live yet when this was scoped. User chose to defer entirely rather than build any of the 7 speculatively — revisit once Plans 01–07 are live and it's clear which (if any) are actually needed.

### Plan 09 — Polish `WRITTEN` ✅ `2026-07-13-aura-09-polish.md`
8 remaining mobile dead-ends/no-ops not already swept up by Plans 03/04/06/07 landing first: remove decorative Apple/Google onboarding buttons (no OAuth in scope) and any `profil.tsx` row with genuinely nothing to wire to (removal preferred over a fake-looking live control, applied consistently); real client-side filtering wired up on Recherche/Événements/Échanges (search/chips currently set state that's never applied); chat `send()` gets an honest partial fix (optimistic local-only append, explicitly not claiming delivery — no messaging backend exists, see Plan 08); onboarding quiz answers persisted to the session store instead of being silently discarded on every step navigation (mechanical fix only, no downstream use added).
**Depends on:** best run after 03/04/06/07 so its dead-row inventory reflects what's actually still dead. **Exit:** completing this + Plans 01–07 is the full roadmap scope minus deferred Plan 08.

---

## Execution model

- Run each numbered plan through `superpowers:subagent-driven-development`: fresh subagent per task. Per-task review process is up to the executor — Plan 01 used a full two-stage (spec + code quality) review per task initially, then switched to implementer-does-work-and-self-reviews with one consolidated review at the end of the whole plan, which is the leaner default going forward unless a specific task looks risky enough to warrant a dedicated review.
- Prefer a git worktree per plan (`superpowers:using-git-worktrees`) so web/mobile/server changes for a phase stay isolated — **use the global location** (`~/.config/superpowers/worktrees/<project>/<branch>`), not a repo-local `.worktrees/` dir, so the main repo directory never picks up worktree-only artifacts.
- **Parallel per-domain (R4):** within a domain plan, the backend task lands first, then web + mobile wiring tasks can run concurrently (independent files).
- **Never add a "Co-Authored-By" or other AI-attribution trailer to any commit** — every task in every plan says this explicitly, but it's a standing project rule beyond just what's written in each plan.
- Plans 05 and 07 were flagged needs-brainstorm in the initial roadmap; that design work is done (see each plan's own "Locked decisions") — no separate brainstorming session is needed before executing them.

## Dependency graph (quick view)

```
01 Foundation ✅
├─ 02 Public reads ✅ ─┬─ 06 Admin ✅ (also needs 01)
│                      └─ 09 Polish ✅ (best run after 03/04/06/07)
└─ 03 Client auth ✅ ──┬─ 04 Client domains ✅
                       ├─ 05 Bookings+Stripe ✅
                       └─ 07 Greenfield-cheap ✅
08 Greenfield-heavy — DEFERRED indefinitely (user decision)
```
