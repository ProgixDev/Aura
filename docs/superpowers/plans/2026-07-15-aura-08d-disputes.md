# Aura Plan 08d — Disputes/Litiges Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a real, admin-only `disputes` (litiges) module — entity, migration, service, controller, e2e tests — and wire the existing `web/app/admin/litiges/page.jsx` mock to it with real data and a real "Résoudre" action.

**Architecture:** `disputes` is a brand-new table with zero prior backend code, closest in shape to `signalements` (an admin-moderated `statut`-driven workflow with no client-facing write endpoint) crossed with `remboursements` (a nullable FK to `paiements`, a `montant`, and a state-guarded terminal action). This plan follows `server/src/signalements/` almost verbatim for controller/service/DTO structure, guard usage, and the bare-`@Controller()`-plus-full-path convention (all four routes live at `admin/disputes...`, spelled out per method rather than via a controller-level prefix, matching `avis`/`signalements`/`favorites`/`notification-preferences`). Unlike `signalements`, there is **no client-facing create endpoint** — every route requires `AdminGuard`, because staff open and track disputes manually (Locked decision P8-5 in the design spec). The frontend keeps `web/app/admin/litiges/page.jsx`'s existing card-based layout (not a `DataTable`) and swaps the static `disputes` mock array for `useQuery`/`useMutation` against the new endpoints, adding a "Nouveau litige" creation modal (client/praticien pickers sourced from the already-real `GET /clients` and `GET /praticiens` admin list endpoints) since the backend now requires someone to actually call `POST /admin/disputes`.

**Tech Stack:** NestJS 11 + TypeORM 0.3 + class-validator (server, unchanged); Next.js 15 + `@tanstack/react-query` + zustand `useUI` store (web, unchanged). No new dependencies. No mobile work — confirmed by searching `mobile/` for any admin surface; the only match was an unrelated `commentaire_admin` field name inside `mobile/src/data/types.ts`, not an admin app. Disputes/litiges is a web-only, admin-only feature.

**Reference:** [Plan 08 design spec, section "08d — Disputes"](../specs/2026-07-15-aura-08-heavy-modules-design.md) (P8-5 locked decision, lines 32 and 59-63) · [Plan 07](2026-07-13-aura-07-greenfield-cheap.md) (Task 3, `signalements`, is the closest built analog) · [master roadmap](2026-07-13-aura-master-roadmap.md)

**Depends on:** Nothing else in Plan 08 functionally — this plan is self-contained and uses the existing binary `AdminGuard`, exactly like every other admin route in the codebase today. The design spec's suggested sequencing (land 08d after 08b "roles" and 08c "audit log") is so that dispute resolutions eventually get capability-gated and audit-logged — that is a **future integration point, not a blocker**: once 08b/08c exist, a follow-up change would add a `@RequireCapability(...)` decorator to this plan's admin routes and an `AuditLogService.record(...)` call inside `DisputesService.resolve()`. Neither exists yet, so none of that is built here.

**Run each `npm` command from the relevant package dir** (`server/`, `web/`), not the repo root.

