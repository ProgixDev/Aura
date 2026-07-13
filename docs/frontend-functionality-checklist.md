# Aura Frontend Functionality Checklist

**Purpose:** inventory every frontend feature (web + mobile) against what the NestJS backend (`server/`) actually exposes, so gaps can be checked off task by task. Built by exploring `server/src`, `web/app`+`web/components`, `mobile/app`+`mobile/src` (2026-07-13).

## Headline findings

- **Web (`web/`)** is a fully static Next.js prototype. Zero `fetch`/`axios` calls anywhere. Every screen reads `lib/data/*.js` mock arrays; every action (login, payment, ban, verify...) fires a fake toast/modal via Zustand and persists nothing. `/admin/*` has no auth guard at all.
- **Mobile (`mobile/`)** is the same situation. Zero network calls. Everything goes through `src/data/repos/index.ts`, which resolves from `src/data/mock/*` after a fake delay. Several buttons/menu rows have no handler at all (dead ends).
- **Backend (`server/`)** is a real, working NestJS API (Laravel→NestJS port, see [[php-to-nestjs-migration]]). It is a **wellness/coaching marketplace** (practitioners, disciplines, cercles, events, articles, promotions, échanges, paiements, remboursements) — **not** a loan/credit platform.
- So "implemented" below means: does backend support it, does the screen exist, and (separately) is it actually wired up. Right now the wiring column is **No** for 100% of rows — that is the single biggest checklist item, bigger than any individual feature gap.

Legend: **Backend** = API exists · **Web UI** = page/component exists · **Mobile UI** = screen exists · **Wired** = frontend actually calls the backend (currently always "No" — tracked once per domain, not per row, to avoid repeating a known fact 40 times).

## Verification & corrections (2026-07-13)

Three parallel exploration passes (web wiring, mobile wiring, backend inventory) confirmed this checklist is accurate. Corrections that change planning — see [implementation roadmap](superpowers/plans/2026-07-13-aura-master-roadmap.md):

- ⚠️ **`GET /api/praticiens/:id` does NOT exist** (only the list). Section 2's "Practitioner detail ✅ Backend" is wrong — the detail endpoint must be built (done in Plan 01).
- ⚠️ **Many admin CRUD controllers have NO guard** (articles, cercles, disciplines, events, notifications, emails, promotions + admin halves of echanges/paiements/remboursements) — effectively public. Add `AdminGuard` in the admin phase.
- ⚠️ **`avis`, `signalements`, `programmes` DB tables already exist** (no entity/module/controller). So Reviews & Reports (in the "no backend module at all" list) are *schema-present, code-absent* — cheaper than greenfield.
- **Client auth model = clients are `users` rows** (`clients` table has no password; `ClientGuard` maps JWT email→clients). Locked decision.
- **`paiement.rendez_vous_id` is a dangling column** → bookings were intended; implemented as a lightweight rendez_vous module.
- **No global API versioning** — only `v1/praticien*` use `v1`; all else is `/api/*`. Backend port = **8000** (`/api` base = `http://localhost:8000/api`).
- Mobile nuance: Messages search + "Non lus" filter **already work**; home "Lire l'article" reuses `/domain/[slug]`. Web: extra `/recherche` dead links in `ReservationsBody.jsx:58` + `compte/reservation/[id]:114`; extra plural `/praticiens/${id}` in `admin/praticien/[id]:41`.

**Implementation plans:** [master roadmap](superpowers/plans/2026-07-13-aura-master-roadmap.md) sequences this checklist into 9 phased plans; [Plan 01 — Foundation](superpowers/plans/2026-07-13-aura-01-foundation.md) is written and executable now.

---

## 1. Auth

