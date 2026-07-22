# TODO — Client Feedback

Tasks from client feedback. Grouped by area.

## Branding
- [x] **Change the title to "GuériEnergies"** — updated everywhere (web + mobile): legal entity name, mobile splash wordmark (redesigned for the longer name), Stripe lookupKeys/productName, native bundleIdentifier/package/slug/scheme (`com.progix.guerienergies`), DB/seed data + domains (aura.fr/aura.io → guerienergies equivalents), code comments, READMEs, test fixtures. Reseeded the DB to drop old-brand rows. Left untouched: the Supabase Storage bucket path (`aura-public`, a real live bucket — renaming breaks every seeded image).

## UI / Spacing
- [x] **Review spacing across the app** — audited web (all `.card`/`.card-pad` usages, all 6 modal components, ad-hoc inline-styled boxes) and all 37 mobile screens (dispatched via subagents in batches of ~4). Result: no violations found — both apps already pad every box that wraps text correctly (web via the `.card-pad`/baked-in-padding CSS system, mobile via the `Card` component defaulting to `padded={true}` + consistent hand-rolled padding elsewhere). Zero files needed changes. Found and fixed unrelated bugs surfaced during the audit: a leftover ALL-CAPS "AURA" wordmark in ~20 client-account pages the earlier rename regex missed, and a broken deep-link scheme (`aura://` vs the renamed `guerienergies` app scheme) in 4 Stripe-related files that would have broken payment-redirect-back-to-app.

## Practitioner Registration — Documents
- [x] **Update required documents when a practitioner registers.** Now: 1) SIRET (new required text field, validated 14 digits, server + mobile form + admin display), 2) pièce d'identité, 3) diplôme (renamed from "certification"), 4) charte de l'entreprise. Backend, mobile onboarding, admin verification queue, and marketing copy (~10 pages) all updated; e2e/unit tests updated; live DB migrated non-destructively (siret backfilled for all 37 existing praticiens, no data loss).
- [x] **Remove** the insurance (assurance) and proof of address (justificatif de domicile) documents from the registration flow. Removed everywhere (code + live DB docs), including the marketing pages that claimed insurance was verified.

## Forum — "Les échanges"
- [x] **Add "Les échanges" (the forum) to mobile.** Screens already existed but were scoped wrong: the endpoint they called (`/echanges/client/echanges`) only ever returned the *current user's own* posts, and — since échanges only ever had a `client_id` — silently 403'd for practitioner accounts entirely. Rebuilt the scope to match the actual intent:
  - Added `praticien_id` to `echanges` (nullable, alongside `client_id`, live DB migrated non-destructively — 32 existing rows untouched) so practitioners can author échanges too, not just clients.
  - New `GET/POST/PUT/PATCH/DELETE /echanges/praticien/echanges` (own posts, mirrors the client routes) and a new public `GET /echanges/community` + `/echanges/community/:id` (every visible échange from every client *and* practitioner, with `auteur_nom`/`auteur_type`/`est_a_moi` computed server-side).
  - Mobile: client's "Échanges" (renamed from "Mes échanges") now browses the full community board; practitioner's dashboard gets both a fixed "Mes échanges" (own posts only, was silently broken before) and a new "Tous les échanges" entry for the same community board. Edit/delete only shown on your own posts (`est_a_moi`), regardless of which list you're viewing from.
  - Admin web (list + detail) updated to show the correct author name whether client- or practitioner-authored.
  - Added e2e coverage for the new routes; full suite green (289 e2e + 55 unit server, 73 mobile).

## Practitioner Messaging
- [x] **Add practitioner-to-practitioner messaging** — a separate/additional messaging system in the app so practitioners can communicate with each other. New `peer_conversations`/`peer_messages` tables + `/praticien/peer-conversations` API (both sides guarded by `PraticienGuard`, canonical pair ordering, server-computed `from_me` since both participants share the same role). Mobile: dashboard → "Messagerie praticiens", reuses existing chat UI, directory picker to start new conversations with any practitioner. Admin moderation parity (list/show/flag/unflag). Live DB migrated additively. e2e coverage added; full suite green. Committed on `tasks` branch (not merged).

## Litiges / Signalements
- [x] **Remove "Litiges" (disputes)** from the admin web side (keep "Signalements" / reports). Deleted `admin/litiges` page, removed the sidebar nav entry, and cleaned up a dead `resolveDispute` modal registry entry that only that page used. Backend `Dispute` entity/API left untouched (still real data, just no longer surfaced in admin nav).
- [x] **Add the ability to file a report (signalement) in the app** — on both the practitioner side and the client side. Client side already existed (`praticien/[id].tsx` → "Signaler"). Practitioner side was missing entirely — the `Signalement` target was hardcoded to `praticien_id` (schema `NOT NULL`), so there was no way to report a client. Made the target polymorphic (mirrors the SIRET/échanges pattern): `praticien_id` now nullable, added nullable `client_id`, exactly one enforced at the service layer + a `chk_sig_target` DB check. New `report-client.tsx` screen, reachable via a flag icon on each booking in the practitioner dashboard. Admin list/detail shows whichever target (client or practitioner) is set. Live DB migrated additively (22 existing rows untouched). e2e coverage added.

## Promo Codes
- [x] **Check if promo codes are implemented in the app.** Backend was already fully ready and unused: `POST /promotions/validate` + `RendezVousService.create()` already accepted an optional `promotion_code` and computed the discount (percentage or fixed) — even the mobile repo layer's `CreateRendezVousParams` already had the field. The only missing piece was the UI. Added a "Code promo" field to `booking/payment.tsx`: validates via the existing endpoint, shows the discount line + adjusted total in the recap, passes the code through at booking creation. No server changes needed.

## Client Reviews (Avis clients)
- [ ] **Check if client reviews are implemented on mobile.** If not, implement them.

## Blog
- [ ] **Add a "Blog" section to mobile.** All admin blog articles must appear on mobile.

## Cercles (Circles)
- [ ] **Practitioners can create a "Cercle" (a group, paid or free) on mobile**, and users can subscribe/register to it.

## Events (Évènements)
- [ ] **Same as Cercles for Events** — practitioners can create events (paid or free) on mobile, and users can register to them.
