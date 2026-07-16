# Seed & Populate Aura — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Aura web app look like a live product used by many people — seed the database with hundreds of realistic, interlinked rows, build the few missing backend endpoints, and rewire every page still on hardcoded mock data to the real API.

**Architecture:** The frontend-wiring program already made *most* pages API-backed; they only look empty because the DB is empty. So the bulk of the win is a comprehensive Node seed script (`server/scripts/seed.ts`) using the existing TypeORM entities. Three admin surfaces have no backend at all (support tickets, admin rendez-vous listing, practitioner availability) — we build those modules. A handful of pages still read mock arrays despite having endpoints — we rewire them and delete the dead mock. Practitioner cards gain real star ratings via an avis aggregate on the practitioner API. No practitioner photos (gradient-initials avatars are intentional); no new image infrastructure.

**Tech Stack:** NestJS 11 + TypeORM 0.3 (Postgres/Supabase) backend; Next.js (JSX) frontend; bcryptjs for password hashing; schema managed as `server/scripts/schema.sql` (run in Supabase SQL Editor), seed as a programmatic Node script.

**Demo credentials produced by the seed:** admin `admin@admin.com` / `admin123`; every seeded client & practitioner logs in with their seeded email + `aura1234`.

---

## Conventions all tasks must follow

- **Backend enum vocab is authoritative** (the API reads/writes these; the old mock English values are wrong):
  - praticien `statut_verification`: `en_attente | en_cours | valide | rejete`
  - praticien_document `type`: `piece_identite | certification | assurance | domicile | charte`; `statut`: `en_attente | valide | rejete`
  - rendez_vous `statut`: `en_attente | confirme | annule | termine`; `mode`: `présentiel | visio` (accented)
  - paiement `statut`: `paid | en_attente | rembourse`; `moyen_paiement`: `card | Carte | PayPal | Apple Pay`
  - remboursement `statut`: `en_attente | en_cours | approuve | refuse | completed`
  - dispute `statut`: `ouvert | resolu`; `priorite`: `haute | normale`
  - echange `statut`: `en_attente | lu | en_cours | traite | archive | signale`; `priorite`: `basse | moyenne | haute | urgente`; `type`: `proposition | demande | information | autre`
  - signalement `statut`: `pending | resolved | rejected`; `priorite`: `basse | normale | haute | urgente`; `type`: `overclaim | behavior | fake | pros | other`
  - avis `statut`: `en_attente | publié | rejeté`; `note`: integer 1–5
  - article `status`: `brouillon | en_revue | publié | archivé`; `tonalite`: `violet | sky | sage | gold`
  - event `status`: `brouillon | publié | archivé`; `type`: `Retraite | Formation | Atelier | Cercle | Sortie | Événement`
  - subscription `plan`: `essentiel | pro | premium`; `statut`: `active | past_due | canceled | trialing`
  - audit_log `category`: `moderation | verification | finance | security | support | system`
  - email_template `statut`: `actif | inactif | archive`
  - admin role: `admin | moderateur | support | comptabilite`
  - support_ticket (NEW) `statut`: `ouvert | en_cours | resolu | ferme`; `priorite`: `basse | normale | haute`
- **Login pairing:** a logged-in client/praticien needs a `users` row (is_admin=false) AND a `clients`/`praticiens` row with the **same email**.
- **Singletons:** exactly one `platform_settings` row `id=1` (commission_rate 0.15); one `subscriptions` row per praticien; one `notification_preferences` row per client.
- **Canonical disciplines (12), exact — must match `web/lib/data/disciplines.js`:**

  | nom | slug | tonalite | glyphe |
  |---|---|---|---|
  | Magnétisme | magnetisme | sky | ✦ |
  | Reiki | reiki | violet | ❍ |
  | Chamanisme | chamanisme | sage | ◊ |
  | Soin énergétique | soin-energetique | sky | ❀ |
  | Hypnose | hypnose | violet | ◐ |
  | Méditation | meditation | sage | ☉ |
  | Clairvoyance | clairvoyance | gold | ✺ |
  | Bain sonore | bain-sonore | sky | ◯ |
  | Massage thérapeutique | massage | sage | ⌇ |
  | Coaching de vie | coaching | violet | ✧ |
  | Retraites | retraites | gold | ▲ |
  | Purification | purification | sky | ❖ |

---

## Phase 1 — Backend: missing endpoints + practitioner ratings

Each task adds a real endpoint so a currently-mock page can be wired in Phase 3, or enriches an existing response. All new modules mirror the existing **echanges** module shape (`server/src/echanges/*`) — controller returns the `success(...)` envelope from `server/src/common/envelope.ts`, lists use `parsePagination`/`paginateQb` from `server/src/common/pagination.ts`, admin routes are guarded by `AdminGuard` + capability decorators like the existing controllers.

### Task 1.1: `support_tickets` table + entity

