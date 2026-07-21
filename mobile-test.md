# Aura — App Test Checklist

Simple step-by-step. Do each thing, check the box if it works like the description says.
Check `[ ]` → `[x]` for every part you tested.

---

## Before you start

- [ ] App opens on your phone (or simulator) with no error screen.
- [ ] Backend is running (otherwise lists show up empty and login won't work).

---

## Step 1 — Splash screen (the very first thing)

**What you see:** big "Aura" logo on a purple background that gently glows/breathes.

- [x] Logo shows up.
- [x] After ~1.5 seconds (or if you tap the screen) it moves on by itself.
- [x] **If it's your first time:** it goes to the welcome slides.
- [x] **If you logged in before:** it goes straight into the app (home).

---

## Step 2 — Welcome slides (first time only)

**What you see:** 3 full-screen photos with text about Aura.

- [x] Swipe left/right → moves between the 3 slides. The little dots at the bottom follow.
- [x] "Suivant" button moves forward. On the last slide it says "Commencer".
- [x] "Passer" (skip) jumps ahead.
- [x] Reaching the end → goes to the "who are you" screen.

---

## Step 3 — Choose who you are

**What you see:** two cards:
- **"Je cherche un soin"** = normal user (client) looking for a practitioner.
- **"Je suis praticien"** = a practitioner (healer) who offers sessions.

- [x] Tap a card → it gets a purple border (selected).
- [x] "Continuer" → goes to the account screen.
- [x] "Déjà membre ? Se connecter" → goes straight to login.

---

## Step 4 — Create an account (sign up)

At the top there's a switch: **"Je cherche un soin"** vs **"Je suis praticien"**. Pick one.

### A) Create a CLIENT account ("Je cherche un soin")

**What you see:** boxes for Prénom (first name), Nom (last name), Ville (city), Email, Mot de passe (password).

Test the errors first:
- [x] Type a fake email like `abc` → error under it "Email invalide".
- [x] Type a short password (less than 8 letters) → error "8 caractères minimum".
- [x] Leave first name / last name / city empty → popup "Champs requis".

Then create it for real:
- [x] Fill everything correctly, tap "Créer mon compte".
- [x] Button shows "Un instant…" then moves to the **quiz** (Step 5).
- [x] Try the SAME email again later → popup "Inscription impossible" (email already used).

### B) Create a PRACTITIONER account ("Je suis praticien")

- [x] Fill name / city / email / password, tap "Créer mon compte".
- [x] It does NOT finish yet — it goes to a **practitioner details form** (Step 6). This is normal; the account only gets created after uploading documents.

---

## Step 5 — Quiz (client only, right after sign up)

**What you see:** 4 questions, a progress bar filling up, a little "Confidentiel" tag at top.

- [x] Question 1: "What are you looking for?" — pick one answer.
- [x] Question 2: practices (Reiki, Magnétisme…) — grid of choices.
- [x] Question 3: in person vs online.
- [x] Question 4: your city (already filled with "Annecy").
- [x] "Continuer" moves forward each time; your choice stays selected if you go back.
- [x] Last button says "Voir mes praticiens" → drops you into the app (home).

---

## Step 6 — Practitioner details (practitioner sign up only)

**Form 1 — your practice:**
- [x] Phone, Level, Specialty, Session mode, Price (€), Years of experience, Bio.
- [x] Bio shorter than 50 letters → error "50 caractères minimum".
- [x] Price or experience with letters → error.
- [x] Fill it right → "Continuer" → documents screen.

**Form 2 — documents (5 required):**
- [x] ID, Certification, Insurance, Proof of address, Signed charter.
- [x] Tap a row → pick a file (photo or PDF). It shows a green check + file name.
- [x] "Créer mon compte" stays greyed out until ALL 5 are added.
- [x] Add all 5 → tap it → account created (status = pending review) → enters the app.

---

## Step 7 — Log in (for an account you already made)

**What you see:** "Bon retour", just Email + password.

- [x] Pick the right switch (client vs practitioner) matching your account.
- [x] Wrong password → popup "Connexion impossible".
- [x] Right password → goes into the app; your first name shows on the home screen.
- [x] "Créer un compte" link flips back to sign up.

---

## Step 8 — Home screen (Accueil)

**What you see:** "Bonjour {your name}", today's date, and several sections.

- [x] Your name shows in the greeting.
- [x] A big featured event card (if there's an upcoming event) → tap opens the event.
- [x] "Recommandés pour vous" — row of practitioners you can scroll → tap one opens their profile.
- [x] "Explorer par pratique" — grid of practices → tap opens that practice page.
- [x] "À vivre ensemble" events row → "Tous les événements" opens the Events tab.
- [x] Founder card + "Reiki" article link both open something (not dead).

---

## Step 9 — The 5 tabs at the bottom

**What you see:** Accueil · Recherche · Messages · Événements · Profil.

- [x] Tapping each one switches the screen.
- [x] The one you're on is dark; the others are grey.

---

## Step 10 — Search (Recherche)

- [x] Type a name / city / practice → the list filters as you type; the "X PRATICIENS TROUVÉS" number changes.
- [x] Tap "Visio" chip → only online practitioners show.
- [x] Tap a shortcut chip (Reiki, Magnétisme…) → fills the search; tap again clears it.
- [x] Tap any practitioner → opens their profile.

---

## Step 11 — Practitioner profile

**What you see:** big photo, name, badges, specialties, rating, price, and two buttons at the bottom.

- [x] Tap the **heart** → turns purple (added to favorites); tap again → removes it.
- [x] Tap the **flag** → report screen opens.
- [x] Tap **share** → phone's share menu opens.
- [x] Switch tabs "À propos" / "Avis" → bio & photos vs reviews list.
- [x] "Laisser un avis" → review screen.
- [x] **"Contacter"** button → opens a chat with them.
- [x] **"Réserver"** button → starts the booking.

---

## Step 12 — Booking a session (the important flow)

**Pick a time:**
- [x] Days scroll across the top; fully-booked days look faded.
- [x] Tap an available time slot → the bottom shows "{day} · {time}".
- [x] "Continuer" is greyed out until you pick a slot → then it works.

**Payment:**
- [x] Choose "En présentiel" or "En visio".
- [x] See the total price and a "Paiement sécurisé via Stripe" note.
- [x] Tap "Régler … en toute sécurité" → the Stripe payment popup opens.
- [x] Use test card `4242 4242 4242 4242`, any future date, any CVC → payment succeeds.
- [x] If you close the popup → no error, you can try again (no double booking).

**Confirmation:**
- [x] "Votre séance est réservée." with a glowing circle.
- [x] Details card: practitioner, practice, date/time, mode, total paid, reference "RDV-...".
- [x] "Envoyer un message" → opens the chat.
- [x] "Retour à l'accueil" → back to home.

---

## Step 13 — Messages

- [x] List of your conversations (or "Aucune conversation" if none yet).
- [x] Search box filters by name; "Tous" / "Non lus" chips filter.
- [x] Unread ones are bold with a purple dot.
- [x] Tap one → opens the chat.

---

## Step 14 — Chat

- [x] Header shows who you're talking to.
- [x] Type a message + send → your bubble appears right away.
- [x] New messages from them appear on their own after a few seconds (no refresh needed).
- [x] If sending fails → your bubble disappears, your text comes back, and an error shows.
- [x] Back button returns to Messages.

---

## Step 15 — Events (Événements)

- [x] Filter chips (À venir / Retraites / Cercles / Formations / Ateliers) change the list.
- [x] Tap an event → opens its details.

---

## Step 16 — Profile (Profil)

- [x] Your name + avatar at top.
- [x] Three numbers: sessions, practitioners, favorites — should match what you actually did.
- [x] "Mes praticiens favoris" → your hearted practitioners.
- [x] "Mes échanges" → exchanges list.
- [x] Notifications / payment links open their screens.
- [x] **"Se déconnecter"** → logs you out → back to the welcome screen. Reopening the app now asks you to log in again.

---

## Step 17 — Other screens to click through (quick check, just that they open)

- [x] Favorites list
- [x] Leave a review
- [x] Report
- [ ] Exchanges (list / open / create)
- [ ] Cercles (list / detail)
- [ ] Blog (list / article)
- [ ] Practice page (e.g. Reiki)
- [ ] Founder page
- [ ] Notification settings
- [ ] Payment history + refund request
- [ ] Subscription page (1 month free then 9,90€/month)

---

## Step 18 — Practitioner-only screens (if logged in as a practitioner)

- [ ] Dashboard opens with their info.
- [ ] Practitioner messages / chat work from their side.

---

## Final checks (anywhere in the app)

- [ ] Close the app while logged in, reopen → still logged in, lands on home.
- [ ] Back button works on every screen.
- [ ] No red error screens anywhere.
- [ ] Everything is in French, no fake/placeholder text.

---

### My test logins (fill in)

| | Email | Password |
|---|---|---|
| Client account | | |
| Practitioner account | | |

Stripe test card: `4242 4242 4242 4242` · any future date · any CVC

### Problems I found
-
