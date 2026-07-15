# Aura Plan 08c — Audit Log Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a real `audit_logs` table + a small injectable `AuditLogService.record(...)`, wire it additively into the ~10-13 existing admin mutation points identified in the Plan 08 design spec (avis moderation, signalement resolve/reject, remboursement approve/refuse/complete, praticien-verification verify/reject, admin user create/deactivate/activate/destroy), expose `GET /admin/audit-logs` (paginated, filterable) + `GET /admin/audit-logs/export` (CSV), and wire the existing `admin/audit` mock page to the real endpoints.

**Architecture:** One new module (`server/src/audit-log/`) owns the `AuditLog` entity, `AuditLogService` (the single write path — `record(actor, action, target, category, metadata?)`) and `AuditLogController` (the only two read routes). Five existing services (`AvisService`, `SignalementsService`, `RemboursementsService`, `PraticienVerificationService`, `AdminAuthService`) get `AuditLogService` injected via their module's constructor and gain exactly one `await this.auditLog.record(...)` call right after each of their existing mutations — no existing control flow is restructured. Two of those five services (`PraticienVerificationService`, and `AdminAuthService`'s `deactivate`/`destroy`) already receive the acting `User` as a parameter, so those diffs are pure additions. The other three call sites (`avis.publish/reject`, `signalements.resolve/reject`, `remboursements.adminApprove/adminRefuse/adminComplete`) don't currently receive an actor at all, so those methods gain one new `actor: User` parameter, fed from a new `@CurrentUser()` decorator on their controller methods (the same decorator/pattern already used everywhere else in this codebase, e.g. `signalements.controller.ts`'s `store()`). CSV export reuses the exact `{ filename, csv, total }` envelope shape already established by `PaiementsService.adminExportCsv()` — no new CSV library, no new export pattern.

**Tech Stack:** NestJS 11 + TypeORM 0.3 + class-validator (server, unchanged); Next.js 15 + `@tanstack/react-query` (web, unchanged). No new dependencies on either codebase.

**Reference:** [Plan 08 design spec](../specs/2026-07-15-aura-08-heavy-modules-design.md) (see "08c — Audit log" sketch and the P8-7 row of the locked-decisions table) · [Plan 07](2026-07-13-aura-07-greenfield-cheap.md) (primary format/quality reference — same "small new module + DTOs + e2e" shape) · [Plan 04](2026-07-13-aura-04-client-domains.md) (reference for a plan that additively touches many existing services)

**Depends on (soft):** 08b (roles & permissions) is sequenced immediately before this plan in Plan 08's ordering (`08a → 08b → 08c → …`) and adds a `role: 'admin'|'moderateur'|'support'|'comptabilite'|null` column to `User`. This plan references the acting admin's role in every audit-log row's `metadata.actor_role`, but does so defensively (`(actor as any)?.role ?? null` inside `AuditLogService.record()` itself, never at any of the 13 call sites) specifically so that **this plan's own tasks compile and pass today, even if 08b has not landed yet** — `actor_role` will simply be `null` in every row until 08b's migration adds the column, and will start populating automatically the moment it does, with zero code changes required in this plan. This plan does **not** use or assume any 08b capability-guard/decorator — every new/modified route in this plan is guarded purely by the existing `AdminGuard` (binary `is_admin` check). Wiring `AuditLogService` into 08b's future capability-check paths (e.g. logging capability changes) is a natural follow-up, not a blocker for this plan's exit criteria.

**Run each `npm` command from the relevant package dir** (`server/`, `web/`), not the repo root.

**A note on the ~10 → 13 count:** the design spec's P8-7 row estimates "~10 existing mutation points." Ground-truth research (this plan's own Tasks 3-7) found exactly **13** real write methods across the 5 named services once `praticien-verification`'s combined `verify()` (which alone produces 3 distinct outcomes: valide/rejete/en_cours) and `admin-auth`'s `activate()` (the natural, symmetric inverse of the already-in-scope `deactivate()`) are counted individually. `activate()` was not explicitly named in the design spec's method list, but leaving "deactivated" logged while its own reversal stayed silent would be a glaring, avoidable gap in a *security audit trail specifically* — see Task 7. This is flagged here, not silently smuggled in.

---

## File Structure