**Files:**
- Modify: `server/scripts/schema.sql` (add table before `platform_settings`)
- Create: `server/src/database/entities/support-ticket.entity.ts`
- Modify: `server/test/utils/create-test-app.ts` (add to `ALL_ENTITIES`)

- [ ] **Step 1: Add the table to `schema.sql`** (keep the drop section in sync — add `drop table if exists support_tickets cascade;` near the top, and this CREATE in dependency order after `users`/`clients`):

```sql
create table support_tickets (
  id integer generated always as identity primary key,
  requester_name varchar(255) not null,
  requester_email varchar(255) not null,
  client_id integer,
  sujet varchar(255) not null,
  categorie varchar(50) not null default 'autre',
  priorite varchar(20) not null default 'normale',
  statut varchar(20) not null default 'ouvert',
  message text not null,
  messages jsonb,
  assigned_to integer,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint fk_ticket_client foreign key (client_id) references clients(id) on delete set null,
  constraint fk_ticket_assigned foreign key (assigned_to) references users(id) on delete set null
);
create index idx_support_tickets_statut on support_tickets (statut);
```

- [ ] **Step 2: Create the entity** `server/src/database/entities/support-ticket.entity.ts` (mirror `echange.entity.ts` — `jsonTransformer` from `../../common/transformers` for the `messages` thread):

```ts
import {
  Column, CreateDateColumn, Entity, JoinColumn, ManyToOne,
  PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm';
import { jsonTransformer } from '../../common/transformers';
import { Client } from './client.entity';
import { User } from './user.entity';

export interface TicketReply { author: 'client' | 'support'; text: string; at: string; }

@Entity('support_tickets')
export class SupportTicket {
  @PrimaryGeneratedColumn() id: number;
  @Column() requester_name: string;
  @Column() requester_email: string;
  @Column({ type: 'int', nullable: true }) client_id: number | null;
  @Column() sujet: string;
  @Column({ type: 'varchar', length: 50, default: 'autre' }) categorie: string;
  @Column({ type: 'varchar', length: 20, default: 'normale' }) priorite: string;
  @Column({ type: 'varchar', length: 20, default: 'ouvert' }) statut: string;
  @Column({ type: 'text' }) message: string;
  @Column({ type: 'text', nullable: true, transformer: jsonTransformer }) messages: TicketReply[] | null;
  @Column({ type: 'int', nullable: true }) assigned_to: number | null;
  @CreateDateColumn({ name: 'created_at' }) created_at: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updated_at: Date;

  @ManyToOne(() => Client, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'client_id' }) client: Client | null;
  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'assigned_to' }) assignedTo: User | null;
}
```

- [ ] **Step 3: Register in the e2e entity list** — add `SupportTicket` import + array entry in `server/test/utils/create-test-app.ts` `ALL_ENTITIES`.
- [ ] **Step 4: Build** — `cd server && npm run build`. Expected: PASS.
- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat(server): add support_tickets table + entity"`

### Task 1.2: Support-tickets module (admin CRUD)

**Files:**
- Create: `server/src/support/support.module.ts`, `support.controller.ts`, `support.service.ts`, `dto/create-ticket.dto.ts`, `dto/update-ticket.dto.ts`, `dto/reply-ticket.dto.ts`
- Test: `server/test/support.e2e-spec.ts`
- Modify: `server/src/app.module.ts` (import `SupportModule`)

**Template to copy:** `server/src/echanges/` (same controller/service/module/DTO layout, `success()` envelope, `parsePagination`/`paginateQb`, `AdminGuard`).

- [ ] **Step 1: Write the failing e2e test** `server/test/support.e2e-spec.ts` covering: `GET /api/admin/support` requires admin (401/403), lists seeded tickets with pagination + `statistiques`, `?statut`/`?priorite` filters work, `GET /api/admin/support/:id`, `POST /api/admin/support/:id/reply` appends to `messages` and can set `statut`, `POST /api/admin/support/:id/resolve` sets `statut='resolu'`. Build the test app with `createTestApp({ imports: [SupportModule] })` and seed rows via the `DataSource`.
- [ ] **Step 2: Run it, verify it fails** — `cd server && npm run test:e2e -- support` → FAIL (module missing).
- [ ] **Step 3: Implement DTOs, service, controller, module.** Endpoints (all under controller base `admin/support`, AdminGuard):
  - `GET /` → paginated list, filters `?statut`, `?priorite`, `?search` (requester_name/email/sujet), plus `statistiques: { total, ouvert, en_cours, resolu }`.
  - `GET /:id` → single ticket.
  - `POST /` → create (fields: requester_name, requester_email, sujet, categorie, priorite, message).
  - `POST /:id/reply` → body `{ text, statut? }`, appends `{ author:'support', text, at:new Date().toISOString() }` to `messages`, optionally updates `statut`.
  - `POST /:id/resolve` → `statut='resolu'`.
  Return everything via `success(...)`. Statut/priorite validated with `@IsIn` against the vocab above.
