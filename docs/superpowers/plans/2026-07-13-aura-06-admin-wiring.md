# Aura Plan 06 — Admin Auth + Guard Hardening + Admin Wiring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harden every unguarded admin-CRUD backend controller, build a real login gate for `web/admin/*`, and wire every admin CRUD screen that has a working backend to that backend — replacing 100% of the admin panel's mock data and fake toasts with live calls.

**Architecture:** Backend: add `@UseGuards(JwtAuthGuard, AdminGuard)` to every admin route that is currently reachable with zero auth. Two shapes: (1) controllers that are **admin-only with no public consumer** (`EmailTemplatesController`, `NotificationsController`, `PromotionsController`, `ClientsController`) get the guard at **class level**, mirroring `PraticienVerificationController`. (2) Controllers with a **genuine mixed public/admin or client/admin split in one class** get the guard at **method level** only on the write/admin routes — this includes not just the echanges/paiements/remboursements admin halves the brief calls out, but also `ArticlesController`, `CerclesController`, `DisciplinesController`, and `EventsController`, whose `index`/`show` GET routes are the *same* routes Plan 02 wires for anonymous public reads (confirmed by this plan's own dependency note: "Plan 02 already made web-reachable for reads"). Class-level-guarding those four would 401 every public visitor — see the "Guard-scope correction" callout in Task 1 for the full reasoning; this is a deliberate, justified deviation from a literal reading of the brief's "Fix:" paragraph, not a re-derivation of the (unchanged) ground-truth guard-status table. One new backend surface is added (the only one this plan permits): a guarded file-streaming route for praticien verification documents, reusing `PraticienVerificationController`'s existing class-level guard rather than an unauthenticated `express.static` mount, since these are personal ID/insurance documents.

Web: a new `web/lib/admin-auth-store.js` (Zustand + persist + localStorage), a real `/admin/connexion` login page, and a client-side `AdminAuthGate` wrapping `web/app/admin/layout.jsx`. Every admin screen backed by a real endpoint is converted from a static/mock-data page to a `'use client'` component using `@tanstack/react-query` against `web/lib/api.js` (the Plan 01 client). Server-component detail pages that used `generateStaticParams` (`evenement/[id]`, `cercle/[id]`, `client/[id]`) are converted to client components using `useParams()`, because `generateStaticParams` requires enumerating all IDs at build time, which is incompatible with dynamic, database-backed content — this matches the architecture Plan 01 already established (client-side fetch + react-query, not server-side data fetching) and gives every admin page a working, guarded, bearer-token-authenticated path to the backend. Every fake/derived field with no backend source (cercle members/feed, event attendees **and** event program-steps, notification send-log, client status/bookings/spent, praticien rating/earnings/online) is removed rather than left wired to a fabricated value, per fixed decision #3 — several of these (event program-steps, client fields, praticien fields, promotions/remboursements/paiements stub fields) were found during this plan's own file-by-file research and are called out explicitly where they go beyond what the brief named directly.

**Tech Stack:** NestJS 11 + TypeORM + better-sqlite3 (e2e, existing harness) · Next.js 15 (React 19, plain JSX) + `@tanstack/react-query` + Vitest (existing harness, both from Plan 01).

**Depends on:** Plan 01 (foundation — api client, react-query provider, both already merged to `main`) and Plan 02 (public reads — disciplines/events/articles/cercles `index`/`show` become web-reachable for anonymous visitors; this plan's backend task must not break that). **Plan 03** (client auth, `web/lib/auth-store.js`) has **not** been written yet as of this plan — `web/lib/admin-auth-store.js` (Task 13) is built standalone here, following the shape described in the roadmap for Plan 03's future client store (Zustand + persist + localStorage + `setAuthToken` + `onRehydrateStorage`, mirroring `mobile/src/store/session.ts`'s already-merged token-sync pattern exactly). When Plan 03 is eventually written, it should mirror `admin-auth-store.js`, not the other way around.

**Reference:** [master roadmap](2026-07-13-aura-master-roadmap.md) · [Plan 01](2026-07-13-aura-01-foundation.md) · [checklist](../../frontend-functionality-checklist.md)

**Run each `npm` command from the relevant package dir** (`server/`, `web/`), not the repo root.

---

## File structure

| File | Responsibility |
|---|---|
| `server/src/articles/articles.controller.ts` (modify) | Guard `store`/`update`/`publish`/`archive`/`destroy` only (method-level) |
| `server/src/cercles/cercles.controller.ts` (modify) | Guard `store`/`update`/`destroy` only (method-level) |
| `server/src/disciplines/disciplines.controller.ts` (modify) | Guard `store`/`update`/`destroy` only (method-level) |
| `server/src/events/events.controller.ts` (modify) | Guard `store`/`update`/`destroy` only (method-level) |
| `server/src/email-templates/email-templates.controller.ts` (modify) | Class-level guard (no public consumer) |
| `server/src/notifications/notifications.controller.ts` (modify) | Class-level guard (no public consumer) |
| `server/src/promotions/promotions.controller.ts` (modify) | Class-level guard (no public consumer) |
| `server/src/clients/clients.controller.ts` (modify) | Class-level guard (no public consumer) |
| `server/src/echanges/echanges.controller.ts` (modify) | Method-level guard on the 8 admin-half routes; client-half untouched |
| `server/src/paiements/paiements.controller.ts` (modify) | Method-level guard on the 5 admin-half routes; client-half untouched |
| `server/src/remboursements/remboursements.controller.ts` (modify) | Method-level guard on the 7 admin-half routes; client-half untouched |
| `server/src/common/storage.service.ts` (modify) | Add `resolve()` to turn a stored `chemin` into an absolute path |
| `server/src/auth/praticien-verification/praticien-verification.{controller,service,module}.ts` (modify) | New guarded `GET .../documents/:docId/file` streaming route |
| `server/test/*.e2e-spec.ts` (modify, one per guarded controller) | TDD: add "requires admin auth" test + attach admin token to existing admin/write calls |
| `server/test/clients.e2e-spec.ts` (create) | No prior test file existed for `ClientsController` |
| `web/lib/admin-auth-store.js` (create) | Admin identity store — separate token slot from the future client store |
| `web/lib/admin-auth-store.test.js` (create) | Vitest unit tests for the store |
| `web/lib/api.js` (modify) | Add `apiFetchBlob()` for authenticated binary downloads |
| `web/lib/api.test.js` (modify) | Vitest test for `apiFetchBlob` |
| `web/app/admin/connexion/page.jsx` (create) | Real admin login form |
| `web/components/admin/AdminAuthGate.jsx` (create) | Owns the auth redirect **and** the admin shell (sidebar/topbar) — see Task 14's design note for why both live here |
| `web/app/admin/layout.jsx` (modify) | Reduced to a one-line delegate to `<AdminAuthGate>` |
| `web/components/layout/AdminTopbar.jsx` (modify) | Real signed-in admin name + a working sign-out control |
| `web/app/admin/disciplines/page.jsx` (modify) | Wire to `/disciplines` CRUD |
| `web/app/admin/evenements/page.jsx`, `evenement/nouveau/page.jsx`, `evenement/[id]/page.jsx` (modify) | Wire to `/events` CRUD; drop fake attendees + fake program; no publish action exists backend-side |
| `web/app/admin/contenu/page.jsx`, `contenu/nouveau/page.jsx` (modify) | Wire to `/articles` CRUD + publish/archive |
| `web/app/admin/cercles/page.jsx`, `cercle/[id]/page.jsx` (modify) | Wire to `/cercles` CRUD; drop fake members/feed/status |
| `web/app/admin/praticiens/page.jsx` (modify) | Wire to `/praticiens` read; drop fake rating/earnings/online |
| `web/app/admin/praticiens/verification/page.jsx` (modify) | Wire to real verification endpoints + document viewer |
| `web/app/admin/paiements/page.jsx`, `paiement/[id]/page.jsx` (modify) | Wire to `/paiements` admin read; remove non-functional refund action, link to remboursements instead |
| `web/app/admin/remboursements/page.jsx` (modify) | Wire to `/remboursements/admin` + approve/refuse/complete; real `taux_remboursement` |
| `web/app/admin/echanges/page.jsx` (modify), `echange/[id]/page.jsx` (create) | Wire to `/echanges` admin CRUD; new detail page (previously a dead link) |
| `web/app/admin/notifications/page.jsx` (modify) | Wire to `/notifications`; drop fake send-log and fake system-alerts panel |
| `web/app/admin/emails/page.jsx` (modify) | Wire to `/emails` CRUD with real 3-value `statut` |
| `web/app/admin/promotions/page.jsx` (modify) | Wire to `/promotions` CRUD (no status editor — not in the DTO) |
| `web/app/admin/clients/page.jsx`, `client/[id]/page.jsx` (modify) | Wire list; remove unsupported detail actions; real per-client payments via `?client_id=` |
| `web/app/admin/equipe/page.jsx` (modify) | Wire to `/admin/list` + deactivate/delete + register-as-add-admin; no reachable `activate` target |

---

## Task 1: Backend guard — `ArticlesController` (writes only)

> **Guard-scope correction (read before starting):** the brief's "Fix:" paragraph lists `ArticlesController` for a **class-level** guard alongside `EmailTemplatesController`/`NotificationsController`/etc. That would also guard `index`/`show` — the exact GET routes Plan 02 wires for anonymous public article browsing (`web/app/(site)/blog/*`). Guarding those would break Plan 02. This plan instead guards **only the write routes** (`store`, `publish`, `archive`, `update`, `destroy`) at **method level**, leaving `index`/`show` public — consistent with this plan's own dependency note that Plan 02 "already made web-reachable for reads." The ground-truth guard-status table itself (which only asserts *current* state, "fully unguarded") is unchanged and not re-derived; only the *fix strategy* for these four read+write-shared controllers is corrected here and applied identically in Tasks 2–4.

**Files:**
- Modify: `server/src/articles/articles.controller.ts`
- Test: `server/test/articles.e2e-spec.ts`

- [ ] **Step 1: Update the e2e spec to require admin auth on writes**

Replace `server/test/articles.e2e-spec.ts` in full:

```typescript
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, seedAdmin, seedClientUser } from './utils/create-test-app';
import { ArticlesModule } from '../src/articles/articles.module';

const base = {
  titre: 'Mon Article Zen', categorie: 'bien-etre', tonalite: 'calme',
  extrait: 'extrait', corps: 'corps long', status: 'brouillon',
  auteur: 'Alice', temps_lecture: 4,
};

describe('articles', () => {
  let app: INestApplication;
  let adminToken: string;
  beforeAll(async () => {
    app = await createTestApp({ imports: [ArticlesModule] });
    adminToken = (await seedAdmin(app, 'articles-admin@aura.io')).token;
  });
  afterAll(async () => { await app.close(); });
  const http = () => request(app.getHttpServer());
  const asAdmin = (r: request.Test) => r.set('Authorization', `Bearer ${adminToken}`);

  it('write routes require admin auth; reads stay public', async () => {
    await http().post('/api/articles/create-article').send(base).expect(401);
    const client = await seedClientUser(app, 'articles-reader@aura.io');
    await http().post('/api/articles/create-article')
      .set('Authorization', `Bearer ${client.token}`).send(base).expect(403);
    await http().get('/api/articles').expect(200);
  });

  it('store slugifies titre and suffixes duplicates', async () => {
    const a = await asAdmin(http().post('/api/articles/create-article')).send(base).expect(201);
    expect(a.body.data.slug).toBe('mon-article-zen');
    const b = await asAdmin(http().post('/api/articles/create-article')).send(base).expect(201);
    expect(b.body.data.slug).toMatch(/^mon-article-zen-/);
    const bad = await asAdmin(http().post('/api/articles/create-article'))
      .send({ ...base, status: 'invalide' }).expect(422);
    expect(bad.body.errors.status).toBeDefined();
  });

  it('index filters by status and categorie (public, no auth required)', async () => {
    await asAdmin(http().post('/api/articles/create-article'))
      .send({ ...base, titre: 'Autre', status: 'en_revue', categorie: 'sante' }).expect(201);
    const res = await http().get('/api/articles?status=en_revue&categorie=sante').expect(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.pagination).toHaveProperty('next_page_url');
  });

  it('update regenerates slug on titre change; publish/archive transitions', async () => {
    const created = await asAdmin(http().post('/api/articles/create-article'))
      .send({ ...base, titre: 'Titre Original' }).expect(201);
    const id = created.body.data.id;

    const upd = await asAdmin(http().put(`/api/articles/${id}`)).send({ titre: 'Titre Modifié' }).expect(200);
    expect(upd.body.data.slug).toBe('titre-modifie');

    const pub = await asAdmin(http().put(`/api/articles/${id}/publish`)).expect(200);
    expect(pub.body.message).toBe('Article publié avec succès');
    expect(pub.body.data.status).toBe('publié');
    expect(pub.body.data.date_publication).toBeTruthy();

    const arc = await asAdmin(http().put(`/api/articles/${id}/archive`)).expect(200);
    expect(arc.body.data.status).toBe('archivé');

    await asAdmin(http().delete(`/api/articles/${id}`)).expect(200);
    const nf = await http().get(`/api/articles/${id}`).expect(404);
    expect(nf.body.message).toBe('Article non trouvé');
  });
});
```

- [ ] **Step 2: Run to verify the new test fails**

Run: `npm run test:e2e -- articles.e2e-spec.ts`
Expected: FAIL — `write routes require admin auth; reads stay public` fails (`POST .../create-article` returns 201, not 401 — no guard yet).

- [ ] **Step 3: Add method-level guards to the write routes**

Replace `server/src/articles/articles.controller.ts` in full:

```typescript
import {
  Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query, Req, UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { ArticlesService } from './articles.service';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

@Controller('articles')
export class ArticlesController {
  constructor(private readonly service: ArticlesService) {}

  @Get()
  index(@Query() query: Record<string, any>, @Req() req: Request) {
    return this.service.index(query, req);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post('create-article')
  store(@Body() dto: CreateArticleDto) { return this.service.store(dto); }

  @Get(':id')
  show(@Param('id', ParseIntPipe) id: number) { return this.service.show(id); }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Put(':id/publish')
  publish(@Param('id', ParseIntPipe) id: number) { return this.service.publish(id); }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Put(':id/archive')
  archive(@Param('id', ParseIntPipe) id: number) { return this.service.archive(id); }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateArticleDto) {
    return this.service.update(id, dto);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Delete(':id')
  destroy(@Param('id', ParseIntPipe) id: number) { return this.service.destroy(id); }
}
```

- [ ] **Step 4: Run to verify all tests pass**

Run: `npm run test:e2e -- articles.e2e-spec.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add server/src/articles/articles.controller.ts server/test/articles.e2e-spec.ts
git commit -m "feat(server): guard articles write routes with AdminGuard, keep reads public"
```

---

## Task 2: Backend guard — `CerclesController` (writes only)

**Files:**
- Modify: `server/src/cercles/cercles.controller.ts`
- Test: `server/test/cercles.e2e-spec.ts`

- [ ] **Step 1: Update the e2e spec**

Replace `server/test/cercles.e2e-spec.ts` in full:

```typescript
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, seedAdmin, seedClientUser } from './utils/create-test-app';
import { CerclesModule } from '../src/cercles/cercles.module';

describe('cercles', () => {
  let app: INestApplication;
  let adminToken: string;
  beforeAll(async () => {
    app = await createTestApp({ imports: [CerclesModule] });
    adminToken = (await seedAdmin(app, 'cercles-admin@aura.io')).token;
  });
  afterAll(async () => { await app.close(); });
  const http = () => request(app.getHttpServer());
  const asAdmin = (r: request.Test) => r.set('Authorization', `Bearer ${adminToken}`);

  it('write routes require admin auth; reads stay public', async () => {
    await http().post('/api/cercles').send({ nom: 'Sans Token' }).expect(401);
    const client = await seedClientUser(app, 'cercles-reader@aura.io');
    await http().post('/api/cercles')
      .set('Authorization', `Bearer ${client.token}`).send({ nom: 'Avec Client' }).expect(403);
    await http().get('/api/cercles').expect(200);
  });

  it('POST / creates; duplicate nom → 422; bad color → 422', async () => {
    const res = await asAdmin(http().post('/api/cercles'))
      .send({ nom: 'Zen', description: 'd', color: '#AABBCC', animateur: 'Ana' }).expect(201);
    expect(res.body.message).toBe('Cercle créé avec succès');
    const dup = await asAdmin(http().post('/api/cercles')).send({ nom: 'Zen' }).expect(422);
    expect(dup.body.errors.nom).toBeDefined();
    const bad = await asAdmin(http().post('/api/cercles')).send({ nom: 'Autre', color: 'red' }).expect(422);
    expect(bad.body.errors.color).toBeDefined();
  });

  it('GET / paginates with URLs (public, no auth required)', async () => {
    const res = await http().get('/api/cercles?per_page=1').expect(200);
    expect(res.body.pagination).toMatchObject({ current_page: 1, per_page: 1 });
    expect(res.body.pagination).toHaveProperty('next_page_url');
    expect(res.body.pagination).toHaveProperty('prev_page_url');
  });

  it('GET/PUT/DELETE /:id with 404 envelopes', async () => {
    const created = await asAdmin(http().post('/api/cercles')).send({ nom: 'Flow' }).expect(201);
    const id = created.body.data.id;
    await http().get(`/api/cercles/${id}`).expect(200);
    const upd = await asAdmin(http().put(`/api/cercles/${id}`)).send({ nom: 'Flow 2' }).expect(200);
    expect(upd.body.message).toBe('Cercle mis à jour avec succès');
    await asAdmin(http().put(`/api/cercles/${id}`)).send({ nom: 'Flow 2' }).expect(200);
    const clash = await asAdmin(http().put(`/api/cercles/${id}`)).send({ nom: 'Zen' }).expect(422);
    expect(clash.body.errors.nom).toBeDefined();
    await asAdmin(http().delete(`/api/cercles/${id}`)).expect(200);
    const nf = await http().get(`/api/cercles/${id}`).expect(404);
    expect(nf.body).toEqual({ status: 'error', message: 'Cercle non trouvé' });
  });
});
```

- [ ] **Step 2: Run to verify the new test fails**

Run: `npm run test:e2e -- cercles.e2e-spec.ts`
Expected: FAIL — write-guard test fails (POST returns 201 without a token).

- [ ] **Step 3: Add method-level guards**

Replace `server/src/cercles/cercles.controller.ts` in full:

```typescript
import {
  Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query, Req, UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { CerclesService } from './cercles.service';
import { CreateCercleDto } from './dto/create-cercle.dto';
import { UpdateCercleDto } from './dto/update-cercle.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

@Controller('cercles')
export class CerclesController {
  constructor(private readonly service: CerclesService) {}

  @Get()
  index(@Query() query: Record<string, any>, @Req() req: Request) {
    return this.service.index(query, req);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post()
  store(@Body() dto: CreateCercleDto) {
    return this.service.store(dto);
  }

  @Get(':id')
  show(@Param('id', ParseIntPipe) id: number) {
    return this.service.show(id);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCercleDto) {
    return this.service.update(id, dto);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Delete(':id')
  destroy(@Param('id', ParseIntPipe) id: number) {
    return this.service.destroy(id);
  }
}
```

- [ ] **Step 4: Run to verify all tests pass**

Run: `npm run test:e2e -- cercles.e2e-spec.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add server/src/cercles/cercles.controller.ts server/test/cercles.e2e-spec.ts
git commit -m "feat(server): guard cercles write routes with AdminGuard, keep reads public"
```

---

## Task 3: Backend guard — `DisciplinesController` (writes only)

**Files:**
- Modify: `server/src/disciplines/disciplines.controller.ts`
- Test: `server/test/disciplines.e2e-spec.ts`

- [ ] **Step 1: Update the e2e spec**

Replace `server/test/disciplines.e2e-spec.ts` in full:

```typescript
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, seedAdmin, seedClientUser } from './utils/create-test-app';
import { DisciplinesModule } from '../src/disciplines/disciplines.module';

describe('disciplines', () => {
  let app: INestApplication;
  let adminToken: string;
  beforeAll(async () => {
    app = await createTestApp({ imports: [DisciplinesModule] });
    adminToken = (await seedAdmin(app, 'disciplines-admin@aura.io')).token;
  });
  afterAll(async () => { await app.close(); });
  const http = () => request(app.getHttpServer());
  const asAdmin = (r: request.Test) => r.set('Authorization', `Bearer ${adminToken}`);

  it('write routes require admin auth; reads stay public', async () => {
    await http().post('/api/disciplines/create-discipline')
      .send({ nom: 'Sans Token', tonalite: 't', glyphe: 'g', accroche: 'a' }).expect(401);
    const client = await seedClientUser(app, 'disciplines-reader@aura.io');
    await http().post('/api/disciplines/create-discipline')
      .set('Authorization', `Bearer ${client.token}`)
      .send({ nom: 'Avec Client', tonalite: 't', glyphe: 'g', accroche: 'a' }).expect(403);
    await http().get('/api/disciplines').expect(200);
  });

  it('POST /create-discipline slugifies nom (accents stripped)', async () => {
    const res = await asAdmin(http().post('/api/disciplines/create-discipline'))
      .send({ nom: 'Méditation Guidée', tonalite: 'calme', glyphe: 'G', accroche: 'a' })
      .expect(201);
    expect(res.body.data.slug).toBe('meditation-guidee');
    expect(res.body.message).toBe('Discipline créée avec succès');
    const dup = await asAdmin(http().post('/api/disciplines/create-discipline'))
      .send({ nom: 'Méditation Guidée', tonalite: 't', glyphe: 'g', accroche: 'a' }).expect(422);
    expect(dup.body.errors.nom).toBeDefined();
  });

  it('index returns all without pagination envelope (public, no auth required)', async () => {
    const res = await http().get('/api/disciplines').expect(200);
    expect(res.body.message).toBe('Disciplines récupérées avec succès');
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.pagination).toBeUndefined();
  });

  it('update regenerates slug when nom changes; 404 envelope', async () => {
    const created = await asAdmin(http().post('/api/disciplines/create-discipline'))
      .send({ nom: 'Yoga', tonalite: 't', glyphe: 'g', accroche: 'a' }).expect(201);
    const id = created.body.data.id;
    const upd = await asAdmin(http().put(`/api/disciplines/${id}`)).send({ nom: 'Yoga Doux' }).expect(200);
    expect(upd.body.data.slug).toBe('yoga-doux');
    await asAdmin(http().delete(`/api/disciplines/${id}`)).expect(200);
    const nf = await asAdmin(http().put(`/api/disciplines/${id}`)).send({ nom: 'X' }).expect(404);
    expect(nf.body.message).toBe('Discipline non trouvée');
  });
});
```

- [ ] **Step 2: Run to verify the new test fails**

Run: `npm run test:e2e -- disciplines.e2e-spec.ts`
Expected: FAIL — write-guard test fails (POST returns 201 without a token).

- [ ] **Step 3: Add method-level guards**

Replace `server/src/disciplines/disciplines.controller.ts` in full:

```typescript
import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, UseGuards } from '@nestjs/common';
import { DisciplinesService } from './disciplines.service';
import { CreateDisciplineDto } from './dto/create-discipline.dto';
import { UpdateDisciplineDto } from './dto/update-discipline.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

@Controller('disciplines')
export class DisciplinesController {
  constructor(private readonly service: DisciplinesService) {}

  @Get()
  index() { return this.service.index(); }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post('create-discipline')
  store(@Body() dto: CreateDisciplineDto) { return this.service.store(dto); }

  @Get(':id')
  show(@Param('id', ParseIntPipe) id: number) { return this.service.show(id); }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateDisciplineDto) {
    return this.service.update(id, dto);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Delete(':id')
  destroy(@Param('id', ParseIntPipe) id: number) { return this.service.destroy(id); }
}
```

- [ ] **Step 4: Run to verify all tests pass**

Run: `npm run test:e2e -- disciplines.e2e-spec.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add server/src/disciplines/disciplines.controller.ts server/test/disciplines.e2e-spec.ts
git commit -m "feat(server): guard disciplines write routes with AdminGuard, keep reads public"
```

---

## Task 4: Backend guard — `EventsController` (writes only)

**Files:**
- Modify: `server/src/events/events.controller.ts`
- Test: `server/test/events.e2e-spec.ts`

- [ ] **Step 1: Update the e2e spec**

Replace `server/test/events.e2e-spec.ts` in full:

```typescript
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { createTestApp, seedAdmin, seedClientUser } from './utils/create-test-app';
import { EventsModule } from '../src/events/events.module';
import { Praticien } from '../src/database/entities/praticien.entity';

describe('events', () => {
  let app: INestApplication;
  let praticienId: number;
  let adminToken: string;
  beforeAll(async () => {
    app = await createTestApp({ imports: [EventsModule] });
    const ds = app.get(DataSource);
    praticienId = (await ds.getRepository(Praticien).save({
      firstname: 'A', lastname: 'B', email: 'anim@aura.io', telephone: '06', ville: 'Paris',
      niveau: 'expert', specialite: 'yoga', mode: 'presentiel', status: 'actif',
      tarif: 50, experience: 3, bio: 'b'.repeat(60),
    })).id;
    adminToken = (await seedAdmin(app, 'events-admin@aura.io')).token;
  });
  afterAll(async () => { await app.close(); });
  const http = () => request(app.getHttpServer());
  const asAdmin = (r: request.Test) => r.set('Authorization', `Bearer ${adminToken}`);

  const payload = () => ({
    titre: 'Retraite', type: 'atelier', dates: ['2026-08-01', '2026-08-02'],
    lieu: 'Lyon', prix: 120, nombre_places: 20, description: 'desc',
    animateurs: [{ id: praticienId, role: 'chef' }],
  });

  it('write routes require admin auth; reads stay public', async () => {
    await http().post('/api/events/create-event').send(payload()).expect(401);
    const client = await seedClientUser(app, 'events-reader@aura.io');
    await http().post('/api/events/create-event')
      .set('Authorization', `Bearer ${client.token}`).send(payload()).expect(403);
    await http().get('/api/events').expect(200);
  });

  it('POST /create-event stores event, attaches animateurs with pivot', async () => {
    const res = await asAdmin(http().post('/api/events/create-event')).send(payload()).expect(201);
    expect(res.body.data.status).toBe('brouillon');
    expect(res.body.data.dates).toEqual(['2026-08-01', '2026-08-02']);
    expect(res.body.data.animateurs).toHaveLength(1);
    expect(res.body.data.animateurs[0].pivot).toMatchObject({ role: 'chef' });
  });

  it('store 422 on unknown animateur id', async () => {
    const res = await asAdmin(http().post('/api/events/create-event'))
      .send({ ...payload(), animateurs: [{ id: 99999 }] }).expect(422);
    expect(res.body.errors['animateurs.0.id']).toBeDefined();
  });

  it('PUT /:id re-syncs animateurs; DELETE detaches then deletes', async () => {
    const created = await asAdmin(http().post('/api/events/create-event')).send(payload()).expect(201);
    const id = created.body.data.id;
    const upd = await asAdmin(http().put(`/api/events/${id}`))
      .send({ titre: 'Retraite 2', animateurs: [{ id: praticienId }] }).expect(200);
    expect(upd.body.message).toBe('Événement mis à jour avec succès');
    expect(upd.body.data.animateurs[0].pivot.role).toBe('animateur');
    await asAdmin(http().delete(`/api/events/${id}`)).expect(200);
    const nf = await http().get(`/api/events/${id}`).expect(404);
    expect(nf.body.message).toBe('Événement non trouvé');
  });

  it('GET / paginates (public, no auth required)', async () => {
    const res = await http().get('/api/events').expect(200);
    expect(res.body.pagination).toHaveProperty('total');
  });
});
```

- [ ] **Step 2: Run to verify the new test fails**

Run: `npm run test:e2e -- events.e2e-spec.ts`
Expected: FAIL — write-guard test fails (POST returns 201 without a token).

- [ ] **Step 3: Add method-level guards**

Replace `server/src/events/events.controller.ts` in full:

```typescript
import {
  Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query, Req, UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

@Controller('events')
export class EventsController {
  constructor(private readonly service: EventsService) {}

  @Get()
  index(@Query() query: Record<string, any>, @Req() req: Request) {
    return this.service.index(query, req);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post('create-event')
  store(@Body() dto: CreateEventDto) { return this.service.store(dto); }

  @Get(':id')
  show(@Param('id', ParseIntPipe) id: number) { return this.service.show(id); }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateEventDto) {
    return this.service.update(id, dto);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Delete(':id')
  destroy(@Param('id', ParseIntPipe) id: number) { return this.service.destroy(id); }
}
```

- [ ] **Step 4: Run to verify all tests pass**

Run: `npm run test:e2e -- events.e2e-spec.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add server/src/events/events.controller.ts server/test/events.e2e-spec.ts
git commit -m "feat(server): guard events write routes with AdminGuard, keep reads public"
```

---

## Task 5: Backend guard — `EmailTemplatesController` (class-level)

`EmailTemplatesController` has no public consumer (no site page ever browses email templates), so — unlike Tasks 1–4 — **every** route (`index`, `show` included) gets guarded here, mirroring `PraticienVerificationController`'s `@UseGuards(...)` placed above `@Controller(...)`.

**Files:**
- Modify: `server/src/email-templates/email-templates.controller.ts`
- Test: `server/test/email-templates.e2e-spec.ts`

- [ ] **Step 1: Update the e2e spec — every route now requires admin auth**

Replace `server/test/email-templates.e2e-spec.ts` in full:

```typescript
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { createTestApp, seedAdmin, seedClientUser } from './utils/create-test-app';
import { EmailTemplatesModule } from '../src/email-templates/email-templates.module';
import { EmailTemplate } from '../src/database/entities/email-template.entity';

describe('email templates', () => {
  let app: INestApplication;
  let adminToken: string;
  beforeAll(async () => {
    app = await createTestApp({ imports: [EmailTemplatesModule] });
    adminToken = (await seedAdmin(app, 'emails-admin@aura.io')).token;
  });
  afterAll(async () => { await app.close(); });
  const http = () => request(app.getHttpServer());
  const asAdmin = (r: request.Test) => r.set('Authorization', `Bearer ${adminToken}`);

  it('every route requires admin auth (no public consumer)', async () => {
    await http().get('/api/emails').expect(401);
    await http().post('/api/emails').send({ nom: 'X', objet: 'o', corps: 'c' }).expect(401);
    const client = await seedClientUser(app, 'emails-reader@aura.io');
    await http().get('/api/emails').set('Authorization', `Bearer ${client.token}`).expect(403);
  });

  it('store extracts variables from corps; unique nom enforced', async () => {
    const res = await asAdmin(http().post('/api/emails')).send({
      nom: 'Bienvenue', objet: 'Salut {{prenom}}',
      corps: 'Bonjour {{prenom}} {{nom}}, bienvenue. {{prenom}}',
    }).expect(201);
    expect(res.body.data.statut).toBe('actif');
    expect(res.body.data.variables).toEqual(['prenom', 'nom']);
    const dup = await asAdmin(http().post('/api/emails'))
      .send({ nom: 'Bienvenue', objet: 'x', corps: 'y' }).expect(422);
    expect(dup.body.errors.nom).toBeDefined();
  });

  it('update re-extracts variables when corps changes', async () => {
    const created = await asAdmin(http().post('/api/emails'))
      .send({ nom: 'Relance', objet: 'o', corps: '{{a}}' }).expect(201);
    const id = created.body.data.id;
    const upd = await asAdmin(http().put(`/api/emails/${id}`)).send({ corps: '{{x}} et {{y}}' }).expect(200);
    expect(upd.body.data.variables).toEqual(['x', 'y']);
  });

  it('index filters statut + search; destroy soft-deletes', async () => {
    const list = await asAdmin(http().get('/api/emails?search=Bienvenue')).expect(200);
    expect(list.body.data).toHaveLength(1);

    const id = list.body.data[0].id;
    await asAdmin(http().delete(`/api/emails/${id}`)).expect(200);
    await asAdmin(http().get(`/api/emails/${id}`)).expect(404);
    // row still exists, soft-deleted
    const ds = app.get(DataSource);
    const raw = await ds.getRepository(EmailTemplate).findOne({ where: { id }, withDeleted: true });
    expect(raw?.deleted_at).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run to verify the new test fails**

Run: `npm run test:e2e -- email-templates.e2e-spec.ts`
Expected: FAIL — `every route requires admin auth` fails (`GET /api/emails` returns 200, not 401 — no guard yet).

- [ ] **Step 3: Add a class-level guard**

Replace `server/src/email-templates/email-templates.controller.ts` in full:

```typescript
import {
  Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query, UseGuards,
} from '@nestjs/common';
import { EmailTemplatesService } from './email-templates.service';
import { CreateEmailTemplateDto } from './dto/create-email-template.dto';
import { UpdateEmailTemplateDto } from './dto/update-email-template.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('emails')
export class EmailTemplatesController {
  constructor(private readonly service: EmailTemplatesService) {}

  @Get()
  index(@Query() query: Record<string, any>) { return this.service.index(query); }

  @Post()
  store(@Body() dto: CreateEmailTemplateDto) { return this.service.store(dto); }

  @Get(':id')
  show(@Param('id', ParseIntPipe) id: number) { return this.service.show(id); }

  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateEmailTemplateDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  destroy(@Param('id', ParseIntPipe) id: number) { return this.service.destroy(id); }
}
```

- [ ] **Step 4: Run to verify all tests pass**

Run: `npm run test:e2e -- email-templates.e2e-spec.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add server/src/email-templates/email-templates.controller.ts server/test/email-templates.e2e-spec.ts
git commit -m "feat(server): guard email templates controller with class-level AdminGuard"
```

---

## Task 6: Backend guard — `NotificationsController` (class-level)

Same shape as Task 5: no public consumer, class-level guard.

**Files:**
- Modify: `server/src/notifications/notifications.controller.ts`
- Test: `server/test/notifications.e2e-spec.ts`

- [ ] **Step 1: Update the e2e spec**

Replace `server/test/notifications.e2e-spec.ts` in full:

```typescript
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, seedAdmin, seedClientUser } from './utils/create-test-app';
import { NotificationsModule } from '../src/notifications/notifications.module';

describe('notifications', () => {
  let app: INestApplication;
  let adminToken: string;
  beforeAll(async () => {
    app = await createTestApp({ imports: [NotificationsModule] });
    adminToken = (await seedAdmin(app, 'notif-admin@aura.io')).token;
  });
  afterAll(async () => { await app.close(); });
  const http = () => request(app.getHttpServer());
  const asAdmin = (r: request.Test) => r.set('Authorization', `Bearer ${adminToken}`);

  it('every route requires admin auth (no public consumer)', async () => {
    await http().get('/api/notifications').expect(401);
    await http().post('/api/notifications')
      .send({ audience: 'clients', canal: 'email', titre: 't', message: 'm' }).expect(401);
    const client = await seedClientUser(app, 'notif-reader@aura.io');
    await http().get('/api/notifications').set('Authorization', `Bearer ${client.token}`).expect(403);
  });

  it('CRUD lifecycle with filters and search', async () => {
    const created = await asAdmin(http().post('/api/notifications')).send({
      audience: 'clients', canal: 'email', titre: 'Promo été', message: 'Contenu promo',
    }).expect(201);
    expect(created.body.message).toBe('Notification créée avec succès');
    const id = created.body.data.id;

    await asAdmin(http().post('/api/notifications')).send({
      audience: 'praticiens', canal: 'sms', titre: 'Rappel', message: 'Autre contenu',
    }).expect(201);

    const filtered = await asAdmin(http().get('/api/notifications?audience=clients')).expect(200);
    expect(filtered.body.data).toHaveLength(1);
    const searched = await asAdmin(http().get('/api/notifications?search=promo')).expect(200);
    expect(searched.body.data).toHaveLength(1);

    const upd = await asAdmin(http().put(`/api/notifications/${id}`)).send({ titre: 'Promo hiver' }).expect(200);
    expect(upd.body.message).toBe('Notification mise à jour avec succès');
    await asAdmin(http().delete(`/api/notifications/${id}`)).expect(200);
    const nf = await asAdmin(http().get(`/api/notifications/${id}`)).expect(404);
    expect(nf.body.message).toBe('Notification non trouvée');
  });

  it('store validates required fields', async () => {
    const res = await asAdmin(http().post('/api/notifications')).send({ audience: 'x' }).expect(422);
    expect(res.body.errors.canal).toBeDefined();
    expect(res.body.errors.titre).toBeDefined();
    expect(res.body.errors.message).toBeDefined();
  });
});
```

- [ ] **Step 2: Run to verify the new test fails**

Run: `npm run test:e2e -- notifications.e2e-spec.ts`
Expected: FAIL — `every route requires admin auth` fails (`GET /api/notifications` returns 200, not 401 — no guard yet).

- [ ] **Step 3: Add a class-level guard**

Replace `server/src/notifications/notifications.controller.ts` in full:

```typescript
import {
  Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query, UseGuards,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Get()
  index(@Query() query: Record<string, any>) { return this.service.index(query); }

  @Post()
  store(@Body() dto: CreateNotificationDto) { return this.service.store(dto); }

  @Get(':id')
  show(@Param('id', ParseIntPipe) id: number) { return this.service.show(id); }

  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateNotificationDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  destroy(@Param('id', ParseIntPipe) id: number) { return this.service.destroy(id); }
}
```

- [ ] **Step 4: Run to verify all tests pass**

Run: `npm run test:e2e -- notifications.e2e-spec.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add server/src/notifications/notifications.controller.ts server/test/notifications.e2e-spec.ts
git commit -m "feat(server): guard notifications controller with class-level AdminGuard"
```

---

## Task 7: Backend guard — `PromotionsController` (class-level)

Same shape again: no public consumer (promo codes are redeemed by code string client-side elsewhere, not browsed via this CRUD controller), class-level guard.

**Files:**
- Modify: `server/src/promotions/promotions.controller.ts`
- Test: `server/test/promotions.e2e-spec.ts`

- [ ] **Step 1: Update the e2e spec**

Replace `server/test/promotions.e2e-spec.ts` in full:

```typescript
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, seedAdmin, seedClientUser } from './utils/create-test-app';
import { PromotionsModule } from '../src/promotions/promotions.module';

const future = () => {
  const d = new Date(); d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
};

const today = () => new Date().toISOString().slice(0, 10);

describe('promotions', () => {
  let app: INestApplication;
  let adminToken: string;
  beforeAll(async () => {
    app = await createTestApp({ imports: [PromotionsModule] });
    adminToken = (await seedAdmin(app, 'promos-admin@aura.io')).token;
  });
  afterAll(async () => { await app.close(); });
  const http = () => request(app.getHttpServer());
  const asAdmin = (r: request.Test) => r.set('Authorization', `Bearer ${adminToken}`);

  it('every route requires admin auth (no public consumer)', async () => {
    await http().get('/api/promotions').expect(401);
    await http().post('/api/promotions')
      .send({ code: 'X', type: 'fixe', valeur: 5, date_expiration: future() }).expect(401);
    const client = await seedClientUser(app, 'promos-reader@aura.io');
    await http().get('/api/promotions').set('Authorization', `Bearer ${client.token}`).expect(403);
  });

  it('POST / validates code unique, type in-list, date after today', async () => {
    await asAdmin(http().post('/api/promotions'))
      .send({ code: 'ETE10', type: 'pourcentage', valeur: 10, date_expiration: future() })
      .expect(201);
    const dup = await asAdmin(http().post('/api/promotions'))
      .send({ code: 'ETE10', type: 'fixe', valeur: 5, date_expiration: future() }).expect(422);
    expect(dup.body.errors.code).toBeDefined();
    const past = await asAdmin(http().post('/api/promotions'))
      .send({ code: 'OLD', type: 'fixe', valeur: 5, date_expiration: '2020-01-01' }).expect(422);
    expect(past.body.errors.date_expiration).toBeDefined();
    const badType = await asAdmin(http().post('/api/promotions'))
      .send({ code: 'X', type: 'autre', valeur: 5, date_expiration: future() }).expect(422);
    expect(badType.body.errors.type).toBeDefined();
  });

  it('POST / rejects date_expiration set to today (must be strictly after today)', async () => {
    const res = await asAdmin(http().post('/api/promotions'))
      .send({ code: 'TODAY1', type: 'fixe', valeur: 5, date_expiration: today() }).expect(422);
    expect(res.body.errors.date_expiration).toBeDefined();
  });

  it('GET/PUT/DELETE lifecycle with French messages', async () => {
    const created = await asAdmin(http().post('/api/promotions'))
      .send({ code: 'NOEL', type: 'fixe', valeur: 15, date_expiration: future() }).expect(201);
    const id = created.body.data.id;
    await asAdmin(http().get(`/api/promotions/${id}`)).expect(200);
    const upd = await asAdmin(http().put(`/api/promotions/${id}`)).send({ valeur: 20 }).expect(200);
    expect(upd.body.message).toBe('Promotion mise à jour avec succès');
    await asAdmin(http().delete(`/api/promotions/${id}`)).expect(200);
    const nf = await asAdmin(http().get(`/api/promotions/${id}`)).expect(404);
    expect(nf.body.message).toBe('Promotion non trouvée');
  });
});
```

- [ ] **Step 2: Run to verify the new test fails**

Run: `npm run test:e2e -- promotions.e2e-spec.ts`
Expected: FAIL — `every route requires admin auth` fails (`GET /api/promotions` returns 200, not 401 — no guard yet).

- [ ] **Step 3: Add a class-level guard**

Replace `server/src/promotions/promotions.controller.ts` in full:

```typescript
import {
  Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query, Req, UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { PromotionsService } from './promotions.service';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('promotions')
export class PromotionsController {
  constructor(private readonly service: PromotionsService) {}

  @Get()
  index(@Query() query: Record<string, any>, @Req() req: Request) {
    return this.service.index(query, req);
  }

  @Post()
  store(@Body() dto: CreatePromotionDto) { return this.service.store(dto); }

  @Get(':id')
  show(@Param('id', ParseIntPipe) id: number) { return this.service.show(id); }

  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdatePromotionDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  destroy(@Param('id', ParseIntPipe) id: number) { return this.service.destroy(id); }
}
```

- [ ] **Step 4: Run to verify all tests pass**

Run: `npm run test:e2e -- promotions.e2e-spec.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add server/src/promotions/promotions.controller.ts server/test/promotions.e2e-spec.ts
git commit -m "feat(server): guard promotions controller with class-level AdminGuard"
```

---

## Task 8: Backend guard — `ClientsController` (class-level, new spec file)

`ClientsController` has a single route (`index`) and no existing e2e spec — create one from scratch.

**Files:**
- Modify: `server/src/clients/clients.controller.ts`
- Test: `server/test/clients.e2e-spec.ts` (new)

- [ ] **Step 1: Write the e2e spec**

Create `server/test/clients.e2e-spec.ts`:

```typescript
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { createTestApp, seedAdmin, seedClientUser } from './utils/create-test-app';
import { ClientsModule } from '../src/clients/clients.module';
import { Client } from '../src/database/entities/client.entity';

describe('clients (admin)', () => {
  let app: INestApplication;
  let adminToken: string;
  beforeAll(async () => {
    app = await createTestApp({ imports: [ClientsModule] });
    adminToken = (await seedAdmin(app, 'clients-admin@aura.io')).token;
    const ds = app.get(DataSource);
    await ds.getRepository(Client).save([
      { firstname: 'Alice', lastname: 'Martin', email: 'alice@aura.io', city: 'Paris' },
      { firstname: 'Bruno', lastname: 'Petit', email: 'bruno@aura.io', city: 'Lyon' },
    ]);
  });
  afterAll(async () => { await app.close(); });
  const http = () => request(app.getHttpServer());
  const asAdmin = (r: request.Test) => r.set('Authorization', `Bearer ${adminToken}`);

  it('requires admin auth', async () => {
    await http().get('/api/clients').expect(401);
    const client = await seedClientUser(app, 'clients-reader@aura.io');
    await http().get('/api/clients').set('Authorization', `Bearer ${client.token}`).expect(403);
  });

  it('lists clients, paginated, with next/prev URLs', async () => {
    const res = await asAdmin(http().get('/api/clients?per_page=1')).expect(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.pagination).toMatchObject({ current_page: 1, per_page: 1 });
    expect(res.body.pagination.total).toBeGreaterThanOrEqual(2);
    expect(res.body.pagination).toHaveProperty('next_page_url');
    expect(res.body.pagination).toHaveProperty('prev_page_url');
  });
});
```

- [ ] **Step 2: Run to verify the new test fails**

Run: `npm run test:e2e -- clients.e2e-spec.ts`
Expected: FAIL — `requires admin auth` fails (`GET /api/clients` returns 200, not 401 — no guard yet).

- [ ] **Step 3: Add a class-level guard**

Replace `server/src/clients/clients.controller.ts` in full:

```typescript
import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { Request } from 'express';
import { Client } from '../database/entities/client.entity';
import { success } from '../common/envelope';
import { parsePagination, paginateQb, paginationUrls } from '../common/pagination';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('clients')
export class ClientsController {
  constructor(@InjectRepository(Client) private readonly clients: Repository<Client>) {}

  @Get()
  async index(@Query() query: Record<string, any>, @Req() req: Request) {
    const { page, perPage } = parsePagination(query, 10);
    const { data, pagination, lastPage } = await paginateQb(
      this.clients.createQueryBuilder('c'), page, perPage,
    );
    return success(data, undefined, {
      pagination: { ...pagination, ...paginationUrls(req, page, lastPage) },
    });
  }
}
```

- [ ] **Step 4: Run to verify all tests pass**

Run: `npm run test:e2e -- clients.e2e-spec.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add server/src/clients/clients.controller.ts server/test/clients.e2e-spec.ts
git commit -m "feat(server): guard clients controller with class-level AdminGuard, add e2e coverage"
```

---

## Task 9: Backend guard — `EchangesController` (8 admin routes, method-level)

`EchangesController` is a genuine mixed controller: `client/echanges*` routes stay `JwtAuthGuard, ClientGuard` (untouched). The 8 admin routes — `adminStatistics`, `adminIndex`, `adminShow`, `adminHide`, `adminReport`, `adminDestroy` (fully unguarded today) plus `adminUpdate`/`adminPatch` (currently `OptionalJwtGuard`, which never rejects an unauthenticated request — it just leaves `req.user` `null`) — all get `@UseGuards(JwtAuthGuard, AdminGuard)`. Upgrading `adminUpdate`/`adminPatch` off `OptionalJwtGuard` is a deliberate behavior change: "optional" auth makes no sense for an admin-only mutation route, and the service already treats `user` as the identity of *who* processed the échange (`traite_par`) — that should never be anonymous.

**Files:**
- Modify: `server/src/echanges/echanges.controller.ts`
- Test: `server/test/echanges.e2e-spec.ts`

- [ ] **Step 1: Update the e2e spec — every admin route now requires admin auth**

Replace `server/test/echanges.e2e-spec.ts` in full:

```typescript
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, seedAdmin, seedClientUser } from './utils/create-test-app';
import { EchangesModule } from '../src/echanges/echanges.module';

describe('echanges', () => {
  let app: INestApplication;
  let clientToken: string;
  let adminToken: string;
  beforeAll(async () => {
    app = await createTestApp({ imports: [EchangesModule] });
    clientToken = (await seedClientUser(app, 'ech-client@aura.io')).token;
    adminToken = (await seedAdmin(app, 'ech-admin@aura.io')).token;
  });
  afterAll(async () => { await app.close(); });
  const http = () => request(app.getHttpServer());
  const asAdmin = (r: request.Test) => r.set('Authorization', `Bearer ${adminToken}`);
  const asClient = (r: request.Test) => r.set('Authorization', `Bearer ${clientToken}`);

  it('admin routes require admin auth; client routes keep their own guard', async () => {
    await http().get('/api/echanges').expect(401);
    await http().get('/api/echanges/statistics').expect(401);
    await http().put('/api/echanges/1').send({ statut: 'traite' }).expect(401);
    await http().patch('/api/echanges/1').send({ statut: 'traite' }).expect(401);
    await http().post('/api/echanges/1/hide').expect(401);
    await http().post('/api/echanges/1/report').send({ motif_signalement: 'x' }).expect(401);
    await http().delete('/api/echanges/1').expect(401);
    await asClient(http().get('/api/echanges')).expect(403);
  });

  it('client store requires auth + client row; creates with defaults', async () => {
    await http().post('/api/echanges/client/echanges').expect(401);
    const res = await asClient(http().post('/api/echanges/client/echanges'))
      .field('sujet', 'Proposition de partenariat')
      .field('type', 'proposition')
      .field('message', 'Un message de plus de dix caractères.')
      .field('ce_que_je_propose', 'Ateliers')
      .attach('pieces_jointes', Buffer.from('%PDF-1.4'), {
        filename: 'doc.pdf', contentType: 'application/pdf',
      })
      .expect(201);
    expect(res.body.message).toBe('Votre message a été envoyé avec succès');
    expect(res.body.data.statut).toBe('en_attente');
    expect(res.body.data.priorite).toBe('moyenne');
    expect(res.body.data.ce_que_je_propose).toBe('Ateliers');
    expect(res.body.data.pieces_jointes).toHaveLength(1);
  });

  it('store rejects delai_souhaite set to today (must be strictly after today)', async () => {
    const today = new Date().toISOString().slice(0, 10);
    const res = await asClient(http().post('/api/echanges/client/echanges'))
      .field('sujet', 's').field('type', 'demande').field('message', 'assez long message ici')
      .field('delai_souhaite', today)
      .expect(422);
    expect(res.body.errors.delai_souhaite).toBeDefined();
  });

  it('client index/show scoped to own rows; type must be in list', async () => {
    const bad = await asClient(http().post('/api/echanges/client/echanges'))
      .field('sujet', 's').field('type', 'invalide').field('message', 'assez long message')
      .expect(422);
    expect(bad.body.errors.type).toBeDefined();

    const list = await asClient(http().get('/api/echanges/client/echanges')).expect(200);
    expect(list.body.data).toHaveLength(1);
    const id = list.body.data[0].id;
    await asClient(http().get(`/api/echanges/client/echanges/${id}`)).expect(200);
    const nf = await asClient(http().get('/api/echanges/client/echanges/99999')).expect(404);
    expect(nf.body.message).toBe('Échange non trouvé');
  });

  it('adminShow marks en_attente as lu; adminUpdate traite sets traite_par from token', async () => {
    const list = await asAdmin(http().get('/api/echanges')).expect(200);
    const id = list.body.data[0].id;

    const shown = await asAdmin(http().get(`/api/echanges/${id}`)).expect(200);
    expect(shown.body.data.statut).toBe('lu');
    expect(shown.body.data.lu_a).toBeTruthy();

    const upd = await asAdmin(http().put(`/api/echanges/${id}`))
      .send({ statut: 'traite', reponse_admin: 'Réponse admin' }).expect(200);
    expect(upd.body.data.statut).toBe('traite');
    expect(upd.body.data.traite_a).toBeTruthy();
    expect(upd.body.data.repondu_a).toBeTruthy();
    expect(upd.body.data.traite_par).toBeTruthy();
  });

  it('client update/destroy blocked once statut not en_attente/lu', async () => {
    const list = await asClient(http().get('/api/echanges/client/echanges')).expect(200);
    const id = list.body.data[0].id; // statut is now 'traite'
    const upd = await asClient(http().put(`/api/echanges/client/echanges/${id}`))
      .send({ sujet: 'Nouveau' }).expect(404);
    expect(upd.body.message).toBe('Échange non trouvé ou ne peut pas être modifié');
    const del = await asClient(http().delete(`/api/echanges/client/echanges/${id}`)).expect(404);
    expect(del.body.message).toBe('Échange non trouvé ou ne peut pas être supprimé');
  });

  it('adminHide toggles, adminReport flags, statistics reachable', async () => {
    const list = await asAdmin(http().get('/api/echanges')).expect(200);
    const id = list.body.data[0].id;

    const hide = await asAdmin(http().post(`/api/echanges/${id}/hide`)).expect(200);
    expect(hide.body.message).toBe('Échange masqué');
    const unhide = await asAdmin(http().post(`/api/echanges/${id}/hide`)).expect(200);
    expect(unhide.body.message).toBe('Échange démasqué');

    const rep = await asAdmin(http().post(`/api/echanges/${id}/report`))
      .send({ motif_signalement: 'contenu inapproprié' }).expect(200);
    expect(rep.body.data.statut).toBe('signale');
    expect(rep.body.data.signale_par).toBeTruthy();

    const stats = await asAdmin(http().get('/api/echanges/statistics')).expect(200);
    expect(stats.body.data).toHaveProperty('par_type');
    expect(stats.body.data.total).toBeGreaterThanOrEqual(1);

    const del = await asAdmin(http().delete(`/api/echanges/${id}`)).expect(200);
    expect(del.body.message).toBe('Échange supprimé avec succès');
    await asAdmin(http().get(`/api/echanges/${id}`)).expect(404);
  });
});
```

- [ ] **Step 2: Run to verify the new test fails**

Run: `npm run test:e2e -- echanges.e2e-spec.ts`
Expected: FAIL — `admin routes require admin auth` fails (`GET /api/echanges` returns 200, not 401 — no guard yet).

- [ ] **Step 3: Add method-level guards to the 8 admin routes**

Replace `server/src/echanges/echanges.controller.ts` in full:

```typescript
import {
  Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Patch, Post, Put,
  Query, UploadedFiles, UseGuards, UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { EchangesService } from './echanges.service';
import { CreateEchangeDto } from './dto/create-echange.dto';
import { UpdateEchangeDto } from './dto/update-echange.dto';
import { AdminUpdateEchangeDto } from './dto/admin-update-echange.dto';
import { ReportEchangeDto } from './dto/report-echange.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ClientGuard } from '../auth/guards/client.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { CurrentClient, CurrentUser } from '../auth/decorators';
import { Client } from '../database/entities/client.entity';
import { User } from '../database/entities/user.entity';

@Controller('echanges')
export class EchangesController {
  constructor(private readonly service: EchangesService) {}

  // ---- client (path parity with the real Laravel app: /api/echanges/client/echanges) ----

  @UseGuards(JwtAuthGuard, ClientGuard)
  @Get('client/echanges')
  index(@CurrentClient() client: Client, @Query() query: Record<string, any>) {
    return this.service.index(client, query);
  }

  @UseGuards(JwtAuthGuard, ClientGuard)
  @Post('client/echanges')
  @UseInterceptors(FilesInterceptor('pieces_jointes'))
  store(
    @CurrentClient() client: Client,
    @Body() dto: CreateEchangeDto,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.service.store(client, dto, files);
  }

  @UseGuards(JwtAuthGuard, ClientGuard)
  @Get('client/echanges/:id')
  show(@CurrentClient() client: Client, @Param('id', ParseIntPipe) id: number) {
    return this.service.show(client, id);
  }

  @UseGuards(JwtAuthGuard, ClientGuard)
  @Put('client/echanges/:id')
  update(
    @CurrentClient() client: Client,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEchangeDto,
  ) {
    return this.service.update(client, id, dto);
  }

  @UseGuards(JwtAuthGuard, ClientGuard)
  @Patch('client/echanges/:id')
  patch(
    @CurrentClient() client: Client,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEchangeDto,
  ) {
    return this.service.update(client, id, dto);
  }

  @UseGuards(JwtAuthGuard, ClientGuard)
  @Delete('client/echanges/:id')
  destroy(@CurrentClient() client: Client, @Param('id', ParseIntPipe) id: number) {
    return this.service.destroy(client, id);
  }

  // ---- admin ----

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('statistics')
  adminStatistics() { return this.service.adminStatistics(); }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get()
  adminIndex(@Query() query: Record<string, any>) { return this.service.adminIndex(query); }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get(':id')
  adminShow(@Param('id', ParseIntPipe) id: number) { return this.service.adminShow(id); }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Put(':id')
  adminUpdate(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AdminUpdateEchangeDto,
    @CurrentUser() user: User | null,
  ) {
    return this.service.adminUpdate(id, dto, user);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Patch(':id')
  adminPatch(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AdminUpdateEchangeDto,
    @CurrentUser() user: User | null,
  ) {
    return this.service.adminUpdate(id, dto, user);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @HttpCode(200)
  @Post(':id/hide')
  adminHide(@Param('id', ParseIntPipe) id: number) { return this.service.adminHide(id); }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @HttpCode(200)
  @Post(':id/report')
  adminReport(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReportEchangeDto,
    @CurrentUser() user: User | null,
  ) {
    return this.service.adminReport(id, dto, user);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Delete(':id')
  adminDestroy(@Param('id', ParseIntPipe) id: number) { return this.service.adminDestroy(id); }
}
```

Note `OptionalJwtGuard` is no longer imported anywhere in this file — it drops out entirely here (it is still used elsewhere, e.g. praticien routes, so the guard class itself is not deleted).

- [ ] **Step 4: Run to verify all tests pass**

Run: `npm run test:e2e -- echanges.e2e-spec.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add server/src/echanges/echanges.controller.ts server/test/echanges.e2e-spec.ts
git commit -m "feat(server): guard echanges admin routes, upgrade optional-auth mutations to AdminGuard"
```

---

## Task 10: Backend guard — `PaiementsController` (5 admin routes, method-level)

Admin routes: `adminStatistics` (`GET statistics`), `adminExportCsv` (`GET export/csv`), `adminExport` (`GET export`), `adminIndex` (`GET /`), `destroy` (`DELETE :id`) — all fully unguarded today. Client routes (`exportComptable`, `index` at `GET clients`, `show` at `GET :id`) already carry `JwtAuthGuard, ClientGuard` and stay untouched. Route declaration order in the file (`statistics`, `export/csv`, `export/comptable`, `export`, `clients`, `/`, `:id`) is preserved exactly — only `@UseGuards(...)` is added to methods, nothing is reordered.

**Files:**
- Modify: `server/src/paiements/paiements.controller.ts`
- Test: `server/test/paiements.e2e-spec.ts`

- [ ] **Step 1: Update the e2e spec**

Replace `server/test/paiements.e2e-spec.ts` in full:

```typescript
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { createTestApp, seedAdmin, seedClientUser } from './utils/create-test-app';
import { PaiementsModule } from '../src/paiements/paiements.module';
import { Paiement } from '../src/database/entities/paiement.entity';

describe('paiements', () => {
  let app: INestApplication;
  let clientToken: string;
  let clientId: number;
  let adminToken: string;
  beforeAll(async () => {
    app = await createTestApp({ imports: [PaiementsModule] });
    const seeded = await seedClientUser(app, 'payer@aura.io');
    clientToken = seeded.token;
    clientId = seeded.client.id;
    adminToken = (await seedAdmin(app, 'paiements-admin@aura.io')).token;
    const ds = app.get(DataSource);
    await ds.getRepository(Paiement).save([
      { reference: 'TX-11111', client_id: clientId, montant_brut: 100, commission: 10,
        montant_net_praticien: 90, moyen_paiement: 'Carte', statut: 'paid',
        date_paiement: new Date('2026-06-15T10:00:00Z') },
      { reference: 'TX-22222', client_id: clientId, montant_brut: 50, commission: 5,
        montant_net_praticien: 45, moyen_paiement: 'PayPal', statut: 'en_attente',
        date_paiement: new Date('2026-07-01T10:00:00Z') },
    ]);
  });
  afterAll(async () => { await app.close(); });
  const http = () => request(app.getHttpServer());
  const asAdmin = (r: request.Test) => r.set('Authorization', `Bearer ${adminToken}`);
  const asClient = (r: request.Test) => r.set('Authorization', `Bearer ${clientToken}`);

  it('admin routes require admin auth; client routes keep their own guard', async () => {
    await http().get('/api/paiements').expect(401);
    await http().get('/api/paiements/statistics').expect(401);
    await http().get('/api/paiements/export').expect(401);
    await http().get('/api/paiements/export/csv').expect(401);
    await http().delete('/api/paiements/1').expect(401);
    await asClient(http().get('/api/paiements')).expect(403);
  });

  it('client index scoped + statistiques block', async () => {
    await http().get('/api/paiements/clients').expect(401);
    const res = await asClient(http().get('/api/paiements/clients')).expect(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.statistiques).toMatchObject({
      total_paiements: 2, total_montant: 150, total_commission: 15, total_net: 135,
    });
    expect(res.body.statistiques.par_moyen).toHaveLength(2);

    const filtered = await asClient(http().get('/api/paiements/clients?statut=paid')).expect(200);
    expect(filtered.body.data).toHaveLength(1);
  });

  it('client show 404 for foreign paiement', async () => {
    const other = await seedClientUser(app, 'other-payer@aura.io');
    const list = await asClient(http().get('/api/paiements/clients')).expect(200);
    const id = list.body.data[0].id;
    await asClient(http().get(`/api/paiements/${id}`)).expect(200);
    const nf = await http().get(`/api/paiements/${id}`)
      .set('Authorization', `Bearer ${other.token}`).expect(404);
    expect(nf.body.message).toBe('Paiement non trouvé');
  });

  it('adminIndex lists all; adminStatistics aggregates; par_mois formatted YYYY-MM', async () => {
    const idx = await asAdmin(http().get('/api/paiements')).expect(200);
    expect(idx.body.pagination.total).toBe(2);

    const stats = await asAdmin(http().get('/api/paiements/statistics')).expect(200);
    expect(stats.body.data.general).toMatchObject({
      total_transactions: 2, montant_total: 150,
    });
    expect(stats.body.data.par_mois[0].mois).toMatch(/^\d{4}-\d{2}$/);
    expect(stats.body.data.par_statut.length).toBeGreaterThanOrEqual(2);
  });

  it('exports: JSON export only paid; CSV has French header and semicolons', async () => {
    const exp = await asAdmin(http().get('/api/paiements/export')).expect(200);
    expect(exp.body.data.total_transactions).toBe(1);
    expect(exp.body.data.transactions[0].brut).toBe('100.00 €');

    const csv = await asAdmin(http().get('/api/paiements/export/csv')).expect(200);
    expect(csv.body.data.filename).toMatch(/^export_paiements_\d{8}_\d{6}\.csv$/);
    const lines = csv.body.data.csv.split('\n');
    expect(lines[0]).toBe(
      'Référence;Date;Client;Email Client;Praticien;Brut (€);Commission (€);Net Praticien (€);Moyen de paiement;Statut',
    );
    expect(lines[1]).toContain('TX-11111;');

    const compta = await asClient(http().get('/api/paiements/export/comptable')).expect(200);
    expect(compta.body.data.total_transactions).toBe(1);
    expect(compta.body.data.transactions[0].statut).toBe('paid');
  });

  it('DELETE /:id soft deletes', async () => {
    const idx = await asAdmin(http().get('/api/paiements')).expect(200);
    const id = idx.body.data.find((p: any) => p.statut === 'en_attente').id;
    await asAdmin(http().delete(`/api/paiements/${id}`)).expect(200);
    const after = await asAdmin(http().get('/api/paiements')).expect(200);
    expect(after.body.pagination.total).toBe(1);
  });
});
```

- [ ] **Step 2: Run to verify the new test fails**

Run: `npm run test:e2e -- paiements.e2e-spec.ts`
Expected: FAIL — `admin routes require admin auth` fails (`GET /api/paiements` returns 200, not 401 — no guard yet).

- [ ] **Step 3: Add method-level guards to the 5 admin routes**

Replace `server/src/paiements/paiements.controller.ts` in full:

```typescript
import {
  Controller, Delete, Get, Param, ParseIntPipe, Query, UseGuards,
} from '@nestjs/common';
import { PaiementsService } from './paiements.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ClientGuard } from '../auth/guards/client.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { CurrentClient } from '../auth/decorators';
import { Client } from '../database/entities/client.entity';

@Controller('paiements')
export class PaiementsController {
  constructor(private readonly service: PaiementsService) {}

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('statistics')
  adminStatistics(@Query() query: Record<string, any>) {
    return this.service.adminStatistics(query);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('export/csv')
  adminExportCsv(@Query() query: Record<string, any>) {
    return this.service.adminExportCsv(query);
  }

  @UseGuards(JwtAuthGuard, ClientGuard)
  @Get('export/comptable')
  exportComptable(@CurrentClient() client: Client, @Query() query: Record<string, any>) {
    return this.service.exportComptable(client, query);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('export')
  adminExport(@Query() query: Record<string, any>) {
    return this.service.adminExport(query);
  }

  @UseGuards(JwtAuthGuard, ClientGuard)
  @Get('clients')
  index(@CurrentClient() client: Client, @Query() query: Record<string, any>) {
    return this.service.index(client, query);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get()
  adminIndex(@Query() query: Record<string, any>) {
    return this.service.adminIndex(query);
  }

  @UseGuards(JwtAuthGuard, ClientGuard)
  @Get(':id')
  show(@CurrentClient() client: Client, @Param('id', ParseIntPipe) id: number) {
    return this.service.show(client, id);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Delete(':id')
  destroy(@Param('id', ParseIntPipe) id: number) {
    return this.service.destroy(id);
  }
}
```

- [ ] **Step 4: Run to verify all tests pass**

Run: `npm run test:e2e -- paiements.e2e-spec.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add server/src/paiements/paiements.controller.ts server/test/paiements.e2e-spec.ts
git commit -m "feat(server): guard paiements admin routes with AdminGuard, keep client routes untouched"
```

---

## Task 11: Backend guard — `RemboursementsController` (7 admin routes, method-level)

Admin routes: `adminStatistics` (`GET admin/statistics`), `adminExport` (`GET admin/export`), `adminIndex` (`GET admin`), `adminShow` (`GET admin/:id`), `adminApprove` (`POST admin/:id/approve`), `adminRefuse` (`POST admin/:id/refuse`), `adminComplete` (`POST admin/:id/complete`) — all fully unguarded today (the file's own comment even says `// ---- admin (public in the real PHP app) ----`, i.e. this was already a known-public gap being carried over from the legacy app on purpose until this plan). Client routes (`index`, `store`, `show`, `cancel`, all under `client*`) already carry `JwtAuthGuard, ClientGuard` and stay untouched.

**Files:**
- Modify: `server/src/remboursements/remboursements.controller.ts`
- Test: `server/test/remboursements.e2e-spec.ts`

- [ ] **Step 1: Update the e2e spec**

Replace `server/test/remboursements.e2e-spec.ts` in full:

```typescript
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { createTestApp, seedAdmin, seedClientUser } from './utils/create-test-app';
import { RemboursementsModule } from '../src/remboursements/remboursements.module';
import { Paiement } from '../src/database/entities/paiement.entity';

describe('remboursements', () => {
  let app: INestApplication;
  let clientToken: string;
  let clientId: number;
  let paidId: number;
  let adminToken: string;
  beforeAll(async () => {
    app = await createTestApp({ imports: [RemboursementsModule] });
    const seeded = await seedClientUser(app, 'refund@aura.io');
    clientToken = seeded.token;
    clientId = seeded.client.id;
    adminToken = (await seedAdmin(app, 'remb-admin@aura.io')).token;
    const ds = app.get(DataSource);
    paidId = (await ds.getRepository(Paiement).save({
      reference: 'TX-33333', client_id: clientId, montant_brut: 200, commission: 20,
      montant_net_praticien: 180, moyen_paiement: 'Carte', statut: 'paid',
      date_paiement: new Date(),
    })).id;
    await ds.getRepository(Paiement).save({
      reference: 'TX-44444', client_id: clientId, montant_brut: 60, commission: 6,
      montant_net_praticien: 54, moyen_paiement: 'Carte', statut: 'en_attente',
      date_paiement: new Date(),
    });
  });
  afterAll(async () => { await app.close(); });
  const http = () => request(app.getHttpServer());
  const asClient = (r: request.Test) => r.set('Authorization', `Bearer ${clientToken}`);
  const asAdmin = (r: request.Test) => r.set('Authorization', `Bearer ${adminToken}`);

  it('admin routes require admin auth; client routes keep their own guard', async () => {
    await http().get('/api/remboursements/admin').expect(401);
    await http().get('/api/remboursements/admin/statistics').expect(401);
    await http().get('/api/remboursements/admin/export').expect(401);
    await http().get('/api/remboursements/admin/1').expect(401);
    await http().post('/api/remboursements/admin/1/approve').expect(401);
    await http().post('/api/remboursements/admin/1/refuse').send({ commentaire_admin: 'x'.repeat(10) }).expect(401);
    await http().post('/api/remboursements/admin/1/complete').expect(401);
    await asClient(http().get('/api/remboursements/admin')).expect(403);
  });

  it('store: eligible paid paiement only, no duplicate, montant = montant_brut, RMB ref', async () => {
    const ds = app.get(DataSource);
    const notPaid = await ds.getRepository(Paiement).findOneByOrFail({ reference: 'TX-44444' });
    const bad = await asClient(http().post('/api/remboursements/client'))
      .field('paiement_id', String(notPaid.id)).field('motif', 'Annulation').expect(422);
    expect(bad.body.errors.paiement_id).toBeDefined();

    const ok = await asClient(http().post('/api/remboursements/client'))
      .field('paiement_id', String(paidId))
      .field('motif', 'Annulation du rendez-vous')
      .attach('documents', Buffer.from('%PDF-1.4'), {
        filename: 'preuve.pdf', contentType: 'application/pdf',
      })
      .expect(201);
    expect(ok.body.data.montant).toBe(200);
    expect(ok.body.data.reference).toMatch(/^RMB-\d{5}$/);
    expect(ok.body.data.statut).toBe('en_attente');
    expect(ok.body.data.documents).toHaveLength(1);

    const dup = await asClient(http().post('/api/remboursements/client'))
      .field('paiement_id', String(paidId)).field('motif', 'Encore').expect(422);
    expect(dup.body.errors.paiement_id[0]).toContain('existe déjà');
  });

  it('client cancel maps to refuse; only en_attente/en_cours cancellable', async () => {
    const list = await asClient(http().get('/api/remboursements/client')).expect(200);
    const id = list.body.data[0].id;
    const cancel = await asClient(http().post(`/api/remboursements/client/${id}/cancel`)).expect(200);
    expect(cancel.body.message).toBe('Demande de remboursement annulée avec succès');
    expect(cancel.body.data.statut).toBe('refuse');
    await asClient(http().post(`/api/remboursements/client/${id}/cancel`)).expect(404);
  });

  it('admin approve → paiement rembourse; complete requires approuve', async () => {
    // refused earlier → allowed to re-request
    const again = await asClient(http().post('/api/remboursements/client'))
      .field('paiement_id', String(paidId)).field('motif', 'Deuxième demande').expect(201);
    const id = again.body.data.id;

    await asAdmin(http().post(`/api/remboursements/admin/${id}/complete`)).expect(404);

    const appr = await asAdmin(http().post(`/api/remboursements/admin/${id}/approve`))
      .send({ commentaire_admin: 'OK' }).expect(200);
    expect(appr.body.data.statut).toBe('approuve');
    const ds = app.get(DataSource);
    const paiement = await ds.getRepository(Paiement).findOneByOrFail({ id: paidId });
    expect(paiement.statut).toBe('rembourse');

    const done = await asAdmin(http().post(`/api/remboursements/admin/${id}/complete`)).expect(200);
    expect(done.body.data.statut).toBe('completed');
  });

  it('admin refuse requires commentaire min 10; adminIndex embeds statistiques; export + statistics reachable', async () => {
    const badRefuse = await asAdmin(http().post('/api/remboursements/admin/99999/refuse'))
      .send({ commentaire_admin: 'commentaire suffisant' }).expect(404);
    expect(badRefuse.body.status).toBe('error');

    const idx = await asAdmin(http().get('/api/remboursements/admin')).expect(200);
    expect(idx.body.statistiques).toHaveProperty('taux_remboursement');
    expect(idx.body.statistiques.taux_evolution).toBe('+0.3');

    const stats = await asAdmin(http().get('/api/remboursements/admin/statistics')).expect(200);
    expect(stats.body.data).toHaveProperty('par_motif');
    expect(stats.body.data).toHaveProperty('par_mois');

    const exp = await asAdmin(http().get('/api/remboursements/admin/export')).expect(200);
    expect(exp.body.data.remboursements[0].statut).toBe('Complété');
    expect(exp.body.data.remboursements[0].reference).toMatch(/^RMB-/);
  });

  it('admin approve validates date_remboursement is today-or-later (after_or_equal:today)', async () => {
    const ds = app.get(DataSource);
    const toDateStr = (d: Date) => d.toISOString().slice(0, 10);
    const yesterday = toDateStr(new Date(Date.now() - 24 * 60 * 60 * 1000));
    const today = toDateStr(new Date());

    const makeRequest = async (reference: string) => {
      const paiementId = (await ds.getRepository(Paiement).save({
        reference, client_id: clientId, montant_brut: 50, commission: 5,
        montant_net_praticien: 45, moyen_paiement: 'Carte', statut: 'paid',
        date_paiement: new Date(),
      })).id;
      const created = await asClient(http().post('/api/remboursements/client'))
        .field('paiement_id', String(paiementId)).field('motif', 'Test date_remboursement')
        .expect(201);
      return created.body.data.id as number;
    };

    const yesterdayId = await makeRequest('TX-DATE-PAST');
    const past = await asAdmin(http().post(`/api/remboursements/admin/${yesterdayId}/approve`))
      .send({ date_remboursement: yesterday }).expect(422);
    expect(past.body.errors.date_remboursement).toBeDefined();

    const todayId = await makeRequest('TX-DATE-TODAY');
    const present = await asAdmin(http().post(`/api/remboursements/admin/${todayId}/approve`))
      .send({ date_remboursement: today }).expect(200);
    expect(present.body.data.statut).toBe('approuve');
  });
});
```

- [ ] **Step 2: Run to verify the new test fails**

Run: `npm run test:e2e -- remboursements.e2e-spec.ts`
Expected: FAIL — `admin routes require admin auth` fails (`GET /api/remboursements/admin` returns 200, not 401 — no guard yet).

- [ ] **Step 3: Add method-level guards to the 7 admin routes**

Replace `server/src/remboursements/remboursements.controller.ts` in full:

```typescript
import {
  Body, Controller, Get, HttpCode, Param, ParseIntPipe, Post, Query,
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
import { CurrentClient } from '../auth/decorators';
import { Client } from '../database/entities/client.entity';

@Controller('remboursements')
export class RemboursementsController {
  constructor(private readonly service: RemboursementsService) {}

  // ---- client ----

  @UseGuards(JwtAuthGuard, ClientGuard)
  @Get('client')
  index(@CurrentClient() client: Client, @Query() query: Record<string, any>) {
    return this.service.index(client, query);
  }

  @UseGuards(JwtAuthGuard, ClientGuard)
  @Post('client')
  @UseInterceptors(FilesInterceptor('documents'))
  store(
    @CurrentClient() client: Client,
    @Body() dto: CreateRemboursementDto,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.service.store(client, dto, files);
  }

  @UseGuards(JwtAuthGuard, ClientGuard)
  @Get('client/:id')
  show(@CurrentClient() client: Client, @Param('id', ParseIntPipe) id: number) {
    return this.service.show(client, id);
  }

  @UseGuards(JwtAuthGuard, ClientGuard)
  @HttpCode(200)
  @Post('client/:id/cancel')
  cancel(@CurrentClient() client: Client, @Param('id', ParseIntPipe) id: number) {
    return this.service.cancel(client, id);
  }

  // ---- admin ----

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('admin/statistics')
  adminStatistics(@Query() query: Record<string, any>) {
    return this.service.adminStatistics(query);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('admin/export')
  adminExport(@Query() query: Record<string, any>) {
    return this.service.adminExport(query);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('admin')
  adminIndex(@Query() query: Record<string, any>) {
    return this.service.adminIndex(query);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('admin/:id')
  adminShow(@Param('id', ParseIntPipe) id: number) {
    return this.service.adminShow(id);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @HttpCode(200)
  @Post('admin/:id/approve')
  adminApprove(@Param('id', ParseIntPipe) id: number, @Body() dto: ApproveRemboursementDto) {
    return this.service.adminApprove(id, dto);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @HttpCode(200)
  @Post('admin/:id/refuse')
  adminRefuse(@Param('id', ParseIntPipe) id: number, @Body() dto: RefuseRemboursementDto) {
    return this.service.adminRefuse(id, dto);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @HttpCode(200)
  @Post('admin/:id/complete') // fixes real PHP route typo 'admi/{id}/complete'
  adminComplete(@Param('id', ParseIntPipe) id: number) {
    return this.service.adminComplete(id);
  }
}
```

- [ ] **Step 4: Run to verify all tests pass**

Run: `npm run test:e2e -- remboursements.e2e-spec.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add server/src/remboursements/remboursements.controller.ts server/test/remboursements.e2e-spec.ts
git commit -m "feat(server): guard remboursements admin routes with AdminGuard"
```

---

## Task 12: Backend — praticien verification document streaming route

Part A's guard table is now fully applied. This task adds the one new backend surface this plan permits (see the architecture note at the top): a `GET .../documents/:docId/file` route so the web verification UI (Task 19) can actually display the ID/insurance/certification documents a praticien uploaded, instead of only ever seeing their metadata. It reuses `PraticienVerificationController`'s existing class-level `@UseGuards(JwtAuthGuard, AdminGuard)` — no new guard decision to make here, just a new guarded method. `server/src/main.ts`/`app.setup.ts` were read and confirm no `express.static` mount exists anywhere today, so there is currently no way to view an uploaded document at all; an unauthenticated static mount was rejected in favor of this guarded route specifically because these are personal ID/insurance/domicile documents.

**Files:**
- Modify: `server/src/common/storage.service.ts` — add `resolve()`
- Modify: `server/src/auth/praticien-verification/praticien-verification.service.ts` — add `file()`
- Modify: `server/src/auth/praticien-verification/praticien-verification.controller.ts` — add the route
- Modify: `server/src/auth/praticien-verification/praticien-verification.module.ts` — provide `StorageService`
- Test: `server/test/praticien-verification.e2e-spec.ts`

- [ ] **Step 1: Add a failing e2e test for the new route**

Replace `server/test/praticien-verification.e2e-spec.ts` in full (adds two `fs`/`path` imports and one new `it` block at the end; everything above is unchanged from what's already passing):

```typescript
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { promises as fs } from 'fs';
import { dirname, join } from 'path';
import { createTestApp, seedAdmin } from './utils/create-test-app';
import { PraticienVerificationModule } from '../src/auth/praticien-verification/praticien-verification.module';
import { Praticien } from '../src/database/entities/praticien.entity';
import { PraticienDocument } from '../src/database/entities/praticien-document.entity';

async function seedPraticien(ds: DataSource, email: string, nDocs = 5) {
  const praticien = await ds.getRepository(Praticien).save({
    firstname: 'P', lastname: 'T', email, telephone: '06', ville: 'Paris',
    niveau: 'expert', specialite: 'yoga', mode: 'presentiel', status: 'actif',
    tarif: 50, experience: 3, bio: 'b'.repeat(60), statut_verification: 'en_attente',
  });
  const types = ['piece_identite', 'certification', 'assurance', 'domicile', 'charte'];
  const docs: PraticienDocument[] = [];
  for (const type of types.slice(0, nDocs)) {
    docs.push(await ds.getRepository(PraticienDocument).save({
      praticien_id: praticien.id, type, nom_fichier: `${type}.pdf`,
      chemin: `praticiens/${praticien.id}/documents/${type}.pdf`,
      mime_type: 'application/pdf', taille: 100, statut: 'en_attente',
    }));
  }
  return { praticien, docs };
}

describe('praticien verification (admin)', () => {
  let app: INestApplication;
  let token: string;
  beforeAll(async () => {
    app = await createTestApp({ imports: [PraticienVerificationModule] });
    token = (await seedAdmin(app, 'verif@aura.io')).token;
  });
  afterAll(async () => { await app.close(); });
  const http = () => request(app.getHttpServer());
  const auth = (r: request.Test) => r.set('Authorization', `Bearer ${token}`);

  it('requires admin', async () => {
    await http().get('/api/v1/admin/praticiens/verification').expect(401);
  });

  it('index lists pending praticiens with statistiques', async () => {
    const ds = app.get(DataSource);
    await seedPraticien(ds, 'p1@aura.io');
    const res = await auth(http().get('/api/v1/admin/praticiens/verification')).expect(200);
    expect(res.body.statistiques).toHaveProperty('total_attente');
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });

  it('statistics route is reachable (not shadowed by :id)', async () => {
    const res = await auth(http().get('/api/v1/admin/praticiens/verification/statistics')).expect(200);
    expect(res.body.data).toHaveProperty('par_specialite');
    expect(res.body.data.documents).toHaveProperty('total');
  });

  it('show returns per-type document map with resume', async () => {
    const ds = app.get(DataSource);
    const { praticien } = await seedPraticien(ds, 'p2@aura.io', 4);
    const res = await auth(http().get(`/api/v1/admin/praticiens/verification/${praticien.id}`)).expect(200);
    expect(res.body.data.documents.charte.soumis).toBe(false);
    expect(res.body.data.resume_documents).toEqual({
      soumis: 4, en_attente: 4, valides: 0, rejetes: 0, manquants: 1,
    });
  });

  it('verify: all 5 valide → praticien valide; any rejete → praticien rejete', async () => {
    const ds = app.get(DataSource);
    const { praticien, docs } = await seedPraticien(ds, 'p3@aura.io');
    const ok = await auth(http().post(`/api/v1/admin/praticiens/verification/${praticien.id}/verify`))
      .send({ documents: docs.map((d) => ({ id: d.id, statut: 'valide' })) }).expect(200);
    expect(ok.body.message).toBe('Praticien validé avec succès');

    const { praticien: p2, docs: docs2 } = await seedPraticien(ds, 'p4@aura.io');
    const rej = await auth(http().post(`/api/v1/admin/praticiens/verification/${p2.id}/verify`))
      .send({
        documents: [
          { id: docs2[0].id, statut: 'rejete', commentaire_rejet: 'flou' },
          ...docs2.slice(1).map((d) => ({ id: d.id, statut: 'valide' })),
        ],
        commentaire_global: 'Pièce illisible',
      }).expect(200);
    expect(rej.body.message).toBe('Praticien rejeté');
    expect(rej.body.data.motif_rejet).toBe('Pièce illisible');
  });

  it('reject sets praticien + all documents rejete; relance returns counts', async () => {
    const ds = app.get(DataSource);
    const { praticien } = await seedPraticien(ds, 'p5@aura.io');
    const rej = await auth(http().post(`/api/v1/admin/praticiens/verification/${praticien.id}/reject`))
      .send({ motif_rejet: 'Dossier incomplet et invalide' }).expect(200);
    expect(rej.body.message).toBe('Praticien rejeté avec succès');
    // already-rejected → 404
    await auth(http().post(`/api/v1/admin/praticiens/verification/${praticien.id}/reject`))
      .send({ motif_rejet: 'Dossier incomplet et invalide' }).expect(404);

    const { praticien: p6 } = await seedPraticien(ds, 'p6@aura.io', 3);
    const rel = await auth(http().post(`/api/v1/admin/praticiens/verification/${p6.id}/relance`)).expect(200);
    expect(rel.body.data.documents_manquants).toBe(2);
    expect(rel.body.data.documents_en_attente).toBe(3);
  });

  it('GET documents/:docId/file streams the stored file, guarded, 404 when missing', async () => {
    const ds = app.get(DataSource);
    const { docs } = await seedPraticien(ds, 'p7@aura.io', 1);
    const doc = docs[0];
    // The document row exists (as it would after a real upload via praticien-auth's
    // StorageService.save()) — write matching bytes at the same resolved path so the
    // streaming route has a real file to read, without going through the upload flow.
    const absPath = join(process.env.UPLOAD_DIR as string, doc.chemin);
    await fs.mkdir(dirname(absPath), { recursive: true });
    await fs.writeFile(absPath, '%PDF-1.4 fake content');

    await http().get(`/api/v1/admin/praticiens/verification/documents/${doc.id}/file`).expect(401);

    const res = await auth(
      http().get(`/api/v1/admin/praticiens/verification/documents/${doc.id}/file`),
    ).expect(200);
    expect(res.headers['content-type']).toContain('application/pdf');
    expect(res.headers['content-disposition']).toContain('piece_identite.pdf');

    await auth(http().get('/api/v1/admin/praticiens/verification/documents/999999/file')).expect(404);
  });
});
```

- [ ] **Step 2: Run to verify the new test fails**

Run: `npm run test:e2e -- praticien-verification.e2e-spec.ts`
Expected: FAIL — `GET documents/:docId/file streams...` fails with a 404 (route doesn't exist yet).

- [ ] **Step 3: Add `StorageService.resolve()`**

Replace `server/src/common/storage.service.ts` in full:

```typescript
import { Injectable } from '@nestjs/common';
import { promises as fs } from 'fs';
import { join, extname } from 'path';
import { randomUUID } from 'crypto';

@Injectable()
export class StorageService {
  private readonly base = process.env.UPLOAD_DIR ?? join(process.cwd(), 'storage', 'uploads');

  async save(file: Express.Multer.File, subdir: string): Promise<string> {
    const dir = join(this.base, subdir);
    await fs.mkdir(dir, { recursive: true });
    // The on-disk filename is derived entirely from a random id + a sanitized
    // extension. `file.originalname` is fully attacker-controlled (client
    // Content-Disposition header) and must never be interpolated into the
    // actual filesystem path (path traversal via `../` sequences). The
    // original filename is preserved separately as a display-only DB value
    // (see PraticienDocument.nom_fichier).
    const ext = extname(file.originalname).toLowerCase().replace(/[^a-z0-9.]/g, '');
    const name = `${randomUUID()}${ext}`;
    await fs.writeFile(join(dir, name), file.buffer);
    return `${subdir}/${name}`;
  }

  /** Turns a stored `chemin` (as returned by `save()`) into an absolute filesystem path. */
  resolve(chemin: string): string {
    return join(this.base, chemin);
  }
}
```

- [ ] **Step 4: Add `PraticienVerificationService.file()`**

In `server/src/auth/praticien-verification/praticien-verification.service.ts`, add the `StorageService` import and constructor param, and the new method. Replace the file in full:

```typescript
import { Injectable, NotFoundException, StreamableFile } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { createReadStream } from 'fs';
import type { Response } from 'express';
import { Praticien } from '../../database/entities/praticien.entity';
import { PraticienDocument } from '../../database/entities/praticien-document.entity';
import { User } from '../../database/entities/user.entity';
import { StorageService } from '../../common/storage.service';
import { success } from '../../common/envelope';
import { parsePagination, paginateQb } from '../../common/pagination';
import { VerifyDocumentsDto } from './dto/verify-documents.dto';
import { RejectPraticienDto } from './dto/reject-praticien.dto';
import { DOC_TYPES } from '../praticien-auth/praticien-auth.service';

const DOC_LABELS: Record<string, string> = {
  piece_identite: "Pièce d'identité", certification: 'Certification',
  assurance: 'Assurance', domicile: 'Justificatif de domicile', charte: 'Charte signée',
};

@Injectable()
export class PraticienVerificationService {
  constructor(
    @InjectRepository(Praticien) private readonly praticiens: Repository<Praticien>,
    @InjectRepository(PraticienDocument) private readonly documents: Repository<PraticienDocument>,
    private readonly storage: StorageService,
  ) {}

  private notFound(message: string): never {
    throw new NotFoundException({ status: 'error', message });
  }

  private async findPending(id: number): Promise<Praticien | null> {
    return this.praticiens.findOneBy({
      id, statut_verification: In(['en_attente', 'en_cours']),
    });
  }

  async index(query: Record<string, any>) {
    const { page, perPage } = parsePagination(query, 15);
    const qb = this.praticiens.createQueryBuilder('p')
      .leftJoinAndSelect('p.documents', 'documents')
      .leftJoinAndSelect('p.verifiePar', 'verifiePar')
      .where('p.statut_verification IN (:...sts)', { sts: ['en_attente', 'en_cours'] });
    if (query.statut !== undefined) {
      qb.andWhere('p.statut_verification = :statut', { statut: query.statut });
    }
    if (query.search !== undefined) {
      qb.andWhere(
        '(p.firstname LIKE :s OR p.lastname LIKE :s OR p.email LIKE :s OR p.ville LIKE :s OR p.specialite LIKE :s)',
        { s: `%${query.search}%` },
      );
    }
    qb.orderBy('p.created_at', 'ASC');
    const { data, pagination } = await paginateQb(qb, page, perPage);
    const count = (st: string) => this.praticiens.countBy({ statut_verification: st });
    return success(data, undefined, {
      pagination,
      statistiques: {
        total_attente: await count('en_attente'),
        total_en_cours: await count('en_cours'),
        total_valide: await count('valide'),
        total_rejete: await count('rejete'),
      },
    });
  }

  async show(id: number) {
    const praticien = await this.praticiens.findOne({
      where: { id }, relations: { documents: true, verifiePar: true },
    });
    if (!praticien) this.notFound('Praticien non trouvé');
    const docs = praticien.documents ?? [];
    const documents: Record<string, unknown> = {};
    for (const type of DOC_TYPES) {
      const doc = docs.find((d) => d.type === type);
      documents[type] = {
        label: DOC_LABELS[type],
        soumis: !!doc,
        statut: doc?.statut ?? 'manquant',
        nom_fichier: doc?.nom_fichier ?? null,
        chemin: doc?.chemin ?? null,
        id: doc?.id ?? null,
      };
    }
    return success({
      praticien,
      documents,
      resume_documents: {
        soumis: docs.length,
        en_attente: docs.filter((d) => d.statut === 'en_attente').length,
        valides: docs.filter((d) => d.statut === 'valide').length,
        rejetes: docs.filter((d) => d.statut === 'rejete').length,
        manquants: 5 - docs.length,
      },
    });
  }

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

  async relance(id: number) {
    const praticien = await this.findPending(id);
    if (!praticien) this.notFound('Praticien non trouvé');
    const docs = await this.documents.findBy({ praticien_id: id });
    return success(
      {
        praticien,
        documents_manquants: 5 - docs.length,
        documents_en_attente: docs.filter((d) => d.statut === 'en_attente').length,
      },
      'Relance envoyée avec succès',
    );
  }

  async statistics() {
    const count = (st?: string) =>
      st ? this.praticiens.countBy({ statut_verification: st }) : this.praticiens.count();
    const docCount = (st?: string) =>
      st ? this.documents.countBy({ statut: st }) : this.documents.count();
    const parSpecialite = await this.praticiens.createQueryBuilder('p')
      .select('p.specialite', 'specialite').addSelect('COUNT(*)', 'count')
      .groupBy('p.specialite').getRawMany();
    const derniersInscrits = await this.praticiens.find({
      relations: { verifiePar: true },
      order: { created_at: 'DESC' },
      take: 5,
      select: ['id', 'firstname', 'lastname', 'email', 'statut_verification', 'created_at'],
    });
    return success({
      total: await count(),
      en_attente: await count('en_attente'),
      en_cours: await count('en_cours'),
      valide: await count('valide'),
      rejete: await count('rejete'),
      documents: {
        total: await docCount(),
        en_attente: await docCount('en_attente'),
        valide: await docCount('valide'),
        rejete: await docCount('rejete'),
      },
      par_specialite: parSpecialite.map((r) => ({ ...r, count: Number(r.count) })),
      derniers_inscrits: derniersInscrits,
    });
  }

  async file(docId: number, res: Response): Promise<StreamableFile> {
    const doc = await this.documents.findOneBy({ id: docId });
    if (!doc) this.notFound('Document non trouvé');
    res.set({
      'Content-Type': doc.mime_type || 'application/octet-stream',
      'Content-Disposition': `inline; filename="${doc.nom_fichier}"`,
    });
    return new StreamableFile(createReadStream(this.storage.resolve(doc.chemin)));
  }
}
```

- [ ] **Step 5: Add the route + provide `StorageService`**

Replace `server/src/auth/praticien-verification/praticien-verification.controller.ts` in full:

```typescript
import {
  Body, Controller, Get, HttpCode, Param, ParseIntPipe, Post, Query, Res, UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { PraticienVerificationService } from './praticien-verification.service';
import { VerifyDocumentsDto } from './dto/verify-documents.dto';
import { RejectPraticienDto } from './dto/reject-praticien.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { AdminGuard } from '../guards/admin.guard';
import { CurrentUser } from '../decorators';
import { User } from '../../database/entities/user.entity';

@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('v1/admin/praticiens/verification')
export class PraticienVerificationController {
  constructor(private readonly service: PraticienVerificationService) {}

  // NOTE: `statistics` MUST stay declared before `:id`. This deliberately fixes
  // a real Laravel bug (D7) where `GET .../statistics` was declared AFTER
  // `GET .../{id}` in the routes file, so Laravel's router matched `{id}` first
  // and treated the literal string "statistics" as an id — the endpoint was
  // unreachable in production. NestJS controllers match routes in declaration
  // order the same way, so this ordering matters here too.
  @Get('statistics')
  statistics() { return this.service.statistics(); }

  @Get()
  index(@Query() query: Record<string, any>) { return this.service.index(query); }

  // `documents/:docId/file` is a 3-segment path (`documents`, id, `file`); it can
  // never collide with the single-segment `:id` route or the 2-segment `:id/verify`
  // etc. routes below regardless of declaration order, since NestJS/Express match
  // routes by segment shape, not just by first-match. Placed next to `show` because
  // both are single-document reads.
  @Get('documents/:docId/file')
  file(@Param('docId', ParseIntPipe) docId: number, @Res({ passthrough: true }) res: Response) {
    return this.service.file(docId, res);
  }

  @Get(':id')
  show(@Param('id', ParseIntPipe) id: number) { return this.service.show(id); }

  @HttpCode(200)
  @Post(':id/verify')
  verify(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: VerifyDocumentsDto,
    @CurrentUser() admin: User,
  ) { return this.service.verify(id, dto, admin); }

  @HttpCode(200)
  @Post(':id/reject')
  reject(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RejectPraticienDto,
    @CurrentUser() admin: User,
  ) { return this.service.reject(id, dto, admin); }

  @HttpCode(200)
  @Post(':id/relance')
  relance(@Param('id', ParseIntPipe) id: number) { return this.service.relance(id); }
}
```

Replace `server/src/auth/praticien-verification/praticien-verification.module.ts` in full:

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Praticien } from '../../database/entities/praticien.entity';
import { PraticienDocument } from '../../database/entities/praticien-document.entity';
import { PraticienVerificationController } from './praticien-verification.controller';
import { PraticienVerificationService } from './praticien-verification.service';
import { StorageService } from '../../common/storage.service';

@Module({
  imports: [TypeOrmModule.forFeature([Praticien, PraticienDocument])],
  controllers: [PraticienVerificationController],
  providers: [PraticienVerificationService, StorageService],
})
export class PraticienVerificationModule {}
```

- [ ] **Step 6: Run to verify all tests pass**

Run: `npm run test:e2e -- praticien-verification.e2e-spec.ts`
Expected: PASS (7 tests).

- [ ] **Step 7: Commit**

```bash
git add server/src/common/storage.service.ts server/src/auth/praticien-verification/praticien-verification.service.ts server/src/auth/praticien-verification/praticien-verification.controller.ts server/src/auth/praticien-verification/praticien-verification.module.ts server/test/praticien-verification.e2e-spec.ts
git commit -m "feat(server): stream praticien verification documents through a guarded route"
```

---

This closes out Part A. Every previously-unguarded admin controller now rejects unauthenticated and non-admin requests; every public read route (articles/cercles/disciplines/events index+show) is untouched; every client-guarded route (échanges/paiements/remboursements client halves) is untouched. Part B starts the web side: nothing in `web/` can be wired to these routes yet because there is no way for the browser to hold an admin bearer token.

---

## Task 13: Web — admin identity store + authenticated blob fetches

`web/lib/api.js` and the react-query `<Providers>` wrapper (Plan 01) already exist in the repo and need no changes beyond one addition (`apiFetchBlob`). There is **no** `web/lib/auth-store.js` in the repo yet (Plan 03 has not landed) — `useAdminAuth` is built standalone, in its own file, with its own `localStorage` key (`aura.admin.session`), so a future client store can never collide with it.

**Files:**
- Create: `web/lib/admin-auth-store.js`
- Create: `web/lib/admin-auth-store.test.js`
- Modify: `web/lib/api.js`
- Modify: `web/lib/api.test.js`

- [ ] **Step 1: Add a failing test for `apiFetchBlob`**

Replace `web/lib/api.test.js` in full:

```javascript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api, ApiError, setAuthToken, apiFetchBlob } from './api';

function mockFetch(status, body) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    text: async () => (body === undefined ? '' : JSON.stringify(body)),
  });
}

describe('web api client', () => {
  beforeEach(() => { setAuthToken(null); });

  it('GET builds the URL and unwraps the success envelope', async () => {
    global.fetch = mockFetch(200, { status: 'success', data: [{ id: 1 }] });
    const res = await api.get('/praticiens');
    expect(res.data).toEqual([{ id: 1 }]);
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8000/api/praticiens',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('attaches the bearer token when set', async () => {
    global.fetch = mockFetch(200, { status: 'success', data: {} });
    setAuthToken('tok123');
    await api.get('/compte');
    const [, opts] = global.fetch.mock.calls[0];
    expect(opts.headers.Authorization).toBe('Bearer tok123');
  });

  it('throws ApiError on a non-2xx response', async () => {
    global.fetch = mockFetch(404, { status: 'error', message: 'Not found' });
    await expect(api.get('/nope')).rejects.toBeInstanceOf(ApiError);
  });

  it('apiFetchBlob attaches the bearer token and resolves with a Blob on success', async () => {
    const blob = new Blob(['%PDF-1.4'], { type: 'application/pdf' });
    global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, blob: async () => blob });
    setAuthToken('tok123');
    const res = await apiFetchBlob('/v1/admin/praticiens/verification/documents/1/file');
    expect(res).toBe(blob);
    const [url, opts] = global.fetch.mock.calls[0];
    expect(url).toBe('http://localhost:8000/api/v1/admin/praticiens/verification/documents/1/file');
    expect(opts.headers.Authorization).toBe('Bearer tok123');
  });

  it('apiFetchBlob throws ApiError on a non-2xx response instead of returning a Blob', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false, status: 404,
      text: async () => JSON.stringify({ status: 'error', message: 'Document non trouvé' }),
    });
    await expect(apiFetchBlob('/v1/admin/praticiens/verification/documents/999/file'))
      .rejects.toBeInstanceOf(ApiError);
  });
});
```

- [ ] **Step 2: Run to verify the new tests fail**

Run: `npm run test -- api.test.js` (from `web/`)
Expected: FAIL — both `apiFetchBlob` tests fail (`apiFetchBlob is not a function` — not exported yet).

- [ ] **Step 3: Add `apiFetchBlob` to the api client**

Replace `web/lib/api.js` in full:

```javascript
// Web API client. Wraps fetch, unwraps the backend { status, data, pagination }
// envelope, attaches a bearer token, and throws ApiError on failure.
const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api';

export class ApiError extends Error {
  constructor(message, status, body) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

let authToken = null;
export function setAuthToken(token) { authToken = token; }

export async function apiFetch(path, { method = 'GET', body, token, headers = {} } = {}) {
  const t = token ?? authToken;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
      ...(t ? { Authorization: `Bearer ${t}` } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  const text = await res.text();
  let payload = null;
  if (text) { try { payload = JSON.parse(text); } catch { payload = text; } }

  if (!res.ok || (payload && payload.status === 'error')) {
    throw new ApiError(payload?.message || `Request failed (${res.status})`, res.status, payload);
  }
  return payload;
}

// Authenticated binary download (praticien verification documents today; any future
// file/export route can reuse it). Distinct from `apiFetch` because the response body
// is a Blob, not a JSON envelope — there is nothing to unwrap and no `Content-Type`
// header to set on the request.
export async function apiFetchBlob(path, { token, headers = {} } = {}) {
  const t = token ?? authToken;
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      ...headers,
      ...(t ? { Authorization: `Bearer ${t}` } : {}),
    },
  });

  if (!res.ok) {
    const text = await res.text();
    let payload = null;
    if (text) { try { payload = JSON.parse(text); } catch { payload = text; } }
    throw new ApiError(payload?.message || `Request failed (${res.status})`, res.status, payload);
  }
  return res.blob();
}