| File | Responsibility |
|---|---|
| `server/src/database/migrations/1700000000005-AddAuditLogs.ts` (create) | Raw-SQL migration for the `audit_logs` table |
| `server/src/database/entities/audit-log.entity.ts` (create) | `AuditLog` entity + `AUDIT_CATEGORIES`/`AuditCategory` |
| `server/src/audit-log/audit-log.module.ts` (create) | Registers the entity, exports `AuditLogService` for the 5 consuming modules |
| `server/src/audit-log/audit-log.controller.ts` (create) | `GET /admin/audit-logs`, `GET /admin/audit-logs/export` |
| `server/src/audit-log/audit-log.service.ts` (create) | `record(...)` (the only write path) + `index()`/`exportCsv()` (the only reads) |
| `server/test/audit-log.e2e-spec.ts` (create) | Guard, filtering, pagination, statistiques, CSV shape |
| `server/test/audit-log-integration.e2e-spec.ts` (create) | Hits the 13 real instrumented endpoints, asserts real rows land in `audit_logs` |
| `server/test/utils/create-test-app.ts` (modify) | Register `AuditLog` in `ALL_ENTITIES` |
| `server/src/app.module.ts` (modify) | Register `AuditLogModule` |
| `server/src/avis/avis.service.ts` (modify) | `publish`/`reject` gain an `actor` param + one `.record()` call each |
| `server/src/avis/avis.controller.ts` (modify) | `publish`/`reject` routes gain `@CurrentUser()` |
| `server/src/avis/avis.module.ts` (modify) | Imports `AuditLogModule` |
| `server/src/signalements/signalements.service.ts` (modify) | `resolve`/`reject` gain an `actor` param + one `.record()` call each |
| `server/src/signalements/signalements.controller.ts` (modify) | `resolve`/`reject` routes gain `@CurrentUser()` |
| `server/src/signalements/signalements.module.ts` (modify) | Imports `AuditLogModule` |
| `server/src/remboursements/remboursements.service.ts` (modify) | `adminApprove`/`adminRefuse`/`adminComplete` gain an `actor` param + one `.record()` call each |
| `server/src/remboursements/remboursements.controller.ts` (modify) | Those 3 routes gain `@CurrentUser()` |
| `server/src/remboursements/remboursements.module.ts` (modify) | Imports `AuditLogModule` |
| `server/src/auth/praticien-verification/praticien-verification.service.ts` (modify) | `verify`/`reject` gain one `.record()` call each (actor already passed in) |
| `server/src/auth/praticien-verification/praticien-verification.module.ts` (modify) | Imports `AuditLogModule` |
| `server/src/auth/admin-auth/admin-auth.service.ts` (modify) | `register`/`deactivate`/`activate`/`destroy` gain one `.record()` call each (`activate` gains an `actor` param) |
| `server/src/auth/admin-auth/admin-auth.controller.ts` (modify) | `activate` route gains `@CurrentUser()` |
| `server/src/auth/admin-auth/admin-auth.module.ts` (modify) | Gains an `imports: [AuditLogModule]` array (had none before) |
| `web/lib/format.js` (modify) | Adds `relativeFr()` and a shared `downloadCsv()` (extracted from `paiements/page.jsx`, this plan's is the 2nd caller) |
| `web/app/admin/paiements/page.jsx` (modify) | Imports the now-shared `downloadCsv` instead of its local copy |
| `web/app/admin/audit/page.jsx` (modify) | Real `useQuery` against `/admin/audit-logs`, real CSV export button, same visual structure as the mock |

---

## Task 1: Migration — `audit_logs` table

**Files:**
- Create: `server/src/database/migrations/1700000000005-AddAuditLogs.ts`

- [ ] **Step 1: Write the migration**

Create `server/src/database/migrations/1700000000005-AddAuditLogs.ts`:

```typescript
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAuditLogs1700000000005 implements MigrationInterface {
  public async up(q: QueryRunner): Promise<void> {
    await q.query(`CREATE TABLE audit_logs (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      actor_id BIGINT UNSIGNED NULL,
      action VARCHAR(255) NOT NULL,
      target_type VARCHAR(100) NOT NULL,
      target_id BIGINT UNSIGNED NULL,
      category VARCHAR(20) NOT NULL,
      metadata JSON NULL,
      created_at TIMESTAMP NULL,
      INDEX idx_audit_logs_category (category),
      INDEX idx_audit_logs_created_at (created_at),
      CONSTRAINT fk_audit_logs_actor FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE IF EXISTS audit_logs`);
  }
}
```

- [ ] **Step 2: Verify it compiles**

Run (in `server/`): `npm run build`
Expected: Build succeeds. This only proves the file is valid `MigrationInterface` TypeScript — it does not run the SQL.

- [ ] **Step 3: Run the migration against a real database, if available**

Run (in `server/`): `npm run migration:run`
Expected: Output lists `AddAuditLogs1700000000005` as executed, against the MySQL instance configured by `server/.env`'s `DB_*` variables. **If no local MySQL instance is configured, skip this step** — every later task's e2e suite validates the equivalent schema shape against an in-memory SQLite database built from the TypeORM entities (Task 2), independent of this migration file having actually been run anywhere. The SQL above has already been checked column-for-column against this plan's entity (Task 2).

- [ ] **Step 4: Commit**

```bash
git add server/src/database/migrations/1700000000005-AddAuditLogs.ts
git commit -m "feat(server): add audit_logs migration"
```

---

## Task 2: Core `audit-log` module (entity, service, controller, module, e2e)

**Files:**
- Create: `server/src/database/entities/audit-log.entity.ts`
- Create: `server/src/audit-log/audit-log.module.ts`, `server/src/audit-log/audit-log.controller.ts`, `server/src/audit-log/audit-log.service.ts`
- Create: `server/test/audit-log.e2e-spec.ts`
- Modify: `server/test/utils/create-test-app.ts`, `server/src/app.module.ts`

**Ground truth (given, not to be second-guessed):** the P8-7 schema is exactly `id, actor_id FK users nullable, action string, target_type string, target_id nullable, category enum, metadata json nullable, created_at` — no `target_label`/`target_name` column. The mock's "Cible" column (`web/lib/data/admin.js`'s `auditLog[].target`, e.g. `'Avis #r7'`, `'TX-48211'`, `'Conversation #4821'`, `'chloe@aura.fr'`, `'Léa Marchand'`) is a free-text display string that does **not** derive mechanically from `target_type`+`target_id` — it's sometimes a reference code, sometimes a name, sometimes an email. Rather than inventing an extra column not in the locked schema, `AuditLogService.record()` stores it as `metadata.target_label`, since `metadata` is already the schema's designated flexible field. `category` is stored as a plain `varchar(20)` (not a DB-level enum type), matching every other status-like column in this codebase (`avis.statut`, `signalements.statut`/`priorite`, `remboursements.statut` — none of them use a native SQL enum; app-level `AUDIT_CATEGORIES`/`@IsIn`-style validation does the real enforcement). `metadata` reuses the existing `jsonTransformer` from `server/src/common/transformers.ts` (already used by `Remboursement.metadata`/`Remboursement.documents`) so the same entity works on both MySQL (real JSON column) and the SQLite e2e harness.

- [ ] **Step 1: Write the entity**

Create `server/src/database/entities/audit-log.entity.ts`:

```typescript
import {
  Column, CreateDateColumn, Entity, JoinColumn, ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { jsonTransformer } from '../../common/transformers';
import { User } from './user.entity';

// Matches the 6 categories the `admin/audit` mock table has always used
// (web/lib/data/admin.js `auditLog[].kind`, web/app/admin/audit/page.jsx `KIND_LABEL`).
export const AUDIT_CATEGORIES = [
  'moderation', 'verification', 'finance', 'security', 'support', 'system',
] as const;
export type AuditCategory = (typeof AUDIT_CATEGORIES)[number];

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn() id: number;
  @Column({ type: 'int', nullable: true }) actor_id: number | null;
  @Column() action: string;
  @Column() target_type: string;
  @Column({ type: 'int', nullable: true }) target_id: number | null;
  @Column({ type: 'varchar', length: 20 }) category: AuditCategory;
  // No `target_label` column exists in the locked P8-7 schema — the mock's "Cible"
  // column needs a free-text display string that doesn't derive mechanically from
  // target_type+target_id, so AuditLogService.record() stores it inside this JSON
  // column instead of inventing a new one. See audit-log.service.ts.
  @Column({ type: 'text', nullable: true, transformer: jsonTransformer })
  metadata: Record<string, unknown> | null;
  @CreateDateColumn({ name: 'created_at' }) created_at: Date;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'actor_id' })
  actor: User | null;
}
```

- [ ] **Step 2: Write the failing e2e spec**

Create `server/test/audit-log.e2e-spec.ts`:

```typescript
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, seedAdmin, seedClientUser } from './utils/create-test-app';
import { AuditLogModule } from '../src/audit-log/audit-log.module';
import { AuditLogService } from '../src/audit-log/audit-log.service';

describe('audit log (core module)', () => {
  let app: INestApplication;
  let adminToken: string;
  let adminUser: any;

  beforeAll(async () => {
    app = await createTestApp({ imports: [AuditLogModule] });
    const seeded = await seedAdmin(app, 'audit-admin@aura.io');
    adminUser = seeded.user;
    adminToken = seeded.token;
  });
  afterAll(async () => { await app.close(); });
  const http = () => request(app.getHttpServer());

  it('GET /api/admin/audit-logs requires a JWT (401) and an admin (403)', async () => {
    await http().get('/api/admin/audit-logs').expect(401);
    const { token: clientToken } = await seedClientUser(app, 'audit-client@aura.io');
    await http().get('/api/admin/audit-logs')
      .set('Authorization', `Bearer ${clientToken}`).expect(403);
  });

  it('record() persists a row; index returns it with sanitized actor, target_label, pagination, statistiques', async () => {
    const service = app.get(AuditLogService);
    await service.record(
      adminUser,
      'a publié un avis',
      { type: 'avis', id: 7, label: 'Avis #7 — Marie B.' },
      'moderation',
      { note: 5 },
    );
    await service.record(
      adminUser,
      'a émis un remboursement',
      { type: 'remboursement', id: 3, label: 'RMB-48211' },
      'finance',
    );
    await service.record(
      null,
      'a détecté une tentative de paiement hors plateforme',
      { type: 'conversation', id: 4821, label: 'Conversation #4821' },
      'security',
    );

    const res = await http().get('/api/admin/audit-logs')
      .set('Authorization', `Bearer ${adminToken}`).expect(200);
    expect(res.body.data).toHaveLength(3);
    // ordered DESC by created_at/id — the security row (actor-less) was recorded last
    expect(res.body.data[0].category).toBe('security');
    expect(res.body.data[0].actor).toBeNull();
    expect(res.body.data[0].metadata.target_label).toBe('Conversation #4821');

    const avisRow = res.body.data.find((r: any) => r.action === 'a publié un avis');
    expect(avisRow.actor).toMatchObject({ id: adminUser.id, name: 'Admin Test' });
    expect(avisRow.actor.password).toBeUndefined();
    expect(avisRow.metadata).toHaveProperty('actor_role');
    expect(avisRow.metadata.note).toBe(5);

    expect(res.body.pagination).toMatchObject({ total: 3 });
    expect(res.body.statistiques).toEqual({ total: 3, security: 1, moderation: 1, finance: 1 });
  });

  it('filters by category, actor_id and date range', async () => {
    const byCategory = await http().get('/api/admin/audit-logs?category=finance')
      .set('Authorization', `Bearer ${adminToken}`).expect(200);
    expect(byCategory.body.data.every((r: any) => r.category === 'finance')).toBe(true);
    expect(byCategory.body.data.length).toBeGreaterThanOrEqual(1);

    const byActor = await http().get(`/api/admin/audit-logs?actor_id=${adminUser.id}`)
      .set('Authorization', `Bearer ${adminToken}`).expect(200);
    expect(byActor.body.data.every((r: any) => r.actor?.id === adminUser.id)).toBe(true);

    const farFuture = '2999-01-01';
    const noneYet = await http().get(`/api/admin/audit-logs?date_debut=${farFuture}`)
      .set('Authorization', `Bearer ${adminToken}`).expect(200);
    expect(noneYet.body.data).toEqual([]);
  });

  it('export/csv returns { filename, csv, total } with a matching header row', async () => {
    const res = await http().get('/api/admin/audit-logs/export')
      .set('Authorization', `Bearer ${adminToken}`).expect(200);
    expect(res.body.data.filename).toMatch(/^export_audit_\d{8}_\d{6}\.csv$/);
    const lines: string[] = res.body.data.csv.split('\n');
    expect(lines[0]).toBe('Date;Auteur;Action;Cible;Type');
    expect(lines).toHaveLength(res.body.data.total + 1);
    expect(lines.some((l) => l.includes('a publié un avis') && l.includes('Avis #7 — Marie B.'))).toBe(true);
    expect(lines.some((l) => l.includes('Système;a détecté'))).toBe(true);
  });
});
```

- [ ] **Step 3: Write the service**

Create `server/src/audit-log/audit-log.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { AuditCategory, AuditLog } from '../database/entities/audit-log.entity';
import { User } from '../database/entities/user.entity';
import { success } from '../common/envelope';
import { parsePagination, paginateQb } from '../common/pagination';
import { exportTimestamp, formatDateTimeFr } from '../common/format';
import { sanitizeUser } from '../auth/user.util';

export interface AuditTarget {
  type: string;
  id: number | null;
  label: string;
}

@Injectable()
export class AuditLogService {
  constructor(@InjectRepository(AuditLog) private readonly logs: Repository<AuditLog>) {}

  /**
   * Records one audit-trail entry. Called additively, right after each existing
   * successful mutation, from 5 existing services (avis, signalements,
   * remboursements, praticien-verification, admin-auth) — never changes their
   * control flow, only appends one line per mutation.
   *
   * `actor_role` is captured centrally here (not at each of the 13 call sites) via
   * `(actor as any)?.role` so this whole plan compiles and passes today even before
   * 08b (roles & permissions) adds `User.role` — it will simply be `null` until
   * then, and start populating automatically once that column exists, with no
   * changes needed anywhere in this file or its callers.
   */
  async record(
    actor: User | null,
    action: string,
    target: AuditTarget,
    category: AuditCategory,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    await this.logs.save({
      actor_id: actor?.id ?? null,
      action,
      target_type: target.type,
      target_id: target.id,
      category,
      metadata: {
        target_label: target.label,
        actor_role: (actor as any)?.role ?? null,
        ...(metadata ?? {}),
      },
    });
  }

  private baseQb(): SelectQueryBuilder<AuditLog> {
    return this.logs.createQueryBuilder('a').leftJoinAndSelect('a.actor', 'actor');
  }

  private applyFilters(qb: SelectQueryBuilder<AuditLog>, query: Record<string, any>) {
    if (query.category !== undefined) qb.andWhere('a.category = :cat', { cat: query.category });
    if (query.actor_id !== undefined) qb.andWhere('a.actor_id = :aid', { aid: query.actor_id });
    if (query.date_debut !== undefined) qb.andWhere('DATE(a.created_at) >= :dd', { dd: query.date_debut });
    if (query.date_fin !== undefined) qb.andWhere('DATE(a.created_at) <= :df', { df: query.date_fin });
  }

  private async computeStatistics(query: Record<string, any>) {
    const countCategory = async (category?: string) => {
      const qb = this.logs.createQueryBuilder('a');
      this.applyFilters(qb, query);
      if (category) qb.andWhere('a.category = :c', { c: category });
      return qb.getCount();
    };
    return {
      total: await countCategory(),
      security: await countCategory('security'),
      moderation: await countCategory('moderation'),
      finance: await countCategory('finance'),
    };
  }

  async index(query: Record<string, any>) {
    const { page, perPage } = parsePagination(query, 20);
    const qb = this.baseQb();
    this.applyFilters(qb, query);
    qb.orderBy('a.created_at', 'DESC').addOrderBy('a.id', 'DESC');
    const { data, pagination } = await paginateQb(qb, page, perPage);
    const sanitized = data.map((row) => ({
      ...row,
      actor: row.actor ? sanitizeUser(row.actor) : null,
    }));
    return success(sanitized, undefined, {
      pagination,
      statistiques: await this.computeStatistics(query),
    });
  }

  async exportCsv(query: Record<string, any>) {
    const qb = this.baseQb();
    this.applyFilters(qb, query);
    const rows = await qb.orderBy('a.created_at', 'DESC').addOrderBy('a.id', 'DESC').getMany();
    const header = 'Date;Auteur;Action;Cible;Type';
    const lines = rows.map((r) => [
      formatDateTimeFr(r.created_at),
      r.actor?.name ?? 'Système',
      r.action,
      ((r.metadata as Record<string, unknown> | null)?.target_label as string | undefined)
        ?? `${r.target_type} #${r.target_id ?? ''}`,
      r.category,
    ].join(';'));
    return success({
      filename: `export_audit_${exportTimestamp()}.csv`,
      csv: [header, ...lines].join('\n'),
      total: rows.length,
    });
  }
}
```

- [ ] **Step 4: Write the controller**

Create `server/src/audit-log/audit-log.controller.ts`:

```typescript
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuditLogService } from './audit-log.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