| Feature | Backend | Web UI | Mobile UI |
|---|---|---|---|
| Admin register/login/logout/refresh | ✅ `/api/admin/*` | ❌ no admin auth screen (admin area is wide open) | ❌ n/a (no admin panel on mobile) |
| Admin: list/activate/deactivate/delete admins | ✅ | ⚠️ `/admin/equipe` exists but not wired, and not admin-auth-gated | ❌ |
| Praticien register (+5 verification docs upload) | ✅ `/api/v1/praticien/register` | ⚠️ `/inscription` (role toggle only, no doc upload UI) | ⚠️ `/onboarding/role` + `/onboarding/auth` (no doc upload UI, no real submit) |
| Praticien login/logout/refresh/profile | ✅ | ⚠️ `/connexion` (form only) | ⚠️ `/onboarding/auth` (form only, Apple/Google buttons have no handler) |
| Client-side auth (login/signup/forgot password) | ❌ **no client/customer auth module in backend at all** — only Admin and Praticien auth exist | `/connexion`, `/inscription`, `/mot-de-passe-oublie` (UI only) | `/onboarding/auth` (UI only) |
| Praticien verification review (approve/reject docs, statistics, relance) | ✅ `/api/v1/admin/praticiens/verification/*` | ⚠️ `/admin/praticiens/verification` exists | ❌ n/a |

**Checklist:**
- [ ] Design/build a real client (non-practitioner) auth module in backend — currently missing entirely.
- [ ] Wire web `/connexion` `/inscription` `/mot-de-passe-oublie` to real auth endpoints.
- [ ] Wire mobile `/onboarding/auth` to real auth endpoints; implement or remove decorative Apple/Google buttons.
- [ ] Add practitioner verification-document upload UI (web + mobile) to match backend's 5-document requirement.
- [ ] Build an actual admin login gate for `web/admin/*` (currently zero auth on the entire admin section).
- [ ] Wire `/admin/praticiens/verification` (web) to the real verification-review endpoints.

## 2. Praticien directory / discovery

| Feature | Backend | Web UI | Mobile UI |
|---|---|---|---|
| List/search practitioners | ✅ `GET /api/praticiens` | ✅ `/praticiens` | ✅ `(tabs)/recherche` |
| Practitioner detail/profile | ✅ | ✅ `/praticien/[id]` | ✅ `/praticien/[id]` |
| Filter by discipline/mode/price | ⚠️ backend has no filter query params documented — needs checking | ⚠️ client-side filter over mock array only | ❌ filter chips are cosmetic, don't filter results |
| Favorite / share a practitioner | ❌ no favorites/reviews-style module in backend | ⚠️ `/compte/favoris` (fake) | ❌ heart/share icons have no handler |

**Checklist:**
- [ ] Confirm/add backend query params for discipline/mode/price/sort filtering.
- [ ] Wire web `/praticiens` + `/praticien/[id]` to `GET /api/praticiens`.
- [ ] Wire mobile `recherche` + `praticien/[id]` to same; implement real filtering (currently a no-op on both platforms).
- [ ] Design a favorites feature (no backend module exists yet) or drop the UI affordances.

## 3. Disciplines

| Feature | Backend | Web UI | Mobile UI |
|---|---|---|---|
| List disciplines | ✅ `GET /api/disciplines` | ✅ `/disciplines` | ✅ home grid |
| Discipline detail | ✅ `GET /api/disciplines/:id` | ✅ `/discipline/[slug]` | ✅ `/domain/[slug]` |
| CRUD (admin) | ✅ create/update/delete | ✅ `/admin/disciplines` | ❌ n/a |

**Checklist:**
- [ ] Wire web + mobile discipline list/detail to backend.
- [ ] Wire `/admin/disciplines` CRUD to backend.
- [ ] Note: backend uses numeric `:id`, web uses `slug` — confirm slug↔id mapping strategy before wiring.

## 4. Cercles (peer circles)

| Feature | Backend | Web UI | Mobile UI |
|---|---|---|---|
| List/create/update/delete circles | ✅ `GET/POST/PUT/DELETE /api/cercles` | ✅ `/cercles`, `/cercle/[id]`, admin `/admin/cercles`, `/admin/cercle/[id]` | ❌ **no cercle screens exist on mobile at all** |
| Join a circle / circle feed / posts | ❌ no membership/feed model in backend — cercles endpoint is just name/description/color/facilitator | ⚠️ mock social feed, join = fake toast | ❌ |