**Explicitly out of scope (per P8-5, not built in this plan):**
- Any client-facing "open a dispute" form or endpoint. Disputes are opened by admin staff only, via `POST /admin/disputes`.
- "Escalate to dispute" convenience actions from a rejected refund (`remboursements`) or a resolved report (`signalements`). The design spec calls this a stretch addition, not required for this sub-plan's exit criteria. It is **not built here at all** — not even as a stub — so it remains a clean, documented future extension point: whoever picks it up later would add e.g. `POST /remboursements/admin/:id/escalate-to-dispute` and `POST /admin/signalements/:id/escalate-to-dispute` endpoints that call `DisputesService.store()` internally, plus buttons on `web/app/admin/reservation/[id]/page.jsx` and `web/app/admin/signalements/page.jsx`. This plan touches neither of those files.
- Capability-gating (`@RequireCapability`) and audit logging of resolutions — depends on 08b/08c, neither of which exists yet (see "Depends on" above).
- A dedicated `/admin/litige/[id]` detail page. The existing mock never had one (the litiges page shows everything inline in cards), and the task scope is "wire the existing mock," not "build new UI surfaces." `GET /admin/disputes/:id` is still implemented (it's in the design spec's required endpoint list and is exercised directly by this plan's e2e suite), it is just not consumed by any page yet.

---

## File structure

| File | Responsibility |
|---|---|
| `server/src/database/migrations/1700000000006-AddDisputes.ts` (create) | Raw-SQL migration for the `disputes` table |
| `server/src/database/entities/dispute.entity.ts` (create) | `Dispute` TypeORM entity over the `disputes` table |
| `server/src/disputes/dto/create-dispute.dto.ts` (create) | Validates admin-supplied fields for opening a dispute |
| `server/src/disputes/dto/resolve-dispute.dto.ts` (create) | Validates the required `resolution_notes` on resolve |
| `server/src/disputes/disputes.service.ts` (create) | Index (paginated, filterable), store, show, resolve |
| `server/src/disputes/disputes.controller.ts` (create) | 4 `AdminGuard`-only routes under `admin/disputes...` |
| `server/src/disputes/disputes.module.ts` (create) | Wires the entity + client/praticien repos into the module |
| `server/test/disputes.e2e-spec.ts` (create) | Full e2e coverage: auth, validation, CRUD, resolve, filters |
| `server/test/utils/create-test-app.ts` (modify) | Register `Dispute` in `ALL_ENTITIES` |
| `server/src/app.module.ts` (modify) | Register `DisputesModule` |
| `web/app/admin/litiges/page.jsx` (modify) | Real data via `useQuery`, real "Nouveau litige" + "Résoudre" actions via `useMutation` |

---

## Task 1: Migration — `disputes` table

**Files:**
- Create: `server/src/database/migrations/1700000000006-AddDisputes.ts`

- [ ] **Step 1: Write the migration**

Create `server/src/database/migrations/1700000000006-AddDisputes.ts`:

```typescript
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDisputes1700000000006 implements MigrationInterface {
  public async up(q: QueryRunner): Promise<void> {
    await q.query(`CREATE TABLE disputes (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      client_id BIGINT UNSIGNED NOT NULL,
      praticien_id BIGINT UNSIGNED NOT NULL,
      paiement_id BIGINT UNSIGNED NULL,
      montant DECIMAL(10,2) NULL,
      motif TEXT NOT NULL,
      statut VARCHAR(20) NOT NULL DEFAULT 'ouvert',
      priorite VARCHAR(20) NOT NULL DEFAULT 'normale',
      resolution_notes TEXT NULL,
      created_at TIMESTAMP NULL,
      updated_at TIMESTAMP NULL,
      KEY idx_disputes_statut_priorite (statut, priorite),
      CONSTRAINT fk_disp_client FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
      CONSTRAINT fk_disp_praticien FOREIGN KEY (praticien_id) REFERENCES praticiens(id) ON DELETE CASCADE,
      CONSTRAINT fk_disp_paiement FOREIGN KEY (paiement_id) REFERENCES paiements(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE IF EXISTS disputes`);
  }
}
```

- [ ] **Step 2: Verify it compiles**

Run (in `server/`): `npm run build`
Expected: Build succeeds (no TypeScript errors). This only proves the file is valid `MigrationInterface` TypeScript — it does not run the SQL.

- [ ] **Step 3: Run the migration against a real database, if available**

Run (in `server/`): `npm run migration:run`
Expected: Output lists `AddDisputes1700000000006` as executed successfully, against the MySQL instance configured by `server/.env`'s `DB_*` variables (see `server/src/database/typeorm.config.ts` for defaults). **If no local MySQL instance is configured in this environment, skip this step** — Task 2's e2e suite validates the equivalent schema shape against an in-memory SQLite database built from the TypeORM entity, independent of this migration file having actually been run anywhere. The SQL above has been checked column-for-column against this plan's locked schema (`id, client_id, praticien_id, paiement_id nullable FK, montant nullable, motif, statut, priorite, resolution_notes nullable, created_at, updated_at`).

- [ ] **Step 4: Commit**

```bash
git add server/src/database/migrations/1700000000006-AddDisputes.ts
git commit -m "feat(server): add disputes migration"
```

---

## Task 2: Disputes module (admin-only: index, store, show, resolve)

**Files:**
- Create: `server/src/database/entities/dispute.entity.ts`
- Create: `server/src/disputes/dto/create-dispute.dto.ts`, `server/src/disputes/dto/resolve-dispute.dto.ts`
- Create: `server/src/disputes/disputes.service.ts`, `server/src/disputes/disputes.controller.ts`, `server/src/disputes/disputes.module.ts`
- Create: `server/test/disputes.e2e-spec.ts`
- Modify: `server/test/utils/create-test-app.ts`, `server/src/app.module.ts`

**Ground truth used (from reading the actual codebase, not assumed):**
- `signalements` is the structural template: bare `@Controller()` with each method spelling out its full path (`'admin/disputes'`, `'admin/disputes/:id'`, ...), `AdminGuard` stacked after `JwtAuthGuard` via `@UseGuards(JwtAuthGuard, AdminGuard)`, `@HttpCode(200)` on POST actions that aren't creates, `success(data, message?, extra?)` from `server/src/common/envelope.ts` wrapping every response, `parsePagination`/`paginateQb` from `server/src/common/pagination.ts` for the index route.
- `remboursements.entity.ts` is the template for the nullable `paiement_id` FK: `@Column({ type: 'int', nullable: true }) paiement_id: number | null;` plus a `@ManyToOne(() => Paiement, { nullable: true, onDelete: 'SET NULL' })`.
- JSON-body DTOs in this codebase (`CreateAvisDto`, `CreateSignalementDto`, `CreateFavoriteDto`) do **not** use `@Type(() => Number)` on numeric fields — that decorator only appears on `CreateRemboursementDto`, which is a `multipart/form-data` upload route. The global `ValidationPipe` (`server/src/common/validation.ts`) already has `transform: true, transformOptions: { enableImplicitConversion: true }`, so plain `@IsInt()`/`@IsNumber()` on a JSON body is sufficient. `POST /admin/disputes` is a plain JSON route, so its DTO follows the `CreateAvisDto` style, not `CreateRemboursementDto`'s.
- `resolve()` is guarded by the dispute's *current* `statut` (`findOneBy({ id, statut: 'ouvert' })`, 404 if not found in that state) rather than left unguarded like `signalements.resolve()`/`reject()`. This deliberately follows `remboursements`' state-guard convention (`adminApprove`/`adminRefuse` restrict to `statut: In(['en_attente', 'en_cours'])`) rather than `signalements`' looser one, because `disputes` only has two states (`ouvert`/`resolu`) with a single one-way terminal transition — an unguarded resolve would silently let staff "resolve" an already-resolved dispute and overwrite its `resolution_notes`, which is worth preventing.
- `GET /clients` (used later, in Task 3) is `AdminGuard`-only and already returns paginated client rows; `GET /praticiens` is public and already returns paginated praticien rows. Neither needs any change in this plan — confirmed by reading `server/src/clients/clients.controller.ts` and `server/src/praticiens/praticiens.controller.ts`.

- [ ] **Step 1: Write the entity and DTOs**

Create `server/src/database/entities/dispute.entity.ts`:

```typescript
import {
  Column, CreateDateColumn, Entity, JoinColumn, ManyToOne,
  PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm';
import { decimalTransformer } from '../../common/transformers';
import { Client } from './client.entity';
import { Praticien } from './praticien.entity';
import { Paiement } from './paiement.entity';

export const DISPUTE_STATUT_LABELS: Record<string, string> = {
  ouvert: 'Ouvert',
  resolu: 'Résolu',
};

@Entity('disputes')
export class Dispute {
  @PrimaryGeneratedColumn() id: number;
  @Column() client_id: number;
  @Column() praticien_id: number;
  @Column({ type: 'int', nullable: true }) paiement_id: number | null;
  @Column({
    type: 'decimal', precision: 10, scale: 2, nullable: true, transformer: decimalTransformer,
  }) montant: number | null;
  @Column({ type: 'text' }) motif: string;
  @Column({ type: 'varchar', length: 20, default: 'ouvert' }) statut: string;
  @Column({ type: 'varchar', length: 20, default: 'normale' }) priorite: string;
  @Column({ type: 'text', nullable: true }) resolution_notes: string | null;
  @CreateDateColumn({ name: 'created_at' }) created_at: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updated_at: Date;

  @ManyToOne(() => Client, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'client_id' })
  client: Client;

  @ManyToOne(() => Praticien, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'praticien_id' })
  praticien: Praticien;

  @ManyToOne(() => Paiement, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'paiement_id' })
  paiement: Paiement | null;
}
```

Create `server/src/disputes/dto/create-dispute.dto.ts`:

```typescript
import { IsIn, IsInt, IsNumber, IsOptional, IsString, Min, MinLength } from 'class-validator';

export const DISPUTE_PRIORITES = ['haute', 'normale'];

export class CreateDisputeDto {
  @IsInt() client_id: number;
  @IsInt() praticien_id: number;
  @IsOptional() @IsInt() paiement_id?: number;
  @IsOptional() @IsNumber() @Min(0) montant?: number;
  @IsString() @MinLength(3) motif: string;
  @IsOptional() @IsIn(DISPUTE_PRIORITES) priorite?: string;
}
```

Create `server/src/disputes/dto/resolve-dispute.dto.ts`:

```typescript
import { IsString, MinLength } from 'class-validator';

export class ResolveDisputeDto {
  @IsString() @MinLength(3) resolution_notes: string;
}
```

- [ ] **Step 2: Write the failing e2e spec**

Create `server/test/disputes.e2e-spec.ts`:

```typescript
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { createTestApp, seedAdmin, seedClientUser } from './utils/create-test-app';
import { DisputesModule } from '../src/disputes/disputes.module';
import { Praticien } from '../src/database/entities/praticien.entity';

describe('disputes', () => {
  let app: INestApplication;
  let adminToken: string;
  let userToken: string;
  let clientId: number;
  let praticienId: number;
  let disputeId: number;

  beforeAll(async () => {
    app = await createTestApp({ imports: [DisputesModule] });
    adminToken = (await seedAdmin(app, 'disp-admin@aura.io')).token;
    const seeded = await seedClientUser(app, 'disp-client@aura.io');
    userToken = seeded.token;
    clientId = seeded.client.id;
    const ds = app.get(DataSource);
    const p = await ds.getRepository(Praticien).save({
      firstname: 'P', lastname: 'L', email: 'disp-prat@x.io', telephone: '06',
      ville: 'Nice', niveau: 'n', specialite: 's', mode: 'm', status: 'actif',
      tarif: 10, experience: 1, bio: 'b'.repeat(60),
    });
    praticienId = p.id;
  });
  afterAll(async () => { await app.close(); });
  const http = () => request(app.getHttpServer());

  it('GET /api/admin/disputes requires AdminGuard (401 without a token, 403 for a non-admin user)', async () => {
    await http().get('/api/admin/disputes').expect(401);
    await http().get('/api/admin/disputes').set('Authorization', `Bearer ${userToken}`).expect(403);

    const res = await http().get('/api/admin/disputes')
      .set('Authorization', `Bearer ${adminToken}`).expect(200);
    expect(res.body.data).toEqual([]);
    expect(res.body.pagination).toBeDefined();
  });

  it('POST /api/admin/disputes validates required fields', async () => {
    const res = await http().post('/api/admin/disputes')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({}).expect(422);
    expect(res.body.errors.client_id).toBeDefined();
    expect(res.body.errors.praticien_id).toBeDefined();
    expect(res.body.errors.motif).toBeDefined();
  });

  it('rejects a client_id that does not exist', async () => {
    const res = await http().post('/api/admin/disputes')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ client_id: 999999, praticien_id: praticienId, motif: 'Séance écourtée sans explication' })
      .expect(422);
    expect(res.body.errors.client_id).toBeDefined();
  });

  it('creates a dispute, ouvert, priorite normale by default', async () => {
    const res = await http().post('/api/admin/disputes')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        client_id: clientId, praticien_id: praticienId, montant: 95,
        motif: 'Séance écourtée sans explication',
      }).expect(201);
    expect(res.body.data.statut).toBe('ouvert');
    expect(res.body.data.priorite).toBe('normale');
    expect(res.body.data.montant).toBe(95);
    expect(res.body.data.client).toMatchObject({ id: clientId });
    expect(res.body.data.praticien).toMatchObject({ id: praticienId });
    disputeId = res.body.data.id;
  });

  it('accepts an explicit priorite haute', async () => {
    const res = await http().post('/api/admin/disputes')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        client_id: clientId, praticien_id: praticienId,
        motif: 'Praticien injoignable depuis 3 jours', priorite: 'haute',
      }).expect(201);
    expect(res.body.data.priorite).toBe('haute');
  });

  it('GET /api/admin/disputes/:id returns the joined dispute', async () => {
    const res = await http().get(`/api/admin/disputes/${disputeId}`)
      .set('Authorization', `Bearer ${adminToken}`).expect(200);
    expect(res.body.data.id).toBe(disputeId);
    expect(res.body.data.motif).toBe('Séance écourtée sans explication');
  });

  it('GET /api/admin/disputes/:id 404s for an unknown id', async () => {
    const res = await http().get('/api/admin/disputes/999999')
      .set('Authorization', `Bearer ${adminToken}`).expect(404);
    expect(res.body.message).toBe('Litige non trouvé');
  });

  it('admin index filters by priorite', async () => {
    const res = await http().get('/api/admin/disputes?priorite=haute')
      .set('Authorization', `Bearer ${adminToken}`).expect(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data.every((d: any) => d.priorite === 'haute')).toBe(true);
  });

  it('resolve requires resolution_notes', async () => {
    const res = await http().post(`/api/admin/disputes/${disputeId}/resolve`)
      .set('Authorization', `Bearer ${adminToken}`).send({}).expect(422);
    expect(res.body.errors.resolution_notes).toBeDefined();
  });

  it('resolve sets statut to resolu and stores the notes', async () => {
    const res = await http().post(`/api/admin/disputes/${disputeId}/resolve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ resolution_notes: 'Remboursement partiel accordé au client.' }).expect(200);
    expect(res.body.data.statut).toBe('resolu');
    expect(res.body.data.resolution_notes).toBe('Remboursement partiel accordé au client.');
  });

  it('cannot resolve an already-resolved dispute', async () => {
    const res = await http().post(`/api/admin/disputes/${disputeId}/resolve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ resolution_notes: 'Nouvelle tentative.' }).expect(404);
    expect(res.body.message).toBe('Litige non trouvé ou déjà résolu');
  });

  it('admin index filters by statut=resolu', async () => {
    const res = await http().get('/api/admin/disputes?statut=resolu')
      .set('Authorization', `Bearer ${adminToken}`).expect(200);
    expect(res.body.data.find((d: any) => d.id === disputeId)).toBeDefined();
  });
});
```

- [ ] **Step 3: Register `Dispute` in the e2e test harness**

In `server/test/utils/create-test-app.ts`, add the import:

```typescript
import { Dispute } from '../../src/database/entities/dispute.entity';
```

And push it into `ALL_ENTITIES` (alongside the existing `Favorite, NotificationPreference`):

```typescript
const ALL_ENTITIES = [
  User, Client, Praticien, PraticienDocument, Cercle, Event, EventPraticien,
  Promotion, Discipline, Article, Notification, EmailTemplate, Echange, Paiement,
  Remboursement, RendezVous, Avis, Signalement, Favorite, NotificationPreference, Dispute,
];
```

- [ ] **Step 4: Run the spec to verify it fails**

Run (in `server/`): `npm run test:e2e -- disputes.e2e-spec.ts`
Expected: FAIL — `Cannot find module '../src/disputes/disputes.module'` (the module doesn't exist yet).

- [ ] **Step 5: Write the service**

Create `server/src/disputes/disputes.service.ts`:

```typescript
import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Dispute } from '../database/entities/dispute.entity';
import { Client } from '../database/entities/client.entity';
import { Praticien } from '../database/entities/praticien.entity';
import { success } from '../common/envelope';
import { parsePagination, paginateQb } from '../common/pagination';
import { CreateDisputeDto } from './dto/create-dispute.dto';
import { ResolveDisputeDto } from './dto/resolve-dispute.dto';

@Injectable()
export class DisputesService {
  constructor(
    @InjectRepository(Dispute) private readonly disputes: Repository<Dispute>,
    @InjectRepository(Client) private readonly clients: Repository<Client>,
    @InjectRepository(Praticien) private readonly praticiens: Repository<Praticien>,
  ) {}

  private notFound(message: string): never {
    throw new NotFoundException({ status: 'error', message });
  }

  private validationError(errors: Record<string, string[]>): never {
    throw new UnprocessableEntityException({
      status: 'error', message: 'Erreur de validation', errors,
    });
  }

  private withRelations() {
    return this.disputes.createQueryBuilder('d')
      .leftJoinAndSelect('d.client', 'client')
      .leftJoinAndSelect('d.praticien', 'praticien')
      .leftJoinAndSelect('d.paiement', 'paiement');
  }

  private async loaded(id: number) {
    return this.withRelations().where('d.id = :id', { id }).getOne();
  }

  async index(query: Record<string, any>) {
    const { page, perPage } = parsePagination(query, 15);
    const qb = this.withRelations();
    if (query.statut !== undefined) qb.andWhere('d.statut = :st', { st: query.statut });
    if (query.priorite !== undefined) qb.andWhere('d.priorite = :pr', { pr: query.priorite });
    qb.orderBy('d.created_at', 'DESC').addOrderBy('d.id', 'DESC');
    const { data, pagination } = await paginateQb(qb, page, perPage);
    return success(data, undefined, { pagination });
  }

  async store(dto: CreateDisputeDto) {
    const client = await this.clients.findOneBy({ id: dto.client_id });
    if (!client) this.validationError({ client_id: ["Ce client n'existe pas."] });
    const praticien = await this.praticiens.findOneBy({ id: dto.praticien_id });
    if (!praticien) this.validationError({ praticien_id: ["Ce praticien n'existe pas."] });

    const saved = await this.disputes.save({
      client_id: dto.client_id,
      praticien_id: dto.praticien_id,
      paiement_id: dto.paiement_id ?? null,
      montant: dto.montant ?? null,
      motif: dto.motif,
      priorite: dto.priorite ?? 'normale',
      statut: 'ouvert',
    });
    return success(await this.loaded(saved.id), 'Litige ouvert avec succès');
  }

  async show(id: number) {
    const d = await this.loaded(id);
    if (!d) this.notFound('Litige non trouvé');
    return success(d);
  }

  async resolve(id: number, dto: ResolveDisputeDto) {
    const d = await this.disputes.findOneBy({ id, statut: 'ouvert' });
    if (!d) this.notFound('Litige non trouvé ou déjà résolu');
    await this.disputes.update(id, { statut: 'resolu', resolution_notes: dto.resolution_notes });
    return success(await this.loaded(id), 'Litige résolu avec succès');
  }
}
```

- [ ] **Step 6: Write the controller**

Create `server/src/disputes/disputes.controller.ts`:

```typescript
import {
  Body, Controller, Get, HttpCode, Param, ParseIntPipe, Post, Query, UseGuards,
} from '@nestjs/common';
import { DisputesService } from './disputes.service';
import { CreateDisputeDto } from './dto/create-dispute.dto';
import { ResolveDisputeDto } from './dto/resolve-dispute.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

@Controller()
export class DisputesController {
  constructor(private readonly service: DisputesService) {}

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('admin/disputes')
  index(@Query() query: Record<string, any>) {
    return this.service.index(query);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post('admin/disputes')
  store(@Body() dto: CreateDisputeDto) {
    return this.service.store(dto);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('admin/disputes/:id')
  show(@Param('id', ParseIntPipe) id: number) {
    return this.service.show(id);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @HttpCode(200)
  @Post('admin/disputes/:id/resolve')
  resolve(@Param('id', ParseIntPipe) id: number, @Body() dto: ResolveDisputeDto) {
    return this.service.resolve(id, dto);
  }
}
```

- [ ] **Step 7: Write the module and register it**

Create `server/src/disputes/disputes.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Dispute } from '../database/entities/dispute.entity';
import { Client } from '../database/entities/client.entity';
import { Praticien } from '../database/entities/praticien.entity';
import { DisputesController } from './disputes.controller';
import { DisputesService } from './disputes.service';

@Module({
  imports: [TypeOrmModule.forFeature([Dispute, Client, Praticien])],
  controllers: [DisputesController],
  providers: [DisputesService],
})
export class DisputesModule {}
```

In `server/src/app.module.ts`, add the import:

```typescript
import { DisputesModule } from './disputes/disputes.module';
```

And add `DisputesModule` to the `imports` array (after `NotificationPreferencesModule`, before `RendezVousModule`):

```typescript
    FavoritesModule,
    NotificationPreferencesModule,
    DisputesModule,
    RendezVousModule,
```

- [ ] **Step 8: Run the spec to verify it passes**

Run (in `server/`): `npm run test:e2e -- disputes.e2e-spec.ts`
Expected: PASS (12 tests).

- [ ] **Step 9: Run the full e2e suite to check for regressions**

Run (in `server/`): `npm run test:e2e`
Expected: PASS (no other suite is affected).

- [ ] **Step 10: Commit**

```bash
git add server/src/database/entities/dispute.entity.ts server/src/disputes server/test/disputes.e2e-spec.ts server/test/utils/create-test-app.ts server/src/app.module.ts
git commit -m "feat(server): add disputes module with admin index/store/show/resolve"
```

---

## Task 3: Web — `admin/litiges` wiring (real data + real "Résoudre" and "Nouveau litige" actions)

**Files:**
- Modify: `web/app/admin/litiges/page.jsx`

**Ground truth used:** The mock's exact rows (`web/lib/data/admin.js:53-57`) are `{ id: 'd1', ref: 'LIT-204', date: '2026-05-21', clientName: 'Léa Marchand', practitionerName: 'Pierre Cazeneuve', amount: 95, reason: 'Séance écourtée', status: 'open', priority: 'haute' }` — `status`/`priority` there are English/French-mixed UI-only labels, distinct from the real backend's `statut: 'ouvert'|'resolu'` and `priorite: 'haute'|'normale'`. The page has no `export const metadata` (unlike `web/app/(site)/compte/*` pages), so — matching `web/app/admin/remboursements/page.jsx` and `web/app/admin/avis/page.jsx`, both already real — this is a single-file `'use client'` rewrite, no `page.jsx`/`Body.jsx` split needed. `ref` (`LIT-204`) has no backend equivalent — the locked schema has no reference column — so it is synthesized client-side as `LIT-{d.id}` purely for display, never sent to or stored by the API. The `resolveDispute` modal already registered in `web/components/modals/registry.jsx:60-62` has a `decision` field ("En faveur de…") that doesn't correspond to anything in the locked schema (no such column on `disputes`), so this task does **not** use that preset — it uses the generic `confirm` modal with `withReason: true` instead, exactly like `web/app/admin/remboursements/page.jsx:64-68`'s "Refuser" action (which also backs a required-reason POST). The stale `resolveDispute` registry entry is left as-is (unused dead preset, same as several other registry entries not consumed by any current page) rather than deleted, since touching shared registry file is out of this page-scoped task. `GET /clients` (`AdminGuard`) and `GET /praticiens` (public) are real, already-shipped endpoints (confirmed by reading their controllers) reused here to populate the "Nouveau litige" client/praticien pickers — no backend change needed for either.

- [ ] **Step 1: Rewrite `web/app/admin/litiges/page.jsx`**

Replace the full contents of `web/app/admin/litiges/page.jsx`:

```jsx
'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHead } from '@/components/ui/PageHead';
import { StatCard } from '@/components/ui/StatCard';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { ModalButton } from '@/components/ui/ModalButton';
import { useUI } from '@/lib/store';
import { api } from '@/lib/api';
import { euro, dateFr } from '@/lib/format';

const STATUT_TONE = { ouvert: 'warning', resolu: 'success' };
const STATUT_LABEL = { ouvert: 'Ouvert', resolu: 'Résolu' };
const PRIO_TONE = { haute: 'danger', normale: 'warning' };

export default function AdminLitigesPage() {
  const queryClient = useQueryClient();
  const toast = useUI((s) => s.toast);

  const { data, isError } = useQuery({
    queryKey: ['admin', 'disputes'],
    queryFn: () => api.get('/admin/disputes?per_page=100'),
  });
  const disputes = data?.data ?? [];
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin', 'disputes'] });

  // Client/praticien pickers for the "Nouveau litige" form — both endpoints are
  // already real (GET /clients is AdminGuard-only, GET /praticiens is public);
  // capped at 100 rows each, same convention as other admin list views in this
  // codebase (e.g. admin/avis uses `per_page=100`).
  const { data: clientsRes } = useQuery({
    queryKey: ['admin', 'clients', 'for-disputes'],
    queryFn: () => api.get('/clients?per_page=100'),
  });
  const { data: praticiensRes } = useQuery({
    queryKey: ['admin', 'praticiens', 'for-disputes'],
    queryFn: () => api.get('/praticiens?per_page=100'),
  });
  const clientOptions = (clientsRes?.data ?? [])
    .map((c) => ({ value: String(c.id), label: `${c.firstname} ${c.lastname}` }));
  const praticienOptions = (praticiensRes?.data ?? [])
    .map((p) => ({ value: String(p.id), label: `${p.firstname} ${p.lastname}` }));

  const createMutation = useMutation({
    mutationFn: (payload) => api.post('/admin/disputes', payload),
    onSuccess: () => { invalidate(); toast('Litige ouvert', 'success'); },
  });
  const resolveMutation = useMutation({
    mutationFn: ({ id, resolution_notes }) =>
      api.post(`/admin/disputes/${id}/resolve`, { resolution_notes }),
    onSuccess: () => { invalidate(); toast('Litige résolu', 'success'); },
  });

  const open = disputes.filter((d) => d.statut === 'ouvert').length;
  const highPriority = disputes.filter((d) => d.statut === 'ouvert' && d.priorite === 'haute').length;
  const amount = disputes.filter((d) => d.statut === 'ouvert').reduce((s, d) => s + (d.montant ?? 0), 0);

  const createPayload = {
    title: 'Ouvrir un litige',
    subtitle: 'Enregistre un différend client ↔ praticien pour médiation.',
    fields: [
      { name: 'client_id', label: 'Client', type: 'select', options: clientOptions, required: true },
      { name: 'praticien_id', label: 'Praticien', type: 'select', options: praticienOptions, required: true },
      { name: 'montant', label: 'Montant en jeu (€, optionnel)', type: 'number', placeholder: '95' },
      {
        name: 'priorite', label: 'Priorité', type: 'select', value: 'normale',
        options: [{ value: 'normale', label: 'Normale' }, { value: 'haute', label: 'Haute' }],
      },
      { name: 'motif', label: 'Motif', type: 'textarea', placeholder: 'Décrivez le différend…', required: true },
    ],
    submitLabel: 'Ouvrir le litige',
    successToast: null,
    onSubmit: (values) => createMutation.mutateAsync({
      client_id: Number(values.client_id),
      praticien_id: Number(values.praticien_id),
      montant: values.montant ? Number(values.montant) : undefined,
      priorite: values.priorite || undefined,
      motif: values.motif,
    }),
  };

  return (
    <>
      <PageHead
        title="Litiges"
        subtitle="Médiation entre clients et praticiens."
        crumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Litiges' }]}
        actions={
          <div className="row gap-2">
            <ModalButton modal="exportData" className="btn btn-soft btn-sm"><Icon name="download" size={15} /> Exporter</ModalButton>
            <ModalButton modal="form" payload={createPayload} className="btn btn-primary btn-sm"><Icon name="plus" size={15} /> Nouveau litige</ModalButton>
          </div>
        }
      />

      <div className="grid grid-3" style={{ marginBottom: 24 }}>
        <StatCard label="Litiges ouverts" value={String(open)} icon="shield" />
        <StatCard label="Priorité haute" value={String(highPriority)} icon="flag" />
        <StatCard label="Montant en jeu" value={euro(amount)} icon="euro" />
      </div>

      {isError && <div className="empty"><div className="glyph">❍</div>Impossible de charger les litiges.</div>}

      {!isError && disputes.length === 0 && (
        <div className="empty"><div className="glyph">❍</div>Aucun litige pour le moment.</div>
      )}

      <div className="stack gap-4">
        {disputes.map((d) => {
          const urgent = d.statut === 'ouvert' && d.priorite === 'haute';
          const clientName = d.client ? `${d.client.firstname} ${d.client.lastname}` : 'Client';
          const practitionerName = d.praticien ? `${d.praticien.firstname} ${d.praticien.lastname}` : 'Praticien';
          return (
            <div key={d.id} className={`card card-pad${urgent ? ' tint-violet' : ''}`} style={urgent ? { borderColor: 'var(--danger)' } : undefined}>
              <div className="between wrap gap-3" style={{ alignItems: 'flex-start' }}>
                <div className="flex-1">
                  <div className="row gap-2 wrap" style={{ marginBottom: 8 }}>
                    <strong>LIT-{d.id}</strong>
                    <Badge variant={PRIO_TONE[d.priorite] || 'neutral'}>Priorité {d.priorite}</Badge>
                    <Badge variant={STATUT_TONE[d.statut] || 'neutral'}>{STATUT_LABEL[d.statut] || d.statut}</Badge>
                    <span className="tiny muted">{dateFr(d.created_at)}</span>
                  </div>
                  <div className="h-4 serif" style={{ marginBottom: 10 }}>{d.motif}</div>
                  <div className="row gap-5 wrap small">
                    <div className="row gap-2"><Avatar name={clientName} size={28} tone="sky" /><span>{clientName} <span className="muted">· client</span></span></div>
                    <div className="row gap-2"><Avatar name={practitionerName} size={28} tone="violet" /><span>{practitionerName} <span className="muted">· praticien</span></span></div>
                    {d.montant != null && <div className="row gap-2"><Icon name="euro" size={15} color="var(--muted)" /><span>{euro(d.montant)}</span></div>}
                  </div>
                  {d.statut === 'resolu' && d.resolution_notes && (
                    <p className="small muted" style={{ marginTop: 10 }}>Résolution : {d.resolution_notes}</p>
                  )}
                </div>
                <div className="row gap-2">
                  {d.statut === 'ouvert' ? (
                    <ModalButton
                      modal="confirm"
                      payload={{
                        title: 'Résoudre le litige',
                        message: `Confirmer la résolution du litige entre ${clientName} et ${practitionerName} ?`,
                        withReason: true,
                        reasonLabel: 'Notes de résolution (requis)',
                        confirmLabel: 'Résoudre',
                        successToast: null,
                        onConfirm: (reason) => resolveMutation.mutateAsync({ id: d.id, resolution_notes: reason }),
                      }}
                      className="btn btn-primary btn-sm"
                      as="div"
                    >
                      Résoudre
                    </ModalButton>
                  ) : (
                    <Badge variant="success" dot>Résolu</Badge>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
```

- [ ] **Step 2: Verify the build compiles**

Run (in `web/`): `npm run build`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add web/app/admin/litiges/page.jsx
git commit -m "feat(web): wire admin/litiges to the real disputes API"
```

---

## Self-review

**1. Spec coverage** (against P8-5 and the "08d — Disputes" sketch in the design spec):
- Entity `disputes (id, client_id, praticien_id, paiement_id nullable FK, montant nullable, motif, statut: 'ouvert'|'resolu', priorite: 'haute'|'normale', resolution_notes nullable, created_at, updated_at)` — built exactly in Task 1 (migration) and Task 2 Step 1 (entity), field-for-field.
- `GET /admin/disputes` (paginated, filterable by statut) — `DisputesService.index()`, also filterable by `priorite` (a reasonable superset, not a deviation — the priorite filter is exercised by an e2e test and consumed nowhere unexpected).
- `POST /admin/disputes` (admin manually opens one) — `DisputesService.store()`, FK-validated, no client-facing route exists anywhere in the controller.
- `GET /admin/disputes/:id` — `DisputesService.show()`, built and e2e-tested even though no page consumes it yet (matches the design spec's required endpoint list).
- `POST /admin/disputes/:id/resolve` (sets statut='resolu', requires resolution_notes) — `DisputesService.resolve()` + `ResolveDisputeDto`'s `@IsString() @MinLength(3)`.
- All routes `AdminGuard`-only — every controller method stacks `@UseGuards(JwtAuthGuard, AdminGuard)`; verified by e2e (401 without a token, 403 for a non-admin JWT).
- No client-facing create endpoint — confirmed: `DisputesController` has zero routes reachable by `ClientGuard` or a bare `JwtAuthGuard`.
- Frontend wired to real data with a real "Résoudre" modal — Task 3, `useQuery`/`useMutation` replacing the static `disputes` import, `ModalButton modal="confirm" withReason` calling the real resolve endpoint.
- Escalation stretch feature — explicitly not built, documented as a future extension point in the plan header's "Explicitly out of scope" section (chose "omit + document," per the assignment's stated options).
- Mobile — confirmed no admin surface exists in `mobile/` (grep found only an unrelated `commentaire_admin` field name); no mobile task included.

**2. Placeholder scan:** Searched this document for `TBD`, `TODO`, "implement later," "add appropriate error handling," "similar to Task N," and unshown code. None found — every step has complete, real code; every step that changes a file shows the whole change or an exact insertion point with surrounding context.

**3. Type/signature consistency:**
- Entity columns (`client_id`, `praticien_id`, `paiement_id`, `montant`, `motif`, `statut`, `priorite`, `resolution_notes`) match the migration's SQL columns match `CreateDisputeDto`'s/`ResolveDisputeDto`'s field names match the e2e spec's request bodies and assertions match the frontend's `createPayload`/`resolveMutation` request bodies — traced end to end, no renames slipped in anywhere (e.g. `resolution_notes` is spelled identically in the entity, the DTO, the service, the e2e spec, and the web mutation).
- `DisputesService.store/show/resolve/index` signatures match exactly what `DisputesController`'s four methods call.
- `DISPUTE_STATUT_LABELS`/`DISPUTE_PRIORITES` exported constants are unused outside their own files in this plan (no frontend import) — left in place as the same kind of self-documenting export `REMBOURSEMENT_STATUT_LABELS` already is in `remboursement.entity.ts`, not a dangling reference.
- `ALL_ENTITIES` in `create-test-app.ts` gets exactly one new entry (`Dispute`), appended after the existing last entry (`NotificationPreference`) — verified against the file's actual current contents (read fresh in this session), not assumed from Plan 07's plan text.
- `app.module.ts`'s `imports` array insertion point (`after NotificationPreferencesModule, before RendezVousModule`) matches the file's actual current order (verified by reading it fresh).

---

## Exit criteria

- `npm run test:e2e -- disputes.e2e-spec.ts` passes (12 tests) and `npm run test:e2e` (full suite) passes with no regressions.
- `npm run build` succeeds in both `server/` and `web/`.
- `GET/POST /api/admin/disputes`, `GET /api/admin/disputes/:id`, `POST /api/admin/disputes/:id/resolve` all exist, are `AdminGuard`-only, and match the locked schema.
- `web/app/admin/litiges/page.jsx` renders real disputes from the API (no import of the static `disputes` mock from `web/lib/data/admin.js` remains in this file), supports opening a new dispute via a real form, and resolving an open dispute via a real, note-requiring action.
- No client-facing or mobile surface exposes disputes in any way.
