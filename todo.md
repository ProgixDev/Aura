# TODO — Client Feedback

Tasks from client feedback. Grouped by area.

## Branding
- [x] **Change the title to "GuériEnergies"** — updated app title everywhere it appears (web + mobile), including legal entity name in CGU/mentions légales/confidentialité and the mobile splash wordmark (redesigned for the longer name). Domains (aura.fr/aura.io), Stripe lookupKeys, DB/seed data, and code comments intentionally left untouched — those need real infra/legal changes outside code.

## UI / Spacing
- [ ] **Review spacing across the app** — no text touching the edge of a box. Add proper padding to all containers/boxes so content is never flush against the border.

## Practitioner Registration — Documents
- [ ] **Update required documents when a practitioner registers.** Store:
  1. SIRET number
  2. ID document (pièce d'identité)
  3. Diploma (diplôme)
  4. Company charter (charte de l'entreprise)
- [ ] **Remove** the insurance (assurance) and proof of address (justificatif de domicile) documents from the registration flow.

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
