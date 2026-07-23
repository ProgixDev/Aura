# 📋 Daily Report — Aura

**Date :** 22/07/2026
**Développeur :** Islem Deneche

---

## ✅ Travail effectué

**Commits :**
- `bf07e91` — Ajout du rapport journalier + comparatif tarifaire SMS, mise à jour checklist test web + styles page login admin
- `c57aa83` — Mise à jour du build number et version code de l'application
- `a21808b` — Renommage "Aura" → "GuériEnergies" (titres, sous-titres, références) — 1ère passe
- `8bb9596` — Patch STPPaymentStatus (correction de type enum) dans StripeSwiftInterop.h
- `9ac7684` — Renommage "Aura" → "GuériEnergies" (titres, URLs, métadonnées) — 2ème passe
- `173c8fd` — Correction du nom de l'app "GuériEnergies" dans app.json + plugin nom d'affichage Android
- `0313eb0` — Ajout du numéro SIRET à l'inscription praticien
- `00fcd29` — Refonte des échanges (communauté praticiens/clients)
- `a34fb02` — Ajout de la messagerie praticien-à-praticien
- `af1bbce` — Suppression de la page admin Litiges + ajout du signalement côté praticien
- `6f4d8a2` — Ajout du code promo à l'étape de paiement mobile
- `243d869` — Vérification : avis clients déjà implémentés sur mobile
- `502ec7f` — Ajout de la section Blog sur mobile (client + praticien)
- `1e79702` — Création de Cercles par les praticiens (payant/gratuit) + inscription client
- `c26f4b1` — Création d'Événements par les praticiens (payant/gratuit) sur mobile

**Fonctionnalités livrées (modifications demandées par le client) :**
- Renommage complet de l'application "Aura" → "GuériEnergies" (web, mobile, back-office, mentions légales, splash screen, identifiants natifs)
- Inscription praticien : ajout du SIRET, remplacement des documents assurance/domicile par diplôme + charte
- Forum « Les échanges » : accessible aux praticiens en plus des clients (bug de portée corrigé, vue communauté ajoutée)
- Messagerie praticien-à-praticien (système distinct de la messagerie client-praticien existante)
- Suppression de la section Litiges du back-office admin (conservation des Signalements)
- Signalement utilisable côté praticien (signaler un client) en plus du côté client
- Code promo intégré à l'étape de paiement mobile (backend déjà prêt, UI manquante)
- Vérification avis clients sur mobile : déjà fonctionnel, aucune modification nécessaire
- Section Blog/Journal rendue accessible sur mobile (client + praticien)
- Cercles : création par les praticiens (payant/gratuit) + inscription des utilisateurs
- Événements : création par les praticiens (payant/gratuit) sur mobile

**Tests :**
- Suite de tests serveur (e2e + unitaires) et mobile passée après chaque livraison
- Ajout de nouveaux tests e2e pour chaque fonctionnalité livrée (messagerie praticien, signalement, cercles, événements)

**Réunions / Coordination :**
- Point avec Houssem sur le VPS pour le cheminement (déploiement) — suivi de la discussion du 21/07
- Coordination avec Arslen pour le build iOS de l'application
- Rédaction d'un rapport complet de comparaison tarifaire SMS : Africa's Talking vs Twilio (Twilio nettement plus cher qu'AT)

---

## 🔄 En cours

**Tâche actuelle :**
> Toutes les modifications demandées par le client suite à la démo ont été terminées.

**Blocage sur cette tâche :**
> Aucun

---

## 🚧 Blocages

- *(Aucun)*

---

## 💬 Message pour le client

> Journée consacrée à l'ensemble des modifications demandées suite à la démo : renommage complet vers « GuériEnergies », refonte de l'inscription praticien (SIRET, documents), ouverture du forum d'échanges et ajout d'une messagerie dédiée entre praticiens, nettoyage de la section Litiges côté admin avec ajout du signalement côté praticien, intégration du code promo au paiement mobile, mise en visibilité du Blog sur mobile, et ajout de la création de Cercles et d'Événements par les praticiens (payant ou gratuit) avec inscription des utilisateurs. L'ensemble a été testé (tests automatisés + vérification manuelle). En parallèle : comparatif tarifaire SMS (Africa's Talking vs Twilio) livré, coordination avec Houssem sur le VPS de déploiement et avec Arslen sur le build iOS. Aucun blocage actuellement.

---

## 📊 Suivi

| Indicateur | Valeur |
|---|---|
| ⏱️ Heures travaillées | `8` h |
| 🖥️ Avancement Frontend | `100` % |
| ⚙️ Avancement Backend | `100` % |