**Checklist:**
- [ ] Wire web cercle list/detail + admin CRUD to backend.
- [ ] Build cercle screens on mobile (currently completely absent — full gap, not just unwired).
- [ ] Design backend support for membership + feed/posts if that's staying in scope (currently only circle metadata exists).

## 5. Events

| Feature | Backend | Web UI | Mobile UI |
|---|---|---|---|
| List/detail events | ✅ `GET /api/events`, `GET /api/events/:id` | ✅ `/evenements`, `/evenement/[id]` | ✅ `(tabs)/evenements`, `/event/[id]` |
| Create/update/delete (admin) | ✅ | ✅ `/admin/evenements`, `/admin/evenement/nouveau`, `/admin/evenement/[id]` | ❌ n/a |
| Book/register for an event | ⚠️ no dedicated event-booking endpoint — likely meant to flow through paiements | ⚠️ generic form modal (fake) | ⚠️ routes into generic `/booking/payment` stub (not a real distinct pre-registration flow) |
| Filter by event type/date/location | n/a (client concern) | ⚠️ filter chips mostly decorative | ⚠️ filter chips mostly decorative |

**Checklist:**
- [ ] Wire event list/detail (web + mobile) to backend.
- [ ] Wire admin event CRUD (web) to backend.
- [ ] Decide how event registration/payment should relate to `paiements` module; implement real flow instead of the shared booking stub.
- [ ] Implement real filtering (currently cosmetic on both platforms).

## 6. Booking (sessions) & Paiements

