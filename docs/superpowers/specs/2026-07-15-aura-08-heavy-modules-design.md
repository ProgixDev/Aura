# Aura Plan 08 — Heavy Greenfield Modules: Design Spec

**Status:** approved by user 2026-07-15, ready for `writing-plans`.

## Goal

Build the 7 subsystems the master roadmap deferred indefinitely on 2026-07-13 (`docs/superpowers/plans/2026-07-13-aura-master-roadmap.md:84-85`): messaging/chat, subscriptions/abonnements, integrations (Stripe Connect only — see below), disputes/litiges, granular roles & permissions, audit log, analytics aggregation. Deferral reason was "no validated product requirement, core product wasn't live yet" — Plans 01–07/09 are now live, and the user has decided to proceed with all 7.

Each of the 7 is independent enough to be its own numbered plan (mirrors how the original "implement everything" ask was split into Plans 01–09). This spec is the shared design; `writing-plans` should produce 7 separate plan documents (suggested naming: `2026-07-15-aura-08a-messaging.md` through `...-08g-analytics.md`), sequenced per the order in "Sequencing" below.

## Research summary (state as of 2026-07-15, before this plan)

Full detail gathered via 3 parallel codebase research passes; key findings:

- **Messaging:** Full client-facing UI shell exists on both mobile (`mobile/app/(tabs)/messages.tsx`, `mobile/app/chat/[id].tsx`) and web (`web/app/(site)/compte/messages`), plus an admin moderation UI (`web/app/admin/messages`). Zero backend — no DB entity, no module, no WebSocket infra anywhere in `server/`. `Conversation.kind: 'practitioner'|'circle'` (added in Plan 09) is confirmed to be just a UI filter label, not a validated group-chat concept — only 1 of 4 mock conversations is `'circle'`, with no group mechanics. **No praticien-facing reply surface exists** except `mobile/app/dashboard.tsx` — a thin, currently-decorative praticien-mode screen in the same mobile app (gated by `session.role === 'practitioner'`), which has no messages entry point today.
- **Disputes:** `web/app/admin/litiges/page.jsx` is a genuinely separate concept from `signalements` (one-sided profile reports) and `remboursements` (refund requests against the platform) — it models a two-sided client↔praticien financial disagreement (`clientName`, `practitionerName`, `amount`, `reason`). Admin-only mock, no client/mobile UI, no DB entity, no server module.
- **Subscriptions:** Praticien-facing (not client) in both mocks, but the two **contradict each other**: web (`web/lib/data/content.js:81-85`, backed by `/tarifs` + `admin/abonnements` + `admin/parametres/facturation`) shows 3 tiers (Essentiel 0€/Pro 29€/Premium 59€); mobile (`mobile/app/subscription.tsx`) shows a single flat rate (0€ for 30 days, then 9.90€/mo). `praticien.niveau` ('Novice'/'Praticien confirmé'/'Expert') is an unrelated self-declared badge, not a pricing tier. Stripe today only does PaymentIntents (`server/src/common/stripe.service.ts`) — no Subscriptions/Checkout/Products anywhere.
- **Integrations:** `web/app/admin/parametres/integrations/page.jsx` mocks 5 "connected" integrations (Stripe, Google Calendar, Mailchimp, Twilio, Zapier) with fabricated status text and toast-only buttons — fully decorative, zero backend, zero OAuth infra in `server/package.json`.
- **Roles & permissions:** Fully specified by the mock (`web/app/admin/roles/page.jsx` + `web/lib/data/admin.js:84-89`) — 4 roles (Administrateur/Modérateur/Support/Comptabilité) × an 11-capability permission matrix, already laid out exactly. Backend today is a single `User.is_admin: boolean` (`server/src/database/entities/user.entity.ts:11`), enforced by a binary `AdminGuard`.
- **Audit log:** `web/app/admin/audit/page.jsx` mock is fully specified — categories `moderation|verification|finance|security|support|system`, columns Quand/Auteur/Action/Cible/Type, export button. No DB table, no write-path; only near-miss is `email-template.entity.ts`'s one-off `created_by` column (not a general pattern).
- **Analytics:** Partially real already — `paiements`, `remboursements`, and `echanges` each expose real, wired `GET .../statistics` endpoints (confirmed in code, already consumed by their own admin pages per Plan 06). What's missing and genuinely new: the main dashboard (`web/app/admin/page.jsx`) and `web/app/admin/analytique/*` (revenus/croissance/retention subpages) are 100% mock, pulling from a static `analytics` object with shapes for `revenueMonthly`, `bookingsWeekly`, `signups`, `retention` cohorts, `disciplineShare`, churn reasons, and an acquisition funnel — none of that aggregation math exists server-side.
- **Auth infrastructure fact (relevant to messaging + Connect):** praticiens already have their own JWT identity (`server/src/auth/praticien-auth/`, confirmed real, alongside `praticien-verification`) — separate from `ClientGuard`/`AdminGuard`. This is what praticien-side messaging and Stripe Connect onboarding authenticate against; no new auth system needed, though a `PraticienGuard` (resolving `req.praticien` from the JWT, mirroring `ClientGuard`'s pattern) may not exist yet and should be verified/added by the messaging sub-plan's ground-truth research if missing.

## Locked decisions (P8 table)

| # | Decision | Choice |
|---|---|---|
| P8-1 | Messaging transport | REST + react-query polling (`refetchInterval` while a chat screen is open), no WebSocket infra — matches the codebase's established "lightweight, no infra-heavy" philosophy (same reasoning as R3's "no calendar engine"), and no socket.io/`@nestjs/websockets` exists anywhere in `server/` today. |
| P8-2 | Messaging scope | Real 1:1 client↔praticien chat, both directions live. Extends `mobile/app/dashboard.tsx` with a messages entry point + reply screen, reusing `messages.tsx`/`chat/[id].tsx` UI patterns for the praticien role. Circle/group messaging dropped entirely — confirmed unvalidated speculation, not a requirement. |
| P8-3 | Subscriptions | Web's 3-tier model is canonical: **Essentiel** (0€, 5 séances/mois) / **Pro** (29€/mo, illimité + mise en avant + stats + événements + troc) / **Premium** (59€/mo, badge "À la une" + page personnalisée + support prioritaire), keyed to `praticien_id`. Real Stripe Subscriptions (Products/Prices, Checkout Session for signup, webhook-driven status sync) — separate flow from the existing PaymentIntents booking flow. Mobile's `subscription.tsx` reworked to show real tiers instead of its flat-rate mock. |
| P8-4 | Integrations | Only **Stripe Connect** (praticien payouts) gets built for real, extending the already-real Stripe integration. Google Calendar / Mailchimp / Twilio / Zapier: remove the decorative "connected" mock cards from `admin/parametres/integrations` entirely — same call as Plan 09's OAuth-button removal (no real backend, don't fake it). |
| P8-5 | Disputes | Admin-only mediation tool on the existing `admin/litiges` mock. New `disputes` entity. No client-facing "open a dispute" form — staff creates/tracks manually. Convenience "escalate to dispute" actions from a rejected refund or a resolved signalement are a stretch addition, not required for the sub-plan's exit criteria. |
| P8-6 | Roles & permissions | Exactly the 4 roles + 11-capability matrix already specified in the mock. Adds a `role` column to admin users (default `'admin'` for the single existing admin — non-breaking) + a capability-check decorator/guard. The mock's "Éditer" role-matrix-editor UI is NOT rebuilt as an editable admin feature — the matrix is a fixed, hardcoded constant (`CAPABILITIES` map in code); the roles page becomes a real *display* of that constant, not a live editor. Rationale: a full permission-editor UI is materially bigger scope than "4 fixed roles work for real," and nothing in the research suggests dynamic custom roles are an actual requirement. |
| P8-7 | Audit log | New `audit_logs` table + a small injectable `AuditLogService.record(...)` called additively from ~10 existing services' existing mutation points (avis moderation, signalement resolve/reject, remboursement approve/refuse/complete, praticien-verification approve/reject, dispute resolve, admin user CRUD) — no new business logic in those services, just a logging call added at each existing decision point. |
| P8-8 | Analytics | New aggregator endpoints matching the exact data shapes already in the `analytics` mock object (`web/lib/data/admin.js`) — revenueMonthly, bookingsWeekly, signups, retention cohorts, disciplineShare, churn reasons, acquisition funnel. Existing per-module stats (paiements/remboursements/echanges) are referenced/composed, not duplicated. **Acquisition-funnel top-of-funnel (visits) stays explicitly out of scope** — no visit-tracking infrastructure exists anywhere and adding one (e.g. Plausible/GA) is a separate, unscoped decision; this gap must be documented in the plan, not silently faked. |

