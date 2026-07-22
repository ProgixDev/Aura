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
- [ ] **Add "Les échanges" (the forum) to mobile.** It exists on the admin side but is missing on mobile — surface it somewhere in the app.

## Practitioner Messaging
- [ ] **Add practitioner-to-practitioner messaging** — a separate/additional messaging system in the app so practitioners can communicate with each other.

## Litiges / Signalements
- [ ] **Remove "Litiges" (disputes)** from the admin web side (keep "Signalements" / reports).
- [ ] **Add the ability to file a report (signalement) in the app** — on both the practitioner side and the client side.

## Promo Codes
- [ ] **Check if promo codes are implemented in the app.** Promo codes exist in the back office — if not implemented in the app, add promo code entry at the payment step.

## Client Reviews (Avis clients)
- [ ] **Check if client reviews are implemented on mobile.** If not, implement them.

## Blog
- [ ] **Add a "Blog" section to mobile.** All admin blog articles must appear on mobile.

## Cercles (Circles)
- [ ] **Practitioners can create a "Cercle" (a group, paid or free) on mobile**, and users can subscribe/register to it.

## Events (Évènements)
- [ ] **Same as Cercles for Events** — practitioners can create events (paid or free) on mobile, and users can register to them.