export const api = {
  get: (p, o) => apiFetch(p, { ...o, method: 'GET' }),
  post: (p, body, o) => apiFetch(p, { ...o, method: 'POST', body }),
  put: (p, body, o) => apiFetch(p, { ...o, method: 'PUT', body }),
  del: (p, o) => apiFetch(p, { ...o, method: 'DELETE' }),
};
```

- [ ] **Step 4: Run to verify `api.test.js` passes**

Run: `npm run test -- api.test.js` (from `web/`)
Expected: PASS (5 tests).

- [ ] **Step 5: Write a failing test for the admin auth store**

`vitest.config.mjs` runs with `environment: 'node'` (no jsdom, no browser globals) — matching every other test in `web/lib/`. `localStorage` therefore does not exist as a global here, so the test file installs a tiny in-memory stand-in before touching the store; this is local to the test file only, not a global config change.

Create `web/lib/admin-auth-store.test.js`:

```javascript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api, setAuthToken } from './api';
import { useAdminAuth } from './admin-auth-store';

function memoryStorage() {
  let store = {};
  return {
    getItem: (key) => (key in store ? store[key] : null),
    setItem: (key, value) => { store[key] = String(value); },
    removeItem: (key) => { delete store[key]; },
  };
}

function mockFetch(status, body) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    text: async () => (body === undefined ? '' : JSON.stringify(body)),
  });
}