## Sub-plan architecture sketches

Each sketch below is enough for `writing-plans` to expand into a full task-by-task plan with real code — not itself a plan.

### 08a — Messaging
- **Entities:** `conversations` (id, client_id, praticien_id, unique pair, created_at, updated_at), `messages` (id, conversation_id, sender_role: `'client'|'praticien'`, text, read_at nullable, flagged boolean default false — for admin moderation, created_at).
- **Endpoints:** Client (`ClientGuard`): `GET/POST /client/conversations`, `GET/POST /client/conversations/:id/messages`. Praticien (verify/add `PraticienGuard`): mirrored `GET/POST /praticien/conversations[...]`. Admin (`AdminGuard`): `GET /admin/conversations` (moderation list/detail), `POST /admin/messages/:id/flag`.
- **Frontend:** Mobile/web client messaging screens swap mock repos for real endpoints (UI mostly unchanged). New praticien-side messages list + reply screen off `dashboard.tsx`. Admin `messages`/`message/[id]` wired to real data.
- **Depends on:** nothing else in Plan 08. Can run first.

### 08b — Roles & permissions
- **Schema:** `users.role: 'admin'|'moderateur'|'support'|'comptabilite'` (nullable, meaningful only when `is_admin=true`; existing admin row(s) default `'admin'`).
- **Backend:** `server/src/auth/capabilities.ts` — hardcoded `CAPABILITIES: Record<Role, Set<Capability>>` matching the 11-row mock matrix exactly. New `@RequireCapability('avis_moderation')` decorator + guard (or extends `AdminGuard`), applied progressively to existing admin routes without changing behavior for `'admin'` role (retains all capabilities — non-breaking for the sole real admin today).
- **Frontend:** `admin/equipe` create/edit gains a real role selector. `admin/roles` becomes a real, read-only display of the `CAPABILITIES` constant + real per-role member counts (not an editor).
- **Depends on:** nothing else, but should land before 08c/08e/08f so their write-paths/guards can be role-aware from the start rather than retrofitted.

