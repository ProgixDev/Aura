# Aura Plan 07 — Greenfield Backend Modules, Cheap First — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build 4 real backend modules (reviews/avis, reports/signalements, favorites, notification preferences) and wire every matching frontend surface on web and mobile, replacing hardcoded mock arrays with live API calls.

**Architecture:** Two of the four tables (`avis`, `signalements`) already exist from the initial migration with zero code on top — this plan adds entity + DTO + service + controller + module for each, mirroring the existing `cercles`/`notifications` (simple CRUD) and `echanges`/`remboursements` (client-scoped + admin-moderated) modules exactly. Two tables (`favorites`, `notification_preferences`) are new — a single migration adds both, then they get the same module treatment. `favorites` mirrors the `event_praticien` pivot-table entity shape. All four modules register routes with a bare `@Controller()` (no class-level prefix) and full per-method paths (e.g. `@Get('client/avis')`), because the required route shape (`/api/client/avis`, `/api/admin/avis`, `/api/avis`) puts the role segment *before* the resource name, unlike the existing `echanges`/`remboursements` convention (resource before role) — this is a deliberate, spec-mandated deviation, not an inconsistency. Frontend wiring calls the existing `web/lib/api.js` / `mobile/src/data/api/client.ts` clients directly; both already attach whatever bearer token Plan 03 sets via `setAuthToken()`, so none of this plan's client-scoped pages need to import an auth store — Plan 03 is assumed to already gate `/compte/*` (web) and the authed mobile screens before a user ever reaches this code.

**Tech Stack:** NestJS 11 + TypeORM 0.3 + class-validator (server, unchanged); Next.js 15 + `@tanstack/react-query` + zustand `useUI` store (web, unchanged); Expo Router + `@tanstack/react-query` + zustand (mobile, unchanged). No new dependencies on any of the three codebases.

**Reference:** [master roadmap](2026-07-13-aura-master-roadmap.md) · [Plan 01](2026-07-13-aura-01-foundation.md) · [checklist](../../frontend-functionality-checklist.md)

