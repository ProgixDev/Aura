# Aura — Website Test Checklist

Simple step-by-step for the **website** (the `web/` app, opens in a browser).
Do each thing, check the box if it works like the description says.

> The website is **for clients only** (people looking for a practitioner) + a separate
> **admin** panel for the Aura team. There is **no practitioner sign-up on the website** —
> those buttons send you to a contact page instead. Practitioner sign-up lives in the mobile app.

---

## Before you start

- [ ] Backend is running (otherwise lists are empty and login won't work).
- [ ] Open the site in your browser (usually `http://localhost:3000` after `npm run dev` in the `web` folder).
- [ ] The page loads with no error, top menu ("Praticiens, Disciplines, Événements…") shows.
- [ ] Try it on a phone-size window too (responsive) — see the last section.

---

## Step 1 — Home page

**What you see:** big purple hero "Tous les guérisseurs, un seul lieu de confiance", some numbers, then sections (values, disciplines, featured practitioners, how it works, testimonial, events).

- [ ] Hero numbers show (verified practitioners / sessions / satisfaction).
- [ ] "Trouver un praticien" button → practitioners list.
- [ ] "Je suis praticien" button → the "become a practitioner" page.
- [ ] Discipline tiles → open that discipline's page.
- [ ] Featured practitioner cards → open that practitioner.
- [ ] Event cards → open that event.
- [ ] "Créer mon compte" (bottom) → opens the sign-up popup.

---

## Step 2 — Top menu / header

**What you see:** logo, menu links, and two buttons on the right: **Connexion** and **Commencer**.

- [ ] Menu links work: Praticiens, Disciplines, Événements, Comment ça marche, Devenir praticien.
- [ ] The link for the page you're on is highlighted.
- [ ] **"Connexion"** button → opens a login popup.
- [ ] **"Commencer"** button → opens a sign-up popup.

---

## Step 3 — Create an account (sign up)

There are **two ways** to sign up: the popup (from "Commencer") and the full page (`/inscription`). Both do the same thing.

**What you see:** two choices at the top — **"Je cherche un praticien"** (client) and **"Je suis praticien"**.

### A) Client sign-up ("Je cherche un praticien")
- [ ] Fields: Prénom, Nom, Email, Ville, Mot de passe, Confirmer le mot de passe.
- [ ] The "I accept the terms" checkbox must be ticked or the button stays disabled.
- [ ] Leave a field wrong/empty → red error under that field after submitting.
- [ ] Password must be at least 8 characters.
- [ ] Fill everything right → tap "Créer mon compte".
  - **Expect:** a little success message ("Compte créé") and you land on **your account** (`/compte`).
- [ ] Try the SAME email again → error message (email already used).

### B) Practitioner sign-up ("Je suis praticien")
- [ ] Selecting it does NOT show a form. Instead it shows a note + a "Devenir praticien" button.
- [ ] That button → the practitioner info page (which then sends you to **Contact**, not a real sign-up). This is expected — no practitioner account is created on the website.

- [ ] "Déjà inscrit(e) ? Se connecter" link → switches to login.

---

## Step 4 — Log in

Same two ways: the popup ("Connexion") or the full page (`/connexion`).

- [ ] Wrong email/password → red error message.
- [ ] Correct → success message ("Bienvenue") and you land on **your account**.
- [ ] "Rester connecté(e)" checkbox is there.
- [ ] "Oublié ?" / "Mot de passe oublié ?" → forgot-password:
  - [ ] Enter your email → submit → message that a reset link was sent.
- [ ] "Pas encore de compte ? Créer un compte" link → switches to sign-up.

---

## Step 5 — Browse practitioners (Praticiens page)

**What you see:** title "Trouver un praticien", a count, a sticky search bar with filters, then a list of cards.

- [ ] Type in the search box (name / city / discipline) → the list narrows; the count updates.
- [ ] "Toutes modalités" dropdown → pick Présentiel or Visio → list filters.
- [ ] Sort dropdown → "Prix croissant" reorders cheapest first; "Mieux notés" reorders by rating.
- [ ] Discipline chips → tap one to filter; tap again to clear.
- [ ] "Réinitialiser" appears when a filter is on → clears everything.
- [ ] No matches → "Aucun praticien ne correspond" message.
- [ ] Tap a card → opens that practitioner's profile.

---

## Step 6 — Practitioner profile

**What you see:** photo, name, badges, rating, price, and buttons; plus tabs.

- [ ] **Favorite/heart** button → adds/removes from favorites (must be logged in).
- [ ] Tabs:
  - **À propos** → bio, "sa démarche", years of experience / sessions, image gallery (click an image → it opens bigger).
  - **Avis (n)** → average rating + reviews list, and a "Laisser un avis" button (opens a review popup; submitting posts it and it appears in the list).
  - **Échanges** → shows what they offer to trade, with a note about contacting via messages.
- [ ] **Contacter / messagerie** → opens a conversation (must be logged in).
- [ ] **Réserver** button → starts the booking (Step 7).

---

## Step 7 — Booking (4-step wizard)

**What you see:** a progress bar with 4 steps: **Créneau → Modalité → Paiement → Confirmation**. A summary box stays on the right.

### Step 1 — Créneau (day + time)
- [ ] Days show as tiles; while loading you see "Chargement des disponibilités…".
- [ ] No availability → "Aucun créneau disponible pour le moment."
- [ ] Pick a day → its time slots appear. Booked times are crossed out and not clickable.
- [ ] "Continuer" is disabled until you pick a day AND a time.

### Step 2 — Modalité (in person or online)
- [ ] Two choices: "En présentiel" / "En visio". One might be marked "Non proposé" (greyed) depending on the practitioner.
- [ ] Pick one → "Continuer".
- [ ] "Retour" goes back to step 1.

### Step 3 — Récapitulatif & paiement
- [ ] Summary shows practitioner, discipline, date, mode, duration.
- [ ] **Promo code:** type a code + "Appliquer".
  - Valid code → green "code appliqué", the total drops.
  - Invalid code → red error message.
- [ ] "Continuer vers le paiement" → the Stripe card fields appear.
- [ ] Enter test card `4242 4242 4242 4242`, any future date, any CVC → "Payer".
  - **Expect:** "Paiement confirmé" → moves to step 4.
  - Wrong/declined card → red error, stays here.
- [ ] "Retour" from the payment step cancels the pending booking (so you don't get a duplicate) and returns to the summary.

### Step 4 — Confirmation
- [ ] Green check, "Votre séance est réservée".
- [ ] Details card: date, mode, total paid, reference "RDV-...".
- [ ] "Voir mes réservations" → your bookings list.
- [ ] "Retour à l'accueil" → home.

---

## Step 8 — My account (Compte)

After login you're in `/compte`. Left/side menu leads to the sections below.

- [ ] **Overview:** "Bonjour {your name}", your next upcoming session, stats (sessions / favorites / reviews), recent activity, shortcuts.
- [ ] **Mes réservations** — list of your bookings with their status (En attente / Confirmée / Terminée / Annulée). Open one for details; test cancel/reschedule if offered.
- [ ] **Mes messages** — conversations list → open a chat, send a message.
- [ ] **Mes favoris** — practitioners you hearted; removing updates the list.
- [ ] **Mes avis** — reviews you left.
- [ ] **Mes échanges** — trade requests.
- [ ] **Paiements** — payment history.
- [ ] **Remboursements** — refund requests (try requesting one).
- [ ] **Paramètres** — profile info + notification toggles; changes save.
- [ ] Numbers in the stats should match what you actually did.

---

## Step 9 — Public info pages (quick check they open + look right)

- [ ] Disciplines list + a single discipline page
- [ ] Événements list + a single event page
- [ ] Comment ça marche
- [ ] Devenir praticien (+ its buttons go to Contact / Tarifs)
- [ ] Tarifs (pricing)
- [ ] À propos, Manifeste, Témoignages, Presse, Carrières
- [ ] FAQ, Aide, Contact
- [ ] Confiance & sécurité, Confidentialité, CGU, Mentions légales, Cookies
- [ ] Application (download the app page)
- [ ] A made-up URL → shows a "not found" page, not a crash.

---

## Step 10 — Admin panel (Aura team only)

**Separate login** at `/admin/connexion` (different from the normal user login).

- [ ] Go to `/admin` while logged out → sent to the admin login.
- [ ] Wrong credentials → error message.
- [ ] Correct admin credentials → lands on the admin dashboard.
- [ ] Sidebar sections open: Praticiens (+ verification), Clients, Réservations, Paiements, Remboursements, Avis, Signalements, Échanges, Cercles, Événements, Contenu, Emails, Notifications, Promotions, Abonnements, Analytique, Équipe, Rôles, Audit, Paramètres, Support, Litiges.
- [ ] Practitioner verification: open a pending practitioner, review documents, approve/reject.
- [ ] Each list opens; opening a single item shows its detail.

---

## Final checks (anywhere on the site)

- [ ] **Logged-out:** trying to open `/compte` sends you to login (you can't see account pages without logging in).
- [ ] **Success/error popups (toasts)** appear for actions (login, booking, review, promo…).
- [ ] **Stay logged in:** refresh the page → still logged in.
- [ ] **Log out** → back to logged-out state; account pages no longer open.
- [ ] **Responsive:** shrink the window / open on a phone → menu and layout adapt, nothing overflows or breaks.
- [ ] Works the same in Chrome and one other browser (Firefox/Safari/Edge).
- [ ] No blank/broken pages; everything is in French with no placeholder text.

---

### My test logins (fill in)

| | Email | Password |
|---|---|---|
| Client account | | |
| Admin account | | |

Stripe test card: `4242 4242 4242 4242` · any future date · any CVC

### Problems I found
-