### 08c — Audit log
- **Schema:** `audit_logs` (id, actor_id FK users nullable, action string, target_type string, target_id nullable, category enum, metadata json nullable, created_at).
- **Backend:** `AuditLogService.record(actor, action, target, category, metadata?)`, called from each of the ~10 existing mutation points listed in P8-7. `GET /admin/audit-logs` (paginated, filter by category/actor/date), `GET /admin/audit-logs/export` (CSV).
- **Frontend:** wire the existing `admin/audit` mock table + stat cards + export button.
- **Depends on:** 08b (so logged actor role is meaningful), ideally lands before 08d/08g so their actions get logged from day one.

### 08d — Disputes
- **Schema:** `disputes` (id, client_id, praticien_id, paiement_id nullable FK, montant nullable, motif, statut: `'ouvert'|'resolu'`, priorite: `'haute'|'normale'`, resolution_notes nullable, created_at, updated_at).
- **Backend:** `AdminGuard`-only: `GET/POST /admin/disputes`, `POST /admin/disputes/:id/resolve`. Stretch (not required for exit criteria): escalation convenience endpoints from remboursements/signalements.
- **Frontend:** wire existing `admin/litiges` mock to real data + real resolve action.
- **Depends on:** 08b/08c for capability-gating + audit logging of resolutions, but functionally standalone otherwise.