describe('admin auth store', () => {
  beforeEach(() => {
    globalThis.localStorage = memoryStorage();
    setAuthToken(null);
    useAdminAuth.setState({ token: null, admin: null, hasHydrated: false });
  });

  it('setSession stores the admin + token and wires setAuthToken into the api client', async () => {
    useAdminAuth.getState().setSession('tok123', { id: 1, name: 'Boss', email: 'boss@aura.io' });
    expect(useAdminAuth.getState().token).toBe('tok123');
    expect(useAdminAuth.getState().admin).toMatchObject({ name: 'Boss' });

    global.fetch = mockFetch(200, { status: 'success', data: {} });
    await api.get('/admin/profile');
    const [, opts] = global.fetch.mock.calls[0];
    expect(opts.headers.Authorization).toBe('Bearer tok123');
  });

  it('signOut clears the session and detaches the token from the api client', async () => {
    useAdminAuth.getState().setSession('tok123', { id: 1, name: 'Boss' });
    useAdminAuth.getState().signOut();
    expect(useAdminAuth.getState().token).toBeNull();
    expect(useAdminAuth.getState().admin).toBeNull();

    global.fetch = mockFetch(200, { status: 'success', data: {} });
    await api.get('/admin/profile');
    const [, opts] = global.fetch.mock.calls[0];
    expect(opts.headers.Authorization).toBeUndefined();
  });

  it('persists token + admin to localStorage under aura.admin.session', () => {
    useAdminAuth.getState().setSession('tok456', { id: 2, name: 'Ada' });
    const raw = globalThis.localStorage.getItem('aura.admin.session');
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw);
    expect(parsed.state.token).toBe('tok456');
    expect(parsed.state.admin).toMatchObject({ name: 'Ada' });
  });

  it('skipHydration means state stays empty until rehydrate() is called manually', async () => {
    // Simulate a session already on disk from a prior page load.
    globalThis.localStorage.setItem(
      'aura.admin.session',
      JSON.stringify({ state: { token: 'stored-tok', admin: { id: 3, name: 'Zoé' } }, version: 0 }),
    );
    // A freshly-created store never auto-reads storage — this is what makes it SSR-safe.
    expect(useAdminAuth.getState().token).toBeNull();
    expect(useAdminAuth.getState().hasHydrated).toBe(false);

    await useAdminAuth.persist.rehydrate();

    expect(useAdminAuth.getState().token).toBe('stored-tok');
    expect(useAdminAuth.getState().admin).toMatchObject({ name: 'Zoé' });
    expect(useAdminAuth.getState().hasHydrated).toBe(true);
  });
});
```

- [ ] **Step 6: Run to verify the new test fails**

Run: `npm run test -- admin-auth-store.test.js` (from `web/`)
Expected: FAIL — cannot find module `./admin-auth-store` (file doesn't exist yet).

- [ ] **Step 7: Create the store**

Create `web/lib/admin-auth-store.js`:

```javascript
'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { setAuthToken } from './api';