@Controller()
export class AuditLogController {
  constructor(private readonly service: AuditLogService) {}

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('admin/audit-logs')
  index(@Query() query: Record<string, any>) {
    return this.service.index(query);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('admin/audit-logs/export')
  exportCsv(@Query() query: Record<string, any>) {
    return this.service.exportCsv(query);
  }
}
```

- [ ] **Step 5: Write the module**

Create `server/src/audit-log/audit-log.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLog } from '../database/entities/audit-log.entity';
import { AuditLogController } from './audit-log.controller';
import { AuditLogService } from './audit-log.service';

@Module({
  imports: [TypeOrmModule.forFeature([AuditLog])],
  controllers: [AuditLogController],
  providers: [AuditLogService],
  exports: [AuditLogService],
})
export class AuditLogModule {}
```

- [ ] **Step 6: Register `AuditLog` in the e2e test harness**

In `server/test/utils/create-test-app.ts`, add the import:

```typescript
import { AuditLog } from '../../src/database/entities/audit-log.entity';
```

And push it into `ALL_ENTITIES`:

```typescript
const ALL_ENTITIES = [
  User, Client, Praticien, PraticienDocument, Cercle, Event, EventPraticien,
  Promotion, Discipline, Article, Notification, EmailTemplate, Echange, Paiement,
  Remboursement, RendezVous, Avis, Signalement, Favorite, NotificationPreference,
  AuditLog,
];
```

- [ ] **Step 7: Register the module in `app.module.ts`**

In `server/src/app.module.ts`, add the import:

```typescript
import { AuditLogModule } from './audit-log/audit-log.module';
```

And add `AuditLogModule` to the `imports` array (before the 5 services that will depend on it, for readability — order doesn't affect DI resolution):

```typescript
    RemboursementsModule,
    AuditLogModule,
    AvisModule,
    SignalementsModule,
```

- [ ] **Step 8: Run the spec to verify it fails, then passes**

Run: `npm run test:e2e -- audit-log.e2e-spec.ts`
Expected (before Steps 3-7): FAIL — `Cannot find module '../src/audit-log/audit-log.module'`.
After completing Steps 3-7, re-run the same command.
Expected: PASS (4 tests).

- [ ] **Step 9: Run the full e2e suite to check for regressions**

Run: `npm run test:e2e`
Expected: PASS (no other suite is affected — `AuditLogModule` is new and additive).

- [ ] **Step 10: Commit**

```bash
git add server/src/database/entities/audit-log.entity.ts server/src/audit-log server/test/audit-log.e2e-spec.ts server/test/utils/create-test-app.ts server/src/app.module.ts
git commit -m "feat(server): add audit-log module with paginated list and CSV export"
```

---

## Task 3: Instrument `avis.service.ts` (publish/reject)

**Files:**
- Modify: `server/src/avis/avis.service.ts`, `server/src/avis/avis.controller.ts`, `server/src/avis/avis.module.ts`

**Ground truth (found during research):** `avis.controller.ts`'s `publish`/`reject` methods currently take only `@Param('id', ParseIntPipe) id: number` — no actor is available yet. `avis.service.ts`'s `publish(id)`/`reject(id)` currently look like this (unchanged since Plan 07):

```typescript
  async publish(id: number) {
    const avis = await this.avis.findOneBy({ id });
    if (!avis) this.notFound('Avis non trouvé');
    await this.avis.update(id, { statut: 'publié' });
    return success(await this.avis.findOneBy({ id }), 'Avis publié avec succès');
  }

  async reject(id: number) {
    const avis = await this.avis.findOneBy({ id });
    if (!avis) this.notFound('Avis non trouvé');
    await this.avis.update(id, { statut: 'rejeté' });
    return success(await this.avis.findOneBy({ id }), 'Avis rejeté');
  }
```

- [ ] **Step 1: Extend the existing avis e2e assertions to expect the new actor requirement won't break anything**

No new test file needed here — `server/test/avis.e2e-spec.ts`'s existing "admin publish makes the avis visible" and "admin reject sets statut and admin delete removes the row" tests already call these two routes with a valid admin bearer token and assert only on the HTTP response body, which is unaffected by this change. Confirm this by running the existing suite before touching any code:

Run: `npm run test:e2e -- avis.e2e-spec.ts`
Expected: PASS (9 tests) — this is the pre-change baseline.

- [ ] **Step 2: Modify the service**

In `server/src/avis/avis.service.ts`, change the imports and constructor:

```typescript
import {
  Injectable, NotFoundException, UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Avis } from '../database/entities/avis.entity';
import { Client } from '../database/entities/client.entity';
import { User } from '../database/entities/user.entity';
import { success } from '../common/envelope';
import { parsePagination, paginateQb } from '../common/pagination';
import { AuditLogService } from '../audit-log/audit-log.service';
import { CreateAvisDto } from './dto/create-avis.dto';
import { UpdateAvisDto } from './dto/update-avis.dto';

@Injectable()
export class AvisService {
  constructor(
    @InjectRepository(Avis) private readonly avis: Repository<Avis>,
    private readonly auditLog: AuditLogService,
  ) {}
```

Replace `publish`/`reject`:

```typescript
  async publish(actor: User, id: number) {
    const avis = await this.avis.findOneBy({ id });
    if (!avis) this.notFound('Avis non trouvé');
    await this.avis.update(id, { statut: 'publié' });
    await this.auditLog.record(
      actor,
      'a publié un avis',
      { type: 'avis', id: avis.id, label: `Avis #${avis.id} — ${avis.full_name_author}` },
      'moderation',
      { praticien_id: avis.praticien_id },
    );
    return success(await this.avis.findOneBy({ id }), 'Avis publié avec succès');
  }

  async reject(actor: User, id: number) {
    const avis = await this.avis.findOneBy({ id });
    if (!avis) this.notFound('Avis non trouvé');
    await this.avis.update(id, { statut: 'rejeté' });
    await this.auditLog.record(
      actor,
      'a rejeté un avis',
      { type: 'avis', id: avis.id, label: `Avis #${avis.id} — ${avis.full_name_author}` },
      'moderation',
      { praticien_id: avis.praticien_id },
    );
    return success(await this.avis.findOneBy({ id }), 'Avis rejeté');
  }
```

- [ ] **Step 3: Modify the controller**

In `server/src/avis/avis.controller.ts`, add `CurrentUser` to the existing decorators import and add a `User` import:

```typescript
import { CurrentClient, CurrentUser } from '../auth/decorators';
import { Client } from '../database/entities/client.entity';
import { User } from '../database/entities/user.entity';
```

Replace the `publish`/`reject` methods:

```typescript
  @UseGuards(JwtAuthGuard, AdminGuard)
  @HttpCode(200)
  @Post('admin/avis/:id/publish')
  publish(@CurrentUser() user: User, @Param('id', ParseIntPipe) id: number) {
    return this.service.publish(user, id);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @HttpCode(200)
  @Post('admin/avis/:id/reject')
  reject(@CurrentUser() user: User, @Param('id', ParseIntPipe) id: number) {
    return this.service.reject(user, id);
  }
```

- [ ] **Step 4: Modify the module**

In `server/src/avis/avis.module.ts`, import and register `AuditLogModule`:

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Avis } from '../database/entities/avis.entity';
import { AvisController } from './avis.controller';
import { AvisService } from './avis.service';
import { AuditLogModule } from '../audit-log/audit-log.module';

@Module({
  imports: [TypeOrmModule.forFeature([Avis]), AuditLogModule],
  controllers: [AvisController],
  providers: [AvisService],
})
export class AvisModule {}
```

- [ ] **Step 5: Run the avis suite to verify no regression**

Run: `npm run test:e2e -- avis.e2e-spec.ts`
Expected: PASS (9 tests, unchanged assertions — same baseline as Step 1).

- [ ] **Step 6: Commit**

```bash
git add server/src/avis/avis.service.ts server/src/avis/avis.controller.ts server/src/avis/avis.module.ts
git commit -m "feat(server): record audit-log entries on avis publish/reject"
```

---

## Task 4: Instrument `signalements.service.ts` (resolve/reject)

**Files:**
- Modify: `server/src/signalements/signalements.service.ts`, `server/src/signalements/signalements.controller.ts`, `server/src/signalements/signalements.module.ts`

**Ground truth:** `signalements.controller.ts` already imports `CurrentUser`/`User` (used by `store()`), so no new imports are needed there — just applying the existing decorator to two more methods. `signalements.service.ts`'s `resolve(id)`/`reject(id)` currently:

```typescript
  async resolve(id: number) {
    const s = await this.signalements.findOneBy({ id });
    if (!s) this.notFound('Signalement non trouvé');
    await this.signalements.update(id, { statut: 'resolved' });
    return success(await this.signalements.findOneBy({ id }), 'Signalement résolu');
  }

  async reject(id: number) {
    const s = await this.signalements.findOneBy({ id });
    if (!s) this.notFound('Signalement non trouvé');
    await this.signalements.update(id, { statut: 'rejected' });
    return success(await this.signalements.findOneBy({ id }), 'Signalement rejeté');
  }
```

- [ ] **Step 1: Confirm the pre-change baseline**

Run: `npm run test:e2e -- signalements.e2e-spec.ts`
Expected: PASS (8 tests).

- [ ] **Step 2: Modify the service**

In `server/src/signalements/signalements.service.ts`, update imports and constructor:

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Signalement } from '../database/entities/signalement.entity';
import { User } from '../database/entities/user.entity';
import { success } from '../common/envelope';
import { parsePagination, paginateQb } from '../common/pagination';
import { sanitizeUser } from '../auth/user.util';
import { AuditLogService } from '../audit-log/audit-log.service';
import { CreateSignalementDto } from './dto/create-signalement.dto';

@Injectable()
export class SignalementsService {
  constructor(
    @InjectRepository(Signalement) private readonly signalements: Repository<Signalement>,
    private readonly auditLog: AuditLogService,
  ) {}
```

Replace `resolve`/`reject`:

```typescript
  async resolve(actor: User, id: number) {
    const s = await this.signalements.findOneBy({ id });
    if (!s) this.notFound('Signalement non trouvé');
    await this.signalements.update(id, { statut: 'resolved' });
    await this.auditLog.record(
      actor,
      'a résolu un signalement',
      { type: 'signalement', id: s.id, label: `Signalement — ${s.sujet}` },
      'moderation',
      { praticien_id: s.praticien_id, priorite: s.priorite },
    );
    return success(await this.signalements.findOneBy({ id }), 'Signalement résolu');
  }