| Feature | Backend | Web UI | Mobile UI |
|---|---|---|---|
| Book a session with a practitioner | ❌ no dedicated "bookings/reservations" module in backend — closest analogue is `paiements` (a payment record), no slot/calendar model found | ✅ `/reserver/[id]` 4-step flow, `/compte/reservations`, `/compte/reservation/[id]`, admin `/admin/reservations`, `/admin/reservation/[id]` | ✅ `/booking/slot`, `/booking/payment`, `/booking/confirmation` |
| List own payments/transactions | ✅ `GET /api/paiements/clients`, `/api/paiements/:id` | ✅ `/compte/paiements` | ⚠️ payment step exists but no payment-history screen (Profil "Moyens de paiement" is a dead-end row) |
| Admin payments list/stats/export | ✅ `GET /api/paiements`, `/statistics`, `/export*` | ✅ `/admin/paiements`, `/admin/paiement/[id]` | ❌ n/a |
| Actual payment processing (card/Stripe) | ❌ no payment-gateway integration in backend (paiements module records transactions, doesn't process cards) | ⚠️ raw card/CVC fields, zero validation, nothing real | ⚠️ hardcoded Visa/Apple Pay options, fake `bookingRepo.hold()`, copy claims "via Stripe" but nothing real |

**Checklist:**
- [ ] **Design a bookings/reservations/session-slots backend module** — this is a hard blocker: both frontends have a full booking UI with nothing to call. This is the biggest single missing subsystem.
- [ ] Decide on and integrate a real payment gateway (e.g. Stripe) in backend before wiring either frontend's payment step.
- [ ] Wire `/compte/paiements` (web) to `GET /api/paiements/clients`.
- [ ] Wire `/admin/paiements` + `/admin/paiement/[id]` (web) to backend.
- [ ] Build a mobile payment-history screen (currently just a dead menu row).
- [ ] Fix web bug: `/admin/paiement/[id]` "Réservation liée" link points to `/admin/reservations/${id}` (plural, 404) instead of `/admin/reservation/${id}`.

## 7. Remboursements (refunds)

| Feature | Backend | Web UI | Mobile UI |
|---|---|---|---|
| Client: request/list/cancel refund | ✅ `/api/remboursements/client*` | ⚠️ refund action on `/compte/reservation/[id]` (fake modal) | ❌ no refund request flow on mobile |
| Admin: list/approve/refuse/complete refund | ✅ `/api/remboursements/admin*` | ✅ `/admin/remboursements` | ❌ n/a |

**Checklist:**
- [ ] Wire client refund request/cancel (web) to backend.
- [ ] Build a mobile refund-request flow (currently absent).
- [ ] Wire `/admin/remboursements` to backend approve/refuse/complete endpoints.

## 8. Échanges (troc de soins / barter marketplace)

| Feature | Backend | Web UI | Mobile UI |
|---|---|---|---|
| Client: list/create/edit/delete own exchange request | ✅ `/api/echanges/client/*` | ✅ `/compte/echanges` | ✅ `/exchange`, `/exchange/[id]`, `/exchange/create` |
| Admin: list/update-status/hide/report/delete | ✅ `/api/echanges/*` (statistics, list, update, hide, report, delete) | ✅ `/admin/echanges` list | ❌ n/a |
| Admin exchange detail/moderation drill-down | n/a (backend supports it via `GET /api/echanges/:id`) | ❌ **bug: rows link to `/admin/echange/${id}` — no such page exists, 404s** | ❌ n/a |

**Checklist:**
- [ ] Wire client échanges CRUD (web `/compte/echanges`, mobile `/exchange*`) to backend — note mobile's `create.tsx` already mutates its local mock array, closest thing to "real" logic to adapt.
- [ ] Build the missing `/admin/echange/[id]` detail page (web) — currently a dead link from the moderation table.
- [ ] Wire admin échanges moderation (list/hide/report/update status) to backend.

## 9. Articles / Blog

| Feature | Backend | Web UI | Mobile UI |
|---|---|---|---|
| List/detail articles | ✅ `GET /api/articles`, `/:id` | ✅ `/blog`, `/blog/[slug]` | ❌ no blog/articles screens on mobile |
| Admin CRUD + publish/archive | ✅ | ✅ `/admin/contenu`, `/admin/contenu/nouveau` | ❌ n/a |

**Checklist:**
- [ ] Wire web blog list/detail to backend.
- [ ] Wire `/admin/contenu` CRUD + publish/archive actions to backend.
- [ ] Decide whether mobile needs an articles/blog surface at all (currently zero screens — confirm scope, not just "unwired").

## 10. Notifications

| Feature | Backend | Web UI | Mobile UI |
|---|---|---|---|
| Admin: list/create/update/delete broadcast notifications | ✅ `GET/POST/PUT/DELETE /api/notifications` | ✅ `/admin/notifications` | ❌ n/a |
| User: notification preferences toggle | ❌ no user-notification-preferences model in backend | ⚠️ `/compte/parametres` toggle (local only) | ⚠️ Profil "Notifications" row has no handler (dead end) |

**Checklist:**
- [ ] Wire `/admin/notifications` compose/list to backend.
- [ ] Design backend support for per-user notification preferences (currently doesn't exist) before wiring the settings toggles.
- [ ] Build the mobile notifications-preferences screen (currently a dead menu row).

## 11. Email templates

| Feature | Backend | Web UI | Mobile UI |
|---|---|---|---|
| List/create/update/delete templates | ✅ `/api/emails` | ✅ `/admin/emails` | ❌ n/a (admin-only) |

**Checklist:**
- [ ] Wire `/admin/emails` to backend.

## 12. Promotions

| Feature | Backend | Web UI | Mobile UI |
|---|---|---|---|
| CRUD promo codes | ✅ `/api/promotions` | ✅ `/admin/promotions` | ❌ n/a |
| Apply a promo code at checkout | ❌ no "apply/validate promo at checkout" endpoint found | ❌ not present in `/reserver/[id]` flow | ❌ not present in `/booking/payment` |

**Checklist:**
- [ ] Wire `/admin/promotions` CRUD to backend.
- [ ] Add promo-code redemption to backend paiements flow, then to both booking UIs (currently missing on all three layers).

## 13. Clients (admin directory)

| Feature | Backend | Web UI | Mobile UI |
|---|---|---|---|
| List clients | ✅ `GET /api/clients` | ✅ `/admin/clients`, `/admin/client/[id]` | ❌ n/a |
| Client detail actions (notes, reset password, ban, export) | ❌ backend only exposes a list endpoint — no detail/notes/ban/reset-password endpoints | ⚠️ UI exists, fully fake | ❌ n/a |

**Checklist:**
- [ ] Wire `/admin/clients` list to backend.
- [ ] Design backend endpoints for client detail/notes/ban/reset-password/export before wiring `/admin/client/[id]` actions (currently backend can't support most of that page).

---

## Features with UI on one or both frontends but **no backend module at all**

These need backend design work, not just "wire it up":

- [ ] **Reviews/avis** — web `/compte/avis`, `/admin/avis`; mobile `review.tsx`. No reviews module in backend.
- [ ] **Messaging/chat** — web `/compte/messages`, `/admin/messages`; mobile `(tabs)/messages`, `chat/[id]`. No messaging module in backend (this is distinct from `echanges`).
- [ ] **Reports/signalements** (safety flagging) — web `/admin/signalements`; mobile `report.tsx`. No reports module in backend.
- [ ] **Disputes/litiges** — web `/admin/litiges`. No disputes module in backend.
- [ ] **Subscriptions/abonnements** (practitioner plans) — web `/admin/abonnements`; mobile `subscription.tsx`. No subscriptions module in backend.
- [ ] **Roles & permissions matrix** — web `/admin/roles`. Backend only has a flat `is_admin` boolean, no granular roles.
- [ ] **Audit log** — web `/admin/audit`. No audit-log module in backend.
- [ ] **Analytics** (`/admin/analytique/*`) — partially derivable from existing `statistics` endpoints (paiements, remboursements, echanges, praticien-verification); revenue/growth/retention breakdowns beyond that need new backend aggregation.
- [ ] **Integrations** (`/admin/parametres/integrations` — Stripe/Google Calendar/Mailchimp/Twilio/Zapier) — no backend integration/OAuth layer exists.
- [ ] **Team/équipe management beyond admin CRUD** (`/admin/equipe`) — partially covered by admin-auth list/activate/deactivate/delete; invite-by-email flow doesn't exist in backend.

## Known bugs / dead links (fix regardless of wiring)

- [ ] Web: `/compte` and `/compte/favoris` link to `/recherche`, which doesn't exist (should be `/praticiens`).
- [ ] Web: `BookingFlow.jsx` "Retour au profil" and admin practitioner detail's "Profil public" link to `/praticiens/${id}` (plural) — actual route is singular `/praticien/${id}` — 404.
- [ ] Web: `/admin/echanges` row links to `/admin/echange/${id}` — page doesn't exist — 404.
- [ ] Web: `/admin/paiement/[id]` "Réservation liée" links to `/admin/reservations/${id}` (plural) — actual route is `/admin/reservation/${id}` — 404.
- [ ] Mobile: decorative dead-ends with no handler — Apple/Google sign-in buttons; Profil rows (favoris, séances, notifications, moyens de paiement, confidentialité); Dashboard rows (séances, fiche praticien, niveau/tarifs, événements, revenus, charte); heart/share icons (practitioner/domain/event detail); chat "+" attach and video-call icons; Messages "+" new-conversation; Événements "Activer" notify; Exchange detail "Sauvegarder".
- [ ] Mobile: filter/sort chips are cosmetic (no-op) on Recherche, Messages, Événements, Exchange list.
- [ ] Mobile: `review.tsx` and `report.tsx` aren't parameterized by the entity being reviewed/reported (hardcoded practitioner name; no target id) and don't submit anywhere.
- [ ] Mobile: chat `send()` doesn't append/persist the sent message (explicit TODO comment in code).
- [ ] Mobile: onboarding quiz answers captured but never used downstream.

---

## Suggested next step

This covers ~13 backend-backed domains + ~10 backend-missing features + a bug list — too wide for one implementation plan. Recommend splitting into **one plan per domain** (e.g. "Praticien directory wiring", "Booking + Paiements backend design", "Échanges wiring") and running each through `subagent-driven-development` independently, prioritized roughly:

1. Client auth (currently doesn't exist at all — blocks almost everything else being "real")
2. Bookings/reservations backend design (blocks both frontends' core flow)
3. Praticiens/disciplines/events read-only wiring (highest value, lowest risk — data already exists)
4. Échanges wiring (backend already fully supports it)
5. Paiements/remboursements wiring
6. Everything else, bug fixes as quick wins alongside whichever domain touches that file