**Depends on:** Plan 03 (client auth — `ClientGuard`/`JwtAuthGuard` already exist in `server/src/auth/`, confirmed during research; Plan 03 is what actually gets real client JWTs into users' hands and gates `/compte/*`). Run this plan *after* Plans 02 and 03 have landed.

**Run each `npm` command from the relevant package dir** (`server/`, `web/`, `mobile/`), not the repo root.

**A note on two known, deliberate scope gaps** (call these out to reviewers, don't silently "fix" them by expanding scope):
1. Web's client-facing "Signaler" `FormModal` (`report` in `web/components/modals/registry.jsx`, used from `praticien/[id]/page.jsx`) is **not** wired to the new `POST /api/signalements` endpoint in this plan. The task spec that generated this plan enumerates mobile's `report.tsx` as in-scope but never mentions this web modal. Flagging it here as a candidate for Plan 09 (Polish) rather than silently adding unrequested scope.
2. `mobile/app/(tabs)/profil.tsx`'s "Laisser un avis" row has no real séance/booking data source yet (that's Plan 04/05 territory) — there is no way to know *which* praticien it should target. This plan makes `review.tsx` itself fully real and gives it a **proper**, fully-wired entry point from `praticien/[id].tsx`'s reviews tab. The `profil.tsx` row still navigates to `/review`, but without a `praticienId` — `review.tsx` shows an honest "pick a praticien from their profile" empty state in that case, rather than the current fake hardcoded submission. See Task 11.

---

## File structure

| File | Responsibility |
|---|---|
| `server/src/database/migrations/1700000000001-AddFavoritesAndNotificationPreferences.ts` (create) | Raw-SQL migration for the 2 new tables |
| `server/src/database/entities/avis.entity.ts` (create) | `Avis` entity over the existing `avis` table |
| `server/src/database/entities/signalement.entity.ts` (create) | `Signalement` entity over the existing `signalements` table |
| `server/src/database/entities/favorite.entity.ts` (create) | `Favorite` pivot entity |
| `server/src/database/entities/notification-preference.entity.ts` (create) | `NotificationPreference` entity |
| `server/src/avis/*` (create) | Avis module: public browse, client CRUD, admin moderation |
| `server/src/signalements/*` (create) | Signalements module: client create, admin resolve/reject |
| `server/src/favorites/*` (create) | Favorites module: client list/add/remove |
| `server/src/notification-preferences/*` (create) | Notification-preferences module: client get/upsert |
| `server/test/{avis,signalements,favorites,notification-preferences}.e2e-spec.ts` (create) | Full e2e coverage per module |
| `server/test/utils/create-test-app.ts` (modify) | Register the 4 new entities in `ALL_ENTITIES` |
| `server/src/app.module.ts` (modify) | Register the 4 new modules |
| `web/app/(site)/compte/avis/page.jsx` (modify) + `AvisList.jsx` (create) | "Mes avis" — real data, extracted client component (page keeps `metadata` export) |
| `web/app/admin/avis/page.jsx` (modify) | Admin avis moderation table, real data |
| `web/app/(site)/compte/parametres/Toggle.jsx` (modify) + `NotificationsSection.jsx` (create) | Real notification-preference toggles |
| `web/app/(site)/compte/favoris/page.jsx` (modify) + `FavorisList.jsx` (create) | "Mes favoris" — real data, extracted client component |
| `web/app/admin/signalements/page.jsx` (modify) | Admin signalements table, real data |
| `web/app/(site)/praticien/[id]/page.jsx` (modify) + `FavoriteButton.jsx` (create) | Real favorite heart toggle |
| `web/app/(site)/praticien/[id]/ProfileBody.jsx` (modify) | Real reviews tab (self-fetches, no longer needs a `reviews` prop) |
| `mobile/app/review.tsx`, `mobile/app/report.tsx` (modify) | Accept `praticienId`, submit for real |
| `mobile/app/(tabs)/profil.tsx` (modify) | Wire "favoris" + "Notifications" rows to new screens |
| `mobile/app/praticien/[id].tsx` (modify) | Real favorite heart, real reviews tab, "Laisser un avis" entry point, `/report` param |
| `mobile/app/favorites.tsx`, `mobile/app/notification-settings.tsx` (create) | New account screens |
| `mobile/app/_layout.tsx` (modify) | Register the 2 new screens |
| `mobile/src/data/types.ts` (modify) | Add `Avis`, `Signalement`, `NotificationPreferences`, `FavoritePraticien` types |
| `mobile/src/data/repos/index.ts` (modify) | Add `avisRepo`, `signalementRepo`, `favoriteRepo`, `notificationPreferencesRepo`; repoint `practitionerRepo.reviewsFor` |

---

## Task 1: Migration — `favorites` + `notification_preferences` tables

**Files:**
- Create: `server/src/database/migrations/1700000000001-AddFavoritesAndNotificationPreferences.ts`

- [ ] **Step 1: Write the migration**

Create `server/src/database/migrations/1700000000001-AddFavoritesAndNotificationPreferences.ts`:

```typescript
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFavoritesAndNotificationPreferences1700000000001
  implements MigrationInterface
{
  public async up(q: QueryRunner): Promise<void> {
    await q.query(`CREATE TABLE favorites (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      client_id BIGINT UNSIGNED NOT NULL,
      praticien_id BIGINT UNSIGNED NOT NULL,
      created_at TIMESTAMP NULL,
      UNIQUE KEY uq_favorites_client_praticien (client_id, praticien_id),
      CONSTRAINT fk_fav_client FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
      CONSTRAINT fk_fav_praticien FOREIGN KEY (praticien_id) REFERENCES praticiens(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await q.query(`CREATE TABLE notification_preferences (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      client_id BIGINT UNSIGNED NOT NULL UNIQUE,
      rappels_seance TINYINT(1) NOT NULL DEFAULT 1,
      nouveaux_messages TINYINT(1) NOT NULL DEFAULT 1,
      reponses_avis TINYINT(1) NOT NULL DEFAULT 0,
      newsletter TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP NULL,
      updated_at TIMESTAMP NULL,
      CONSTRAINT fk_np_client FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  }

  public async down(q: QueryRunner): Promise<void> {
    for (const t of ['notification_preferences', 'favorites']) {
      await q.query(`DROP TABLE IF EXISTS ${t}`);
    }
  }
}
```

- [ ] **Step 2: Verify it compiles**

Run (in `server/`): `npm run build`
Expected: Build succeeds (no TypeScript errors). This only proves the file is valid `MigrationInterface` TypeScript — it does not run the SQL.

- [ ] **Step 3: Run the migration against a real database, if available**

Run (in `server/`): `npm run migration:run`
Expected: Output lists `AddFavoritesAndNotificationPreferences1700000000001` as executed successfully, against the MySQL instance configured by `server/.env`'s `DB_*` variables (see `server/src/database/typeorm.config.ts` for the defaults it falls back to). **If no local MySQL instance is configured in this environment, skip this step** — every later task's e2e suite validates the equivalent schema shape against an in-memory SQLite database built from the TypeORM entities (Task 4/5), independent of this migration file actually having been run anywhere. The SQL above has already been checked character-for-character against the schema given in this plan's source spec.

- [ ] **Step 4: Commit**

```bash
git add server/src/database/migrations/1700000000001-AddFavoritesAndNotificationPreferences.ts
git commit -m "feat(server): add favorites and notification_preferences migration"
```

---

## Task 2: Avis module (public browse, client CRUD, admin moderation)

**Files:**
- Create: `server/src/database/entities/avis.entity.ts`
- Create: `server/src/avis/avis.module.ts`, `server/src/avis/avis.controller.ts`, `server/src/avis/avis.service.ts`
- Create: `server/src/avis/dto/create-avis.dto.ts`, `server/src/avis/dto/update-avis.dto.ts`
- Create: `server/test/avis.e2e-spec.ts`
- Modify: `server/test/utils/create-test-app.ts`, `server/src/app.module.ts`

- [ ] **Step 1: Write the entity and DTOs**

Create `server/src/database/entities/avis.entity.ts`:

```typescript
import {
  Column, CreateDateColumn, Entity, JoinColumn, ManyToOne,
  PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm';
import { Praticien } from './praticien.entity';

@Entity('avis')
export class Avis {
  @PrimaryGeneratedColumn() id: number;
  @Column() full_name_author: string;
  @Column() praticien_id: number;
  @Column({ type: 'int' }) note: number;
  @Column({ type: 'text' }) avis: string;
  @Column({ type: 'datetime' }) date_ajout: Date;
  @Column() statut: string;
  @CreateDateColumn({ name: 'created_at' }) created_at: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updated_at: Date;

  @ManyToOne(() => Praticien, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'praticien_id' })
  praticien: Praticien;
}
```

Create `server/src/avis/dto/create-avis.dto.ts`:

```typescript
import { IsInt, IsString, Max, Min, MinLength } from 'class-validator';

export class CreateAvisDto {
  @IsInt() praticien_id: number;
  @IsInt() @Min(1) @Max(5) note: number;
  @IsString() @MinLength(3) avis: string;
}
```

Create `server/src/avis/dto/update-avis.dto.ts` (standalone, **not** `PartialType(CreateAvisDto)` — `praticien_id` must never be client-settable on update, and `whitelist: true` only strips fields that aren't decorated here):

```typescript
import { IsInt, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';

export class UpdateAvisDto {
  @IsOptional() @IsInt() @Min(1) @Max(5) note?: number;
  @IsOptional() @IsString() @MinLength(3) avis?: string;
}
```

- [ ] **Step 2: Write the failing e2e spec**

Create `server/test/avis.e2e-spec.ts`:

```typescript
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { createTestApp, seedAdmin, seedClientUser } from './utils/create-test-app';
import { AvisModule } from '../src/avis/avis.module';
import { Praticien } from '../src/database/entities/praticien.entity';

describe('avis', () => {
  let app: INestApplication;
  let clientToken: string;
  let adminToken: string;
  let praticienId: number;
  let avisId: number;

  beforeAll(async () => {
    app = await createTestApp({ imports: [AvisModule] });
    clientToken = (await seedClientUser(app, 'avis-client@aura.io')).token;
    adminToken = (await seedAdmin(app, 'avis-admin@aura.io')).token;
    const ds = app.get(DataSource);
    const p = await ds.getRepository(Praticien).save({
      firstname: 'P', lastname: 'L', email: 'avis-prat@x.io', telephone: '06',
      ville: 'Nice', niveau: 'n', specialite: 's', mode: 'm', status: 'actif',
      tarif: 10, experience: 1, bio: 'b'.repeat(60),
    });
    praticienId = p.id;
  });
  afterAll(async () => { await app.close(); });
  const http = () => request(app.getHttpServer());

  it('public GET /api/avis requires praticien_id and returns only publié rows', async () => {
    const missing = await http().get('/api/avis').expect(422);
    expect(missing.body.errors.praticien_id).toBeDefined();

    const empty = await http().get(`/api/avis?praticien_id=${praticienId}`).expect(200);
    expect(empty.body.data).toEqual([]);
  });

  it('client store requires auth, validates note 1-5, creates en_attente attributed by full name', async () => {
    await http().post('/api/client/avis')
      .send({ praticien_id: praticienId, note: 5, avis: 'Une très belle séance' }).expect(401);

    const bad = await http().post('/api/client/avis')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ praticien_id: praticienId, note: 9, avis: 'x' }).expect(422);
    expect(bad.body.errors.note).toBeDefined();

    const res = await http().post('/api/client/avis')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ praticien_id: praticienId, note: 5, avis: 'Une très belle séance' }).expect(201);
    expect(res.body.data.statut).toBe('en_attente');
    expect(res.body.data.full_name_author).toBe('Client Test');
    expect(res.body.data.date_ajout).toBeTruthy();
    avisId = res.body.data.id;
  });

  it('a fresh avis stays hidden from the public feed while en_attente', async () => {
    const res = await http().get(`/api/avis?praticien_id=${praticienId}`).expect(200);
    expect(res.body.data).toEqual([]);
  });

  it('client GET /client/avis lists own reviews by full-name match, joined with praticien', async () => {
    const res = await http().get('/api/client/avis')
      .set('Authorization', `Bearer ${clientToken}`).expect(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].praticien).toMatchObject({ id: praticienId });
  });

  it('client can update the avis while en_attente', async () => {
    const upd = await http().put(`/api/client/avis/${avisId}`)
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ note: 4, avis: 'Édité : toujours aussi bien' }).expect(200);
    expect(upd.body.data.note).toBe(4);
    expect(upd.body.data.avis).toBe('Édité : toujours aussi bien');
  });

  it('admin publish makes the avis visible on the public feed', async () => {
    const pub = await http().post(`/api/admin/avis/${avisId}/publish`)
      .set('Authorization', `Bearer ${adminToken}`).expect(200);
    expect(pub.body.data.statut).toBe('publié');

    const feed = await http().get(`/api/avis?praticien_id=${praticienId}`).expect(200);
    expect(feed.body.data).toHaveLength(1);
    expect(feed.body.data[0].statut).toBe('publié');
  });

  it('client can no longer edit or delete once published', async () => {
    const upd = await http().put(`/api/client/avis/${avisId}`)
      .set('Authorization', `Bearer ${clientToken}`).send({ note: 1 }).expect(404);
    expect(upd.body.message).toBe('Avis non trouvé ou ne peut pas être modifié');
    const del = await http().delete(`/api/client/avis/${avisId}`)
      .set('Authorization', `Bearer ${clientToken}`).expect(404);
    expect(del.body.message).toBe('Avis non trouvé ou ne peut pas être supprimé');
  });

  it('admin index paginates, filters by statut, and requires AdminGuard', async () => {
    const res = await http().get('/api/admin/avis?statut=publié')
      .set('Authorization', `Bearer ${adminToken}`).expect(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.pagination).toBeDefined();

    await http().get('/api/admin/avis').expect(401);
  });

  it('admin reject sets statut and admin delete removes the row', async () => {
    const created = await http().post('/api/client/avis')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ praticien_id: praticienId, note: 2, avis: 'Deuxième avis du même auteur' }).expect(201);
    const id2 = created.body.data.id;

    const rej = await http().post(`/api/admin/avis/${id2}/reject`)
      .set('Authorization', `Bearer ${adminToken}`).expect(200);
    expect(rej.body.data.statut).toBe('rejeté');

    await http().delete(`/api/admin/avis/${id2}`)
      .set('Authorization', `Bearer ${adminToken}`).expect(200);
    const list = await http().get('/api/admin/avis')
      .set('Authorization', `Bearer ${adminToken}`).expect(200);
    expect(list.body.data.find((a: any) => a.id === id2)).toBeUndefined();
  });
});
```

- [ ] **Step 3: Register `Avis` in the e2e test harness**

In `server/test/utils/create-test-app.ts`, add the import and push it into `ALL_ENTITIES`:

```typescript
import { Avis } from '../../src/database/entities/avis.entity';
```

```typescript
const ALL_ENTITIES = [
  User, Client, Praticien, PraticienDocument, Cercle, Event, EventPraticien,
  Promotion, Discipline, Article, Notification, EmailTemplate, Echange, Paiement,
  Remboursement, Avis,
];
```

- [ ] **Step 4: Run the spec to verify it fails**

Run: `npm run test:e2e -- avis.e2e-spec.ts`
Expected: FAIL — `Cannot find module '../src/avis/avis.module'` (the module doesn't exist yet).

- [ ] **Step 5: Write the service**

Create `server/src/avis/avis.service.ts`:

```typescript
import {
  Injectable, NotFoundException, UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Avis } from '../database/entities/avis.entity';
import { Client } from '../database/entities/client.entity';
import { success } from '../common/envelope';
import { parsePagination, paginateQb } from '../common/pagination';
import { CreateAvisDto } from './dto/create-avis.dto';
import { UpdateAvisDto } from './dto/update-avis.dto';

@Injectable()
export class AvisService {
  constructor(@InjectRepository(Avis) private readonly avis: Repository<Avis>) {}

  private notFound(message: string): never {
    throw new NotFoundException({ status: 'error', message });
  }

  private fullName(client: Client): string {
    return `${client.firstname} ${client.lastname}`;
  }

  // ---- public ----

  async publicIndex(query: Record<string, any>) {
    if (query.praticien_id === undefined) {
      throw new UnprocessableEntityException({
        status: 'error',
        message: 'Erreur de validation',
        errors: { praticien_id: ['Le paramètre praticien_id est requis.'] },
      });
    }
    const rows = await this.avis.createQueryBuilder('a')
      .where('a.praticien_id = :pid AND a.statut = :st', {
        pid: Number(query.praticien_id), st: 'publié',
      })
      .orderBy('a.date_ajout', 'DESC')
      .getMany();
    return success(rows);
  }

  // ---- client ----
  // Note: `avis` has no client_id column — ownership is approximated by matching
  // full_name_author against the current client's name. This is a real, acknowledged
  // schema limitation (not a bug): two clients with identical names would collide.

  async store(client: Client, dto: CreateAvisDto) {
    const saved = await this.avis.save({
      full_name_author: this.fullName(client),
      praticien_id: dto.praticien_id,
      note: dto.note,
      avis: dto.avis,
      date_ajout: new Date(),
      statut: 'en_attente',
    });
    return success(saved, 'Votre avis a été envoyé et sera publié après vérification');
  }

  async mine(client: Client) {
    const rows = await this.avis.createQueryBuilder('a')
      .leftJoinAndSelect('a.praticien', 'praticien')
      .where('a.full_name_author = :name', { name: this.fullName(client) })
      .orderBy('a.date_ajout', 'DESC')
      .getMany();
    return success(rows);
  }

  async update(client: Client, id: number, dto: UpdateAvisDto) {
    const avis = await this.avis.findOneBy({
      id, full_name_author: this.fullName(client), statut: 'en_attente',
    });
    if (!avis) this.notFound('Avis non trouvé ou ne peut pas être modifié');
    await this.avis.update(id, { ...dto });
    return success(await this.avis.findOneBy({ id }), 'Avis mis à jour avec succès');
  }

  async destroy(client: Client, id: number) {
    const avis = await this.avis.findOneBy({
      id, full_name_author: this.fullName(client), statut: 'en_attente',
    });
    if (!avis) this.notFound('Avis non trouvé ou ne peut pas être supprimé');
    await this.avis.delete(id);
    return success(undefined, 'Avis supprimé avec succès');
  }

  // ---- admin ----

  async adminIndex(query: Record<string, any>) {
    const { page, perPage } = parsePagination(query, 15);
    const qb = this.avis.createQueryBuilder('a').leftJoinAndSelect('a.praticien', 'praticien');
    if (query.statut !== undefined) qb.andWhere('a.statut = :st', { st: query.statut });
    qb.orderBy('a.date_ajout', 'DESC');
    const { data, pagination } = await paginateQb(qb, page, perPage);
    return success(data, undefined, { pagination });
  }

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

  async adminDestroy(id: number) {
    const avis = await this.avis.findOneBy({ id });
    if (!avis) this.notFound('Avis non trouvé');
    await this.avis.delete(id);
    return success(undefined, 'Avis supprimé avec succès');
  }
}
```

- [ ] **Step 6: Write the controller**

Create `server/src/avis/avis.controller.ts`:

```typescript
import {
  Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Post, Put,
  Query, UseGuards,
} from '@nestjs/common';
import { AvisService } from './avis.service';
import { CreateAvisDto } from './dto/create-avis.dto';
import { UpdateAvisDto } from './dto/update-avis.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ClientGuard } from '../auth/guards/client.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { CurrentClient } from '../auth/decorators';
import { Client } from '../database/entities/client.entity';

@Controller()
export class AvisController {
  constructor(private readonly service: AvisService) {}

  @Get('avis')
  index(@Query() query: Record<string, any>) {
    return this.service.publicIndex(query);
  }

  @UseGuards(JwtAuthGuard, ClientGuard)
  @Post('client/avis')
  store(@CurrentClient() client: Client, @Body() dto: CreateAvisDto) {
    return this.service.store(client, dto);
  }

  @UseGuards(JwtAuthGuard, ClientGuard)
  @Get('client/avis')
  mine(@CurrentClient() client: Client) {
    return this.service.mine(client);
  }

  @UseGuards(JwtAuthGuard, ClientGuard)
  @Put('client/avis/:id')
  update(
    @CurrentClient() client: Client,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAvisDto,
  ) {
    return this.service.update(client, id, dto);
  }

  @UseGuards(JwtAuthGuard, ClientGuard)
  @Delete('client/avis/:id')
  destroy(@CurrentClient() client: Client, @Param('id', ParseIntPipe) id: number) {
    return this.service.destroy(client, id);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('admin/avis')
  adminIndex(@Query() query: Record<string, any>) {
    return this.service.adminIndex(query);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @HttpCode(200)
  @Post('admin/avis/:id/publish')
  publish(@Param('id', ParseIntPipe) id: number) {
    return this.service.publish(id);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @HttpCode(200)
  @Post('admin/avis/:id/reject')
  reject(@Param('id', ParseIntPipe) id: number) {
    return this.service.reject(id);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Delete('admin/avis/:id')
  adminDestroy(@Param('id', ParseIntPipe) id: number) {
    return this.service.adminDestroy(id);
  }
}
```

- [ ] **Step 7: Write the module and register it**

Create `server/src/avis/avis.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Avis } from '../database/entities/avis.entity';
import { AvisController } from './avis.controller';
import { AvisService } from './avis.service';

@Module({
  imports: [TypeOrmModule.forFeature([Avis])],
  controllers: [AvisController],
  providers: [AvisService],
})
export class AvisModule {}
```

In `server/src/app.module.ts`, add the import and add `AvisModule` to the `imports` array (after `RemboursementsModule`):

```typescript
import { AvisModule } from './avis/avis.module';
```

```typescript
    RemboursementsModule,
    AvisModule,
```

- [ ] **Step 8: Run the spec to verify it passes**

Run: `npm run test:e2e -- avis.e2e-spec.ts`
Expected: PASS (9 tests).

- [ ] **Step 9: Run the full e2e suite to check for regressions**

Run: `npm run test:e2e`
Expected: PASS (no other suite is affected).

- [ ] **Step 10: Commit**

```bash
git add server/src/database/entities/avis.entity.ts server/src/avis server/test/avis.e2e-spec.ts server/test/utils/create-test-app.ts server/src/app.module.ts
git commit -m "feat(server): add avis module with public/client/admin endpoints"
```

---

## Task 3: Signalements module (client create, admin resolve/reject)

**Files:**
- Create: `server/src/database/entities/signalement.entity.ts`
- Create: `server/src/signalements/signalements.module.ts`, `server/src/signalements/signalements.controller.ts`, `server/src/signalements/signalements.service.ts`
- Create: `server/src/signalements/dto/create-signalement.dto.ts`
- Create: `server/test/signalements.e2e-spec.ts`
- Modify: `server/test/utils/create-test-app.ts`, `server/src/app.module.ts`

**Ground truth (given, not to be second-guessed):** `signalements` has no `client_id` column — `signale_par_id` is a direct FK to `users(id)`, so the reporting endpoint uses **`JwtAuthGuard` only** (no `ClientGuard`, no linked-`clients`-row requirement) and writes `signale_par_id: user.id` straight from the JWT-resolved `User`. There is no `deleted_at` column — resolve/reject are pure status transitions, never a delete. `type` has no backend-enforced enum (the spec gives no fixed vocabulary for it, unlike `priorite`) — constraining it here would be inventing a taxonomy nobody asked for, so it's validated as a plain bounded string; `priorite` **does** get a fixed enum (`basse|normale|haute|urgente`) because the spec gives an explicit default (`'normale'`) that only makes sense against a known set of siblings.

- [ ] **Step 1: Write the entity and DTO**

Create `server/src/database/entities/signalement.entity.ts`:

```typescript
import {
  Column, CreateDateColumn, Entity, JoinColumn, ManyToOne,
  PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm';
import { Praticien } from './praticien.entity';
import { User } from './user.entity';

@Entity('signalements')
export class Signalement {
  @PrimaryGeneratedColumn() id: number;
  @Column({ type: 'datetime' }) date_signalement: Date;
  @Column() type: string;
  @Column() sujet: string;
  @Column({ type: 'text' }) motif: string;
  @Column() signale_par_id: number;
  @Column() praticien_id: number;
  @Column({ type: 'varchar', length: 50 }) priorite: string;
  @Column({ type: 'varchar', length: 50 }) statut: string;
  @CreateDateColumn({ name: 'created_at' }) created_at: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updated_at: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'signale_par_id' })
  signalePar: User;

  @ManyToOne(() => Praticien, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'praticien_id' })
  praticien: Praticien;
}
```

Create `server/src/signalements/dto/create-signalement.dto.ts`:

```typescript
import { IsIn, IsInt, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export const SIGNALEMENT_PRIORITES = ['basse', 'normale', 'haute', 'urgente'];

export class CreateSignalementDto {
  @IsInt() praticien_id: number;
  @IsString() @MaxLength(255) type: string;
  @IsString() @MaxLength(255) sujet: string;
  @IsString() @MinLength(3) motif: string;
  @IsOptional() @IsIn(SIGNALEMENT_PRIORITES) priorite?: string;
}
```

- [ ] **Step 2: Write the failing e2e spec**

Create `server/test/signalements.e2e-spec.ts`:

```typescript
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { createTestApp, seedAdmin, seedClientUser } from './utils/create-test-app';
import { SignalementsModule } from '../src/signalements/signalements.module';
import { Praticien } from '../src/database/entities/praticien.entity';

describe('signalements', () => {
  let app: INestApplication;
  let userToken: string;
  let adminToken: string;
  let praticienId: number;
  let signalementId: number;

  beforeAll(async () => {
    app = await createTestApp({ imports: [SignalementsModule] });
    // seedClientUser also creates a plain `users` row — its token is exactly
    // what a JwtAuthGuard-only route needs; no linked `clients` row is required
    // here (signalements has no client_id column, see plan Architecture notes).
    userToken = (await seedClientUser(app, 'sig-user@aura.io')).token;
    adminToken = (await seedAdmin(app, 'sig-admin@aura.io')).token;
    const ds = app.get(DataSource);
    const p = await ds.getRepository(Praticien).save({
      firstname: 'P', lastname: 'L', email: 'sig-prat@x.io', telephone: '06',
      ville: 'Nice', niveau: 'n', specialite: 's', mode: 'm', status: 'actif',
      tarif: 10, experience: 1, bio: 'b'.repeat(60),
    });
    praticienId = p.id;
  });
  afterAll(async () => { await app.close(); });
  const http = () => request(app.getHttpServer());

  it('POST /api/signalements requires a valid JWT (401 without one)', async () => {
    await http().post('/api/signalements')
      .send({ praticien_id: praticienId, type: 'overclaim', sujet: 'Test', motif: 'Un motif suffisant' })
      .expect(401);
  });

  it('validates required fields', async () => {
    const res = await http().post('/api/signalements')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ praticien_id: praticienId }).expect(422);
    expect(res.body.errors.type).toBeDefined();
    expect(res.body.errors.sujet).toBeDefined();
    expect(res.body.errors.motif).toBeDefined();
  });

  it('creates a signalement attributed to the JWT user, pending, default priorite normale', async () => {
    const res = await http().post('/api/signalements')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        praticien_id: praticienId, type: 'overclaim',
        sujet: 'Promesses de guérison', motif: 'Le praticien a promis un miracle.',
      }).expect(201);
    expect(res.body.data.statut).toBe('pending');
    expect(res.body.data.priorite).toBe('normale');
    expect(res.body.data.signale_par_id).toBeDefined();
    signalementId = res.body.data.id;
  });

  it('rejects an unknown priorite, accepts one of the known values', async () => {
    const bad = await http().post('/api/signalements')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        praticien_id: praticienId, type: 'fake', sujet: 'Faux avis',
        motif: 'Témoignage inventé', priorite: 'inconnue',
      }).expect(422);
    expect(bad.body.errors.priorite).toBeDefined();

    const ok = await http().post('/api/signalements')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        praticien_id: praticienId, type: 'fake', sujet: 'Faux avis',
        motif: 'Témoignage inventé', priorite: 'urgente',
      }).expect(201);
    expect(ok.body.data.priorite).toBe('urgente');
  });

  it('admin index requires JwtAuthGuard + AdminGuard and paginates', async () => {
    await http().get('/api/admin/signalements').expect(401);
    await http().get('/api/admin/signalements')
      .set('Authorization', `Bearer ${userToken}`).expect(403);

    const res = await http().get('/api/admin/signalements')
      .set('Authorization', `Bearer ${adminToken}`).expect(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(2);
    expect(res.body.pagination).toBeDefined();
  });

  it('admin index filters by type', async () => {
    const res = await http().get('/api/admin/signalements?type=fake')
      .set('Authorization', `Bearer ${adminToken}`).expect(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data.every((s: any) => s.type === 'fake')).toBe(true);
  });

  it('admin resolve sets statut to resolved', async () => {
    const res = await http().post(`/api/admin/signalements/${signalementId}/resolve`)
      .set('Authorization', `Bearer ${adminToken}`).expect(200);
    expect(res.body.data.statut).toBe('resolved');
  });

  it('admin reject sets statut to rejected, and admin index filters by statut', async () => {
    const created = await http().post('/api/signalements')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        praticien_id: praticienId, type: 'other',
        sujet: 'Autre motif', motif: 'Détails du signalement',
      }).expect(201);

    const rej = await http().post(`/api/admin/signalements/${created.body.data.id}/reject`)
      .set('Authorization', `Bearer ${adminToken}`).expect(200);
    expect(rej.body.data.statut).toBe('rejected');

    const filtered = await http().get('/api/admin/signalements?statut=rejected')
      .set('Authorization', `Bearer ${adminToken}`).expect(200);
    expect(filtered.body.data.find((s: any) => s.id === created.body.data.id)).toBeDefined();
  });
});
```

- [ ] **Step 3: Register `Signalement` in the e2e test harness**

In `server/test/utils/create-test-app.ts`, add the import and push it into `ALL_ENTITIES` (alongside `Avis`, already added by Task 2):

```typescript
import { Signalement } from '../../src/database/entities/signalement.entity';
```

```typescript
const ALL_ENTITIES = [
  User, Client, Praticien, PraticienDocument, Cercle, Event, EventPraticien,
  Promotion, Discipline, Article, Notification, EmailTemplate, Echange, Paiement,
  Remboursement, Avis, Signalement,
];
```

- [ ] **Step 4: Run the spec to verify it fails**

Run: `npm run test:e2e -- signalements.e2e-spec.ts`
Expected: FAIL — `Cannot find module '../src/signalements/signalements.module'`.

- [ ] **Step 5: Write the service**

Create `server/src/signalements/signalements.service.ts`:

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Signalement } from '../database/entities/signalement.entity';
import { User } from '../database/entities/user.entity';
import { success } from '../common/envelope';
import { parsePagination, paginateQb } from '../common/pagination';
import { CreateSignalementDto } from './dto/create-signalement.dto';

@Injectable()
export class SignalementsService {
  constructor(
    @InjectRepository(Signalement) private readonly signalements: Repository<Signalement>,
  ) {}

  private notFound(message: string): never {
    throw new NotFoundException({ status: 'error', message });
  }

  private withRelations() {
    return this.signalements.createQueryBuilder('s')
      .leftJoinAndSelect('s.signalePar', 'signalePar')
      .leftJoinAndSelect('s.praticien', 'praticien');
  }

  // ---- client (JwtAuthGuard only — signale_par_id points at users, not clients) ----

  async store(user: User, dto: CreateSignalementDto) {
    const saved = await this.signalements.save({
      date_signalement: new Date(),
      type: dto.type,
      sujet: dto.sujet,
      motif: dto.motif,
      signale_par_id: user.id,
      praticien_id: dto.praticien_id,
      priorite: dto.priorite ?? 'normale',
      statut: 'pending',
    });
    return success(saved, 'Votre signalement a été transmis à la modération');
  }

  // ---- admin ----

  async adminIndex(query: Record<string, any>) {
    const { page, perPage } = parsePagination(query, 15);
    const qb = this.withRelations();
    if (query.statut !== undefined) qb.andWhere('s.statut = :st', { st: query.statut });
    if (query.type !== undefined) qb.andWhere('s.type = :ty', { ty: query.type });
    qb.orderBy('s.date_signalement', 'DESC');
    const { data, pagination } = await paginateQb(qb, page, perPage);
    return success(data, undefined, { pagination });
  }

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
}
```

- [ ] **Step 6: Write the controller**

Create `server/src/signalements/signalements.controller.ts`:

```typescript
import {
  Body, Controller, Get, HttpCode, Param, ParseIntPipe, Post, Query, UseGuards,
} from '@nestjs/common';
import { SignalementsService } from './signalements.service';
import { CreateSignalementDto } from './dto/create-signalement.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { CurrentUser } from '../auth/decorators';
import { User } from '../database/entities/user.entity';

@Controller()
export class SignalementsController {
  constructor(private readonly service: SignalementsService) {}

  @UseGuards(JwtAuthGuard)
  @Post('signalements')
  store(@CurrentUser() user: User, @Body() dto: CreateSignalementDto) {
    return this.service.store(user, dto);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('admin/signalements')
  adminIndex(@Query() query: Record<string, any>) {
    return this.service.adminIndex(query);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @HttpCode(200)
  @Post('admin/signalements/:id/resolve')
  resolve(@Param('id', ParseIntPipe) id: number) {
    return this.service.resolve(id);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @HttpCode(200)
  @Post('admin/signalements/:id/reject')
  reject(@Param('id', ParseIntPipe) id: number) {
    return this.service.reject(id);
  }
}
```

- [ ] **Step 7: Write the module and register it**

Create `server/src/signalements/signalements.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Signalement } from '../database/entities/signalement.entity';
import { SignalementsController } from './signalements.controller';
import { SignalementsService } from './signalements.service';

@Module({
  imports: [TypeOrmModule.forFeature([Signalement])],
  controllers: [SignalementsController],
  providers: [SignalementsService],
})
export class SignalementsModule {}
```

In `server/src/app.module.ts`, add the import and add `SignalementsModule` to the `imports` array (after `AvisModule`):

```typescript
import { SignalementsModule } from './signalements/signalements.module';
```

```typescript
    AvisModule,
    SignalementsModule,
```

- [ ] **Step 8: Run the spec to verify it passes**

Run: `npm run test:e2e -- signalements.e2e-spec.ts`
Expected: PASS (8 tests).

- [ ] **Step 9: Run the full e2e suite to check for regressions**

Run: `npm run test:e2e`
Expected: PASS (includes `avis.e2e-spec.ts` from Task 2, unaffected).

- [ ] **Step 10: Commit**

```bash
git add server/src/database/entities/signalement.entity.ts server/src/signalements server/test/signalements.e2e-spec.ts server/test/utils/create-test-app.ts server/src/app.module.ts
git commit -m "feat(server): add signalements module with client create and admin resolve/reject"
```

---

## Task 4: Favorites module (client list/add/remove)

**Files:**
- Create: `server/src/database/entities/favorite.entity.ts`
- Create: `server/src/favorites/favorites.module.ts`, `server/src/favorites/favorites.controller.ts`, `server/src/favorites/favorites.service.ts`
- Create: `server/src/favorites/dto/create-favorite.dto.ts`
- Create: `server/test/favorites.e2e-spec.ts`
- Modify: `server/test/utils/create-test-app.ts`, `server/src/app.module.ts`

**Ground truth:** `favorites` is a pure pivot table — same shape as `event_praticien` (composite-unique, no `deleted_at`), except it has **no `updated_at` column at all** (only `created_at`) per the migration in Task 1. `GET /api/client/favorites` must return full praticien objects via a join, not bare ids — the mobile/web favorites screens render praticien cards directly off this response, no second round-trip. `POST` is idempotent by explicit spec: favoriting an already-favorited praticien is a success, not a 409/422 conflict.

- [ ] **Step 1: Write the entity and DTO**

Create `server/src/database/entities/favorite.entity.ts`:

```typescript
import {
  Column, CreateDateColumn, Entity, JoinColumn, ManyToOne,
  PrimaryGeneratedColumn, Unique,
} from 'typeorm';
import { Client } from './client.entity';
import { Praticien } from './praticien.entity';

@Entity('favorites')
@Unique(['client_id', 'praticien_id'])
export class Favorite {
  @PrimaryGeneratedColumn() id: number;
  @Column() client_id: number;
  @Column() praticien_id: number;
  @CreateDateColumn({ name: 'created_at' }) created_at: Date;

  @ManyToOne(() => Client, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'client_id' })
  client: Client;

  @ManyToOne(() => Praticien, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'praticien_id' })
  praticien: Praticien;
}
```

Create `server/src/favorites/dto/create-favorite.dto.ts`:

```typescript
import { IsInt } from 'class-validator';

export class CreateFavoriteDto {
  @IsInt() praticien_id: number;
}
```

- [ ] **Step 2: Write the failing e2e spec**

Create `server/test/favorites.e2e-spec.ts`:

```typescript
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { createTestApp, seedClientUser } from './utils/create-test-app';
import { FavoritesModule } from '../src/favorites/favorites.module';
import { Praticien } from '../src/database/entities/praticien.entity';

describe('favorites', () => {
  let app: INestApplication;
  let clientToken: string;
  let praticienId: number;

  beforeAll(async () => {
    app = await createTestApp({ imports: [FavoritesModule] });
    clientToken = (await seedClientUser(app, 'fav-client@aura.io')).token;
    const ds = app.get(DataSource);
    const p = await ds.getRepository(Praticien).save({
      firstname: 'P', lastname: 'L', email: 'fav-prat@x.io', telephone: '06',
      ville: 'Nice', niveau: 'n', specialite: 's', mode: 'm', status: 'actif',
      tarif: 10, experience: 1, bio: 'b'.repeat(60),
    });
    praticienId = p.id;
  });
  afterAll(async () => { await app.close(); });
  const http = () => request(app.getHttpServer());

  it('GET /api/client/favorites requires auth and starts empty', async () => {
    await http().get('/api/client/favorites').expect(401);
    const res = await http().get('/api/client/favorites')
      .set('Authorization', `Bearer ${clientToken}`).expect(200);
    expect(res.body.data).toEqual([]);
  });

  it('validates praticien_id on add', async () => {
    const res = await http().post('/api/client/favorites')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({}).expect(422);
    expect(res.body.errors.praticien_id).toBeDefined();
  });

  it('adds a favorite and lists it with the full joined praticien object', async () => {
    await http().post('/api/client/favorites')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ praticien_id: praticienId }).expect(200);

    const res = await http().get('/api/client/favorites')
      .set('Authorization', `Bearer ${clientToken}`).expect(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].praticien_id).toBe(praticienId);
    expect(res.body.data[0].praticien).toMatchObject({ id: praticienId, firstname: 'P' });
  });

  it('adding the same praticien again is idempotent (no duplicate row)', async () => {
    await http().post('/api/client/favorites')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ praticien_id: praticienId }).expect(200);

    const res = await http().get('/api/client/favorites')
      .set('Authorization', `Bearer ${clientToken}`).expect(200);
    expect(res.body.data).toHaveLength(1);
  });

  it('removes a favorite by praticien_id', async () => {
    await http().delete(`/api/client/favorites/${praticienId}`)
      .set('Authorization', `Bearer ${clientToken}`).expect(200);

    const res = await http().get('/api/client/favorites')
      .set('Authorization', `Bearer ${clientToken}`).expect(200);
    expect(res.body.data).toEqual([]);
  });

  it('removing a favorite that does not exist 404s', async () => {
    const res = await http().delete(`/api/client/favorites/${praticienId}`)
      .set('Authorization', `Bearer ${clientToken}`).expect(404);
    expect(res.body.message).toBe('Favori non trouvé');
  });
});
```

- [ ] **Step 3: Register `Favorite` in the e2e test harness**

In `server/test/utils/create-test-app.ts`, add the import and push it into `ALL_ENTITIES` (alongside `Avis`, `Signalement`):

```typescript
import { Favorite } from '../../src/database/entities/favorite.entity';
```

```typescript
const ALL_ENTITIES = [
  User, Client, Praticien, PraticienDocument, Cercle, Event, EventPraticien,
  Promotion, Discipline, Article, Notification, EmailTemplate, Echange, Paiement,
  Remboursement, Avis, Signalement, Favorite,
];
```

- [ ] **Step 4: Run the spec to verify it fails**

Run: `npm run test:e2e -- favorites.e2e-spec.ts`
Expected: FAIL — `Cannot find module '../src/favorites/favorites.module'`.

- [ ] **Step 5: Write the service**

Create `server/src/favorites/favorites.service.ts`:

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Favorite } from '../database/entities/favorite.entity';
import { Client } from '../database/entities/client.entity';
import { success } from '../common/envelope';
import { CreateFavoriteDto } from './dto/create-favorite.dto';

@Injectable()
export class FavoritesService {
  constructor(
    @InjectRepository(Favorite) private readonly favorites: Repository<Favorite>,
  ) {}

  async list(client: Client) {
    const rows = await this.favorites.createQueryBuilder('f')
      .leftJoinAndSelect('f.praticien', 'praticien')
      .where('f.client_id = :cid', { cid: client.id })
      .orderBy('f.created_at', 'DESC')
      .getMany();
    return success(rows);
  }

  async add(client: Client, dto: CreateFavoriteDto) {
    // Idempotent: adding an already-favorited praticien is a success, not a
    // conflict — check-then-insert rather than catching the unique-constraint
    // violation, which would differ between MySQL and the e2e suite's SQLite
    // driver and is exactly the kind of environment-coupling worth avoiding.
    const existing = await this.favorites.findOneBy({
      client_id: client.id, praticien_id: dto.praticien_id,
    });
    if (existing) return success(existing, 'Praticien déjà en favoris');
    const saved = await this.favorites.save({
      client_id: client.id, praticien_id: dto.praticien_id,
    });
    return success(saved, 'Praticien ajouté aux favoris');
  }

  async remove(client: Client, praticienId: number) {
    const existing = await this.favorites.findOneBy({
      client_id: client.id, praticien_id: praticienId,
    });
    if (!existing) {
      throw new NotFoundException({ status: 'error', message: 'Favori non trouvé' });
    }
    await this.favorites.delete({ client_id: client.id, praticien_id: praticienId });
    return success(undefined, 'Praticien retiré des favoris');
  }
}
```