  async reject(actor: User, id: number) {
    const s = await this.signalements.findOneBy({ id });
    if (!s) this.notFound('Signalement non trouvé');
    await this.signalements.update(id, { statut: 'rejected' });
    await this.auditLog.record(
      actor,
      'a rejeté un signalement',
      { type: 'signalement', id: s.id, label: `Signalement — ${s.sujet}` },
      'moderation',
      { praticien_id: s.praticien_id, priorite: s.priorite },
    );
    return success(await this.signalements.findOneBy({ id }), 'Signalement rejeté');
  }
```

- [ ] **Step 3: Modify the controller**

In `server/src/signalements/signalements.controller.ts`, replace `resolve`/`reject`:

```typescript
  @UseGuards(JwtAuthGuard, AdminGuard)
  @HttpCode(200)
  @Post('admin/signalements/:id/resolve')
  resolve(@CurrentUser() user: User, @Param('id', ParseIntPipe) id: number) {
    return this.service.resolve(user, id);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @HttpCode(200)
  @Post('admin/signalements/:id/reject')
  reject(@CurrentUser() user: User, @Param('id', ParseIntPipe) id: number) {
    return this.service.reject(user, id);
  }
```

(The `import { CurrentUser } from '../auth/decorators'; import { User } from '../database/entities/user.entity';` lines already exist at the top of this file for `store()` — no import changes needed.)

- [ ] **Step 4: Modify the module**

In `server/src/signalements/signalements.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Signalement } from '../database/entities/signalement.entity';
import { SignalementsController } from './signalements.controller';
import { SignalementsService } from './signalements.service';
import { AuditLogModule } from '../audit-log/audit-log.module';

@Module({
  imports: [TypeOrmModule.forFeature([Signalement]), AuditLogModule],
  controllers: [SignalementsController],
  providers: [SignalementsService],
})
export class SignalementsModule {}
```

- [ ] **Step 5: Run the signalements suite to verify no regression**

Run: `npm run test:e2e -- signalements.e2e-spec.ts`
Expected: PASS (8 tests).

- [ ] **Step 6: Commit**

```bash
git add server/src/signalements/signalements.service.ts server/src/signalements/signalements.controller.ts server/src/signalements/signalements.module.ts
git commit -m "feat(server): record audit-log entries on signalement resolve/reject"
```

---

## Task 5: Instrument `remboursements.service.ts` (approve/refuse/complete)

**Files:**
- Modify: `server/src/remboursements/remboursements.service.ts`, `server/src/remboursements/remboursements.controller.ts`, `server/src/remboursements/remboursements.module.ts`

**Ground truth:** `remboursements.controller.ts` currently only imports `CurrentClient`/`Client` (for the client-facing routes) — `CurrentUser`/`User` are new imports there. The 3 admin mutation methods currently (unchanged since Plan 06):

```typescript
  async adminApprove(id: number, dto: ApproveRemboursementDto) {
    const r = await this.remboursements.findOneBy({
      id, statut: In(['en_attente', 'en_cours']),
    });
    if (!r) this.notFound('Remboursement non trouvé ou ne peut pas être approuvé');
    if (dto.date_remboursement !== undefined && !isOnOrAfterToday(dto.date_remboursement)) {
      this.validationError({
        date_remboursement: ["Cette date doit être aujourd'hui ou postérieure."],
      });
    }
    await this.remboursements.update(id, {
      statut: 'approuve',
      commentaire_admin: dto.commentaire_admin ?? null,
      date_traitement: new Date(),
      date_remboursement: dto.date_remboursement ? new Date(dto.date_remboursement) : new Date(),
    });
    await this.paiements.update(r.paiement_id, { statut: 'rembourse' });
    return success(await this.loaded(id), 'Demande de remboursement approuvée avec succès');
  }

  async adminRefuse(id: number, dto: RefuseRemboursementDto) {
    const r = await this.remboursements.findOneBy({
      id, statut: In(['en_attente', 'en_cours']),
    });
    if (!r) this.notFound('Remboursement non trouvé ou ne peut pas être refusé');
    await this.remboursements.update(id, {
      statut: 'refuse', commentaire_admin: dto.commentaire_admin, date_traitement: new Date(),
    });
    return success(await this.loaded(id), 'Demande de remboursement refusée');
  }

  async adminComplete(id: number) {
    const r = await this.remboursements.findOneBy({ id, statut: 'approuve' });
    if (!r) this.notFound('Remboursement non trouvé ou ne peut pas être complété');
    await this.remboursements.update(id, {
      statut: 'completed', date_remboursement: new Date(),
    });
    return success(await this.loaded(id), 'Remboursement marqué comme complété');
  }
```

- [ ] **Step 1: Confirm the pre-change baseline**

Run: `npm run test:e2e -- remboursements.e2e-spec.ts`
Expected: PASS.

- [ ] **Step 2: Modify the service**

In `server/src/remboursements/remboursements.service.ts`, add imports and update the constructor:

```typescript
import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Not, Repository, SelectQueryBuilder } from 'typeorm';
import {
  Remboursement, REMBOURSEMENT_STATUT_LABELS,
} from '../database/entities/remboursement.entity';
import { Paiement } from '../database/entities/paiement.entity';
import { Client } from '../database/entities/client.entity';
import { User } from '../database/entities/user.entity';
import { success } from '../common/envelope';
import { parsePagination, paginateQb } from '../common/pagination';
import { StorageService } from '../common/storage.service';
import { assertUpload } from '../common/upload.util';
import { euro, formatDateFr, formatDateTimeFr, isOnOrAfterToday, numberFormat } from '../common/format';
import { AuditLogService } from '../audit-log/audit-log.service';
import { CreateRemboursementDto } from './dto/create-remboursement.dto';
import { ApproveRemboursementDto } from './dto/approve-remboursement.dto';
import { RefuseRemboursementDto } from './dto/refuse-remboursement.dto';

const DOC_EXTS = ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'doc', 'docx'];
const MONTH_EXPR = "SUBSTR(CAST(r.created_at AS CHAR), 1, 7)";

@Injectable()
export class RemboursementsService {
  constructor(
    @InjectRepository(Remboursement) private readonly remboursements: Repository<Remboursement>,
    @InjectRepository(Paiement) private readonly paiements: Repository<Paiement>,
    private readonly storage: StorageService,
    private readonly auditLog: AuditLogService,
  ) {}
```

Replace `adminApprove`/`adminRefuse`/`adminComplete`:

```typescript
  async adminApprove(actor: User, id: number, dto: ApproveRemboursementDto) {
    const r = await this.remboursements.findOneBy({
      id, statut: In(['en_attente', 'en_cours']),
    });
    if (!r) this.notFound('Remboursement non trouvé ou ne peut pas être approuvé');
    if (dto.date_remboursement !== undefined && !isOnOrAfterToday(dto.date_remboursement)) {
      this.validationError({
        date_remboursement: ["Cette date doit être aujourd'hui ou postérieure."],
      });
    }
    await this.remboursements.update(id, {
      statut: 'approuve',
      commentaire_admin: dto.commentaire_admin ?? null,
      date_traitement: new Date(),
      date_remboursement: dto.date_remboursement ? new Date(dto.date_remboursement) : new Date(),
    });
    await this.paiements.update(r.paiement_id, { statut: 'rembourse' });
    await this.auditLog.record(
      actor,
      'a approuvé un remboursement',
      { type: 'remboursement', id: r.id, label: r.reference },
      'finance',
      { montant: r.montant, client_id: r.client_id },
    );
    return success(await this.loaded(id), 'Demande de remboursement approuvée avec succès');
  }

  async adminRefuse(actor: User, id: number, dto: RefuseRemboursementDto) {
    const r = await this.remboursements.findOneBy({
      id, statut: In(['en_attente', 'en_cours']),
    });
    if (!r) this.notFound('Remboursement non trouvé ou ne peut pas être refusé');
    await this.remboursements.update(id, {
      statut: 'refuse', commentaire_admin: dto.commentaire_admin, date_traitement: new Date(),
    });
    await this.auditLog.record(
      actor,
      'a refusé un remboursement',
      { type: 'remboursement', id: r.id, label: r.reference },
      'finance',
      { montant: r.montant, client_id: r.client_id, motif: dto.commentaire_admin },
    );
    return success(await this.loaded(id), 'Demande de remboursement refusée');
  }

