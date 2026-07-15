# Aura Plan 08g — Analytics Aggregation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build four new admin-only aggregation endpoints (`GET /admin/analytics/dashboard|revenue|growth|retention`) that replace the static `analytics` mock object in `web/lib/data/admin.js` with real SQL-backed numbers, then wire the main admin dashboard and all three `admin/analytique/*` subpages to them.

**Architecture:** A new `server/src/analytics/` module (`AnalyticsController` → `AnalyticsService`) sits alongside the existing `paiements`/`remboursements`/`echanges` modules. It **composes** `PaiementsService.adminStatistics()` and `RemboursementsService.adminStatistics()` for numbers those modules already computes correctly (both modules gain an `exports: [...]` entry so `AnalyticsModule` can inject them), and runs **genuinely new TypeORM query-builder queries** against `Client`, `Praticien`, `RendezVous`, and `Paiement` for everything that doesn't exist yet: weekly/monthly signup and booking counts, discipline revenue share, the signup-month cohort retention table, repeat-booking distribution, and average customer lifetime value. The trickiest piece — cohort retention — is computed with a hybrid approach: SQL does the heavy lifting (grouping clients by signup month, grouping bookings by month, both via the codebase's established `SUBSTR(CAST(col AS CHAR), 1, 7)` portable month-grouping expression), and plain TypeScript does the month-offset arithmetic (`cohort_month + N`) and set-membership check, because there is no month-diff function that is reliably portable between the production MySQL driver and the better-sqlite3 driver the e2e suite runs on.

**Tech Stack:** NestJS 11 + TypeORM 0.3 (MySQL in production, better-sqlite3 in-memory for e2e tests) on the backend; Next.js (App Router, `'use client'` pages) + `@tanstack/react-query` on the frontend, following the exact `api.get(...)` / `useQuery({ queryKey, queryFn })` pattern already used by every wired admin page (e.g. `web/app/admin/paiements/page.jsx`).

---

## Context: scope boundaries and dependency gaps (read before starting)

This sub-plan implements decision **P8-8** from `docs/superpowers/specs/2026-07-15-aura-08-heavy-modules-design.md` and is sequenced **last** among the seven 08x sub-plans because it benefits from their data — but it must not assume any of them have landed. Concretely:

1. **Acquisition funnel — visits are explicitly out of scope.** No visit-tracking infrastructure (Plausible/GA/anything) exists anywhere in this codebase, and building one is an unscoped, separate decision per the locked spec. The old mock's 4-stage funnel (`Visiteurs → Inscrits → Profil complété → 1ère réservation`) is replaced with the spec's own 3-stage framing (`visits → signups → bookings`): `visiteurs` is returned as `null` and rendered with an honest "Non disponible" label, never a fabricated number. The mock's middle "Profil complété" stage is dropped entirely — there is no profile-completeness concept anywhere in the `Client` entity (`server/src/database/entities/client.entity.ts` has exactly `firstname, lastname, email, city, created_at, updated_at`, nothing resembling a completion flag), and the locked spec never asked for one.
2. **Acquisition channels (organic/social/word-of-mouth/ads %) are also out of scope**, for the identical reason as visits: channel attribution requires the same referrer/UTM tracking that doesn't exist. The mock's `CHANNELS` bar list on `admin/analytique/croissance/page.jsx` is removed (not faked), replaced with a short honest note next to the funnel.
3. **Churn reasons have no data source and are explicitly scoped out of this plan's exit criteria.** The mock's free-text "Principaux motifs de départ : besoin ponctuel résolu (52%), prix perçu (21%), manque de disponibilités (16%)" on `admin/analytique/retention/page.jsx` has nothing behind it anywhere in the codebase today. 08e (subscriptions) is a candidate future source *if* it captures a cancellation reason on subscription cancel — that field does not exist yet (08e is a separate, not-yet-executed sub-plan) and this plan must not assume it. The retention endpoint returns `churn_reasons: null`; the retention page renders an honest "Non disponible — dépend d'un futur champ de motif d'annulation (voir 08e)" note instead of the fabricated paragraph. The **churn rate** (a single %, distinct from churn *reasons*) **is** computable today from real booking-recency data and is implemented for real (see Task 5).
4. **MRR/ARR/subscriber counts (the "Revenu récurrent" card on `admin/analytique/revenus/page.jsx`) depend on 08e's `subscriptions` table, which does not exist yet.** `web/lib/data/admin.js`'s `subscriptions` mock export is deliberately left untouched and still imported by that one card — every other mock import on that page is replaced. This is called out again at that task and in the Exit Criteria.
5. **Dispute rate.** The main dashboard's 4th StatCard was mocked as "Taux de litige" (dispute rate). 08d (disputes) has not landed — there is no `disputes` table. This plan relabels that card to **"Taux de remboursement"** (refund rate), backed by the real, already-correct `RemboursementsService.computeStatistics()`'s `taux_remboursement` field, and documents that once 08d ships a real dispute rate, that StatCard should be swapped again — it is not swapped now because there is nothing real to swap it to yet.

**A note on timezones, verified empirically before writing any code below.** TypeORM's better-sqlite3 driver (used by the e2e suite via `createTestApp`) always serializes `datetime` columns to **UTC** on write, regardless of what timezone the `Date` object was constructed in (confirmed by direct inspection of stored rows: a `Date` built as local midnight in a UTC+1 process was stored as `23:00:00` the previous day). The production `mysql2` driver instead serializes `Date` objects using the **Node process's local timezone**. To keep every month/week bucketing computation in this plan internally consistent — and to keep the e2e tests deterministic regardless of the host machine's timezone — all date-boundary math in `server/src/analytics/analytics.utils.ts` (Task 1) is written in **UTC** (`Date.UTC(...)`, `getUTC*()`), and every e2e test fixture date is constructed with an explicit UTC ISO string (`'...Z'` suffix) or `Date.UTC(...)`, matching the pattern already established in `server/test/paiements.e2e-spec.ts` (`new Date('2026-06-15T10:00:00Z')`). This is exactly correct against the sqlite test database. It is also exactly correct in production **as long as the server process runs with `TZ=UTC`** — standard practice for Node backends, and the same assumption every other date-grouped query in this codebase (`paiements`/`remboursements`'s `MONTH_EXPR`) already implicitly makes without stating it. If the deployed server does not run in UTC, the one-line fix is setting `TZ=UTC` in its process environment, not reworking this module.

---

## Response contracts (backend → frontend agreement)

Fix these shapes now so backend tasks (2–5) and frontend tasks (6–10) stay consistent — this is exactly what Tasks 2–10 implement.

**`GET /api/admin/analytics/dashboard`** → `data`:
```
{
  revenue_this_month: number,
  revenue_delta_pct: number | null,
  bookings_this_month: number,
  bookings_delta_pct: number | null,
  new_praticiens_this_month: number,
  new_praticiens_delta: number,
  refund_rate: string,               // e.g. "33.3%", passthrough from remboursements service (already formatted)
}
```

**`GET /api/admin/analytics/revenue`** → `data`:
```
{
  general: { total_transactions: number, montant_total: number, commission_totale: number, net_total: number },
  par_mois: [{ mois: 'YYYY-MM', total: number, commission: number, net: number }, ...],   // ascending, oldest→newest, up to 12 months
  par_discipline: [{ specialite: string, total: number, pct: number }, ...],              // descending by total
}
```

**`GET /api/admin/analytics/growth`** → `data`:
```
{
  signups: [{ mois: 'YYYY-MM', count: number }, ...],                       // ascending, up to 12 months, only months with data
  bookings_this_week: [{ jour: 'Lun'|'Mar'|'Mer'|'Jeu'|'Ven'|'Sam'|'Dim', count: number }, ...],  // exactly 7 entries, Mon→Sun
  conversion_rate_pct: number,        // % of ALL clients (all-time) with >=1 non-cancelled booking
  activation_rate_pct: number,        // % of clients created in the last 30 days with >=1 non-cancelled booking
  avg_days_to_first_booking: number | null,
  funnel: { visiteurs: null, inscrits: number, a_reserve: number },
}
```

**`GET /api/admin/analytics/retention`** → `data`:
```
{
  cohorts: [{ cohort: 'YYYY-MM', size: number, m1: number|null, m2: number|null, m3: number|null, m6: number|null, m12: number|null }, ...],  // ascending, up to 6 most recent signup-month cohorts
  overall: {
    retention_30j_pct: number | null,   // weighted M1 across eligible cohorts
    retention_90j_pct: number | null,   // weighted M3
    retention_12m_pct: number | null,   // weighted M12
    curve: [{ offset: 'M0'|'M1'|'M2'|'M3'|'M6'|'M12', pct: number | null }, ...],   // 6 points, M0 always 100
  },
  repeat_bookings: [{ label: string, count: number, pct: number }, ...],   // 4 buckets: 1 / 2-3 / 4-6 / 7+
  repeat_rate_pct: number,            // % of booked clients with > 1 booking
  avg_lifetime_value: number,         // average sum(paid montant_brut) per client with >=1 paid payment
  churn_rate_pct: number | null,      // = 100 - retention_90j_pct
  churn_reasons: null,                // not tracked — see Context section above
}
```

---

## File structure

| File | Action | Responsibility |
|---|---|---|
| `server/src/analytics/analytics.utils.ts` | Create | Pure, timezone-safe date/math helpers shared by the service (month bounds, week bounds, cohort-offset arithmetic, weekday bucketing). |
| `server/src/analytics/analytics.service.ts` | Create | The four aggregation methods (`dashboard`, `revenue`, `growth`, `retention`). |
| `server/src/analytics/analytics.controller.ts` | Create | `AdminGuard`-only routes under `admin/analytics`. |
| `server/src/analytics/analytics.module.ts` | Create | Wires the module, imports `PaiementsModule`/`RemboursementsModule` for composition. |
| `server/src/paiements/paiements.module.ts` | Modify | Add `exports: [PaiementsService]` so `AnalyticsModule` can inject it. |
| `server/src/remboursements/remboursements.module.ts` | Modify | Add `exports: [RemboursementsService]`. |
| `server/src/app.module.ts` | Modify | Register `AnalyticsModule`. |
| `server/test/analytics.e2e-spec.ts` | Create | e2e coverage for all 4 endpoints, with hand-verified seeded aggregation assertions. |
| `web/app/admin/page.jsx` | Modify | Main dashboard — wire StatCards/LineChart/BarChart/Donut to real endpoints. |
| `web/app/admin/analytique/page.jsx` | Modify | Analytics overview — wire StatCards/charts/top-praticiens table. |
| `web/app/admin/analytique/revenus/page.jsx` | Modify | Revenue detail — wire monthly table + discipline share; leave MRR card on the `subscriptions` mock (08e gap). |
| `web/app/admin/analytique/croissance/page.jsx` | Modify | Growth — wire signups chart, cohort table, funnel; remove fabricated channels section. |
| `web/app/admin/analytique/retention/page.jsx` | Modify | Retention — wire donuts/curve/repeat distribution/CLV/churn rate; replace fabricated churn-reasons paragraph with an honest note. |
| `web/lib/data/admin.js` | Modify | Remove the now-dead `analytics` mock export once nothing imports it. |

---

## Task 1: Scaffold the `analytics` module (guard-only, stub methods)

**Files:**
- Create: `server/src/analytics/analytics.utils.ts`
- Create: `server/src/analytics/analytics.service.ts`
- Create: `server/src/analytics/analytics.controller.ts`
- Create: `server/src/analytics/analytics.module.ts`
- Modify: `server/src/paiements/paiements.module.ts`
- Modify: `server/src/remboursements/remboursements.module.ts`
- Modify: `server/src/app.module.ts`
- Test: `server/test/analytics.e2e-spec.ts`