- [ ] **Step 6: Write the controller**

Create `server/src/favorites/favorites.controller.ts`:

```typescript
import {
  Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Post, UseGuards,
} from '@nestjs/common';
import { FavoritesService } from './favorites.service';
import { CreateFavoriteDto } from './dto/create-favorite.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ClientGuard } from '../auth/guards/client.guard';
import { CurrentClient } from '../auth/decorators';
import { Client } from '../database/entities/client.entity';

@Controller()
export class FavoritesController {
  constructor(private readonly service: FavoritesService) {}

  @UseGuards(JwtAuthGuard, ClientGuard)
  @Get('client/favorites')
  index(@CurrentClient() client: Client) {
    return this.service.list(client);
  }

  @UseGuards(JwtAuthGuard, ClientGuard)
  @HttpCode(200)
  @Post('client/favorites')
  store(@CurrentClient() client: Client, @Body() dto: CreateFavoriteDto) {
    return this.service.add(client, dto);
  }

  @UseGuards(JwtAuthGuard, ClientGuard)
  @Delete('client/favorites/:praticienId')
  destroy(
    @CurrentClient() client: Client,
    @Param('praticienId', ParseIntPipe) praticienId: number,
  ) {
    return this.service.remove(client, praticienId);
  }
}
```

- [ ] **Step 7: Write the module and register it**

Create `server/src/favorites/favorites.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Favorite } from '../database/entities/favorite.entity';
import { FavoritesController } from './favorites.controller';
import { FavoritesService } from './favorites.service';

@Module({
  imports: [TypeOrmModule.forFeature([Favorite])],
  controllers: [FavoritesController],
  providers: [FavoritesService],
})
export class FavoritesModule {}
```

In `server/src/app.module.ts`, add the import and add `FavoritesModule` to the `imports` array (after `SignalementsModule`):

```typescript
import { FavoritesModule } from './favorites/favorites.module';
```

```typescript
    SignalementsModule,
    FavoritesModule,
```

- [ ] **Step 8: Run the spec to verify it passes**

Run: `npm run test:e2e -- favorites.e2e-spec.ts`
Expected: PASS (6 tests).

- [ ] **Step 9: Run the full e2e suite to check for regressions**

Run: `npm run test:e2e`
Expected: PASS (includes `avis.e2e-spec.ts` and `signalements.e2e-spec.ts`, both unaffected).

- [ ] **Step 10: Commit**

```bash
git add server/src/database/entities/favorite.entity.ts server/src/favorites server/test/favorites.e2e-spec.ts server/test/utils/create-test-app.ts server/src/app.module.ts
git commit -m "feat(server): add favorites module with idempotent add and join-backed list"
```

---

## Task 5: Notification-preferences module (client get/upsert)

**Files:**
- Create: `server/src/database/entities/notification-preference.entity.ts`
- Create: `server/src/notification-preferences/notification-preferences.module.ts`, `server/src/notification-preferences/notification-preferences.controller.ts`, `server/src/notification-preferences/notification-preferences.service.ts`
- Create: `server/src/notification-preferences/dto/update-notification-preferences.dto.ts`
- Create: `server/test/notification-preferences.e2e-spec.ts`
- Modify: `server/test/utils/create-test-app.ts`, `server/src/app.module.ts`