  async adminComplete(actor: User, id: number) {
    const r = await this.remboursements.findOneBy({ id, statut: 'approuve' });
    if (!r) this.notFound('Remboursement non trouvé ou ne peut pas être complété');
    await this.remboursements.update(id, {
      statut: 'completed', date_remboursement: new Date(),
    });
    await this.auditLog.record(
      actor,
      'a marqué un remboursement comme complété',
      { type: 'remboursement', id: r.id, label: r.reference },
      'finance',
      { montant: r.montant },
    );
    return success(await this.loaded(id), 'Remboursement marqué comme complété');
  }
```

- [ ] **Step 3: Modify the controller**

In `server/src/remboursements/remboursements.controller.ts`, update imports:

```typescript
import {
  Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Post, Query,
  UploadedFiles, UseGuards, UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { RemboursementsService } from './remboursements.service';
import { CreateRemboursementDto } from './dto/create-remboursement.dto';
import { ApproveRemboursementDto } from './dto/approve-remboursement.dto';
import { RefuseRemboursementDto } from './dto/refuse-remboursement.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ClientGuard } from '../auth/guards/client.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { CurrentClient, CurrentUser } from '../auth/decorators';
import { Client } from '../database/entities/client.entity';
import { User } from '../database/entities/user.entity';
```

Replace the 3 admin mutation route methods:

```typescript
  @UseGuards(JwtAuthGuard, AdminGuard)
  @HttpCode(200)
  @Post('admin/:id/approve')
  adminApprove(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ApproveRemboursementDto,
  ) {
    return this.service.adminApprove(user, id, dto);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @HttpCode(200)
  @Post('admin/:id/refuse')
  adminRefuse(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RefuseRemboursementDto,
  ) {
    return this.service.adminRefuse(user, id, dto);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @HttpCode(200)
  @Post('admin/:id/complete') // fixes real PHP route typo 'admi/{id}/complete'
  adminComplete(@CurrentUser() user: User, @Param('id', ParseIntPipe) id: number) {
    return this.service.adminComplete(user, id);
  }
```

- [ ] **Step 4: Modify the module**

In `server/src/remboursements/remboursements.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Remboursement } from '../database/entities/remboursement.entity';
import { Paiement } from '../database/entities/paiement.entity';
import { RemboursementsController } from './remboursements.controller';
import { RemboursementsService } from './remboursements.service';
import { StorageService } from '../common/storage.service';
import { AuditLogModule } from '../audit-log/audit-log.module';

@Module({
  imports: [TypeOrmModule.forFeature([Remboursement, Paiement]), AuditLogModule],
  controllers: [RemboursementsController],
  providers: [RemboursementsService, StorageService],
})
export class RemboursementsModule {}
```

- [ ] **Step 5: Run the remboursements suite to verify no regression**

Run: `npm run test:e2e -- remboursements.e2e-spec.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add server/src/remboursements/remboursements.service.ts server/src/remboursements/remboursements.controller.ts server/src/remboursements/remboursements.module.ts
git commit -m "feat(server): record audit-log entries on remboursement approve/refuse/complete"
```

---

## Task 6: Instrument `praticien-verification.service.ts` (verify/reject)

**Files:**
- Modify: `server/src/auth/praticien-verification/praticien-verification.service.ts`, `server/src/auth/praticien-verification/praticien-verification.module.ts`

**Ground truth:** unlike Tasks 3-5, `praticien-verification.controller.ts`'s `verify`/`reject` methods **already** pass `@CurrentUser() admin: User` down to the service (confirmed — no controller change needed at all here, purely a service + module change). `verify()` computes one of 3 outcomes (`valide`/`rejete`/`en_cours`) and unconditionally updates `statut_verification` at the end regardless of which — so it gets logged unconditionally too, with an action string that reflects the actual outcome. The relevant tail of the current `verify()`/`reject()` methods:

```typescript
  async verify(id: number, dto: VerifyDocumentsDto, admin: User) {
    const praticien = await this.findPending(id);
    if (!praticien) this.notFound('Praticien non trouvé ou déjà vérifié');

    for (const item of dto.documents) {
      const doc = await this.documents.findOneBy({ id: item.id, praticien_id: id });
      if (doc) {
        await this.documents.update(doc.id, {
          statut: item.statut,
          commentaire_rejet: item.commentaire_rejet ?? null,
          verifie_a: new Date(),
          verifie_par: admin.id,
        });
      }
    }

    const all = await this.documents.findBy({ praticien_id: id });
    const valides = all.filter((d) => d.statut === 'valide').length;
    const anyRejete = all.some((d) => d.statut === 'rejete');
    let statutFinal = 'en_cours';
    let motifRejet: string | null = null;
    if (all.length === 5 && valides === 5) statutFinal = 'valide';
    else if (anyRejete) {
      statutFinal = 'rejete';
      motifRejet = dto.commentaire_global ?? 'Documents rejetés';
    }
    await this.praticiens.update(id, {
      statut_verification: statutFinal,
      verifie_a: statutFinal === 'valide' ? new Date() : null,
      verifie_par: admin.id,
      motif_rejet: motifRejet,
    });
    const fresh = await this.praticiens.findOne({
      where: { id }, relations: { documents: true, verifiePar: true },
    });
    const message =
      statutFinal === 'valide' ? 'Praticien validé avec succès'
      : statutFinal === 'rejete' ? 'Praticien rejeté'
      : 'Vérification en cours';
    return success(fresh, message);
  }

  async reject(id: number, dto: RejectPraticienDto, admin: User) {
    const praticien = await this.findPending(id);
    if (!praticien) this.notFound('Praticien non trouvé ou déjà vérifié');
    await this.praticiens.update(id, {
      statut_verification: 'rejete', motif_rejet: dto.motif_rejet, verifie_par: admin.id,
    });
    await this.documents.update({ praticien_id: id }, {
      statut: 'rejete',
      commentaire_rejet: 'Rejeté suite à la décision administrative',
      verifie_a: new Date(),
      verifie_par: admin.id,
    });
    const fresh = await this.praticiens.findOne({
      where: { id }, relations: { documents: true, verifiePar: true },
    });
    return success(fresh, 'Praticien rejeté avec succès');
  }
```

- [ ] **Step 1: Confirm the pre-change baseline**

Run: `npm run test:e2e -- praticien-verification.e2e-spec.ts`
Expected: PASS (6 tests).

- [ ] **Step 2: Modify the service**

In `server/src/auth/praticien-verification/praticien-verification.service.ts`, add the import and update the constructor:

```typescript
import { AuditLogService } from '../../audit-log/audit-log.service';
```

```typescript
@Injectable()
export class PraticienVerificationService {
  constructor(
    @InjectRepository(Praticien) private readonly praticiens: Repository<Praticien>,
    @InjectRepository(PraticienDocument) private readonly documents: Repository<PraticienDocument>,
    private readonly storage: StorageService,
    private readonly auditLog: AuditLogService,
  ) {}
```

Replace the tail of `verify()` (everything from `const fresh = ...` onward):

```typescript
    const fresh = await this.praticiens.findOne({
      where: { id }, relations: { documents: true, verifiePar: true },
    });
    const message =
      statutFinal === 'valide' ? 'Praticien validé avec succès'
      : statutFinal === 'rejete' ? 'Praticien rejeté'
      : 'Vérification en cours';
    await this.auditLog.record(
      admin,
      statutFinal === 'valide' ? 'a vérifié un praticien'
        : statutFinal === 'rejete' ? 'a rejeté un praticien'
        : 'a mis à jour la vérification d’un praticien',
      { type: 'praticien', id, label: `${fresh.firstname} ${fresh.lastname}` },
      'verification',
      { statut_final: statutFinal },
    );
    return success(fresh, message);
  }
```

Replace the tail of `reject()` (everything from `const fresh = ...` onward):

```typescript
    const fresh = await this.praticiens.findOne({
      where: { id }, relations: { documents: true, verifiePar: true },
    });
    await this.auditLog.record(
      admin,
      'a rejeté un praticien',
      { type: 'praticien', id, label: `${fresh.firstname} ${fresh.lastname}` },
      'verification',
      { motif_rejet: dto.motif_rejet },
    );
    return success(fresh, 'Praticien rejeté avec succès');
  }
```

- [ ] **Step 3: Modify the module**

In `server/src/auth/praticien-verification/praticien-verification.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Praticien } from '../../database/entities/praticien.entity';
import { PraticienDocument } from '../../database/entities/praticien-document.entity';
import { PraticienVerificationController } from './praticien-verification.controller';
import { PraticienVerificationService } from './praticien-verification.service';
import { StorageService } from '../../common/storage.service';
import { AuditLogModule } from '../../audit-log/audit-log.module';

@Module({
  imports: [TypeOrmModule.forFeature([Praticien, PraticienDocument]), AuditLogModule],
  controllers: [PraticienVerificationController],
  providers: [PraticienVerificationService, StorageService],
})
export class PraticienVerificationModule {}
```

- [ ] **Step 4: Run the praticien-verification suite to verify no regression**

Run: `npm run test:e2e -- praticien-verification.e2e-spec.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add server/src/auth/praticien-verification/praticien-verification.service.ts server/src/auth/praticien-verification/praticien-verification.module.ts
git commit -m "feat(server): record audit-log entries on praticien verification verify/reject"
```

---

## Task 7: Instrument `admin-auth.service.ts` (register/deactivate/activate/destroy)

**Files:**
- Modify: `server/src/auth/admin-auth/admin-auth.service.ts`, `server/src/auth/admin-auth/admin-auth.controller.ts`, `server/src/auth/admin-auth/admin-auth.module.ts`

**Ground truth:** `deactivate(current, id)` and `destroy(current, id)` already receive the acting admin as `current: User` — pure additive service change, no controller change. `register(dto)` has no acting admin at all (it's an unguarded self-registration route — `@Post('register')` has no `@UseGuards`) — the only sensible actor is the newly-created user itself. `activate(id)` currently receives **no** actor at all and its controller route currently does **not** pass `@CurrentUser()` — this is the one method in this task that needs a real signature change on both the service and the controller (see the plan header's note on why `activate` was added to the scope: it's `deactivate`'s direct, equally-security-relevant inverse, and leaving it silently unlogged while its opposite is logged would be a real gap in exactly the kind of trail this feature exists to build). The current methods:

```typescript
  async register(dto: RegisterAdminDto) {
    if (await this.users.findOneBy({ email: dto.email })) {
      this.validationError({ email: ['Cette adresse email est déjà utilisée.'] });
    }
    const user = await this.users.save({
      name: dto.name, email: dto.email,
      password: await this.hash.hash(dto.password), is_admin: true,
    });
    return success(
      {
        user: pickUser(user, ['id', 'name', 'email', 'is_admin', 'created_at']),
        ...this.tokens.tokenPayload(user),
      },
      'Compte administrateur créé avec succès',
    );
  }