**Note on test file structure.** `analytics.e2e-spec.ts` covers 4 endpoints whose aggregation queries scan the *entire* `clients`/`praticiens`/`rendez_vous`/`paiements` tables with no scoping filter (unlike e.g. `paiements.e2e-spec.ts`'s client-scoped queries) — cohort/retention/conversion numbers are only hand-verifiable if each test's seed data is the *only* data in the database. Each of the 5 tasks below therefore gets its **own top-level `describe(...)` block with its own `beforeAll`/`createTestApp()` call**, giving each an isolated in-memory database, rather than sharing one `app` across every test the way single-resource spec files in this codebase do. This is deliberate: Task 1's guard check doesn't care about data isolation, but Tasks 2–5's exact-aggregation assertions would silently break if they saw each other's fixtures.

- [ ] **Step 1: Write the failing guard test**

Create `server/test/analytics.e2e-spec.ts`:

```typescript
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, seedAdmin, seedClientUser } from './utils/create-test-app';
import { AnalyticsModule } from '../src/analytics/analytics.module';

describe('analytics: guards', () => {
  let app: INestApplication;
  let clientToken: string;
  let adminToken: string;

  beforeAll(async () => {
    app = await createTestApp({ imports: [AnalyticsModule] });
    clientToken = (await seedClientUser(app, 'analytics-client@aura.io')).token;
    adminToken = (await seedAdmin(app, 'analytics-admin@aura.io')).token;
  });
  afterAll(async () => { await app.close(); });
  const http = () => request(app.getHttpServer());
  const asAdmin = (r: request.Test) => r.set('Authorization', `Bearer ${adminToken}`);
  const asClient = (r: request.Test) => r.set('Authorization', `Bearer ${clientToken}`);

  const ROUTES = ['dashboard', 'revenue', 'growth', 'retention'];

  it('all 4 routes require admin auth', async () => {
    for (const route of ROUTES) {
      await http().get(`/api/admin/analytics/${route}`).expect(401);
      await asClient(http().get(`/api/admin/analytics/${route}`)).expect(403);
      const res = await asAdmin(http().get(`/api/admin/analytics/${route}`)).expect(200);
      expect(res.body.status).toBe('success');
    }
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm run test:e2e -- analytics.e2e-spec.ts` (from `server/`)
Expected: FAIL — `Cannot find module '../src/analytics/analytics.module'`.

- [ ] **Step 3: Create the utils file**

Create `server/src/analytics/analytics.utils.ts`:

```typescript
// Timezone note: TypeORM's better-sqlite3 driver (the e2e test DB) always serializes
// `datetime` columns to UTC on write (DateUtils.mixedDateToUtcDatetimeString), regardless
// of what timezone the Date object was constructed in. The production mysql2 driver
// instead serializes Date objects using the Node process's local timezone. To keep the
// month/week bucketing below internally consistent — and correct against both drivers —
// every boundary computed here uses UTC. This is exactly correct against sqlite, and is
// exactly correct in production as long as the server process runs with `TZ=UTC` (the
// standard practice for Node backends; if the deployed server does not run in UTC, set
// `TZ=UTC` in its environment rather than reworking this file).

export const WEEKDAY_LABELS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return round1(((current - previous) / previous) * 100);
}

export function monthBounds(year: number, month0: number): { start: Date; endInclusive: Date } {
  return {
    start: new Date(Date.UTC(year, month0, 1, 0, 0, 0, 0)),
    endInclusive: new Date(Date.UTC(year, month0 + 1, 0, 23, 59, 59, 999)),
  };
}

export function currentYearMonth(now = new Date()): string {
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** 'YYYY-MM' + integer month offset (may be negative) -> 'YYYY-MM'. Pure string/integer math. */
export function addMonthsToYearMonth(ym: string, offset: number): string {
  const [y, m] = ym.split('-').map(Number);
  const total = y * 12 + (m - 1) + offset;
  const newY = Math.floor(total / 12);
  const newM = (total % 12) + 1;
  return `${newY}-${String(newM).padStart(2, '0')}`;
}

/** Monday 00:00:00.000 UTC of the current ISO week, through the following Monday (exclusive). */
export function currentWeekRange(now = new Date()): { start: Date; end: Date } {
  const day = now.getUTCDay(); // 0=Sunday..6=Saturday
  const isoDay = day === 0 ? 7 : day; // 1=Monday..7=Sunday
  const start = new Date(Date.UTC(
    now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - (isoDay - 1), 0, 0, 0, 0,
  ));
  const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
  return { start, end };
}

/** Buckets a list of Dates into 7 Mon..Sun counts, relative to `weekStart` (must be a Monday 00:00 UTC). */
export function bucketByWeekday(dates: Date[], weekStart: Date): { jour: string; count: number }[] {
  const counts = new Array(7).fill(0);
  for (const d of dates) {
    const diffDays = Math.floor((d.getTime() - weekStart.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays >= 0 && diffDays < 7) counts[diffDays] += 1;
  }
  return WEEKDAY_LABELS.map((jour, i) => ({ jour, count: counts[i] }));
}
```

- [ ] **Step 4: Create the stub service**

Create `server/src/analytics/analytics.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Client } from '../database/entities/client.entity';
import { Praticien } from '../database/entities/praticien.entity';
import { RendezVous } from '../database/entities/rendez-vous.entity';
import { Paiement } from '../database/entities/paiement.entity';
import { PaiementsService } from '../paiements/paiements.service';
import { RemboursementsService } from '../remboursements/remboursements.service';
import { success } from '../common/envelope';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(Client) private readonly clients: Repository<Client>,
    @InjectRepository(Praticien) private readonly praticiens: Repository<Praticien>,
    @InjectRepository(RendezVous) private readonly rendezVous: Repository<RendezVous>,
    @InjectRepository(Paiement) private readonly paiements: Repository<Paiement>,
    private readonly paiementsService: PaiementsService,
    private readonly remboursementsService: RemboursementsService,
  ) {}

  async dashboard() { return success({}); }

  async revenue() { return success({}); }

  async growth() { return success({}); }

  async retention() { return success({}); }
}
```

- [ ] **Step 5: Create the controller**

Create `server/src/analytics/analytics.controller.ts`:

```typescript
import { Controller, Get, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin/analytics')
export class AnalyticsController {
  constructor(private readonly service: AnalyticsService) {}

  @Get('dashboard')
  dashboard() { return this.service.dashboard(); }

  @Get('revenue')
  revenue() { return this.service.revenue(); }

  @Get('growth')
  growth() { return this.service.growth(); }

  @Get('retention')
  retention() { return this.service.retention(); }
}
```

- [ ] **Step 6: Create the module**

Create `server/src/analytics/analytics.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Client } from '../database/entities/client.entity';
import { Praticien } from '../database/entities/praticien.entity';
import { RendezVous } from '../database/entities/rendez-vous.entity';
import { Paiement } from '../database/entities/paiement.entity';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { PaiementsModule } from '../paiements/paiements.module';
import { RemboursementsModule } from '../remboursements/remboursements.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Client, Praticien, RendezVous, Paiement]),
    PaiementsModule,
    RemboursementsModule,
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
})
export class AnalyticsModule {}
```

- [ ] **Step 7: Export the two services `AnalyticsModule` composes**

Edit `server/src/paiements/paiements.module.ts` — change:

```typescript
  providers: [PaiementsService],
})
export class PaiementsModule {}
```

to:

```typescript
  providers: [PaiementsService],
  exports: [PaiementsService],
})
export class PaiementsModule {}
```

Edit `server/src/remboursements/remboursements.module.ts` — change:

```typescript
  providers: [RemboursementsService, StorageService],
})
export class RemboursementsModule {}
```

to:

```typescript
  providers: [RemboursementsService, StorageService],
  exports: [RemboursementsService],
})
export class RemboursementsModule {}
```

- [ ] **Step 8: Register the module in `app.module.ts`**

Edit `server/src/app.module.ts` — add the import:

```typescript
import { NotificationPreferencesModule } from './notification-preferences/notification-preferences.module';
import { AnalyticsModule } from './analytics/analytics.module';
```

and add `AnalyticsModule` to the `imports` array, after `RendezVousModule`:

```typescript
    NotificationPreferencesModule,
    RendezVousModule,
    AnalyticsModule,
  ],
```

- [ ] **Step 9: Run to verify it passes**

Run: `npm run test:e2e -- analytics.e2e-spec.ts`
Expected: PASS (1 test).

- [ ] **Step 10: Commit**

```bash
git add server/src/analytics server/src/paiements/paiements.module.ts server/src/remboursements/remboursements.module.ts server/src/app.module.ts server/test/analytics.e2e-spec.ts
git commit -m "feat(server): scaffold admin analytics module with guarded stub endpoints"
```

---

## Task 2: Dashboard endpoint

Composes `PaiementsService.adminStatistics()` and `RemboursementsService.adminStatistics()` for the current calendar month (both already accept `date_debut`/`date_fin` query filters — confirmed in `server/src/paiements/paiements.service.ts:145-149` and `server/src/remboursements/remboursements.service.ts:204-210`), and adds two genuinely new counts (bookings this month, new praticiens this month) plus their previous-month comparisons for real deltas.

**Files:**
- Modify: `server/src/analytics/analytics.service.ts`
- Test: `server/test/analytics.e2e-spec.ts`

- [ ] **Step 1: Add the failing test**

Add to `server/test/analytics.e2e-spec.ts`, at the top of the file (these entity/DataSource imports are shared by every task's tests from here on, so they're added once, at the top, not repeated per task):

```typescript
import { DataSource } from 'typeorm';
import { Client } from '../src/database/entities/client.entity';
import { Praticien } from '../src/database/entities/praticien.entity';
import { RendezVous } from '../src/database/entities/rendez-vous.entity';
import { Paiement } from '../src/database/entities/paiement.entity';
import { Remboursement } from '../src/database/entities/remboursement.entity';
```

Then add a new, separate top-level `describe` block **after** the closing `});` of `describe('analytics: guards', ...)` (not inside it — see the isolation note above Task 1's Step 1):

```typescript
describe('analytics: dashboard', () => {
  let app: INestApplication;
  let adminToken: string;
  beforeAll(async () => {
    app = await createTestApp({ imports: [AnalyticsModule] });
    adminToken = (await seedAdmin(app, 'analytics-dashboard-admin@aura.io')).token;
  });
  afterAll(async () => { await app.close(); });
  const http = () => request(app.getHttpServer());
  const asAdmin = (r: request.Test) => r.set('Authorization', `Bearer ${adminToken}`);

  it('dashboard: composes this-month vs last-month deltas across paiements/remboursements/bookings/praticiens', async () => {
    const ds = app.get(DataSource);
    const now = new Date();
    const y = now.getUTCFullYear();
    const m = now.getUTCMonth();
    const thisMonthStart = new Date(Date.UTC(y, m, 1, 0, 0, 0));
    const prevRef = new Date(Date.UTC(y, m - 1, 1));
    const prevMonthStart = new Date(Date.UTC(prevRef.getUTCFullYear(), prevRef.getUTCMonth(), 1, 0, 0, 0));

    const basePrat = await ds.getRepository(Praticien).save({
      firstname: 'Base', lastname: 'Prat', email: 'dash-base-prat@aura.io', telephone: '0600000000',
      ville: 'Paris', niveau: 'Novice', specialite: 'Reiki', mode: 'visio',
      status: 'actif', tarif: 50, experience: 1, bio: 'bio',
    });
    await ds.getRepository(Praticien).save([
      { firstname: 'New1', lastname: 'P', email: 'dash-new1@aura.io', telephone: '0600000001',
        ville: 'Paris', niveau: 'Novice', specialite: 'Magnétisme', mode: 'visio',
        status: 'actif', tarif: 50, experience: 1, bio: 'bio', created_at: thisMonthStart },
      { firstname: 'New2', lastname: 'P', email: 'dash-new2@aura.io', telephone: '0600000002',
        ville: 'Lyon', niveau: 'Novice', specialite: 'Hypnose', mode: 'visio',
        status: 'actif', tarif: 50, experience: 1, bio: 'bio', created_at: thisMonthStart },
    ]);
    await ds.getRepository(Praticien).save({
      firstname: 'Old1', lastname: 'P', email: 'dash-old1@aura.io', telephone: '0600000003',
      ville: 'Nice', niveau: 'Novice', specialite: 'Massage', mode: 'visio',
      status: 'actif', tarif: 50, experience: 1, bio: 'bio', created_at: prevMonthStart,
    });

    const seededClient = (await seedClientUser(app, 'dash-client@aura.io')).client;

    const paiements = await ds.getRepository(Paiement).save([
      { reference: 'DASH-1', client_id: seededClient.id, praticien_id: basePrat.id,
        montant_brut: 100, commission: 10, montant_net_praticien: 90, moyen_paiement: 'Carte',
        statut: 'paid', date_paiement: thisMonthStart },
      { reference: 'DASH-2', client_id: seededClient.id, praticien_id: basePrat.id,
        montant_brut: 200, commission: 20, montant_net_praticien: 180, moyen_paiement: 'Carte',
        statut: 'paid', date_paiement: thisMonthStart },
      { reference: 'DASH-3', client_id: seededClient.id, praticien_id: basePrat.id,
        montant_brut: 100, commission: 10, montant_net_praticien: 90, moyen_paiement: 'Carte',
        statut: 'paid', date_paiement: prevMonthStart },
    ]);

    await ds.getRepository(RendezVous).save([
      { client_id: seededClient.id, praticien_id: basePrat.id, date_heure: thisMonthStart,
        duree_minutes: 60, mode: 'visio', statut: 'confirme', tarif: 50 },
      { client_id: seededClient.id, praticien_id: basePrat.id, date_heure: thisMonthStart,
        duree_minutes: 60, mode: 'visio', statut: 'termine', tarif: 50 },
      { client_id: seededClient.id, praticien_id: basePrat.id, date_heure: thisMonthStart,
        duree_minutes: 60, mode: 'visio', statut: 'confirme', tarif: 50 },
      { client_id: seededClient.id, praticien_id: basePrat.id, date_heure: thisMonthStart,
        duree_minutes: 60, mode: 'visio', statut: 'annule', tarif: 50 },
      { client_id: seededClient.id, praticien_id: basePrat.id, date_heure: prevMonthStart,
        duree_minutes: 60, mode: 'visio', statut: 'confirme', tarif: 50 },
      { client_id: seededClient.id, praticien_id: basePrat.id, date_heure: prevMonthStart,
        duree_minutes: 60, mode: 'visio', statut: 'confirme', tarif: 50 },
    ]);

    await ds.getRepository(Remboursement).save({
      reference: 'RMB-DASH-1', client_id: seededClient.id, paiement_id: paiements[0].id,
      montant: 50, motif: 'Test', statut: 'en_attente', created_at: thisMonthStart,
    });

    const res = await asAdmin(http().get('/api/admin/analytics/dashboard')).expect(200);
    expect(res.body.data).toMatchObject({
      revenue_this_month: 300,
      revenue_delta_pct: 200,
      bookings_this_month: 3,
      bookings_delta_pct: 50,
      new_praticiens_this_month: 2,
      new_praticiens_delta: 1,
      refund_rate: '33.3%',
    });
  });
});
```

*(Numbers double-checked by hand: revenue 100+200=300 this month vs 100 last month → `pctChange(300,100)` = `((300-100)/100)*100` = 200. Bookings: 3 non-`annule` this month vs 2 last month → `pctChange(3,2)` = 50. Praticiens: 2 new this month, 1 last month → delta = 2-1 = 1 (absolute count, not %, matching the mock's "+5" style). Refund rate: 1 remboursement created this month / 3 paid paiements all-time (matches `RemboursementsService.computeStatistics`'s own `totalPaiements = this.paiements.countBy({ statut: 'paid' })`, which is unfiltered by date) = 1/3 = 33.3%.)*

- [ ] **Step 2: Run to verify it fails**

Run: `npm run test:e2e -- analytics.e2e-spec.ts`
Expected: FAIL — `res.body.data` is `{}`, doesn't match.

- [ ] **Step 3: Implement `dashboard()`**

Edit `server/src/analytics/analytics.service.ts` — add the import:

```typescript
import { monthBounds, pctChange, toDateStr } from './analytics.utils';
```

Replace `async dashboard() { return success({}); }` with:

```typescript
  async dashboard() {
    const now = new Date();
    const cur = monthBounds(now.getUTCFullYear(), now.getUTCMonth());
    const prevRef = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
    const prev = monthBounds(prevRef.getUTCFullYear(), prevRef.getUTCMonth());

    const curPaiements = (await this.paiementsService.adminStatistics({
      date_debut: toDateStr(cur.start), date_fin: toDateStr(now),
    })).data as { general: { montant_total: number } };
    const prevPaiements = (await this.paiementsService.adminStatistics({
      date_debut: toDateStr(prev.start), date_fin: toDateStr(prev.endInclusive),
    })).data as { general: { montant_total: number } };

    const bookingsThisMonth = await this.rendezVous.createQueryBuilder('rv')
      .where('rv.date_heure >= :s AND rv.date_heure <= :e', { s: cur.start, e: now })
      .andWhere("rv.statut != 'annule'")
      .getCount();
    const bookingsPrevMonth = await this.rendezVous.createQueryBuilder('rv')
      .where('rv.date_heure >= :s AND rv.date_heure <= :e', { s: prev.start, e: prev.endInclusive })
      .andWhere("rv.statut != 'annule'")
      .getCount();

    const newPraticiensThisMonth = await this.praticiens.createQueryBuilder('pr')
      .where('pr.created_at >= :s AND pr.created_at <= :e', { s: cur.start, e: now })
      .getCount();
    const newPraticiensPrevMonth = await this.praticiens.createQueryBuilder('pr')
      .where('pr.created_at >= :s AND pr.created_at <= :e', { s: prev.start, e: prev.endInclusive })
      .getCount();

    const remboursementsStats = (await this.remboursementsService.adminStatistics({
      date_debut: toDateStr(cur.start), date_fin: toDateStr(now),
    })).data as { taux_remboursement: string };

    return success({
      revenue_this_month: curPaiements.general.montant_total,
      revenue_delta_pct: pctChange(curPaiements.general.montant_total, prevPaiements.general.montant_total),
      bookings_this_month: bookingsThisMonth,
      bookings_delta_pct: pctChange(bookingsThisMonth, bookingsPrevMonth),
      new_praticiens_this_month: newPraticiensThisMonth,
      new_praticiens_delta: newPraticiensThisMonth - newPraticiensPrevMonth,
      refund_rate: remboursementsStats.taux_remboursement,
    });
  }
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm run test:e2e -- analytics.e2e-spec.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add server/src/analytics/analytics.service.ts server/test/analytics.e2e-spec.ts
git commit -m "feat(server): implement admin analytics dashboard endpoint"
```

---

## Task 3: Revenue endpoint

Composes `PaiementsService.adminStatistics()` for the windowed `general` totals, and runs two genuinely new direct queries against the `Paiement` repository: a per-month breakdown that includes commission/net (which `paiements/statistics`'s own `par_mois` doesn't carry — it only has count+total), and a discipline-share breakdown joining `Paiement.praticien.specialite`. Neither query filters by `statut`, matching the exact convention already established by `PaiementsService.adminStatistics()`'s own `general`/`par_mois`/`par_moyen` blocks (none of which filter by `statut` either — every paiement counts toward revenue rollups regardless of payment state).

**Files:**
- Modify: `server/src/analytics/analytics.service.ts`
- Test: `server/test/analytics.e2e-spec.ts`

- [ ] **Step 1: Add the failing test**

Add a new, isolated `describe` block to `server/test/analytics.e2e-spec.ts` (same isolation pattern as Task 2 — its own `app`, so its totals aren't polluted by other tasks' fixtures):

```typescript
describe('analytics: revenue', () => {
  let app: INestApplication;
  let adminToken: string;
  beforeAll(async () => {
    app = await createTestApp({ imports: [AnalyticsModule] });
    adminToken = (await seedAdmin(app, 'analytics-revenue-admin@aura.io')).token;
  });
  afterAll(async () => { await app.close(); });
  const http = () => request(app.getHttpServer());
  const asAdmin = (r: request.Test) => r.set('Authorization', `Bearer ${adminToken}`);

  it('revenue: composes general totals, adds per-month commission/net and discipline share', async () => {
    const ds = app.get(DataSource);
    const now = new Date();
    const y = now.getUTCFullYear();
    const m = now.getUTCMonth();
    const thisMonthStart = new Date(Date.UTC(y, m, 1, 0, 0, 0));
    const prevRef = new Date(Date.UTC(y, m - 1, 1));
    const prevMonthStart = new Date(Date.UTC(prevRef.getUTCFullYear(), prevRef.getUTCMonth(), 1, 0, 0, 0));
    const thisYm = `${y}-${String(m + 1).padStart(2, '0')}`;
    const prevYm = `${prevRef.getUTCFullYear()}-${String(prevRef.getUTCMonth() + 1).padStart(2, '0')}`;

    const reiki = await ds.getRepository(Praticien).save({
      firstname: 'R', lastname: 'P', email: 'rev-reiki@aura.io', telephone: '0600000010',
      ville: 'Paris', niveau: 'Novice', specialite: 'Reiki', mode: 'visio',
      status: 'actif', tarif: 50, experience: 1, bio: 'bio',
    });
    const magnetisme = await ds.getRepository(Praticien).save({
      firstname: 'M', lastname: 'P', email: 'rev-magnetisme@aura.io', telephone: '0600000011',
      ville: 'Lyon', niveau: 'Novice', specialite: 'Magnétisme', mode: 'visio',
      status: 'actif', tarif: 50, experience: 1, bio: 'bio',
    });
    const seededClient = (await seedClientUser(app, 'rev-client@aura.io')).client;

    await ds.getRepository(Paiement).save([
      { reference: 'REV-1', client_id: seededClient.id, praticien_id: reiki.id,
        montant_brut: 100, commission: 10, montant_net_praticien: 90, moyen_paiement: 'Carte',
        statut: 'paid', date_paiement: thisMonthStart },
      { reference: 'REV-2', client_id: seededClient.id, praticien_id: magnetisme.id,
        montant_brut: 50, commission: 5, montant_net_praticien: 45, moyen_paiement: 'Carte',
        statut: 'en_attente', date_paiement: thisMonthStart },
      { reference: 'REV-3', client_id: seededClient.id, praticien_id: reiki.id,
        montant_brut: 150, commission: 15, montant_net_praticien: 135, moyen_paiement: 'Carte',
        statut: 'paid', date_paiement: prevMonthStart },
    ]);

    const res = await asAdmin(http().get('/api/admin/analytics/revenue')).expect(200);
    expect(res.body.data.general).toMatchObject({
      total_transactions: 3, montant_total: 300, commission_totale: 30, net_total: 270,
    });
    const parMois = res.body.data.par_mois;
    expect(parMois.find((r: any) => r.mois === thisYm)).toEqual({ mois: thisYm, total: 150, commission: 15, net: 135 });
    expect(parMois.find((r: any) => r.mois === prevYm)).toEqual({ mois: prevYm, total: 150, commission: 15, net: 135 });
    expect(res.body.data.par_discipline).toEqual([
      { specialite: 'Reiki', total: 250, pct: 83.3 },
      { specialite: 'Magnétisme', total: 50, pct: 16.7 },
    ]);
  });
});
```

*(par_discipline: Reiki total = 100+150=250, Magnétisme = 50, grand total = 300. pct = 250/300*100 = 83.33...→83.3, 50/300*100=16.66...→16.7. par_mois: this month = 100 (paid) + 50 (pending, uncounted by statut) = 150 total, commission 10+5=15, net 90+45=135; previous month = 150/15/135 from the single row. general totals sum all 3 rows regardless of statut, matching `PaiementsService.adminStatistics()`'s own convention.)*

- [ ] **Step 2: Run to verify it fails**

Run: `npm run test:e2e -- analytics.e2e-spec.ts`
Expected: FAIL — `res.body.data.general` is `undefined`.

- [ ] **Step 3: Implement `revenue()`**

Edit `server/src/analytics/analytics.service.ts` — add to the `analytics.utils` import:

```typescript
import { round1, monthBounds, pctChange, toDateStr } from './analytics.utils';
```

Add a module-level constant near the top of the file (after the imports, before the class):

```typescript
const PAIEMENT_MONTH_EXPR = "SUBSTR(CAST(p.date_paiement AS CHAR), 1, 7)";
```

Replace `async revenue() { return success({}); }` with:

```typescript
  async revenue() {
    const now = new Date();
    const windowStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11, 1));

    const base = (await this.paiementsService.adminStatistics({
      date_debut: toDateStr(windowStart),
    })).data as { general: unknown };

    const monthDetail = await this.paiements.createQueryBuilder('p')
      .select(PAIEMENT_MONTH_EXPR, 'mois')
      .addSelect('COALESCE(SUM(p.montant_brut),0)', 'total')
      .addSelect('COALESCE(SUM(p.commission),0)', 'commission')
      .addSelect('COALESCE(SUM(p.montant_net_praticien),0)', 'net')
      .where('p.date_paiement >= :ws', { ws: windowStart })
      .groupBy('mois')
      .orderBy('mois', 'ASC')
      .getRawMany();

    const disciplineRows = await this.paiements.createQueryBuilder('p')
      .innerJoin('p.praticien', 'praticien')
      .select('praticien.specialite', 'specialite')
      .addSelect('COALESCE(SUM(p.montant_brut),0)', 'total')
      .where('p.date_paiement >= :ws', { ws: windowStart })
      .groupBy('praticien.specialite')
      .orderBy('total', 'DESC')
      .getRawMany();
    const disciplineTotal = disciplineRows.reduce((s, r) => s + Number(r.total), 0);

    return success({
      general: base.general,
      par_mois: monthDetail.map((r) => ({
        mois: r.mois, total: Number(r.total), commission: Number(r.commission), net: Number(r.net),
      })),
      par_discipline: disciplineRows.map((r) => ({
        specialite: r.specialite,
        total: Number(r.total),
        pct: disciplineTotal > 0 ? round1((Number(r.total) / disciplineTotal) * 100) : 0,
      })),
    });
  }
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm run test:e2e -- analytics.e2e-spec.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add server/src/analytics/analytics.service.ts server/test/analytics.e2e-spec.ts
git commit -m "feat(server): implement admin analytics revenue endpoint"
```

---

## Task 4: Growth endpoint

Genuinely new queries: monthly signups (reuses the codebase's `SUBSTR(CAST(col AS CHAR),1,7)` month-grouping convention against `Client.created_at`), this-week daily bookings (via `currentWeekRange`/`bucketByWeekday` from Task 1), conversion/activation rates, and average days-to-first-booking.

**Files:**
- Modify: `server/src/analytics/analytics.service.ts`
- Test: `server/test/analytics.e2e-spec.ts`

- [ ] **Step 1: Add the failing test**

Add a new import at the top of `server/test/analytics.e2e-spec.ts`:

```typescript
import { currentWeekRange } from '../src/analytics/analytics.utils';
```

Then add a new, isolated `describe` block (same pattern as Tasks 2–3 — its own `app`, so `signups`/conversion/activation counts aren't polluted by other tasks' fixtures):

```typescript
describe('analytics: growth', () => {
  let app: INestApplication;
  let adminToken: string;
  beforeAll(async () => {
    app = await createTestApp({ imports: [AnalyticsModule] });
    adminToken = (await seedAdmin(app, 'analytics-growth-admin@aura.io')).token;
  });
  afterAll(async () => { await app.close(); });
  const http = () => request(app.getHttpServer());
  const asAdmin = (r: request.Test) => r.set('Authorization', `Bearer ${adminToken}`);

  it('growth: signups by month, this-week daily bookings, conversion/activation rates, avg days to first booking', async () => {
    const ds = app.get(DataSource);
    const now = new Date();
    const twoMonthsAgo = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 2, 1, 0, 0, 0));
    const threeMonthsAgo = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 3, 1, 0, 0, 0));
    const twoMonthsAgoYm = `${twoMonthsAgo.getUTCFullYear()}-${String(twoMonthsAgo.getUTCMonth() + 1).padStart(2, '0')}`;
    const threeMonthsAgoYm = `${threeMonthsAgo.getUTCFullYear()}-${String(threeMonthsAgo.getUTCMonth() + 1).padStart(2, '0')}`;
    const recentDate = new Date(now.getTime() - 12 * 24 * 60 * 60 * 1000); // always < 30 days old

    const prat = await ds.getRepository(Praticien).save({
      firstname: 'G', lastname: 'P', email: 'growth-prat@aura.io', telephone: '0600000020',
      ville: 'Paris', niveau: 'Novice', specialite: 'Reiki', mode: 'visio',
      status: 'actif', tarif: 50, experience: 1, bio: 'bio',
    });

    // 2 months ago: 3 signups, none booked
    await ds.getRepository(Client).save([
      { firstname: 'C1', lastname: 'X', email: 'growth-c1@aura.io', city: 'Paris', created_at: twoMonthsAgo },
      { firstname: 'C2', lastname: 'X', email: 'growth-c2@aura.io', city: 'Paris', created_at: twoMonthsAgo },
      { firstname: 'C3', lastname: 'X', email: 'growth-c3@aura.io', city: 'Paris', created_at: twoMonthsAgo },
    ]);
    // 3 months ago: 2 signups, C4 books 5 days after signup, C5 never books
    const c4 = await ds.getRepository(Client).save({
      firstname: 'C4', lastname: 'X', email: 'growth-c4@aura.io', city: 'Paris', created_at: threeMonthsAgo,
    });
    await ds.getRepository(Client).save({
      firstname: 'C5', lastname: 'X', email: 'growth-c5@aura.io', city: 'Paris', created_at: threeMonthsAgo,
    });
    // Recent (12 days ago): C6 books 10 days ago (2 days after signup, activated), C7 never books
    const c6 = await ds.getRepository(Client).save({
      firstname: 'C6', lastname: 'X', email: 'growth-c6@aura.io', city: 'Paris', created_at: recentDate,
    });
    await ds.getRepository(Client).save({
      firstname: 'C7', lastname: 'X', email: 'growth-c7@aura.io', city: 'Paris', created_at: recentDate,
    });

    await ds.getRepository(RendezVous).save([
      { client_id: c4.id, praticien_id: prat.id,
        date_heure: new Date(threeMonthsAgo.getTime() + 5 * 24 * 60 * 60 * 1000),
        duree_minutes: 60, mode: 'visio', statut: 'confirme', tarif: 50 },
      { client_id: c6.id, praticien_id: prat.id,
        date_heure: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
        duree_minutes: 60, mode: 'visio', statut: 'confirme', tarif: 50 },
    ]);

    // This-week bookings, anchored to the same reference logic the endpoint uses. A dedicated
    // client (C8) is used here rather than reusing C1-C7 — its bookings are dated relative to
    // `weekStart` (which itself is relative to "now"), so its `created_at` must ALSO be anchored
    // to `weekStart` (not to a fixed calendar month) for its contribution to
    // `avg_days_to_first_booking` to be a fixed, hand-computable number regardless of what day
    // the suite happens to run on.
    const { start: weekStart } = currentWeekRange(now);
    const c8 = await ds.getRepository(Client).save({
      firstname: 'C8', lastname: 'X', email: 'growth-c8@aura.io', city: 'Paris',
      created_at: new Date(weekStart.getTime() - 30 * 24 * 60 * 60 * 1000),
    });
    await ds.getRepository(RendezVous).save([
      { client_id: c8.id, praticien_id: prat.id, date_heure: weekStart,
        duree_minutes: 60, mode: 'visio', statut: 'confirme', tarif: 50 },
      { client_id: c8.id, praticien_id: prat.id, date_heure: weekStart,
        duree_minutes: 60, mode: 'visio', statut: 'termine', tarif: 50 },
      { client_id: c8.id, praticien_id: prat.id,
        date_heure: new Date(weekStart.getTime() + 2 * 24 * 60 * 60 * 1000),
        duree_minutes: 60, mode: 'visio', statut: 'confirme', tarif: 50 },
      { client_id: c8.id, praticien_id: prat.id,
        date_heure: new Date(weekStart.getTime() - 24 * 60 * 60 * 1000), // previous week, excluded from bookings_this_week
        duree_minutes: 60, mode: 'visio', statut: 'confirme', tarif: 50 },
      { client_id: c8.id, praticien_id: prat.id, date_heure: weekStart, // cancelled, excluded everywhere
        duree_minutes: 60, mode: 'visio', statut: 'annule', tarif: 50 },
    ]);

    const res = await asAdmin(http().get('/api/admin/analytics/growth')).expect(200);
    const signups = res.body.data.signups;
    expect(signups.find((r: any) => r.mois === twoMonthsAgoYm)).toEqual({ mois: twoMonthsAgoYm, count: 3 });
    expect(signups.find((r: any) => r.mois === threeMonthsAgoYm)).toEqual({ mois: threeMonthsAgoYm, count: 2 });
    expect(res.body.data.bookings_this_week).toEqual([
      { jour: 'Lun', count: 2 }, { jour: 'Mar', count: 0 }, { jour: 'Mer', count: 1 },
      { jour: 'Jeu', count: 0 }, { jour: 'Ven', count: 0 }, { jour: 'Sam', count: 0 }, { jour: 'Dim', count: 0 },
    ]);
    // 8 total clients seeded here (C1-C8); 3 have ever booked (C4, C6, C8) -> 3/8 = 37.5%
    expect(res.body.data.conversion_rate_pct).toBe(37.5);
    // recent (<=30d) clients: C6, C7 (C8's created_at is always <= weekStart-30d <= now-30d, so it
    // never falls inside the 30-day recency window); 1 of 2 activated -> 50%
    expect(res.body.data.activation_rate_pct).toBe(50);
    // avg days to first booking: C4 (5 days), C6 (2 days), C8 (its earliest non-cancelled booking
    // is weekStart-1day, exactly 29 days after its created_at of weekStart-30days) -> (5+2+29)/3 = 12
    expect(res.body.data.avg_days_to_first_booking).toBe(12);
    expect(res.body.data.funnel).toEqual({ visiteurs: null, inscrits: 8, a_reserve: 3 });
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm run test:e2e -- analytics.e2e-spec.ts`
Expected: FAIL — `res.body.data.signups` is `undefined`.

- [ ] **Step 3: Implement `growth()`**

Edit `server/src/analytics/analytics.service.ts` — add to the `typeorm` import:

```typescript
import { In, MoreThanOrEqual, Repository } from 'typeorm';
```

Add to the `analytics.utils` import:

```typescript
import {
  round1, monthBounds, pctChange, toDateStr, currentWeekRange, bucketByWeekday,
} from './analytics.utils';
```

Add a second module-level constant next to `PAIEMENT_MONTH_EXPR`:

```typescript
const CLIENT_MONTH_EXPR = "SUBSTR(CAST(c.created_at AS CHAR), 1, 7)";
```

Replace `async growth() { return success({}); }` with:

```typescript
  async growth() {
    const now = new Date();
    const windowStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11, 1));

    const signupRows = await this.clients.createQueryBuilder('c')
      .select(CLIENT_MONTH_EXPR, 'mois')
      .addSelect('COUNT(c.id)', 'count')
      .where('c.created_at >= :ws', { ws: windowStart })
      .groupBy('mois')
      .orderBy('mois', 'ASC')
      .getRawMany();
    const signups = signupRows.map((r) => ({ mois: r.mois, count: Number(r.count) }));

    const { start: weekStart, end: weekEnd } = currentWeekRange(now);
    const weekRows = await this.rendezVous.createQueryBuilder('rv')
      .select('rv.date_heure', 'date_heure')
      .where('rv.date_heure >= :s AND rv.date_heure < :e', { s: weekStart, e: weekEnd })
      .andWhere("rv.statut != 'annule'")
      .getRawMany();
    const bookingsThisWeek = bucketByWeekday(weekRows.map((r) => new Date(r.date_heure)), weekStart);

    const totalClients = await this.clients.count();
    const bookedAgg = await this.rendezVous.createQueryBuilder('rv')
      .select('COUNT(DISTINCT rv.client_id)', 'c')
      .andWhere("rv.statut != 'annule'")
      .getRawOne();
    const bookedClientsCount = Number(bookedAgg.c);
    const conversionRatePct = totalClients > 0 ? round1((bookedClientsCount / totalClients) * 100) : 0;

    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const recentClients = await this.clients.find({ where: { created_at: MoreThanOrEqual(thirtyDaysAgo) } });
    let activationRatePct = 0;
    if (recentClients.length > 0) {
      const recentIds = recentClients.map((c) => c.id);
      const activatedAgg = await this.rendezVous.createQueryBuilder('rv')
        .select('COUNT(DISTINCT rv.client_id)', 'c')
        .where('rv.client_id IN (:...ids)', { ids: recentIds })
        .andWhere("rv.statut != 'annule'")
        .getRawOne();
      activationRatePct = round1((Number(activatedAgg.c) / recentClients.length) * 100);
    }

    const firstBookingRows = await this.rendezVous.createQueryBuilder('rv')
      .select('rv.client_id', 'client_id')
      .addSelect('MIN(rv.date_heure)', 'first_booking')
      .andWhere("rv.statut != 'annule'")
      .groupBy('rv.client_id')
      .getRawMany();
    let avgDaysToFirstBooking: number | null = null;
    if (firstBookingRows.length > 0) {
      const ids = firstBookingRows.map((r) => Number(r.client_id));
      const clientsById = new Map((await this.clients.findBy({ id: In(ids) })).map((c) => [c.id, c]));
      const diffs: number[] = [];
      for (const row of firstBookingRows) {
        const client = clientsById.get(Number(row.client_id));
        if (!client) continue;
        const days = (new Date(row.first_booking).getTime() - new Date(client.created_at).getTime())
          / (1000 * 60 * 60 * 24);
        diffs.push(Math.max(0, days));
      }
      if (diffs.length > 0) {
        avgDaysToFirstBooking = round1(diffs.reduce((a, b) => a + b, 0) / diffs.length);
      }
    }

    return success({
      signups,
      bookings_this_week: bookingsThisWeek,
      conversion_rate_pct: conversionRatePct,
      activation_rate_pct: activationRatePct,
      avg_days_to_first_booking: avgDaysToFirstBooking,
      funnel: { visiteurs: null, inscrits: totalClients, a_reserve: bookedClientsCount },
    });
  }
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm run test:e2e -- analytics.e2e-spec.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add server/src/analytics/analytics.service.ts server/test/analytics.e2e-spec.ts
git commit -m "feat(server): implement admin analytics growth endpoint"
```

---

## Task 5: Retention endpoint (cohort retention — the trickiest query in this plan)

**The calculation, explained.** "Cohort retention" means: group clients by the calendar month they signed up (`cohort_month`, from `Client.created_at`). For each cohort and each month-offset N (1, 2, 3, 6, 12), compute what % of that cohort's clients had **at least one non-cancelled booking** in the calendar month `cohort_month + N`. A cohort/offset pair is only "measurable" once `cohort_month + N` has actually happened (not in the future relative to now) — offsets that haven't been reached yet report `null`, exactly like the old mock's `m3: null` for cohorts too young to have reached +3 months.

There is no SQL function that reliably computes "add N calendar months to a 'YYYY-MM' string" identically across the production MySQL driver and the better-sqlite3 driver the e2e suite runs on (MySQL has `PERIOD_ADD`/`TIMESTAMPDIFF`; SQLite's `date()` modifiers work differently and round-trip through a different string format). Rather than write two divergent SQL dialects, this query uses the same **portable month-grouping expression already established** by `paiements`/`remboursements` (`SUBSTR(CAST(col AS CHAR), 1, 7)`, confirmed identical across both drivers by direct testing) to get two grouped datasets — clients by signup month, and bookings by month per client — then does the **month-offset arithmetic in plain TypeScript** (`addMonthsToYearMonth`, pure integer math on `year*12+month`, from Task 1) and a **set-membership check** (does this client's booking-months set contain the target month) to compute the percentage. This keeps every piece of the calculation either real SQL or real, precise, testable arithmetic — nothing is approximated.

**Files:**
- Modify: `server/src/analytics/analytics.service.ts`
- Test: `server/test/analytics.e2e-spec.ts`

- [ ] **Step 1: Add the failing test**

Add a new, isolated `describe` block to `server/test/analytics.e2e-spec.ts` (same isolation pattern as Tasks 2–4 — this one matters most, since cohort membership is computed from *every* client row in the database with no scoping filter):

```typescript
describe('analytics: retention', () => {
  let app: INestApplication;
  let adminToken: string;
  beforeAll(async () => {
    app = await createTestApp({ imports: [AnalyticsModule] });
    adminToken = (await seedAdmin(app, 'analytics-retention-admin@aura.io')).token;
  });
  afterAll(async () => { await app.close(); });
  const http = () => request(app.getHttpServer());
  const asAdmin = (r: request.Test) => r.set('Authorization', `Bearer ${adminToken}`);

  it('retention: signup-month cohort table, weighted overall + curve, repeat distribution, CLV, churn', async () => {
    const ds = app.get(DataSource);
    const now = new Date();
    const cohortAMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 3, 1, 0, 0, 0));
    const cohortBMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1, 0, 0, 0));
    const cohortAYm = `${cohortAMonth.getUTCFullYear()}-${String(cohortAMonth.getUTCMonth() + 1).padStart(2, '0')}`;
    const cohortBYm = `${cohortBMonth.getUTCFullYear()}-${String(cohortBMonth.getUTCMonth() + 1).padStart(2, '0')}`;

    const prat = await ds.getRepository(Praticien).save({
      firstname: 'R', lastname: 'P', email: 'ret-prat@aura.io', telephone: '0600000030',
      ville: 'Paris', niveau: 'Novice', specialite: 'Reiki', mode: 'visio',
      status: 'actif', tarif: 50, experience: 1, bio: 'bio',
    });

    // Cohort A (3 months ago): A1 retained at m1/m2/m3, A2 retained only at m1
    const a1 = await ds.getRepository(Client).save({
      firstname: 'A1', lastname: 'X', email: 'ret-a1@aura.io', city: 'Paris', created_at: cohortAMonth,
    });
    const a2 = await ds.getRepository(Client).save({
      firstname: 'A2', lastname: 'X', email: 'ret-a2@aura.io', city: 'Paris', created_at: cohortAMonth,
    });
    // Cohort B (1 month ago): B1, never books
    await ds.getRepository(Client).save({
      firstname: 'B1', lastname: 'X', email: 'ret-b1@aura.io', city: 'Paris', created_at: cohortBMonth,
    });

    const monthPlus = (base: Date, n: number) => new Date(Date.UTC(
      base.getUTCFullYear(), base.getUTCMonth() + n, 15, 0, 0, 0,
    ));
    await ds.getRepository(RendezVous).save([
      // A1: bookings in cohortA+1, +2, +3
      { client_id: a1.id, praticien_id: prat.id, date_heure: monthPlus(cohortAMonth, 1),
        duree_minutes: 60, mode: 'visio', statut: 'confirme', tarif: 50 },
      { client_id: a1.id, praticien_id: prat.id, date_heure: monthPlus(cohortAMonth, 2),
        duree_minutes: 60, mode: 'visio', statut: 'confirme', tarif: 50 },
      { client_id: a1.id, praticien_id: prat.id, date_heure: monthPlus(cohortAMonth, 3),
        duree_minutes: 60, mode: 'visio', statut: 'confirme', tarif: 50 },
      // A2: booking only in cohortA+1
      { client_id: a2.id, praticien_id: prat.id, date_heure: monthPlus(cohortAMonth, 1),
        duree_minutes: 60, mode: 'visio', statut: 'confirme', tarif: 50 },
    ]);

    // paid paiements for CLV: A1 = 100+150=250, A2 = 80
    await ds.getRepository(Paiement).save([
      { reference: 'RET-1', client_id: a1.id, praticien_id: prat.id, montant_brut: 100, commission: 10,
        montant_net_praticien: 90, moyen_paiement: 'Carte', statut: 'paid', date_paiement: monthPlus(cohortAMonth, 1) },
      { reference: 'RET-2', client_id: a1.id, praticien_id: prat.id, montant_brut: 150, commission: 15,
        montant_net_praticien: 135, moyen_paiement: 'Carte', statut: 'paid', date_paiement: monthPlus(cohortAMonth, 2) },
      { reference: 'RET-3', client_id: a2.id, praticien_id: prat.id, montant_brut: 80, commission: 8,
        montant_net_praticien: 72, moyen_paiement: 'Carte', statut: 'paid', date_paiement: monthPlus(cohortAMonth, 1) },
    ]);

    const res = await asAdmin(http().get('/api/admin/analytics/retention')).expect(200);
    const cohorts = res.body.data.cohorts;
    expect(cohorts).toEqual([
      { cohort: cohortAYm, size: 2, m1: 100, m2: 50, m3: 50, m6: null, m12: null },
      { cohort: cohortBYm, size: 1, m1: 0, m2: null, m3: null, m6: null, m12: null },
    ]);
    expect(res.body.data.overall).toEqual({
      retention_30j_pct: 66.7,   // (2 retained + 0 retained) / (2 + 1) at offset 1
      retention_90j_pct: 50,     // 1/2 at offset 3 (only cohort A eligible)
      retention_12m_pct: null,   // no cohort has reached +12 months yet
      curve: [
        { offset: 'M0', pct: 100 }, { offset: 'M1', pct: 66.7 }, { offset: 'M2', pct: 50 },
        { offset: 'M3', pct: 50 }, { offset: 'M6', pct: null }, { offset: 'M12', pct: null },
      ],
    });
    expect(res.body.data.repeat_bookings).toEqual([
      { label: '1 séance', count: 1, pct: 50 },
      { label: '2 à 3 séances', count: 1, pct: 50 },
      { label: '4 à 6 séances', count: 0, pct: 0 },
      { label: '7 séances et +', count: 0, pct: 0 },
    ]);
    expect(res.body.data.repeat_rate_pct).toBe(50);
    expect(res.body.data.avg_lifetime_value).toBe(165);
    expect(res.body.data.churn_rate_pct).toBe(50);
    expect(res.body.data.churn_reasons).toBeNull();
  });
});
```

*(Hand-verified: Cohort A size=2 — A1 booked in +1/+2/+3 (3 bookings, "2 à 3 séances" bucket), A2 booked only in +1 (1 booking, "1 séance" bucket). m1 = 2/2=100%, m2 = 1/2=50% (only A1), m3 = 1/2=50% (only A1). m6/m12 targets are 3+ months in the future relative to "now" (cohort is only 3 months old) → null. Cohort B size=1, B1 never books: m1 target = cohortB+1 = the current month, which is `<= nowYm` (equal, not future) so it IS measurable = 0%; m2 target = next month, future → null. Weighted overall M1 = (2 retained from A + 0 from B) / (2+1) = 2/3 = 66.7%. M2/M3 = only cohort A is eligible (B's target is future) = 1/2 = 50%. Repeat distribution: 2 booked clients total (A1, A2; B1 never booked so it's absent from the booking-count query entirely) — A1's 3 bookings → "2 à 3 séances", A2's 1 booking → "1 séance". repeat_rate_pct = clients with >1 booking (A1 only) / booked clients (2) = 50%. avg_lifetime_value = (250 + 80) / 2 paid-paying clients = 165. churn_rate_pct = 100 - retention_90j_pct(50) = 50.)*

- [ ] **Step 2: Run to verify it fails**

Run: `npm run test:e2e -- analytics.e2e-spec.ts`
Expected: FAIL — `res.body.data.cohorts` is `undefined`.

- [ ] **Step 3: Implement `retention()`**

Edit `server/src/analytics/analytics.service.ts` — add to the `analytics.utils` import:

```typescript
import {
  round1, monthBounds, pctChange, toDateStr, currentWeekRange, bucketByWeekday,
  currentYearMonth, addMonthsToYearMonth,
} from './analytics.utils';
```

Add a third module-level constant next to `PAIEMENT_MONTH_EXPR`/`CLIENT_MONTH_EXPR`:

```typescript
const RDV_MONTH_EXPR = "SUBSTR(CAST(rv.date_heure AS CHAR), 1, 7)";
```

Add two private class fields, right after the constructor:

```typescript
  private readonly MONTH_OFFSETS = [1, 2, 3, 6, 12];
  private readonly COHORT_COUNT = 6;
```

Replace `async retention() { return success({}); }` with:

```typescript
  async retention() {
    const clientRows = await this.clients.createQueryBuilder('c')
      .select('c.id', 'id')
      .addSelect(CLIENT_MONTH_EXPR, 'cohort_month')
      .getRawMany();

    const cohortMap = new Map<string, number[]>();
    for (const row of clientRows) {
      const key = String(row.cohort_month);
      if (!cohortMap.has(key)) cohortMap.set(key, []);
      cohortMap.get(key)!.push(Number(row.id));
    }
    const cohortMonths = [...cohortMap.keys()].sort().slice(-this.COHORT_COUNT);

    const allIds = cohortMonths.flatMap((month) => cohortMap.get(month)!);
    const bookingMonthsByClient = new Map<number, Set<string>>();
    if (allIds.length > 0) {
      const bookingRows = await this.rendezVous.createQueryBuilder('rv')
        .select('rv.client_id', 'client_id')
        .addSelect(RDV_MONTH_EXPR, 'booking_month')
        .where('rv.client_id IN (:...ids)', { ids: allIds })
        .andWhere("rv.statut != 'annule'")
        .groupBy('rv.client_id')
        .addGroupBy('booking_month')
        .getRawMany();
      for (const row of bookingRows) {
        const cid = Number(row.client_id);
        if (!bookingMonthsByClient.has(cid)) bookingMonthsByClient.set(cid, new Set());
        bookingMonthsByClient.get(cid)!.add(String(row.booking_month));
      }
    }

    const nowYm = currentYearMonth();
    const retainedCountAt = (cohortMonth: string, offset: number): number | null => {
      const targetMonth = addMonthsToYearMonth(cohortMonth, offset);
      if (targetMonth > nowYm) return null;
      const ids = cohortMap.get(cohortMonth)!;
      return ids.filter((id) => bookingMonthsByClient.get(id)?.has(targetMonth)).length;
    };

    const cohorts = cohortMonths.map((cohortMonth) => {
      const ids = cohortMap.get(cohortMonth)!;
      const size = ids.length;
      const row: { cohort: string; size: number; [key: string]: number | string | null } = {
        cohort: cohortMonth, size,
      };
      for (const offset of this.MONTH_OFFSETS) {
        const retained = retainedCountAt(cohortMonth, offset);
        row[`m${offset}`] = retained === null ? null : (size > 0 ? round1((retained / size) * 100) : 0);
      }
      return row;
    });

    const overallByOffset: Record<number, number | null> = {};
    for (const offset of this.MONTH_OFFSETS) {
      let retainedSum = 0;
      let sizeSum = 0;
      for (const cohortMonth of cohortMonths) {
        const retained = retainedCountAt(cohortMonth, offset);
        if (retained === null) continue;
        retainedSum += retained;
        sizeSum += cohortMap.get(cohortMonth)!.length;
      }
      overallByOffset[offset] = sizeSum > 0 ? round1((retainedSum / sizeSum) * 100) : null;
    }
    const curve = [
      { offset: 'M0', pct: 100 },
      ...this.MONTH_OFFSETS.map((o) => ({ offset: `M${o}`, pct: overallByOffset[o] })),
    ];

    const bookingCountRows = await this.rendezVous.createQueryBuilder('rv')
      .select('rv.client_id', 'client_id')
      .addSelect('COUNT(rv.id)', 'count')
      .andWhere("rv.statut != 'annule'")
      .groupBy('rv.client_id')
      .getRawMany();
    const buckets = [
      { label: '1 séance', min: 1, max: 1, count: 0 },
      { label: '2 à 3 séances', min: 2, max: 3, count: 0 },
      { label: '4 à 6 séances', min: 4, max: 6, count: 0 },
      { label: '7 séances et +', min: 7, max: Infinity, count: 0 },
    ];
    let bookedClientsTotal = 0;
    let repeatClientsCount = 0;
    for (const row of bookingCountRows) {
      const c = Number(row.count);
      bookedClientsTotal += 1;
      if (c > 1) repeatClientsCount += 1;
      const bucket = buckets.find((b) => c >= b.min && c <= b.max);
      if (bucket) bucket.count += 1;
    }
    const repeatBookings = buckets.map((b) => ({
      label: b.label,
      count: b.count,
      pct: bookedClientsTotal > 0 ? round1((b.count / bookedClientsTotal) * 100) : 0,
    }));
    const repeatRatePct = bookedClientsTotal > 0 ? round1((repeatClientsCount / bookedClientsTotal) * 100) : 0;

    const clvRows = await this.paiements.createQueryBuilder('p')
      .select('p.client_id', 'client_id')
      .addSelect('SUM(p.montant_brut)', 'total')
      .where("p.statut = 'paid'")
      .groupBy('p.client_id')
      .getRawMany();
    const avgLifetimeValue = clvRows.length > 0
      ? Math.round((clvRows.reduce((s, r) => s + Number(r.total), 0) / clvRows.length) * 100) / 100
      : 0;

    const retention90 = overallByOffset[3];
    const churnRatePct = retention90 != null ? round1(100 - retention90) : null;

    return success({
      cohorts,
      overall: {
        retention_30j_pct: overallByOffset[1],
        retention_90j_pct: overallByOffset[3],
        retention_12m_pct: overallByOffset[12],
        curve,
      },
      repeat_bookings: repeatBookings,
      repeat_rate_pct: repeatRatePct,
      avg_lifetime_value: avgLifetimeValue,
      churn_rate_pct: churnRatePct,
      churn_reasons: null,
    });
  }
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm run test:e2e -- analytics.e2e-spec.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Run the full server test suite to confirm no regressions**

Run: `npm run test:e2e` (from `server/`)
Expected: all suites PASS, including `paiements.e2e-spec.ts` and `remboursements.e2e-spec.ts` (unaffected by the new `exports: [...]` entries, which are additive).

- [ ] **Step 6: Commit**

```bash
git add server/src/analytics/analytics.service.ts server/test/analytics.e2e-spec.ts
git commit -m "feat(server): implement admin analytics retention endpoint with cohort calculation"
```

---

## Task 6: Wire `web/app/admin/page.jsx` (main dashboard)

Replaces the `analytics` mock import and 4 hardcoded StatCard literals with 4 `useQuery` calls (dashboard, revenue, growth, retention — the dashboard's Donut needs `retention.overall.retention_90j_pct`, its LineChart needs `revenue.par_mois`, its BarChart needs `growth.bookings_this_week`). `bookings`, `transactions`, `reports`, `adminNotifications` imports are untouched — those are separate subsystems, not part of `analytics`.

**Files:**
- Modify: `web/app/admin/page.jsx`

- [ ] **Step 1: Replace the file**

Replace `web/app/admin/page.jsx` in full:

```jsx
'use client';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { StatCard } from '@/components/ui/StatCard';
import { PageHead } from '@/components/ui/PageHead';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { BarChart, LineChart, Donut } from '@/components/ui/MiniChart';
import { ModalButton } from '@/components/ui/ModalButton';
import { bookings, transactions, reports, adminNotifications } from '@/lib/data/admin';
import { practitioners } from '@/lib/data/practitioners';
import { api } from '@/lib/api';
import { euro, dateFr, tone } from '@/lib/format';

export default function AdminDashboard() {
  const recent = bookings.slice(0, 6);
  const pendingVerif = practitioners.slice(0, 4);

  const { data: dashboardData } = useQuery({
    queryKey: ['admin', 'analytics', 'dashboard'],
    queryFn: () => api.get('/admin/analytics/dashboard'),
  });
  const { data: revenueData } = useQuery({
    queryKey: ['admin', 'analytics', 'revenue'],
    queryFn: () => api.get('/admin/analytics/revenue'),
  });
  const { data: growthData } = useQuery({
    queryKey: ['admin', 'analytics', 'growth'],
    queryFn: () => api.get('/admin/analytics/growth'),
  });
  const { data: retentionData } = useQuery({
    queryKey: ['admin', 'analytics', 'retention'],
    queryFn: () => api.get('/admin/analytics/retention'),
  });

  const dash = dashboardData?.data;
  const revenueMonthly = (revenueData?.data?.par_mois ?? []).map((r) => r.total);
  const bookingsWeekly = growthData?.data?.bookings_this_week ?? [];
  const retention90 = retentionData?.data?.overall?.retention_90j_pct;

  return (
    <>
      <PageHead title="Tableau de bord" subtitle="Bonjour Aïcha — voici l'activité d'Aura aujourd'hui."
        actions={<>
          <ModalButton modal="exportData" className="btn btn-soft btn-sm"><Icon name="download" size={15} /> Exporter</ModalButton>
          <ModalButton modal="sendNotification" className="btn btn-primary btn-sm"><Icon name="bell" size={15} /> Notifier</ModalButton>
        </>} />

      <div className="grid grid-4" style={{ marginBottom: 24 }}>
        <StatCard label="Revenu du mois" value={euro(dash?.revenue_this_month)}
          delta={dash?.revenue_delta_pct != null ? `${dash.revenue_delta_pct > 0 ? '+' : ''}${dash.revenue_delta_pct}%` : undefined}
          deltaDir={dash?.revenue_delta_pct != null && dash.revenue_delta_pct < 0 ? 'down' : 'up'}
          icon="euro" />
        <StatCard label="Réservations" value={dash?.bookings_this_month ?? '—'}
          delta={dash?.bookings_delta_pct != null ? `${dash.bookings_delta_pct > 0 ? '+' : ''}${dash.bookings_delta_pct}%` : undefined}
          deltaDir={dash?.bookings_delta_pct != null && dash.bookings_delta_pct < 0 ? 'down' : 'up'}
          icon="calendar" />
        <StatCard label="Nouveaux praticiens" value={dash?.new_praticiens_this_month ?? '—'}
          delta={dash?.new_praticiens_delta != null ? `${dash.new_praticiens_delta > 0 ? '+' : ''}${dash.new_praticiens_delta}` : undefined}
          deltaDir={dash?.new_praticiens_delta != null && dash.new_praticiens_delta < 0 ? 'down' : 'up'}
          icon="sparkle" />
        <StatCard label="Taux de remboursement" value={dash?.refund_rate ?? '—'} icon="shield" />
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1.6fr 1fr', gap: 20, marginBottom: 24 }}>
        <div className="card card-pad">
          <div className="between" style={{ marginBottom: 18 }}>
            <div><div className="eyebrow">12 derniers mois</div><h3 className="h-3" style={{ marginTop: 4 }}>Revenu</h3></div>
            <Link href="/admin/analytique/revenus" className="more">Détails →</Link>
          </div>
          <LineChart data={revenueMonthly} height={180} />
        </div>
        <div className="card card-pad">
          <h3 className="h-3" style={{ marginBottom: 18 }}>Réservations / semaine</h3>
          <BarChart data={bookingsWeekly.map((d) => d.count)} labels={bookingsWeekly.map((d) => d.jour)} height={150} color="var(--sage-2)" />
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1.6fr 1fr', gap: 20 }}>
        {/* Recent bookings */}
        <div className="card" style={{ overflow: 'hidden' }}>
          <div className="between" style={{ padding: '18px 20px' }}>
            <h3 className="h-3">Réservations récentes</h3>
            <Link href="/admin/reservations" className="more">Tout voir →</Link>
          </div>
          <table className="table">
            <thead><tr><th>Réf.</th><th>Praticien</th><th>Client</th><th>Date</th><th>Montant</th><th>Statut</th></tr></thead>
            <tbody>
              {recent.map((b) => (
                <tr key={b.id} className="clickable">
                  <td className="table-cell-main">{b.ref}</td>
                  <td><div className="row gap-2"><Avatar src={b.practitionerPhoto} name={b.practitionerName} size={28} />{b.practitionerName}</div></td>
                  <td>{b.clientName}</td>
                  <td className="small">{dateFr(b.date)}</td>
                  <td>{euro(b.price)}</td>
                  <td><Badge variant={tone(b.status)}>{b.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Side column */}
        <div className="stack gap-5">
          <div className="card card-pad">
            <div className="between" style={{ marginBottom: 14 }}>
              <h3 className="h-3">File de vérification</h3>
              <Badge variant="warning">{pendingVerif.length}</Badge>
            </div>
            <div className="stack gap-3">
              {pendingVerif.map((p) => (
                <Link key={p.id} href="/admin/praticiens/verification" className="row gap-3">
                  <Avatar src={p.photo} name={p.name} size={36} tone={p.tone} />
                  <div className="flex-1"><div style={{ fontWeight: 500, fontSize: 14 }}>{p.name}</div><div className="tiny">{p.specialties[0]} · {p.city}</div></div>
                  <Icon name="chevronRight" size={16} color="var(--muted)" />
                </Link>
              ))}
            </div>
          </div>

          <div className="card card-pad center">
            <h3 className="h-3" style={{ marginBottom: 14 }}>Rétention 90j</h3>
            <div className="row" style={{ justifyContent: 'center' }}>
              <Donut value={retention90 ?? 0} label="reviennent" />
            </div>
          </div>
        </div>
      </div>

      {/* Alerts + reports */}
      <div className="grid grid-2" style={{ marginTop: 24 }}>
        <div className="card card-pad">
          <h3 className="h-3" style={{ marginBottom: 14 }}>Alertes système</h3>
          <div className="stack gap-3">
            {adminNotifications.map((n) => (
              <div key={n.id} className="row gap-3" style={{ alignItems: 'flex-start' }}>
                <span className={`kpi-dot`} style={{ marginTop: 6, background: n.kind === 'danger' ? 'var(--danger)' : n.kind === 'warning' ? 'var(--gold)' : n.kind === 'success' ? 'var(--sage-2)' : 'var(--sky-2)' }} />
                <div><div style={{ fontWeight: 500, fontSize: 14 }}>{n.title}</div><div className="small">{n.body}</div><div className="tiny" style={{ marginTop: 2 }}>{n.when}</div></div>
              </div>
            ))}
          </div>
        </div>
        <div className="card" style={{ overflow: 'hidden' }}>
          <div className="between" style={{ padding: '18px 20px' }}>
            <h3 className="h-3">Signalements à traiter</h3>
            <Link href="/admin/signalements" className="more">Modérer →</Link>
          </div>
          <table className="table">
            <thead><tr><th>Type</th><th>Sujet</th><th>Priorité</th></tr></thead>
            <tbody>
              {reports.filter((r) => r.status === 'pending').map((r) => (
                <tr key={r.id}><td><Badge variant="neutral">{r.type}</Badge></td><td className="small">{r.target}</td><td><Badge variant={r.priority === 'haute' ? 'danger' : 'warning'}>{r.priority}</Badge></td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
```

*(`transactions` was imported by the original file but never actually used in its JSX — dropped along with the switch to `'use client'`, which this page needs now that it calls `useQuery`. The "Taux de litige" StatCard is relabeled "Taux de remboursement" per the Context section's dispute-rate gap.)*

- [ ] **Step 2: Verify**

Run (from `web/`): `npm run lint` then `npm run build`.

Manual walkthrough: dashboard StatCards show real current-month numbers with real deltas (or no delta badge when a metric has none); the revenue line chart and weekly bookings bar chart populate from real endpoints; the retention donut shows the real 90-day cohort retention percentage.

- [ ] **Step 3: Commit**

```bash
git add web/app/admin/page.jsx
git commit -m "feat(web): wire admin dashboard StatCards and charts to real analytics endpoints"
```

---

## Task 7: Wire `web/app/admin/analytique/page.jsx` (analytics overview)

Replaces `analytics` (admin.js) and `practitioners` (top-praticiens ranking) with real endpoint calls. Top praticiens now comes from `GET /paiements/statistics`'s existing `top_praticiens` (already real, already `AdminGuard`, already returns up to 5 ranked by revenue — composed, not duplicated).

**Files:**
- Modify: `web/app/admin/analytique/page.jsx`

- [ ] **Step 1: Replace the file**

Replace `web/app/admin/analytique/page.jsx` in full:

```jsx
'use client';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { PageHead } from '@/components/ui/PageHead';
import { StatCard } from '@/components/ui/StatCard';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { ModalButton } from '@/components/ui/ModalButton';
import { BarChart, LineChart, Donut } from '@/components/ui/MiniChart';
import { api } from '@/lib/api';
import { euro } from '@/lib/format';

const TONE_VAR = { sky: 'var(--sky-2)', violet: 'var(--violet-2)', sage: 'var(--sage-2)', gold: 'var(--gold)' };
const DISCIPLINE_TONES = ['sky', 'violet', 'sage', 'gold'];

const SUBPAGES = [
  { href: '/admin/analytique/revenus', icon: 'euro', tint: 'tint-violet', glyph: 'var(--violet-2)', title: 'Revenus', desc: 'Détail mensuel, commissions, net et MRR.' },
  { href: '/admin/analytique/croissance', icon: 'chart', tint: 'tint-sky', glyph: 'var(--sky-2)', title: 'Croissance', desc: 'Inscriptions, entonnoir et acquisition.' },
  { href: '/admin/analytique/retention', icon: 'users', tint: 'tint-sage', glyph: 'var(--sage-2)', title: 'Rétention', desc: 'Fidélité, réservations répétées et churn.' },
];

export default function AnalyticsOverviewPage() {
  const { data: dashboardData } = useQuery({
    queryKey: ['admin', 'analytics', 'dashboard'],
    queryFn: () => api.get('/admin/analytics/dashboard'),
  });
  const { data: revenueData } = useQuery({
    queryKey: ['admin', 'analytics', 'revenue'],
    queryFn: () => api.get('/admin/analytics/revenue'),
  });
  const { data: growthData } = useQuery({
    queryKey: ['admin', 'analytics', 'growth'],
    queryFn: () => api.get('/admin/analytics/growth'),
  });
  const { data: retentionData } = useQuery({
    queryKey: ['admin', 'analytics', 'retention'],
    queryFn: () => api.get('/admin/analytics/retention'),
  });
  const { data: paiementsStatsData } = useQuery({
    queryKey: ['admin', 'paiements', 'statistics'],
    queryFn: () => api.get('/paiements/statistics'),
  });

  const dash = dashboardData?.data;
  const revenue = revenueData?.data;
  const growth = growthData?.data;
  const retention = retentionData?.data;
  const revenueMonthly = (revenue?.par_mois ?? []).map((r) => r.total);
  const revenueLabels = (revenue?.par_mois ?? []).map((r) => r.mois.slice(5));
  const bookingsWeekly = growth?.bookings_this_week ?? [];
  const disciplineShare = revenue?.par_discipline ?? [];
  const lastSignups = growth?.signups?.[growth.signups.length - 1]?.count ?? 0;
  const topPraticiens = paiementsStatsData?.data?.top_praticiens ?? [];

  return (
    <>
      <PageHead
        title="Analytique"
        subtitle="Vue d’ensemble de la performance d’Aura."
        crumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Analytique' }]}
        actions={<>
          <select className="input btn-sm" style={{ width: 'auto', minWidth: 150 }} defaultValue="12m">
            <option value="7j">7 derniers jours</option>
            <option value="30j">30 derniers jours</option>
            <option value="12m">12 derniers mois</option>
            <option value="all">Depuis le début</option>
          </select>
          <ModalButton modal="exportData" className="btn btn-primary btn-sm"><Icon name="download" size={15} /> Exporter</ModalButton>
        </>}
      />

      <div className="grid grid-4" style={{ marginBottom: 24 }}>
        <StatCard label="Revenu (12 mois)" value={euro(revenue?.general?.montant_total)} icon="euro" />
        <StatCard label="Réservations (mois)" value={dash?.bookings_this_month ?? '—'} icon="calendar" />
        <StatCard label="Nouveaux clients" value={lastSignups} icon="users" />
        <StatCard label="Taux de conversion" value={growth?.conversion_rate_pct != null ? `${growth.conversion_rate_pct}%` : '—'} icon="chart" />
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1.6fr 1fr', gap: 20, marginBottom: 24 }}>
        <div className="card card-pad">
          <div className="between" style={{ marginBottom: 18 }}>
            <div><div className="eyebrow">12 derniers mois</div><h3 className="h-3" style={{ marginTop: 4 }}>Revenu mensuel</h3></div>
            <Link href="/admin/analytique/revenus" className="more">Détails →</Link>
          </div>
          <LineChart data={revenueMonthly} height={190} />
          <div className="row" style={{ gap: 8, marginTop: 8 }}>
            {revenueLabels.map((l, i) => <div key={i} className="flex-1 tiny center">{l}</div>)}
          </div>
        </div>
        <div className="card card-pad center" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
          <h3 className="h-3" style={{ marginBottom: 16 }}>Rétention 90 j</h3>
          <Donut value={retention?.overall?.retention_90j_pct ?? 0} label="reviennent" size={140} />
          <Link href="/admin/analytique/retention" className="more" style={{ marginTop: 16 }}>Analyser →</Link>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
        <div className="card card-pad">
          <h3 className="h-3" style={{ marginBottom: 18 }}>Réservations / semaine</h3>
          <BarChart data={bookingsWeekly.map((d) => d.count)} labels={bookingsWeekly.map((d) => d.jour)} height={170} color="var(--sage-2)" />
        </div>
        <div className="card card-pad">
          <div className="between" style={{ marginBottom: 18 }}>
            <h3 className="h-3">Répartition par discipline</h3>
            <span className="tiny">part du chiffre</span>
          </div>
          <div className="stack gap-4">
            {disciplineShare.map((d, i) => (
              <div key={d.specialite}>
                <div className="between" style={{ marginBottom: 6 }}>
                  <span className="small">{d.specialite}</span>
                  <strong className="small">{d.pct}%</strong>
                </div>
                <div style={{ height: 8, borderRadius: 999, background: 'var(--line)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${d.pct}%`, maxWidth: '100%', background: TONE_VAR[DISCIPLINE_TONES[i % DISCIPLINE_TONES.length]], borderRadius: 999 }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1.6fr 1fr', gap: 20, marginBottom: 24 }}>
        <div className="card" style={{ overflow: 'hidden' }}>
          <div className="between" style={{ padding: '18px 20px' }}>
            <h3 className="h-3">Top praticiens</h3>
            <Link href="/admin/praticiens" className="more">Tout voir →</Link>
          </div>
          <table className="table">
            <thead><tr><th>Praticien</th><th>Discipline</th><th>Séances</th><th>Revenu généré</th></tr></thead>
            <tbody>
              {topPraticiens.map((r) => (
                <tr key={r.praticien_id}>
                  <td><div className="row gap-2"><Avatar name={r.praticien ? `${r.praticien.firstname} ${r.praticien.lastname}` : '—'} size={28} />{r.praticien ? `${r.praticien.firstname} ${r.praticien.lastname}` : '—'}</div></td>
                  <td className="small">{r.praticien?.specialite ?? '—'}</td>
                  <td>{r.count}</td>
                  <td><strong>{euro(r.total)}</strong></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="stack gap-5">
          {SUBPAGES.map((s) => (
            <Link key={s.href} href={s.href} className="card card-pad card-hover">
              <div className="row gap-3">
                <span className={`tile-icon ${s.tint}`}><Icon name={s.icon} size={18} color={s.glyph} /></span>
                <div className="flex-1">
                  <div style={{ fontWeight: 600 }}>{s.title}</div>
                  <div className="tiny">{s.desc}</div>
                </div>
                <Icon name="chevronRight" size={16} color="var(--muted)" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
```

*(Discipline bar widths switched from the mock's `pct * 3.5` fudge factor to plain `pct%` — since `par_discipline`'s percentages are real shares of a real total, they sum to ~100% and don't need a multiplier to look visually full. Discipline tones now cycle through a fixed 4-color palette by index instead of a per-name lookup, since discipline names are now real `specialite` strings from the database, not the mock's fixed 6-name list.)*

- [ ] **Step 2: Verify**

Run (from `web/`): `npm run lint` then `npm run build`.

Manual walkthrough: overview StatCards, revenue chart, retention donut, weekly bookings, discipline share bars, and top praticiens table all populate from real data.

- [ ] **Step 3: Commit**

```bash
git add web/app/admin/analytique/page.jsx
git commit -m "feat(web): wire admin analytics overview page to real endpoints"
```

---

## Task 8: Wire `web/app/admin/analytique/revenus/page.jsx`

Replaces `analytics` with the `/admin/analytics/revenue` endpoint. **`subscriptions` import is deliberately kept** — the MRR/ARR/subscriber card depends on 08e's `subscriptions` table, which does not exist yet (see Context section, gap #4).

**Files:**
- Modify: `web/app/admin/analytique/revenus/page.jsx`

- [ ] **Step 1: Replace the file**

Replace `web/app/admin/analytique/revenus/page.jsx` in full:

```jsx
'use client';
import { useQuery } from '@tanstack/react-query';
import { PageHead } from '@/components/ui/PageHead';
import { StatCard } from '@/components/ui/StatCard';
import { Icon } from '@/components/ui/Icon';
import { ModalButton } from '@/components/ui/ModalButton';
import { LineChart } from '@/components/ui/MiniChart';
import { subscriptions } from '@/lib/data/admin';
import { api } from '@/lib/api';
import { euro } from '@/lib/format';

const TONE_VAR = { sky: 'var(--sky-2)', violet: 'var(--violet-2)', sage: 'var(--sage-2)', gold: 'var(--gold)' };
const DISCIPLINE_TONES = ['sky', 'violet', 'sage', 'gold'];

export default function RevenueAnalyticsPage() {
  const { data: revenueData } = useQuery({
    queryKey: ['admin', 'analytics', 'revenue'],
    queryFn: () => api.get('/admin/analytics/revenue'),
  });
  const revenue = revenueData?.data;
  const parMois = revenue?.par_mois ?? [];
  const byDiscipline = revenue?.par_discipline ?? [];
  const general = revenue?.general;

  // MRR/ARR/subscriber counts still come from the `subscriptions` mock — the real
  // `subscriptions` table is 08e's job and doesn't exist yet. Not part of this endpoint.
  const mrr = subscriptions.filter((s) => s.status !== 'cancelled').reduce((s, x) => s + x.price, 0);
  const arr = mrr * 12;

  return (
    <>
      <PageHead
        title="Revenus"
        subtitle="Analyse détaillée du chiffre d’affaires."
        crumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Analytique', href: '/admin/analytique' }, { label: 'Revenus' }]}
        actions={<ModalButton modal="exportData" className="btn btn-primary btn-sm"><Icon name="download" size={15} /> Exporter</ModalButton>}
      />

      <div className="grid grid-4" style={{ marginBottom: 24 }}>
        <StatCard label="Chiffre d’affaires" value={euro(general?.montant_total)} icon="euro" />
        <StatCard label="Commissions" value={euro(general?.commission_totale)} icon="card" />
        <StatCard label="Reversé aux praticiens" value={euro(general?.net_total)} icon="users" />
        <StatCard label="MRR abonnements" value={euro(mrr)} icon="sparkle" hint="Basé sur le mock — dépend de 08e" />
      </div>

      <div className="card card-pad" style={{ marginBottom: 24 }}>
        <div className="between" style={{ marginBottom: 18 }}>
          <div><div className="eyebrow">12 derniers mois</div><h3 className="h-3" style={{ marginTop: 4 }}>Chiffre d’affaires mensuel</h3></div>
          <span className="price">{euro(parMois[parMois.length - 1]?.total)} <small>/ dernier mois</small></span>
        </div>
        <LineChart data={parMois.map((r) => r.total)} height={220} />
        <div className="row" style={{ gap: 8, marginTop: 8 }}>
          {parMois.map((r) => <div key={r.mois} className="flex-1 tiny center">{r.mois.slice(5)}</div>)}
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1.5fr 1fr', gap: 20, marginBottom: 24 }}>
        <div className="card" style={{ overflow: 'hidden' }}>
          <div className="between" style={{ padding: '18px 20px' }}>
            <h3 className="h-3">Détail par mois</h3>
            <span className="tiny">commission et net réels, calculés par transaction</span>
          </div>
          <table className="table">
            <thead><tr><th>Mois</th><th>Brut</th><th>Commission</th><th>Net praticiens</th></tr></thead>
            <tbody>
              {parMois.map((r) => (
                <tr key={r.mois}>
                  <td className="table-cell-main">{r.mois}</td>
                  <td><strong>{euro(r.total)}</strong></td>
                  <td className="small">{euro(r.commission)}</td>
                  <td className="small">{euro(r.net)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ fontWeight: 600 }}>
                <td>Total</td><td>{euro(general?.montant_total)}</td>
                <td>{euro(general?.commission_totale)}</td><td>{euro(general?.net_total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="stack gap-5">
          <div className="card card-pad">
            <h3 className="h-3" style={{ marginBottom: 18 }}>Revenu par discipline</h3>
            <div className="stack gap-4">
              {byDiscipline.map((d, i) => (
                <div key={d.specialite}>
                  <div className="between" style={{ marginBottom: 6 }}>
                    <span className="small">{d.specialite}</span>
                    <strong className="small">{euro(d.total)}</strong>
                  </div>
                  <div style={{ height: 8, borderRadius: 999, background: 'var(--line)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${d.pct}%`, background: TONE_VAR[DISCIPLINE_TONES[i % DISCIPLINE_TONES.length]], borderRadius: 999 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card card-pad">
            <h3 className="h-4" style={{ marginBottom: 14 }}>Revenu récurrent</h3>
            <p className="tiny" style={{ marginBottom: 10 }}>Basé sur le mock d’abonnements — sera réel une fois 08e livré.</p>
            <dl className="dl">
              <dt>MRR</dt><dd><strong>{euro(mrr)}</strong></dd>
              <dt>ARR (projeté)</dt><dd>{euro(arr)}</dd>
              <dt>Abonnés actifs</dt><dd>{subscriptions.filter((s) => s.status === 'active').length}</dd>
              <dt>En impayé</dt><dd>{subscriptions.filter((s) => s.status === 'past_due').length}</dd>
            </dl>
          </div>
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Verify**

Run (from `web/`): `npm run lint` then `npm run build`.

Manual walkthrough: CA/commission/net StatCards and the monthly table show real per-transaction sums (not the old flat-15% approximation); discipline share is real; the recurring-revenue card is visibly labeled as mock-backed.

- [ ] **Step 3: Commit**

```bash
git add web/app/admin/analytique/revenus/page.jsx
git commit -m "feat(web): wire admin revenue analytics page to real endpoint, label MRR as pending 08e"
```

---

## Task 9: Wire `web/app/admin/analytique/croissance/page.jsx`

Replaces `analytics` with `/admin/analytics/growth` (signups, funnel, conversion/activation) and `/admin/analytics/retention` (cohort table). Removes the fabricated `CHANNELS` acquisition-source breakdown (no referrer/UTM tracking exists — same root cause as the out-of-scope visits stage) and the fabricated `Coût d'acquisition` StatCard (needs marketing-spend data that doesn't exist), replacing the latter with the real `avg_days_to_first_booking` metric.

**Files:**
- Modify: `web/app/admin/analytique/croissance/page.jsx`

- [ ] **Step 1: Replace the file**

Replace `web/app/admin/analytique/croissance/page.jsx` in full:

```jsx
'use client';
import { useQuery } from '@tanstack/react-query';
import { PageHead } from '@/components/ui/PageHead';
import { StatCard } from '@/components/ui/StatCard';
import { Icon } from '@/components/ui/Icon';
import { Badge } from '@/components/ui/Badge';
import { ModalButton } from '@/components/ui/ModalButton';
import { LineChart } from '@/components/ui/MiniChart';
import { api } from '@/lib/api';
import { num } from '@/lib/format';

export default function GrowthAnalyticsPage() {
  const { data: growthData } = useQuery({
    queryKey: ['admin', 'analytics', 'growth'],
    queryFn: () => api.get('/admin/analytics/growth'),
  });
  const { data: retentionData } = useQuery({
    queryKey: ['admin', 'analytics', 'retention'],
    queryFn: () => api.get('/admin/analytics/retention'),
  });
  const growth = growthData?.data;
  const signups = growth?.signups ?? [];
  const lastSignups = signups[signups.length - 1]?.count ?? 0;
  const funnel = growth?.funnel;
  const maxFunnel = Math.max(funnel?.inscrits ?? 1, 1);
  const cohorts = retentionData?.data?.cohorts ?? [];

  return (
    <>
      <PageHead
        title="Croissance"
        subtitle="Acquisition, activation et conversion."
        crumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Analytique', href: '/admin/analytique' }, { label: 'Croissance' }]}
        actions={<ModalButton modal="exportData" className="btn btn-primary btn-sm"><Icon name="download" size={15} /> Exporter</ModalButton>}
      />

      <div className="grid grid-4" style={{ marginBottom: 24 }}>
        <StatCard label="Nouveaux inscrits" value={num(lastSignups)} icon="users" />
        <StatCard label="Taux d’activation" value={growth?.activation_rate_pct != null ? `${growth.activation_rate_pct}%` : '—'} icon="sparkle" hint="Clients des 30 derniers jours ayant réservé" />
        <StatCard label="Taux de conversion" value={growth?.conversion_rate_pct != null ? `${growth.conversion_rate_pct}%` : '—'} icon="chart" hint="Sur l’ensemble des clients" />
        <StatCard label="Délai moyen 1ère résa" value={growth?.avg_days_to_first_booking != null ? `${growth.avg_days_to_first_booking} j` : '—'} icon="calendar" />
      </div>

      <div className="card card-pad" style={{ marginBottom: 24 }}>
        <div className="between" style={{ marginBottom: 18 }}>
          <div><div className="eyebrow">12 derniers mois</div><h3 className="h-3" style={{ marginTop: 4 }}>Inscriptions</h3></div>
          <span className="price">{num(lastSignups)} <small>/ dernier mois</small></span>
        </div>
        <LineChart data={signups.map((s) => s.count)} height={210} color="var(--sky-2)" fill="rgba(125,180,222,0.14)" />
        <div className="row" style={{ gap: 8, marginTop: 8 }}>
          {signups.map((s) => <div key={s.mois} className="flex-1 tiny center">{s.mois.slice(5)}</div>)}
        </div>
      </div>

      <div className="card card-pad" style={{ marginBottom: 24 }}>
        <h3 className="h-3" style={{ marginBottom: 18 }}>Entonnoir de conversion</h3>
        <div className="stack gap-4">
          <div>
            <div className="between" style={{ marginBottom: 6 }}>
              <span className="small">Visiteurs</span>
              <Badge variant="neutral">Non disponible</Badge>
            </div>
            <div style={{ height: 22, borderRadius: 8, background: 'var(--line)' }} />
          </div>
          <div>
            <div className="between" style={{ marginBottom: 6 }}>
              <span className="small">Inscrits</span>
              <span className="small"><strong>{num(funnel?.inscrits ?? 0)}</strong> <span className="tiny">· 100%</span></span>
            </div>
            <div style={{ height: 22, borderRadius: 8, background: 'var(--line)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: '100%', background: 'var(--violet-2)', borderRadius: 8 }} />
            </div>
          </div>
          <div>
            <div className="between" style={{ marginBottom: 6 }}>
              <span className="small">1ère réservation</span>
              <span className="small"><strong>{num(funnel?.a_reserve ?? 0)}</strong> <span className="tiny">· {funnel?.inscrits ? Math.round((funnel.a_reserve / funnel.inscrits) * 100) : 0}%</span></span>
            </div>
            <div style={{ height: 22, borderRadius: 8, background: 'var(--line)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${((funnel?.a_reserve ?? 0) / maxFunnel) * 100}%`, background: 'var(--gold)', borderRadius: 8 }} />
            </div>
          </div>
        </div>
        <p className="tiny" style={{ marginTop: 14 }}>
          Les visites et les canaux d’acquisition ne sont pas suivis aujourd’hui (aucune infrastructure de tracking) — hors périmètre de ce plan.
        </p>
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        <div className="between" style={{ padding: '18px 20px' }}>
          <h3 className="h-3">Rétention par cohorte</h3>
          <span className="tiny">% ayant réservé le mois indiqué après l’inscription</span>
        </div>
        <table className="table">
          <thead><tr><th>Cohorte</th><th>Taille</th><th>M+1</th><th>M+2</th><th>M+3</th></tr></thead>
          <tbody>
            {cohorts.map((c) => (
              <tr key={c.cohort}>
                <td className="table-cell-main">{c.cohort}</td>
                <td>{num(c.size)}</td>
                {[c.m1, c.m2, c.m3].map((v, i) => (
                  <td key={i}>{v == null ? <span className="tiny">—</span> : <Badge variant={v >= 55 ? 'success' : v >= 45 ? 'warning' : 'neutral'}>{v}%</Badge>}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Verify**

Run (from `web/`): `npm run lint` then `npm run build`.

Manual walkthrough: signups chart and cohort table populate from real data; the funnel shows "Visiteurs" honestly labeled "Non disponible" instead of a fabricated number; there is no acquisition-channels section.

- [ ] **Step 3: Commit**

```bash
git add web/app/admin/analytique/croissance/page.jsx
git commit -m "feat(web): wire admin growth analytics page to real endpoints, remove fabricated visits/channels"
```

---

## Task 10: Wire `web/app/admin/analytique/retention/page.jsx`

Replaces `analytics` with `/admin/analytics/retention`. The mock's weeks-since-first-booking curve (`S0..S24`) is replaced with the endpoint's real monthly-offset curve (`M0..M12`) — both answer the same product question ("do clients come back") at a coarser, but real, granularity; building a second parallel weekly-cohort engine was not part of the locked P8-8 spec and is not implemented here. The fabricated churn-reasons paragraph is replaced with an honest "not tracked" note.

**Files:**
- Modify: `web/app/admin/analytique/retention/page.jsx`

- [ ] **Step 1: Replace the file**

Replace `web/app/admin/analytique/retention/page.jsx` in full:

```jsx
'use client';
import { useQuery } from '@tanstack/react-query';
import { PageHead } from '@/components/ui/PageHead';
import { StatCard } from '@/components/ui/StatCard';
import { Icon } from '@/components/ui/Icon';
import { ModalButton } from '@/components/ui/ModalButton';
import { LineChart, Donut } from '@/components/ui/MiniChart';
import { api } from '@/lib/api';
import { num, euro } from '@/lib/format';

export default function RetentionAnalyticsPage() {
  const { data: retentionData } = useQuery({
    queryKey: ['admin', 'analytics', 'retention'],
    queryFn: () => api.get('/admin/analytics/retention'),
  });
  const retention = retentionData?.data;
  const overall = retention?.overall;
  const curve = overall?.curve ?? [];
  const repeatBookings = retention?.repeat_bookings ?? [];
  const repeatTones = ['var(--line)', 'var(--sky-2)', 'var(--sage-2)', 'var(--violet-2)'];

  return (
    <>
      <PageHead
        title="Rétention"
        subtitle="Fidélité, réservations répétées et attrition."
        crumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Analytique', href: '/admin/analytique' }, { label: 'Rétention' }]}
        actions={<ModalButton modal="exportData" className="btn btn-primary btn-sm"><Icon name="download" size={15} /> Exporter</ModalButton>}
      />

      <div className="grid grid-4" style={{ marginBottom: 24 }}>
        <StatCard label="Rétention 90 j" value={overall?.retention_90j_pct != null ? `${overall.retention_90j_pct}%` : '—'} icon="users" />
        <StatCard label="Réservations répétées" value={retention?.repeat_rate_pct != null ? `${retention.repeat_rate_pct}%` : '—'} icon="calendar" />
        <StatCard label="Valeur vie client" value={euro(retention?.avg_lifetime_value)} icon="euro" />
        <StatCard label="Taux d’attrition" value={retention?.churn_rate_pct != null ? `${retention.churn_rate_pct}%` : '—'} icon="chart" />
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr 1fr', gap: 20, marginBottom: 24 }}>
        <div className="card card-pad center" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <h3 className="h-4" style={{ marginBottom: 16 }}>Rétention 30 j</h3>
          <Donut value={overall?.retention_30j_pct ?? 0} label="actifs" color="var(--sky-2)" />
        </div>
        <div className="card card-pad center" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <h3 className="h-4" style={{ marginBottom: 16 }}>Rétention 90 j</h3>
          <Donut value={overall?.retention_90j_pct ?? 0} label="reviennent" color="var(--violet-2)" />
        </div>
        <div className="card card-pad center" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <h3 className="h-4" style={{ marginBottom: 16 }}>Rétention 12 mois</h3>
          <Donut value={overall?.retention_12m_pct ?? 0} label="fidèles" color="var(--sage-2)" />
        </div>
      </div>

      <div className="card card-pad" style={{ marginBottom: 24 }}>
        <div className="between" style={{ marginBottom: 18 }}>
          <div><div className="eyebrow">Cohortes d’inscription combinées</div><h3 className="h-3" style={{ marginTop: 4 }}>Courbe de rétention</h3></div>
          <span className="small">% ayant réservé N mois après l’inscription</span>
        </div>
        <LineChart data={curve.map((c) => c.pct ?? 0)} height={200} color="var(--violet-2)" />
        <div className="row" style={{ gap: 8, marginTop: 8 }}>
          {curve.map((c) => <div key={c.offset} className="flex-1 tiny center">{c.offset}</div>)}
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1.4fr 1fr', gap: 20 }}>
        <div className="card card-pad">
          <h3 className="h-3" style={{ marginBottom: 18 }}>Réservations répétées</h3>
          <div className="stack gap-4">
            {repeatBookings.map((r, i) => (
              <div key={r.label}>
                <div className="between" style={{ marginBottom: 6 }}>
                  <span className="small">{r.label}</span>
                  <span className="small"><strong>{num(r.count)}</strong> <span className="tiny">· {r.pct}%</span></span>
                </div>
                <div style={{ height: 8, borderRadius: 999, background: 'var(--line)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${r.pct}%`, maxWidth: '100%', background: repeatTones[i % repeatTones.length], borderRadius: 999 }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="note tint-gold">
          <h3 className="h-4" style={{ marginBottom: 10 }}>À propos du churn</h3>
          <p className="small">
            L’attrition (mois +3 après inscription) s’établit à{' '}
            <strong className="serif-accent">{retention?.churn_rate_pct != null ? `${retention.churn_rate_pct}%` : '—'}</strong>.
          </p>
          <p className="small" style={{ marginTop: 10 }}>
            Motifs de départ : non disponible — dépend d’un futur champ de motif d’annulation (voir le sous-plan 08e, abonnements).
          </p>
          <div className="row gap-2 wrap" style={{ marginTop: 14 }}>
            <ModalButton modal="sendNotification" className="btn btn-soft btn-sm"><Icon name="bell" size={15} /> Campagne de réactivation</ModalButton>
          </div>
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Verify**

Run (from `web/`): `npm run lint` then `npm run build`.

Manual walkthrough: the three donuts, retention curve, repeat-bookings distribution, and churn rate all populate from real data; the churn-reasons paragraph honestly states the data isn't tracked yet instead of showing invented percentages.

- [ ] **Step 3: Commit**

```bash
git add web/app/admin/analytique/retention/page.jsx
git commit -m "feat(web): wire admin retention analytics page to real endpoint, remove fabricated churn reasons"
```

---

## Task 11: Remove the dead `analytics` mock export

After Tasks 6–10, nothing imports `analytics` from `web/lib/data/admin.js` anymore. Verify that, then delete it.

**Files:**
- Modify: `web/lib/data/admin.js`

- [ ] **Step 1: Verify no remaining consumers**

Run (from `web/`):
```bash
grep -rn "analytics" app/ --include="*.jsx" | grep -v "node_modules"
```
Expected: no matches (or only unrelated matches, e.g. a variable literally named `analyticsData` from Tasks 6–10's own `useQuery` results — inspect any hits by hand to confirm none import `{ analytics }` from `@/lib/data/admin`).

- [ ] **Step 2: Delete the export**

Edit `web/lib/data/admin.js` — remove the entire `// ----- Analytics series -----` block:

```javascript
// ----- Analytics series -----
export const analytics = {
  revenueMonthly: [38200, 41500, 39800, 45200, 48600, 52400, 49800, 55100, 58300, 61200, 59800, 64500],
  revenueLabels: ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'],
  bookingsWeekly: [220, 245, 238, 280, 312, 298, 340],
  weekLabels: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'],
  signups: [180, 210, 240, 290, 320, 360, 410, 480, 520, 560, 610, 680],
  retention: 72,
  disciplineShare: [
    { name: 'Soin énergétique', pct: 24, tone: 'sky' },
    { name: 'Magnétisme', pct: 19, tone: 'violet' },
    { name: 'Reiki', pct: 16, tone: 'sage' },
    { name: 'Hypnose', pct: 14, tone: 'gold' },
    { name: 'Massage', pct: 12, tone: 'sky' },
    { name: 'Autres', pct: 15, tone: 'violet' },
  ],
};

```

(Delete the block entirely — nothing replaces it in this file.)

- [ ] **Step 3: Verify**

Run (from `web/`): `npm run lint` then `npm run build`.
Expected: build succeeds with no unresolved-import errors.

- [ ] **Step 4: Commit**

```bash
git add web/lib/data/admin.js
git commit -m "chore(web): remove dead analytics mock now that every consumer is wired to real endpoints"
```

---

## Self-Review

**1. Spec coverage.** Checked against P8-8 and the "08g — Analytics" sketch in `docs/superpowers/specs/2026-07-15-aura-08-heavy-modules-design.md`:
- `GET /admin/analytics/dashboard` composing paiements/remboursements — Task 2. ✓
- `GET /admin/analytics/revenue` reusing `paiements/statistics`'s `par_mois` shape, re-shaped — Task 3. ✓
- `GET /admin/analytics/growth` (bookings-by-week, signups-by-week) — Task 4. ✓ (bookings are by-day-within-the-current-week, matching the mock's actual `weekLabels: ['Lun'...'Dim']` shape rather than the sketch prose's looser "by-week" phrasing — documented in the response contract.)
- `GET /admin/analytics/retention` (signup-month cohorts, % with ≥1 booking in each subsequent month) — Task 5, with the exact calculation approach explained in prose before the code, as required.
- Discipline revenue share — placed under `/admin/analytics/revenue` (Task 3), decision documented in the endpoint's own description.
- Churn reasons — explicitly scoped out with `churn_reasons: null` and an honest UI note (Task 10); churn *rate* (a distinct, computable metric) is implemented for real.
- Acquisition funnel — visits explicitly `null`/labeled unavailable; signups→bookings shown for real (Tasks 4, 9).
- All AdminGuard — confirmed by Task 1's guard test and every subsequent controller method reusing the class-level `@UseGuards(JwtAuthGuard, AdminGuard)`.
- Frontend wiring of `admin/page.jsx` and all three `admin/analytique/*` subpages — Tasks 6–10.
- Graceful degradation for not-yet-landed sub-plans — MRR/ARR (08e) left on its mock with a visible label (Task 8); dispute rate (08d) relabeled to the real refund rate it's backed by instead (Task 6), both stated explicitly in the Context section up front, not discovered mid-task.

**2. Placeholder scan.** Searched this plan for "TBD", "add appropriate", "similar to Task N", "implement later" — none found. Every task's SQL/query-builder code, every helper function (`addMonthsToYearMonth`, `bucketByWeekday`, `currentWeekRange`, etc.), and every React component is complete, runnable code, not a description of code. The one place explicitly called out as risky for placeholder-style hand-waving — the cohort retention calculation — has its full algorithm both explained in prose and implemented in full in Task 5, with hand-verified expected numbers in the accompanying test.

**3. Type/signature consistency.** Cross-checked field names across backend and frontend:
- `dashboard()`'s `revenue_this_month`/`bookings_this_month`/`new_praticiens_this_month`/`refund_rate` (Task 2) match exactly what Task 6/7's `dash?.revenue_this_month` etc. read.
- `revenue()`'s `general`/`par_mois[].{mois,total,commission,net}`/`par_discipline[].{specialite,total,pct}` (Task 3) match what Tasks 6–8 destructure.
- `growth()`'s `signups[].{mois,count}`/`bookings_this_week[].{jour,count}`/`conversion_rate_pct`/`activation_rate_pct`/`avg_days_to_first_booking`/`funnel.{visiteurs,inscrits,a_reserve}` (Task 4) match Tasks 6, 7, 9.
- `retention()`'s `cohorts[].{cohort,size,m1..m12}`/`overall.{retention_30j_pct,retention_90j_pct,retention_12m_pct,curve}`/`repeat_bookings`/`repeat_rate_pct`/`avg_lifetime_value`/`churn_rate_pct`/`churn_reasons` (Task 5) match Tasks 6, 7, 9, 10.
- `AnalyticsService`'s constructor-injected `clients`/`praticiens`/`rendezVous`/`paiements`/`paiementsService`/`remboursementsService` (Task 1) are the exact names used in every later task's method bodies (Tasks 2–5) — no renamed variables.
- `analytics.utils.ts`'s exported helper names (`round1`, `toDateStr`, `pctChange`, `monthBounds`, `currentYearMonth`, `addMonthsToYearMonth`, `currentWeekRange`, `bucketByWeekday`) are imported with those exact names everywhere they're used (Tasks 2–5), and `currentWeekRange` is imported into the Task 4 test with the same name/signature it has in production code.

**4. Test isolation (caught during this review, fixed before finalizing).** The first draft of this plan appended all 5 endpoint tests as `it()` blocks inside one shared `describe`/`beforeAll`/`app` for the whole file. Since none of the 4 new endpoints' queries scope by client/date the way e.g. `paiements.e2e-spec.ts`'s client-scoped queries do — `revenue()`, `growth()`, and especially `retention()` aggregate over *every* row in their tables — that shared-database structure would have let each task's seed data silently accumulate and contaminate the next task's exact-value assertions (Task 5's `cohorts.toEqual([...exactly 2 rows...])` would have picked up clients seeded by Tasks 2–4 too). Fixed by giving each of Tasks 2–5 its own top-level `describe(...)` block with its own `createTestApp()` call, matching the isolation the reasoning above already assumed. This is documented in the note above Task 1 Step 1, and confirmed by hand-checking (before finalizing) that every `describe`/`it` in the assembled test file has balanced braces and no stray shared state.

---

## Exit criteria

- [ ] `npm run test:e2e` (server) passes in full, including the 5 new `analytics.e2e-spec.ts` tests and all pre-existing suites (confirming the two new `exports: [...]` entries didn't break `paiements`/`remboursements`).
- [ ] `GET /api/admin/analytics/dashboard|revenue|growth|retention` all return `401` unauthenticated, `403` for a non-admin client, `200` with the documented shape for an admin.
- [ ] `npm run lint` and `npm run build` (web) both succeed with zero errors.
- [ ] `web/app/admin/page.jsx` and all three `web/app/admin/analytique/*` subpages render real, live-computed numbers — no `web/lib/data/admin.js` `analytics` import remains anywhere in the repo (Task 11 confirms this by grep before deleting the export).
- [ ] The main dashboard's former "Taux de litige" StatCard reads "Taux de remboursement" and is backed by real data; a follow-up note exists (this document, Context section) for swapping it to a real dispute rate once 08d ships.
- [ ] `admin/analytique/revenus`'s MRR/ARR/subscriber card is visibly labeled as mock-backed pending 08e; every other card and table on that page is real.
- [ ] `admin/analytique/croissance`'s funnel shows "Visiteurs" as an honest "Non disponible" state, not a number; the acquisition-channels section and the fabricated "Coût d'acquisition" StatCard are gone (the latter replaced with the real `avg_days_to_first_booking` metric).
- [ ] `admin/analytique/retention`'s churn-reasons text is replaced with an honest "not tracked, depends on 08e" note; the real, computed churn *rate* is still shown.
- [ ] Every commit message in this plan's history is plain text with no AI-attribution trailer (per this project's standing rule).