/**
 * Admin identity store — a separate token slot from any client-facing auth
 * store (e.g. a future `web/lib/auth-store.js` for client login). Admin and
 * client sessions must never share storage: this store owns its own
 * `localStorage` key (`aura.admin.session`) and is never imported by
 * client-facing (non-`/admin`) pages.
 *
 * `skipHydration: true` + a manual `useAdminAuth.persist.rehydrate()` call
 * (done once, by `AdminAuthGate` — Task 14) avoids a server/client hydration
 * mismatch: the server has no `localStorage`, so auto-hydrating during store
 * creation would render one thing during SSR and flip to another on the
 * client on the very first paint.
 */
export const useAdminAuth = create(
  persist(
    (set) => ({
      token: null,
      admin: null,
      hasHydrated: false,
      setSession: (token, admin) => {
        setAuthToken(token);
        set({ token, admin });
      },
      signOut: () => {
        setAuthToken(null);
        set({ token: null, admin: null });
      },
      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
    }),
    {
      name: 'aura.admin.session',
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (state) => ({ token: state.token, admin: state.admin }),
      onRehydrateStorage: () => (state) => {
        if (state?.token) setAuthToken(state.token);
        state?.setHasHydrated(true);
      },
    },
  ),
);
```

- [ ] **Step 8: Run to verify all tests pass**

Run: `npm run test -- admin-auth-store.test.js` (from `web/`)
Expected: PASS (4 tests).

Then run the full web suite once to confirm nothing else broke: `npm run test` (from `web/`). Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add web/lib/admin-auth-store.js web/lib/admin-auth-store.test.js web/lib/api.js web/lib/api.test.js
git commit -m "feat(web): add admin identity store and authenticated blob fetches"
```

---

## Task 14: Web — login page + auth gate + layout wiring

**Files:**
- Create: `web/app/admin/connexion/page.jsx`
- Create: `web/components/admin/AdminAuthGate.jsx`
- Modify: `web/app/admin/layout.jsx`
- Modify: `web/components/layout/AdminTopbar.jsx`

**Design note — why `AdminAuthGate` also owns the sidebar/topbar, not just the redirect.** `web/app/admin/connexion/page.jsx` is necessarily a child route of `web/app/admin/layout.jsx` in the Next.js App Router — there is no way to serve `/admin/connexion` without also passing through `app/admin/layout.jsx`, short of restructuring every other admin route into a route group, which is out of scope and would touch every file in Part C. If `layout.jsx` unconditionally renders `<AdminSidebar/>`/`<AdminTopbar/>` around `{children}` (as it does today) and only wraps the *content* in a guard, an unauthenticated visitor hitting `/admin/connexion` would see the full authenticated-looking admin shell (sidebar nav, topbar search, notification bell) around the login form — which is both a confusing login experience and an unnecessary leak of the admin nav structure. So `layout.jsx` is reduced to a one-line delegate, and `AdminAuthGate` becomes responsible for the pathname check, the hydration/redirect logic, *and* conditionally rendering the shell — the login route renders bare, every other route renders inside the full shell once (and only once) a token is present.

There is no React component-rendering test harness in this repo (`web/vitest.config.mjs` runs with `environment: 'node'`, and `web/package.json` has no `@testing-library/react`/jsdom) — this matches how Plan 01/02's own page work was verified (no component tests exist anywhere in `web/app` today). Verification for this task and every remaining web task in this plan is `npm run lint` + `npm run build` (both catch import errors, undefined-component errors, and Next.js prerendering failures) plus a manual click-through, not a new test file. Introducing a component-test harness is out of scope for this plan.

- [ ] **Step 1: Create the auth gate**

Create `web/components/admin/AdminAuthGate.jsx`:

```jsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAdminAuth } from '@/lib/admin-auth-store';
import AdminSidebar from '@/components/layout/AdminSidebar';
import AdminTopbar from '@/components/layout/AdminTopbar';

const LOGIN_PATH = '/admin/connexion';

/**
 * Owns admin route protection AND the admin shell (sidebar/topbar) — see the
 * design note in Task 14 of the admin-wiring plan for why the shell lives
 * here instead of directly in `app/admin/layout.jsx`: the login page is
 * necessarily nested under that layout and must render bare.
 */
export default function AdminAuthGate({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [hydrated, setHydrated] = useState(false);
  const token = useAdminAuth((s) => s.token);

  useEffect(() => {
    useAdminAuth.persist.rehydrate();
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (!token && pathname !== LOGIN_PATH) router.replace(LOGIN_PATH);
    if (token && pathname === LOGIN_PATH) router.replace('/admin');
  }, [hydrated, token, pathname, router]);

  if (pathname === LOGIN_PATH) return children;

  // Either still reading localStorage, or redirecting to /admin/connexion —
  // render nothing rather than a flash of the shell (or of empty content).
  if (!hydrated || !token) return null;

  return (
    <div className="admin">
      <AdminSidebar />
      <div className="admin-main">
        <AdminTopbar />
        <div className="admin-content">{children}</div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Reduce the layout to a delegate**

Replace `web/app/admin/layout.jsx` in full:

```jsx
import AdminAuthGate from '@/components/admin/AdminAuthGate';

export const metadata = { title: 'Aura — Administration' };

export default function AdminLayout({ children }) {
  return <AdminAuthGate>{children}</AdminAuthGate>;
}
```

- [ ] **Step 3: Build the login page**

Create `web/app/admin/connexion/page.jsx`:

```jsx
'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api, ApiError } from '@/lib/api';
import { useAdminAuth } from '@/lib/admin-auth-store';
import { Lotus } from '@/components/ui/Lotus';

export default function AdminConnexionPage() {
  const setSession = useAdminAuth((s) => s.setSession);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);

  // No router.replace('/admin') here on success: AdminAuthGate already redirects
  // away from /admin/connexion the moment `token` becomes non-null (it re-renders
  // on every useAdminAuth change), so there is exactly one place that decides
  // where an authenticated admin lands.
  const loginMutation = useMutation({
    mutationFn: () => api.post('/admin/login', { email, password }),
    onSuccess: (res) => setSession(res.data.token, res.data.user),
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Une erreur est survenue.'),
  });

  const submit = (e) => {
    e.preventDefault();
    setError(null);
    loginMutation.mutate();
  };

  return (
    <div className="center" style={{ minHeight: '100vh', flexDirection: 'column', gap: 24, padding: 24 }}>
      <div className="row gap-2">
        <Lotus size={28} color="var(--violet-2)" />
        <span className="h-3">Aura <span className="tiny muted">admin</span></span>
      </div>
      <form onSubmit={submit} className="card card-pad" style={{ width: '100%', maxWidth: 380 }}>
        <h1 className="h-3" style={{ marginBottom: 6 }}>Connexion administrateur</h1>
        <p className="small" style={{ marginBottom: 20 }}>Réservé aux membres de l'équipe Aura.</p>
        {error && (
          <div className="note tint-violet" style={{ marginBottom: 16, color: 'var(--danger)' }}>{error}</div>
        )}
        <div className="field">
          <label>Email</label>
          <input
            className="input" type="email" required autoComplete="username"
            value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vous@aura.io"
          />
        </div>
        <div className="field" style={{ marginTop: 12 }}>
          <label>Mot de passe</label>
          <input
            className="input" type="password" required autoComplete="current-password"
            value={password} onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <button type="submit" className="btn btn-primary btn-block" style={{ marginTop: 20 }} disabled={loginMutation.isPending}>
          {loginMutation.isPending ? 'Connexion…' : 'Se connecter'}
        </button>
      </form>
    </div>
  );
}
```

This calls the already-complete `POST /api/admin/login` (`server/src/auth/admin-auth/admin-auth.controller.ts`, read in the architecture note at the top of this plan): 401 on wrong credentials, 403 if the account exists but `is_admin` is false, 200 with `{ user, token, token_type, expires_in }` on success — `ApiError.message` already carries the backend's French error string (`"Les identifiants sont incorrects."` / `"Vous n'êtes pas autorisé à vous connecter en tant qu'administrateur."`) straight through to the `error` state, no re-mapping needed.

- [ ] **Step 4: Add a sign-out control to the topbar**

The existing `AdminTopbar` hardcodes `<Avatar name="Admin Aura" .../>` and has no way to end a session — once `AdminAuthGate` can start one, there needs to be a way to stop it. Replace `web/components/layout/AdminTopbar.jsx` in full:

```jsx
'use client';
import { usePathname, useRouter } from 'next/navigation';
import { useUI } from '@/lib/store';
import { useAdminAuth } from '@/lib/admin-auth-store';
import { Icon } from '@/components/ui/Icon';
import { Avatar } from '@/components/ui/Avatar';
import { ADMIN_NAV } from './AdminSidebar';

function titleFor(pathname) {
  for (const g of ADMIN_NAV) for (const it of g.items) {
    if (it.exact ? pathname === it.href : pathname === it.href || pathname.startsWith(it.href + '/')) return it.label;
  }
  return 'Administration';
}

export default function AdminTopbar() {
  const pathname = usePathname();
  const router = useRouter();
  const open = useUI((s) => s.openModal);
  const admin = useAdminAuth((s) => s.admin);
  const signOut = useAdminAuth((s) => s.signOut);

  const handleSignOut = () => {
    signOut();
    router.replace('/admin/connexion');
  };

  return (
    <div className="admin-topbar">
      <span className="page-title">{titleFor(pathname)}</span>
      <div className="spacer" />
      <div className="input-search hide-mobile" style={{ width: 260, position: 'relative' }}>
        <span className="ic"><Icon name="search" size={16} /></span>
        <input className="input" style={{ height: 42 }} placeholder="Rechercher…" />
      </div>
      <button className="btn btn-icon btn-ghost" onClick={() => open('sendNotification')} title="Envoyer une notification"><Icon name="bell" size={18} /></button>
      <button className="btn btn-icon btn-ghost" onClick={handleSignOut} title="Se déconnecter"><Icon name="logout" size={18} /></button>
      <Avatar name={admin?.name || 'Admin Aura'} size={36} tone="violet" />
    </div>
  );
}
```

- [ ] **Step 5: Verify**

Run (from `web/`): `npm run lint` then `npm run build`.
Expected: both succeed — no unresolved imports (`@/components/admin/AdminAuthGate`, `@/lib/admin-auth-store`), no unused-import lint errors (`AdminSidebar`/`AdminTopbar` are no longer imported by `layout.jsx`, only by `AdminAuthGate.jsx`).

Manual walkthrough (`npm run dev`, backend running with at least one seeded admin — e.g. via `POST /api/admin/register`):
1. Visit `/admin` while signed out → redirected to `/admin/connexion`, bare page (no sidebar/topbar).
2. Submit wrong credentials → inline French error, stays on the page.
3. Submit correct credentials → redirected to `/admin`, full shell now visible, avatar shows the real admin's name.
4. Refresh the page → still signed in (localStorage rehydration), no redirect flash to `/admin/connexion`.
5. Click the sign-out icon in the topbar → redirected to `/admin/connexion`, refreshing `/admin` again now redirects back to `/admin/connexion`.

- [ ] **Step 6: Commit**

```bash
git add web/components/admin/AdminAuthGate.jsx web/app/admin/layout.jsx web/app/admin/connexion/page.jsx web/components/layout/AdminTopbar.jsx
git commit -m "feat(web): gate the admin panel behind a real login, add sign-out"
```

---

Part C starts here — every remaining task wires one mock-data admin screen to its now-guarded backend. All of it sits behind `AdminAuthGate` (Task 14), so every `api.*` call in Part C automatically carries the admin bearer token via `setAuthToken` — no page in Part C needs to think about auth itself.

**Two conventions established in Task 15 and reused, not re-derived, in every task after it:**
1. **React-query key shape:** `['admin', '<resource>']` for a list, `['admin', '<resource>', id]` for a single record. Every mutation's `onSuccess` calls `queryClient.invalidateQueries({ queryKey: ['admin', '<resource>'] })` to refetch the list rather than hand-patching local state.
2. **`FormModal`/`ConfirmModal` optimistic-close caveat:** both generic modals (`web/components/modals/{FormModal,ConfirmModal}.jsx`, not modified by this plan) call `onSubmit`/`onConfirm` and then immediately `close(id)` — they do not `await` the callback or keep the modal open on error. Wiring a real async mutation into `payload.onSubmit`/`payload.onConfirm` therefore means the modal always closes optimistically; a failure (e.g. a 422) surfaces a moment later as a toast, not as an inline field error. This is a pre-existing property of the shared modal system (used the same way by every other domain's admin/client wiring, not something this plan's pages do differently) and redesigning `FormModal`/`ConfirmModal` to `await` and stay open on error is out of scope here — it would change behavior for every modal in the app, not just the admin ones this plan touches. Each task below passes `successToast: null` to the modal preset and fires its own, more specific toast from the mutation's `onSuccess`/`onError` instead of relying on the modal's generic one.
3. Edit modals pre-fill `field.value` from the real record (`fields.map((f) => ({ ...f, value: record[f.name] }))`) — the pre-wiring mock UI never did this (edit forms always opened blank), which was fine for a fake submit but would be a regression now that submits are real.

## Task 15: Web — disciplines admin page

**Files:**
- Modify: `web/app/admin/disciplines/page.jsx`

Real DTO fields (`server/src/disciplines/dto/create-discipline.dto.ts`): `nom`, `tonalite`, `glyphe`, `accroche` — all required strings, no `slug` (server-derived from `nom`), no praticien count (the `Discipline` entity has no relation to `Praticien` at all — `Praticien.specialite` is a free-text column, not a foreign key — so the mock's "praticiens référencés" stat and "la plus suivie" card have zero backend source and are dropped, not just the field names being fixed). `GET /api/disciplines` returns a plain array with **no pagination envelope** (confirmed by `disciplines.e2e-spec.ts`).

- [ ] **Step 1: Replace the page**

Replace `web/app/admin/disciplines/page.jsx` in full:

```jsx
'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHead } from '@/components/ui/PageHead';
import { Icon } from '@/components/ui/Icon';
import { ModalButton } from '@/components/ui/ModalButton';
import { useUI } from '@/lib/store';
import { api } from '@/lib/api';

const TONES = ['violet', 'sky', 'sage', 'gold'];

const FIELDS = [
  { name: 'nom', label: 'Nom', type: 'text', required: true },
  { name: 'tonalite', label: 'Tonalité', type: 'select', options: TONES, required: true },
  { name: 'glyphe', label: 'Glyphe', type: 'text', placeholder: '☾', required: true },
  { name: 'accroche', label: 'Accroche', type: 'text', required: true },
];