- [ ] **Step 4: Run tests** — `npm run test:e2e -- support` → PASS; also `npm test` (unit) PASS.
- [ ] **Step 5: Commit** — `git commit -am "feat(server): support tickets admin module"`

### Task 1.3: Admin rendez-vous listing endpoint

The `rendez_vous` entity exists but only client-guarded routes do. Add admin list/detail so `admin/reservations` + `admin/reservation/[id]` can be wired.

**Files:**
- Modify: `server/src/rendez-vous/rendez-vous.controller.ts` (add admin routes), `rendez-vous.service.ts` (add `adminIndex`, `adminShow`)
- Test: extend `server/test/rendez-vous.e2e-spec.ts`

- [ ] **Step 1: Write failing tests** — `GET /api/admin/rendez-vous` requires admin; returns paginated list with `client` + `praticien` joined; supports `?statut`, `?praticien_id`, `?client_id`, `?date_debut`, `?date_fin`, `?search`; `GET /api/admin/rendez-vous/:id` returns one with relations + its paiement if any. Add a `statistiques: { total, en_attente, confirme, termine, annule }` block to the list.
- [ ] **Step 2: Run, verify fail** — `npm run test:e2e -- rendez-vous`.
- [ ] **Step 3: Implement** `adminIndex(query)` with `createQueryBuilder('r').leftJoinAndSelect('r.client','client').leftJoinAndSelect('r.praticien','praticien')`, filters, `paginateQb`, and a grouped-count statistiques query; `adminShow(id)`. Guard the new controller methods with `AdminGuard` (import as the other admin controllers do). Base path `admin/rendez-vous`.
- [ ] **Step 4: Run tests** — PASS.
- [ ] **Step 5: Commit** — `git commit -am "feat(server): admin rendez-vous listing + detail"`

### Task 1.4: Practitioner availability endpoint

`BookingFlow` uses mock `DAYS`/`SLOTS`. Generate real slots deterministically from the next 14 days, marking a slot taken when a `rendez_vous` exists for that practitioner at that time. No new table.

**Files:**
- Modify: `server/src/praticiens/praticiens.controller.ts` (add `GET /praticiens/:id/availability`), `praticiens.service.ts` (add `availability(id)`)
- Test: extend `server/test/praticiens.e2e-spec.ts` (create if absent, else add a describe)

- [ ] **Step 1: Failing test** — `GET /api/praticiens/:id/availability` (public) returns `data: [{ date, slots: [{ time, available }] }]` for 14 days starting today; a slot overlapping an existing `confirme`/`en_attente` rendez_vous for that practitioner is `available:false`.
- [ ] **Step 2: Run, verify fail.**
- [ ] **Step 3: Implement** `availability(id)`: fixed daily grid `['09:00','10:00','11:00','14:00','15:00','16:00','17:00']`, skip Sundays, for 14 days from today; query that practitioner's `rendez_vous` where `date_heure` in range and `statut IN ('en_attente','confirme')`, mark matching `date`+`time` slots unavailable. Deterministic (no random), so it's stable across reads.
- [ ] **Step 4: Run tests** — PASS.
- [ ] **Step 5: Commit** — `git commit -am "feat(server): practitioner availability slots endpoint"`

### Task 1.5: Practitioner rating aggregate on the public API

Cards/directory show no stars because `mapPraticien` hardcodes `rating:0`. Add `rating` (avg of `publié` avis note) + `reviews_count` to the `GET /praticiens` and `GET /praticiens/:id` responses.

**Files:**
- Modify: `server/src/praticiens/praticiens.service.ts` (list + show)
- Test: extend the praticiens e2e