**Ground truth:** `notification_preferences.client_id` is `UNIQUE` — at most one row per client. `GET` must **lazily materialize**: if no row exists yet, return the 4 column defaults from the migration (`rappels_seance: true, nouveaux_messages: true, reponses_avis: false, newsletter: true` — these are exactly `web/app/(site)/compte/parametres/page.jsx`'s existing static `NOTIFS` array's `on` values, confirmed by reading that file; not a coincidence, the migration's defaults were chosen to match it) **without writing a row**. `PUT` is an upsert that accepts any subset of the 4 booleans and merges them onto whatever currently applies (the existing row if one exists, otherwise the defaults) — the first `PUT` is what materializes the row.

- [ ] **Step 1: Write the entity and DTO**

Create `server/src/database/entities/notification-preference.entity.ts`:

```typescript
import {
  Column, CreateDateColumn, Entity, JoinColumn, ManyToOne,
  PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm';
import { Client } from './client.entity';

@Entity('notification_preferences')
export class NotificationPreference {
  @PrimaryGeneratedColumn() id: number;
  @Column({ unique: true }) client_id: number;
  @Column({ default: true }) rappels_seance: boolean;
  @Column({ default: true }) nouveaux_messages: boolean;
  @Column({ default: false }) reponses_avis: boolean;
  @Column({ default: true }) newsletter: boolean;
  @CreateDateColumn({ name: 'created_at' }) created_at: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updated_at: Date;

  @ManyToOne(() => Client, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'client_id' })
  client: Client;
}
```

Create `server/src/notification-preferences/dto/update-notification-preferences.dto.ts`:

```typescript
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateNotificationPreferencesDto {
  @IsOptional() @IsBoolean() rappels_seance?: boolean;
  @IsOptional() @IsBoolean() nouveaux_messages?: boolean;
  @IsOptional() @IsBoolean() reponses_avis?: boolean;
  @IsOptional() @IsBoolean() newsletter?: boolean;
}
```

- [ ] **Step 2: Write the failing e2e spec**

Create `server/test/notification-preferences.e2e-spec.ts`:

```typescript
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { createTestApp, seedClientUser } from './utils/create-test-app';
import { NotificationPreferencesModule } from '../src/notification-preferences/notification-preferences.module';
import { NotificationPreference } from '../src/database/entities/notification-preference.entity';

describe('notification-preferences', () => {
  let app: INestApplication;
  let clientToken: string;

  beforeAll(async () => {
    app = await createTestApp({ imports: [NotificationPreferencesModule] });
    clientToken = (await seedClientUser(app, 'np-client@aura.io')).token;
  });
  afterAll(async () => { await app.close(); });
  const http = () => request(app.getHttpServer());

  it('GET requires auth', async () => {
    await http().get('/api/client/notification-preferences').expect(401);
  });

  it('GET with no row yet returns the 4 defaults without creating one', async () => {
    const res = await http().get('/api/client/notification-preferences')
      .set('Authorization', `Bearer ${clientToken}`).expect(200);
    expect(res.body.data).toEqual({
      rappels_seance: true, nouveaux_messages: true, reponses_avis: false, newsletter: true,
    });
    const ds = app.get(DataSource);
    expect(await ds.getRepository(NotificationPreference).count()).toBe(0);
  });

  it('PUT validates boolean fields', async () => {
    const res = await http().put('/api/client/notification-preferences')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ newsletter: 'yes' }).expect(422);
    expect(res.body.errors.newsletter).toBeDefined();
  });

  it('PUT with a partial patch merges onto the defaults and materializes a row', async () => {
    const res = await http().put('/api/client/notification-preferences')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ newsletter: false }).expect(200);
    expect(res.body.data).toEqual({
      rappels_seance: true, nouveaux_messages: true, reponses_avis: false, newsletter: false,
    });

    const ds = app.get(DataSource);
    expect(await ds.getRepository(NotificationPreference).count()).toBe(1);
  });

  it('GET now returns the persisted row', async () => {
    const res = await http().get('/api/client/notification-preferences')
      .set('Authorization', `Bearer ${clientToken}`).expect(200);
    expect(res.body.data.newsletter).toBe(false);
  });

  it('a second PUT merges onto the existing row, not back onto the defaults', async () => {
    const res = await http().put('/api/client/notification-preferences')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ rappels_seance: false }).expect(200);
    expect(res.body.data).toEqual({
      rappels_seance: false, nouveaux_messages: true, reponses_avis: false, newsletter: false,
    });

    const ds = app.get(DataSource);
    expect(await ds.getRepository(NotificationPreference).count()).toBe(1);
  });
});
```

- [ ] **Step 3: Register `NotificationPreference` in the e2e test harness**

In `server/test/utils/create-test-app.ts`, add the import and push it into `ALL_ENTITIES` (alongside `Avis`, `Signalement`, `Favorite`):

```typescript
import { NotificationPreference } from '../../src/database/entities/notification-preference.entity';
```

```typescript
const ALL_ENTITIES = [
  User, Client, Praticien, PraticienDocument, Cercle, Event, EventPraticien,
  Promotion, Discipline, Article, Notification, EmailTemplate, Echange, Paiement,
  Remboursement, Avis, Signalement, Favorite, NotificationPreference,
];
```

- [ ] **Step 4: Run the spec to verify it fails**

Run: `npm run test:e2e -- notification-preferences.e2e-spec.ts`
Expected: FAIL — `Cannot find module '../src/notification-preferences/notification-preferences.module'`.

- [ ] **Step 5: Write the service**

Create `server/src/notification-preferences/notification-preferences.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationPreference } from '../database/entities/notification-preference.entity';
import { Client } from '../database/entities/client.entity';
import { success } from '../common/envelope';
import { UpdateNotificationPreferencesDto } from './dto/update-notification-preferences.dto';

const DEFAULTS = {
  rappels_seance: true,
  nouveaux_messages: true,
  reponses_avis: false,
  newsletter: true,
};

@Injectable()
export class NotificationPreferencesService {
  constructor(
    @InjectRepository(NotificationPreference)
    private readonly prefs: Repository<NotificationPreference>,
  ) {}

  async get(client: Client) {
    const row = await this.prefs.findOneBy({ client_id: client.id });
    if (!row) return success({ ...DEFAULTS });
    const { rappels_seance, nouveaux_messages, reponses_avis, newsletter } = row;
    return success({ rappels_seance, nouveaux_messages, reponses_avis, newsletter });
  }

  async update(client: Client, dto: UpdateNotificationPreferencesDto) {
    const row = await this.prefs.findOneBy({ client_id: client.id });
    const merged = {
      rappels_seance: dto.rappels_seance ?? row?.rappels_seance ?? DEFAULTS.rappels_seance,
      nouveaux_messages: dto.nouveaux_messages ?? row?.nouveaux_messages ?? DEFAULTS.nouveaux_messages,
      reponses_avis: dto.reponses_avis ?? row?.reponses_avis ?? DEFAULTS.reponses_avis,
      newsletter: dto.newsletter ?? row?.newsletter ?? DEFAULTS.newsletter,
    };
    if (row) {
      await this.prefs.update(row.id, merged);
    } else {
      await this.prefs.save({ client_id: client.id, ...merged });
    }
    return success(merged, 'Préférences de notification mises à jour');
  }
}
```

- [ ] **Step 6: Write the controller**

Create `server/src/notification-preferences/notification-preferences.controller.ts`:

```typescript
import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { NotificationPreferencesService } from './notification-preferences.service';
import { UpdateNotificationPreferencesDto } from './dto/update-notification-preferences.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ClientGuard } from '../auth/guards/client.guard';
import { CurrentClient } from '../auth/decorators';
import { Client } from '../database/entities/client.entity';

@Controller()
export class NotificationPreferencesController {
  constructor(private readonly service: NotificationPreferencesService) {}

  @UseGuards(JwtAuthGuard, ClientGuard)
  @Get('client/notification-preferences')
  show(@CurrentClient() client: Client) {
    return this.service.get(client);
  }

  @UseGuards(JwtAuthGuard, ClientGuard)
  @Put('client/notification-preferences')
  update(@CurrentClient() client: Client, @Body() dto: UpdateNotificationPreferencesDto) {
    return this.service.update(client, dto);
  }
}
```

- [ ] **Step 7: Write the module and register it**

Create `server/src/notification-preferences/notification-preferences.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationPreference } from '../database/entities/notification-preference.entity';
import { NotificationPreferencesController } from './notification-preferences.controller';
import { NotificationPreferencesService } from './notification-preferences.service';

@Module({
  imports: [TypeOrmModule.forFeature([NotificationPreference])],
  controllers: [NotificationPreferencesController],
  providers: [NotificationPreferencesService],
})
export class NotificationPreferencesModule {}
```

In `server/src/app.module.ts`, add the import and add `NotificationPreferencesModule` to the `imports` array (after `FavoritesModule`):

```typescript
import { NotificationPreferencesModule } from './notification-preferences/notification-preferences.module';
```

```typescript
    FavoritesModule,
    NotificationPreferencesModule,
```

- [ ] **Step 8: Run the spec to verify it passes**

Run: `npm run test:e2e -- notification-preferences.e2e-spec.ts`
Expected: PASS (6 tests).

- [ ] **Step 9: Run the full e2e suite to check for regressions**

Run: `npm run test:e2e`
Expected: PASS (all four new suites — `avis`, `signalements`, `favorites`, `notification-preferences` — plus every pre-existing suite).

- [ ] **Step 10: Commit**

```bash
git add server/src/database/entities/notification-preference.entity.ts server/src/notification-preferences server/test/notification-preferences.e2e-spec.ts server/test/utils/create-test-app.ts server/src/app.module.ts
git commit -m "feat(server): add notification-preferences module with lazy-materialized defaults"
```

---

This completes the backend. All four modules (`avis`, `signalements`, `favorites`, `notification-preferences`) are registered in `server/src/app.module.ts` in that order, and `server/test/utils/create-test-app.ts`'s `ALL_ENTITIES` now includes `Avis, Signalement, Favorite, NotificationPreference`. The remaining tasks are pure frontend wiring against these eight endpoints — no further backend changes.

---

## Task 6: Web — `compte/avis` wiring ("Mes avis")

**Files:**
- Create: `web/app/(site)/compte/avis/AvisList.jsx`
- Modify: `web/app/(site)/compte/avis/page.jsx`

**Ground truth used:** `GET /api/client/avis` (`JwtAuthGuard, ClientGuard`; response `data[]` with fields `id, full_name_author, praticien_id, note, avis, date_ajout, statut ('en_attente'|'publié'|'rejeté'), praticien{id,firstname,lastname,specialite,...}` — joined by Task 2's `mine()`), `PUT`/`DELETE /api/client/avis/:id` (only while `statut === 'en_attente'`, 404 otherwise). **This confirms Task 2's backend already built the exact client "my reviews" list endpoint this page needs** — `GET /api/client/avis` was in scope and delivered there (see that task's controller/service `mine()`), so no additional backend endpoint is required here.

- [ ] **Step 1: Write `AvisList.jsx`**

Create `web/app/(site)/compte/avis/AvisList.jsx`:

```jsx
'use client';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Avatar } from '@/components/ui/Avatar';
import { Rating } from '@/components/ui/Rating';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { ModalButton } from '@/components/ui/ModalButton';
import { api } from '@/lib/api';
import { dateFr } from '@/lib/format';

const STATUT_LABEL = { en_attente: 'En attente', publié: 'Publié', rejeté: 'Rejeté' };
const STATUT_TONE = { en_attente: 'warning', publié: 'success', rejeté: 'danger' };

export default function AvisList() {
  const queryClient = useQueryClient();
  const { data: res, isLoading } = useQuery({
    queryKey: ['mes-avis'],
    queryFn: () => api.get('/client/avis'),
  });
  const mine = res?.data ?? [];
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['mes-avis'] });

  if (isLoading) return <div className="empty">Chargement…</div>;

  if (mine.length === 0) {
    return (
      <div className="empty">
        <Icon name="star" size={28} color="var(--muted)" />
        <p className="mt-2">Vous n'avez pas encore laissé d'avis.</p>
      </div>
    );
  }

  return (
    <div className="stack gap-3">
      {mine.map((r) => {
        const p = r.praticien;
        const editable = r.statut === 'en_attente';
        return (
          <div key={r.id} className="card card-pad">
            <div className="row gap-3 between" style={{ alignItems: 'flex-start' }}>
              <div className="row gap-3" style={{ alignItems: 'flex-start' }}>
                <Avatar name={p ? `${p.firstname} ${p.lastname}` : r.full_name_author} tone="violet" size={48} />
                <div>
                  {p ? (
                    <Link href={`/praticien/${p.id}`} className="h-4" style={{ fontWeight: 500, color: 'var(--ink)' }}>{p.firstname} {p.lastname}</Link>
                  ) : (
                    <span className="h-4" style={{ fontWeight: 500 }}>Praticien</span>
                  )}
                  {p?.specialite && <div className="row gap-2 small"><span>{p.specialite}</span></div>}
                </div>
              </div>
              <Badge variant={STATUT_TONE[r.statut] || 'neutral'}>{STATUT_LABEL[r.statut] || r.statut}</Badge>
            </div>
            <div className="row gap-2 mt-3"><Rating value={r.note} showCount={false} size={15} /><span className="tiny muted">{dateFr(r.date_ajout)}</span></div>
            <p className="body mt-2" style={{ fontStyle: 'italic' }}>« {r.avis} »</p>
            {editable && (
              <>
                <div className="divider" />
                <div className="row gap-2">
                  <ModalButton
                    modal="form"
                    payload={{
                      title: 'Modifier votre avis',
                      fields: [
                        { name: 'rating', label: 'Note', type: 'rating', value: r.note },
                        { name: 'text', label: 'Votre avis', type: 'textarea', required: true, value: r.avis },
                      ],
                      submitLabel: 'Enregistrer',
                      successToast: 'Avis mis à jour',
                      onSubmit: async (values) => {
                        await api.put(`/client/avis/${r.id}`, { note: Number(values.rating), avis: values.text });
                        await invalidate();
                      },
                    }}
                    className="btn btn-soft btn-sm"
                  ><Icon name="edit" size={14} /> Modifier</ModalButton>
                  <ModalButton
                    modal="confirm"
                    payload={{
                      title: 'Supprimer cet avis',
                      message: 'Supprimer définitivement cet avis ?',
                      confirmLabel: 'Supprimer',
                      danger: true,
                      successToast: 'Avis supprimé',
                      onConfirm: async () => {
                        await api.del(`/client/avis/${r.id}`);
                        await invalidate();
                      },
                    }}
                    className="btn btn-danger-soft btn-sm"
                  ><Icon name="trash" size={14} /> Supprimer</ModalButton>
                </div>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
```

`modal="form"` (the generic primitive) is used directly here rather than the `review` registry preset — editing needs a different title/`submitLabel` and pre-filled `value`s per field, which would mean overriding almost every prop the preset sets anyway (Task 11 reuses the `review` preset as-is for *creating* a new avis, where its defaults actually fit). `ModalButton`'s `payload` merges into the target modal's props last (see `MODAL_REGISTRY.form`/`.confirm` in `registry.jsx`, both spread `{...p}` after their own defaults), so `onSubmit`/`onConfirm` reach `FormModal`/`ConfirmModal` exactly like Plan 04's `EchangesBody.jsx` edit/delete actions already do.

- [ ] **Step 2: Shrink `page.jsx` to a Server Component wrapper**

Replace the full contents of `web/app/(site)/compte/avis/page.jsx`:

```jsx
import AvisList from './AvisList';

export const metadata = { title: 'Mes avis — AURA' };

export default function AvisPage() {
  return (
    <div className="stack gap-5">
      <header className="reveal r-1">
        <h1 className="h-1">Mes avis</h1>
        <p className="lead" style={{ marginTop: 4 }}>Vos retours aident toute la <span className="serif italic accent">communauté</span> à choisir.</p>
      </header>

      <AvisList />
    </div>
  );
}
```

This mirrors the `compte/reservations/page.jsx` + `ReservationsBody.jsx` split already established in the codebase (and reused by Plan 04's `PaiementsBody`/`EchangesBody`) — a Server Component can't export `metadata` and also call `useQuery`, since the latter requires `'use client'`.

- [ ] **Step 3: Verify the build compiles**

Run (in `web/`): `npm run build`
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add "web/app/(site)/compte/avis/page.jsx" "web/app/(site)/compte/avis/AvisList.jsx"
git commit -m "feat(web): wire compte/avis to the real client avis list, edit and delete"
```

---

## Task 7: Web — `admin/avis` wiring (moderation table)

**Files:**
- Modify: `web/app/admin/avis/page.jsx`

**Ground truth used:** `GET /api/admin/avis` (`JwtAuthGuard, AdminGuard`, `?statut`, paginated, response `data[]` with `id, full_name_author, note, avis, date_ajout, statut ('en_attente'|'publié'|'rejeté'), praticien{id,firstname,lastname}`), `POST /api/admin/avis/:id/publish`, `POST /api/admin/avis/:id/reject` (both `@HttpCode(200)`).

**Design note — the real `statut` vocabulary doesn't include "flagged."** The static mock's third bucket (`flagged`, with its own "Avis signalés" callout note) conflates avis moderation with the *separate* signalements system this plan also builds — a real avis only ever has `en_attente|publié|rejeté` (see Task 2's entity). Rather than keeping a UI concept with no backend behind it, the three stat cards become Publiés/En attente/Rejetés and the "signalés" note is dropped — same "don't fabricate a status that doesn't exist" call Plan 02 already made for `praticien.online`/`novice`/etc. No pagination/search/filter UI is added beyond what `DataTable` already provides client-side (mirrors Plan 04's `per_page`-single-fetch approach) — a `per_page=100` fetch is plenty for an admin moderation queue and keeps this task pure data-source-swap + real actions, matching the task's own scope ("`GET /api/admin/avis` + publish/reject actions").

- [ ] **Step 1: Replace the full contents of `web/app/admin/avis/page.jsx`**

```jsx
'use client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { PageHead } from '@/components/ui/PageHead';
import { DataTable } from '@/components/ui/DataTable';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Rating } from '@/components/ui/Rating';
import { Icon } from '@/components/ui/Icon';
import { ModalButton } from '@/components/ui/ModalButton';
import { api } from '@/lib/api';
import { dateFr } from '@/lib/format';

const STATUT_LABEL = { en_attente: 'En attente', publié: 'Publié', rejeté: 'Rejeté' };
const STATUT_TONE = { en_attente: 'warning', publié: 'success', rejeté: 'neutral' };

export default function AdminReviewsPage() {
  const queryClient = useQueryClient();
  const { data: res } = useQuery({
    queryKey: ['admin-avis'],
    queryFn: () => api.get('/admin/avis?per_page=100'),
  });
  const rows = res?.data ?? [];
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin-avis'] });

  const publish = async (id) => { await api.post(`/admin/avis/${id}/publish`); await invalidate(); };
  const reject = async (id) => { await api.post(`/admin/avis/${id}/reject`); await invalidate(); };

  const published = rows.filter((r) => r.statut === 'publié').length;
  const pending = rows.filter((r) => r.statut === 'en_attente').length;
  const rejected = rows.filter((r) => r.statut === 'rejeté').length;

  const columns = [
    {
      key: 'author', label: 'Auteur', width: 160,
      render: (r) => (
        <div className="row gap-2">
          <Avatar name={r.full_name_author} size={28} tone="violet" />
          <span className="table-cell-main">{r.full_name_author}</span>
        </div>
      ),
    },
    {
      key: 'praticien', label: 'Praticien',
      render: (r) => {
        const name = r.praticien ? `${r.praticien.firstname} ${r.praticien.lastname}` : '—';
        return (
          <div className="row gap-2">
            <Avatar name={name} size={28} tone="violet" />
            <span>{name}</span>
          </div>
        );
      },
    },
    { key: 'note', label: 'Note', width: 110, sortable: true, render: (r) => <Rating value={r.note} size={13} showCount={false} /> },
    {
      key: 'avis', label: 'Extrait',
      render: (r) => <span className="small" style={{ display: 'block', maxWidth: 360 }}>« {r.avis.length > 90 ? r.avis.slice(0, 90) + '…' : r.avis} »</span>,
    },
    { key: 'date_ajout', label: 'Reçu', width: 110, render: (r) => <span className="tiny">{dateFr(r.date_ajout)}</span> },
    {
      key: 'statut', label: 'Statut', width: 120,
      render: (r) => <Badge variant={STATUT_TONE[r.statut] || 'neutral'} dot>{STATUT_LABEL[r.statut] || r.statut}</Badge>,
    },
    {
      key: 'actions', label: '', width: 140,
      render: (r) => r.statut === 'en_attente' ? (
        <div className="row gap-2">
          <button type="button" className="btn btn-soft btn-sm btn-icon" title="Publier" onClick={() => publish(r.id)}>
            <Icon name="checkCircle" size={15} />
          </button>
          <button type="button" className="btn btn-danger-soft btn-sm btn-icon" title="Rejeter" onClick={() => reject(r.id)}>
            <Icon name="x" size={15} />
          </button>
        </div>
      ) : <span className="tiny muted">— traité</span>,
    },
  ];

  return (
    <>
      <PageHead
        title="Modération des avis"
        subtitle={`${rows.length} avis · ${pending} en attente de modération`}
        crumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Modération', href: '/admin/signalements' }, { label: 'Avis' }]}
        actions={<ModalButton modal="exportData" className="btn btn-soft btn-sm"><Icon name="download" size={15} /> Exporter</ModalButton>}
      />

      <div className="grid grid-3" style={{ marginBottom: 22 }}>
        <div className="card card-pad"><div className="eyebrow">Publiés</div><div className="h-2" style={{ marginTop: 6 }}>{published}</div><div className="small">visibles sur les profils</div></div>
        <div className="card card-pad tint-violet"><div className="eyebrow">En attente</div><div className="h-2" style={{ marginTop: 6 }}>{pending}</div><div className="small">à valider</div></div>
        <div className="card card-pad"><div className="eyebrow">Rejetés</div><div className="h-2" style={{ marginTop: 6 }}>{rejected}</div><div className="small">sans suite</div></div>
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        searchKeys={['full_name_author', 'avis']}
        filters={[
          { key: 'statut', label: 'Tous les statuts', options: [
            { value: 'publié', label: 'Publié' },
            { value: 'en_attente', label: 'En attente' },
            { value: 'rejeté', label: 'Rejeté' },
          ] },
        ]}
        searchPlaceholder="Rechercher un avis, un auteur…"
        pageSize={8}
      />
    </>
  );
}
```

Note: `publish`/`reject` are plain `onClick` handlers, not `ModalButton`/`ConfirmModal` — both actions are single-step, low-risk, and reversible into each other (a wrongly-published avis can be re-moderated; there's no destructive delete wired here), so a confirmation step would just be friction. This mirrors how `remboursements`' admin approve/refuse and `avis`' own admin actions have no client-side confirmation step in this codebase either.

- [ ] **Step 2: Verify the build compiles**

Run (in `web/`): `npm run build`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add web/app/admin/avis/page.jsx
git commit -m "feat(web): wire admin avis moderation table to the real API"
```

---

## Task 8: Web — `compte/parametres` notification toggles (scoped to the Notifications section only)

**Files:**
- Modify: `web/app/(site)/compte/parametres/Toggle.jsx`
- Create: `web/app/(site)/compte/parametres/NotificationsSection.jsx`
- Modify: `web/app/(site)/compte/parametres/page.jsx` (targeted edit — two small spots only)

**Scope, restated from the task brief:** only the 4-row Notifications section wires to the backend. Profil, Confidentialité, Langue & région, Sécurité, and the danger zone are **not touched** — they keep using the page's local `Row` helper and uncontrolled `<Toggle defaultOn={...} />`, exactly as today.

**Ground truth used:** `GET`/`PUT /api/client/notification-preferences` (`JwtAuthGuard, ClientGuard`; body/response `{rappels_seance, nouveaux_messages, reponses_avis, newsletter}`, all boolean; `GET` lazily returns defaults with no row created; `PUT` accepts any subset and merges).

- [ ] **Step 1: Make `Toggle` support an optional controlled mode**

**Why this is needed:** `Toggle` is currently fully uncontrolled (`useState(defaultOn)`, no way to observe or drive a click from outside). Every *other* toggle on this page (Confidentialité's two rows, and the page's own `Row` helper) must keep working exactly as before — untouched, local-only state. The Notifications section is the first caller that needs the parent to know about and react to a toggle flip (to `PUT` it to the backend), so `Toggle` gains an **optional** `checked`/`onChange` pair: when `checked` is `undefined` (every existing call site), behavior is byte-for-byte identical to today; when a caller passes `checked`, the component becomes controlled and calls `onChange(nextValue)` instead of managing its own state.

Replace the full contents of `web/app/(site)/compte/parametres/Toggle.jsx`:

```jsx
'use client';
import { useState } from 'react';

export function Toggle({ defaultOn = false, checked, onChange }) {
  const controlled = checked !== undefined;
  const [on, setOn] = useState(defaultOn);
  const value = controlled ? checked : on;

  const toggle = () => {
    const next = !value;
    if (!controlled) setOn(next);
    onChange?.(next);
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      className={`switch ${value ? 'on' : ''}`}
      onClick={toggle}
    >
      <span className="knob" />
    </button>
  );
}

export default Toggle;
```

- [ ] **Step 2: Write `NotificationsSection.jsx`**

Create `web/app/(site)/compte/parametres/NotificationsSection.jsx`:

```jsx
'use client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Toggle } from './Toggle';

// Labels/descriptions and defaults match the page's original static NOTIFS
// array exactly — the migration's column defaults (Task 1) were chosen to
// mirror this same copy, so the empty/loading state looks identical to the
// old hardcoded version.
const FIELDS = [
  { key: 'rappels_seance', label: 'Rappels de séance', desc: 'Un rappel 24h et 1h avant chaque rendez-vous.' },
  { key: 'nouveaux_messages', label: 'Nouveaux messages', desc: "Soyez averti dès qu'un praticien vous répond." },
  { key: 'reponses_avis', label: 'Réponses à mes avis', desc: 'Quand un praticien réagit à votre retour.' },
  { key: 'newsletter', label: 'Newsletter AURA', desc: 'Inspirations, événements et nouveautés, une fois par mois.' },
];

const DEFAULTS = {
  rappels_seance: true, nouveaux_messages: true, reponses_avis: false, newsletter: true,
};

export function NotificationsSection() {
  const queryClient = useQueryClient();
  const { data: res } = useQuery({
    queryKey: ['notification-preferences'],
    queryFn: () => api.get('/client/notification-preferences'),
  });
  const prefs = res?.data ?? DEFAULTS;

  const toggle = async (key, value) => {
    // Optimistic update so the switch flips instantly; reconciled with the
    // server's response either way once the PUT settles.
    queryClient.setQueryData(['notification-preferences'], {
      ...res, data: { ...prefs, [key]: value },
    });
    try {
      await api.put('/client/notification-preferences', { [key]: value });
    } finally {
      await queryClient.invalidateQueries({ queryKey: ['notification-preferences'] });
    }
  };

  return (
    <div className="stack">
      {FIELDS.map((f, i) => (
        <div key={f.key}>
          {i > 0 && <div className="divider" />}
          <div className="row between gap-3" style={{ padding: '12px 0' }}>
            <div>
              <div className="small" style={{ fontWeight: 500, color: 'var(--ink)' }}>{f.label}</div>
              <div className="tiny muted">{f.desc}</div>
            </div>
            <Toggle checked={!!prefs[f.key]} onChange={(v) => toggle(f.key, v)} />
          </div>
        </div>
      ))}
    </div>
  );
}

export default NotificationsSection;
```

- [ ] **Step 3: Wire it into `page.jsx` — two small, targeted edits**

In `web/app/(site)/compte/parametres/page.jsx`, add the import and delete the now-unused `NOTIFS` constant (everything else in the import/const block above `ParametresPage` stays untouched):

```diff
 import { Icon } from '@/components/ui/Icon';
 import { ModalButton } from '@/components/ui/ModalButton';
 import { ToastButton } from '@/components/ui/ToastButton';
 import { Toggle } from './Toggle';
+import { NotificationsSection } from './NotificationsSection';

 export const metadata = { title: 'Paramètres — AURA' };

-const NOTIFS = [
-  { label: 'Rappels de séance', desc: 'Un rappel 24h et 1h avant chaque rendez-vous.', on: true },
-  { label: 'Nouveaux messages', desc: 'Soyez averti dès qu\'un praticien vous répond.', on: true },
-  { label: 'Réponses à mes avis', desc: 'Quand un praticien réagit à votre retour.', on: false },
-  { label: 'Newsletter AURA', desc: 'Inspirations, événements et nouveautés, une fois par mois.', on: true },
-];
-
 function Row({ label, desc, on }) {
```

Then replace just the Notifications `<section>` (the `Row`/`ToastButton`/`ModalButton` imports stay — they're still used by Confidentialité/Langue/Sécurité/danger zone below, all untouched):

```diff
       {/* Notifications */}
       <section className="card card-pad">
         <h2 className="h-3 mb-2">Notifications</h2>
-        <div className="stack" style={{ divideColor: 'var(--line)' }}>
-          {NOTIFS.map((n, i) => (
-            <div key={n.label}>
-              {i > 0 && <div className="divider" />}
-              <Row {...n} />
-            </div>
-          ))}
-        </div>
+        <NotificationsSection />
       </section>
```

Everything from `{/* Confidentialité */}` through the end of the file (Langue & région, Sécurité, Zone sensible) is byte-for-byte unchanged.

- [ ] **Step 4: Verify the build compiles**

Run (in `web/`): `npm run build`
Expected: build succeeds.

- [ ] **Step 5: Commit**

```bash
git add web/app/\(site\)/compte/parametres/Toggle.jsx web/app/\(site\)/compte/parametres/NotificationsSection.jsx web/app/\(site\)/compte/parametres/page.jsx
git commit -m "feat(web): wire the 4 notification toggles to the real preferences API"
```

---

## Task 9: Web — `compte/favoris` wiring ("Mes favoris")

**Files:**
- Create: `web/app/(site)/compte/favoris/FavorisList.jsx`
- Modify: `web/app/(site)/compte/favoris/page.jsx`

**Ground truth used:** `GET /api/client/favorites` (`JwtAuthGuard, ClientGuard`; response `data[]` of `{id, client_id, praticien_id, created_at, praticien: {id, firstname, lastname, ville, mode, tarif, niveau, specialite, bio, experience, statut_verification, ...}}` — the full praticien row, per Task 4), `DELETE /api/client/favorites/:praticien_id`.

**Reuses Plan 02's `mapPraticien` adapter** (`web/lib/data/praticien-adapter.js`, already on disk by the time this plan runs — Plan 07 explicitly runs after Plan 02) rather than inventing a second mapping function: each favorite's joined `praticien` object is exactly the same raw backend shape `mapPraticien` already converts into the rich `{name, specialties, city, mode, price, rating, reviews, verified, ...}` display shape the existing static card JSX renders. This keeps the favorited-praticien card visually and structurally identical to the original static page — only the data source and the remove button change.

- [ ] **Step 1: Write `FavorisList.jsx`**

Create `web/app/(site)/compte/favoris/FavorisList.jsx`:

```jsx
'use client';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Avatar } from '@/components/ui/Avatar';
import { Rating } from '@/components/ui/Rating';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';
import { mapPraticien } from '@/lib/data/praticien-adapter';

export default function FavorisList() {
  const queryClient = useQueryClient();
  const { data: res, isLoading } = useQuery({
    queryKey: ['favorites'],
    queryFn: () => api.get('/client/favorites'),
  });
  const favs = (res?.data ?? []).map((f) => mapPraticien(f.praticien));

  const remove = async (id) => {
    await api.del(`/client/favorites/${id}`);
    await queryClient.invalidateQueries({ queryKey: ['favorites'] });
  };

  if (isLoading) return <div className="empty">Chargement…</div>;

  if (favs.length === 0) {
    return (
      <div className="empty">
        <Icon name="heart" size={28} color="var(--muted)" />
        <p className="mt-2">Vous n'avez pas encore de favoris.</p>
        <Button href="/praticiens" variant="primary" size="sm">Découvrir les praticiens</Button>
      </div>
    );
  }

  return (
    <div className="grid grid-2">
      {favs.map((p) => (
        <div key={p.id} className="card card-pad">
          <div className="row gap-3" style={{ alignItems: 'flex-start' }}>
            <Avatar src={p.photo} name={p.name} tone={p.tone} size={64} online={p.online} />
            <div className="flex-1">
              <div className="row gap-2" style={{ marginBottom: 2 }}>
                <Link href={`/praticien/${p.id}`} className="h-4" style={{ fontWeight: 500, color: 'var(--ink)' }}>{p.name}</Link>
                {p.verified && <Icon name="checkCircle" size={14} color="var(--violet-2)" />}
              </div>
              <div className="small" style={{ marginBottom: 6 }}>{p.specialties.join(' · ')}</div>
              <Rating value={p.rating} count={p.reviews} size={13} />
              <div className="row gap-2 small mt-2"><Icon name="pin" size={13} color="var(--muted)" />{p.city} · {p.mode}</div>
            </div>
          </div>
          <div className="divider" />
          <div className="row gap-2 between">
            <span className="price" style={{ fontSize: 18 }}>{p.price}€<small>/séance</small></span>
            <div className="row gap-2">
              <button type="button" className="btn btn-icon btn-ghost" title="Retirer des favoris" onClick={() => remove(p.id)}>
                <Icon name="heart" size={16} color="var(--violet-2)" />
              </button>
              <Button href={`/praticien/${p.id}`} variant="primary" size="sm">Réserver</Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Shrink `page.jsx` to a Server Component wrapper**

Replace the full contents of `web/app/(site)/compte/favoris/page.jsx`:

```jsx
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import FavorisList from './FavorisList';

export const metadata = { title: 'Mes favoris — AURA' };

export default function FavorisPage() {
  return (
    <div className="stack gap-5">
      <header className="reveal r-1 row between wrap gap-3">
        <div>
          <h1 className="h-1">Mes favoris</h1>
          <p className="lead" style={{ marginTop: 4 }}>Les praticiens que vous gardez <span className="serif italic accent">près du cœur</span>.</p>
        </div>
        <Button href="/praticiens" variant="soft" size="sm"><Icon name="search" size={15} /> Explorer</Button>
      </header>

      <FavorisList />
    </div>
  );
}
```

- [ ] **Step 3: Verify the build compiles**

Run (in `web/`): `npm run build`
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add "web/app/(site)/compte/favoris/page.jsx" "web/app/(site)/compte/favoris/FavorisList.jsx"
git commit -m "feat(web): wire compte/favoris to the real favorites list and remove action"
```

---

## Task 10: Web — `admin/signalements` wiring (moderation table)

**Files:**
- Modify: `web/app/admin/signalements/page.jsx`

**Ground truth used:** `GET /api/admin/signalements` (`JwtAuthGuard, AdminGuard`, `?statut&type`, paginated, response `data[]` of `{id, date_signalement, type, sujet, motif, priorite, statut ('pending'|'resolved'|'rejected'), signalePar:{id,name,email}, praticien:{id,firstname,lastname}}` — joined by Task 3), `POST /api/admin/signalements/:id/resolve`, `POST /api/admin/signalements/:id/reject`.

**A striking, load-bearing consistency check:** the static mock's `STATUS_LABEL`/`STATUS_TONE` keys (`pending`/`resolved`/`rejected`) and `PRIO_TONE`'s `haute`/`normale`/`basse` keys **already match Task 3's real `statut`/`priorite` values verbatim** — strong evidence this mock was the actual blueprint for the schema. Those two maps need zero changes (only `PRIO_TONE` gains the 4th real value, `urgente`, which the mock never had). The one real mismatch is `type`: the mock's `TYPE_GLYPH` assumed a fixed 4-value taxonomy (`Avis`/`Profil`/`Message`/`Événement`) that the backend never enforces (Task 3 deliberately left `type` an unconstrained string — see that task's Ground Truth note). Since the *only* real writer of `type` in this plan's scope is mobile's `report.tsx` (Task 14), whose 5 reason keys (`overclaim`/`behavior`/`fake`/`pros`/`other`) are the actual vocabulary that will show up here, `TYPE_GLYPH`/the type filter are rebuilt against *that* vocabulary instead of the old fictional one — not silently kept wrong.

- [ ] **Step 1: Replace the full contents of `web/app/admin/signalements/page.jsx`**

```jsx
'use client';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { PageHead } from '@/components/ui/PageHead';
import { DataTable } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { ModalButton } from '@/components/ui/ModalButton';
import { api } from '@/lib/api';
import { dateFr } from '@/lib/format';

const STATUS_LABEL = { pending: 'En attente', resolved: 'Résolu', rejected: 'Rejeté' };
const STATUS_TONE = { pending: 'warning', resolved: 'success', rejected: 'neutral' };
const PRIO_TONE = { urgente: 'danger', haute: 'danger', normale: 'warning', basse: 'neutral' };
// `type` has no backend-enforced enum (Task 3) — this is the real vocabulary
// mobile's report.tsx (Task 14) actually sends, not a fabricated taxonomy.
const TYPE_LABEL = {
  overclaim: 'Promesses exagérées',
  behavior: 'Comportement',
  fake: 'Faux avis',
  pros: 'Prosélytisme',
  other: 'Autre',
};

export default function AdminReportsPage() {
  const queryClient = useQueryClient();
  const { data: res } = useQuery({
    queryKey: ['admin-signalements'],
    queryFn: () => api.get('/admin/signalements?per_page=100'),
  });
  const reports = res?.data ?? [];
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin-signalements'] });

  const resolve = async (id) => { await api.post(`/admin/signalements/${id}/resolve`); await invalidate(); };
  const reject = async (id) => { await api.post(`/admin/signalements/${id}/reject`); await invalidate(); };

  const pending = reports.filter((r) => r.statut === 'pending').length;
  const high = reports.filter((r) => (r.priorite === 'haute' || r.priorite === 'urgente') && r.statut === 'pending').length;

  const columns = [
    { key: 'date_signalement', label: 'Date', width: 110, sortable: true, render: (r) => <span className="small">{dateFr(r.date_signalement)}</span> },
    {
      key: 'type', label: 'Type', width: 150,
      render: (r) => <span className="row gap-2"><Icon name="flag" size={15} color="var(--muted)" />{TYPE_LABEL[r.type] || r.type}</span>,
    },
    {
      key: 'sujet', label: 'Sujet',
      render: (r) => (
        <div>
          <span className="table-cell-main" style={{ display: 'block', maxWidth: 320 }}>{r.sujet}</span>
          {r.praticien && (
            <Link href={`/admin/praticien/${r.praticien.id}`} className="tiny more">
              {r.praticien.firstname} {r.praticien.lastname}
            </Link>
          )}
        </div>
      ),
    },
    { key: 'motif', label: 'Motif', render: (r) => <span className="small">{r.motif}</span> },
    { key: 'reporter', label: 'Signalé par', width: 150, render: (r) => <span className="small">{r.signalePar?.name ?? 'Utilisateur'}</span> },
    { key: 'priorite', label: 'Priorité', width: 110, render: (r) => <Badge variant={PRIO_TONE[r.priorite]} dot>{r.priorite}</Badge> },
    { key: 'statut', label: 'Statut', width: 120, render: (r) => <Badge variant={STATUS_TONE[r.statut]}>{STATUS_LABEL[r.statut]}</Badge> },
    {
      key: 'actions', label: '', width: 150,
      render: (r) => r.statut === 'pending' ? (
        <div className="row gap-2">
          <button type="button" className="btn btn-primary btn-sm" onClick={() => resolve(r.id)}>Traiter</button>
          <button type="button" className="btn btn-danger-soft btn-sm btn-icon" title="Rejeter" onClick={() => reject(r.id)}>
            <Icon name="x" size={14} />
          </button>
        </div>
      ) : <span className="tiny muted">— traité</span>,
    },
  ];

  return (
    <>
      <PageHead
        title="Signalements"
        subtitle={`${pending} signalement${pending > 1 ? 's' : ''} en attente · ${high} en priorité haute`}
        crumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Modération' }, { label: 'Signalements' }]}
        actions={<ModalButton modal="exportData" className="btn btn-soft btn-sm"><Icon name="download" size={15} /> Exporter</ModalButton>}
      />

      <div className="grid grid-4" style={{ marginBottom: 22 }}>
        <div className="card card-pad tint-violet"><div className="eyebrow">À traiter</div><div className="h-2" style={{ marginTop: 6 }}>{pending}</div><div className="small">en file de modération</div></div>
        <div className="card card-pad"><div className="eyebrow">Priorité haute</div><div className="h-2" style={{ marginTop: 6 }}>{high}</div><div className="small">à examiner en premier</div></div>
        <div className="card card-pad"><div className="eyebrow">Résolus</div><div className="h-2" style={{ marginTop: 6 }}>{reports.filter((r) => r.statut === 'resolved').length}</div><div className="small">sur la période</div></div>
        <div className="card card-pad"><div className="eyebrow">Rejetés</div><div className="h-2" style={{ marginTop: 6 }}>{reports.filter((r) => r.statut === 'rejected').length}</div><div className="small">sans suite</div></div>
      </div>

      <div className="note" style={{ marginBottom: 20 }}>
        <p className="small"><span className="serif italic accent">Confiance & sécurité.</span> Chaque signalement est traité par l'équipe de modération sous 24h. Les motifs liés à un paiement hors plateforme sont prioritaires.</p>
      </div>

      <DataTable
        columns={columns}
        rows={reports}
        searchKeys={['sujet', 'motif']}
        filters={[
          { key: 'statut', label: 'Tous les statuts', options: [
            { value: 'pending', label: 'En attente' },
            { value: 'resolved', label: 'Résolu' },
            { value: 'rejected', label: 'Rejeté' },
          ] },
          { key: 'type', label: 'Tous les types', options: Object.entries(TYPE_LABEL).map(([value, label]) => ({ value, label })) },
        ]}
        searchPlaceholder="Rechercher un signalement…"
        pageSize={8}
      />
    </>
  );
}
```

Note: `searchKeys` drops the old `reporter` entry — `DataTable`'s search does a flat `row[key]` lookup (see `web/components/ui/DataTable.jsx`), and `reporter` is no longer a flat string field (it's the nested `signalePar.name`); extending `DataTable` itself to support nested search keys is out of scope for this plan, so search now covers `sujet`/`motif` only, an honest, small UX narrowing rather than a silently-broken filter.

- [ ] **Step 2: Verify the build compiles**

Run (in `web/`): `npm run build`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add web/app/admin/signalements/page.jsx
git commit -m "feat(web): wire admin signalements table to the real API"
```

---

## Task 11: Web — praticien detail: real favorite toggle + real reviews tab

**Files:**
- Create: `web/app/(site)/praticien/[id]/FavoriteButton.jsx`
- Modify: `web/app/(site)/praticien/[id]/page.jsx`
- Modify: `web/app/(site)/praticien/[id]/ProfileBody.jsx`
- Modify: `web/components/modals/registry.jsx` (one field removed from the `review` preset)

**Baseline, not the file on disk before Plan 02:** this plan runs after Plan 02 (stated in this plan's own header), whose Task 7 already rewrote both `page.jsx` and `ProfileBody.jsx` into the versions shown below *before* this task's diff — re-read both files fresh rather than trusting any older copy. Plan 02 left two explicit, named hooks for this plan to fill in: `mapPraticien` hardcodes `rating: 0, reviews: 0` with a comment citing "Plan 07 builds the avis module", and `page.jsx` passes `const reviews = []` to `ProfileBody` with the same citation. Both are resolved here with real data — **not** by editing `mapPraticien` itself (it has no way to know about avis; it only ever sees one `/praticiens/:id` row), but by fetching `/avis?praticien_id=X` at the page/body level and using that instead of `p.rating`/`p.reviews` wherever they're displayed.

**Ground truth used:** `GET /api/avis?praticien_id=X` (public, Task 2, already filters to `statut === 'publié'` server-side — no client-side status filtering needed, unlike the old mock-era code), `GET`/`POST`/`DELETE /api/client/favorites` (Task 4).

**Two scope decisions carried over from this plan's intro, restated here so they're not missed:**
1. The **"Signaler"** flag icon (`ModalButton modal="report"`, both the top-bar icon and "Signaler ce profil" link) is untouched — per this plan's own opening note, wiring it to `POST /api/signalements` is explicitly deferred to Plan 09, not silently added here.
2. The **favorite toggle** now makes a real, auth-required backend call. An anonymous visitor (this page has no login gate) sees the heart in its default "not favorited" state (the `GET /api/client/favorites` query is simply `enabled: false` while logged out — no doomed 401 fetch) and tapping it opens the `login` modal instead of firing a request that would fail. The **"Laisser un avis" / review submission** does *not* get the same treatment — `ModalButton`'s registry-preset plumbing has no hook to intercept a click before opening a modal, and adding one would mean changing shared `ModalButton`/`FormModal` infrastructure well beyond this task's footprint. An anonymous submit attempt still fails safely (Plan 04 Task 1's `FormModal` awaits `onSubmit` and turns a thrown `ApiError` into a toast, modal stays open) — just with a generic "Token invalide ou expiré" message rather than a tailored one. Documented here as a deliberate, small, non-blocking gap rather than left silently inconsistent with the favorite button's handling.

- [ ] **Step 1: Write `FavoriteButton.jsx`**

Create `web/app/(site)/praticien/[id]/FavoriteButton.jsx`:

```jsx
'use client';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Icon } from '@/components/ui/Icon';
import { useUI } from '@/lib/store';
import { useAuthStore } from '@/lib/auth-store';
import { api } from '@/lib/api';

export function FavoriteButton({ praticienId, style }) {
  const queryClient = useQueryClient();
  const toast = useUI((s) => s.toast);
  const openModal = useUI((s) => s.openModal);
  const isLoggedIn = useAuthStore((s) => !!s.token);
  const [pending, setPending] = useState(false);

  const { data: res } = useQuery({
    queryKey: ['favorites'],
    queryFn: () => api.get('/client/favorites'),
    enabled: isLoggedIn,
  });
  const favorites = res?.data ?? [];
  const isFavorite = favorites.some((f) => f.praticien_id === Number(praticienId));

  const toggle = async () => {
    if (!isLoggedIn) { openModal('login'); return; }
    if (pending) return;
    setPending(true);
    try {
      if (isFavorite) {
        await api.del(`/client/favorites/${praticienId}`);
        toast('Retiré des favoris', 'success');
      } else {
        await api.post('/client/favorites', { praticien_id: Number(praticienId) });
        toast('Ajouté aux favoris', 'success');
      }
      await queryClient.invalidateQueries({ queryKey: ['favorites'] });
    } catch (err) {
      toast(err?.message || 'Une erreur est survenue', 'danger');
    } finally {
      setPending(false);
    }
  };

  return (
    <button
      type="button"
      className="btn btn-icon"
      style={style}
      onClick={toggle}
      disabled={pending}
      aria-pressed={isFavorite}
      title={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
    >
      <Icon name="heart" size={18} color={isFavorite ? 'var(--violet-2)' : undefined} />
    </button>
  );
}

export default FavoriteButton;
```

(`@/lib/auth-store`'s `token` field is Plan 03's — confirmed present in this plan's own "Depends on" note.)

- [ ] **Step 2: Drop the mismatched `mode` field from the `review` modal preset**

`avis` has no "mode" column (no séance-format field at all — see the entity in Task 2) — the preset's `mode` select currently collects a value the backend would just silently discard. In `web/components/modals/registry.jsx`, change the `review` entry:

```diff
   review: (p) => <FormModal title="Laisser un avis" subtitle={p?.name ? `Votre expérience avec ${p.name}` : undefined}
-    fields={[{ name: 'rating', label: 'Note', type: 'rating' }, { name: 'mode', label: 'Modalité', type: 'select', options: ['Séance présentiel', 'Visio'] }, { name: 'text', label: 'Votre avis', type: 'textarea', placeholder: 'Partagez votre ressenti…', required: true }]}
+    fields={[{ name: 'rating', label: 'Note', type: 'rating' }, { name: 'text', label: 'Votre avis', type: 'textarea', placeholder: 'Partagez votre ressenti…', required: true }]}
     submitLabel="Publier l'avis" successToast="Merci, votre avis sera publié après vérification" {...p} />,
```

No other line in the file changes — every other registry entry is untouched.

- [ ] **Step 3: Wire `page.jsx`**

Replace the full contents of `web/app/(site)/praticien/[id]/page.jsx`:

```jsx
'use client';

import { use } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { mapPraticien } from '@/lib/data/praticien-adapter';
import { Badge } from '@/components/ui/Badge';
import { Rating } from '@/components/ui/Rating';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { ModalButton } from '@/components/ui/ModalButton';
import { ProfileBody } from './ProfileBody';
import FavoriteButton from './FavoriteButton';

export default function PractitionerProfilePage({ params }) {
  const { id } = use(params);

  const { data, isLoading } = useQuery({
    queryKey: ['praticien', id],
    queryFn: () => api.get(`/praticiens/${id}`),
  });
  // Real avis count/average — fetched here too (not just inside ProfileBody)
  // so the hero stat strip shows the same real numbers as the reviews tab.
  // Same ['avis', id] key as ProfileBody's own query, so React Query serves
  // both from one shared cache entry rather than firing two requests.
  const { data: avisRes } = useQuery({
    queryKey: ['avis', id],
    queryFn: () => api.get(`/avis?praticien_id=${id}`),
  });
  const avisList = avisRes?.data ?? [];
  const reviewCount = avisList.length;
  const avgNote = reviewCount
    ? Math.round((avisList.reduce((sum, a) => sum + a.note, 0) / reviewCount) * 10) / 10
    : 0;

  if (!isLoading && !data?.data) {
    return (
      <section className="section">
        <div className="container center">
          <h1 className="h-2">Praticien introuvable</h1>
          <p className="lead" style={{ marginTop: 10 }}>Ce profil n'existe pas ou n'est plus disponible.</p>
          <Link href="/praticiens" className="btn btn-soft" style={{ marginTop: 18 }}>Retour à l'annuaire</Link>
        </div>
      </section>
    );
  }
  if (!data?.data) return null;

  const p = mapPraticien(data.data);
  const specChips = [...p.specialties, ...(p.extraSpecialty ? [p.extraSpecialty] : [])];

  return (
    <>
      {/* HERO */}
      <section style={{ position: 'relative', height: 420 }}>
        {p.hero ? (
          <img src={p.hero} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div className="aurora-dark grain" style={{ '--orb-x': '65%', '--orb-y': '25%', '--orb-1': '#C4B0E8', '--orb-2': '#7B5FCF', width: '100%', height: '100%' }} />
        )}
        <div
          style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(180deg, rgba(20,16,30,0.42) 0%, rgba(20,16,30,0.08) 38%, rgba(20,16,30,0.62) 100%)',
          }}
        />
        {/* TOP ACTION ROW */}
        <div className="container" style={{ position: 'absolute', top: 22, left: 0, right: 0 }}>
          <div className="between">
            <Link
              href="/praticiens"
              className="btn btn-icon"
              style={{ background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(6px)' }}
              aria-label="Retour"
            >
              <Icon name="arrowLeft" size={18} />
            </Link>
            <div className="row gap-2">
              <FavoriteButton praticienId={p.id} style={{ background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(6px)' }} />
              <ModalButton
                modal="report"
                payload={{ name: p.name }}
                as="button"
                className="btn btn-icon"
                style={{ background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(6px)' }}
              >
                <Icon name="flag" size={18} />
              </ModalButton>
              <ModalButton
                modal="share"
                payload={{ label: 'le profil de ' + p.name, url: '/praticien/' + p.id }}
                as="button"
                className="btn btn-icon"
                style={{ background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(6px)' }}
              >
                <Icon name="share" size={18} />
              </ModalButton>
            </div>
          </div>
        </div>
      </section>

      {/* FLOATING IDENTITY CARD */}
      <div className="container" style={{ position: 'relative' }}>
        <div className="card card-pad" style={{ marginTop: -80, position: 'relative', zIndex: 2 }}>
          <div className="row gap-2 wrap" style={{ marginBottom: 12 }}>
            {p.verified && <Badge variant="verified" dot>Vérifiée</Badge>}
            <span className="tiny muted" style={{ marginLeft: 'auto' }}>{p.level}</span>
          </div>

          <h1 className="h-1" style={{ marginBottom: 6 }}>{p.name}</h1>
          <div className="row gap-2 small muted" style={{ marginBottom: 16 }}>
            <span className="row gap-1"><Icon name="pin" size={14} color="var(--muted)" />{p.city}</span>
            <span style={{ opacity: 0.5 }}>•</span>
            <span>{p.mode}</span>
          </div>

          <div className="row gap-2 wrap" style={{ marginBottom: 18 }}>
            {specChips.map((s, i) => (
              <span key={s} className={`chip tone-${i % 2 === 0 ? 'violet' : 'sky'}`}>{s}</span>
            ))}
          </div>

          {/* STAT STRIP */}
          <div className="divider" />
          <div className="row gap-6 wrap" style={{ marginTop: 16, alignItems: 'center' }}>
            <Rating value={avgNote} count={reviewCount} showCount size={16} />
            <span className="price" style={{ fontSize: 22 }}>
              {p.price}€<small>/séance</small>
            </span>
          </div>
        </div>
      </div>

      {/* CONTENT + STICKY RAIL */}
      <section className="section-sm">
        <div className="container">
          <div className="grid" style={{ gridTemplateColumns: 'minmax(0,1fr) 320px', gap: 40, alignItems: 'start' }}>
            <div>
              <ProfileBody p={p} id={id} />
            </div>

            {/* BOOKING RAIL */}
            <aside style={{ position: 'sticky', top: 24 }}>
              <div className="card card-pad">
                <div className="price" style={{ fontSize: 26 }}>
                  {p.price}€<small>/séance</small>
                </div>
                <div className="small muted" style={{ marginBottom: 16 }}>{p.mode}</div>

                <Button href={`/reserver/${p.id}`} variant="aurora" size="lg" block>
                  Réserver une séance
                </Button>
                <div style={{ height: 10 }} />
                <ModalButton
                  modal="contact"
                  payload={{ name: p.name }}
                  as="button"
                  className="btn btn-soft btn-block"
                >
                  <Icon name="message" size={16} /> Contacter
                </ModalButton>

                <div className="divider" style={{ margin: '18px 0' }} />

                <ul className="stack gap-3" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  <li className="row gap-2 small">
                    <Icon name="shield" size={15} color="var(--sage-2, var(--violet-2))" />
                    Identité &amp; assurance vérifiées
                  </li>
                  <li className="row gap-2 small">
                    <Icon name="card" size={15} color="var(--violet-2)" />
                    Paiement protégé, versé après la séance
                  </li>
                  <li className="row gap-2 small">
                    <Icon name="calendar" size={15} color="var(--violet-2)" />
                    Annulation gratuite jusqu'à 24h avant
                  </li>
                </ul>
              </div>

              <ModalButton
                modal="report"
                payload={{ name: p.name }}
                as="button"
                className="btn btn-link btn-sm btn-block"
                style={{ marginTop: 14 }}
              >
                <Icon name="flag" size={13} /> Signaler ce profil
              </ModalButton>
            </aside>
          </div>
        </div>
      </section>
    </>
  );
}
```

Changes from the Plan 02 baseline: `ToastButton` import and its fake favorite-toggle usage are gone (replaced by `FavoriteButton`); a second `useQuery(['avis', id], ...)` computes `avgNote`/`reviewCount`, replacing every `p.rating`/`p.reviews` read; `ProfileBody` now takes `id` instead of `reviews`.

- [ ] **Step 4: Wire `ProfileBody.jsx`**

Replace the full contents of `web/app/(site)/praticien/[id]/ProfileBody.jsx`:

```jsx
'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Tabs } from '@/components/ui/Tabs';
import { Avatar } from '@/components/ui/Avatar';
import { Rating } from '@/components/ui/Rating';
import { Icon } from '@/components/ui/Icon';
import { ModalButton } from '@/components/ui/ModalButton';
import { api } from '@/lib/api';
import { dateFr } from '@/lib/format';

const GALLERY_TONES = ['violet', 'sky', 'sage'];

function ExchangePanel({ p }) {
  return (
    <div className="panel tint-violet" style={{ padding: 22 }}>
      <span className="eyebrow">Échange proposé</span>
      <div className="row gap-3 wrap" style={{ marginTop: 14, alignItems: 'center' }}>
        <div className="card card-pad flex-1" style={{ minWidth: 180 }}>
          <span className="tiny muted">Je propose</span>
          <div className="h-4" style={{ marginTop: 4 }}>{p.exchange.gives}</div>
        </div>
        <Icon name="arrowRight" size={22} color="var(--violet-2)" />
        <div className="card card-pad flex-1" style={{ minWidth: 180 }}>
          <span className="tiny muted">Je recherche</span>
          <div className="h-4" style={{ marginTop: 4 }}>{p.exchange.wants}</div>
        </div>
      </div>
    </div>
  );
}

export function ProfileBody({ p, id }) {
  const queryClient = useQueryClient();
  // Same ['avis', id] query key page.jsx uses for the hero stat strip — one
  // shared cache entry, not a second network request.
  const { data: avisRes } = useQuery({
    queryKey: ['avis', id],
    queryFn: () => api.get(`/avis?praticien_id=${id}`),
  });
  const reviews = avisRes?.data ?? [];
  const reviewCount = reviews.length;
  const avgNote = reviewCount
    ? Math.round((reviews.reduce((sum, r) => sum + r.note, 0) / reviewCount) * 10) / 10
    : 0;

  const tabs = [
    { key: 'about', label: 'À propos' },
    { key: 'reviews', label: `Avis (${reviewCount})` },
    { key: 'exchange', label: 'Échanges' },
  ];

  return (
    <Tabs tabs={tabs}>
      {(active) => {
        if (active === 'about') {
          return (
            <div className="stack gap-6" style={{ marginTop: 26 }}>
              <p className="lead">{p.bio}</p>

              {p.approach && (
                <div>
                  <span className="eyebrow">Sa démarche</span>
                  <p className="body" style={{ marginTop: 8 }}>{p.approach}</p>
                </div>
              )}

              <div className="grid grid-2">
                <div className="card card-pad center">
                  <div className="serif" style={{ fontSize: 34, lineHeight: 1, color: 'var(--violet-2)' }}>
                    {p.experience.years}
                  </div>
                  <div className="small muted" style={{ marginTop: 4 }}>ans d'expérience</div>
                </div>
                {p.experience.sessions != null && (
                  <div className="card card-pad center">
                    <div className="serif" style={{ fontSize: 34, lineHeight: 1, color: 'var(--violet-2)' }}>
                      {p.experience.sessions}
                    </div>
                    <div className="small muted" style={{ marginTop: 4 }}>séances réalisées</div>
                  </div>
                )}
              </div>

              <div>
                <span className="eyebrow">En images</span>
                <div className="grid grid-3" style={{ marginTop: 12 }}>
                  {p.gallery && p.gallery.length > 0
                    ? p.gallery.map((src, i) => (
                        <ModalButton
                          key={i}
                          modal="lightbox"
                          payload={{ images: p.gallery, start: i }}
                          as="div"
                          className="card card-hover"
                          style={{ overflow: 'hidden', padding: 0, cursor: 'pointer', aspectRatio: '4 / 3' }}
                        >
                          <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </ModalButton>
                      ))
                    : GALLERY_TONES.map((t, i) => (
                        <div
                          key={i}
                          className={`tint-${t}`}
                          style={{ borderRadius: 20, aspectRatio: '4 / 3' }}
                        />
                      ))}
                </div>
              </div>

              {p.exchange && <ExchangePanel p={p} />}
            </div>
          );
        }

        if (active === 'reviews') {
          return (
            <div className="stack gap-4" style={{ marginTop: 26 }}>
              <div className="between">
                <div className="row gap-3" style={{ alignItems: 'baseline' }}>
                  <span className="serif" style={{ fontSize: 30, color: 'var(--violet-2)' }}>{avgNote}</span>
                  <Rating value={avgNote} count={reviewCount} showCount />
                </div>
                <ModalButton
                  modal="review"
                  payload={{
                    name: p.name,
                    onSubmit: async (values) => {
                      await api.post('/client/avis', {
                        praticien_id: p.id,
                        note: Number(values.rating) || 5,
                        avis: values.text,
                      });
                      await queryClient.invalidateQueries({ queryKey: ['avis', id] });
                    },
                  }}
                  className="btn btn-soft btn-sm"
                  as="button"
                >
                  <Icon name="edit" size={14} /> Laisser un avis
                </ModalButton>
              </div>

              {reviews.length === 0 ? (
                <div className="note">Aucun avis publié pour l'instant.</div>
              ) : (
                reviews.map((r) => (
                  <div key={r.id} className="card card-pad">
                    <div className="row gap-3" style={{ alignItems: 'flex-start' }}>
                      <Avatar name={r.full_name_author} size={44} />
                      <div className="flex-1">
                        <div className="between">
                          <div className="h-4">{r.full_name_author}</div>
                          <span className="tiny muted">{dateFr(r.date_ajout)}</span>
                        </div>
                        <div className="row gap-2" style={{ margin: '4px 0 10px' }}>
                          <Rating value={r.note} size={13} showCount={false} />
                        </div>
                        <p className="body">{r.avis}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          );
        }

        // exchange
        return (
          <div className="stack gap-5" style={{ marginTop: 26 }}>
            {p.exchange && <ExchangePanel p={p} />}
            <div className="note">
              <strong>Le troc bienveillant.</strong> Sur AURA, certains praticiens acceptent
              d'échanger un soin contre un autre savoir-faire. Contactez {p.name.split(' ')[0]} via
              la messagerie pour proposer votre échange — aucun paiement n'est requis.
            </div>
          </div>
        );
      }}
    </Tabs>
  );
}

export default ProfileBody;
```

Changes from the Plan 02 baseline: `ProfileBody` self-fetches `['avis', id]` instead of taking a `reviews` prop (as flagged in this plan's own File Structure table); the reviews tab renders real fields (`full_name_author`, `date_ajout`, `note`, `avis` — dropping `mode`, which doesn't exist on a real avis row) instead of the old mock fields (`author`, `when`, `mode`, `rating`, `text`); the "Laisser un avis" button now submits for real via `onSubmit`. The `about` and `exchange` tabs, and every `p.exchange`/`p.approach` guard Plan 02 added, are untouched.

- [ ] **Step 5: Verify the build compiles**

Run (in `web/`): `npm run build`
Expected: build succeeds.

- [ ] **Step 6: Commit**

```bash
git add "web/app/(site)/praticien/[id]/page.jsx" "web/app/(site)/praticien/[id]/ProfileBody.jsx" "web/app/(site)/praticien/[id]/FavoriteButton.jsx" web/components/modals/registry.jsx
git commit -m "feat(web): wire praticien detail favorite toggle and reviews tab to the real API"
```

---

Web is done. The remaining tasks wire mobile.

## Task 12: Mobile — types + repo layer (`avisRepo`, `signalementRepo`, `favoriteRepo`, `notificationPreferencesRepo`)

**Files:**
- Modify: `mobile/src/data/types.ts`
- Modify: `mobile/src/data/repos/index.ts`

**Baseline:** `mobile/src/data/repos/index.ts` is touched incrementally across several plans (Plan 02 Tasks 8/9/10/12 add `mapPraticien`/`practitionerRepo`, `eventRepo`, `cercleRepo`, `articleRepo`; this plan does not depend on Plan 04, whose Task 7 separately rewires `exchangeRepo`/adds `paiementRepo`/`remboursementRepo` — that may or may not have landed yet). Rather than a full-file replacement (which would require guessing the exact byte-for-byte cumulative state of sections this plan doesn't own), this task is a **targeted diff**: one new block of 4 exported repos, one one-line change inside the already-final `practitionerRepo` (Plan 02 Task 8 is the last task to touch that specific block), and one import-list edit. Same reasoning `server/test/utils/create-test-app.ts` gets treated with all through this plan's backend tasks, applied to mobile's equivalent shared file.

**Ground truth used:** the same 8 endpoints from Tasks 2–5 (`GET /api/avis?praticien_id=`, `POST /api/client/avis`, `POST /api/signalements`, `GET`/`POST`/`DELETE /api/client/favorites`, `GET`/`PUT /api/client/notification-preferences`).

**Test approach:** no dedicated jest-expo tests are added for these four repos — every function is a thin `api.get/post/put/del` passthrough with no branching or parsing logic of its own (the one exception, `favoriteRepo.list`'s `.map(mapPraticien)`, reuses `mapPraticien` exactly as-is, already covered by Plan 02's `repos/index.test.ts`). This mirrors Plan 04's own stated test philosophy for `paiementRepo`/`remboursementRepo` — thin wrappers don't get dedicated tests; `npm run typecheck` is the verification step instead.

- [ ] **Step 1: Add the 4 new types to `mobile/src/data/types.ts`**

Insert immediately after the existing `Review` interface, before `BookingDraft`:

```typescript
export interface Review {
  id: string;
  practitionerId: string;
  authorInitial: string;
  whenLabel: string;
  modeLabel: string;
  rating: number;
  text: string;
}

/** Real `avis` row (server/src/database/entities/avis.entity.ts) — field names verbatim, no camelCase mapping layer. */
export interface Avis {
  id: number;
  full_name_author: string;
  praticien_id: number;
  note: number;
  avis: string;
  date_ajout: string;
  statut: string;
  created_at?: string;
  updated_at?: string;
}

/** Real `signalements` row (server/src/database/entities/signalement.entity.ts). */
export interface Signalement {
  id: number;
  date_signalement: string;
  type: string;
  sujet: string;
  motif: string;
  signale_par_id: number;
  praticien_id: number;
  priorite: string;
  statut: string;
  created_at?: string;
  updated_at?: string;
}

export interface NotificationPreferences {
  rappels_seance: boolean;
  nouveaux_messages: boolean;
  reponses_avis: boolean;
  newsletter: boolean;
}

/** One row of `GET /api/client/favorites` — the favorite pivot joined with the full praticien row. */
export interface FavoritePraticien {
  id: number;
  client_id: number;
  praticien_id: number;
  created_at: string;
  praticien: {
    id: number;
    firstname: string;
    lastname: string;
    email: string;
    telephone: string;
    ville: string;
    niveau: string;
    specialite: string;
    mode: string;
    status: string;
    tarif: number;
    experience: number;
    bio: string;
    statut_verification: string;
  };
}

export interface BookingDraft {
```

(`Review` itself is left in place — `mobile/src/data/mock/practitioners.ts`'s `reviewsMock` still references it as a type, even though nothing imports that mock any more post-Plan 02; deleting either is out of scope for this plan.)

- [ ] **Step 2: Update the type import in `repos/index.ts`**

```diff
 import type {
   Practitioner,
   Discipline,
   Event,
   Exchange,
   Conversation,
   ChatMessage,
-  Review,
+  Avis,
+  Signalement,
+  NotificationPreferences,
+  FavoritePraticien,
 } from '../types';
```

(`Review` is dropped from the import — after Step 3, nothing in this file uses it any more.)

- [ ] **Step 3: Repoint `practitionerRepo.reviewsFor` and add the 4 new repos**

Find the `practitionerRepo` block (added by Plan 02 Task 8) and change its last property, then insert the 4 new repo exports directly after the block's closing `};`:

```diff
 // ---------- Practitioners ----------
 export const practitionerRepo = {
   list: (): Promise<Practitioner[]> =>
     api.get<{ data: any[] }>('/praticiens').then((res) => res.data.map(mapPraticien)),
   byId: (id: string): Promise<Practitioner | undefined> =>
     api.get<{ data: any }>(`/praticiens/${id}`).then((res) => mapPraticien(res.data)).catch(() => undefined),
   byDiscipline: (disciplineName: string): Promise<Practitioner[]> =>
     practitionerRepo.list().then((list) => list.filter((p) => p.specialties.includes(disciplineName))),
   recommended: (): Promise<Practitioner[]> =>
     practitionerRepo.list().then((list) => list.slice(0, 4)),
-  // No reviews backend yet — Plan 07 builds the `avis` module. Return an
-  // honest empty list rather than calling an endpoint that doesn't exist.
-  reviewsFor: (_practitionerId: string): Promise<Review[]> => Promise.resolve([]),
+  // Real reviews now — delegates to avisRepo (defined below) rather than
+  // duplicating the fetch here.
+  reviewsFor: (practitionerId: string): Promise<Avis[]> => avisRepo.forPraticien(practitionerId),
 };
+
+// ---------- Avis (reviews) ----------
+export const avisRepo = {
+  forPraticien: (praticienId: string): Promise<Avis[]> =>
+    api.get<{ data: Avis[] }>(`/avis?praticien_id=${praticienId}`).then((res) => res.data),
+  create: (dto: { praticien_id: number; note: number; avis: string }): Promise<Avis> =>
+    api.post<{ data: Avis }>('/client/avis', dto).then((res) => res.data),
+};
+
+// ---------- Signalements (reports) ----------
+export const signalementRepo = {
+  create: (dto: {
+    praticien_id: number; type: string; sujet: string; motif: string; priorite?: string;
+  }): Promise<Signalement> =>
+    api.post<{ data: Signalement }>('/signalements', dto).then((res) => res.data),
+};
+
+// ---------- Favorites ----------
+export const favoriteRepo = {
+  // Maps through the same mapPraticien used by practitionerRepo, so a
+  // favorited praticien renders with <PractitionerCard> exactly like any
+  // other praticien list — no separate card design needed.
+  list: (): Promise<Practitioner[]> =>
+    api.get<{ data: FavoritePraticien[] }>('/client/favorites')
+      .then((res) => res.data.map((f) => mapPraticien(f.praticien))),
+  add: (praticienId: string): Promise<void> =>
+    api.post('/client/favorites', { praticien_id: Number(praticienId) }).then(() => undefined),
+  remove: (praticienId: string): Promise<void> =>
+    api.del(`/client/favorites/${praticienId}`).then(() => undefined),
+};
+
+// ---------- Notification preferences ----------
+export const notificationPreferencesRepo = {
+  get: (): Promise<NotificationPreferences> =>
+    api.get<{ data: NotificationPreferences }>('/client/notification-preferences').then((res) => res.data),
+  update: (patch: Partial<NotificationPreferences>): Promise<NotificationPreferences> =>
+    api.put<{ data: NotificationPreferences }>('/client/notification-preferences', patch).then((res) => res.data),
+};
```

`reviewsFor` referencing `avisRepo`, which is declared textually *after* `practitionerRepo` in the same module, is safe: it's inside an arrow function body, so it's only evaluated when a caller actually invokes `reviewsFor(...)` — by then the whole module (including `avisRepo`'s `const`) has already finished initializing. No temporal-dead-zone issue.

- [ ] **Step 4: Verify types compile**

Run (in `mobile/`): `npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Run the existing mobile test suite to confirm no regressions**

Run (in `mobile/`): `npm test`
Expected: PASS — `repos/index.test.ts`'s `mapPraticien`/`mapDiscipline` suites (Plan 02) are unaffected by this purely-additive change.

- [ ] **Step 6: Commit**

```bash
git add mobile/src/data/types.ts mobile/src/data/repos/index.ts
git commit -m "feat(mobile): add avis/signalement/favorite/notification-preferences repos and types"
```

---

## Task 13: Mobile — `review.tsx` real submit + `praticienId` param

**Files:**
- Modify: `mobile/app/review.tsx`

**Read fresh first — current state (confirmed by reading the file during research):** no route params at all; hardcoded target `"Élodie Marceau" / "Magnétisme · séance du 12 mars"`; a `feels` chip grid and a "publier sous mon prénom" toggle, **neither of which has any backing column on the real `avis` table** (`CreateAvisDto` only accepts `praticien_id, note, avis` — no tags, no anonymity flag, `full_name_author` is always server-derived from the client's real name); submit is `onPress={() => router.back()}`, no repo call at all.

**Design decisions:**
- The `feels` chips and the "publier sous mon prénom" toggle are **dropped**, not silently ignored — keeping form controls that write to nothing would mean quietly discarding user input, the same call this plan already made for `avis`' `mode` field on web (Task 11). The mood caption (`moods[rating-1]`) stays — it's cosmetic text derived from the already-real `rating` value, no backend involved.
- The hardcoded "séance du 12 mars" subtitle is dropped — there is no booking/séance data source to pull a real one from (explicitly out of scope per this plan's intro note #2); the target card now shows the real praticien's name and first specialty, fetched via the already-wired `practitionerRepo.byId`.
- No `praticienId` param → an honest empty state ("choisissez un praticien"), exactly as this plan's intro note #2 already commits to, rather than the old fake hardcoded form.

- [ ] **Step 1: Replace the full contents of `mobile/app/review.tsx`**

```tsx
import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Avatar } from '@components/Avatar';
import { Button } from '@components/Button';
import { Input } from '@components/Input';
import { Lotus } from '@components/Lotus';
import { ScreenHeader } from '@components/ScreenHeader';
import { colors } from '@theme/colors';
import { typography } from '@theme/typography';
import { shadows } from '@theme/shadows';
import { avisRepo, practitionerRepo } from '@data/repos';

const moods = [
  "Une rencontre lumineuse",
  "Une bouffée d'air",
  "Recentré·e, plus calme",
  "À refaire dès que possible",
  "Une étape importante",
];

export default function Review() {
  const { praticienId } = useLocalSearchParams<{ praticienId?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(5);
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: p } = useQuery({
    queryKey: ['practitioner', praticienId],
    queryFn: () => practitionerRepo.byId(String(praticienId)),
    enabled: !!praticienId,
  });

  if (!praticienId) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.pearl }}>
        <ScreenHeader title="Votre ressenti" backIcon="close" />
        <View style={styles.emptyWrap}>
          <Lotus size={40} color={colors.violet2} />
          <Text style={styles.emptyTitle}>Choisissez un praticien</Text>
          <Text style={styles.emptyBody}>
            Ouvrez le profil d'un praticien pour laisser un avis sur votre expérience avec lui.
          </Text>
        </View>
      </View>
    );
  }

  const submit = async () => {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await avisRepo.create({ praticien_id: Number(praticienId), note: rating, avis: text });
      await queryClient.invalidateQueries({ queryKey: ['reviews', praticienId] });
      router.back();
    } catch (err: any) {
      setError(err?.message ?? 'Une erreur est survenue, réessayez.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.pearl }}>
      <ScreenHeader title="Votre ressenti" backIcon="close" />
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: insets.bottom + 32 }}>
        <View style={[styles.target, shadows.card]}>
          <Avatar gradient={p?.gradient ?? [colors.violet, colors.sky]} size="md" />
          <View style={{ flex: 1 }}>
            <Text style={styles.targetName}>{p?.name ?? '…'}</Text>
            {p?.specialties?.[0] ? <Text style={styles.targetSub}>{p.specialties[0]}</Text> : null}
          </View>
        </View>

        <Text style={[typography.eyebrow, { textAlign: 'center', marginBottom: 14 }]}>
          COMMENT VOUS ÊTES-VOUS SENTI·E ?
        </Text>

        <View style={styles.picker}>
          {[1, 2, 3, 4, 5].map((n) => (
            <Pressable
              key={n}
              onPress={() => setRating(n)}
              style={[styles.pick, n > rating && { opacity: 0.3 }]}
            >
              <Lotus size={36} color={colors.violet2} />
            </Pressable>
          ))}
        </View>
        <Text style={styles.mood}>{moods[rating - 1]}</Text>

        <Input
          label="Votre témoignage"
          value={text}
          onChangeText={setText}
          multiline
          placeholder="Partagez votre ressenti…"
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={{ height: 4 }} />
        <Button
          label={submitting ? 'Envoi…' : 'Partager mon avis'}
          onPress={submit}
          disabled={submitting || text.trim().length < 3}
        />
        <Text style={styles.help}>
          Votre avis aide d'autres chercheurs à choisir en confiance.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  target: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 20,
    marginBottom: 24,
  },
  targetName: { fontFamily: 'CormorantGaramond_500Medium', fontSize: 19 },
  targetSub: { ...typography.tiny, fontSize: 12 },

  picker: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 14,
    marginBottom: 8,
  },
  pick: { padding: 4 },
  mood: {
    fontFamily: 'CormorantGaramond_400Regular_Italic',
    color: colors.violet2,
    fontSize: 24,
    textAlign: 'center',
    marginBottom: 24,
  },

  error: { ...typography.small, fontSize: 13, color: colors.danger, textAlign: 'center', marginBottom: 8 },
  help: { ...typography.tiny, textAlign: 'center', marginTop: 12 },

  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 10 },
  emptyTitle: { fontFamily: 'CormorantGaramond_500Medium', fontSize: 20, color: colors.ink },
  emptyBody: { ...typography.small, fontSize: 14, textAlign: 'center', lineHeight: 20 },
});
```

`text.trim().length < 3` mirrors `CreateAvisDto`'s `@MinLength(3)` client-side, so the submit button reflects the real validation rule rather than only discovering it via a failed request.

- [ ] **Step 2: Check the call sites — `mobile/app/(tabs)/profil.tsx`**

Read the file fresh. Its "Laisser un avis" `MenuRow` is:

```tsx
<MenuRow
  icon={<Lotus size={16} color={colors.violet2} />}
  label="Laisser un avis"
  value="1 en attente"
  onPress={() => router.push('/review' as any)}
/>
```

**No change needed here** — it already navigates to `/review` with no params, which is exactly the behavior this plan's intro note #2 commits to (this row has no real séance/booking data source to supply a `praticienId` from, so it deliberately lands on the new honest empty state built in Step 1, rather than being wired to fake data). Confirmed correct as-is, not silently skipped.

- [ ] **Step 3: The real entry point — `mobile/app/praticien/[id].tsx`**

This screen's reviews tab gets its own real "Laisser un avis" button (passing a real `praticienId`) as part of Task 16, which rewrites that tab's rendering wholesale — tracked there rather than duplicated here, since it's the same block of JSX.

- [ ] **Step 4: Verify types compile**

Run (in `mobile/`): `npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add mobile/app/review.tsx
git commit -m "feat(mobile): wire review.tsx to real avis submission, add praticienId param"
```

---

## Task 14: Mobile — `report.tsx` real submit + `praticienId` param

**Files:**
- Modify: `mobile/app/report.tsx`

**Read fresh first — current state (confirmed by reading the file during research):** no route params; a `reasons` list (5 fixed options with `key`/`title`/optional `detail`) driving a single-select `picked` state; a free-text `note`; submit is `onPress={() => router.back()}`, no repo call. This screen's only call site in the whole mobile codebase is `praticien/[id].tsx`'s flag icon (confirmed — `profil.tsx` has no `/report` reference at all).

**Field mapping onto `CreateSignalementDto` (`praticien_id, type, sujet, motif, priorite?`):** the 5 `reasons` keys (`overclaim`/`behavior`/`fake`/`pros`/`other`) become the real `type` value sent to the backend — machine-stable and, per Task 3's Ground Truth note, exactly the vocabulary `type` was left unconstrained to accept. The selected reason's French `title` becomes `sujet`. `motif` is the free-text `note` if the user wrote one, else the reason's `detail`, else its `title` — always non-empty, mirroring web's `buildEchangeSujet`-style graceful fallback from Plan 04. `priorite` is left unset (defaults server-side to `'normale'`) — there's no priority picker in this UI and adding one wasn't asked for.

- [ ] **Step 1: Replace the full contents of `mobile/app/report.tsx`**

```tsx
import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@components/Button';
import { Icon } from '@components/Icon';
import { Input } from '@components/Input';
import { Lotus } from '@components/Lotus';
import { ScreenHeader } from '@components/ScreenHeader';
import { colors } from '@theme/colors';
import { typography } from '@theme/typography';
import { signalementRepo } from '@data/repos';

const reasons = [
  {
    key: 'overclaim',
    title: 'Promesses de guérison exagérées',
    detail: 'Diagnostic, traitement médical implicite',
  },
  {
    key: 'behavior',
    title: 'Comportement non-professionnel',
    detail: "Pendant ou après une séance",
  },
  { key: 'fake', title: 'Faux avis ou témoignage trompeur' },
  { key: 'pros', title: 'Discours dérangeant ou prosélytisme' },
  { key: 'other', title: 'Autre' },
];

export default function Report() {
  const { praticienId } = useLocalSearchParams<{ praticienId?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [picked, setPicked] = useState('overclaim');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!praticienId) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.pearl }}>
        <ScreenHeader title="Signaler" backIcon="close" />
        <View style={styles.emptyWrap}>
          <Lotus size={40} color={colors.violet2} />
          <Text style={styles.emptyTitle}>Choisissez un praticien</Text>
          <Text style={styles.emptyBody}>
            Ouvrez le profil d'un praticien pour le signaler à l'équipe de modération.
          </Text>
        </View>
      </View>
    );
  }

  const submit = async () => {
    if (submitting) return;
    const reason = reasons.find((r) => r.key === picked)!;
    setSubmitting(true);
    setError(null);
    try {
      await signalementRepo.create({
        praticien_id: Number(praticienId),
        type: reason.key,
        sujet: reason.title,
        motif: note.trim() || reason.detail || reason.title,
      });
      router.back();
    } catch (err: any) {
      setError(err?.message ?? 'Une erreur est survenue, réessayez.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.pearl }}>
      <ScreenHeader title="Signaler" backIcon="close" />
      <ScrollView
        contentContainerStyle={{ padding: 24, paddingBottom: insets.bottom + 32 }}
      >
        <Text style={styles.h}>Qu'avez-vous remarqué ?</Text>
        <Text style={styles.lead}>
          Aura est une communauté de soin. Toute signalisation est lue par un humain
          sous 24h. Votre identité reste confidentielle.
        </Text>

        <View style={{ gap: 8, marginBottom: 18 }}>
          {reasons.map((r) => {
            const active = picked === r.key;
            return (
              <Pressable
                key={r.key}
                onPress={() => setPicked(r.key)}
                style={[styles.opt, active && styles.optActive]}
              >
                <View style={[styles.check, active && styles.checkActive]}>
                  {active ? <Icon name="check" size={11} color="#fff" /> : null}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.optTitle}>{r.title}</Text>
                  {r.detail ? <Text style={styles.optDetail}>{r.detail}</Text> : null}
                </View>
              </Pressable>
            );
          })}
        </View>

        <Input
          label="Préciser (facultatif)"
          value={note}
          onChangeText={setNote}
          multiline
          placeholder="Vos mots restent confidentiels…"
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Button label={submitting ? 'Envoi…' : 'Envoyer le signalement'} onPress={submit} disabled={submitting} />
        <Text style={styles.help}>
          En cas d'urgence, contactez le 17 ou le 3919.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  h: {
    fontFamily: 'CormorantGaramond_400Regular',
    fontSize: 24,
    color: colors.ink,
    marginBottom: 8,
  },
  lead: { ...typography.small, fontSize: 14, lineHeight: 21, marginBottom: 22 },

  opt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
  },
  optActive: { borderColor: colors.violet2, backgroundColor: '#FBF7FF' },
  check: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#D8D2C4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  optTitle: { ...typography.bodyMedium, fontSize: 14 },
  optDetail: { ...typography.tiny, fontSize: 12, marginTop: 2 },

  error: { ...typography.small, fontSize: 13, color: colors.danger, textAlign: 'center', marginTop: 4, marginBottom: 8 },
  help: { ...typography.tiny, textAlign: 'center', marginTop: 14 },

  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 10 },
  emptyTitle: { fontFamily: 'CormorantGaramond_500Medium', fontSize: 20, color: colors.ink },
  emptyBody: { ...typography.small, fontSize: 14, textAlign: 'center', lineHeight: 20 },
});
```

- [ ] **Step 2: Check the call sites**

`mobile/app/(tabs)/profil.tsx` — read fresh, confirmed no `/report` reference anywhere in the file. Nothing to fix here.

`mobile/app/praticien/[id].tsx` — its flag-icon `Pressable` currently does `router.push('/report' as any)` with no param; this is the one real call site and it's fixed as part of Task 16 (same file, same pass that adds the favorite heart and rewrites the reviews tab).

- [ ] **Step 3: Verify types compile**

Run (in `mobile/`): `npm run typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add mobile/app/report.tsx
git commit -m "feat(mobile): wire report.tsx to real signalement submission, add praticienId param"
```

---

## Task 15: Mobile — new `favorites.tsx` + `notification-settings.tsx` screens, wire `profil.tsx`

**Files:**
- Create: `mobile/app/favorites.tsx`
- Create: `mobile/app/notification-settings.tsx`
- Modify: `mobile/app/(tabs)/profil.tsx` (two rows only)

**Scope, restated:** only the "Mes praticiens favoris" and "Notifications" rows on `profil.tsx` are touched. Re-read the file fresh (done during research) — "Modifier mon profil", the SÉANCES/PRATICIENS/FAVORIS stat strip, "Mes séances & événements", "Moyens de paiement", "Confidentialité & sécurité", "L'âme du projet", "Devenir praticien", and sign-out are all **untouched**, regardless of whether they're currently wired, fake, or dead — that inventory belongs to Plan 09, which explicitly runs after this plan so its dead-row list is accurate.

- [ ] **Step 1: Write `favorites.tsx`**

Create `mobile/app/favorites.tsx`. Mirrors `recherche.tsx`'s list-of-`PractitionerCard` pattern and `exchange/index.tsx`'s `ScreenHeader`-driven stack-screen chrome — `favoriteRepo.list()` (Task 12) already returns `Practitioner[]` (mapped through the same `mapPraticien` `practitionerRepo.list` uses), so the existing card component needs no changes. No inline remove button here — tapping a card opens the real profile, where Task 16's real heart toggle can un-favorite it; this screen stays a plain, consistent list rather than growing a second, redundant removal control.

```tsx
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Icon } from '@components/Icon';
import { PractitionerCard } from '@components/PractitionerCard';
import { ScreenHeader } from '@components/ScreenHeader';
import { colors } from '@theme/colors';
import { typography } from '@theme/typography';
import { favoriteRepo } from '@data/repos';

export default function Favorites() {
  const insets = useSafeAreaInsets();
  const { data: favorites = [], isLoading } = useQuery({
    queryKey: ['favorites'],
    queryFn: favoriteRepo.list,
  });

  return (
    <View style={{ flex: 1, backgroundColor: colors.pearl }}>
      <ScreenHeader title="Mes favoris" />
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <Text style={styles.empty}>Chargement…</Text>
        ) : favorites.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Icon name="heart" size={28} color={colors.muted} />
            <Text style={styles.emptyTitle}>Aucun favori pour l'instant</Text>
            <Text style={styles.emptyBody}>
              Touchez le cœur sur le profil d'un praticien pour le retrouver ici.
            </Text>
          </View>
        ) : (
          favorites.map((p) => <PractitionerCard key={p.id} practitioner={p} />)
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { ...typography.small, textAlign: 'center', marginTop: 40 },
  emptyWrap: { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyTitle: { fontFamily: 'CormorantGaramond_500Medium', fontSize: 18, color: colors.ink, marginTop: 6 },
  emptyBody: { ...typography.small, fontSize: 13, textAlign: 'center', maxWidth: 260 },
});
```

- [ ] **Step 2: Write `notification-settings.tsx`**

Create `mobile/app/notification-settings.tsx`. Same optimistic-update-then-reconcile approach as web's `NotificationsSection.jsx` (Task 8), built on the `Toggle` component already used by `review.tsx`'s (now-removed) publish toggle:

```tsx
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ScreenHeader } from '@components/ScreenHeader';
import { Toggle } from '@components/Toggle';
import { colors } from '@theme/colors';
import { typography } from '@theme/typography';
import { notificationPreferencesRepo } from '@data/repos';
import type { NotificationPreferences } from '@data/types';

const FIELDS: { key: keyof NotificationPreferences; label: string; desc: string }[] = [
  { key: 'rappels_seance', label: 'Rappels de séance', desc: 'Un rappel 24h et 1h avant chaque rendez-vous.' },
  { key: 'nouveaux_messages', label: 'Nouveaux messages', desc: "Soyez averti dès qu'un praticien vous répond." },
  { key: 'reponses_avis', label: 'Réponses à mes avis', desc: 'Quand un praticien réagit à votre retour.' },
  { key: 'newsletter', label: 'Newsletter AURA', desc: 'Inspirations, événements et nouveautés, une fois par mois.' },
];

const DEFAULTS: NotificationPreferences = {
  rappels_seance: true, nouveaux_messages: true, reponses_avis: false, newsletter: true,
};

export default function NotificationSettings() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { data: prefs = DEFAULTS } = useQuery({
    queryKey: ['notification-preferences'],
    queryFn: notificationPreferencesRepo.get,
  });

  const toggle = async (key: keyof NotificationPreferences, value: boolean) => {
    queryClient.setQueryData(['notification-preferences'], { ...prefs, [key]: value });
    try {
      await notificationPreferencesRepo.update({ [key]: value });
    } finally {
      queryClient.invalidateQueries({ queryKey: ['notification-preferences'] });
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.pearl }}>
      <ScreenHeader title="Notifications" />
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}>
        <View style={styles.card}>
          {FIELDS.map((f, i) => (
            <View key={f.key}>
              {i > 0 ? <View style={styles.divider} /> : null}
              <View style={styles.row}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={styles.label}>{f.label}</Text>
                  <Text style={styles.desc}>{f.desc}</Text>
                </View>
                <Toggle value={!!prefs[f.key]} onValueChange={(v) => toggle(f.key, v)} />
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#fff', marginHorizontal: 20, marginTop: 8, borderRadius: 20, paddingHorizontal: 16 },
  divider: { height: 1, backgroundColor: colors.line },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16 },
  label: { ...typography.bodyMedium, fontSize: 14.5, color: colors.ink },
  desc: { ...typography.tiny, fontSize: 12, marginTop: 2 },
});
```

- [ ] **Step 3: Wire the two rows in `profil.tsx`**

```diff
           <MenuRow
             icon={<Icon name="heart" size={18} color={colors.ink} />}
             label="Mes praticiens favoris"
-            value="12"
+            onPress={() => router.push('/favorites' as any)}
           />
```

The hardcoded `value="12"` is dropped, not left in place next to a now-real navigation target — it was never backed by anything, and wiring the row for real is exactly the moment that stops being defensible.

```diff
-          <MenuRow icon={<Icon name="bell" size={18} color={colors.ink} />} label="Notifications" />
+          <MenuRow
+            icon={<Icon name="bell" size={18} color={colors.ink} />}
+            label="Notifications"
+            onPress={() => router.push('/notification-settings' as any)}
+          />
```

`router` is already in scope (`const router = useRouter();`, top of the component) — no new imports needed in this file.

- [ ] **Step 4: Verify types compile**

Run (in `mobile/`): `npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add mobile/app/favorites.tsx mobile/app/notification-settings.tsx "mobile/app/(tabs)/profil.tsx"
git commit -m "feat(mobile): add favorites and notification-settings screens, wire profil.tsx rows"
```

---

## Task 16: Mobile — `praticien/[id].tsx`: real favorite heart, real reviews tab, review/report entry points

**Files:**
- Modify: `mobile/app/praticien/[id].tsx`

**Baseline — unlike the mobile repo layer, this screen is untouched by Plan 02.** Plan 02's repo header comment ("screens never need to change when the repo bodies change") is exactly why: this screen already consumed `practitionerRepo.byId`/`practitionerRepo.reviewsFor` through the repo abstraction *before* Plan 02 existed, so Plan 02 only had to change what's inside those functions. The file read fresh during research (confirmed current) is therefore the real, accurate baseline for this task's diff — no intermediate state to account for.

**Scope boundary, stated explicitly so it isn't mistaken for an oversight:** re-reading this file turned up a lot of *other* hardcoded fakeness that predates this plan and is **not** in scope here — the "about" tab's `+ Nettoyage karmique` chip, its `p.experience?.years ?? 8` / `?? 600` fallbacks, its 6-tile gallery gradient fallback, and the entire "exchange" tab (hardcoded "1 soin énergétique" / "1h yoga privé" panel, not reading `p` at all; the `Échanges (2)` tab count is a literal). None of that is touched — this task's brief is specifically the favorite heart and the reviews tab, and expanding into the rest would be exactly the kind of unrequested scope this plan's own intro already warns against elsewhere.

**Ground truth used:** same as Task 11 (`GET /api/avis?praticien_id=`, `GET`/`POST`/`DELETE /api/client/favorites`), plus Task 12's `favoriteRepo`/`avisRepo` (already returning `Practitioner[]`/`Avis[]` respectively — no new mapping needed here).

- [ ] **Step 1: Imports and per-render state/queries**

```diff
-import { useQuery } from '@tanstack/react-query';
+import { useQuery, useQueryClient } from '@tanstack/react-query';
@@
-import { practitionerRepo } from '@data/repos';
+import { practitionerRepo, favoriteRepo } from '@data/repos';

 type Tab = 'about' | 'reviews' | 'exchanges';

+// No shared date-formatting utility exists yet on mobile that this plan can
+// safely depend on (mobile/src/utils/format.ts is a Plan 04 addition, and
+// this plan doesn't declare a dependency on Plan 04 landing first) — and RN's
+// Hermes engine doesn't reliably support Intl.DateTimeFormat locales, so this
+// is a small manual formatter rather than `.toLocaleDateString('fr-FR', ...)`.
+function formatReviewDate(iso: string): string {
+  const d = new Date(iso);
+  if (Number.isNaN(d.getTime())) return iso;
+  const months = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
+  return `${String(d.getDate()).padStart(2, '0')} ${months[d.getMonth()]} ${d.getFullYear()}`;
+}
+
 export default function PractitionerProfile() {
   const { id } = useLocalSearchParams<{ id: string }>();
   const insets = useSafeAreaInsets();
   const router = useRouter();
+  const queryClient = useQueryClient();
   const [tab, setTab] = useState<Tab>('about');
+  const [favPending, setFavPending] = useState(false);

   const { data: p } = useQuery({
     queryKey: ['practitioner', id],
     queryFn: () => practitionerRepo.byId(String(id)),
   });
   const { data: reviews = [] } = useQuery({
     queryKey: ['reviews', id],
     queryFn: () => practitionerRepo.reviewsFor(String(id)),
   });
+  const { data: favorites = [] } = useQuery({
+    queryKey: ['favorites'],
+    queryFn: favoriteRepo.list,
+  });

   if (!p) return <View style={{ flex: 1, backgroundColor: colors.pearl }} />;
+
+  const isFavorite = favorites.some((f) => f.id === p.id);
+  const reviewCount = reviews.length;
+  const avgNote = reviewCount
+    ? Math.round((reviews.reduce((sum, r) => sum + r.note, 0) / reviewCount) * 10) / 10
+    : 0;
+
+  const toggleFavorite = async () => {
+    if (favPending) return;
+    setFavPending(true);
+    try {
+      if (isFavorite) await favoriteRepo.remove(p.id);
+      else await favoriteRepo.add(p.id);
+      await queryClient.invalidateQueries({ queryKey: ['favorites'] });
+    } finally {
+      setFavPending(false);
+    }
+  };
```

All 3 new `useQuery`/`useState`/`useQueryClient` calls are added *above* the `if (!p) return ...` early exit — React hooks must run unconditionally on every render, so nothing hook-shaped can go below it. `isFavorite`/`reviewCount`/`avgNote`/`toggleFavorite` are plain values/functions, not hooks, so they're fine right after it (mirrors `p`-dependent derivations that already lived there, like `heroMeta`/`heroAspect`).

- [ ] **Step 2: Real favorite heart + `praticienId` on the report icon**

```diff
             <View style={{ flexDirection: 'row', gap: 8 }}>
-              <Pressable style={styles.iconCircle}>
-                <Icon name="heart" size={18} color={colors.ink} />
+              <Pressable style={styles.iconCircle} onPress={toggleFavorite} disabled={favPending}>
+                <Icon name="heart" size={18} color={isFavorite ? colors.violet2 : colors.ink} />
               </Pressable>
               <Pressable
                 style={styles.iconCircle}
-                onPress={() => router.push('/report' as any)}
+                onPress={() => router.push(`/report?praticienId=${id}` as any)}
               >
                 <Icon name="flag" size={16} color={colors.ink} />
               </Pressable>
```

No login gate is added here (unlike web's `FavoriteButton`) — mobile's navigation funnels every user through onboarding/auth before they ever reach the tab stack this screen lives in, so there's no realistic anonymous-visitor path to guard against the way there is on web's always-public praticien route.

- [ ] **Step 3: Real review count in the tab label and the floating stat strip**

```diff
           <TabButton
-            label={`Avis (${p.reviews})`}
+            label={`Avis (${reviewCount})`}
             active={tab === 'reviews'}
             onPress={() => setTab('reviews')}
           />
```

```diff
           <View style={styles.fcStrip}>
-            <Rating value={p.rating} count={p.reviews} />
+            <Rating value={avgNote} count={reviewCount} />
```

- [ ] **Step 4: Real reviews tab — real fields, real "Laisser un avis" entry point, drop the dead "Voir les N avis" button**

```diff
         ) : tab === 'reviews' ? (
           <View style={{ padding: 24 }}>
-            {reviews.map((r) => (
-              <View key={r.id} style={styles.review}>
-                <View style={styles.reviewHead}>
-                  <Avatar gradient={[colors.sky, colors.violet]} size="sm" />
-                  <View style={{ flex: 1 }}>
-                    <Text style={styles.reviewName}>{r.authorInitial}</Text>
-                    <Text style={styles.reviewMeta}>
-                      {r.whenLabel} · {r.modeLabel}
-                    </Text>
-                  </View>
-                  <Rating value={r.rating} showCount={false} size={12} />
-                </View>
-                <Text style={styles.reviewText}>"{r.text}"</Text>
-              </View>
-            ))}
-            <View style={{ height: 12 }} />
-            <Button label={`Voir les ${p.reviews} avis`} variant="soft" />
+            <Button
+              label="Laisser un avis"
+              variant="soft"
+              onPress={() => router.push(`/review?praticienId=${id}` as any)}
+              style={{ marginBottom: 16 }}
+            />
+            {reviews.length === 0 ? (
+              <Text style={typography.small}>Aucun avis publié pour l'instant.</Text>
+            ) : (
+              reviews.map((r) => (
+                <View key={r.id} style={styles.review}>
+                  <View style={styles.reviewHead}>
+                    <Avatar gradient={[colors.sky, colors.violet]} size="sm" />
+                    <View style={{ flex: 1 }}>
+                      <Text style={styles.reviewName}>{r.full_name_author}</Text>
+                      <Text style={styles.reviewMeta}>{formatReviewDate(r.date_ajout)}</Text>
+                    </View>
+                    <Rating value={r.note} showCount={false} size={12} />
+                  </View>
+                  <Text style={styles.reviewText}>"{r.avis}"</Text>
+                </View>
+              ))
+            )}
           </View>
         ) : (
```

The old fields (`authorInitial`/`whenLabel`/`modeLabel`/`rating`/`text`) were the mock `Review` shape; the real `Avis` row has no séance-mode field at all (same fact Task 11 already used to drop `mode` from web's `review` modal preset), so `modeLabel` has nothing to map to and is simply gone, not replaced. `styles.review`/`.reviewHead`/`.reviewName`/`.reviewMeta`/`.reviewText` are all still used exactly as before — no style block changes.

- [ ] **Step 5: Verify types compile**

Run (in `mobile/`): `npm run typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add mobile/app/praticien/\[id\].tsx
git commit -m "feat(mobile): wire praticien detail favorite heart and reviews tab to the real API"
```

---

## Task 17: Mobile — register `favorites` and `notification-settings` routes

**Files:**
- Modify: `mobile/app/_layout.tsx`

- [ ] **Step 1: Add the two Stack.Screen entries**

Following the file's existing "plain, no-special-options" pattern (same one Plan 02's Task 14 used for `cercles/index`/`blog/index`) — both new screens are plain pushes, not modals, so they need no `options`:

```diff
             <Stack.Screen name="review" options={{ presentation: 'modal' }} />
             <Stack.Screen name="report" options={{ presentation: 'modal' }} />
+            <Stack.Screen name="favorites" />
+            <Stack.Screen name="notification-settings" />
             <Stack.Screen name="founder" />
             <Stack.Screen name="dashboard" />
             <Stack.Screen name="subscription" />
```

- [ ] **Step 2: Verify types compile**

Run (in `mobile/`): `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Run the full mobile test suite to check for regressions**

Run (in `mobile/`): `npm test`
Expected: PASS (all suites, including `src/data/repos/index.test.ts` and `src/data/api/client.test.ts`, both unaffected by this plan's purely-additive repo/type changes).

- [ ] **Step 4: Commit**

```bash
git add mobile/app/_layout.tsx
git commit -m "feat(mobile): register favorites and notification-settings routes"
```

---

Mobile is done. Both platforms now have every surface listed in this plan's File Structure table wired to the eight new/existing endpoints — nothing left importing mock review/report/favorite/notification data.

---

## Self-review

**1. Spec coverage.** Walking the brief section by section:
- *Four backend modules on the exact given schema:* `avis` (Task 2, pre-existing) and `signalements` (Task 3) built on their already-real tables with the two spec-mandated deviations honored precisely — `signalements` gets `JwtAuthGuard` only (no `ClientGuard`, no `clients` row requirement, `signale_par_id: user.id`), no soft-delete anywhere on it. `favorites` and `notification_preferences` (Task 1, pre-existing migration + Tasks 4–5) match the given `CREATE TABLE` SQL exactly, including `favorites` having no `updated_at` and `notification_preferences.client_id` being `UNIQUE`. Covered.
- *Route shapes:* every controller uses the bare-`@Controller()` + full-per-method-path deviation this plan's own intro already locks in, verified per module — `/api/signalements` + `/api/admin/signalements/*`, `/api/client/favorites/*`, `/api/client/notification-preferences`. Covered.
- *Favorites idempotency + join-backed list:* Task 4's `add()` is check-then-insert (not a caught unique-constraint error, which would behave differently between MySQL and the e2e suite's SQLite driver); `list()` joins the full `praticien` row. Covered.
- *Notification-preferences lazy materialization:* Task 5's `get()` returns the 4 defaults with zero rows written, proven by an explicit `count()` assertion in the e2e spec, not just an equality check on the response body. Covered.
- *The "does `GET /api/client/avis` already exist" investigative step:* resolved explicitly in Task 6 — Task 2's `mine()` service method and `@Get('client/avis')` route already exist and are already e2e-tested, so no new endpoint was added. Reported below.
- *Web surfaces:* `compte/avis` (Task 6), `admin/avis` (Task 7), `compte/parametres` — Notifications section only (Task 8), `compte/favoris` (Task 9), `admin/signalements` (Task 10), praticien detail favorite toggle + reviews tab (Task 11) — all six named in the brief, all covered, all sourced from real endpoints only.
- *Mobile surfaces:* `review.tsx` + call sites (Task 13), `report.tsx` + call sites (Task 14), `profil.tsx`'s two named rows + two new screens (Task 15), `praticien/[id].tsx` favorite heart + reviews tab + entry points (Task 16), `_layout.tsx` registration (Task 17), types + repos (Task 12) — all covered.
- *The two pre-declared scope gaps* (web's "Signaler" modal deferred to Plan 09; `profil.tsx`'s "Laisser un avis" row left paramless) are not just preserved but actively re-verified against the code, not just left as prose: Task 11 confirms `modal="report"` stays untouched on web (with the reasoning restated inline so it isn't mistaken for a miss), and Task 13 confirms `profil.tsx`'s row already does the right paramless thing and needed no edit.
- *Hard project rule (no AI-attribution in commits):* checked below.

**2. Placeholder scan.** Searched the full document for "TBD"/"TODO"/"FIXME"/"add appropriate"/"similar to Task N"/"write tests for the above"/trailing-ellipsis-as-placeholder — the only hits were legitimate `placeholder="…"` JSX props and `searchPlaceholder` prop names, both real UI attributes, not planning stand-ins. Every step that changes code shows either the complete resulting file or a precise, anchored diff hunk (never a description of what to write) — full-file replacements for pages whose JSX changes too pervasively to diff cleanly (all `page.jsx`/`ProfileBody.jsx`/`review.tsx`/`report.tsx`/screen files), targeted before/after hunks for shared, incrementally-owned files where a full rewrite would risk clobbering another plan's territory (`create-test-app.ts`'s `ALL_ENTITIES`, `app.module.ts`'s imports, mobile's `repos/index.ts` and `types.ts`, `registry.jsx`, `profil.tsx`, `praticien/[id].tsx`). Grepped separately for `Co-Authored-By` (and case variants) across the entire document — zero matches across all 17 commit messages, which also confirms the two commits written before this session (Tasks 1–2) already comply with the hard project rule.

**3. Type/signature consistency**, checked pairwise across tasks:
- Backend service method names (`store`/`mine`/`update`/`destroy`/`adminIndex`/`publish`/`reject` for avis; `store`/`adminIndex`/`resolve`/`reject` for signalements; `list`/`add`/`remove` for favorites; `get`/`update` for notification-preferences) match 1:1 across each module's controller (Tasks 2–5), e2e spec (same tasks), and every frontend call site (Tasks 6–17) — no drift between what a route exposes and what a page or repo calls.
- `avisRepo.{forPraticien,create}`, `signalementRepo.create`, `favoriteRepo.{list,add,remove}`, `notificationPreferencesRepo.{get,update}` (Task 12) are called with matching names and argument shapes everywhere they're used (Tasks 13–16) — no call site invokes a method Task 12 doesn't define.
- The `:praticienId` URL param on `DELETE /api/client/favorites/:praticienId` (Task 4) is threaded consistently as *the praticien's id* — never the favorite row's own `id` — through every consumer: web's `FavorisList.jsx` (`p.id` from `mapPraticien`), web's `FavoriteButton.jsx` (`praticienId` prop = `p.id` from `page.jsx`), and mobile's `favoriteRepo.remove(p.id)` (Task 16). Checked explicitly because it would have been an easy place for a silent id/row mismatch.
- The `['avis', id]` react-query key is shared verbatim (string route param `id`, not the numeric `p.id`) between web's `page.jsx` and `ProfileBody.jsx` (Task 11) so both dedupe onto the same cached fetch instead of firing two requests — confirmed both sides use `id`, not a mix of `id` and `p.id`.
- Backend field names are used verbatim on both frontends throughout (`full_name_author`, `date_ajout`, `note`, `avis`, `praticien_id`, `signale_par_id`, `motif`, `priorite`, `rappels_seance`/`nouveaux_messages`/`reponses_avis`/`newsletter`) — no camelCase mapping layer, matching the ground-truth constraint this style of wiring already follows elsewhere in the roadmap (paiements/échanges/remboursements). The one deliberate mapping layer in this plan — `mapPraticien`, reused (not reimplemented) for favorites on both platforms (Task 9 web, Task 12 mobile) — is reused specifically because favorites render through the existing rich `PractitionerCard`/card-grid UI, not because field names needed hiding.
- `FormModal`/`ConfirmModal`'s async `onSubmit`/`onConfirm` contract (Plan 04 Task 1, already merged by the time this plan runs) is relied on by every `modal="form"`/`modal="confirm"` call this plan adds; `registry.jsx`'s `review` preset was re-read immediately before editing it to confirm `{...p}` still spreads last, so `onSubmit` passed through `payload` reaches `FormModal` correctly both where the preset is used as-is (Task 11's create flow) and where it's bypassed entirely in favor of `modal="form"` (Task 6's edit flow, which needs a different title/pre-filled values the preset doesn't offer).
- Mobile's new `review.tsx`/`report.tsx` both guard on a missing `praticienId` with the same shape of empty state (`ScreenHeader` + centered `Lotus` + title + body), and both disable their submit button while `submitting` — kept deliberately parallel since they're the same kind of screen.

No gaps found; nothing required fixing after this pass — each design decision (query-key sharing, the `:praticienId` threading, the `review` preset edit, the `avis`-has-no-`mode` drops on both platforms) was resolved once, while writing the relevant task, and then reused identically everywhere else it recurred, rather than being re-decided inconsistently task to task.

**One deliberate addition beyond the original File Structure table:** `web/components/modals/registry.jsx` gets a one-line edit (Task 11, dropping the `review` preset's mismatched `mode` field) that the table didn't originally list. Called out here explicitly rather than silently expanding scope — it's a one-line, well-justified fix directly required to make the preset honest about what the backend actually stores, not unrelated scope creep.

## Exit criteria

A logged-in client can, on both web and mobile: leave a review on a praticien (moderated into `en_attente`, edit/delete it while still pending, see it disappear from those actions once an admin publishes or rejects it); report a praticien profile with a real reason and see it land in the admin queue; favorite and unfavorite praticiens from their profile and see the same list in `compte/favoris` (web) / `favorites.tsx` (mobile); and toggle any of the 4 real notification preferences, persisted server-side with lazy materialization (no row exists until the first change). An admin can, on web: moderate avis (publish/reject) and signalements (resolve/reject) against live data, both tables now showing real statuses instead of a fictional "flagged" bucket. All four backend modules are e2e-tested (29 tests total across `avis.e2e-spec.ts`, `signalements.e2e-spec.ts`, `favorites.e2e-spec.ts`, `notification-preferences.e2e-spec.ts`) and registered in `app.module.ts`; no page or screen in either frontend still imports mock review/report/favorite/notification data. This is what the master roadmap's one-line summary for Plan 07 means by "these four features are real end-to-end."

**Next:** Plan 09 (Polish) — already written, and deliberately sequenced to run last precisely so its dead-row inventory reflects what Plans 03/04/06/07 actually left behind rather than what was dead before any of them ran. It does not depend on this plan's code directly (no shared files), only on the ordering.

**This plan was the last one still under active construction.** With it complete, every plan document the master roadmap calls for is now written: Plans 01–07 and 09 (Plan 09 was already finished in an earlier pass). **Plan 08 remains deliberately unwritten** — deferred indefinitely per the roadmap's 2026-07-13 decision (messaging/chat, subscriptions, disputes, granular roles, audit log, analytics aggregation, and OAuth/third-party integrations: seven speculative subsystems with no validated product requirement, to be revisited only once the core product built by Plans 01–07/09 is actually live). Writing this document doesn't execute any of it — every task above still needs to be run, task-by-task, through `superpowers:subagent-driven-development` or `superpowers:executing-plans`, exactly like every other plan in this roadmap.