### 08e — Subscriptions
- **Schema:** `subscriptions` (id, praticien_id FK unique, plan: `'essentiel'|'pro'|'premium'`, statut: `'active'|'past_due'|'canceled'|'trialing'`, stripe_subscription_id, stripe_customer_id, current_period_end, created_at, updated_at). **Manual prerequisite:** user must create 2 Stripe Products/Prices (Pro, Premium — Essentiel is free/no Stripe object) in their Stripe test dashboard and supply the price IDs, same pattern as Plan 05's Stripe test keys.
- **Backend:** Stripe Checkout Session for signup/upgrade (simplest path for recurring billing — avoids building custom card-collection UI). Webhook handler for `customer.subscription.*`/`invoice.payment_failed` (extends the existing `/api/webhooks/stripe` controller with new event-type routing, not a new endpoint). `GET/POST /praticien/subscription`, `POST /praticien/subscription/cancel`. `GET /admin/subscriptions`, `GET /admin/subscriptions/statistics`.
- **Frontend:** mobile `subscription.tsx` reworked to real 3-tier + real Checkout redirect; web `admin/abonnements` wired to real list+stats; `admin/parametres/facturation`'s commission-rate field (currently decorative, ties into Plan 05's known unfixed gap — commission/montant_net_praticien always 0) gets a real settings row, since 08f (Connect) needs a real commission rate to compute payouts.
- **Depends on:** nothing else in Plan 08, but should land before 08f (Connect needs the commission-rate config this sub-plan introduces).

### 08f — Integrations (Stripe Connect only)
- **Schema:** `praticiens.stripe_account_id` nullable, `praticiens.stripe_payouts_enabled` boolean default false.
- **Backend:** `POST /praticien/stripe/connect/onboard` → creates a Stripe Connect Express account, returns the Stripe-hosted onboarding link. Webhook `account.updated` tracks onboarding completion. Booking payment flow (Plan 05's PaymentIntent creation in `rendez-vous`) gains `application_fee_amount` (computed from 08e's new commission-rate config) + `transfer_data.destination` (the praticien's connected account) — standard Stripe Connect "destination charges" pattern, finally giving `commission`/`montant_net_praticien` real non-zero values.
- **Frontend:** admin `parametres/integrations`'s Stripe card becomes real (shows actual connection status); praticien `dashboard.tsx` gains a "Paiements" section with Connect onboarding CTA/status. The other 4 integration cards are deleted from this page (not wired, not left decorative).
- **Depends on:** 08e (commission-rate config).

### 08g — Analytics
- **Backend:** `GET /admin/analytics/dashboard` (aggregates the main dashboard's StatCards), `GET /admin/analytics/revenue`, `GET /admin/analytics/growth`, `GET /admin/analytics/retention` — new SQL for weekly/monthly bookings, signups-by-cohort, retention-by-cohort-month, discipline revenue share; composes (doesn't duplicate) the existing paiements/remboursements/echanges `statistics` endpoints where their data is directly reusable.
- **Frontend:** wire `admin/page.jsx` main dashboard + `admin/analytique/*` subpages to real data.
- **Depends on:** all other 08x sub-plans for richest data (subscriptions/disputes/audit-log all feed dashboard metrics), so this runs last.

## Sequencing

`08a (messaging) → 08b (roles) → 08c (audit log) → 08d (disputes) → 08e (subscriptions) → 08f (Connect) → 08g (analytics)`

08a is fully independent and could run in parallel with 08b–08d if desired; 08e→08f is a hard dependency (commission-rate config); 08g should run last for maximum real data to aggregate over.

## Explicitly out of scope

- Circle/group messaging (unvalidated, dropped per P8-2).
- Client-facing dispute self-service form (per P8-5).
- Google Calendar / Mailchimp / Twilio / Zapier integrations (removed, not built — per P8-4).
- A live, editable permission-matrix admin UI (fixed roles only — per P8-6).
- Acquisition-funnel visit tracking (no infra exists, not this plan's job to add — per P8-8).
- Any new OAuth/social-login flow (out of scope for all of Plan 08 — messaging/Connect both authenticate against existing JWT identities, not new OAuth).

## Known open risk

Praticien-side auth guard for messaging/dashboard/Connect (`PraticienGuard` or equivalent) has not been confirmed to exist yet — `praticien-auth`/`praticien-verification` modules are confirmed real, but whether a reusable `req.praticien`-resolving guard already exists (vs. needing to be added) was not directly verified in this research pass. 08a's plan document must verify this first, as it blocks all three sub-plans that need praticien-authenticated routes (08a, 08e, 08f).