  async deactivate(current: User, id: number) {
    if (current.id === id) {
      throw new BadRequestException({
        status: 'error', message: 'Vous ne pouvez pas désactiver votre propre compte',
      });
    }
    const admin = await this.users.findOneBy({ id, is_admin: true });
    if (!admin) throw new NotFoundException({ status: 'error', message: 'Administrateur non trouvé' });
    await this.users.update(id, { is_admin: false });
    return success(undefined, 'Administrateur désactivé avec succès');
  }

  async activate(id: number) {
    const user = await this.users.findOneBy({ id });
    if (!user) throw new NotFoundException({ status: 'error', message: 'Utilisateur non trouvé' });
    await this.users.update(id, { is_admin: true });
    return success(undefined, 'Administrateur réactivé avec succès');
  }

  async destroy(current: User, id: number) {
    if (current.id === id) {
      throw new BadRequestException({
        status: 'error', message: 'Vous ne pouvez pas supprimer votre propre compte',
      });
    }
    const admin = await this.users.findOneBy({ id, is_admin: true });
    if (!admin) throw new NotFoundException({ status: 'error', message: 'Administrateur non trouvé' });
    await this.users.delete(id);
    return success(undefined, 'Administrateur supprimé avec succès');
  }
```

And the controller's `activate` route today:

```typescript
  @UseGuards(JwtAuthGuard, AdminGuard)
  @HttpCode(200)
  @Post(':id/activate')
  activate(@Param('id', ParseIntPipe) id: number) { return this.service.activate(id); }
```

- [ ] **Step 1: Confirm the pre-change baseline**

Run: `npm run test:e2e -- admin-auth.e2e-spec.ts`
Expected: PASS (6 tests).

- [ ] **Step 2: Modify the service**

In `server/src/auth/admin-auth/admin-auth.service.ts`, add the import and update the constructor:

```typescript
import { AuditLogService } from '../../audit-log/audit-log.service';
```

```typescript
@Injectable()
export class AdminAuthService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly hash: HashService,
    private readonly tokens: TokenService,
    private readonly auditLog: AuditLogService,
  ) {}
```

Replace `register`:

```typescript
  async register(dto: RegisterAdminDto) {
    if (await this.users.findOneBy({ email: dto.email })) {
      this.validationError({ email: ['Cette adresse email est déjà utilisée.'] });
    }
    const user = await this.users.save({
      name: dto.name, email: dto.email,
      password: await this.hash.hash(dto.password), is_admin: true,
    });
    await this.auditLog.record(
      user,
      'a créé un compte administrateur',
      { type: 'user', id: user.id, label: user.name },
      'system',
      { self_registration: true },
    );
    return success(
      {
        user: pickUser(user, ['id', 'name', 'email', 'is_admin', 'created_at']),
        ...this.tokens.tokenPayload(user),
      },
      'Compte administrateur créé avec succès',
    );
  }
```

Replace `deactivate`:

```typescript
  async deactivate(current: User, id: number) {
    if (current.id === id) {
      throw new BadRequestException({
        status: 'error', message: 'Vous ne pouvez pas désactiver votre propre compte',
      });
    }
    const admin = await this.users.findOneBy({ id, is_admin: true });
    if (!admin) throw new NotFoundException({ status: 'error', message: 'Administrateur non trouvé' });
    await this.users.update(id, { is_admin: false });
    await this.auditLog.record(
      current,
      'a désactivé un compte administrateur',
      { type: 'user', id: admin.id, label: admin.name },
      'system',
    );
    return success(undefined, 'Administrateur désactivé avec succès');
  }
```

Replace `activate` (note the new leading `current: User` parameter):

```typescript
  async activate(current: User, id: number) {
    const user = await this.users.findOneBy({ id });
    if (!user) throw new NotFoundException({ status: 'error', message: 'Utilisateur non trouvé' });
    await this.users.update(id, { is_admin: true });
    await this.auditLog.record(
      current,
      'a réactivé un compte administrateur',
      { type: 'user', id: user.id, label: user.name },
      'system',
    );
    return success(undefined, 'Administrateur réactivé avec succès');
  }
```

Replace `destroy`:

```typescript
  async destroy(current: User, id: number) {
    if (current.id === id) {
      throw new BadRequestException({
        status: 'error', message: 'Vous ne pouvez pas supprimer votre propre compte',
      });
    }
    const admin = await this.users.findOneBy({ id, is_admin: true });
    if (!admin) throw new NotFoundException({ status: 'error', message: 'Administrateur non trouvé' });
    await this.users.delete(id);
    await this.auditLog.record(
      current,
      'a supprimé un compte administrateur',
      { type: 'user', id: admin.id, label: admin.name },
      'system',
    );
    return success(undefined, 'Administrateur supprimé avec succès');
  }
```

- [ ] **Step 3: Modify the controller**

In `server/src/auth/admin-auth/admin-auth.controller.ts`, replace the `activate` route (the `CurrentUser`/`User` imports already exist in this file for other routes):

```typescript
  @UseGuards(JwtAuthGuard, AdminGuard)
  @HttpCode(200)
  @Post(':id/activate')
  activate(@CurrentUser() user: User, @Param('id', ParseIntPipe) id: number) {
    return this.service.activate(user, id);
  }
```

- [ ] **Step 4: Modify the module**

In `server/src/auth/admin-auth/admin-auth.module.ts` (this module currently has **no** `imports` array at all):

```typescript
import { Module } from '@nestjs/common';
import { AdminAuthController } from './admin-auth.controller';
import { AdminAuthService } from './admin-auth.service';
import { AuditLogModule } from '../../audit-log/audit-log.module';

@Module({
  imports: [AuditLogModule],
  controllers: [AdminAuthController],
  providers: [AdminAuthService],
})
export class AdminAuthModule {}
```

- [ ] **Step 5: Run the admin-auth suite to verify no regression**

Run: `npm run test:e2e -- admin-auth.e2e-spec.ts`
Expected: PASS (6 tests — the existing "admin management: list, deactivate (not self), activate, destroy" test calls `POST /api/admin/:id/activate` without asserting on its body beyond the 200 status, so the new required auth header it already sends is unaffected).

- [ ] **Step 6: Run the full e2e suite**

Run: `npm run test:e2e`
Expected: PASS — this is the first point where all 5 instrumented services plus the core audit-log module compile and run together in the full app graph.

- [ ] **Step 7: Commit**

```bash
git add server/src/auth/admin-auth/admin-auth.service.ts server/src/auth/admin-auth/admin-auth.controller.ts server/src/auth/admin-auth/admin-auth.module.ts
git commit -m "feat(server): record audit-log entries on admin create/deactivate/activate/destroy"
```

---

## Task 8: Integration e2e — prove the real endpoints actually write rows

**Files:**
- Create: `server/test/audit-log-integration.e2e-spec.ts`

This is the test that actually proves Tasks 3-7 wired correctly end-to-end — every other suite only re-confirms the pre-existing response shapes are unaffected; this one hits each of the 13 real, instrumented routes and asserts a matching `audit_logs` row exists afterward.

- [ ] **Step 1: Write the spec**

Create `server/test/audit-log-integration.e2e-spec.ts`:

```typescript
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { createTestApp, seedAdmin, seedClientUser } from './utils/create-test-app';
import { AuditLogModule } from '../src/audit-log/audit-log.module';
import { AuditLog } from '../src/database/entities/audit-log.entity';
import { AvisModule } from '../src/avis/avis.module';
import { SignalementsModule } from '../src/signalements/signalements.module';
import { RemboursementsModule } from '../src/remboursements/remboursements.module';
import { PraticienVerificationModule } from '../src/auth/praticien-verification/praticien-verification.module';
import { AdminAuthModule } from '../src/auth/admin-auth/admin-auth.module';
import { Praticien } from '../src/database/entities/praticien.entity';
import { PraticienDocument } from '../src/database/entities/praticien-document.entity';
import { Avis } from '../src/database/entities/avis.entity';
import { Signalement } from '../src/database/entities/signalement.entity';
import { Remboursement } from '../src/database/entities/remboursement.entity';
import { Paiement } from '../src/database/entities/paiement.entity';
import { Client } from '../src/database/entities/client.entity';