- [ ] **Step 1: Failing test** — seed a praticien with 3 `publié` avis (notes 5,4,5) and 1 `en_attente`; `GET /api/praticiens/:id` returns `rating: 4.7` (1-decimal) and `reviews_count: 3` (excludes non-publié); list endpoint includes the same fields per row.
- [ ] **Step 2: Run, verify fail.**
- [ ] **Step 3: Implement** — after loading praticien rows, attach aggregates with one grouped query over `avis` (`praticien_id IN (...) AND statut='publié'`, `AVG(note)`, `COUNT(*)`), round rating to 1 decimal, default `rating:0, reviews_count:0` when none. Do it in both list and show. Keep the response shape additive (don't remove existing fields).
- [ ] **Step 4: Run tests** — PASS.
- [ ] **Step 5: Commit** — `git commit -am "feat(server): expose praticien rating + reviews_count"`

### Task 1.6: Public stats + client activity endpoints

Kills the home-page inline stat literals and the `compte` mock ACTIVITY feed.

**Files:**
- Create: `server/src/stats/stats.module.ts`, `stats.controller.ts`, `stats.service.ts`
- Modify: `server/src/app.module.ts`
- Add client activity: `server/src/clients/*` already exist — add `GET /client/activity` to the client-facing surface (place in a small `ClientActivityController` inside an existing client module, or extend `favorites`/`conversations` module — follow whichever client-guarded module is simplest; guard with the client JWT guard used by `favorites.controller.ts`).
- Test: `server/test/stats.e2e-spec.ts`

- [ ] **Step 1: Failing tests** — `GET /api/stats` (public) returns `data: { praticiens_verifies, seances, satisfaction, villes }` where `praticiens_verifies = count(statut_verification='valide')`, `seances = count(rendez_vous statut='termine')`, `satisfaction = round(avg(publié avis note),1)`, `villes = count(distinct praticiens.ville)`. `GET /api/client/activity` (client-guarded) returns `data: [{ type, label, at }]` — recent items merged from the client's rendez_vous (booked/completed), avis (posted), remboursements (requested), newest first, capped 15.
- [ ] **Step 2: Run, verify fail.**
- [ ] **Step 3: Implement** both with plain aggregate/union queries; `success(...)` envelope.
- [ ] **Step 4: Run tests** — PASS.
- [ ] **Step 5: Commit** — `git commit -am "feat(server): public stats + client activity endpoints"`

### Task 1.7: Phase-1 checkpoint

- [ ] Run full suite: `cd server && npm test && npm run test:e2e` → all PASS.
- [ ] `npm run build` → PASS.
- [ ] **Apply schema change to Supabase:** the user re-runs `server/scripts/schema.sql` in the Supabase SQL Editor (adds `support_tickets`). Note in the task output that this must happen before the seed runs.

---

## Phase 2 — The seed script

One idempotent Node script that clears every table (FK-safe order) and inserts a large, realistic, interlinked dataset using the TypeORM entities (so transformers/defaults apply). Run against Supabase via a new npm script.

### Task 2.1: Seed scaffolding + npm script

**Files:**
- Create: `server/scripts/seed.ts`
- Modify: `server/package.json` (add `"seed": "ts-node -r tsconfig-paths/register src/../scripts/seed.ts"` — match the repo's ts-node invocation; if `ts-node` isn't wired for scripts, use `"seed": "ts-node scripts/seed.ts"` and confirm `ts-node` + `tsconfig` resolve the entity imports).

- [ ] **Step 1: Create the scaffold** — build a fresh `DataSource` from `buildDataSourceOptions()` (exported by `server/src/database/typeorm.config.ts`) plus the entities glob, initialize it, run everything in order, then destroy. Precompute one bcrypt hash for the demo password and reuse it:

```ts
import 'reflect-metadata';
import * as bcrypt from 'bcryptjs';
import { DataSource } from 'typeorm';
import { buildDataSourceOptions } from '../src/database/typeorm.config';
// import every entity used below…

const DEMO_PASSWORD = 'aura1234';

// Deterministic helpers (no Math.random reliance for reproducibility is optional; a seeded
// PRNG is nice-to-have). pick(arr, i), between(min,max), daysFromNow(n), etc.

async function main() {
  const ds = new DataSource({ ...buildDataSourceOptions(), synchronize: false });
  await ds.initialize();
  const demoHash = await bcrypt.hash(DEMO_PASSWORD, 12);
  await clearAll(ds);            // Task 2.2
  const ctx = { ds, demoHash };
  await seedPlatformSettings(ctx);
  await seedDisciplines(ctx);
  await seedEmailTemplates(ctx);
  await seedPromotions(ctx);
  await seedCercles(ctx);
  await seedAdmins(ctx);         // admin@admin.com + role admins
  const prats = await seedPraticiens(ctx);   // returns created rows
  const clients = await seedClients(ctx);
  await seedSubscriptions(ctx, prats);
  await seedPraticienDocuments(ctx, prats);
  await seedFavorites(ctx, clients, prats);
  const rdv = await seedRendezVous(ctx, clients, prats);
  await seedAvis(ctx, clients, prats, rdv);
  const paiements = await seedPaiements(ctx, rdv);
  await seedRemboursements(ctx, paiements);
  await seedDisputes(ctx, clients, prats, paiements);
  await seedEchanges(ctx, clients);
  await seedSignalements(ctx, prats /*, admins*/);
  await seedArticles(ctx);
  await seedEvents(ctx, prats);
  await seedConversations(ctx, clients, prats);
  await seedNotifications(ctx);
  await seedNotificationPrefs(ctx, clients);
  await seedAuditLogs(ctx /*, admins*/);
  await seedSupportTickets(ctx, clients);
  await ds.destroy();
  console.log('Seed complete.');
}
main().catch((e) => { console.error(e); process.exit(1); });
```

- [ ] **Step 2: Verify it runs (empty bodies OK first)** — `cd server && npm run seed` connects + prints "Seed complete." (Stub each `seed*` as a no-op initially to prove the DataSource + npm script work end-to-end against Supabase.)
- [ ] **Step 3: Commit** — `git commit -am "chore(server): seed script scaffold + npm run seed"`

### Task 2.2: `clearAll` (idempotent reset)

- [ ] Implement `clearAll(ds)` — `TRUNCATE ... RESTART IDENTITY CASCADE` on every table in one statement so reseeds are clean and ids restart at 1:

```ts
async function clearAll(ds: DataSource) {
  await ds.query(`TRUNCATE
    support_tickets, audit_logs, notifications, notification_preferences,
    messages, conversations, favorites, remboursements, paiements, rendez_vous,
    signalements, disputes, echanges, avis, event_praticien, programmes, events,
    articles, promotions, cercles, email_templates, subscriptions,
    praticien_documents, praticiens, clients, disciplines, platform_settings, users
    RESTART IDENTITY CASCADE`);
}
```

- [ ] Run `npm run seed` → still "Seed complete." Commit.

### Task 2.3: Reference data — settings, disciplines, emails, promotions, cercles, admins

- [ ] `seedPlatformSettings`: insert one row `{ id: 1, commission_rate: 0.15 }` (raw insert to force id=1).
- [ ] `seedDisciplines`: insert the **exact 12 canonical rows** from the table in Conventions (nom/slug/tonalite/glyphe) with an `accroche` one-liner each (e.g. Magnétisme → "Rééquilibrer les flux d'énergie du corps").
- [ ] `seedEmailTemplates`: 5 rows — `Confirmation de réservation`, `Rappel 24h avant`, `Bienvenue`, `Praticien vérifié`, `Demande d'avis`; `statut` mix `actif`(4)/`inactif`(1); `variables` arrays like `['client_name','date','praticien_name']`.
- [ ] `seedPromotions`: 6 rows — codes `BIENVENUE15`(pourcentage,15), `EQUINOXE25`(pourcentage,25), `PLEINELUNE`(fixe,10), `NOEL2025`(pourcentage,20), `PRINTEMPS`(fixe,15), `PARRAINAGE`(pourcentage,10); `date_expiration` a future date; `status` mix `active`/`archived`.
- [ ] `seedCercles`: 8 rows — names like `Cercle Aura — Paris`, `Cercle de femmes — Lyon`, `Méditation du matin — Bordeaux`…; `color` a hex from the tone palette; `animateur` a name; `description` one line.
- [ ] `seedAdmins`: insert `users` rows — `admin@admin.com`/`admin123` (bcrypt that one specifically, `is_admin:true, role:'admin'`), plus `moderateur@aura.io`, `support@aura.io`, `comptable@aura.io` (demoHash, `is_admin:true`, roles `moderateur|support|comptabilite`). Return the admin rows for audit-log authoring. Keep a module-level list of admin ids.
- [ ] Run `npm run seed`; verify counts via a quick `ds.query('select count(*) from disciplines')` log or Supabase table view. Commit.

### Task 2.4: People — praticiens (+users), clients (+users), subscriptions, documents

Use French name pools + the 12 disciplines + city pool `[Annecy, Lyon, Paris, Bordeaux, Marseille, Toulouse, Strasbourg, Lille, Nantes, Nice, Montpellier, Rennes]`.

- [ ] `seedPraticiens` → **36 practitioners.** For each: create a `users` row (is_admin:false, demoHash, email) AND a `praticiens` row with the same email. Distribute `statut_verification`: 30 `valide`, 2 `en_attente`, 2 `en_cours`, 2 `rejete`. `specialite` = a discipline `nom`; `niveau` ∈ `Expert|Praticien confirmé|Novice`; `mode` ∈ `présentiel & visio|présentiel|visio uniquement`; `tarif` 55–110; `experience` 2–18; `bio` ≥60 chars; `valide` ones get `verifie_a` + `verifie_par`=an admin id. Return the created praticien rows (with ids + emails).
- [ ] `seedClients` → **48 clients.** Each: `users` row (is_admin:false, demoHash) + `clients` row same email; realistic firstname/lastname/city. Return rows.
- [ ] `seedSubscriptions` → one row per praticien: plan distribution ~`essentiel`(20)/`pro`(11)/`premium`(5); `statut` mostly `active`, a few `past_due`/`trialing`/`canceled`; paid plans get fake `stripe_customer_id`/`stripe_subscription_id` + a future `current_period_end`.
- [ ] `seedPraticienDocuments` → for every `valide` practitioner insert all **5 docs** (`piece_identite,certification,assurance,domicile,charte`) with `statut:'valide'`; for `en_cours` practitioners insert 5 docs with a mix of `valide`/`en_attente`; for `en_attente` insert 5 `en_attente`; `rejete` get 5 with ≥1 `rejete`. `chemin` = a fake path `praticiens/<id>/documents/<type>.pdf`, `nom_fichier` = `<type>.pdf`, `mime_type:'application/pdf'`.
- [ ] Run `npm run seed`; confirm `praticiens`, `clients`, `subscriptions`, `praticien_documents` populated and login pairing holds (users.email == praticiens/clients.email). Commit.

### Task 2.5: Activity — favorites, rendez-vous, avis

- [ ] `seedFavorites` → ~100 unique `(client_id, praticien_id)` pairs (guard uniqueness).
- [ ] `seedRendezVous` → **~220 rows** linking random client×praticien: `date_heure` spread from −180 days to +30 days; `duree_minutes:60`; `mode` ∈ `présentiel|visio`; `tarif` = the practitioner's tarif; `statut` distribution ~`termine`(120, all in the past), `confirme`(40), `en_attente`(30, future), `annule`(30). Return rows (with ids, client_id, praticien_id, tarif, statut, date_heure).
- [ ] `seedAvis` → for ~100 of the `termine` rendez-vous, create an avis: `full_name_author` = the client's `firstname lastname`, `praticien_id`, `note` weighted toward 4–5 (occasional 3), `avis` text from a pool, `date_ajout` ≈ the rdv date + a day, `statut` distribution `publié`(85)/`en_attente`(10)/`rejeté`(5). (Publié ones drive the Task 1.5 rating aggregate.)
- [ ] Run `npm run seed`; spot-check a practitioner's `GET /api/praticiens/:id` now returns a non-zero `rating`. Commit.

### Task 2.6: Money — paiements, remboursements, disputes

- [ ] `seedPaiements` → for every `confirme` + `termine` rendez-vous (~160), one paiement: `reference` = `RDV-<rdvId>-<epoch>`, `client_id`, `praticien_id`, `rendez_vous_id` (unique), `montant_brut` = rdv tarif, `commission` = round(montant_brut*0.15,2), `montant_net_praticien` = brut−commission, `moyen_paiement` ∈ `card|Carte|PayPal|Apple Pay`, `statut` mostly `paid` (a handful `rembourse`), `date_paiement` ≈ rdv date. Return rows.
- [ ] `seedRemboursements` → ~25 from `paid` paiements: `reference` = `RMB-<5 digits>`, `client_id`, `paiement_id`, `praticien_id`, `montant` = paiement brut, `motif` ∈ `Annulation client|Praticien indisponible|Litige résolu|Insatisfaction`, `statut` across all 5 (`en_attente|en_cours|approuve|refuse|completed`). For `approuve`/`completed`, also flip the linked paiement `statut` to `rembourse`.
- [ ] `seedDisputes` → ~15: random client×praticien, optional `paiement_id`, `montant`, `motif` text, `statut` `ouvert`(5)/`resolu`(10), `priorite` `haute|normale`; resolved ones get `resolution_notes`.
- [ ] Run `npm run seed`; check `GET /api/paiements/statistics` (as admin) returns non-empty groups. Commit.

### Task 2.7: Content & community — echanges, signalements, articles, events, cercles links

- [ ] `seedEchanges` → ~32: random client, `sujet`, `type` ∈ the 4, `message`, `statut` spread across all 6, `priorite` across all 4; some with `pieces_jointes` JSON `[{nom,chemin,taille,type}]`; `signale` ones get `signale_par`/`motif_signalement`/`signale_a`.
- [ ] `seedSignalements` → ~22: `signale_par_id` = a client's **user** id, `praticien_id`, `type` ∈ `overclaim|behavior|fake|pros|other`, `sujet`, `motif`, `priorite` ∈ 4, `statut` `pending`(10)/`resolved`(8)/`rejected`(4), `date_signalement` in the past.
- [ ] `seedArticles` → 14: titles from a pool (e.g. "Comprendre le magnétisme", "5 rituels de pleine lune", "Débuter la méditation"), `slug` = slugified title, `categorie` ∈ `Guide|Discipline|Conseils|Communauté|Bien-être`, `tonalite` ∈ 4 tones, `extrait`, `corps` (a few paragraphs), `auteur` `L'équipe Aura`, `temps_lecture` 3–9, `status` `publié`(12)/`brouillon`(1)/`archivé`(1), publié ones get `date_publication`. Leave `image_couverture` null (blog renders tone gradients by design).
- [ ] `seedEvents` → 10: `titre`, `type` ∈ the 6, `dates` JSON array of 1–3 ISO dates (future for upcoming), `lieu` a city, `prix` 0–180, `nombre_places` 8–40, `description`, `status` `publié`(8)/`brouillon`(1)/`archivé`(1). For each, insert 1–2 `event_praticien` rows (unique) with `role:'animateur'` linking `valide` practitioners, and 2–3 `programmes` rows (`heure` a `time`, `titre`).
- [ ] Run `npm run seed`; check `GET /api/articles?status=publié`, `GET /api/events`, `GET /api/echanges` (admin) return data. Commit.

### Task 2.8: Messaging, notifications, prefs, audit, support tickets

- [ ] `seedConversations` → ~35 unique `(client_id, praticien_id)`; each gets 3–8 `messages` alternating `sender_role` `client`/`praticien`, realistic short texts, some recent ones with `read_at` null (unread), ~5 messages `flagged:true`.
- [ ] `seedNotifications` → 14: `audience` ∈ `clients|praticiens|tous`, `canal` ∈ `email|push|sms`, `titre`, `message`, `status` some `envoyé`/`brouillon`.
- [ ] `seedNotificationPrefs` → one row per client with varied booleans.
- [ ] `seedAuditLogs` → ~60: `actor_id` = an admin user id, spread across all 6 `category` values with realistic `action` strings (e.g. verification→"a vérifié un praticien", finance→"a approuvé un remboursement", moderation→"a publié un avis"/"a résolu un signalement"), `metadata` `{ target_label, actor_role }`, `created_at` spread over the last 60 days (set explicitly).
- [ ] `seedSupportTickets` → ~22: `requester_name`/`requester_email` (some linked to a `client_id`), `sujet`, `categorie`, `priorite` ∈ `basse|normale|haute`, `statut` across `ouvert|en_cours|resolu|ferme`, `message`, some with a `messages` reply thread.
- [ ] Run `npm run seed`; final counts sanity log. Commit.

### Task 2.9: Seed verification checkpoint

- [ ] Run `npm run seed` once clean end-to-end against Supabase → "Seed complete.", no errors.
- [ ] Hit the live API and confirm population (via curl against the Render URL or local `start:dev`):
  - `GET /api/praticiens` → paginated practitioners with non-zero `rating` on many.
  - `GET /api/disciplines` → 12.
  - `GET /api/articles?status=publié` → ~12.
  - `GET /api/events` → published events with `animateurs`.
  - Admin login (`admin@admin.com`/`admin123`) → `GET /api/admin/subscriptions`, `/api/paiements`, `/api/admin/support`, `/api/admin/rendez-vous` all return data.
- [ ] Log the final row counts in the task report. Commit any fixups.

---

## Phase 3 — Frontend: rewire remaining mock pages, delete dead mock

Switch every page still reading a mock array (that now has an endpoint) to the API, then delete the dead mock exports/files. Use the existing API client `web/lib/api.js` and the existing adapters. **Keep** legitimate marketing/content mock (`content.js`: faq, jobs, pressItems, helpArticles, values, plans; all legal/marketing copy).

### Task 3.1: Practitioner rating in the adapter

**Files:** Modify `web/lib/data/praticien-adapter.js`

- [ ] In `mapPraticien`, replace the hardcoded `rating: 0, reviews: 0` with the API values: `rating: p.rating ?? 0, reviews: p.reviews_count ?? 0`. Leave `photo/hero/gallery`/`online`/`tone` as-is (gradient-initials design). Verify the directory + profile now show stars after Phase 2 seed. Commit.

### Task 3.2: Home page → live data

**Files:** Modify `web/app/(site)/page.jsx`

- [ ] Replace mock imports (`practitioners`, `disciplines`, `events`) with fetches: featured practitioners from `GET /praticiens` (via `mapPraticien`), disciplines from `GET /disciplines`, events from `GET /events` (via `mapEvent`). Replace the inline hero stat literals (`2 400+`, `48 000`, `4,9/5`) and the hardcoded testimonial with values from `GET /stats` (Task 1.6) and one seeded `publié` avis. Keep marketing copy blocks. Commit.

### Task 3.3: Compte overview / reservations / reservation detail → live data

**Files:** Modify `web/app/(site)/compte/page.jsx`, `compte/reservations/page.jsx` (+`ReservationsBody`), `compte/reservation/[id]/page.jsx`

- [ ] `compte` overview: replace mock `bookings`/`getPractitioner`/inline `ACTIVITY`/StatCards with `GET /rendez-vous/client` + `GET /client/activity` (Task 1.6); derive the StatCard counts from the real lists.
- [ ] `compte/reservations`: replace mock `bookings` with `GET /rendez-vous/client` (map statuses to the French vocab; update any English status label maps to `en_attente|confirme|annule|termine`).
- [ ] `compte/reservation/[id]`: replace mock lookups with `GET /rendez-vous/client/:id`.
- [ ] Commit.

### Task 3.4: Booking flow availability → live slots

**Files:** Modify `web/app/(site)/reserver/[id]/BookingFlow.jsx`, `web/app/(site)/reserver/[id]/page.jsx`

- [ ] Replace the mock practitioner lookup (`getPractitioner`) with `GET /praticiens/:id`. Replace mock `DAYS`/`SLOTS` with `GET /praticiens/:id/availability` (Task 1.4), rendering only `available` slots as selectable. Keep the existing real POST `/rendez-vous` + Stripe path. Commit.

### Task 3.5: Admin reservations + reservation detail → live data

**Files:** Modify `web/app/admin/reservations/page.jsx`, `web/app/admin/reservation/[id]/page.jsx`

- [ ] Replace mock `bookings`/`getBooking`/`getClient`/`getPractitioner` with `GET /admin/rendez-vous` (list, with the `statistiques` block) and `GET /admin/rendez-vous/:id` (detail). Update status label/tone maps to the French vocab. Commit.

### Task 3.6: Admin practitioner detail → live data

**Files:** Modify `web/app/admin/praticien/[id]/page.jsx`, `web/app/admin/praticien/[id]/PractitionerTabs.jsx`

- [ ] Replace mock `practitioners`/`getPractitioner`/`reviewsFor`/`bookings` and the hardcoded `DOCS` with `GET /praticiens/:id` (now includes rating), `GET /avis?praticien_id=:id`, `GET /admin/rendez-vous?praticien_id=:id`, and the verification documents from the existing `GET /v1/admin/praticiens/verification/:id`. Commit.

### Task 3.7: Admin support → live data

**Files:** Modify `web/app/admin/support/page.jsx`, `web/app/admin/support/[id]/page.jsx`

- [ ] Replace mock `tickets`/`getTicket` with `GET /admin/support` (+ filters + `statistiques`) and `GET /admin/support/:id`; wire the reply box to `POST /admin/support/:id/reply` and a resolve action to `POST /admin/support/:id/resolve`. Map statuses to `ouvert|en_cours|resolu|ferme`. Commit.

### Task 3.8: FiltersModal + admin revenus subscriptions

**Files:** Modify `web/components/modals/FiltersModal.jsx`, `web/app/admin/analytique/revenus/page.jsx`

- [ ] FiltersModal: replace mock `disciplines` with `GET /disciplines`.
- [ ] `analytique/revenus`: replace the mock `subscriptions` table with `GET /admin/subscriptions` (already used elsewhere). Commit.

### Task 3.9: Delete dead mock, keep marketing content

**Files:** Delete/prune under `web/lib/data/`

- [ ] Delete now-unused domain mock files entirely: `web/lib/data/practitioners.js`, `web/lib/data/events.js`, `web/lib/data/disciplines.js` (mock counts), `web/lib/data/exchanges.js`. **Before deleting each, grep for remaining imports** (`grep -rn "lib/data/practitioners" web/app web/components`) and rewire/remove any stragglers.
- [ ] Prune `web/lib/data/admin.js` down to nothing-domain (it should be fully unused after 3.3–3.8) and delete it; if any marketing-only export remains, move it to `content.js`.
- [ ] Prune dead exports from `content.js` that migrated to the API (`blogPosts`/`getBlogPost` — blog uses `/articles`); **keep** `faq`, `jobs`, `pressItems`, `helpArticles`, `values`, `plans`, and `testimonials` only if the témoignages page still uses it (or switch témoignages to seeded `publié` avis and drop it).
- [ ] `cd web && npm run build` → PASS (no missing imports). Commit.

### Task 3.10: Frontend verification checkpoint

- [ ] `cd web && npm run build` → PASS.
- [ ] With the seeded DB + server running, click through: home (populated), practitioners directory (stars + full list), a practitioner profile (reviews), disciplines, events, blog, compte/* (real reservations/activity/payments), and admin/* (praticiens, verification, reservations, support, paiements, remboursements, litiges, abonnements, audit, analytique). Confirm no empty states and no console errors from missing mock imports.
- [ ] Report any page still showing placeholder/empty data.

---

## Self-Review coverage map

- "Remove all mock data" → Phase 3 (3.2–3.9) rewires every mock page with an endpoint and deletes the dead files; marketing/content mock intentionally kept (documented).
- "Create data and seed it" → Phase 2 (all 26 tables + support_tickets).
- "Things that don't have mock data → create data" → Phase 2 covers every table incl. audit_logs, notifications, email_templates, programmes, event_praticien, platform_settings.
- "Fully working / looks used by many" → volume targets in Phase 2 (36 practitioners, 48 clients, ~220 rendez-vous, ~100 avis, ~160 paiements, etc.) + ratings (1.5) + stats (1.6).
- "Missing endpoints" (user chose to build them) → Phase 1 (support tickets, admin rendez-vous, availability, stats, activity).
- "Images where needed" → none required: practitioner avatars are gradient-initials by design (user choice), blog/disciplines/events use tone-gradient/glyph aesthetics; no image columns need populating.

## Notes / risks

- **Local → Supabase pooler connectivity** was intermittently slow from this machine earlier; if `npm run seed` times out, re-run (TRUNCATE makes it idempotent) or run it from the Render shell.
- **Schema change (support_tickets) must be applied in the Supabase SQL Editor** (re-run `schema.sql`) before Task 2.8 / any support seeding.
- Seeding **TRUNCATEs users**, so it recreates `admin@admin.com`/`admin123`. After seeding, that account exists again — no separate `POST /api/admin/register` needed.