export default function AdminDisciplinesPage() {
  const queryClient = useQueryClient();
  const toast = useUI((s) => s.toast);
  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin', 'disciplines'],
    queryFn: () => api.get('/disciplines'),
  });
  const disciplines = data?.data ?? [];
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin', 'disciplines'] });

  const createMutation = useMutation({
    mutationFn: (values) => api.post('/disciplines/create-discipline', values),
    onSuccess: () => { invalidate(); toast('Discipline créée', 'success'); },
    onError: (err) => toast(err.message || 'Erreur lors de la création', 'danger'),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, values }) => api.put(`/disciplines/${id}`, values),
    onSuccess: () => { invalidate(); toast('Discipline mise à jour', 'success'); },
    onError: (err) => toast(err.message || 'Erreur lors de la mise à jour', 'danger'),
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => api.del(`/disciplines/${id}`),
    onSuccess: () => { invalidate(); toast('Discipline supprimée', 'success'); },
    onError: (err) => toast(err.message || 'Erreur lors de la suppression', 'danger'),
  });

  return (
    <>
      <PageHead
        title="Disciplines"
        subtitle={`${disciplines.length} discipline${disciplines.length > 1 ? 's' : ''}`}
        crumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Disciplines' }]}
        actions={
          <ModalButton
            modal="form"
            payload={{
              title: 'Nouvelle discipline', fields: FIELDS,
              submitLabel: 'Créer', successToast: null,
              onSubmit: (values) => createMutation.mutate(values),
            }}
            className="btn btn-primary btn-sm"
          >
            <Icon name="plus" size={15} /> Ajouter une discipline
          </ModalButton>
        }
      />

      {isLoading && <div className="empty"><div className="glyph">❍</div>Chargement…</div>}
      {isError && <div className="empty"><div className="glyph">❍</div>Impossible de charger les disciplines.</div>}

      {!isLoading && !isError && (
        <div className="grid grid-3">
          {disciplines.map((d) => (
            <div key={d.id} className="card card-pad card-hover">
              <div className={`tile-icon glyph-${d.tonalite}`} style={{ fontSize: 22 }}>{d.glyphe}</div>
              <h3 className="h-3" style={{ marginTop: 14 }}>{d.nom}</h3>
              <p className="small" style={{ marginTop: 6, minHeight: 38 }}>{d.accroche}</p>
              <div className="row gap-2" style={{ marginTop: 14 }}>
                <ModalButton
                  modal="form"
                  payload={{
                    title: `Modifier « ${d.nom} »`,
                    fields: FIELDS.map((f) => ({ ...f, value: d[f.name] })),
                    submitLabel: 'Enregistrer', successToast: null,
                    onSubmit: (values) => updateMutation.mutate({ id: d.id, values }),
                  }}
                  className="btn btn-soft btn-sm flex-1"
                >
                  <Icon name="edit" size={14} /> Modifier
                </ModalButton>
                <ModalButton
                  modal="confirm"
                  payload={{
                    title: 'Supprimer la discipline',
                    message: `« ${d.nom} » sera définitivement supprimée.`,
                    confirmLabel: 'Supprimer', danger: true, successToast: null,
                    onConfirm: () => deleteMutation.mutate(d.id),
                  }}
                  className="btn btn-danger-soft btn-sm btn-icon" title="Supprimer"
                >
                  <Icon name="trash" size={14} />
                </ModalButton>
              </div>
            </div>
          ))}
          {disciplines.length === 0 && (
            <div className="empty"><div className="glyph">❍</div>Aucune discipline pour l'instant.</div>
          )}
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 2: Verify**

Run (from `web/`): `npm run lint` then `npm run build`.

Manual walkthrough (backend + web dev servers running, signed in as admin): disciplines grid loads real rows; "Ajouter une discipline" creates one (`nom`/`tonalite`/`glyphe`/`accroche`) and it appears after the toast; "Modifier" opens pre-filled with the real current values and a change persists; "Supprimer" removes the card. Submitting a duplicate `nom` shows the backend's French 422 error as a toast (per the optimistic-close caveat, after the modal has closed).

- [ ] **Step 3: Commit**

```bash
git add web/app/admin/disciplines/page.jsx
git commit -m "feat(web): wire admin disciplines page to the disciplines API"
```

---

## Task 16: Web — events admin pages (list, create, detail)

**Files:**
- Modify: `web/app/admin/evenements/page.jsx`
- Modify: `web/app/admin/evenement/nouveau/page.jsx`
- Modify: `web/app/admin/evenement/[id]/page.jsx`

**Finding beyond what the brief named directly — events have no publish/status mechanism at all.** `CreateEventDto` and `UpdateEventDto` (`server/src/events/dto/{create,update}-event.dto.ts`) have no `status` field, and `EventsController` has no `/publish` or `/archive` route the way `ArticlesController` does. `Event.status` (`server/src/database/entities/event.entity.ts`) defaults to `'brouillon'` at the database level and **cannot be changed through the API at all** — there is no endpoint that writes it. The mock UI's "Publier" buttons (on the create page, and as a `ModalButton modal="approveEvent"` on the detail page) and its hardcoded `<Badge variant="online" dot>Publié</Badge>` hero badge are therefore not just missing real data, they're describing a capability the backend does not have. Both are removed; the detail page shows the real (always-`brouillon`-today) `status` value instead of a fabricated "Publié". This is a real product gap (there is currently no way to make an event visible as anything other than a draft), but adding a publish endpoint is backend scope this plan does not license — it is not one of the guard-table controllers and not the one new streaming route Task 12 was scoped for. Noted here so it isn't silently lost.

**Also dropped, per the plan's own architecture note:** event attendees (no registration/booking model — confirmed no `rendez_vous`/booking table anywhere in `server/src`) and the "Programme" step list (`Event` has no programme/steps/agenda column).

**Convention (first paginated list in Part C, reused by every later list page):** `Event`/`Article`/`Cercle`/`Client`/etc. index endpoints paginate server-side (`parsePagination`, capped at 100 per page — `server/src/common/pagination.ts`). `DataTable` (`web/components/ui/DataTable.jsx`, not modified by this plan) does its own client-side search/sort/pagination over whatever `rows` array it's given — it has no server-pagination prop. Every admin list page in this plan therefore fetches `?per_page=100` (the server's hard cap) once and hands the full page to `DataTable`, rather than trying to bridge two different pagination models. Beyond 100 rows for a single admin resource, the table's search box is the practical way to find something — a real limitation, called out once here rather than in every task.

- [ ] **Step 1: Replace the list page**

Replace `web/app/admin/evenements/page.jsx` in full:

```jsx
'use client';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { PageHead } from '@/components/ui/PageHead';
import { DataTable } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { api } from '@/lib/api';
import { euro, dateFr } from '@/lib/format';

const EVENT_TYPES = ['Retraite', 'Événement', 'Formation', 'Cercle', 'Atelier', 'Sortie'];
const STATUS_TONE = { brouillon: 'neutral', publié: 'success', archivé: 'neutral' };

function whenLabel(dates) {
  if (!dates?.length) return '—';
  return dates.length === 1 ? dateFr(dates[0]) : `${dateFr(dates[0])} – ${dateFr(dates[dates.length - 1])}`;
}

export default function AdminEventsPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin', 'events'],
    queryFn: () => api.get('/events?per_page=100'),
  });
  const events = data?.data ?? [];
  const totalSeats = events.reduce((s, e) => s + (e.nombre_places || 0), 0);

  const columns = [
    { key: 'titre', label: 'Événement', sortable: true, render: (e) => (
      <div>
        <div style={{ fontWeight: 500 }}>{e.titre}</div>
        <div className="tiny">{e.type}</div>
      </div>
    ) },
    { key: 'type', label: 'Type', render: (e) => <Badge variant="neutral">{e.type}</Badge> },
    { key: 'when', label: 'Quand', render: (e) => <span className="small">{whenLabel(e.dates)}</span> },
    { key: 'lieu', label: 'Lieu', sortable: true, render: (e) => <span className="row gap-1 small"><Icon name="pin" size={13} color="var(--muted)" />{e.lieu}</span> },
    { key: 'nombre_places', label: 'Places', sortable: true, render: (e) => <span className="small">{e.nombre_places}</span> },
    { key: 'prix', label: 'Prix', sortable: true, render: (e) => <span className="small">{euro(e.prix)}</span> },
    { key: 'status', label: 'Statut', render: (e) => <Badge variant={STATUS_TONE[e.status] || 'neutral'} dot>{e.status}</Badge> },
  ];

  return (
    <>
      <PageHead
        title="Événements"
        subtitle={isLoading ? 'Chargement…' : `${events.length} événements · ${totalSeats} places au total`}
        crumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Événements' }]}
        actions={<Link href="/admin/evenement/nouveau" className="btn btn-primary btn-sm"><Icon name="plus" size={15} /> Nouvel événement</Link>}
      />

      {isError && <div className="empty"><div className="glyph">❍</div>Impossible de charger les événements.</div>}

      {!isError && (
        <DataTable
          columns={columns}
          rows={events}
          searchKeys={['titre', 'lieu']}
          filters={[{ key: 'type', label: 'Tous les types', options: EVENT_TYPES.map((t) => ({ value: t, label: t })) }]}
          rowHref={(e) => `/admin/evenement/${e.id}`}
          searchPlaceholder="Rechercher un événement, un lieu…"
          pageSize={8}
        />
      )}
    </>
  );
}
```

- [ ] **Step 2: Replace the create page**

Replace `web/app/admin/evenement/nouveau/page.jsx` in full:

```jsx
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { PageHead } from '@/components/ui/PageHead';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { api } from '@/lib/api';

const KINDS = ['Retraite', 'Événement', 'Formation', 'Cercle', 'Atelier', 'Sortie'];

export default function NewEventPage() {
  const router = useRouter();
  const [titre, setTitre] = useState('');
  const [type, setType] = useState('');
  const [dates, setDates] = useState(['']);
  const [lieu, setLieu] = useState('');
  const [prix, setPrix] = useState('');
  const [nombrePlaces, setNombrePlaces] = useState('');
  const [description, setDescription] = useState('');
  const [hosts, setHosts] = useState([]);
  const [error, setError] = useState(null);

  const { data: praticiensData } = useQuery({
    queryKey: ['admin', 'praticiens', 'picker'],
    queryFn: () => api.get('/praticiens?per_page=100'),
  });
  const praticiens = praticiensData?.data ?? [];

  const toggleHost = (id) => setHosts((h) => (h.includes(id) ? h.filter((x) => x !== id) : [...h, id]));
  const addDate = () => setDates((d) => [...d, '']);
  const removeDate = (i) => setDates((d) => d.filter((_, idx) => idx !== i));
  const setDateAt = (i, val) => setDates((d) => d.map((x, idx) => (idx === i ? val : x)));

  const createMutation = useMutation({
    mutationFn: () => api.post('/events/create-event', {
      titre, type, dates: dates.filter(Boolean), lieu,
      prix: Number(prix) || 0, nombre_places: Number(nombrePlaces) || 0,
      description, animateurs: hosts.map((id) => ({ id })),
    }),
    onSuccess: (res) => router.push(`/admin/evenement/${res.data.id}`),
    onError: (err) => setError(err.message || 'Erreur lors de la création'),
  });

  const submit = (e) => {
    e.preventDefault();
    setError(null);
    createMutation.mutate();
  };

  return (
    <form onSubmit={submit}>
      <PageHead
        title="Nouvel événement"
        subtitle="Créez une retraite, un atelier ou un cercle et publiez-le sur Aura."
        crumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Événements', href: '/admin/evenements' }, { label: 'Nouveau' }]}
        actions={<a href="/admin/evenements" className="btn btn-soft btn-sm">Annuler</a>}
      />

      {error && <div className="note tint-violet" style={{ marginBottom: 16, color: 'var(--danger)' }}>{error}</div>}

      <div className="grid" style={{ gridTemplateColumns: '1.6fr 1fr', gap: 20 }}>
        <div className="stack gap-5">
          {/* Infos */}
          <div className="card card-pad">
            <h3 className="h-3" style={{ marginBottom: 16 }}>Informations générales</h3>
            <div className="field">
              <label>Titre de l'événement</label>
              <input className="input" required value={titre} onChange={(e) => setTitre(e.target.value)} placeholder="Retraite équinoxe — Vercors" />
            </div>
            <div className="grid grid-2 mt-3">
              <div className="field">
                <label>Type</label>
                <select className="input" required value={type} onChange={(e) => setType(e.target.value)}>
                  <option value="" disabled>Choisir un type…</option>
                  {KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Lieu</label>
                <input className="input" required value={lieu} onChange={(e) => setLieu(e.target.value)} placeholder="Drôme · 26" />
              </div>
            </div>
            <div className="grid grid-2 mt-3">
              <div className="field">
                <label>Prix (€)</label>
                <input className="input" type="number" min="0" required value={prix} onChange={(e) => setPrix(e.target.value)} placeholder="480" />
              </div>
              <div className="field">
                <label>Places</label>
                <input className="input" type="number" min="1" required value={nombrePlaces} onChange={(e) => setNombrePlaces(e.target.value)} placeholder="12" />
              </div>
            </div>
            <div className="field mt-3">
              <label>Dates</label>
              <div className="stack gap-2">
                {dates.map((d, i) => (
                  <div key={i} className="row gap-2">
                    <input className="input" type="date" required value={d} onChange={(ev) => setDateAt(i, ev.target.value)} />
                    <button type="button" className="btn btn-icon btn-ghost btn-sm" onClick={() => removeDate(i)} disabled={dates.length === 1} aria-label="Supprimer la date"><Icon name="trash" size={15} /></button>
                  </div>
                ))}
              </div>
              <button type="button" className="btn btn-soft btn-sm" style={{ marginTop: 8 }} onClick={addDate}><Icon name="plus" size={14} /> Ajouter une date</button>
            </div>
          </div>

          {/* Description */}
          <div className="card card-pad">
            <h3 className="h-3" style={{ marginBottom: 16 }}>Présentation</h3>
            <div className="field">
              <label>Description</label>
              <textarea className="input" rows={6} required value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Décrivez l'expérience, le cadre, ce qui est inclus…" />
            </div>
          </div>
        </div>

        {/* Side: hosts */}
        <div className="stack gap-5">
          <div className="card card-pad">
            <h3 className="h-3" style={{ marginBottom: 6 }}>Animé par</h3>
            <p className="small" style={{ marginBottom: 14 }}>Sélectionnez un ou plusieurs praticiens hôtes (facultatif).</p>
            <div className="stack gap-2">
              {praticiens.slice(0, 20).map((p) => {
                const active = hosts.includes(p.id);
                return (
                  <button key={p.id} type="button" onClick={() => toggleHost(p.id)}
                    className={`row gap-3 card-line card-pad ${active ? 'active' : ''}`}
                    style={{ textAlign: 'left', borderColor: active ? 'var(--violet-2)' : 'var(--line)', background: active ? 'var(--violet-1)' : 'transparent', cursor: 'pointer' }}>
                    <Avatar name={`${p.firstname} ${p.lastname}`} size={36} />
                    <div className="flex-1">
                      <div style={{ fontWeight: 500, fontSize: 14 }}>{p.firstname} {p.lastname}</div>
                      <div className="tiny">{p.specialite} · {p.ville}</div>
                    </div>
                    {active && <Icon name="checkCircle" size={18} color="var(--violet-2)" />}
                  </button>
                );
              })}
            </div>
            {hosts.length > 0 && <div className="tiny" style={{ marginTop: 12 }}>{hosts.length} hôte{hosts.length > 1 ? 's' : ''} sélectionné{hosts.length > 1 ? 's' : ''}</div>}
          </div>

          <div className="card card-pad">
            <button type="submit" className="btn btn-primary btn-block" disabled={createMutation.isPending}>
              <Icon name="check" size={15} /> {createMutation.isPending ? 'Création…' : "Créer l'événement"}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
```

Every event created through this form lands as `status: 'brouillon'` — there is no "publish" step to offer (see the finding above), so the page has exactly one submit action instead of the original mock's two (brouillon vs publié).

- [ ] **Step 3: Replace the detail page**

Replace `web/app/admin/evenement/[id]/page.jsx` in full:

```jsx
'use client';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHead } from '@/components/ui/PageHead';
import { StatCard } from '@/components/ui/StatCard';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { ModalButton } from '@/components/ui/ModalButton';
import { api } from '@/lib/api';
import { useUI } from '@/lib/store';
import { euro, dateFr } from '@/lib/format';

const STATUS_TONE = { brouillon: 'neutral', publié: 'success', archivé: 'neutral' };

export default function AdminEventDetail() {
  const { id } = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const toast = useUI((s) => s.toast);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin', 'events', id],
    queryFn: () => api.get(`/events/${id}`),
  });
  const e = data?.data;

  const updateMutation = useMutation({
    mutationFn: (values) => api.put(`/events/${id}`, {
      ...values,
      prix: values.prix !== undefined ? Number(values.prix) : undefined,
      nombre_places: values.nombre_places !== undefined ? Number(values.nombre_places) : undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'events', id] });
      toast('Événement mis à jour', 'success');
    },
    onError: (err) => toast(err.message || 'Erreur', 'danger'),
  });
  const deleteMutation = useMutation({
    mutationFn: () => api.del(`/events/${id}`),
    onSuccess: () => { toast('Événement supprimé', 'success'); router.push('/admin/evenements'); },
    onError: (err) => toast(err.message || 'Erreur', 'danger'),
  });

  if (isLoading) return <div className="empty"><div className="glyph">❍</div>Chargement…</div>;
  if (isError || !e) {
    return (
      <>
        <PageHead title="Événement introuvable" crumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Événements', href: '/admin/evenements' }, { label: 'Introuvable' }]} />
        <div className="empty"><div className="glyph">❍</div>Cet événement n'existe pas.<div className="mt-3"><Link href="/admin/evenements" className="btn btn-soft btn-sm">Retour aux événements</Link></div></div>
      </>
    );
  }

  const hosts = e.animateurs ?? [];

  return (
    <>
      <PageHead
        title={e.titre}
        subtitle={`${e.type} · ${e.lieu}`}
        crumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Événements', href: '/admin/evenements' }, { label: e.titre }]}
        actions={<>
          <ModalButton modal="editField" payload={{
            title: "Modifier l'événement",
            fields: [
              { name: 'titre', label: 'Titre', type: 'text', value: e.titre },
              { name: 'lieu', label: 'Lieu', type: 'text', value: e.lieu },
              { name: 'prix', label: 'Prix (€)', type: 'number', value: e.prix },
              { name: 'nombre_places', label: 'Places', type: 'number', value: e.nombre_places },
              { name: 'description', label: 'Description', type: 'textarea', value: e.description },
            ],
            submitLabel: 'Enregistrer', successToast: null,
            onSubmit: (values) => updateMutation.mutate(values),
          }} className="btn btn-soft btn-sm"><Icon name="edit" size={15} /> Modifier</ModalButton>
          <ModalButton modal="confirm" payload={{
            title: "Supprimer l'événement",
            message: `« ${e.titre} » sera définitivement supprimé.`,
            confirmLabel: 'Supprimer', danger: true, successToast: null,
            onConfirm: () => deleteMutation.mutate(),
          }} className="btn btn-danger-soft btn-sm"><Icon name="trash" size={15} /> Supprimer</ModalButton>
        </>}
      />

      {/* Hero summary */}
      <section className="aurora-dark grain" style={{ '--orb-x': '70%', '--orb-y': '20%', '--orb-1': '#C4B0E8', '--orb-2': '#7B5FCF', padding: '32px 32px', borderRadius: 20, marginBottom: 22 }}>
        <div className="row gap-2" style={{ marginBottom: 10 }}>
          <Badge variant="featured">{e.type}</Badge>
          <Badge variant={STATUS_TONE[e.status] || 'neutral'} dot>{e.status}</Badge>
        </div>
        <h2 className="h-1 serif" style={{ color: 'white', marginBottom: 10 }}>{e.titre}</h2>
        <div className="row gap-4 wrap small" style={{ color: 'rgba(255,255,255,.85)' }}>
          <span className="row gap-1"><Icon name="calendar" size={15} color="rgba(255,255,255,.7)" />{(e.dates || []).map(dateFr).join(' · ')}</span>
          <span className="row gap-1"><Icon name="pin" size={15} color="rgba(255,255,255,.7)" />{e.lieu}</span>
          <span className="row gap-1"><Icon name="users" size={15} color="rgba(255,255,255,.7)" />{e.nombre_places} places</span>
          <span className="row gap-1"><Icon name="euro" size={15} color="rgba(255,255,255,.7)" />{euro(e.prix)}</span>
        </div>
      </section>

      <div className="grid" style={{ gridTemplateColumns: '1.6fr 1fr', gap: 20 }}>
        <div className="stack gap-5">
          {/* Description */}
          <div className="card card-pad">
            <h3 className="h-3" style={{ marginBottom: 12 }}>Présentation</h3>
            {(e.description || '').split('\n\n').map((p, i) => <p key={i} className="body" style={{ marginBottom: 10 }}>{p}</p>)}
          </div>
        </div>

        {/* Side */}
        <div className="stack gap-5">
          <StatCard label="Capacité" value={`${e.nombre_places} places`} icon="users" />

          <div className="card card-pad">
            <h3 className="h-3" style={{ marginBottom: 16 }}>Détails</h3>
            <dl className="dl">
              <dt>Type</dt><dd>{e.type}</dd>
              <dt>Dates</dt><dd>{(e.dates || []).map(dateFr).join(', ')}</dd>
              <dt>Lieu</dt><dd>{e.lieu}</dd>
              <dt>Prix</dt><dd><strong>{euro(e.prix)}</strong></dd>
              <dt>Capacité</dt><dd>{e.nombre_places} places</dd>
              <dt>Statut</dt><dd><Badge variant={STATUS_TONE[e.status] || 'neutral'}>{e.status}</Badge></dd>
            </dl>
          </div>

          <div className="card card-pad">
            <h3 className="h-3" style={{ marginBottom: 16 }}>Animé par</h3>
            {hosts.length === 0 && <p className="small">Aucun animateur assigné.</p>}
            <div className="stack gap-3">
              {hosts.map((h) => (
                <Link key={h.id} href={`/admin/praticien/${h.id}`} className="row gap-3">
                  <Avatar name={`${h.firstname} ${h.lastname}`} size={44} />
                  <div className="flex-1">
                    <div style={{ fontWeight: 500, fontSize: 14 }}>{h.firstname} {h.lastname}</div>
                    <div className="tiny">{h.specialite} · {h.ville} {h.pivot?.role ? `· ${h.pivot.role}` : ''}</div>
                  </div>
                  <Icon name="chevronRight" size={16} color="var(--muted)" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
```

Dropped from the original mock: the "Programme" card (no backend field), the "Participants" table and its fake attendee list drawn from `clients.slice(0, filled)` (no registration model — nothing to show), the "Remplissage" percentage card (same reason), and the "Publier"/"Annuler l'événement" actions (no publish endpoint; a real cancel-with-refund flow doesn't exist either — deleting the event is the only real destructive action available, already wired above).

- [ ] **Step 4: Verify**

Run (from `web/`): `npm run lint` then `npm run build`.

Manual walkthrough: events list loads real rows with real capacity/price/status; "Nouvel événement" creates a real event with one or more real dates and optional hosts, then redirects straight to its detail page; the detail page shows the real status (brouillon), real dates, real animateurs with their pivot role; "Modifier" persists a change; "Supprimer" removes the event and returns to the list.

- [ ] **Step 5: Commit**

```bash
git add web/app/admin/evenements/page.jsx web/app/admin/evenement/nouveau/page.jsx web/app/admin/evenement/[id]/page.jsx
git commit -m "feat(web): wire admin events pages to the events API, drop fields with no backend"
```

---

## Task 17: Web — content (articles) admin pages (list, create)

**Files:**
- Modify: `web/app/admin/contenu/page.jsx`
- Modify: `web/app/admin/contenu/nouveau/page.jsx`

Only the list and create pages are named in scope (there is no `contenu/[id]` detail/edit page in the repo, and this plan doesn't add one) — editing an existing article's metadata (including its body) happens through a `ModalButton` on the list row, which is enough surface area for a "modifier" action without introducing a new route. Real `CreateArticleDto` fields (`server/src/articles/dto/create-article.dto.ts`): `titre`, `categorie`, `tonalite`, `extrait`, `corps`, `status` (`brouillon | en_revue | publié | archivé`, required — every article needs an explicit status, there is no implicit default from the DTO's point of view even though the create form defaults its select to `brouillon`), `auteur`, `temps_lecture` (int ≥ 1), and optional `image_couverture` / `meta_description` / `mot_clef` / `date_publication`. `slug` is **not** a client field — it's server-derived from `titre` (confirmed by Task 1's e2e test). `image_couverture` is a plain string column (a URL), not a file upload — `ArticlesController` has no `FilesInterceptor` anywhere, so the mock's "glissez une image" dropzone-with-a-demo-toast was never backed by anything real even as a mock; it's replaced with a plain URL text field, matching what the column actually is.

- [ ] **Step 1: Replace the list page**

Replace `web/app/admin/contenu/page.jsx` in full:

```jsx
'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/Button';
import { PageHead } from '@/components/ui/PageHead';
import { DataTable } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { ModalButton } from '@/components/ui/ModalButton';
import { useUI } from '@/lib/store';
import { api } from '@/lib/api';
import { dateFr } from '@/lib/format';

const CAT_TONE = { Guide: 'info', Discipline: 'featured', Conseils: 'success', 'Communauté': 'warning', 'Bien-être': 'novice' };
const STATUS_TONE = { brouillon: 'neutral', en_revue: 'warning', publié: 'success', archivé: 'neutral' };
const STATUS_OPTIONS = ['brouillon', 'en_revue', 'publié', 'archivé'];

const editFields = (a) => [
  { name: 'titre', label: 'Titre', type: 'text', value: a.titre, required: true },
  { name: 'categorie', label: 'Catégorie', type: 'text', value: a.categorie, required: true },
  { name: 'tonalite', label: 'Tonalité', type: 'text', value: a.tonalite, required: true },
  { name: 'auteur', label: 'Auteur', type: 'text', value: a.auteur, required: true },
  { name: 'temps_lecture', label: 'Temps de lecture (min)', type: 'number', value: a.temps_lecture, required: true },
  { name: 'status', label: 'Statut', type: 'select', options: STATUS_OPTIONS, value: a.status, required: true },
  { name: 'extrait', label: 'Extrait', type: 'textarea', value: a.extrait, required: true },
  { name: 'corps', label: 'Corps', type: 'textarea', value: a.corps, required: true },
];

export default function AdminContentPage() {
  const queryClient = useQueryClient();
  const toast = useUI((s) => s.toast);
  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin', 'articles'],
    queryFn: () => api.get('/articles?per_page=100'),
  });
  const articles = data?.data ?? [];
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin', 'articles'] });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }) => api.put(`/articles/${id}`, { ...values, temps_lecture: Number(values.temps_lecture) }),
    onSuccess: () => { invalidate(); toast('Article mis à jour', 'success'); },
    onError: (err) => toast(err.message || 'Erreur', 'danger'),
  });
  const publishMutation = useMutation({
    mutationFn: (id) => api.put(`/articles/${id}/publish`),
    onSuccess: () => { invalidate(); toast('Article publié', 'success'); },
    onError: (err) => toast(err.message || 'Erreur', 'danger'),
  });
  const archiveMutation = useMutation({
    mutationFn: (id) => api.put(`/articles/${id}/archive`),
    onSuccess: () => { invalidate(); toast('Article archivé', 'success'); },
    onError: (err) => toast(err.message || 'Erreur', 'danger'),
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => api.del(`/articles/${id}`),
    onSuccess: () => { invalidate(); toast('Article supprimé', 'success'); },
    onError: (err) => toast(err.message || 'Erreur', 'danger'),
  });

  const columns = [
    { key: 'titre', label: 'Titre', render: (a) => <span className="table-cell-main" style={{ display: 'block', maxWidth: 320 }}>{a.titre}</span> },
    { key: 'categorie', label: 'Catégorie', width: 130, render: (a) => <Badge variant={CAT_TONE[a.categorie] || 'neutral'}>{a.categorie}</Badge> },
    { key: 'auteur', label: 'Auteur', width: 150, render: (a) => <span className="small">{a.auteur}</span> },
    { key: 'temps_lecture', label: 'Lecture', width: 90, render: (a) => <span className="tiny">{a.temps_lecture} min</span> },
    { key: 'created_at', label: 'Créé le', width: 120, sortable: true, render: (a) => <span className="small">{dateFr(a.created_at)}</span> },
    { key: 'status', label: 'Statut', width: 120, render: (a) => <Badge variant={STATUS_TONE[a.status] || 'neutral'} dot>{a.status}</Badge> },
    {
      key: 'actions', label: '', width: 190,
      render: (a) => (
        <div className="row gap-1" onClick={(ev) => ev.stopPropagation()}>
          {(a.status === 'brouillon' || a.status === 'en_revue') && (
            <button className="btn btn-soft btn-sm" onClick={() => publishMutation.mutate(a.id)}>Publier</button>
          )}
          {a.status === 'publié' && (
            <button className="btn btn-soft btn-sm" onClick={() => archiveMutation.mutate(a.id)}>Archiver</button>
          )}
          <ModalButton modal="form" payload={{
            title: `Modifier « ${a.titre} »`, fields: editFields(a), submitLabel: 'Enregistrer', successToast: null,
            onSubmit: (values) => updateMutation.mutate({ id: a.id, values }),
          }} className="btn btn-soft btn-sm btn-icon" as="div" title="Modifier">
            <Icon name="edit" size={15} />
          </ModalButton>
          <ModalButton modal="confirm" payload={{
            title: "Supprimer l'article", message: `« ${a.titre} » sera définitivement supprimé.`,
            confirmLabel: 'Supprimer', danger: true, successToast: null,
            onConfirm: () => deleteMutation.mutate(a.id),
          }} className="btn btn-danger-soft btn-sm btn-icon" as="div" title="Supprimer">
            <Icon name="trash" size={15} />
          </ModalButton>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHead
        title="Journal & contenus"
        subtitle={isLoading ? 'Chargement…' : `${articles.length} article${articles.length > 1 ? 's' : ''}`}
        crumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Contenus' }]}
        actions={<Button href="/admin/contenu/nouveau" variant="primary" size="sm"><Icon name="plus" size={15} /> Nouvel article</Button>}
      />

      {isError && <div className="empty"><div className="glyph">❍</div>Impossible de charger les articles.</div>}

      {!isError && (
        <DataTable
          columns={columns}
          rows={articles}
          searchKeys={['titre', 'auteur', 'categorie']}
          filters={[
            { key: 'categorie', label: 'Toutes les catégories', options: [...new Set(articles.map((a) => a.categorie))].map((c) => ({ value: c, label: c })) },
            { key: 'status', label: 'Tous les statuts', options: STATUS_OPTIONS.map((s) => ({ value: s, label: s })) },
          ]}
          rowHref={(a) => `/blog/${a.slug}`}
          searchPlaceholder="Rechercher un article…"
          toolbar={<Button href="/admin/contenu/nouveau" variant="soft" size="sm"><Icon name="plus" size={15} /> Nouvel article</Button>}
          pageSize={8}
        />
      )}
    </>
  );
}
```

`rowHref` still points at the public `/blog/[slug]` page (Plan 02 scope, a dependency of this plan) — real now that `slug` is a genuine server field, though a draft/en_revue article's public page may not resolve until it's published; that's a legitimate reflection of real state, not a broken link this plan introduces.

- [ ] **Step 2: Replace the create page**

Replace `web/app/admin/contenu/nouveau/page.jsx` in full:

```jsx
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { PageHead } from '@/components/ui/PageHead';
import { Icon } from '@/components/ui/Icon';
import { api } from '@/lib/api';

const CATEGORIES = ['Guide', 'Discipline', 'Conseils', 'Communauté', 'Bien-être'];
const TONES = ['violet', 'sky', 'sage', 'gold'];
const STATUSES = ['brouillon', 'en_revue', 'publié', 'archivé'];

export default function NewArticlePage() {
  const router = useRouter();
  const [titre, setTitre] = useState('');
  const [categorie, setCategorie] = useState(CATEGORIES[0]);
  const [tonalite, setTonalite] = useState(TONES[0]);
  const [extrait, setExtrait] = useState('');
  const [corps, setCorps] = useState('');
  const [status, setStatus] = useState('brouillon');
  const [auteur, setAuteur] = useState("L'équipe Aura");
  const [tempsLecture, setTempsLecture] = useState('');
  const [imageCouverture, setImageCouverture] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [motClef, setMotClef] = useState('');
  const [error, setError] = useState(null);

  const createMutation = useMutation({
    mutationFn: () => api.post('/articles/create-article', {
      titre, categorie, tonalite, extrait, corps, status, auteur,
      temps_lecture: Number(tempsLecture) || 1,
      image_couverture: imageCouverture || undefined,
      meta_description: metaDescription || undefined,
      mot_clef: motClef || undefined,
    }),
    onSuccess: () => router.push('/admin/contenu'),
    onError: (err) => setError(err.message || 'Erreur lors de la création'),
  });

  const submit = (e) => {
    e.preventDefault();
    setError(null);
    createMutation.mutate();
  };

  return (
    <form onSubmit={submit}>
      <PageHead
        title="Nouvel article"
        subtitle="Rédigez une parution pour le magazine Aura"
        crumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Contenus', href: '/admin/contenu' }, { label: 'Nouvel article' }]}
        actions={<button type="submit" className="btn btn-primary btn-sm" disabled={createMutation.isPending}><Icon name="check" size={15} /> {createMutation.isPending ? 'Enregistrement…' : 'Enregistrer'}</button>}
      />

      {error && <div className="note tint-violet" style={{ marginBottom: 16, color: 'var(--danger)' }}>{error}</div>}

      <div className="grid" style={{ gridTemplateColumns: '1.7fr 1fr', gap: 20, alignItems: 'start' }}>
        {/* Editor */}
        <div className="card card-pad">
          <div className="stack gap-4">
            <div className="field">
              <label>Titre de l'article</label>
              <input className="input" required value={titre} onChange={(e) => setTitre(e.target.value)} placeholder="Ex. Comment choisir un praticien en confiance" />
            </div>

            <div className="grid grid-2 gap-4">
              <div className="field">
                <label>Catégorie</label>
                <select className="input" value={categorie} onChange={(e) => setCategorie(e.target.value)}>
                  {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Tonalité</label>
                <select className="input" value={tonalite} onChange={(e) => setTonalite(e.target.value)}>
                  {TONES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            <div className="field">
              <label>Extrait</label>
              <textarea className="input" rows={2} required value={extrait} onChange={(e) => setExtrait(e.target.value)} placeholder="Une phrase d'accroche affichée dans la liste des articles…" />
            </div>

            <div className="field">
              <label>Corps de l'article</label>
              <textarea className="input" rows={16} required value={corps} onChange={(e) => setCorps(e.target.value)} placeholder="Rédigez ici le contenu de l'article. Séparez les paragraphes par une ligne vide…" style={{ lineHeight: 1.7 }} />
              <span className="tiny muted" style={{ marginTop: 6 }}>Astuce : gardez un ton calme et éditorial, fidèle à la voix Aura.</span>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="stack gap-5">
          <div className="card card-pad">
            <h3 className="h-4" style={{ marginBottom: 12 }}>Publication</h3>
            <div className="field">
              <label>Statut</label>
              <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="field" style={{ marginTop: 12 }}>
              <label>Auteur</label>
              <input className="input" required value={auteur} onChange={(e) => setAuteur(e.target.value)} />
            </div>
            <div className="field" style={{ marginTop: 12 }}>
              <label>Temps de lecture (minutes)</label>
              <input className="input" type="number" min="1" required value={tempsLecture} onChange={(e) => setTempsLecture(e.target.value)} placeholder="6" />
            </div>
          </div>

          <div className="card card-pad">
            <h3 className="h-4" style={{ marginBottom: 6 }}>Image de couverture</h3>
            <div className="field">
              <label>URL de l'image</label>
              <input className="input" value={imageCouverture} onChange={(e) => setImageCouverture(e.target.value)} placeholder="https://…" />
            </div>
          </div>

          <div className="card card-pad">
            <h3 className="h-4" style={{ marginBottom: 12 }}>SEO</h3>
            <p className="tiny muted" style={{ marginBottom: 12 }}>Le slug est généré automatiquement à partir du titre.</p>
            <div className="field">
              <label>Mot-clé principal</label>
              <input className="input" value={motClef} onChange={(e) => setMotClef(e.target.value)} placeholder="bien-être" />
            </div>
            <div className="field" style={{ marginTop: 12 }}>
              <label>Méta-description</label>
              <textarea className="input" rows={3} value={metaDescription} onChange={(e) => setMetaDescription(e.target.value)} placeholder="Description affichée dans les résultats de recherche…" />
            </div>
            <p className="tiny muted" style={{ marginTop: 8 }}>Idéalement entre 120 et 158 caractères.</p>
          </div>
        </div>
      </div>
    </form>
  );
}
```

- [ ] **Step 3: Verify**

Run (from `web/`): `npm run lint` then `npm run build`.

Manual walkthrough: list shows real articles with their real status; "Publier" appears only for brouillon/en_revue rows and flips status + sets `date_publication` server-side; "Archiver" appears only for published rows; "Nouvel article" creates a real article with a server-generated slug and redirects to the list; "Modifier" opens pre-filled with every real field including the body.

- [ ] **Step 4: Commit**

```bash
git add web/app/admin/contenu/page.jsx web/app/admin/contenu/nouveau/page.jsx
git commit -m "feat(web): wire admin content pages to the articles API with real status"
```

---

## Task 18: Web — cercles admin pages (list, detail)

**Files:**
- Modify: `web/app/admin/cercles/page.jsx`
- Modify: `web/app/admin/cercle/[id]/page.jsx`

Real `Cercle` entity (`server/src/database/entities/cercle.entity.ts`): `id`, `nom` (unique), `description` (nullable), `color` (nullable, must match `^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$`), `animateur` (nullable **plain string**, not a foreign key to `Praticien` — the mock's detail page resolved `c.lead` against the practitioners mock array by name-matching, `practitioners.find(p => p.name === c.lead)`; there is no such relation in the real schema, so this plan does not attempt the same name-matching trick against real data — `animateur` renders as plain text only), `created_at`, `updated_at`. There is **no** `status`, membership, feed, or post-count column anywhere on this entity — the mock's members list, moderation feed, flagged-count, and "changer le statut" action are all dropped, not adapted, per the plan's fixed decision #3.

`color` must be a hex string. Rather than inventing a fake tone-name enum the way disciplines/articles do, the edit/create form uses a native `<input type="color">` — `FormModal`'s field renderer falls through unrecognized `type` values straight onto a plain `<input type={f.type}>` (see `web/components/modals/FormModal.jsx`), so `{ type: 'color' }` works with no changes to the shared modal component, and a native color picker can only ever produce a 6-digit hex value, which always satisfies the backend's regex.

**Scope decision — the "Annonce" button is dropped from the cercle detail page specifically.** The mock's `ModalButton modal="sendNotification"` becomes real once Task 23 wires `POST /api/notifications`, but that endpoint creates a generic notification row (`audience`/`canal`/`titre`/`message` — a free-text audience string like `"clients"`) with no concept of "this cercle's members" to target; `Notification` has no `cercle_id` and cercles have no membership table to resolve an audience from even if it did. Reusing the generic notification composer from this specific page would visually imply a per-cercle broadcast capability that does not exist. The composer itself is still built (Task 23) and reachable from `/admin/notifications` — it's only the cercle-scoped entry point that's removed here.

- [ ] **Step 1: Replace the list page**

Replace `web/app/admin/cercles/page.jsx` in full:

```jsx
'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHead } from '@/components/ui/PageHead';
import { DataTable } from '@/components/ui/DataTable';
import { Icon } from '@/components/ui/Icon';
import { ModalButton } from '@/components/ui/ModalButton';
import { useUI } from '@/lib/store';
import { api } from '@/lib/api';
import { dateFr } from '@/lib/format';

const cercleFields = (c) => [
  { name: 'nom', label: 'Nom du cercle', type: 'text', value: c?.nom, required: true },
  { name: 'animateur', label: 'Animateur', type: 'text', value: c?.animateur },
  { name: 'color', label: 'Couleur', type: 'color', value: c?.color || '#7B5FCF' },
  { name: 'description', label: 'Description', type: 'textarea', value: c?.description },
];

export default function AdminCerclesPage() {
  const queryClient = useQueryClient();
  const toast = useUI((s) => s.toast);
  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin', 'cercles'],
    queryFn: () => api.get('/cercles?per_page=100'),
  });
  const cercles = data?.data ?? [];
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin', 'cercles'] });

  const createMutation = useMutation({
    mutationFn: (values) => api.post('/cercles', values),
    onSuccess: () => { invalidate(); toast('Cercle créé', 'success'); },
    onError: (err) => toast(err.message || 'Erreur', 'danger'),
  });

  const columns = [
    { key: 'nom', label: 'Cercle', sortable: true, render: (c) => (
      <div className="row gap-3">
        <span className="tile-icon" style={{ background: c.color || 'var(--violet-2)' }}><Icon name="users" size={16} color="#fff" /></span>
        <div>
          <div style={{ fontWeight: 500 }}>{c.nom}</div>
          {c.animateur && <div className="tiny">Animé par {c.animateur}</div>}
        </div>
      </div>
    ) },
    { key: 'description', label: 'Description', render: (c) => <span className="small" style={{ display: 'block', maxWidth: 360 }}>{c.description || '—'}</span> },
    { key: 'created_at', label: 'Créé le', sortable: true, render: (c) => <span className="small">{dateFr(c.created_at)}</span> },
  ];

  const createButton = (
    <ModalButton
      modal="form"
      payload={{
        title: 'Créer un cercle', fields: cercleFields(null),
        submitLabel: 'Créer le cercle', successToast: null,
        onSubmit: (values) => createMutation.mutate(values),
      }}
      className="btn btn-primary btn-sm"
    >
      <Icon name="plus" size={15} /> Créer un cercle
    </ModalButton>
  );

  return (
    <>
      <PageHead
        title="Cercles"
        subtitle={isLoading ? 'Chargement…' : `${cercles.length} cercle${cercles.length > 1 ? 's' : ''}`}
        crumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Cercles' }]}
        actions={createButton}
      />

      {isError && <div className="empty"><div className="glyph">❍</div>Impossible de charger les cercles.</div>}

      {!isError && (
        <DataTable
          columns={columns}
          rows={cercles}
          searchKeys={['nom', 'animateur']}
          rowHref={(c) => `/admin/cercle/${c.id}`}
          searchPlaceholder="Rechercher un cercle…"
          toolbar={createButton}
          pageSize={8}
        />
      )}
    </>
  );
}
```

- [ ] **Step 2: Replace the detail page**

Replace `web/app/admin/cercle/[id]/page.jsx` in full:

```jsx
'use client';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHead } from '@/components/ui/PageHead';
import { Icon } from '@/components/ui/Icon';
import { ModalButton } from '@/components/ui/ModalButton';
import { api } from '@/lib/api';
import { useUI } from '@/lib/store';
import { dateFr } from '@/lib/format';

const cercleFields = (c) => [
  { name: 'nom', label: 'Nom du cercle', type: 'text', value: c?.nom, required: true },
  { name: 'animateur', label: 'Animateur', type: 'text', value: c?.animateur },
  { name: 'color', label: 'Couleur', type: 'color', value: c?.color || '#7B5FCF' },
  { name: 'description', label: 'Description', type: 'textarea', value: c?.description },
];

export default function CercleDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const toast = useUI((s) => s.toast);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin', 'cercles', id],
    queryFn: () => api.get(`/cercles/${id}`),
  });
  const c = data?.data;

  const updateMutation = useMutation({
    mutationFn: (values) => api.put(`/cercles/${id}`, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'cercles', id] });
      toast('Cercle mis à jour', 'success');
    },
    onError: (err) => toast(err.message || 'Erreur', 'danger'),
  });
  const deleteMutation = useMutation({
    mutationFn: () => api.del(`/cercles/${id}`),
    onSuccess: () => { toast('Cercle supprimé', 'success'); router.push('/admin/cercles'); },
    onError: (err) => toast(err.message || 'Erreur', 'danger'),
  });

  if (isLoading) return <div className="empty"><div className="glyph">❍</div>Chargement…</div>;
  if (isError || !c) {
    return (
      <>
        <PageHead title="Cercle introuvable" crumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Cercles', href: '/admin/cercles' }, { label: 'Introuvable' }]} />
        <div className="empty"><div className="glyph">❍</div>Aucun cercle ne correspond à cet identifiant.</div>
      </>
    );
  }

  return (
    <>
      <PageHead
        title={c.nom}
        subtitle={c.animateur ? `Animé par ${c.animateur}` : 'Aucun animateur assigné'}
        crumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Cercles', href: '/admin/cercles' }, { label: c.nom }]}
        actions={<>
          <ModalButton modal="form" payload={{
            title: 'Modifier le cercle', fields: cercleFields(c), submitLabel: 'Enregistrer', successToast: null,
            onSubmit: (values) => updateMutation.mutate(values),
          }} className="btn btn-soft btn-sm"><Icon name="edit" size={15} /> Modifier</ModalButton>
          <ModalButton modal="confirm" payload={{
            title: 'Supprimer le cercle', message: `« ${c.nom} » sera définitivement supprimé.`,
            confirmLabel: 'Supprimer', danger: true, successToast: null,
            onConfirm: () => deleteMutation.mutate(),
          }} className="btn btn-danger-soft btn-sm"><Icon name="trash" size={15} /> Supprimer</ModalButton>
        </>}
      />

      <div className="card card-pad" style={{ marginBottom: 22 }}>
        <div className="row gap-4 wrap">
          <span className="tile-icon" style={{ width: 64, height: 64, background: c.color || 'var(--violet-2)' }}><Icon name="users" size={26} color="#fff" /></span>
          <div className="flex-1">
            <h2 className="h-3" style={{ marginBottom: 4 }}>{c.nom}</h2>
            <p className="small" style={{ maxWidth: 600 }}>{c.description || 'Aucune description.'}</p>
          </div>
        </div>
      </div>

      <div className="card card-pad">
        <h3 className="h-4" style={{ marginBottom: 16 }}>Informations</h3>
        <dl className="dl">
          <dt>Identifiant</dt><dd>{c.id}</dd>
          <dt>Animateur</dt><dd>{c.animateur || '—'}</dd>
          <dt>Couleur</dt><dd>
            <span className="row gap-2">
              <span style={{ width: 16, height: 16, borderRadius: 4, display: 'inline-block', background: c.color || 'var(--violet-2)' }} />
              {c.color || '—'}
            </span>
          </dd>
          <dt>Créé le</dt><dd>{dateFr(c.created_at)}</dd>
        </dl>
      </div>
    </>
  );
}
```

- [ ] **Step 3: Verify**

Run (from `web/`): `npm run lint` then `npm run build`.

Manual walkthrough: cercles list loads real rows; "Créer un cercle" validates the unique `nom` server-side (a duplicate shows the backend's French 422 as a toast); clicking a row opens the real detail page (no more `generateStaticParams` — any id, including ones created after the last build, resolves); "Modifier" and "Supprimer" work; no members/feed/status section is present anywhere.

- [ ] **Step 4: Commit**

```bash
git add web/app/admin/cercles/page.jsx web/app/admin/cercle/[id]/page.jsx
git commit -m "feat(web): wire admin cercles pages to the cercles API, drop fields with no schema support"
```

---

## Task 19: Web — praticiens list + verification queue (with document viewer)

**Files:**
- Modify: `web/app/admin/praticiens/page.jsx`
- Modify: `web/app/admin/praticiens/verification/page.jsx`

**Out of scope, deliberately:** `web/app/admin/praticien/[id]/page.jsx` (singular — the practitioner detail page) is **not** named in this plan's scope (same status as `/admin/roles`, `/admin/audit`, `/admin/litiges`, `/admin/messages`, `/admin/reservations`, `/admin/avis`, `/admin/signalements`, `/admin/abonnements`, `/admin/analytique`, `/admin/parametres/*` — all real pages in the repo that belong to later/deferred plans, not this one). The list page's row link still points at `/admin/praticien/${p.id}` (the existing route), it just isn't wired by this task.

Real `Praticien` entity (`server/src/database/entities/praticien.entity.ts`) has **two independent status-like columns** that must not be conflated: `status` (operational account status, e.g. `'actif'`) and `statut_verification` (`en_attente | en_cours | valide | rejete`, the KYC pipeline). There is no `rating`, `reviews`, `earnings`, `online`, or boolean `verified` column — `verified` is derived here as `statut_verification === 'valide'`, and `tarif` (a real column — the practitioner's per-session rate) replaces the fake cumulative "revenus" stat with a real "tarif moyen" average.

- [ ] **Step 1: Replace the list page**

Replace `web/app/admin/praticiens/page.jsx` in full:

```jsx
'use client';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { PageHead } from '@/components/ui/PageHead';
import { DataTable } from '@/components/ui/DataTable';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { api } from '@/lib/api';
import { euro } from '@/lib/format';

const VERIF_TONE = { valide: 'success', en_attente: 'warning', en_cours: 'info', rejete: 'danger' };

export default function AdminPractitionersPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin', 'praticiens'],
    queryFn: () => api.get('/praticiens?per_page=100'),
  });
  const practitioners = data?.data ?? [];
  const verifiedCount = practitioners.filter((p) => p.statut_verification === 'valide').length;
  const avgTarif = practitioners.length
    ? practitioners.reduce((s, p) => s + Number(p.tarif || 0), 0) / practitioners.length
    : 0;

  const columns = [
    { key: 'firstname', label: 'Praticien', sortable: true, render: (p) => (
      <div className="row gap-3">
        <Avatar name={`${p.firstname} ${p.lastname}`} size={36} />
        <div>
          <div style={{ fontWeight: 500 }} className="row gap-2">
            {p.firstname} {p.lastname}
            {p.statut_verification === 'valide' && <Icon name="checkCircle" size={14} color="var(--violet-2)" />}
          </div>
          <div className="tiny">{p.ville}</div>
        </div>
      </div>
    ) },
    { key: 'specialite', label: 'Spécialité', sortable: true, render: (p) => <span className="small">{p.specialite}</span> },
    { key: 'niveau', label: 'Niveau', render: (p) => <Badge variant="info">{p.niveau}</Badge> },
    { key: 'tarif', label: 'Tarif', sortable: true, render: (p) => <strong>{euro(p.tarif)}</strong> },
    { key: 'statut_verification', label: 'Vérification', render: (p) => <Badge variant={VERIF_TONE[p.statut_verification] || 'neutral'} dot>{p.statut_verification}</Badge> },
    { key: 'status', label: 'Statut', render: (p) => <Badge variant={p.status === 'actif' ? 'success' : 'neutral'} dot>{p.status}</Badge> },
  ];

  return (
    <>
      <PageHead
        title="Praticiens"
        subtitle={isLoading ? 'Chargement…' : `${practitioners.length} praticiens · ${verifiedCount} vérifiés`}
        crumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Praticiens' }]}
        actions={<Link href="/admin/praticiens/verification" className="btn btn-soft btn-sm"><Icon name="shield" size={15} /> File de vérification</Link>}
      />

      <div className="grid grid-3" style={{ marginBottom: 22 }}>
        <div className="card card-pad"><div className="eyebrow">Communauté</div><div className="h-2" style={{ marginTop: 6 }}>{practitioners.length}</div><div className="small">praticiens sur la plateforme</div></div>
        <div className="card card-pad"><div className="eyebrow">Vérifiés</div><div className="h-2" style={{ marginTop: 6 }}>{verifiedCount}</div><div className="small">profils validés</div></div>
        <div className="card card-pad"><div className="eyebrow">Tarif moyen</div><div className="h-2" style={{ marginTop: 6 }}>{euro(avgTarif)}</div><div className="small">par séance</div></div>
      </div>

      {isError && <div className="empty"><div className="glyph">❍</div>Impossible de charger les praticiens.</div>}

      {!isError && (
        <DataTable
          columns={columns}
          rows={practitioners}
          searchKeys={['firstname', 'lastname', 'ville']}
          filters={[
            { key: 'status', label: 'Tous les statuts', options: [...new Set(practitioners.map((p) => p.status))].map((s) => ({ value: s, label: s })) },
            { key: 'statut_verification', label: 'Toutes les vérifications', options: [...new Set(practitioners.map((p) => p.statut_verification))].map((s) => ({ value: s, label: s })) },
          ]}
          rowHref={(p) => `/admin/praticien/${p.id}`}
          searchPlaceholder="Rechercher un praticien, une ville…"
          pageSize={8}
        />
      )}
    </>
  );
}
```

- [ ] **Step 2: Replace the verification queue**

The formula-derived `DOCS` checklist is replaced by the real `PraticienDocument[]` relation embedded on each praticien row (`server/src/database/entities/praticien-document.entity.ts` — `GET /v1/admin/praticiens/verification` eager-loads `documents` via `leftJoinAndSelect`). "Voir" on a submitted document calls the guarded streaming route from Task 12 through `apiFetchBlob` (a plain `<a href>` can't attach a bearer token) and opens the result in a new tab as an object URL. "Vérifier" and "Rejeter" both go through `ConfirmModal` (matching the mock's original two-step confirm, not a bare one-click button) wired to the real `verify`/`reject` endpoints; "relancer" (previously just static copy — "relancez le praticien si besoin" — with nothing behind it) is wired to the real, already-built `POST .../:id/relance`. The "Contacter" button is **left exactly as-is** (a decorative `contact` form modal firing a fake success toast) — there is no messaging backend anywhere in this codebase (Plan 08, messaging, is deferred indefinitely per the master roadmap), and building one is far outside this task's scope; it is not a field this task can honestly wire either way, so it is neither faked further nor removed.

Replace `web/app/admin/praticiens/verification/page.jsx` in full:

```jsx
'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHead } from '@/components/ui/PageHead';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { ModalButton } from '@/components/ui/ModalButton';
import { useUI } from '@/lib/store';
import { api, apiFetchBlob } from '@/lib/api';
import { dateFr } from '@/lib/format';

const DOC_TYPES = ['piece_identite', 'certification', 'assurance', 'domicile', 'charte'];
const DOC_LABELS = {
  piece_identite: "Pièce d'identité", certification: 'Certification',
  assurance: 'Assurance', domicile: 'Justificatif de domicile', charte: 'Charte signée',
};

async function openDocument(doc, toast) {
  try {
    const blob = await apiFetchBlob(`/v1/admin/praticiens/verification/documents/${doc.id}/file`);
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank', 'noopener');
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch (err) {
    toast(err.message || "Impossible d'ouvrir le document", 'danger');
  }
}

export default function VerificationQueuePage() {
  const queryClient = useQueryClient();
  const toast = useUI((s) => s.toast);
  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin', 'praticiens', 'verification'],
    queryFn: () => api.get('/v1/admin/praticiens/verification?per_page=100'),
  });
  const queue = data?.data ?? [];
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin', 'praticiens', 'verification'] });

  const verifyMutation = useMutation({
    mutationFn: (p) => api.post(`/v1/admin/praticiens/verification/${p.id}/verify`, {
      documents: (p.documents || []).map((d) => ({ id: d.id, statut: 'valide' })),
    }),
    onSuccess: (res) => { invalidate(); toast(res.message || 'Praticien vérifié', 'success'); },
    onError: (err) => toast(err.message || 'Erreur', 'danger'),
  });
  const rejectMutation = useMutation({
    mutationFn: ({ id, motif_rejet }) => api.post(`/v1/admin/praticiens/verification/${id}/reject`, { motif_rejet }),
    onSuccess: () => { invalidate(); toast('Candidature rejetée', 'success'); },
    onError: (err) => toast(err.message || 'Erreur', 'danger'),
  });
  const relanceMutation = useMutation({
    mutationFn: (id) => api.post(`/v1/admin/praticiens/verification/${id}/relance`),
    onSuccess: () => toast('Relance envoyée avec succès', 'success'),
    onError: (err) => toast(err.message || 'Erreur', 'danger'),
  });

  return (
    <>
      <PageHead
        title="File de vérification"
        subtitle={isLoading ? 'Chargement…' : `${queue.length} praticien${queue.length > 1 ? 's' : ''} en attente de validation manuelle.`}
        crumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Praticiens', href: '/admin/praticiens' }, { label: 'Vérification' }]}
        actions={<Badge variant="warning" dot>{queue.length} en attente</Badge>}
      />

      <div className="note tint-gold" style={{ marginBottom: 22 }}>
        <Icon name="shield" size={16} color="var(--gold-2)" />
        <span className="small">Vérifiez chaque document avant d'approuver. Une fois les 5 documents validés, le praticien obtient le statut <strong>validé</strong> et apparaît dans les résultats de recherche.</span>
      </div>

      {isError && <div className="empty"><div className="glyph">❍</div>Impossible de charger la file de vérification.</div>}
      {!isLoading && !isError && queue.length === 0 && (
        <div className="empty"><div className="glyph">❍</div>Aucun praticien en attente.</div>
      )}

      <div className="grid grid-2">
        {queue.map((p) => {
          const docs = p.documents || [];
          const missing = DOC_TYPES.length - docs.length;
          return (
            <div key={p.id} className="card card-pad">
              <div className="row gap-3" style={{ marginBottom: 16 }}>
                <Avatar name={`${p.firstname} ${p.lastname}`} size={52} />
                <div className="flex-1">
                  <div className="row gap-2"><strong>{p.firstname} {p.lastname}</strong><Badge variant="warning">{p.statut_verification}</Badge></div>
                  <div className="small">{p.specialite} · {p.niveau}</div>
                  <div className="tiny">{p.ville} · inscrit le {dateFr(p.date_inscription || p.created_at)}</div>
                </div>
              </div>

              <div className="divider" />

              <div className="eyebrow" style={{ marginTop: 4, marginBottom: 10 }}>Documents soumis</div>
              <div className="stack gap-2" style={{ marginBottom: 16 }}>
                {DOC_TYPES.map((type) => {
                  const doc = docs.find((d) => d.type === type);
                  const ok = doc?.statut === 'valide';
                  const submitted = !!doc;
                  return (
                    <div key={type} className="row gap-2 between">
                      <span className="row gap-2 small">
                        <Icon name={submitted ? (ok ? 'checkCircle' : 'clock') : 'x'} size={15} color={ok ? 'var(--sage-2)' : submitted ? 'var(--gold-2)' : 'var(--danger)'} />
                        {DOC_LABELS[type]}
                      </span>
                      <div className="row gap-2">
                        <Badge variant={ok ? 'success' : submitted ? 'warning' : 'danger'}>{submitted ? doc.statut : 'manquant'}</Badge>
                        {submitted && <button className="btn btn-link btn-sm" onClick={() => openDocument(doc, toast)}>Voir</button>}
                      </div>
                    </div>
                  );
                })}
              </div>

              {missing > 0 && (
                <div className="note tint-violet" style={{ marginBottom: 14 }}>
                  <span className="tiny">{missing} document{missing > 1 ? 's' : ''} manquant{missing > 1 ? 's' : ''} — </span>
                  <button className="btn btn-link btn-sm" onClick={() => relanceMutation.mutate(p.id)}>relancer le praticien</button>
                </div>
              )}

              <div className="row gap-2 wrap">
                <ModalButton modal="confirm" payload={{
                  title: 'Vérifier le praticien',
                  message: 'Confirmer que les documents soumis sont conformes ? Le statut sera mis à jour selon les documents validés.',
                  confirmLabel: 'Vérifier', successToast: null,
                  onConfirm: () => verifyMutation.mutate(p),
                }} className="btn btn-primary btn-sm flex-1">
                  <Icon name="check" size={15} /> Vérifier
                </ModalButton>
                <ModalButton modal="confirm" payload={{
                  title: 'Rejeter la candidature', danger: true, withReason: true,
                  reasonLabel: 'Motif du rejet (10 caractères minimum)',
                  message: 'Le praticien sera notifié du refus.', confirmLabel: 'Rejeter', successToast: null,
                  onConfirm: (reason) => rejectMutation.mutate({ id: p.id, motif_rejet: reason }),
                }} className="btn btn-danger-soft btn-sm flex-1">
                  <Icon name="x" size={15} /> Rejeter
                </ModalButton>
                <ModalButton modal="contact" payload={{ name: `${p.firstname} ${p.lastname}` }} className="btn btn-soft btn-sm btn-icon" as="button" title="Contacter">
                  <Icon name="mail" size={15} />
                </ModalButton>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
```

- [ ] **Step 3: Verify**

Run (from `web/`): `npm run lint` then `npm run build`.

Manual walkthrough (needs a praticien seeded with `statut_verification: 'en_attente'` and at least one uploaded `PraticienDocument`, e.g. via `praticien-auth`'s registration flow): the queue loads real pending praticiens with their real submitted-document checklist; "Voir" opens the actual uploaded file in a new tab; "Vérifier" with fewer than 5 valid documents leaves the praticien `en_cours` (visible in the badge after refetch) rather than `valide`; "Rejeter" with a reason under 10 characters surfaces the backend's 422 as a toast; the list page's "Vérifiés" stat reflects real `statut_verification` counts.

- [ ] **Step 4: Commit**

```bash
git add web/app/admin/praticiens/page.jsx web/app/admin/praticiens/verification/page.jsx
git commit -m "feat(web): wire praticiens list + verification queue to the real API, add document viewer"
```

---

## Task 20: Web — paiements admin pages (list, detail)

**Files:**
- Modify: `web/app/admin/paiements/page.jsx`
- Modify: `web/app/admin/paiement/[id]/page.jsx`

**Confirmed from `server/src/paiements/paiements.controller.ts` (Task 10): there is no admin single-payment fetch.** `GET /paiements/:id` (`show`) is `ClientGuard`-only — it scopes to the calling client's own `client_id` and 404s for anyone else's payment, admin included. The admin detail page therefore derives its record from the same `GET /paiements?per_page=100` admin-index query the list page uses (same react-query key, so navigating from the list is served from cache) rather than a dedicated show call. This means a payment outside the first 100 rows (the server-side pagination cap noted in Task 16) will render as "not found" on direct link/refresh even though it exists — a real limitation of there being no `adminShow` route, stated plainly in the code comment rather than hidden.

**Decision — the `modal="refund"` button is removed, not relabeled to a cross-link.** The brief asks to link to the matching remboursement if one exists, via `GET /api/remboursements/admin?paiement_id=` — `RemboursementsService.adminIndex()` (`server/src/remboursements/remboursements.service.ts`) filters on `statut`, `client_id`, `praticien_id`, `date_debut`, `date_fin`, `search` only; there is no `paiement_id` filter, so that lookup cannot be built. Every remboursement endpoint (`admin/:id/approve|refuse|complete`) also operates on an *existing* request's id — there is no "start a refund from a payment" endpoint at all. Both prerequisites the brief names are absent, so per its own fallback this plan does not build the cross-link. The button is replaced with a short static note plus a plain (unfiltered) link to `/admin/remboursements`, so admins still have a path there, honestly labeled as "go look", not "refund this transaction".

**Also dropped, found during this task's own read of the page:** the "Télécharger le reçu" / "Renvoyer le reçu" buttons were `ToastButton`s firing a canned success message with no backend behind them at all — no receipt-generation or receipt-email route exists anywhere in `server/src/paiements`. Removed for the same reason as the refund button — not one of the two "pick one" decisions the brief called out, but the same principle applies.

- [ ] **Step 1: Replace the list page**

Replace `web/app/admin/paiements/page.jsx` in full:

```jsx
'use client';
import { useQuery } from '@tanstack/react-query';
import { PageHead } from '@/components/ui/PageHead';
import { StatCard } from '@/components/ui/StatCard';
import { DataTable } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { api } from '@/lib/api';
import { euro, dateFr } from '@/lib/format';

const STATUT_TONE = { paid: 'success', en_attente: 'warning', rembourse: 'info' };

function downloadCsv({ filename, csv }) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

export default function AdminPaiementsPage() {
  const { data, isError } = useQuery({
    queryKey: ['admin', 'paiements'],
    queryFn: () => api.get('/paiements?per_page=100'),
  });
  // Real, table-wide aggregates (not affected by the 100-row page cap) — this is why
  // the stat cards hit a separate endpoint instead of reducing over `paiements` below.
  const { data: statsData } = useQuery({
    queryKey: ['admin', 'paiements', 'statistics'],
    queryFn: () => api.get('/paiements/statistics'),
  });
  const stats = statsData?.data?.general;

  const paiements = (data?.data ?? []).map((p) => ({
    ...p,
    client_nom: p.client ? `${p.client.firstname} ${p.client.lastname}` : '',
    praticien_nom: p.praticien ? `${p.praticien.firstname} ${p.praticien.lastname}` : '',
  }));

  const exportCsv = async () => {
    const res = await api.get('/paiements/export/csv');
    downloadCsv(res.data);
  };

  const columns = [
    { key: 'reference', label: 'Réf.', sortable: true, render: (r) => <span className="table-cell-main">{r.reference}</span> },
    { key: 'date_paiement', label: 'Date', sortable: true, render: (r) => <span className="small">{dateFr(r.date_paiement)}</span> },
    { key: 'client_nom', label: 'Client', sortable: true, render: (r) => <span className="small">{r.client_nom || '—'}</span> },
    { key: 'praticien_nom', label: 'Praticien', render: (r) => <span className="small">{r.praticien_nom || 'N/A'}</span> },
    { key: 'montant_brut', label: 'Brut', sortable: true, render: (r) => euro(r.montant_brut) },
    { key: 'commission', label: 'Commission', sortable: true, render: (r) => <span className="muted">{euro(r.commission)}</span> },
    { key: 'montant_net_praticien', label: 'Net praticien', render: (r) => <strong>{euro(r.montant_net_praticien)}</strong> },
    { key: 'moyen_paiement', label: 'Moyen', render: (r) => <Badge variant="neutral">{r.moyen_paiement}</Badge> },
    { key: 'statut', label: 'Statut', render: (r) => <Badge variant={STATUT_TONE[r.statut] || 'neutral'}>{r.statut}</Badge> },
  ];

  return (
    <>
      <PageHead
        title="Paiements"
        subtitle="Tous les flux financiers transitant par Aura."
        crumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Paiements' }]}
        actions={<button className="btn btn-soft btn-sm" onClick={exportCsv}><Icon name="download" size={15} /> Exporter (CSV)</button>}
      />

      <div className="grid grid-3" style={{ marginBottom: 24 }}>
        <StatCard label="Volume total" value={euro(stats?.montant_total)} icon="euro" />
        <StatCard label="Commissions Aura" value={euro(stats?.commission_totale)} icon="chart" />
        <StatCard label="Net reversé" value={euro(stats?.net_total)} icon="card" />
      </div>

      {isError && <div className="empty"><div className="glyph">❍</div>Impossible de charger les paiements.</div>}

      {!isError && (
        <DataTable
          columns={columns}
          rows={paiements}
          searchKeys={['reference', 'client_nom', 'praticien_nom']}
          filters={[
            { key: 'statut', label: 'Statut', options: [...new Set(paiements.map((p) => p.statut))].filter(Boolean).map((s) => ({ value: s, label: s })) },
            { key: 'moyen_paiement', label: 'Moyen', options: [...new Set(paiements.map((p) => p.moyen_paiement))].filter(Boolean).map((m) => ({ value: m, label: m })) },
          ]}
          rowHref={(r) => `/admin/paiement/${r.id}`}
          searchPlaceholder="Rechercher une transaction…"
          pageSize={10}
          toolbar={<button className="btn btn-soft btn-sm" onClick={exportCsv}><Icon name="download" size={15} /> Export comptable</button>}
        />
      )}
    </>
  );
}
```

`exportCsv` hits `GET /paiements/export/csv`, which — unlike a typical file-download route — returns the CSV **inside the JSON envelope** (`{ data: { filename, csv, total } }`, confirmed by `paiements.e2e-spec.ts`), so it's fetched with the ordinary `api.get` (not `apiFetchBlob`, which is for genuinely binary responses) and turned into a browser download client-side from the returned string.

- [ ] **Step 2: Replace the detail page**

Replace `web/app/admin/paiement/[id]/page.jsx` in full:

```jsx
'use client';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { PageHead } from '@/components/ui/PageHead';
import { Badge } from '@/components/ui/Badge';
import { api } from '@/lib/api';
import { euro, dateFr } from '@/lib/format';

const STATUT_TONE = { paid: 'success', en_attente: 'warning', rembourse: 'info' };

export default function AdminPaiementDetailPage() {
  const { id } = useParams();
  // No dedicated admin GET /paiements/:id exists (`:id` is ClientGuard-only, scoped to
  // the calling client) — reuse the same admin-index query + queryKey the list page
  // uses and find the row client-side. See the note above Task 20 in the plan for the
  // "outside the first 100 rows" limitation this implies.
  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin', 'paiements'],
    queryFn: () => api.get('/paiements?per_page=100'),
  });
  const tx = (data?.data ?? []).find((p) => String(p.id) === String(id));

  if (isLoading) return <div className="empty"><div className="glyph">❍</div>Chargement…</div>;
  if (isError || !tx) {
    return (
      <>
        <PageHead title="Paiement introuvable" crumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Paiements', href: '/admin/paiements' }, { label: 'Introuvable' }]} />
        <div className="empty">
          <div className="glyph">❍</div>
          Ce paiement n'existe pas, ou n'est pas dans les 100 transactions les plus récentes.
          <div className="mt-3"><Link href="/admin/paiements" className="btn btn-soft btn-sm">Retour aux paiements</Link></div>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHead
        title={tx.reference}
        subtitle={`Transaction du ${dateFr(tx.date_paiement)}`}
        crumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Paiements', href: '/admin/paiements' }, { label: tx.reference }]}
      />

      <div className="grid" style={{ gridTemplateColumns: '1.5fr 1fr', gap: 20 }}>
        <div className="stack gap-5">
          <div className="card card-pad">
            <div className="between" style={{ marginBottom: 18 }}>
              <h3 className="h-3">Détail du montant</h3>
              <Badge variant={STATUT_TONE[tx.statut] || 'neutral'}>{tx.statut}</Badge>
            </div>
            <div className="stack gap-3">
              <div className="between"><span className="muted">Montant brut</span><strong>{euro(tx.montant_brut)}</strong></div>
              <div className="between"><span className="muted">Commission Aura</span><span style={{ color: 'var(--danger)' }}>− {euro(tx.commission)}</span></div>
              <div className="divider" />
              <div className="between"><span style={{ fontWeight: 500 }}>Net reversé au praticien</span><strong className="h-4">{euro(tx.montant_net_praticien)}</strong></div>
            </div>
          </div>

          <div className="card card-pad">
            <h3 className="h-3" style={{ marginBottom: 16 }}>Parties</h3>
            <div className="dl">
              <dt>Client</dt><dd>{tx.client ? `${tx.client.firstname} ${tx.client.lastname}` : '—'}</dd>
              <dt>Praticien</dt><dd>{tx.praticien ? `${tx.praticien.firstname} ${tx.praticien.lastname}` : 'N/A'}</dd>
              <dt>Moyen de paiement</dt><dd><Badge variant="neutral">{tx.moyen_paiement}</Badge></dd>
            </div>
          </div>
        </div>

        <div className="stack gap-5">
          <div className="card card-pad">
            <h3 className="h-3" style={{ marginBottom: 16 }}>Informations</h3>
            <div className="dl">
              <dt>Référence</dt><dd>{tx.reference}</dd>
              <dt>Date</dt><dd>{dateFr(tx.date_paiement)}</dd>
              <dt>Statut</dt><dd><Badge variant={STATUT_TONE[tx.statut] || 'neutral'}>{tx.statut}</Badge></dd>
            </div>
          </div>

          <div className="card card-pad">
            <h3 className="h-3" style={{ marginBottom: 12 }}>Remboursement</h3>
            <p className="small" style={{ marginBottom: 12 }}>
              Les remboursements sont initiés par le client puis traités depuis la file dédiée — il n'existe pas d'action « rembourser » directe depuis un paiement.
            </p>
            <Link href="/admin/remboursements" className="btn btn-soft btn-sm btn-block">Voir la file des remboursements</Link>
          </div>
        </div>
      </div>
    </>
  );
}
```

Also dropped from the original mock: the fake `booking`/`getBooking(tx.bookingId)` "Réservation liée" card. `Paiement.rendez_vous_id` exists as a column (confirmed in `server/src/database/entities/paiement.entity.ts`) but there is no `rendez_vous` entity, module, service, or controller anywhere in `server/src` — bookings are R3/Plan 05 scope, not built here — so the column is never populated or joined by `PaiementsService`, and the card had nothing real to show.

- [ ] **Step 3: Verify**

Run (from `web/`): `npm run lint` then `npm run build`.

Manual walkthrough: paiements list loads real transactions with real stat cards (matching `GET /paiements/statistics`, not a client-side sum of only the first 100 rows); "Exporter (CSV)" downloads a real file; a payment's detail page shows real amounts/parties/status and a plain link to the remboursements queue instead of a non-functional refund button.

- [ ] **Step 4: Commit**

```bash
git add web/app/admin/paiements/page.jsx web/app/admin/paiement/[id]/page.jsx
git commit -m "feat(web): wire admin paiements pages to the paiements API, remove non-functional refund action"
```

---

## Task 21: Web — remboursements admin page

**Files:**
- Modify: `web/app/admin/remboursements/page.jsx`

`GET /remboursements/admin` embeds `statistiques` in the **same response** as the row data (`RemboursementsService.adminIndex()` → `success(data, undefined, { pagination, statistiques })`), computed over the full filtered set server-side, not just the current page — so unlike Task 20's paiements page, one fetch is enough for both the table and the stat cards here. `statistiques.taux_remboursement` is the real computed rate the brief points at (`(demandes / paiements payés) × 100`, formatted server-side as e.g. `"1.4%"`) — used directly, replacing the hardcoded `"1,4%"`.

**Judgment call — `statistiques.taux_evolution` is fetched but not displayed.** Reading `RemboursementsService.computeStatistics()` shows `taux_evolution: '+0.3'` is a literal hardcoded string in the backend, not a real period-over-period computation (there's no "previous period" query backing it) — it's real in the sense that it's genuinely what the shipped, in-scope-complete endpoint returns, but displaying it with a trend-arrow `delta` prop would visually assert a comparison that was never computed. `StatCard`'s `delta` is optional, so the "Taux de remboursement" card here simply omits it rather than surface a number known (from reading the source, not guessing) to be a stub. `taux_remboursement` itself has no such problem — it's a real aggregate over real rows.

**Also dropped, found during this task's read of the page:** both `ModalButton modal="exportData"` buttons (header + table toolbar). `GET /remboursements/admin/export` is real and guarded (Task 11), but — unlike paiements' export/csv, which returns a ready-made CSV string — it returns structured JSON rows (`{ remboursements: [{ reference, date, transaction, client, montant, motif, statut }, ...] }`) with no CSV serialization. Building a bespoke client-side CSV writer for a feature the brief didn't ask for here is out of scope; the honest choice is to remove the buttons rather than wire them to a shape that isn't a file. If a real CSV export becomes a requirement later, the fix belongs in `RemboursementsService.adminExport` (mirror `PaiementsService.adminExportCsv`'s pattern), not in ad hoc client-side formatting.

- [ ] **Step 1: Replace the page**

Replace `web/app/admin/remboursements/page.jsx` in full:

```jsx
'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHead } from '@/components/ui/PageHead';
import { StatCard } from '@/components/ui/StatCard';
import { DataTable } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/Badge';
import { ModalButton } from '@/components/ui/ModalButton';
import { useUI } from '@/lib/store';
import { api } from '@/lib/api';
import { euro, dateFr } from '@/lib/format';

const STATUT_TONE = { en_attente: 'warning', en_cours: 'info', approuve: 'success', refuse: 'danger', completed: 'neutral' };
const STATUT_LABEL = { en_attente: 'En attente', en_cours: 'En cours', approuve: 'Approuvé', refuse: 'Refusé', completed: 'Complété' };

export default function AdminRemboursementsPage() {
  const queryClient = useQueryClient();
  const toast = useUI((s) => s.toast);
  const { data, isError } = useQuery({
    queryKey: ['admin', 'remboursements'],
    queryFn: () => api.get('/remboursements/admin?per_page=100'),
  });
  const remboursements = (data?.data ?? []).map((r) => ({
    ...r,
    client_nom: r.client ? `${r.client.firstname} ${r.client.lastname}` : '',
    transaction_ref: r.paiement?.reference ?? '',
  }));
  const stats = data?.statistiques;
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin', 'remboursements'] });

  const approveMutation = useMutation({
    mutationFn: ({ id, commentaire_admin }) =>
      api.post(`/remboursements/admin/${id}/approve`, commentaire_admin ? { commentaire_admin } : {}),
    onSuccess: () => { invalidate(); toast('Remboursement approuvé', 'success'); },
    onError: (err) => toast(err.message || 'Erreur', 'danger'),
  });
  const refuseMutation = useMutation({
    mutationFn: ({ id, commentaire_admin }) => api.post(`/remboursements/admin/${id}/refuse`, { commentaire_admin }),
    onSuccess: () => { invalidate(); toast('Remboursement refusé', 'success'); },
    onError: (err) => toast(err.message || 'Erreur', 'danger'),
  });
  const completeMutation = useMutation({
    mutationFn: (id) => api.post(`/remboursements/admin/${id}/complete`),
    onSuccess: () => { invalidate(); toast('Remboursement marqué comme complété', 'success'); },
    onError: (err) => toast(err.message || 'Erreur', 'danger'),
  });

  const columns = [
    { key: 'created_at', label: 'Date', sortable: true, render: (r) => <span className="small">{dateFr(r.created_at)}</span> },
    { key: 'transaction_ref', label: 'Transaction', sortable: true, render: (r) => <span className="table-cell-main">{r.transaction_ref || '—'}</span> },
    { key: 'client_nom', label: 'Client', sortable: true, render: (r) => <span className="small">{r.client_nom || '—'}</span> },
    { key: 'montant', label: 'Montant', sortable: true, render: (r) => <strong>{euro(r.montant)}</strong> },
    { key: 'motif', label: 'Motif', render: (r) => <span className="small">{r.motif}</span> },
    { key: 'statut', label: 'Statut', render: (r) => <Badge variant={STATUT_TONE[r.statut] || 'neutral'}>{STATUT_LABEL[r.statut] || r.statut}</Badge> },
    {
      key: 'actions', label: '', width: 190,
      render: (r) => {
        if (r.statut === 'en_attente' || r.statut === 'en_cours') {
          return (
            <div className="row gap-1" onClick={(e) => e.stopPropagation()}>
              <ModalButton modal="confirm" payload={{
                title: 'Approuver le remboursement',
                message: `Confirmer le remboursement de ${euro(r.montant)} à ${r.client_nom || 'ce client'} ?`,
                withReason: true, reasonLabel: 'Commentaire (optionnel)', confirmLabel: 'Approuver', successToast: null,
                onConfirm: (reason) => approveMutation.mutate({ id: r.id, commentaire_admin: reason || undefined }),
              }} className="btn btn-primary btn-sm" as="div">Approuver</ModalButton>
              <ModalButton modal="confirm" payload={{
                title: 'Refuser le remboursement', danger: true, withReason: true,
                reasonLabel: 'Motif du refus (10 caractères minimum)', confirmLabel: 'Refuser', successToast: null,
                onConfirm: (reason) => refuseMutation.mutate({ id: r.id, commentaire_admin: reason }),
              }} className="btn btn-danger-soft btn-sm" as="div">Refuser</ModalButton>
            </div>
          );
        }
        if (r.statut === 'approuve') {
          return (
            <button className="btn btn-soft btn-sm" onClick={(e) => { e.stopPropagation(); completeMutation.mutate(r.id); }}>
              Marquer complété
            </button>
          );
        }
        return null;
      },
    },
  ];

  return (
    <>
      <PageHead
        title="Remboursements"
        subtitle="Demandes et historique des remboursements clients."
        crumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Remboursements' }]}
      />

      <div className="grid grid-3" style={{ marginBottom: 24 }}>
        <StatCard label="Total remboursé" value={stats ? euro(stats.completed) : '—'} icon="euro" />
        <StatCard label="En attente" value={stats ? String(stats.en_attente) : '—'} icon="clock" />
        <StatCard label="Taux de remboursement" value={stats?.taux_remboursement ?? '—'} icon="shield" />
      </div>

      {isError && <div className="empty"><div className="glyph">❍</div>Impossible de charger les remboursements.</div>}

      {!isError && (
        <DataTable
          columns={columns}
          rows={remboursements}
          searchKeys={['transaction_ref', 'client_nom', 'motif', 'reference']}
          filters={[{ key: 'statut', label: 'Statut', options: Object.keys(STATUT_LABEL).map((s) => ({ value: s, label: STATUT_LABEL[s] })) }]}
          searchPlaceholder="Rechercher un remboursement…"
          pageSize={10}
        />
      )}
    </>
  );
}
```

- [ ] **Step 2: Verify**

Run (from `web/`): `npm run lint` then `npm run build`.

Manual walkthrough: stat cards show the real `taux_remboursement` (no more hardcoded "1,4%"); "Approuver" on a pending row validates `date_remboursement` is today-or-later server-side (this page never sends one, so it always defaults to today and always passes); "Refuser" with under 10 characters surfaces the backend 422 as a toast; "Marquer complété" only appears on `approuve` rows, matching the backend's own state machine (`adminComplete` 404s on anything else).

- [ ] **Step 3: Commit**

```bash
git add web/app/admin/remboursements/page.jsx
git commit -m "feat(web): wire admin remboursements page to the real approve/refuse/complete API"
```

---

## Task 22: Web — échanges admin page + new detail page

**Files:**
- Modify: `web/app/admin/echanges/page.jsx`
- Create: `web/app/admin/echange/[id]/page.jsx`

**The mock and the real schema describe the same underlying idea with different words, not two different features.** The mock's "troc de soins" fields (`who`/`give`/`want`/`tag`/`mode`/`publishedAgo`) map onto the real `Echange` entity (`server/src/database/entities/echange.entity.ts`) reasonably closely once renamed: `who` → the submitting client (`client.firstname`/`lastname`, a real relation, not a flat name string), `give`/`want` → `ce_que_je_propose`/`ce_que_je_recherche` (both real, both optional), `mode` → `format` (real, free string). What's genuinely new versus the mock: `statut` (`en_attente | lu | en_cours | traite | archive | signale` — a real moderation/reply workflow the mock never modeled at all) and `priorite` (`basse | moyenne | haute | urgente`). What's gone: the mock's `tag` taxonomy (`Soin contre service` / `Soin contre soin` / `Formation contre soin`) doesn't exist server-side — the real, much simpler `type` enum (`proposition | demande | information | autre`) replaces it, and the two mock-only stat cards derived from that fake taxonomy are replaced with real workflow stats (en attente / signalés).

- [ ] **Step 1: Replace the list page**

Replace `web/app/admin/echanges/page.jsx` in full:

```jsx
'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHead } from '@/components/ui/PageHead';
import { DataTable } from '@/components/ui/DataTable';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { useUI } from '@/lib/store';
import { api } from '@/lib/api';
import { dateFr } from '@/lib/format';

const STATUT_TONE = { en_attente: 'warning', lu: 'info', en_cours: 'info', traite: 'success', archive: 'neutral', signale: 'danger' };
const PRIORITE_TONE = { basse: 'neutral', moyenne: 'info', haute: 'warning', urgente: 'danger' };
const TYPE_LABEL = { proposition: 'Proposition', demande: 'Demande', information: 'Information', autre: 'Autre' };

export default function AdminExchangesPage() {
  const queryClient = useQueryClient();
  const toast = useUI((s) => s.toast);
  const { data, isError } = useQuery({
    queryKey: ['admin', 'echanges'],
    queryFn: () => api.get('/echanges?per_page=100'),
  });
  const echanges = (data?.data ?? []).map((e) => ({
    ...e,
    client_nom: e.client ? `${e.client.firstname} ${e.client.lastname}` : 'Client',
  }));
  const enAttente = echanges.filter((e) => e.statut === 'en_attente').length;
  const signales = echanges.filter((e) => e.statut === 'signale').length;

  const hideMutation = useMutation({
    mutationFn: (id) => api.post(`/echanges/${id}/hide`),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'echanges'] });
      toast(res.message, 'success');
    },
    onError: (err) => toast(err.message || 'Erreur', 'danger'),
  });

  const columns = [
    { key: 'sujet', label: 'Échange', sortable: true, render: (e) => (
      <div className="row gap-3">
        <Avatar name={e.client_nom} size={36} />
        <div>
          <div style={{ fontWeight: 500 }}>{e.sujet}</div>
          <div className="tiny">{e.client_nom}</div>
        </div>
      </div>
    ) },
    { key: 'type', label: 'Type', render: (e) => <Badge variant="neutral">{TYPE_LABEL[e.type] || e.type}</Badge> },
    { key: 'priorite', label: 'Priorité', render: (e) => <Badge variant={PRIORITE_TONE[e.priorite] || 'neutral'}>{e.priorite}</Badge> },
    { key: 'statut', label: 'Statut', render: (e) => <Badge variant={STATUT_TONE[e.statut] || 'neutral'} dot>{e.statut}</Badge> },
    { key: 'created_at', label: 'Publié', sortable: true, render: (e) => <span className="tiny muted">{dateFr(e.created_at)}</span> },
    { key: 'actions', label: '', width: 60, render: (e) => (
      <button className="btn btn-icon btn-ghost btn-sm" onClick={(ev) => { ev.stopPropagation(); hideMutation.mutate(e.id); }} title={e.est_masque ? 'Démasquer' : 'Masquer'}>
        <Icon name={e.est_masque ? 'checkCircle' : 'x'} size={14} />
      </button>
    ) },
  ];

  return (
    <>
      <PageHead
        title="Échanges"
        subtitle={`${echanges.length} échange${echanges.length > 1 ? 's' : ''} · ${enAttente} en attente`}
        crumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Échanges' }]}
      />

      <div className="grid grid-3" style={{ marginBottom: 22 }}>
        <div className="card card-pad"><div className="eyebrow">Total</div><div className="h-2" style={{ marginTop: 6 }}>{echanges.length}</div><div className="small">échanges soumis</div></div>
        <div className="card card-pad"><div className="eyebrow">En attente</div><div className="h-2" style={{ marginTop: 6 }}>{enAttente}</div><div className="small">à traiter</div></div>
        <div className="card card-pad"><div className="eyebrow">Signalés</div><div className="h-2" style={{ marginTop: 6 }}>{signales}</div><div className="small">nécessitent une revue</div></div>
      </div>

      {isError && <div className="empty"><div className="glyph">❍</div>Impossible de charger les échanges.</div>}

      {!isError && (
        <DataTable
          columns={columns}
          rows={echanges}
          searchKeys={['sujet', 'client_nom', 'message']}
          filters={[
            { key: 'type', label: 'Tous les types', options: Object.entries(TYPE_LABEL).map(([value, label]) => ({ value, label })) },
            { key: 'statut', label: 'Tous les statuts', options: Object.keys(STATUT_TONE).map((s) => ({ value: s, label: s })) },
          ]}
          rowHref={(e) => `/admin/echange/${e.id}`}
          searchPlaceholder="Rechercher un membre, un sujet…"
          pageSize={8}
        />
      )}
    </>
  );
}
```

- [ ] **Step 2: Create the detail page (previously a dead link)**

Create `web/app/admin/echange/[id]/page.jsx`. `hide`/`report`/`update`/`delete` all live here per the brief; the list page keeps only a lightweight hide toggle so the row action column doesn't get crowded.

```jsx
'use client';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHead } from '@/components/ui/PageHead';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { ModalButton } from '@/components/ui/ModalButton';
import { api } from '@/lib/api';
import { useUI } from '@/lib/store';
import { dateFr } from '@/lib/format';

const STATUT_OPTIONS = ['en_attente', 'lu', 'en_cours', 'traite', 'archive', 'signale'];
const PRIORITE_OPTIONS = ['basse', 'moyenne', 'haute', 'urgente'];
const STATUT_TONE = { en_attente: 'warning', lu: 'info', en_cours: 'info', traite: 'success', archive: 'neutral', signale: 'danger' };
const TYPE_LABEL = { proposition: 'Proposition', demande: 'Demande', information: 'Information', autre: 'Autre' };

export default function AdminEchangeDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const toast = useUI((s) => s.toast);

  // adminShow flips statut en_attente -> lu server-side as a real, intentional side
  // effect (server/src/echanges/echanges.service.ts) — this page doesn't fight that;
  // viewing a submission is what marks it read, by design.
  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin', 'echanges', id],
    queryFn: () => api.get(`/echanges/${id}`),
  });
  const e = data?.data;
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin', 'echanges', id] });

  const updateMutation = useMutation({
    mutationFn: (values) => api.put(`/echanges/${id}`, values),
    onSuccess: () => { invalidate(); toast('Échange mis à jour', 'success'); },
    onError: (err) => toast(err.message || 'Erreur', 'danger'),
  });
  const hideMutation = useMutation({
    mutationFn: () => api.post(`/echanges/${id}/hide`),
    onSuccess: (res) => { invalidate(); toast(res.message, 'success'); },
    onError: (err) => toast(err.message || 'Erreur', 'danger'),
  });
  const reportMutation = useMutation({
    mutationFn: (motif_signalement) => api.post(`/echanges/${id}/report`, { motif_signalement }),
    onSuccess: () => { invalidate(); toast('Échange signalé', 'success'); },
    onError: (err) => toast(err.message || 'Erreur', 'danger'),
  });
  const deleteMutation = useMutation({
    mutationFn: () => api.del(`/echanges/${id}`),
    onSuccess: () => { toast('Échange supprimé', 'success'); router.push('/admin/echanges'); },
    onError: (err) => toast(err.message || 'Erreur', 'danger'),
  });

  if (isLoading) return <div className="empty"><div className="glyph">❍</div>Chargement…</div>;
  if (isError || !e) {
    return (
      <>
        <PageHead title="Échange introuvable" crumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Échanges', href: '/admin/echanges' }, { label: 'Introuvable' }]} />
        <div className="empty"><div className="glyph">❍</div>Cet échange n'existe pas.<div className="mt-3"><Link href="/admin/echanges" className="btn btn-soft btn-sm">Retour aux échanges</Link></div></div>
      </>
    );
  }

  const clientNom = e.client ? `${e.client.firstname} ${e.client.lastname}` : 'Client';

  return (
    <>
      <PageHead
        title={e.sujet}
        subtitle={`${TYPE_LABEL[e.type] || e.type} · ${clientNom}`}
        crumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Échanges', href: '/admin/echanges' }, { label: e.sujet }]}
        actions={<>
          <button className="btn btn-soft btn-sm" onClick={() => hideMutation.mutate()}>
            <Icon name={e.est_masque ? 'checkCircle' : 'x'} size={15} /> {e.est_masque ? 'Démasquer' : 'Masquer'}
          </button>
          <ModalButton modal="confirm" payload={{
            title: 'Signaler cet échange', withReason: true, reasonLabel: 'Motif du signalement',
            message: "L'échange sera marqué comme signalé.", confirmLabel: 'Signaler', successToast: null,
            onConfirm: (reason) => reportMutation.mutate(reason || 'Signalé par un administrateur'),
          }} className="btn btn-soft btn-sm"><Icon name="flag" size={15} /> Signaler</ModalButton>
          <ModalButton modal="confirm" payload={{
            title: "Supprimer l'échange", message: `« ${e.sujet} » sera définitivement supprimé.`,
            confirmLabel: 'Supprimer', danger: true, successToast: null,
            onConfirm: () => deleteMutation.mutate(),
          }} className="btn btn-danger-soft btn-sm"><Icon name="trash" size={15} /> Supprimer</ModalButton>
        </>}
      />

      <div className="grid" style={{ gridTemplateColumns: '1.6fr 1fr', gap: 20 }}>
        <div className="stack gap-5">
          <div className="card card-pad">
            <h3 className="h-3" style={{ marginBottom: 12 }}>Message</h3>
            <p className="body" style={{ marginBottom: 14 }}>{e.message}</p>
            {(e.ce_que_je_propose || e.ce_que_je_recherche) && (
              <div className="grid grid-2 gap-3">
                {e.ce_que_je_propose && <div><div className="eyebrow">Propose</div><p className="small">{e.ce_que_je_propose}</p></div>}
                {e.ce_que_je_recherche && <div><div className="eyebrow">Recherche</div><p className="small accent">{e.ce_que_je_recherche}</p></div>}
              </div>
            )}
            {e.format && <p className="tiny muted" style={{ marginTop: 10 }}>Modalité : {e.format}</p>}
            {e.delai_souhaite && <p className="tiny muted">Délai souhaité : {dateFr(e.delai_souhaite)}</p>}
          </div>

          {e.pieces_jointes?.length > 0 && (
            <div className="card card-pad">
              <h3 className="h-3" style={{ marginBottom: 12 }}>Pièces jointes</h3>
              <div className="stack gap-2">
                {e.pieces_jointes.map((f, i) => (
                  <div key={i} className="row gap-2 small"><Icon name="download" size={14} />{f.nom}</div>
                ))}
              </div>
            </div>
          )}

          <div className="card card-pad">
            <h3 className="h-3" style={{ marginBottom: 12 }}>Réponse admin</h3>
            <ModalButton modal="form" payload={{
              title: 'Répondre / mettre à jour', submitLabel: 'Enregistrer', successToast: null,
              fields: [
                { name: 'statut', label: 'Statut', type: 'select', options: STATUT_OPTIONS, value: e.statut },
                { name: 'priorite', label: 'Priorité', type: 'select', options: PRIORITE_OPTIONS, value: e.priorite },
                { name: 'reponse_admin', label: 'Réponse', type: 'textarea', value: e.reponse_admin },
              ],
              onSubmit: (values) => updateMutation.mutate(values),
            }} className="btn btn-primary btn-sm">Mettre à jour le statut / répondre</ModalButton>
            {e.reponse_admin && <p className="small" style={{ marginTop: 12 }}>{e.reponse_admin}</p>}
          </div>
        </div>

        <div className="stack gap-5">
          <div className="card card-pad">
            <h3 className="h-4" style={{ marginBottom: 14 }}>Statut</h3>
            <dl className="dl">
              <dt>Statut</dt><dd><Badge variant={STATUT_TONE[e.statut] || 'neutral'}>{e.statut}</Badge></dd>
              <dt>Priorité</dt><dd>{e.priorite}</dd>
              <dt>Masqué</dt><dd>{e.est_masque ? 'Oui' : 'Non'}</dd>
              {e.motif_signalement && <><dt>Motif du signalement</dt><dd>{e.motif_signalement}</dd></>}
            </dl>
          </div>

          <div className="card card-pad">
            <h3 className="h-4" style={{ marginBottom: 14 }}>Auteur</h3>
            <div className="row gap-3">
              <Avatar name={clientNom} size={44} />
              <div>
                <div style={{ fontWeight: 500 }}>{clientNom}</div>
                {e.client?.email && <div className="tiny">{e.client.email}</div>}
              </div>
            </div>
          </div>

          <div className="card card-pad">
            <h3 className="h-4" style={{ marginBottom: 14 }}>Horodatage</h3>
            <dl className="dl">
              <dt>Publié le</dt><dd>{dateFr(e.created_at)}</dd>
              <dt>Lu le</dt><dd>{e.lu_a ? dateFr(e.lu_a) : '—'}</dd>
              <dt>Traité le</dt><dd>{e.traite_a ? dateFr(e.traite_a) : '—'}</dd>
              <dt>Répondu le</dt><dd>{e.repondu_a ? dateFr(e.repondu_a) : '—'}</dd>
            </dl>
          </div>
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 3: Verify**

Run (from `web/`): `npm run lint` then `npm run build`.

Manual walkthrough: échanges list shows real submissions with real statut/priorité; clicking a row (previously a dead link) opens the new detail page; opening a fresh `en_attente` échange flips it to `lu` (confirm by reloading the list); "Mettre à jour le statut / répondre" persists `statut`/`priorite`/`reponse_admin` together; "Signaler" and "Masquer"/"Démasquer" both work from the detail page; "Supprimer" soft-deletes and returns to the list.

- [ ] **Step 4: Commit**

```bash
git add web/app/admin/echanges/page.jsx web/app/admin/echange/[id]/page.jsx
git commit -m "feat(web): wire admin echanges list to the real API, build the missing detail page"
```

---

## Task 23: Web — notifications admin page

**Files:**
- Modify: `web/app/admin/notifications/page.jsx`

**Finding beyond what the brief named directly — the "Alertes système" panel is fake too, not just `sentHistory`.** The brief calls out dropping `sentHistory` (`server/src/notifications` has no send-log table). Reading the page fully shows a *second* mock-only section: a static `adminNotifications` list ("Alertes système") imported from `@/lib/data/admin` — a hardcoded feed of system events ("Nouveau signalement", "Paiement en échec", etc.). There is no system-alerts table, entity, or endpoint anywhere in `server/src` either; `Notification` is purely the audience-broadcast CRUD resource (`audience`/`canal`/`titre`/`status`/`message`) confirmed by `server/src/database/entities/notification.entity.ts`. Both fake sections are replaced with one real list of actual `Notification` rows.

- [ ] **Step 1: Replace the page**

Replace `web/app/admin/notifications/page.jsx` in full:

```jsx
'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHead } from '@/components/ui/PageHead';
import { DataTable } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { ModalButton } from '@/components/ui/ModalButton';
import { useUI } from '@/lib/store';
import { api } from '@/lib/api';
import { dateFr } from '@/lib/format';

const notifFields = (n) => [
  { name: 'audience', label: 'Audience', type: 'text', value: n?.audience, required: true, placeholder: 'clients' },
  { name: 'canal', label: 'Canal', type: 'text', value: n?.canal, required: true, placeholder: 'email' },
  { name: 'titre', label: 'Titre', type: 'text', value: n?.titre, required: true },
  { name: 'message', label: 'Message', type: 'textarea', value: n?.message, required: true },
  { name: 'status', label: 'Statut', type: 'text', value: n?.status },
];

export default function AdminNotificationsPage() {
  const queryClient = useQueryClient();
  const toast = useUI((s) => s.toast);
  const { data, isError } = useQuery({
    queryKey: ['admin', 'notifications'],
    queryFn: () => api.get('/notifications?per_page=100'),
  });
  const notifications = data?.data ?? [];
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin', 'notifications'] });

  const createMutation = useMutation({
    mutationFn: (values) => api.post('/notifications', values),
    onSuccess: () => { invalidate(); toast('Notification créée', 'success'); },
    onError: (err) => toast(err.message || 'Erreur', 'danger'),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, values }) => api.put(`/notifications/${id}`, values),
    onSuccess: () => { invalidate(); toast('Notification mise à jour', 'success'); },
    onError: (err) => toast(err.message || 'Erreur', 'danger'),
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => api.del(`/notifications/${id}`),
    onSuccess: () => { invalidate(); toast('Notification supprimée', 'success'); },
    onError: (err) => toast(err.message || 'Erreur', 'danger'),
  });

  const composeButton = (
    <ModalButton modal="form" payload={{
      title: 'Composer une notification', submitLabel: 'Créer', successToast: null,
      fields: notifFields(null),
      onSubmit: (values) => createMutation.mutate(values),
    }} className="btn btn-primary btn-sm">
      <Icon name="bell" size={15} /> Composer
    </ModalButton>
  );

  const columns = [
    { key: 'titre', label: 'Notification', render: (n) => (
      <div>
        <div style={{ fontWeight: 500 }}>{n.titre}</div>
        <div className="tiny">{n.message?.length > 60 ? `${n.message.slice(0, 60)}…` : n.message}</div>
      </div>
    ) },
    { key: 'audience', label: 'Audience', render: (n) => <span className="small">{n.audience}</span> },
    { key: 'canal', label: 'Canal', render: (n) => <Badge variant="neutral">{n.canal}</Badge> },
    { key: 'created_at', label: 'Créée le', sortable: true, render: (n) => <span className="small">{dateFr(n.created_at)}</span> },
    { key: 'status', label: 'Statut', render: (n) => (n.status ? <Badge variant="info">{n.status}</Badge> : <span className="tiny muted">—</span>) },
    { key: 'actions', label: '', width: 100, render: (n) => (
      <div className="row gap-1" onClick={(e) => e.stopPropagation()}>
        <ModalButton modal="form" payload={{
          title: `Modifier « ${n.titre} »`, submitLabel: 'Enregistrer', successToast: null,
          fields: notifFields(n),
          onSubmit: (values) => updateMutation.mutate({ id: n.id, values }),
        }} className="btn btn-soft btn-sm btn-icon" as="div" title="Modifier"><Icon name="edit" size={14} /></ModalButton>
        <ModalButton modal="confirm" payload={{
          title: 'Supprimer la notification', message: `« ${n.titre} » sera définitivement supprimée.`,
          confirmLabel: 'Supprimer', danger: true, successToast: null,
          onConfirm: () => deleteMutation.mutate(n.id),
        }} className="btn btn-danger-soft btn-sm btn-icon" as="div" title="Supprimer"><Icon name="trash" size={14} /></ModalButton>
      </div>
    ) },
  ];

  return (
    <>
      <PageHead
        title="Notifications"
        subtitle={`${notifications.length} notification${notifications.length > 1 ? 's' : ''}`}
        crumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Notifications' }]}
        actions={composeButton}
      />

      {isError && <div className="empty"><div className="glyph">❍</div>Impossible de charger les notifications.</div>}

      {!isError && (
        <DataTable
          columns={columns}
          rows={notifications}
          searchKeys={['titre', 'message', 'audience']}
          filters={[{ key: 'canal', label: 'Tous les canaux', options: [...new Set(notifications.map((n) => n.canal))].filter(Boolean).map((c) => ({ value: c, label: c })) }]}
          searchPlaceholder="Rechercher une notification…"
          toolbar={composeButton}
          pageSize={10}
        />
      )}
    </>
  );
}
```

- [ ] **Step 2: Verify**

Run (from `web/`): `npm run lint` then `npm run build`.

- [ ] **Step 3: Commit**

```bash
git add web/app/admin/notifications/page.jsx
git commit -m "feat(web): wire admin notifications page to the notifications API"
```

---

## Task 24: Web — email templates admin page

**Files:**
- Modify: `web/app/admin/emails/page.jsx`

Real `CreateEmailTemplateDto` fields: `nom`, `objet`, `corps`, optional `statut` (`actif | inactif | archive` — **three** French values, not the mock's two-value English `{active, draft}`) and `variables` (server-derived — auto-extracted from `{{placeholder}}` tokens in `corps`, confirmed by `email-templates.e2e-spec.ts`; never submitted by the client, shown read-only). The mock's "Aperçu" button was already self-labeled `(démo)` in its own toast message (`ToastButton message="Aperçu de « ${t.name} » (démo)"`) — an honest admission it was never real. There is no template-rendering/preview route on `EmailTemplatesController`, so it's dropped rather than wired to something that doesn't exist.

- [ ] **Step 1: Replace the page**

Replace `web/app/admin/emails/page.jsx` in full:

```jsx
'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHead } from '@/components/ui/PageHead';
import { DataTable } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { ModalButton } from '@/components/ui/ModalButton';
import { useUI } from '@/lib/store';
import { api } from '@/lib/api';
import { dateFr } from '@/lib/format';

const STATUT_LABEL = { actif: 'Actif', inactif: 'Inactif', archive: 'Archivé' };
const STATUT_TONE = { actif: 'success', inactif: 'neutral', archive: 'neutral' };

const templateFields = (t) => [
  { name: 'nom', label: 'Nom du modèle', type: 'text', value: t?.nom, required: true },
  { name: 'objet', label: 'Objet', type: 'text', value: t?.objet, required: true },
  { name: 'corps', label: "Corps de l'email", type: 'textarea', value: t?.corps, required: true },
  { name: 'statut', label: 'Statut', type: 'select', options: Object.keys(STATUT_LABEL), value: t?.statut || 'actif' },
];

export default function AdminEmailsPage() {
  const queryClient = useQueryClient();
  const toast = useUI((s) => s.toast);
  const { data, isError } = useQuery({
    queryKey: ['admin', 'emails'],
    queryFn: () => api.get('/emails?per_page=100'),
  });
  const templates = data?.data ?? [];
  const active = templates.filter((t) => t.statut === 'actif').length;
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin', 'emails'] });

  const createMutation = useMutation({
    mutationFn: (values) => api.post('/emails', values),
    onSuccess: () => { invalidate(); toast('Modèle créé', 'success'); },
    onError: (err) => toast(err.message || 'Erreur', 'danger'),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, values }) => api.put(`/emails/${id}`, values),
    onSuccess: () => { invalidate(); toast('Modèle mis à jour', 'success'); },
    onError: (err) => toast(err.message || 'Erreur', 'danger'),
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => api.del(`/emails/${id}`),
    onSuccess: () => { invalidate(); toast('Modèle supprimé', 'success'); },
    onError: (err) => toast(err.message || 'Erreur', 'danger'),
  });

  const columns = [
    { key: 'nom', label: 'Modèle', render: (t) => (
      <div className="row gap-2">
        <span className="tile-icon glyph-violet" style={{ fontSize: 15, width: 30, height: 30 }}><Icon name="mail" size={15} /></span>
        <div>
          <span className="table-cell-main">{t.nom}</span>
          {t.variables?.length > 0 && <div className="tiny muted">{t.variables.map((v) => `{{${v}}}`).join(' ')}</div>}
        </div>
      </div>
    ) },
    { key: 'objet', label: 'Objet', render: (t) => <span className="small" style={{ display: 'block', maxWidth: 320 }}>{t.objet}</span> },
    { key: 'updated_at', label: 'Mis à jour', width: 130, sortable: true, render: (t) => <span className="small">{dateFr(t.updated_at)}</span> },
    { key: 'statut', label: 'Statut', width: 110, render: (t) => <Badge variant={STATUT_TONE[t.statut] || 'neutral'} dot>{STATUT_LABEL[t.statut] || t.statut}</Badge> },
    { key: 'actions', label: '', width: 100, render: (t) => (
      <div className="row gap-1" onClick={(e) => e.stopPropagation()}>
        <ModalButton modal="form" payload={{
          title: `Modifier « ${t.nom} »`, submitLabel: 'Enregistrer', successToast: null,
          fields: templateFields(t),
          onSubmit: (values) => updateMutation.mutate({ id: t.id, values }),
        }} className="btn btn-soft btn-sm btn-icon" as="div" title="Modifier"><Icon name="edit" size={15} /></ModalButton>
        <ModalButton modal="confirm" payload={{
          title: 'Supprimer le modèle', message: `« ${t.nom} » sera archivé (suppression douce).`,
          confirmLabel: 'Supprimer', danger: true, successToast: null,
          onConfirm: () => deleteMutation.mutate(t.id),
        }} className="btn btn-danger-soft btn-sm btn-icon" as="div" title="Supprimer"><Icon name="trash" size={15} /></ModalButton>
      </div>
    ) },
  ];

  return (
    <>
      <PageHead
        title="Modèles d'emails"
        subtitle={`${templates.length} modèles · ${active} actifs`}
        crumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Emails' }]}
        actions={
          <ModalButton modal="form" payload={{
            title: 'Nouveau modèle', submitLabel: 'Créer le modèle', successToast: null,
            fields: templateFields(null),
            onSubmit: (values) => createMutation.mutate(values),
          }} className="btn btn-primary btn-sm">
            <Icon name="plus" size={15} /> Nouveau modèle
          </ModalButton>
        }
      />

      {isError && <div className="empty"><div className="glyph">❍</div>Impossible de charger les modèles.</div>}

      {!isError && (
        <DataTable
          columns={columns}
          rows={templates}
          searchKeys={['nom', 'objet']}
          filters={[{ key: 'statut', label: 'Tous les statuts', options: Object.entries(STATUT_LABEL).map(([value, label]) => ({ value, label })) }]}
          searchPlaceholder="Rechercher un modèle…"
          pageSize={8}
        />
      )}
    </>
  );
}
```

- [ ] **Step 2: Verify**

Run (from `web/`): `npm run lint` then `npm run build`.

Manual walkthrough: creating/editing a template with `{{prenom}}`-style placeholders in `corps` shows the server-derived `variables` chips under the template name after a refetch — proving the extraction is real, not something this page computes.

- [ ] **Step 3: Commit**

```bash
git add web/app/admin/emails/page.jsx
git commit -m "feat(web): wire admin emails page to the email-templates API with real statut values"
```

---

## Task 25: Web — promotions admin page

**Files:**
- Modify: `web/app/admin/promotions/page.jsx`

Per the brief: `CreatePromotionDto`/`UpdatePromotionDto` (`server/src/promotions/dto/*.ts`) have no `status` field at all, even though `Promotion.status` exists as a nullable DB column — so the create/edit form has no status control, but the list still shows the real value when one happens to be present. In practice it will read `—` for essentially every row: nothing in this DTO pair ever writes to that column (the entity has no default either), so once this plan ships, `status` stays `null` for every promotion created through the admin UI unless something outside this plan's scope sets it directly in the database. That's a real, honestly-displayed gap, not a bug in this task.

**Also dropped, found during this task's read of the page:** the mock's "Utilisations" column (`r.uses`/`r.max`) and its "Utilisations totales"/"Codes archivés" stat cards. `Promotion` has no redemption-tracking column and there is no separate redemptions table — `code`, `type`, `valeur`, `date_expiration`, `status` is the entire entity. Replaced with stat cards built from real, currently-loaded data (total codes, split by `type`).

- [ ] **Step 1: Replace the page**

Replace `web/app/admin/promotions/page.jsx` in full:

```jsx
'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHead } from '@/components/ui/PageHead';
import { StatCard } from '@/components/ui/StatCard';
import { DataTable } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { ModalButton } from '@/components/ui/ModalButton';
import { useUI } from '@/lib/store';
import { api } from '@/lib/api';
import { dateFr, euro } from '@/lib/format';

const promoFields = (p) => [
  { name: 'code', label: 'Code', type: 'text', value: p?.code, required: true, placeholder: 'EQUINOXE25' },
  { name: 'type', label: 'Type', type: 'select', options: ['pourcentage', 'fixe'], value: p?.type || 'pourcentage', required: true },
  { name: 'valeur', label: 'Valeur', type: 'number', value: p?.valeur, required: true },
  { name: 'date_expiration', label: "Date d'expiration", type: 'date', value: p?.date_expiration, required: true },
];

export default function AdminPromotionsPage() {
  const queryClient = useQueryClient();
  const toast = useUI((s) => s.toast);
  const { data, isError } = useQuery({
    queryKey: ['admin', 'promotions'],
    queryFn: () => api.get('/promotions?per_page=100'),
  });
  const promos = data?.data ?? [];
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin', 'promotions'] });

  const createMutation = useMutation({
    mutationFn: (values) => api.post('/promotions', { ...values, valeur: Number(values.valeur) }),
    onSuccess: () => { invalidate(); toast('Code promo créé', 'success'); },
    onError: (err) => toast(err.message || 'Erreur', 'danger'),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, values }) => api.put(`/promotions/${id}`, { ...values, valeur: Number(values.valeur) }),
    onSuccess: () => { invalidate(); toast('Code promo mis à jour', 'success'); },
    onError: (err) => toast(err.message || 'Erreur', 'danger'),
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => api.del(`/promotions/${id}`),
    onSuccess: () => { invalidate(); toast('Code promo supprimé', 'success'); },
    onError: (err) => toast(err.message || 'Erreur', 'danger'),
  });

  const createButton = (
    <ModalButton modal="form" payload={{
      title: 'Créer un code promo', submitLabel: 'Créer', successToast: null,
      fields: promoFields(null),
      onSubmit: (values) => createMutation.mutate(values),
    }} className="btn btn-primary btn-sm">
      <Icon name="plus" size={15} /> Nouveau code
    </ModalButton>
  );

  const columns = [
    { key: 'code', label: 'Code', sortable: true, render: (r) => <span className="table-cell-main" style={{ fontFamily: 'monospace', letterSpacing: '.04em' }}>{r.code}</span> },
    { key: 'type', label: 'Remise', render: (r) => <Badge variant="info">{r.type === 'pourcentage' ? `${r.valeur}%` : euro(r.valeur)}</Badge> },
    { key: 'date_expiration', label: 'Expiration', sortable: true, render: (r) => <span className="small">{dateFr(r.date_expiration)}</span> },
    { key: 'status', label: 'Statut', render: (r) => (r.status ? <Badge variant="neutral">{r.status}</Badge> : <span className="tiny muted">—</span>) },
    { key: 'actions', label: '', width: 100, render: (r) => (
      <div className="row gap-2" onClick={(e) => e.stopPropagation()}>
        <ModalButton modal="form" payload={{
          title: `Modifier ${r.code}`, submitLabel: 'Enregistrer', successToast: null,
          fields: promoFields(r),
          onSubmit: (values) => updateMutation.mutate({ id: r.id, values }),
        }} className="btn btn-soft btn-sm btn-icon" as="div"><Icon name="edit" size={15} /></ModalButton>
        <ModalButton modal="confirm" payload={{
          title: `Supprimer ${r.code}`, message: `Le code ${r.code} sera définitivement supprimé.`,
          confirmLabel: 'Supprimer', danger: true, successToast: null,
          onConfirm: () => deleteMutation.mutate(r.id),
        }} className="btn btn-danger-soft btn-sm btn-icon" as="div"><Icon name="trash" size={15} /></ModalButton>
      </div>
    ) },
  ];

  return (
    <>
      <PageHead
        title="Codes promo"
        subtitle="Réductions et campagnes d'acquisition."
        crumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Promotions' }]}
        actions={createButton}
      />

      <div className="grid grid-3" style={{ marginBottom: 24 }}>
        <StatCard label="Codes" value={String(promos.length)} icon="ticket" />
        <StatCard label="En pourcentage" value={String(promos.filter((p) => p.type === 'pourcentage').length)} icon="tag" />
        <StatCard label="Montant fixe" value={String(promos.filter((p) => p.type === 'fixe').length)} icon="euro" />
      </div>

      {isError && <div className="empty"><div className="glyph">❍</div>Impossible de charger les codes promo.</div>}

      {!isError && (
        <DataTable
          columns={columns}
          rows={promos}
          searchKeys={['code']}
          filters={[{ key: 'type', label: 'Tous les types', options: [{ value: 'pourcentage', label: 'Pourcentage' }, { value: 'fixe', label: 'Montant fixe' }] }]}
          searchPlaceholder="Rechercher un code…"
          pageSize={10}
          toolbar={createButton}
        />
      )}
    </>
  );
}
```

- [ ] **Step 2: Verify**

Run (from `web/`): `npm run lint` then `npm run build`.

Manual walkthrough: creating a code with a `date_expiration` of today (not strictly after) surfaces the backend's 422 as a toast; a duplicate `code` does the same; the list never offers a status editor.

- [ ] **Step 3: Commit**

```bash
git add web/app/admin/promotions/page.jsx
git commit -m "feat(web): wire admin promotions page to the promotions API, no status editor"
```

---

## Task 26: Web — clients admin pages (list, detail)

**Files:**
- Modify: `web/app/admin/clients/page.jsx`
- Modify: `web/app/admin/client/[id]/page.jsx`

Real `Client` entity (`server/src/database/entities/client.entity.ts`) is exactly `id`, `firstname`, `lastname`, `email`, `city`, `created_at`, `updated_at` — no `status`, no `bookings`, no `spent`. `ClientsController` (Task 8) has exactly one route, `index` — no admin show, no notes, no ban, no password reset, no export, for any client. The mock's stat cards (active count, total bookings, total spent) and the detail page's notes/suspend/reset-password/export/ban actions are all removed rather than disabled-in-place — `ModalButton` (`web/components/ui/ModalButton.jsx`) has no `disabled` prop to support a grayed-out affordance even if this plan wanted one (it destructures a fixed prop list and does not forward arbitrary extras), so a half-disabled button isn't actually achievable without changing that shared component, which is out of scope. **What genuinely is backed:** `PaiementsService.adminIndex()` (Task 20) accepts a `client_id` filter, so the detail page gets a real "payments for this client" table via `GET /paiements?client_id=<id>`.

- [ ] **Step 1: Replace the list page**

Replace `web/app/admin/clients/page.jsx` in full:

```jsx
'use client';
import { useQuery } from '@tanstack/react-query';
import { PageHead } from '@/components/ui/PageHead';
import { DataTable } from '@/components/ui/DataTable';
import { Avatar } from '@/components/ui/Avatar';
import { api } from '@/lib/api';
import { dateFr } from '@/lib/format';

export default function AdminClientsPage() {
  const { data, isError } = useQuery({
    queryKey: ['admin', 'clients'],
    queryFn: () => api.get('/clients?per_page=100'),
  });
  const clients = data?.data ?? [];

  const columns = [
    { key: 'firstname', label: 'Client', sortable: true, render: (c) => (
      <div className="row gap-3">
        <Avatar name={`${c.firstname} ${c.lastname}`} size={36} />
        <div><div style={{ fontWeight: 500 }}>{c.firstname} {c.lastname}</div><div className="tiny">{c.city}</div></div>
      </div>
    ) },
    { key: 'email', label: 'Email', render: (c) => <span className="small">{c.email}</span> },
    { key: 'city', label: 'Ville', sortable: true },
    { key: 'created_at', label: 'Inscrit le', sortable: true, render: (c) => <span className="small">{dateFr(c.created_at)}</span> },
  ];

  return (
    <>
      <PageHead
        title="Clients"
        subtitle={`${clients.length} client${clients.length > 1 ? 's' : ''}`}
        crumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Clients' }]}
      />

      {isError && <div className="empty"><div className="glyph">❍</div>Impossible de charger les clients.</div>}

      {!isError && (
        <DataTable
          columns={columns}
          rows={clients}
          searchKeys={['firstname', 'lastname', 'email', 'city']}
          rowHref={(c) => `/admin/client/${c.id}`}
          searchPlaceholder="Rechercher un client, un email…"
          pageSize={8}
        />
      )}
    </>
  );
}
```

No "Exporter" action here (the mock had one) — same reasoning as the dropped stat cards: there is no export route on `ClientsController` at all, unlike paiements (Task 20) where a real CSV export existed to wire instead.

- [ ] **Step 2: Replace the detail page**

Replace `web/app/admin/client/[id]/page.jsx` in full:

```jsx
'use client';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { PageHead } from '@/components/ui/PageHead';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { api } from '@/lib/api';
import { euro, dateFr } from '@/lib/format';

const STATUT_TONE = { paid: 'success', en_attente: 'warning', rembourse: 'info' };

export default function ClientDetailPage() {
  const { id } = useParams();
  // ClientsController has only `index` — no admin show route exists for a single
  // client at all (not even a ClientGuard-scoped one, unlike paiements). Derive from
  // the same admin list query the list page uses; same 100-row-cap caveat as Task 20.
  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin', 'clients'],
    queryFn: () => api.get('/clients?per_page=100'),
  });
  const c = (data?.data ?? []).find((x) => String(x.id) === String(id));

  const { data: paiementsData } = useQuery({
    queryKey: ['admin', 'paiements', 'client', id],
    queryFn: () => api.get(`/paiements?client_id=${id}&per_page=100`),
    enabled: !!c,
  });
  const paiements = paiementsData?.data ?? [];

  if (isLoading) return <div className="empty"><div className="glyph">❍</div>Chargement…</div>;
  if (isError || !c) {
    return (
      <>
        <PageHead title="Client introuvable" crumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Clients', href: '/admin/clients' }, { label: 'Introuvable' }]} />
        <div className="empty"><div className="glyph">❍</div>Aucun client ne correspond à cet identifiant.</div>
      </>
    );
  }

  return (
    <>
      <PageHead
        title={`${c.firstname} ${c.lastname}`}
        subtitle={`Client depuis le ${dateFr(c.created_at)} · ${c.city}`}
        crumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Clients', href: '/admin/clients' }, { label: `${c.firstname} ${c.lastname}` }]}
      />

      <div className="card card-pad" style={{ marginBottom: 22 }}>
        <div className="row gap-4 wrap">
          <Avatar name={`${c.firstname} ${c.lastname}`} size={64} />
          <div className="flex-1">
            <h2 className="h-3" style={{ marginBottom: 4 }}>{c.firstname} {c.lastname}</h2>
            <div className="small row gap-3 wrap">
              <span className="row gap-2"><Icon name="mail" size={14} color="var(--muted)" /> {c.email}</span>
              <span className="row gap-2"><Icon name="pin" size={14} color="var(--muted)" /> {c.city}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        <div className="between" style={{ padding: '18px 20px' }}>
          <h3 className="h-4">Paiements de ce client</h3>
          <span className="tiny muted">{paiements.length}</span>
        </div>
        <table className="table">
          <thead><tr><th>Référence</th><th>Praticien</th><th>Date</th><th>Montant</th><th>Statut</th></tr></thead>
          <tbody>
            {paiements.length === 0 ? (
              <tr><td colSpan={5}><div className="empty"><div className="glyph">❍</div>Aucun paiement</div></td></tr>
            ) : paiements.map((p) => (
              <tr key={p.id}>
                <td className="table-cell-main">{p.reference}</td>
                <td className="small">{p.praticien ? `${p.praticien.firstname} ${p.praticien.lastname}` : 'N/A'}</td>
                <td className="small">{dateFr(p.date_paiement)}</td>
                <td>{euro(p.montant_brut)}</td>
                <td><Badge variant={STATUT_TONE[p.statut] || 'neutral'}>{p.statut}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="tiny muted" style={{ marginTop: 16 }}>
        Notes internes, suspension, réinitialisation de mot de passe et export de données ne sont pas disponibles ici — le backend n'expose aujourd'hui qu'une fiche client minimale.
      </p>
    </>
  );
}
```

- [ ] **Step 3: Verify**

Run (from `web/`): `npm run lint` then `npm run build`.

Manual walkthrough: clients list loads real rows; a client's detail page shows their real payments (filtered server-side by `client_id`, not filtered client-side from the full paiements list); no note/ban/reset-password/export button is present anywhere.

- [ ] **Step 4: Commit**

```bash
git add web/app/admin/clients/page.jsx web/app/admin/client/[id]/page.jsx
git commit -m "feat(web): wire admin clients pages to the clients API, drop unsupported affordances"
```

---

## Task 27: Web — équipe (team) admin page

**Files:**
- Modify: `web/app/admin/equipe/page.jsx`

Real data source: `GET /api/admin/list` (`server/src/auth/admin-auth/admin-auth.controller.ts`, already complete and guarded — read in the architecture note at the top of this plan). It returns `User` rows filtered to `is_admin = true`, sanitized (`sanitizeUser` strips `password`/`remember_token`): `id`, `name`, `email`, `is_admin`, `last_login_at`, `ip_address`, `created_at`, `updated_at`. There is no `role` (Administrateur/Modérateur/Support/Comptabilité) or `status` (`active`/`invited`) column anywhere — every row returned by this endpoint is, by construction, a currently-active admin, so a client-computed "active" count would always trivially equal the total. The mock's role badges, role filter, "Modérateurs" stat, and the "Rôles" card's hardcoded `4` are all dropped; replaced with two real stats (total members, members who have logged in at least once — derived from the real nullable `last_login_at`, not invented).

**Real backend constraint that shapes this page: `AdminAuthService.list()` filters to `is_admin = true`, so a deactivated admin (`is_admin` flipped to `false` by the deactivate endpoint) disappears from this list on the next refetch.** There is no other admin page that lists inactive admins. That makes `POST /api/admin/:id/activate` **unreachable from this UI** — there is no row anywhere to click "reactivate" on once someone is deactivated. This page therefore wires `deactivate` and `delete` (both act on rows that are, by definition, currently visible) but does not add any UI for `activate`. This isn't one of the brief's two "pick one" decisions, but it's the same kind of real constraint forcing a UI simplification, so it's called out the same way.

**Decision — "Inviter" is wired to `POST /api/admin/register`, relabeled, not disabled.** The brief asks to pick one: wire it to direct account creation (no email-invite flow exists backend-side), or disable it. This plan wires it. Reasoning: there is no other entry point anywhere in the admin panel to create a new admin account — disabling this button would mean the only way to add a teammate is `POST /api/admin/register` from a raw HTTP client, which is a strictly worse outcome for a plan whose stated goal is "every admin screen backed by an existing endpoint is live." The button is relabeled "Ajouter un administrateur" (not "Inviter") and its modal subtitle says plainly that this creates the account directly with the password entered, with no email step — so the UI doesn't claim a capability (email invitations) that isn't there, while still making the real, complete `register` endpoint reachable from the one place an admin would look for it. `POST /api/admin/register` is intentionally unguarded on the backend (it's the bootstrap route for creating the very first admin, same shape as client/praticien self-registration) — this task does not change that; it only adds a UI path to it for already-authenticated admins.

**Implementation note — `ModalButton` has no `disabled` prop (confirmed while writing Task 26), so "you can't deactivate/delete yourself" (enforced server-side already, `AdminAuthService.deactivate`/`destroy` both 400 on `current.id === id`) is expressed by not rendering the action buttons for the signed-in admin's own row, not by a disabled button.**

- [ ] **Step 1: Replace the page**

Replace `web/app/admin/equipe/page.jsx` in full:

```jsx
'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHead } from '@/components/ui/PageHead';
import { DataTable } from '@/components/ui/DataTable';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { ModalButton } from '@/components/ui/ModalButton';
import { useUI } from '@/lib/store';
import { useAdminAuth } from '@/lib/admin-auth-store';
import { api } from '@/lib/api';
import { dateFr } from '@/lib/format';

export default function TeamPage() {
  const queryClient = useQueryClient();
  const toast = useUI((s) => s.toast);
  const me = useAdminAuth((s) => s.admin);
  const { data, isError } = useQuery({
    queryKey: ['admin', 'team'],
    queryFn: () => api.get('/admin/list?per_page=100'),
  });
  const team = data?.data ?? [];
  const everLoggedIn = team.filter((u) => u.last_login_at).length;
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin', 'team'] });

  const addAdminMutation = useMutation({
    mutationFn: (values) => api.post('/admin/register', values),
    onSuccess: () => { invalidate(); toast('Administrateur ajouté', 'success'); },
    onError: (err) => toast(err.message || 'Erreur', 'danger'),
  });
  const deactivateMutation = useMutation({
    mutationFn: (id) => api.post(`/admin/${id}/deactivate`),
    onSuccess: () => { invalidate(); toast('Administrateur désactivé', 'success'); },
    onError: (err) => toast(err.message || 'Erreur', 'danger'),
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => api.del(`/admin/${id}`),
    onSuccess: () => { invalidate(); toast('Administrateur supprimé', 'success'); },
    onError: (err) => toast(err.message || 'Erreur', 'danger'),
  });

  const columns = [
    { key: 'name', label: 'Membre', sortable: true, render: (u) => (
      <div className="row gap-3">
        <Avatar name={u.name} size={36} />
        <div><div style={{ fontWeight: 500 }}>{u.name}</div><div className="tiny">{u.email}</div></div>
      </div>
    ) },
    { key: 'last_login_at', label: 'Dernière connexion', sortable: true, render: (u) => <span className="small">{u.last_login_at ? dateFr(u.last_login_at) : 'Jamais connecté'}</span> },
    { key: 'created_at', label: 'Membre depuis', sortable: true, render: (u) => <span className="small">{dateFr(u.created_at)}</span> },
    {
      key: 'actions', label: '', width: 130,
      render: (u) => {
        if (me?.id === u.id) return <span className="tiny muted">Vous</span>;
        return (
          <div className="row gap-2" onClick={(e) => e.stopPropagation()}>
            <ModalButton modal="confirm" payload={{
              title: 'Désactiver cet administrateur', danger: true,
              message: `${u.name} perdra l'accès à l'administration.`,
              confirmLabel: 'Désactiver', successToast: null,
              onConfirm: () => deactivateMutation.mutate(u.id),
            }} className="btn btn-danger-soft btn-sm btn-icon" as="button" title="Désactiver">
              <Icon name="shield" size={15} />
            </ModalButton>
            <ModalButton modal="confirm" payload={{
              title: 'Supprimer cet administrateur', danger: true,
              message: `« ${u.name} » sera définitivement supprimé.`,
              confirmLabel: 'Supprimer', successToast: null,
              onConfirm: () => deleteMutation.mutate(u.id),
            }} className="btn btn-danger-soft btn-sm btn-icon" as="button" title="Supprimer">
              <Icon name="trash" size={15} />
            </ModalButton>
          </div>
        );
      },
    },
  ];

  return (
    <>
      <PageHead
        title="Équipe"
        subtitle={`${team.length} administrateur${team.length > 1 ? 's' : ''}`}
        crumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Équipe' }]}
        actions={
          <ModalButton modal="form" payload={{
            title: 'Ajouter un administrateur',
            subtitle: "Crée directement un compte avec ce mot de passe — il n'y a pas de flux d'invitation par email.",
            submitLabel: 'Créer le compte', successToast: null,
            fields: [
              { name: 'name', label: 'Nom', type: 'text', required: true },
              { name: 'email', label: 'Email', type: 'email', required: true },
              { name: 'password', label: 'Mot de passe (8 caractères min.)', type: 'password', required: true },
              { name: 'password_confirmation', label: 'Confirmer le mot de passe', type: 'password', required: true },
            ],
            onSubmit: (values) => addAdminMutation.mutate(values),
          }} className="btn btn-primary btn-sm">
            <Icon name="plus" size={15} /> Ajouter un administrateur
          </ModalButton>
        }
      />

      <div className="grid grid-2" style={{ marginBottom: 22 }}>
        <div className="card card-pad"><div className="eyebrow">Membres</div><div className="h-2" style={{ marginTop: 6 }}>{team.length}</div><div className="small">administrateurs actifs</div></div>
        <div className="card card-pad"><div className="eyebrow">Déjà connectés</div><div className="h-2" style={{ marginTop: 6 }}>{everLoggedIn}</div><div className="small">au moins une fois</div></div>
      </div>

      {isError && <div className="empty"><div className="glyph">❍</div>Impossible de charger l'équipe.</div>}

      {!isError && (
        <DataTable
          columns={columns}
          rows={team}
          searchKeys={['name', 'email']}
          searchPlaceholder="Rechercher un membre…"
          pageSize={10}
        />
      )}
    </>
  );
}
```

- [ ] **Step 2: Verify**

Run (from `web/`): `npm run lint` then `npm run build`.

Manual walkthrough: équipe list shows real admins; "Ajouter un administrateur" creates a real, immediately-usable admin account (test logging in with it from `/admin/connexion` in a private window); the signed-in admin's own row shows "Vous" instead of action buttons; deactivating another admin makes them disappear from the list on refetch (matching the real backend's `is_admin = true` filter — this is expected, not a bug); deleting works the same way `admin-auth.e2e-spec.ts` already verifies server-side.

- [ ] **Step 3: Commit**

```bash
git add web/app/admin/equipe/page.jsx
git commit -m "feat(web): wire admin equipe page to the admin management API"
```

---

## Self-Review

Applied against the whole document — Tasks 1–4 (already written before this pass) and Tasks 5–27 (written in this pass) — per the writing-plans skill.

**1. Spec coverage.**
- **Part A (backend guards).** All 8 class/method-mixed controllers the brief names have a task: `ArticlesController` (Task 1), `CerclesController` (Task 2), `DisciplinesController` (Task 3), `EventsController` (Task 4), `EmailTemplatesController` (Task 5), `NotificationsController` (Task 6), `PromotionsController` (Task 7), `ClientsController` (Task 8). All 3 mixed client/admin controllers have a task with every named admin route guarded at method level: `EchangesController` — 8 routes (Task 9), `PaiementsController` — 5 routes (Task 10), `RemboursementsController` — 7 routes (Task 11), matching the counts already committed to in the File Structure table before this pass started. The one new backend surface the brief's own architecture note permits (praticien document streaming) is built in Task 12. Every guard task follows the same TDD shape: update the e2e spec first, confirm it fails against the unguarded code, add the guard, confirm green, commit — no task skips the "verify red" step.
- **Part B (web admin auth).** `web/lib/admin-auth-store.js` + Vitest coverage (Task 13), `apiFetchBlob` + Vitest coverage (Task 13), `/admin/connexion` + `AdminAuthGate` + layout wiring (Task 14) are all present, isolated from any hypothetical client-facing store (own file, own `localStorage` key, never imported outside `/admin`), and call the already-complete `POST /api/admin/login`.
- **Part C (web admin CRUD wiring).** Every one of the 13 bullets in the brief's Part C has a task and every file named in each bullet is covered: disciplines (Task 15), events × 3 files (Task 16), articles × 2 files (Task 17), cercles × 2 files (Task 18), praticiens × 2 files (Task 19), paiements × 2 files (Task 20), remboursements (Task 21), échanges × 2 files including the new detail page (Task 22), notifications (Task 23), emails (Task 24), promotions (Task 25), clients × 2 files (Task 26), équipe (Task 27). 27 tasks total, 27 commits, no task left as a stub.

**2. Placeholder scan.** Grepped the full file for `TBD`, `TODO`, `FIXME`, `add appropriate`, `XXX`, `to be determined`, `placeholder logic`, `coming soon` — zero matches. Every task's steps name exact files, exact function/field names, and exact commands (`npm run test:e2e -- <file>`, `npm run lint`, `npm run build`) rather than vague instructions like "add tests" or "wire up the API."

**3. Type/signature consistency.** Every web form and mutation payload in Tasks 15–27 was cross-checked line-by-line against the actual backend DTO it calls (not the mock's field names). Two mismatches were exactly the kind the task brief warned this would matter for, and both are fixed in the plan as written, not left as an exercise:
   - **Disciplines** — mock used `name`/`slug`/`tone`/`glyph`/`tagline`; the real `CreateDisciplineDto` is `nom`/`tonalite`/`glyphe`/`accroche` (no `slug` — server-derived). Task 15's form uses the real names.
   - **Email templates** — mock used a two-value English `status: {active, draft}`; the real `CreateEmailTemplateDto.statut` is a three-value French enum (`actif | inactif | archive`). Task 24's form uses the real enum.
   Beyond those two, every other create/update payload in Tasks 15–27 (events, articles, cercles, praticien verification, notifications, promotions, échanges, équipe/register) was checked field-by-field against its DTO during writing; none send a field the DTO doesn't accept and none omit a field the DTO requires. Two additional, more structural mismatches were also caught: the promotions form correctly has no `status` control at all (matching the brief's explicit note that `CreatePromotionDto` doesn't accept one), and the échanges admin-update form omits `traite_par` (server-derived from the bearer token, never client-submitted) even though it's part of the same DTO as the fields the form does submit.

**4. Commit message hygiene.** Grepped the full file for `Co-Authored-By`, `Claude`, `Anthropic` (case-insensitive) — zero matches across all 27 tasks' commit messages, confirming the pre-existing Tasks 1–4 commits also carry no AI-attribution trailer and that nothing added in this pass introduces one.

**5. Corrections to the brief found while researching, beyond the two the brief already anticipated (disciplines/emails field names).**
   - The brief states "there's no dedicated `email-templates.e2e-spec.ts`" — this is factually wrong; `server/test/email-templates.e2e-spec.ts` already exists with 3 passing tests. Task 5 extends that existing file (adds the auth-required test, wraps existing calls in `asAdmin()`) rather than creating a duplicate. `clients.e2e-spec.ts` genuinely did not exist and is created fresh in Task 8, exactly as the brief expected for that one.
   - Events have no publish/status-change mechanism at all — `CreateEventDto`/`UpdateEventDto` have no `status` field and `EventsController` has no `/publish` route (unlike articles). Task 16 removes the mock's "Publier" actions and hero "Publié" badge rather than leaving them wired to nothing, and says so explicitly since it's a real, un-worked-around product gap.
   - `Paiement.rendez_vous_id` exists as a column but is never joined or populated anywhere in `server/src` (no `rendez_vous` module exists at all — that's Plan 05/R3 scope). The mock's "Réservation liée" card on the paiement detail page is dropped, not just its field names fixed (Task 20).
   - The "Alertes système" panel on the notifications page and the "Utilisations/max" column + two stat cards on the promotions page are both fake with no backing table, beyond the specific fields the brief called out for each of those two pages (Tasks 23, 25).
   - `ModalButton` (`web/components/ui/ModalButton.jsx`) does not forward a `disabled` prop — discovered while wiring the équipe page's "can't act on your own row" rule (Task 27) and confirmed by rereading the component's actual prop list; "no self-service" is expressed by not rendering the buttons for that row, not by disabling them, and this is called out explicitly since a naive `disabled={isSelf}` would have silently done nothing.

**6. Deliberate, uniform simplifications (disclosed once here rather than re-justified in every task).**
   - Every mutation's `onError` handler shows `err.message` (the backend's top-level `"Erreur de validation"` string for a 422) rather than digging into `err.body.errors` for the specific field message. This is a real loss of detail, applied identically in all 27 tasks — fixing it everywhere would mean re-touching every already-written mutation for a UX polish item the brief didn't ask for; introducing it only in the last-written task would have been a worse, silent inconsistency. If a future pass wants per-field error detail, the fix is one shared helper (e.g. `const detail = err.body?.errors ? Object.values(err.body.errors).flat().join(' ') : err.message;`), applied everywhere at once.
   - `FormModal`/`ConfirmModal` (not modified by this plan) close optimistically before their `onSubmit`/`onConfirm` callback's async result is known — documented once, in Task 15, as a property of the shared modal system every later task inherits rather than re-derives.
   - Every paginated admin list fetches `?per_page=100` (the server's hard cap) and hands the page to `DataTable`'s own client-side search/sort/pagination — documented once, in Task 16, since every later list page (paiements, remboursements, échanges, notifications, emails, promotions, clients, équipe) uses the same shape.

## Exit criteria

- Every admin-CRUD backend controller that was reachable with zero authentication at the start of this plan (`ArticlesController`, `CerclesController`, `DisciplinesController`, `EventsController` on their write routes; `EmailTemplatesController`, `NotificationsController`, `PromotionsController`, `ClientsController` fully; `EchangesController`, `PaiementsController`, `RemboursementsController` on their admin routes) now rejects unauthenticated requests with 401 and non-admin requests with 403 — verified by e2e tests that were red before each guard landed and green after.
- Every public read route this plan depends on (Plan 02's anonymous article/cercle/discipline/event browsing) is unaffected — confirmed by each guard task's e2e spec explicitly asserting the relevant `index`/`show` route stays reachable with no token.
- Every client-guarded route (the échanges/paiements/remboursements client halves) is unaffected — confirmed by each of Tasks 9–11's e2e spec keeping the existing client-flow tests passing unchanged.
- A real admin can log in at `/admin/connexion`, is redirected there automatically when unauthenticated and away from it automatically once authenticated, stays signed in across a refresh (persisted, SSR-safe token), and can sign out.
- Every admin page named in the brief's Part C shows live backend data with working create/update/delete/status-transition actions where the backend supports them, and has zero remaining `@/lib/data/*` mock imports, zero remaining `generateStaticParams`-based detail pages, and zero UI sections describing data or capabilities (attendees, program steps, cercle members/feed, fake deltas, fake send-logs, fake status editors, fake refund buttons, fake role systems) that the real schema and DTOs do not actually back.
- What this plan does **not** unblock: bookings/Stripe (Plan 05 — the dangling `rendez_vous_id` stays dangling), reviews/reports/favorites (Plan 07), and messaging/subscriptions/disputes/roles/audit/analytics/integrations (Plan 08, deferred indefinitely). Nothing in this plan depends on any of those landing first, and nothing it does needs to be revisited when they do, except that a future roles/permissions system (Plan 08, if ever un-deferred) would be the natural place to finally give `équipe` a real `role` column instead of the uniform "every row here is an admin" reality Task 27 works within today.
- This is the admin-side completion milestone for the roadmap: it does not directly unblock any other numbered plan (Plan 09/Polish is scoped to mobile dead-ends, not admin), but it is the last plan standing between the current mock admin panel and a real one.