describe('audit log integration (real mutation points)', () => {
  let app: INestApplication;
  let ds: DataSource;
  let adminToken: string;

  beforeAll(async () => {
    app = await createTestApp({
      imports: [
        AuditLogModule, AvisModule, SignalementsModule, RemboursementsModule,
        PraticienVerificationModule, AdminAuthModule,
      ],
    });
    ds = app.get(DataSource);
    adminToken = (await seedAdmin(app, 'integ-admin@aura.io')).token;
  });
  afterAll(async () => { await app.close(); });
  const http = () => request(app.getHttpServer());
  const auth = (r: request.Test) => r.set('Authorization', `Bearer ${adminToken}`);

  const lastLogFor = (action: string) =>
    ds.getRepository(AuditLog).findOne({ where: { action }, order: { id: 'DESC' } });

  it('avis publish/reject each write one row', async () => {
    const p = await ds.getRepository(Praticien).save({
      firstname: 'P', lastname: 'L', email: 'ai-prat@x.io', telephone: '06',
      ville: 'Nice', niveau: 'n', specialite: 's', mode: 'm', status: 'actif',
      tarif: 10, experience: 1, bio: 'b'.repeat(60),
    });
    const a1 = await ds.getRepository(Avis).save({
      full_name_author: 'Ano Nyme', praticien_id: p.id, note: 5, avis: 'x'.repeat(10),
      date_ajout: new Date(), statut: 'en_attente',
    });
    const a2 = await ds.getRepository(Avis).save({
      full_name_author: 'Ano Nyme2', praticien_id: p.id, note: 2, avis: 'y'.repeat(10),
      date_ajout: new Date(), statut: 'en_attente',
    });

    await auth(http().post(`/api/admin/avis/${a1.id}/publish`)).expect(200);
    const publishLog = await lastLogFor('a publié un avis');
    expect(publishLog).toBeTruthy();
    expect(publishLog!.category).toBe('moderation');
    expect((publishLog!.metadata as any).target_label).toContain(`Avis #${a1.id}`);

    await auth(http().post(`/api/admin/avis/${a2.id}/reject`)).expect(200);
    expect(await lastLogFor('a rejeté un avis')).toBeTruthy();
  });

  it('signalement resolve/reject each write one row', async () => {
    const p = await ds.getRepository(Praticien).save({
      firstname: 'P', lastname: 'L', email: 'si-prat@x.io', telephone: '06',
      ville: 'Nice', niveau: 'n', specialite: 's', mode: 'm', status: 'actif',
      tarif: 10, experience: 1, bio: 'b'.repeat(60),
    });
    const { user: reporter } = await seedClientUser(app, 'si-reporter@aura.io');
    const s1 = await ds.getRepository(Signalement).save({
      date_signalement: new Date(), type: 'fake', sujet: 'Sujet',
      motif: 'Motif suffisant', signale_par_id: reporter.id, praticien_id: p.id,
      priorite: 'normale', statut: 'pending',
    });
    const s2 = await ds.getRepository(Signalement).save({
      date_signalement: new Date(), type: 'fake', sujet: 'Sujet2',
      motif: 'Motif suffisant2', signale_par_id: reporter.id, praticien_id: p.id,
      priorite: 'normale', statut: 'pending',
    });

    await auth(http().post(`/api/admin/signalements/${s1.id}/resolve`)).expect(200);
    expect(await lastLogFor('a résolu un signalement')).toBeTruthy();

    await auth(http().post(`/api/admin/signalements/${s2.id}/reject`)).expect(200);
    expect(await lastLogFor('a rejeté un signalement')).toBeTruthy();
  });

  it('remboursement approve/refuse/complete each write one row', async () => {
    const { client } = await seedClientUser(app, 'rb-client@aura.io');
    const p = await ds.getRepository(Praticien).save({
      firstname: 'P', lastname: 'L', email: 'rb-prat@x.io', telephone: '06',
      ville: 'Nice', niveau: 'n', specialite: 's', mode: 'm', status: 'actif',
      tarif: 10, experience: 1, bio: 'b'.repeat(60),
    });
    const mkPaiement = (ref: string) => ds.getRepository(Paiement).save({
      reference: ref, client_id: client.id, praticien_id: p.id,
      montant_brut: 50, commission: 0, montant_net_praticien: 50,
      moyen_paiement: 'carte', statut: 'paid', date_paiement: new Date(),
    });
    const mkRemb = (ref: string, paiementId: number) => ds.getRepository(Remboursement).save({
      reference: ref, client_id: client.id, paiement_id: paiementId, praticien_id: p.id,
      montant: 50, motif: 'Motif', statut: 'en_attente',
    });

    const pay1 = await mkPaiement('PAY-A1');
    const r1 = await mkRemb('RMB-A1', pay1.id);
    await auth(http().post(`/api/remboursements/admin/${r1.id}/approve`)).expect(200);
    const approveLog = await lastLogFor('a approuvé un remboursement');
    expect(approveLog).toBeTruthy();
    expect((approveLog!.metadata as any).target_label).toBe('RMB-A1');

    const pay2 = await mkPaiement('PAY-A2');
    const r2 = await mkRemb('RMB-A2', pay2.id);
    await auth(http().post(`/api/remboursements/admin/${r2.id}/refuse`))
      .send({ commentaire_admin: 'Justificatif insuffisant' }).expect(200);
    expect(await lastLogFor('a refusé un remboursement')).toBeTruthy();

    await auth(http().post(`/api/remboursements/admin/${r1.id}/complete`)).expect(200);
    expect(await lastLogFor('a marqué un remboursement comme complété')).toBeTruthy();
  });

  it('praticien-verification verify/reject each write one row', async () => {
    const p1 = await ds.getRepository(Praticien).save({
      firstname: 'Vera', lastname: 'Fied', email: 'pv1@x.io', telephone: '06',
      ville: 'Nice', niveau: 'n', specialite: 's', mode: 'm', status: 'actif',
      tarif: 10, experience: 1, bio: 'b'.repeat(60), statut_verification: 'en_attente',
    });
    const types = ['piece_identite', 'certification', 'assurance', 'domicile', 'charte'];
    const docs = [];
    for (const type of types) {
      docs.push(await ds.getRepository(PraticienDocument).save({
        praticien_id: p1.id, type, nom_fichier: `${type}.pdf`,
        chemin: `x/${type}.pdf`, mime_type: 'application/pdf', taille: 10, statut: 'en_attente',
      }));
    }
    await auth(http().post(`/api/v1/admin/praticiens/verification/${p1.id}/verify`))
      .send({ documents: docs.map((d) => ({ id: d.id, statut: 'valide' })) }).expect(200);
    const verifyLog = await lastLogFor('a vérifié un praticien');
    expect(verifyLog).toBeTruthy();
    expect((verifyLog!.metadata as any).target_label).toBe('Vera Fied');

    const p2 = await ds.getRepository(Praticien).save({
      firstname: 'Rej', lastname: 'Ected', email: 'pv2@x.io', telephone: '06',
      ville: 'Nice', niveau: 'n', specialite: 's', mode: 'm', status: 'actif',
      tarif: 10, experience: 1, bio: 'b'.repeat(60), statut_verification: 'en_attente',
    });
    await auth(http().post(`/api/v1/admin/praticiens/verification/${p2.id}/reject`))
      .send({ motif_rejet: 'Dossier incomplet et invalide' }).expect(200);
    expect(await lastLogFor('a rejeté un praticien')).toBeTruthy();
  });

  it('admin register/deactivate/activate/destroy each write one row', async () => {
    const reg = await http().post('/api/admin/register').send({
      name: 'New Admin', email: 'newadmin@aura.io',
      password: 'secret123', password_confirmation: 'secret123',
    }).expect(201);
    const registerLog = await lastLogFor('a créé un compte administrateur');
    expect(registerLog).toBeTruthy();
    expect(registerLog!.actor_id).toBe(reg.body.data.user.id);

    const { user: target } = await seedAdmin(app, 'target-admin@aura.io');
    await auth(http().post(`/api/admin/${target.id}/deactivate`)).expect(200);
    expect(await lastLogFor('a désactivé un compte administrateur')).toBeTruthy();

    await auth(http().post(`/api/admin/${target.id}/activate`)).expect(200);
    expect(await lastLogFor('a réactivé un compte administrateur')).toBeTruthy();

    await auth(http().delete(`/api/admin/${target.id}`)).expect(200);
    expect(await lastLogFor('a supprimé un compte administrateur')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run it**

Run: `npm run test:e2e -- audit-log-integration.e2e-spec.ts`
Expected: PASS (5 tests, one per instrumented service, covering all 13 call sites).

- [ ] **Step 3: Run the full e2e suite one final time**

Run: `npm run test:e2e`
Expected: PASS (every suite, including this new one).

- [ ] **Step 4: Commit**

```bash
git add server/test/audit-log-integration.e2e-spec.ts
git commit -m "test(server): verify all 13 instrumented mutation points write real audit-log rows"
```

---

## Task 9: Frontend — wire `admin/audit` to the real API

**Files:**
- Modify: `web/lib/format.js`, `web/app/admin/paiements/page.jsx`, `web/app/admin/audit/page.jsx`

**Ground truth:** the mock page (`web/app/admin/audit/page.jsx`) and mock data (`web/lib/data/admin.js`'s `auditLog` array, e.g. `{ id: 'a1', when: "il y a 12 min", who: 'Lucas Moreau', action: 'a masqué un avis', target: 'Avis #r7', kind: 'moderation' }`) define the exact target shape: 5 columns (Quand/Auteur/Action/Cible/Type), 4 stat cards (Événements/Sécurité/Modération/Finance), a category filter dropdown, search over `who`/`action`/`target`, and an "Exporter" button. `downloadCsv()` already exists once, locally, in `web/app/admin/paiements/page.jsx` (the only other real CSV-export page in this codebase) — this task is CSV export's 2nd real call site, which is the right time to extract it into the shared `web/lib/format.js`, alongside a new `relativeFr()` helper this page needs that nothing else in the codebase currently provides (the mock's `when` strings like `"il y a 12 min"`/`'hier'` were always static; the real endpoint returns a `created_at` ISO timestamp that needs to be turned into that same relative-French-time style at render time).

- [ ] **Step 1: Add `relativeFr` and `downloadCsv` to `web/lib/format.js`**

Append to the end of `web/lib/format.js`:

```javascript
export const relativeFr = (iso) => {
  if (!iso) return '';
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMin = Math.round(diffMs / 60000);
  if (diffMin < 1) return "à l'instant";
  if (diffMin < 60) return `il y a ${diffMin} min`;
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return `il y a ${diffH}h`;
  const diffD = Math.round(diffH / 24);
  if (diffD === 1) return 'hier';
  return `il y a ${diffD} jours`;
};

// Triggers a client-side download of a { filename, csv } payload as returned by
// every admin CSV-export endpoint (paiements/export/csv, admin/audit-logs/export, …).
export function downloadCsv({ filename, csv }) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}
```

- [ ] **Step 2: Point `paiements/page.jsx` at the shared `downloadCsv`**

In `web/app/admin/paiements/page.jsx`, change the import line:

```javascript
import { euro, dateFr, downloadCsv } from '@/lib/format';
```

And delete the now-redundant local definition:

```javascript
function downloadCsv({ filename, csv }) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}
```

(Nothing else in that file changes — `exportCsv()`'s body already calls `downloadCsv(res.data)`.)

- [ ] **Step 3: Rewrite `web/app/admin/audit/page.jsx`**

Replace the full file:

```jsx
'use client';
import { useQuery } from '@tanstack/react-query';
import { PageHead } from '@/components/ui/PageHead';
import { DataTable } from '@/components/ui/DataTable';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { api } from '@/lib/api';
import { relativeFr, downloadCsv } from '@/lib/format';

const KIND_LABEL = {
  moderation: 'Modération', verification: 'Vérification', finance: 'Finance',
  security: 'Sécurité', support: 'Support', system: 'Système',
};
const KIND_TONE = {
  moderation: 'info', verification: 'verified', finance: 'warning',
  security: 'danger', support: 'success', system: 'neutral',
};
const KIND_TONE_AVATAR = {
  moderation: 'sky', verification: 'violet', finance: 'gold',
  security: 'violet', support: 'sage', system: 'sky',
};

export default function AuditPage() {
  const { data, isError } = useQuery({
    queryKey: ['admin', 'audit-logs'],
    queryFn: () => api.get('/admin/audit-logs?per_page=100'),
  });

  const rows = (data?.data ?? []).map((row) => ({
    id: row.id,
    when: relativeFr(row.created_at),
    who: row.actor?.name ?? 'Système',
    action: row.action,
    target: row.metadata?.target_label || `${row.target_type} #${row.target_id ?? ''}`,
    kind: row.category,
  }));
  const stats = data?.statistiques;

  const exportCsv = async () => {
    const res = await api.get('/admin/audit-logs/export');
    downloadCsv(res.data);
  };

  const columns = [
    { key: 'when', label: 'Quand', render: (a) => <span className="small">{a.when}</span> },
    {
      key: 'who', label: 'Auteur', sortable: true,
      render: (a) => (
        <div className="row gap-2">
          <Avatar name={a.who} tone={KIND_TONE_AVATAR[a.kind]} size={28} />
          <span style={{ fontWeight: 500 }}>{a.who}</span>
        </div>
      ),
    },
    { key: 'action', label: 'Action', render: (a) => <span className="small">{a.action}</span> },
    { key: 'target', label: 'Cible', render: (a) => <span className="table-cell-main">{a.target}</span> },
    { key: 'kind', label: 'Type', render: (a) => <Badge variant={KIND_TONE[a.kind] || 'neutral'} dot>{KIND_LABEL[a.kind] || a.kind}</Badge> },
  ];

  return (
    <>
      <PageHead
        title="Journal d’audit"
        subtitle="Toutes les actions sensibles effectuées sur la plateforme."
        crumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Audit' }]}
        actions={<button type="button" className="btn btn-primary btn-sm" onClick={exportCsv}><Icon name="download" size={15} /> Exporter</button>}
      />

      <div className="grid grid-4" style={{ marginBottom: 22 }}>
        <div className="card card-pad"><div className="eyebrow">Événements</div><div className="h-2" style={{ marginTop: 6 }}>{stats ? stats.total : '—'}</div><div className="small">récents</div></div>
        <div className="card card-pad"><div className="eyebrow">Sécurité</div><div className="h-2" style={{ marginTop: 6 }}>{stats ? stats.security : '—'}</div><div className="small">alertes</div></div>
        <div className="card card-pad"><div className="eyebrow">Modération</div><div className="h-2" style={{ marginTop: 6 }}>{stats ? stats.moderation : '—'}</div><div className="small">actions</div></div>
        <div className="card card-pad"><div className="eyebrow">Finance</div><div className="h-2" style={{ marginTop: 6 }}>{stats ? stats.finance : '—'}</div><div className="small">opérations</div></div>
      </div>

      {isError && <div className="empty"><div className="glyph">❍</div>Impossible de charger le journal d’audit.</div>}

      {!isError && (
        <DataTable
          columns={columns}
          rows={rows}
          searchKeys={['who', 'action', 'target']}
          filters={[
            {
              key: 'kind', label: 'Tous les types',
              options: Object.keys(KIND_LABEL).map((k) => ({ value: k, label: KIND_LABEL[k] })),
            },
          ]}
          searchPlaceholder="Rechercher une action, un auteur…"
          pageSize={10}
        />
      )}
    </>
  );
}
```

Note: this page no longer imports `auditLog` from `@/lib/data/admin` or `ModalButton` from `@/components/ui/ModalButton` — both are now unused here. `web/lib/data/admin.js`'s `auditLog` export itself is left in place (untouched) since nothing in this plan's scope requires removing dead mock data exports that other files might still reference; only this page's *usage* of it changes.

- [ ] **Step 4: Manually verify the page still renders**

Run (in `web/`): `npm run build`
Expected: Build succeeds — this catches JSX/import errors (`Avatar`/`Badge`/`Icon`/`DataTable`/`PageHead` props are unchanged from the mock version, `relativeFr`/`downloadCsv` now resolve from `@/lib/format`).

- [ ] **Step 5: Commit**

```bash
git add web/lib/format.js web/app/admin/paiements/page.jsx web/app/admin/audit/page.jsx
git commit -m "feat(web): wire admin/audit to the real audit-logs API"
```

---

## Self-review

**1. Spec coverage** (against the "08c — Audit log" sketch + P8-7 row of `2026-07-15-aura-08-heavy-modules-design.md`):
- `audit_logs` schema exactly as specified (`id, actor_id FK users nullable, action string, target_type string, target_id nullable, category enum, metadata json nullable, created_at`) → Task 1 (migration) + Task 2 (entity). Covered.
- `AuditLogService.record(actor, action, target, category, metadata?)` signature exactly as specified → Task 2. Covered.
- Called additively from ~10 (found: 13) existing mutation points across avis/signalements/remboursements/praticien-verification/admin-auth → Tasks 3-7, each showing the real before/after diff. Covered.
- `GET /admin/audit-logs` paginated, filterable by category/actor/date range → Task 2 (`index()` + `applyFilters()`: `category`, `actor_id`, `date_debut`, `date_fin`). Covered.
- `GET /admin/audit-logs/export` CSV → Task 2 (`exportCsv()`, reusing `PaiementsService.adminExportCsv()`'s exact `{filename, csv, total}` shape and `;`-delimited format). Covered.
- Frontend: `admin/audit` mock table + stat cards + export button wired to real endpoints → Task 9. Covered.
- `actor.role` referenced in metadata where it makes sense, without assuming any 08b capability-guard mechanism, purely `AdminGuard`-gated → Task 2's `record()` (`actor_role` computed centrally, defensively) + every route in Tasks 2-7 uses only `JwtAuthGuard`+`AdminGuard`. Covered.
- 6 mock categories (`moderation|verification|finance|security|support|system`) → `AUDIT_CATEGORIES` in Task 2's entity. Covered.
- Mock columns (Quand/Auteur/Action/Cible/Type) and stat cards (Événements/Sécurité/Modération/Finance) preserved exactly → Task 9. Covered.

**2. Placeholder scan:** every code block in every task is complete, runnable code — no `TODO`, no "add appropriate X", no "similar to Task N" shorthand. Every one of the 5 instrumented services shows its full real pre-existing method body (verified against the actual files in this repo during research) followed by the full real post-change body, not a diff description. Both new e2e spec files contain complete, concrete assertions, not stubs.

**3. Type/signature consistency check:**
- `AuditLogService.record(actor: User | null, action: string, target: AuditTarget, category: AuditCategory, metadata?: Record<string, unknown>)` — this exact signature is used identically at all 13 call sites across Tasks 3-7 (positional order: actor, action, target, category, metadata).
- `AuditTarget = { type: string; id: number | null; label: string }` — every call site passes an object literal matching this shape exactly (`{ type: 'avis', id: avis.id, label: ... }`, etc.), never a bare string or a different key name.
- `AvisService.publish`/`reject`, `SignalementsService.resolve`/`reject`, `RemboursementsService.adminApprove`/`adminRefuse`/`adminComplete` all gain `actor: User` as their **new first parameter** in Tasks 3-5's diffs — and their controllers in the same tasks call `this.service.<method>(user, id, ...)` with `user` passed first, matching. `PraticienVerificationService.verify`/`reject` keep their existing `(id, dto, admin)` order unchanged (Task 6) since `admin` was already present — no controller change there, correctly noted as such. `AdminAuthService.activate` gains `current: User` as its **new first parameter** (Task 7), matching `deactivate`/`destroy`'s existing `(current, id)` order, and its controller passes `(user, id)` to match.
- Every module modified in Tasks 3-7 adds `AuditLogModule` to its `imports` array (verified against each module's real current file content, including the `admin-auth.module.ts` special case of having no prior `imports` array at all) — consistent with `AuditLogModule`'s `exports: [AuditLogService]` from Task 2.
- Frontend row-mapping in Task 9 (`row.actor?.name`, `row.metadata?.target_label`, `row.target_type`, `row.target_id`, `row.category`, `row.created_at`) matches exactly the shape `AuditLogService.index()` returns in Task 2 (raw entity fields + sanitized `actor` + JSON `metadata`).

---

## Exit criteria

- [ ] `npm run test:e2e` (in `server/`) passes in full, including the two new spec files (`audit-log.e2e-spec.ts`, `audit-log-integration.e2e-spec.ts`) and all pre-existing suites with zero regressions.
- [ ] `npm run build` passes in both `server/` and `web/`.
- [ ] A real admin session can: open `/admin/audit`, see live stat-card counts and a live table sourced from `GET /api/admin/audit-logs`, filter by type via the existing dropdown, and click "Exporter" to download a real `.csv` file containing the same rows.
- [ ] Publishing/rejecting an avis, resolving/rejecting a signalement, approving/refusing/completing a remboursement, verifying/rejecting a praticien, and creating/deactivating/reactivating/deleting an admin account each produce exactly one new row in `audit_logs`, visible on the audit page within one refetch — proven programmatically by `audit-log-integration.e2e-spec.ts` and manually verifiable by performing any one of those actions in the admin UI and reloading `/admin/audit`.
- [ ] No existing service's public method signatures changed in a way that breaks any pre-existing caller: the only "breaking" signature changes (new leading `actor`/`current` parameters on `AvisService.publish/reject`, `SignalementsService.resolve/reject`, `RemboursementsService.adminApprove/adminRefuse/adminComplete`, `AdminAuthService.activate`) are internal to this codebase and each one's sole caller (its own controller) is updated in the same task/commit.
- [ ] `AuditLogService` has exactly one write path (`record()`) and exactly two read paths (`index()`, `exportCsv()`) — no other module reaches into the `audit_logs` table directly.
