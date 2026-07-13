# PHP (Laravel) → NestJS Server Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the Laravel API in `server/` as a NestJS app in `server-nest/` with endpoint/response parity (same paths, same JSON envelopes, same French messages), fixing known Laravel bugs deliberately.

**Architecture:** NestJS 11 modular monolith. One Nest module per Laravel controller group. TypeORM entities mirror the Laravel schema (corrected — the PHP models reference columns the migrations never created). Auth is single-model JWT (users table) exactly like the PHP app: "admin" = `is_admin` flag, "praticien" = users row + praticiens row joined by email, "client" = users row + clients row joined by email (fixes the undefined `client` guard). Responses use the Laravel envelope `{status: "success"|"error", ...}` built by shared helpers. E2E tests run on in-memory SQLite (better-sqlite3, `synchronize: true`); production runs MySQL via one hand-written initial migration.

**Tech Stack:** NestJS 11, TypeORM 0.3, MySQL (mysql2) prod / better-sqlite3 tests, @nestjs/jwt + passport-jwt (HS256, reuses `JWT_SECRET`), bcryptjs (verifies Laravel `$2y$` hashes), class-validator/class-transformer, multer (file uploads), Jest + supertest.

---

## Decisions locked in (deviations from PHP are deliberate fixes — each flagged)

| # | PHP behavior | Nest behavior | Why |
|---|---|---|---|
| D1 | `admin` middleware alias never registered → `v1/admin/praticiens/verification*` routes crash at runtime | `JwtAuthGuard + AdminGuard` on those routes | Fix broken authz |
| D2 | `Auth::guard('client')` undefined → all client-scoped endpoints (echanges client, paiements client, remboursements client) 500 | `JwtAuthGuard + ClientGuard`: resolves `clients` row by `user.email`, 403 if none (same email-join pattern the app already uses for praticien) | Make client endpoints functional |
| D3 | `echanges` table missing ~15 columns the controller writes (`statut` vs `status`, `priorite`, `lu_a`, `est_masque`, `pieces_jointes`, soft deletes…) | Corrected full schema, column named `statut` | Controller intent is source of truth |
| D4 | `paiements` missing `rendez_vous_id`, `details_paiement`, `metadata`, `date_remboursement`, `deleted_at`; `remboursements` missing `deleted_at` | Added. `rendezVous` relation dropped (no `rendez_vous` table exists anywhere) | Model casts/fillable are source of truth; relation is dead code |
| D5 | Duplicate route `PUT articles/{id}/{status}` bound to both `publish` and `archive` (archive unreachable) | `PUT articles/:id/publish` and `PUT articles/:id/archive` | Both reachable |
| D6 | Route typo `POST remboursements/admi/{id}/complete` | `POST remboursements/admin/:id/complete` | Typo fix |
| D7 | `GET .../statistics` shadowed by `GET .../{id}` (echanges, remboursements admin, praticien verification) | Literal routes declared before `:id` routes | Make statistics reachable |
| D8 | `Article::incrementViews()` called but doesn't exist; `Article` model missing `HasFactory`/`Str` imports; `auteur_id` validated but no column exists | No view counting, no `auteur_id` | Dead/broken code dropped |
| D9 | `Reservation` model+controller: no table, no route | Not ported | Dead scaffolding |
| D10 | Unrouted controller methods (`EmailTemplateController::restore/duplicate/preview/statistics/changeStatus`, `DisciplineController::search`, `ArticleController::showBySlug`) | Not ported | Only routed surface migrates; easy to add later |
| D11 | Praticien register: no DB transaction (orphan rows on failure) | Wrapped in one transaction | Correctness |
| D12 | Eloquent serializes decimals as strings ("10.00"), relation keys snake_case (`traite_par`) | Numbers as JS numbers, relation keys camelCase (`traitePar`); FK/data columns stay snake_case | Idiomatic Nest; flag to frontend team |
| D13 | tymon JWT adds `prv`/`jti` claims; blacklist on logout | Nest tokens carry `sub`, `user_id`, `email`, `is_admin`; logout = client-side discard (no blacklist) | Tokens are 60-min; old tokens die at cutover |
| D14 | `avis`, `signalements`, `programmes` tables exist, zero API surface | Created in the initial migration (data continuity), no entities/endpoints | Schema parity without dead code |
| D15 | Laravel infra tables (cache, jobs, sessions, password_reset_tokens) | Not created | Nest doesn't need them |
| D16 | MySQL `DATE_FORMAT(x, '%Y-%m')` in stats queries | `SUBSTR(CAST(x AS CHAR), 1, 7)` | Works on MySQL and SQLite (tests) |
| D17 | Most catalog/content routes fully public in PHP | Kept public (parity) | Locking down is a separate product decision; flagged as security debt in README |

**Env vars (`server-nest/.env`):** reuse Laravel values — `DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD`, `JWT_SECRET`, plus `JWT_TTL_MINUTES=60`, `PORT=8000`.

**Data migration out of scope.** Fresh DB via initial migration; if pointing at the existing Laravel DB, skip InitialSchema and apply only the delta documented at the end of Task 3.

---

## File structure (server-nest/)

```
server-nest/
  src/
    main.ts                       # bootstrap; applies app.setup
    app.module.ts                 # imports Config, TypeORM, all feature modules
    app.setup.ts                  # applyGlobalConfig(app): prefix 'api', CORS, pipe, filter
    common/
      envelope.ts                 # success()/fail() response helpers
      pagination.ts               # paginateQb(), paginationUrls(), parsePagination()
      validation.ts               # formatValidationErrors(), buildValidationPipe()
      all-exceptions.filter.ts    # Laravel-style error JSON for everything
      transformers.ts             # decimalTransformer, jsonTransformer
      format.ts                   # numberFormat(), euro(), formatDateFr(), exportTimestamp()
      storage.service.ts          # saves uploaded files under storage/uploads/<subdir>
    database/
      entities/                   # user, praticien, praticien-document, client, cercle, event,
                                  # promotion, discipline, article, notification, email-template,
                                  # echange, paiement, remboursement (.entity.ts each)
      migrations/1700000000000-InitialSchema.ts
      typeorm.config.ts           # DataSource options factory (mysql) + CLI datasource
    auth/
      auth.module.ts              # JwtModule.registerAsync, strategy, guards, services (global)
      jwt.strategy.ts
      guards/jwt-auth.guard.ts
      guards/admin.guard.ts
      guards/client.guard.ts      # attaches request.client
      hash.service.ts             # bcryptjs wrapper ($2y$-compatible)
      token.service.ts            # sign() + expires_in
      decorators.ts               # @CurrentUser() / @CurrentClient()
      admin-auth/                 # controller+service+dtos  (routes: /api/admin/...)
      praticien-auth/             # controller+service+dtos  (routes: /api/v1/praticien/...)
      praticien-verification/     # controller+service+dtos  (routes: /api/v1/admin/praticiens/verification...)
    cercles/    events/    promotions/    disciplines/
    clients/    praticiens/                              # index-only modules
    articles/   notifications/   email-templates/
    echanges/   paiements/       remboursements/
      # each feature dir: <name>.module.ts, <name>.controller.ts, <name>.service.ts, dto/*.ts
  test/
    utils/create-test-app.ts      # sqlite in-memory app factory + auth seeding helpers
    <feature>.e2e-spec.ts         # one per module
    jest-e2e.json                 # Nest CLI default
  storage/uploads/                # gitignored
  .env.example
```

Feature modules are self-contained (controller+service+DTOs together). Entities live centrally in `database/entities/` because cross-module relations (nearly everything references User/Client/Praticien) would otherwise create import cycles.

---

### Task 1: Scaffold the NestJS app

**Files:**
- Create: `server-nest/` (via CLI), `server-nest/.env`, `server-nest/.env.example`
- Modify: `server-nest/package.json`, `server-nest/.gitignore`

- [x] **Step 1: Generate the app and install dependencies**

```bash
cd /d/Others/Aura
npx -y @nestjs/cli@11 new server-nest --package-manager npm --skip-git --language TS
cd server-nest
npm i @nestjs/config @nestjs/typeorm typeorm mysql2 @nestjs/jwt @nestjs/passport passport passport-jwt bcryptjs class-validator class-transformer
npm i -D better-sqlite3 @types/passport-jwt @types/bcryptjs @types/multer supertest @types/supertest
```

Expected: `npm i` exits 0, `server-nest/src/main.ts` exists.

- [x] **Step 2: Add env files**

`server-nest/.env.example` (create a real `server-nest/.env` copying `DB_*` and `JWT_SECRET` values from `server/.env`):

```dotenv
PORT=8000
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=aura_nest
DB_USERNAME=root
DB_PASSWORD=
JWT_SECRET=change-me
JWT_TTL_MINUTES=60
```

Append to `server-nest/.gitignore`:

```
.env
storage/uploads/
```

- [x] **Step 3: Verify scaffold builds**

Run: `cd server-nest && npm run build`
Expected: exit 0, no TS errors.

- [x] **Step 4: Commit**

```bash
git add server-nest docs/superpowers/plans
git commit -m "chore(server-nest): scaffold NestJS app for PHP migration"
```

---

### Task 2: Common infrastructure (envelope, pagination, validation, exception filter)

**Files:**
- Create: `server-nest/src/common/envelope.ts`, `pagination.ts`, `validation.ts`, `all-exceptions.filter.ts`, `transformers.ts`, `format.ts`, `server-nest/src/app.setup.ts`
- Modify: `server-nest/src/main.ts`
- Test: `server-nest/src/common/common.spec.ts`

- [x] **Step 1: Write the failing unit test**

`server-nest/src/common/common.spec.ts`:

```ts
import { success, fail } from './envelope';
import { formatValidationErrors } from './validation';
import { numberFormat, formatDateFr } from './format';
import { ValidationError } from 'class-validator';

describe('common helpers', () => {
  it('success builds Laravel envelope', () => {
    expect(success({ id: 1 }, 'ok')).toEqual({ status: 'success', message: 'ok', data: { id: 1 } });
    expect(success([1, 2])).toEqual({ status: 'success', data: [1, 2] });
    expect(success({ id: 1 }, undefined, { pagination: { total: 0 } })).toEqual({
      status: 'success', data: { id: 1 }, pagination: { total: 0 },
    });
  });

  it('fail builds error envelope', () => {
    expect(fail('nope')).toEqual({ status: 'error', message: 'nope' });
    expect(fail('nope', { error: 'x' })).toEqual({ status: 'error', message: 'nope', error: 'x' });
  });

  it('formatValidationErrors flattens nested class-validator errors', () => {
    const child = new ValidationError();
    child.property = 'statut';
    child.constraints = { isIn: 'statut invalide' };
    const parent = new ValidationError();
    parent.property = 'documents';
    parent.children = [child];
    expect(formatValidationErrors([parent])).toEqual({ 'documents.statut': ['statut invalide'] });
  });

  it('numberFormat matches PHP number_format defaults', () => {
    expect(numberFormat(1234.5)).toBe('1,234.50');
    expect(numberFormat(0)).toBe('0.00');
  });

  it('formatDateFr renders d/m/Y', () => {
    expect(formatDateFr(new Date(Date.UTC(2026, 6, 3)))).toBe('03/07/2026');
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `cd server-nest && npx jest src/common/common.spec.ts`
Expected: FAIL — cannot find module './envelope'.

- [x] **Step 3: Implement the helpers**

`server-nest/src/common/envelope.ts`:

```ts
export function success(data?: unknown, message?: string, extra?: Record<string, unknown>) {
  return {
    status: 'success',
    ...(message !== undefined ? { message } : {}),
    ...(data !== undefined ? { data } : {}),
    ...(extra ?? {}),
  };
}

export function fail(message: string, extra?: Record<string, unknown>) {
  return { status: 'error', message, ...(extra ?? {}) };
}
```

`server-nest/src/common/pagination.ts`:

```ts
import { ObjectLiteral, SelectQueryBuilder } from 'typeorm';
import { Request } from 'express';

export function parsePagination(query: Record<string, any>, defaultPerPage: number) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const perPage = Math.max(1, parseInt(query.per_page, 10) || defaultPerPage);
  return { page, perPage };
}

export async function paginateQb<T extends ObjectLiteral>(
  qb: SelectQueryBuilder<T>,
  page: number,
  perPage: number,
) {
  const [data, total] = await qb.skip((page - 1) * perPage).take(perPage).getManyAndCount();
  const lastPage = Math.max(1, Math.ceil(total / perPage));
  return {
    data,
    pagination: { current_page: page, last_page: lastPage, per_page: perPage, total },
    lastPage,
  };
}

export function paginationUrls(req: Request, page: number, lastPage: number) {
  const base = `${req.protocol}://${req.get('host')}${req.baseUrl}${req.path}`.replace(/\/$/, '');
  return {
    next_page_url: page < lastPage ? `${base}?page=${page + 1}` : null,
    prev_page_url: page > 1 ? `${base}?page=${page - 1}` : null,
  };
}
```

`server-nest/src/common/validation.ts`:

```ts
import { UnprocessableEntityException, ValidationPipe } from '@nestjs/common';
import { ValidationError } from 'class-validator';

export function formatValidationErrors(
  errors: ValidationError[],
  parent = '',
): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const e of errors) {
    const path = parent ? `${parent}.${e.property}` : e.property;
    if (e.constraints) out[path] = Object.values(e.constraints);
    if (e.children?.length) Object.assign(out, formatValidationErrors(e.children, path));
  }
  return out;
}

export function buildValidationPipe() {
  return new ValidationPipe({
    whitelist: true,
    transform: true,
    transformOptions: { enableImplicitConversion: true },
    exceptionFactory: (errors) =>
      new UnprocessableEntityException({
        status: 'error',
        message: 'Erreur de validation',
        errors: formatValidationErrors(errors),
      }),
  });
}
```

`server-nest/src/common/all-exceptions.filter.ts`:

```ts
import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();
    if (exception instanceof HttpException) {
      const body = exception.getResponse();
      const status = exception.getStatus();
      if (typeof body === 'object' && body !== null && 'status' in (body as object)) {
        return res.status(status).json(body);
      }
      const message =
        typeof body === 'string' ? body : ((body as any).message ?? exception.message);
      return res.status(status).json({ status: 'error', message });
    }
    const err = exception instanceof Error ? exception.message : String(exception);
    return res
      .status(500)
      .json({ status: 'error', message: 'Une erreur est survenue', error: err });
  }
}
```

`server-nest/src/common/transformers.ts`:

```ts
export const decimalTransformer = {
  to: (v?: number | string | null) => v,
  from: (v: string | number | null): number | null => (v === null ? null : Number(v)),
};

// Entities declare json-ish columns as type 'text' + this transformer so the same
// entity works on MySQL (real JSON column, mysql2 may return parsed objects) and SQLite.
export const jsonTransformer = {
  to: (v: unknown) => (v == null ? null : JSON.stringify(v)),
  from: (v: unknown) => {
    if (v == null) return null;
    if (typeof v === 'string') {
      try { return JSON.parse(v); } catch { return v; }
    }
    return v;
  },
};
```

`server-nest/src/common/format.ts`:

```ts
export function numberFormat(n: number): string {
  return Number(n ?? 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function euro(n: number): string {
  return `${numberFormat(n)} €`;
}

export function formatDateFr(d: Date | string | null): string {
  if (!d) return '';
  const date = typeof d === 'string' ? new Date(d) : d;
  const dd = String(date.getUTCDate()).padStart(2, '0');
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${date.getUTCFullYear()}`;
}

export function exportTimestamp(now = new Date()): string {
  const p = (x: number) => String(x).padStart(2, '0');
  return `${now.getFullYear()}${p(now.getMonth() + 1)}${p(now.getDate())}_${p(now.getHours())}${p(now.getMinutes())}${p(now.getSeconds())}`;
}

export function formatDateTimeFr(d: Date | string | null): string {
  if (!d) return '';
  const date = typeof d === 'string' ? new Date(d) : d;
  const p = (x: number) => String(x).padStart(2, '0');
  return `${p(date.getDate())}/${p(date.getMonth() + 1)}/${date.getFullYear()} ${p(date.getHours())}:${p(date.getMinutes())}`;
}
```

`server-nest/src/app.setup.ts`:

```ts
import { INestApplication } from '@nestjs/common';
import { buildValidationPipe } from './common/validation';
import { AllExceptionsFilter } from './common/all-exceptions.filter';

export function applyGlobalConfig(app: INestApplication) {
  app.setGlobalPrefix('api');
  app.enableCors();
  app.useGlobalPipes(buildValidationPipe());
  app.useGlobalFilters(new AllExceptionsFilter());
  return app;
}
```

`server-nest/src/main.ts` (replace scaffold):

```ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { applyGlobalConfig } from './app.setup';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  applyGlobalConfig(app);
  await app.listen(process.env.PORT ?? 8000);
}
bootstrap();
```

- [x] **Step 4: Run tests to verify they pass**

Run: `cd server-nest && npx jest src/common/common.spec.ts`
Expected: 5 passed.

- [x] **Step 5: Commit**

```bash
git add server-nest/src
git commit -m "feat(server-nest): response envelope, pagination, validation, exception filter"
```

---
### Task 3: Database layer — entities, initial migration, test-app factory

**Files:**
- Create: `server-nest/src/database/entities/*.entity.ts` (14 files, below)
- Create: `server-nest/src/database/typeorm.config.ts`, `server-nest/src/database/migrations/1700000000000-InitialSchema.ts`
- Modify: `server-nest/src/app.module.ts`, `server-nest/package.json` (scripts)
- Create: `server-nest/test/utils/create-test-app.ts`
- Test: `server-nest/test/database.e2e-spec.ts`

Conventions used by every entity: property names are snake_case so JSON output matches Laravel; decimals use `decimalTransformer` (numbers in JSON); JSON-ish columns use `type: 'text'` + `jsonTransformer` (portable MySQL/SQLite, see Task 2); relation properties are camelCase (D12).

- [x] **Step 1: Write the failing test**

`server-nest/test/utils/create-test-app.ts`:

```ts
import { INestApplication, ModuleMetadata } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { DataSource } from 'typeorm';
import { applyGlobalConfig } from '../../src/app.setup';
import { AuthModule } from '../../src/auth/auth.module';
import { User } from '../../src/database/entities/user.entity';
import { Client } from '../../src/database/entities/client.entity';
import * as bcrypt from 'bcryptjs';

process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-secret';
process.env.JWT_TTL_MINUTES = '60';

export async function createTestApp(metadata: ModuleMetadata = {}): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    imports: [
      TypeOrmModule.forRoot({
        type: 'better-sqlite3',
        database: ':memory:',
        autoLoadEntities: true,
        synchronize: true,
      }),
      AuthModule,
      ...(metadata.imports ?? []),
    ],
  }).compile();
  const app = moduleRef.createNestApplication();
  applyGlobalConfig(app);
  await app.init();
  return app;
}

export async function seedAdmin(app: INestApplication, email = 'admin@test.io') {
  const ds = app.get(DataSource);
  const user = await ds.getRepository(User).save({
    name: 'Admin Test',
    email,
    password: await bcrypt.hash('password123', 10),
    is_admin: true,
  });
  return { user, token: signToken(app, user) };
}

export async function seedClientUser(app: INestApplication, email = 'client@test.io') {
  const ds = app.get(DataSource);
  const user = await ds.getRepository(User).save({
    name: 'Client Test',
    email,
    password: await bcrypt.hash('password123', 10),
    is_admin: false,
  });
  const client = await ds.getRepository(Client).save({
    firstname: 'Client',
    lastname: 'Test',
    email,
    city: 'Paris',
  });
  return { user, client, token: signToken(app, user) };
}

export function signToken(app: INestApplication, user: User): string {
  return app.get(JwtService).sign(
    { user_id: user.id, email: user.email, is_admin: user.is_admin },
    { subject: String(user.id) },
  );
}
```

`server-nest/test/database.e2e-spec.ts`:

```ts
import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { createTestApp } from './utils/create-test-app';
import { User } from '../src/database/entities/user.entity';
import { Echange } from '../src/database/entities/echange.entity';
import { Client } from '../src/database/entities/client.entity';

describe('database entities', () => {
  let app: INestApplication;
  beforeAll(async () => { app = await createTestApp(); });
  afterAll(async () => { await app.close(); });

  it('creates schema for all entities and round-trips an Echange with JSON + soft delete', async () => {
    const ds = app.get(DataSource);
    const client = await ds.getRepository(Client).save({
      firstname: 'A', lastname: 'B', email: 'a@b.c', city: 'Paris',
    });
    const repo = ds.getRepository(Echange);
    const saved = await repo.save({
      client_id: client.id, sujet: 'Test', type: 'demande', statut: 'en_attente',
      priorite: 'moyenne', message: 'Bonjour, message assez long.',
      pieces_jointes: [{ nom: 'x.pdf', chemin: 'echanges/1/x.pdf', taille: 10, type: 'application/pdf' }],
    });
    const found = await repo.findOneByOrFail({ id: saved.id });
    expect(found.pieces_jointes?.[0].nom).toBe('x.pdf');
    await repo.softDelete(saved.id);
    expect(await repo.findOneBy({ id: saved.id })).toBeNull();
    expect(await ds.getRepository(User).count()).toBe(0);
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `cd server-nest && npx jest --config test/jest-e2e.json database`
Expected: FAIL — cannot find entity modules (they don't exist yet). (AuthModule import will also fail until Task 4 — for now create a stub `src/auth/auth.module.ts` exporting an empty `@Module({}) export class AuthModule {}`; Task 4 fills it.)

- [x] **Step 3: Implement the entities**

`server-nest/src/database/entities/user.entity.ts`:

```ts
import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Exclude } from 'class-transformer';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn() id: number;
  @Column() name: string;
  @Column({ unique: true }) email: string;
  @Exclude() @Column() password: string;
  @Exclude() @Column({ type: 'varchar', nullable: true }) remember_token: string | null;
  @Column({ default: false }) is_admin: boolean;
  @Column({ type: 'datetime', nullable: true }) last_login_at: Date | null;
  @Column({ type: 'varchar', nullable: true }) ip_address: string | null;
  @CreateDateColumn({ name: 'created_at' }) created_at: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updated_at: Date;
}
```

Note: `@Exclude` marks fields; auth services return users via `sanitizeUser()` (Task 4) which strips excluded fields — we do NOT rely on a global serializer interceptor because most handlers return plain objects.

`server-nest/src/database/entities/client.entity.ts`:

```ts
import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('clients')
export class Client {
  @PrimaryGeneratedColumn() id: number;
  @Column() firstname: string;
  @Column() lastname: string;
  @Column() email: string;
  @Column() city: string;
  @CreateDateColumn({ name: 'created_at' }) created_at: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updated_at: Date;
}
```

`server-nest/src/database/entities/praticien.entity.ts`:

```ts
import {
  Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany,
  PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm';
import { decimalTransformer } from '../../common/transformers';
import { User } from './user.entity';
import { PraticienDocument } from './praticien-document.entity';

@Entity('praticiens')
export class Praticien {
  @PrimaryGeneratedColumn() id: number;
  @Column() firstname: string;
  @Column() lastname: string;
  @Column({ unique: true }) email: string;
  @Column() telephone: string;
  @Column() ville: string;
  @Column() niveau: string;
  @Column() specialite: string;
  @Column() mode: string;
  @Column() status: string;
  @Column({ type: 'decimal', precision: 10, scale: 2, transformer: decimalTransformer }) tarif: number;
  @Column({ type: 'int' }) experience: number;
  @Column({ type: 'text' }) bio: string;
  @Column({ type: 'varchar', length: 20, default: 'en_attente' }) statut_verification: string;
  @Column({ type: 'datetime', nullable: true }) date_inscription: Date | null;
  @Column({ type: 'datetime', nullable: true }) verifie_a: Date | null;
  @Column({ type: 'int', nullable: true }) verifie_par: number | null;
  @Column({ type: 'text', nullable: true }) motif_rejet: string | null;
  @CreateDateColumn({ name: 'created_at' }) created_at: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updated_at: Date;

  @OneToMany(() => PraticienDocument, (d) => d.praticien) documents: PraticienDocument[];
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'verifie_par' })
  verifiePar: User | null;
}
```

`server-nest/src/database/entities/praticien-document.entity.ts`:

```ts
import {
  Column, CreateDateColumn, Entity, JoinColumn, ManyToOne,
  PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm';
import { Praticien } from './praticien.entity';
import { User } from './user.entity';

@Entity('praticien_documents')
export class PraticienDocument {
  @PrimaryGeneratedColumn() id: number;
  @Column() praticien_id: number;
  @Column({ length: 50 }) type: string;
  @Column() nom_fichier: string;
  @Column() chemin: string;
  @Column({ type: 'varchar', nullable: true }) mime_type: string | null;
  @Column({ type: 'int', nullable: true }) taille: number | null;
  @Column({ type: 'varchar', length: 20, default: 'en_attente' }) statut: string;
  @Column({ type: 'text', nullable: true }) commentaire_rejet: string | null;
  @Column({ type: 'datetime', nullable: true }) verifie_a: Date | null;
  @Column({ type: 'int', nullable: true }) verifie_par: number | null;
  @CreateDateColumn({ name: 'created_at' }) created_at: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updated_at: Date;

  @ManyToOne(() => Praticien, (p) => p.documents)
  @JoinColumn({ name: 'praticien_id' })
  praticien: Praticien;
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'verifie_par' })
  verifiePar: User | null;
}
```

`server-nest/src/database/entities/cercle.entity.ts`:

```ts
import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('cercles')
export class Cercle {
  @PrimaryGeneratedColumn() id: number;
  @Column({ unique: true }) nom: string;
  @Column({ type: 'text', nullable: true }) description: string | null;
  @Column({ type: 'varchar', length: 50, nullable: true }) color: string | null;
  @Column({ type: 'varchar', nullable: true }) animateur: string | null;
  @CreateDateColumn({ name: 'created_at' }) created_at: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updated_at: Date;
}
```

`server-nest/src/database/entities/event.entity.ts`:

```ts
import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { decimalTransformer, jsonTransformer } from '../../common/transformers';
import { EventPraticien } from './event-praticien.entity';

@Entity('events')
export class Event {
  @PrimaryGeneratedColumn() id: number;
  @Column() titre: string;
  @Column() type: string;
  @Column({ type: 'text', transformer: jsonTransformer }) dates: string[];
  @Column() lieu: string;
  @Column({ type: 'decimal', precision: 10, scale: 2, transformer: decimalTransformer }) prix: number;
  @Column({ type: 'int' }) nombre_places: number;
  @Column({ type: 'text' }) description: string;
  @Column({ type: 'varchar', length: 20, default: 'brouillon' }) status: string;
  @CreateDateColumn({ name: 'created_at' }) created_at: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updated_at: Date;

  @OneToMany(() => EventPraticien, (ep) => ep.event) animateurLinks: EventPraticien[];
}
```

`server-nest/src/database/entities/event-praticien.entity.ts` (explicit pivot so we can emit Laravel-style `pivot` objects):

```ts
import {
  Column, CreateDateColumn, Entity, JoinColumn, ManyToOne,
  PrimaryGeneratedColumn, Unique, UpdateDateColumn,
} from 'typeorm';
import { Event } from './event.entity';
import { Praticien } from './praticien.entity';

@Entity('event_praticien')
@Unique(['event_id', 'praticien_id'])
export class EventPraticien {
  @PrimaryGeneratedColumn() id: number;
  @Column() event_id: number;
  @Column() praticien_id: number;
  @Column({ default: 'animateur' }) role: string;
  @CreateDateColumn({ name: 'created_at' }) created_at: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updated_at: Date;

  @ManyToOne(() => Event, (e) => e.animateurLinks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'event_id' })
  event: Event;
  @ManyToOne(() => Praticien, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'praticien_id' })
  praticien: Praticien;
}
```

`server-nest/src/database/entities/promotion.entity.ts`:

```ts
import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { decimalTransformer } from '../../common/transformers';

@Entity('promotions')
export class Promotion {
  @PrimaryGeneratedColumn() id: number;
  @Column({ unique: true, length: 50 }) code: string;
  @Column({ type: 'varchar', length: 20, default: 'pourcentage' }) type: string;
  @Column({ type: 'decimal', precision: 10, scale: 2, transformer: decimalTransformer }) valeur: number;
  @Column({ type: 'date' }) date_expiration: string;
  @Column({ type: 'varchar', nullable: true }) status: string | null;
  @CreateDateColumn({ name: 'created_at' }) created_at: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updated_at: Date;
}
```

Note: Laravel migration has `status` NOT NULL with no default and the controller never sets it — inserts would fail in strict MySQL. Nest makes it nullable (fix, same spirit as D3).

`server-nest/src/database/entities/discipline.entity.ts`:

```ts
import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('disciplines')
export class Discipline {
  @PrimaryGeneratedColumn() id: number;
  @Column() nom: string;
  @Column() slug: string;
  @Column() tonalite: string;
  @Column() glyphe: string;
  @Column() accroche: string;
  @CreateDateColumn({ name: 'created_at' }) created_at: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updated_at: Date;
}
```

`server-nest/src/database/entities/article.entity.ts`:

```ts
import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('articles')
export class Article {
  @PrimaryGeneratedColumn() id: number;
  @Column() titre: string;
  @Column({ unique: true }) slug: string;
  @Column() categorie: string;
  @Column() tonalite: string;
  @Column({ type: 'text' }) extrait: string;
  @Column({ type: 'text' }) corps: string;
  @Column() status: string;
  @Column() auteur: string;
  @Column({ type: 'int' }) temps_lecture: number;
  @Column({ type: 'varchar', nullable: true }) image_couverture: string | null;
  @Column({ type: 'varchar', nullable: true }) meta_description: string | null;
  @Column({ type: 'varchar', nullable: true }) mot_clef: string | null;
  @Column({ type: 'datetime', nullable: true }) date_publication: Date | null;
  @CreateDateColumn({ name: 'created_at' }) created_at: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updated_at: Date;
}
```

`server-nest/src/database/entities/notification.entity.ts`:

```ts
import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn() id: number;
  @Column() audience: string;
  @Column() canal: string;
  @Column() titre: string;
  @Column({ type: 'varchar', nullable: true }) status: string | null;
  @Column({ type: 'text' }) message: string;
  @CreateDateColumn({ name: 'created_at' }) created_at: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updated_at: Date;
}
```

`server-nest/src/database/entities/email-template.entity.ts`:

```ts
import {
  Column, CreateDateColumn, DeleteDateColumn, Entity, JoinColumn, ManyToOne,
  PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm';
import { jsonTransformer } from '../../common/transformers';
import { User } from './user.entity';

@Entity('email_templates')
export class EmailTemplate {
  @PrimaryGeneratedColumn() id: number;
  @Column() nom: string;
  @Column() objet: string;
  @Column({ type: 'text' }) corps: string;
  @Column({ type: 'varchar', length: 50, default: 'actif' }) statut: string;
  @Column({ type: 'text', nullable: true, transformer: jsonTransformer }) variables: string[] | null;
  @Column({ type: 'int', nullable: true }) created_by: number | null;
  @CreateDateColumn({ name: 'created_at' }) created_at: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updated_at: Date;
  @DeleteDateColumn({ name: 'deleted_at' }) deleted_at: Date | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  createdBy: User | null;
}
```

`server-nest/src/database/entities/echange.entity.ts` (corrected schema, D3):

```ts
import {
  Column, CreateDateColumn, DeleteDateColumn, Entity, JoinColumn, ManyToOne,
  PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm';
import { jsonTransformer } from '../../common/transformers';
import { Client } from './client.entity';
import { User } from './user.entity';

export interface PieceJointe { nom: string; chemin: string; taille: number; type: string }

@Entity('echanges')
export class Echange {
  @PrimaryGeneratedColumn() id: number;
  @Column() client_id: number;
  @Column() sujet: string;
  @Column() type: string;
  @Column({ type: 'varchar', length: 20, default: 'en_attente' }) statut: string;
  @Column({ type: 'varchar', length: 20, default: 'moyenne' }) priorite: string;
  @Column({ type: 'text' }) message: string;
  @Column({ type: 'varchar', nullable: true }) format: string | null;
  @Column({ type: 'varchar', nullable: true }) delai: string | null;
  @Column({ type: 'varchar', length: 500, nullable: true }) ce_que_je_propose: string | null;
  @Column({ type: 'varchar', length: 500, nullable: true }) ce_que_je_recherche: string | null;
  @Column({ type: 'date', nullable: true }) delai_souhaite: string | null;
  @Column({ type: 'text', nullable: true, transformer: jsonTransformer }) pieces_jointes: PieceJointe[] | null;
  @Column({ type: 'text', nullable: true }) reponse_admin: string | null;
  @Column({ type: 'int', nullable: true }) traite_par: number | null;
  @Column({ type: 'datetime', nullable: true }) traite_a: Date | null;
  @Column({ type: 'datetime', nullable: true }) repondu_a: Date | null;
  @Column({ type: 'datetime', nullable: true }) lu_a: Date | null;
  @Column({ default: false }) est_masque: boolean;
  @Column({ type: 'int', nullable: true }) signale_par: number | null;
  @Column({ type: 'varchar', length: 500, nullable: true }) motif_signalement: string | null;
  @Column({ type: 'datetime', nullable: true }) signale_a: Date | null;
  @CreateDateColumn({ name: 'created_at' }) created_at: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updated_at: Date;
  @DeleteDateColumn({ name: 'deleted_at' }) deleted_at: Date | null;

  @ManyToOne(() => Client, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'client_id' })
  client: Client;
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'traite_par' })
  traitePar: User | null;
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'signale_par' })
  signalePar: User | null;
}
```

`server-nest/src/database/entities/paiement.entity.ts` (D4):

```ts
import {
  Column, CreateDateColumn, DeleteDateColumn, Entity, JoinColumn, ManyToOne,
  PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm';
import { decimalTransformer, jsonTransformer } from '../../common/transformers';
import { Client } from './client.entity';
import { Praticien } from './praticien.entity';

@Entity('paiements')
export class Paiement {
  @PrimaryGeneratedColumn() id: number;
  @Column({ unique: true }) reference: string;
  @Column() client_id: number;
  @Column({ type: 'int', nullable: true }) praticien_id: number | null;
  @Column({ type: 'int', nullable: true }) rendez_vous_id: number | null;
  @Column({ type: 'datetime', nullable: true }) date_paiement: Date | null;
  @Column({ type: 'decimal', precision: 10, scale: 2, transformer: decimalTransformer }) montant_brut: number;
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, transformer: decimalTransformer }) commission: number;
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, transformer: decimalTransformer }) montant_net_praticien: number;
  @Column({ length: 50 }) moyen_paiement: string;
  @Column({ type: 'varchar', length: 50, nullable: true }) statut: string | null;
  @Column({ type: 'text', nullable: true, transformer: jsonTransformer }) details_paiement: unknown | null;
  @Column({ type: 'text', nullable: true, transformer: jsonTransformer }) metadata: unknown | null;
  @Column({ type: 'datetime', nullable: true }) date_remboursement: Date | null;
  @CreateDateColumn({ name: 'created_at' }) created_at: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updated_at: Date;
  @DeleteDateColumn({ name: 'deleted_at' }) deleted_at: Date | null;

  @ManyToOne(() => Client, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'client_id' })
  client: Client;
  @ManyToOne(() => Praticien, { nullable: true })
  @JoinColumn({ name: 'praticien_id' })
  praticien: Praticien | null;
}
```

`server-nest/src/database/entities/remboursement.entity.ts`:

```ts
import {
  Column, CreateDateColumn, DeleteDateColumn, Entity, JoinColumn, ManyToOne,
  PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm';
import { decimalTransformer, jsonTransformer } from '../../common/transformers';
import { Client } from './client.entity';
import { Paiement } from './paiement.entity';
import { Praticien } from './praticien.entity';

export const REMBOURSEMENT_STATUT_LABELS: Record<string, string> = {
  en_attente: 'En attente',
  en_cours: 'En cours',
  approuve: 'Approuvé',
  refuse: 'Refusé',
  completed: 'Complété',
};

@Entity('remboursements')
export class Remboursement {
  @PrimaryGeneratedColumn() id: number;
  @Column({ unique: true }) reference: string;
  @Column() client_id: number;
  @Column() paiement_id: number;
  @Column({ type: 'int', nullable: true }) praticien_id: number | null;
  @Column({ type: 'decimal', precision: 10, scale: 2, transformer: decimalTransformer }) montant: number;
  @Column() motif: string;
  @Column({ type: 'text', nullable: true }) description: string | null;
  @Column({ type: 'varchar', length: 50, default: 'en_attente' }) statut: string;
  @Column({ type: 'text', nullable: true }) commentaire_admin: string | null;
  @Column({ type: 'datetime', nullable: true }) date_traitement: Date | null;
  @Column({ type: 'datetime', nullable: true }) date_remboursement: Date | null;
  @Column({ type: 'text', nullable: true, transformer: jsonTransformer }) documents: unknown[] | null;
  @Column({ type: 'text', nullable: true, transformer: jsonTransformer }) metadata: unknown | null;
  @CreateDateColumn({ name: 'created_at' }) created_at: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updated_at: Date;
  @DeleteDateColumn({ name: 'deleted_at' }) deleted_at: Date | null;

  @ManyToOne(() => Client, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'client_id' })
  client: Client;
  @ManyToOne(() => Paiement, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'paiement_id' })
  paiement: Paiement;
  @ManyToOne(() => Praticien, { nullable: true })
  @JoinColumn({ name: 'praticien_id' })
  praticien: Praticien | null;
}
```

- [x] **Step 4: Implement TypeORM config + app module wiring**

`server-nest/src/database/typeorm.config.ts`:

```ts
import { DataSource, DataSourceOptions } from 'typeorm';
import * as dotenv from 'dotenv';

export function buildDataSourceOptions(): DataSourceOptions {
  return {
    type: 'mysql',
    host: process.env.DB_HOST ?? '127.0.0.1',
    port: parseInt(process.env.DB_PORT ?? '3306', 10),
    database: process.env.DB_DATABASE ?? 'aura_nest',
    username: process.env.DB_USERNAME ?? 'root',
    password: process.env.DB_PASSWORD ?? '',
    entities: [__dirname + '/entities/*.entity.{ts,js}'],
    migrations: [__dirname + '/migrations/*.{ts,js}'],
    synchronize: false,
  };
}

dotenv.config();
export default new DataSource(buildDataSourceOptions()); // used by TypeORM CLI
```

`server-nest/src/app.module.ts` (grows as feature modules land; final list in Task 19):

```ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { buildDataSourceOptions } from './database/typeorm.config';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({ ...buildDataSourceOptions(), autoLoadEntities: true }),
    AuthModule,
  ],
})
export class AppModule {}
```

Add scripts to `server-nest/package.json`:

```json
"typeorm": "typeorm-ts-node-commonjs -d src/database/typeorm.config.ts",
"migration:run": "npm run typeorm -- migration:run",
"migration:revert": "npm run typeorm -- migration:revert"
```

- [x] **Step 5: Write the initial migration (MySQL DDL, all tables)**

`server-nest/src/database/migrations/1700000000000-InitialSchema.ts`:

```ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1700000000000 implements MigrationInterface {
  public async up(q: QueryRunner): Promise<void> {
    await q.query(`CREATE TABLE users (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      remember_token VARCHAR(100) NULL,
      is_admin TINYINT(1) NOT NULL DEFAULT 0,
      last_login_at TIMESTAMP NULL,
      ip_address VARCHAR(255) NULL,
      created_at TIMESTAMP NULL,
      updated_at TIMESTAMP NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await q.query(`CREATE TABLE clients (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      firstname VARCHAR(255) NOT NULL,
      lastname VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL,
      city VARCHAR(255) NOT NULL,
      created_at TIMESTAMP NULL,
      updated_at TIMESTAMP NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await q.query(`CREATE TABLE praticiens (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      firstname VARCHAR(255) NOT NULL,
      lastname VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      telephone VARCHAR(255) NOT NULL,
      ville VARCHAR(255) NOT NULL,
      niveau VARCHAR(255) NOT NULL,
      specialite VARCHAR(255) NOT NULL,
      mode VARCHAR(255) NOT NULL,
      status VARCHAR(255) NOT NULL,
      tarif DECIMAL(10,2) NOT NULL,
      experience INT NOT NULL,
      bio TEXT NOT NULL,
      statut_verification VARCHAR(20) NOT NULL DEFAULT 'en_attente',
      date_inscription TIMESTAMP NULL,
      verifie_a TIMESTAMP NULL,
      verifie_par BIGINT UNSIGNED NULL,
      motif_rejet TEXT NULL,
      created_at TIMESTAMP NULL,
      updated_at TIMESTAMP NULL,
      CONSTRAINT fk_prat_verifie_par FOREIGN KEY (verifie_par) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await q.query(`CREATE TABLE praticien_documents (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      praticien_id BIGINT UNSIGNED NOT NULL,
      type VARCHAR(50) NOT NULL,
      nom_fichier VARCHAR(255) NOT NULL,
      chemin VARCHAR(255) NOT NULL,
      mime_type VARCHAR(255) NULL,
      taille INT NULL,
      statut VARCHAR(20) NOT NULL DEFAULT 'en_attente',
      commentaire_rejet TEXT NULL,
      verifie_a TIMESTAMP NULL,
      verifie_par BIGINT UNSIGNED NULL,
      created_at TIMESTAMP NULL,
      updated_at TIMESTAMP NULL,
      CONSTRAINT fk_pdoc_praticien FOREIGN KEY (praticien_id) REFERENCES praticiens(id) ON DELETE CASCADE,
      CONSTRAINT fk_pdoc_verifie_par FOREIGN KEY (verifie_par) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await q.query(`CREATE TABLE cercles (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      nom VARCHAR(255) NOT NULL UNIQUE,
      description TEXT NULL,
      color VARCHAR(50) NULL,
      animateur VARCHAR(255) NULL,
      created_at TIMESTAMP NULL,
      updated_at TIMESTAMP NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await q.query(`CREATE TABLE events (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      titre VARCHAR(255) NOT NULL,
      type VARCHAR(255) NOT NULL,
      dates JSON NOT NULL,
      lieu VARCHAR(255) NOT NULL,
      prix DECIMAL(10,2) NOT NULL,
      nombre_places INT NOT NULL,
      description TEXT NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'brouillon',
      created_at TIMESTAMP NULL,
      updated_at TIMESTAMP NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await q.query(`CREATE TABLE event_praticien (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      event_id BIGINT UNSIGNED NOT NULL,
      praticien_id BIGINT UNSIGNED NOT NULL,
      role VARCHAR(255) NOT NULL DEFAULT 'animateur',
      created_at TIMESTAMP NULL,
      updated_at TIMESTAMP NULL,
      UNIQUE KEY uq_event_praticien (event_id, praticien_id),
      CONSTRAINT fk_ep_event FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
      CONSTRAINT fk_ep_praticien FOREIGN KEY (praticien_id) REFERENCES praticiens(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await q.query(`CREATE TABLE programmes (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      event_id BIGINT UNSIGNED NOT NULL,
      heure TIME NOT NULL,
      titre VARCHAR(255) NOT NULL,
      created_at TIMESTAMP NULL,
      updated_at TIMESTAMP NULL,
      CONSTRAINT fk_prog_event FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await q.query(`CREATE TABLE promotions (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      code VARCHAR(50) NOT NULL UNIQUE,
      type VARCHAR(20) NOT NULL DEFAULT 'pourcentage',
      valeur DECIMAL(10,2) NOT NULL,
      date_expiration DATE NOT NULL,
      status VARCHAR(255) NULL,
      created_at TIMESTAMP NULL,
      updated_at TIMESTAMP NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await q.query(`CREATE TABLE avis (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      full_name_author VARCHAR(255) NOT NULL,
      praticien_id BIGINT UNSIGNED NOT NULL,
      note INT UNSIGNED NOT NULL,
      avis TEXT NOT NULL,
      date_ajout TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      statut VARCHAR(255) NOT NULL,
      created_at TIMESTAMP NULL,
      updated_at TIMESTAMP NULL,
      CONSTRAINT fk_avis_praticien FOREIGN KEY (praticien_id) REFERENCES praticiens(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await q.query(`CREATE TABLE signalements (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      date_signalement TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      type VARCHAR(255) NOT NULL,
      sujet VARCHAR(255) NOT NULL,
      motif TEXT NOT NULL,
      signale_par_id BIGINT UNSIGNED NOT NULL,
      praticien_id BIGINT UNSIGNED NOT NULL,
      priorite VARCHAR(50) NOT NULL,
      statut VARCHAR(50) NOT NULL,
      created_at TIMESTAMP NULL,
      updated_at TIMESTAMP NULL,
      KEY idx_sig_statut_priorite (statut, priorite),
      KEY idx_sig_type (type),
      KEY idx_sig_date (date_signalement),
      CONSTRAINT fk_sig_user FOREIGN KEY (signale_par_id) REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT fk_sig_praticien FOREIGN KEY (praticien_id) REFERENCES praticiens(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await q.query(`CREATE TABLE articles (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      titre VARCHAR(255) NOT NULL,
      slug VARCHAR(255) NOT NULL UNIQUE,
      categorie VARCHAR(255) NOT NULL,
      tonalite VARCHAR(255) NOT NULL,
      extrait TEXT NOT NULL,
      corps LONGTEXT NOT NULL,
      status VARCHAR(255) NOT NULL,
      auteur VARCHAR(255) NOT NULL,
      temps_lecture INT NOT NULL,
      image_couverture VARCHAR(255) NULL,
      meta_description VARCHAR(255) NULL,
      mot_clef VARCHAR(255) NULL,
      date_publication TIMESTAMP NULL,
      created_at TIMESTAMP NULL,
      updated_at TIMESTAMP NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await q.query(`CREATE TABLE disciplines (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      nom VARCHAR(255) NOT NULL,
      slug VARCHAR(255) NOT NULL,
      tonalite VARCHAR(255) NOT NULL,
      glyphe VARCHAR(255) NOT NULL,
      accroche VARCHAR(255) NOT NULL,
      created_at TIMESTAMP NULL,
      updated_at TIMESTAMP NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await q.query(`CREATE TABLE notifications (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      audience VARCHAR(255) NOT NULL,
      canal VARCHAR(255) NOT NULL,
      titre VARCHAR(255) NOT NULL,
      status VARCHAR(255) NULL,
      message TEXT NOT NULL,
      created_at TIMESTAMP NULL,
      updated_at TIMESTAMP NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await q.query(`CREATE TABLE email_templates (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      nom VARCHAR(255) NOT NULL,
      objet VARCHAR(255) NOT NULL,
      corps TEXT NOT NULL,
      statut VARCHAR(50) NOT NULL DEFAULT 'actif',
      variables JSON NULL,
      created_by BIGINT UNSIGNED NULL,
      created_at TIMESTAMP NULL,
      updated_at TIMESTAMP NULL,
      deleted_at TIMESTAMP NULL,
      CONSTRAINT fk_tpl_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await q.query(`CREATE TABLE echanges (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      client_id BIGINT UNSIGNED NOT NULL,
      sujet VARCHAR(255) NOT NULL,
      type VARCHAR(255) NOT NULL,
      statut VARCHAR(20) NOT NULL DEFAULT 'en_attente',
      priorite VARCHAR(20) NOT NULL DEFAULT 'moyenne',
      message TEXT NOT NULL,
      format VARCHAR(255) NULL,
      delai VARCHAR(255) NULL,
      ce_que_je_propose VARCHAR(500) NULL,
      ce_que_je_recherche VARCHAR(500) NULL,
      delai_souhaite DATE NULL,
      pieces_jointes JSON NULL,
      reponse_admin TEXT NULL,
      traite_par BIGINT UNSIGNED NULL,
      traite_a TIMESTAMP NULL,
      repondu_a TIMESTAMP NULL,
      lu_a TIMESTAMP NULL,
      est_masque TINYINT(1) NOT NULL DEFAULT 0,
      signale_par BIGINT UNSIGNED NULL,
      motif_signalement VARCHAR(500) NULL,
      signale_a TIMESTAMP NULL,
      created_at TIMESTAMP NULL,
      updated_at TIMESTAMP NULL,
      deleted_at TIMESTAMP NULL,
      CONSTRAINT fk_ech_client FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
      CONSTRAINT fk_ech_traite_par FOREIGN KEY (traite_par) REFERENCES users(id) ON DELETE SET NULL,
      CONSTRAINT fk_ech_signale_par FOREIGN KEY (signale_par) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await q.query(`CREATE TABLE paiements (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      reference VARCHAR(255) NOT NULL UNIQUE,
      client_id BIGINT UNSIGNED NOT NULL,
      praticien_id BIGINT UNSIGNED NULL,
      rendez_vous_id BIGINT UNSIGNED NULL,
      date_paiement TIMESTAMP NULL,
      montant_brut DECIMAL(10,2) NOT NULL,
      commission DECIMAL(10,2) NOT NULL DEFAULT 0,
      montant_net_praticien DECIMAL(10,2) NOT NULL DEFAULT 0,
      moyen_paiement VARCHAR(50) NOT NULL,
      statut VARCHAR(50) NULL,
      details_paiement JSON NULL,
      metadata JSON NULL,
      date_remboursement TIMESTAMP NULL,
      created_at TIMESTAMP NULL,
      updated_at TIMESTAMP NULL,
      deleted_at TIMESTAMP NULL,
      CONSTRAINT fk_pai_client FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
      CONSTRAINT fk_pai_praticien FOREIGN KEY (praticien_id) REFERENCES praticiens(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await q.query(`CREATE TABLE remboursements (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      reference VARCHAR(255) NOT NULL UNIQUE,
      client_id BIGINT UNSIGNED NOT NULL,
      paiement_id BIGINT UNSIGNED NOT NULL,
      praticien_id BIGINT UNSIGNED NULL,
      montant DECIMAL(10,2) NOT NULL,
      motif VARCHAR(255) NOT NULL,
      description TEXT NULL,
      statut VARCHAR(50) NOT NULL DEFAULT 'en_attente',
      commentaire_admin TEXT NULL,
      date_traitement TIMESTAMP NULL,
      date_remboursement TIMESTAMP NULL,
      documents JSON NULL,
      metadata JSON NULL,
      created_at TIMESTAMP NULL,
      updated_at TIMESTAMP NULL,
      deleted_at TIMESTAMP NULL,
      CONSTRAINT fk_rmb_client FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
      CONSTRAINT fk_rmb_paiement FOREIGN KEY (paiement_id) REFERENCES paiements(id) ON DELETE CASCADE,
      CONSTRAINT fk_rmb_praticien FOREIGN KEY (praticien_id) REFERENCES praticiens(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  }

  public async down(q: QueryRunner): Promise<void> {
    for (const t of [
      'remboursements', 'paiements', 'echanges', 'email_templates', 'notifications',
      'disciplines', 'articles', 'signalements', 'avis', 'promotions', 'programmes',
      'event_praticien', 'events', 'cercles', 'praticien_documents', 'praticiens',
      'clients', 'users',
    ]) {
      await q.query(`DROP TABLE IF EXISTS ${t}`);
    }
  }
}
```

**If reusing the existing Laravel MySQL DB instead of a fresh one:** do NOT run InitialSchema. Apply only this delta (the columns PHP models expected but migrations never created):

```sql
ALTER TABLE echanges RENAME COLUMN status TO statut;
ALTER TABLE echanges
  ADD COLUMN priorite VARCHAR(20) NOT NULL DEFAULT 'moyenne',
  ADD COLUMN ce_que_je_propose VARCHAR(500) NULL, ADD COLUMN ce_que_je_recherche VARCHAR(500) NULL,
  ADD COLUMN delai_souhaite DATE NULL, ADD COLUMN pieces_jointes JSON NULL,
  ADD COLUMN reponse_admin TEXT NULL, ADD COLUMN traite_par BIGINT UNSIGNED NULL,
  ADD COLUMN traite_a TIMESTAMP NULL, ADD COLUMN repondu_a TIMESTAMP NULL, ADD COLUMN lu_a TIMESTAMP NULL,
  ADD COLUMN est_masque TINYINT(1) NOT NULL DEFAULT 0, ADD COLUMN signale_par BIGINT UNSIGNED NULL,
  ADD COLUMN motif_signalement VARCHAR(500) NULL, ADD COLUMN signale_a TIMESTAMP NULL,
  ADD COLUMN deleted_at TIMESTAMP NULL;
ALTER TABLE paiements
  ADD COLUMN rendez_vous_id BIGINT UNSIGNED NULL, ADD COLUMN details_paiement JSON NULL,
  ADD COLUMN metadata JSON NULL, ADD COLUMN date_remboursement TIMESTAMP NULL,
  ADD COLUMN deleted_at TIMESTAMP NULL;
ALTER TABLE remboursements ADD COLUMN deleted_at TIMESTAMP NULL;
ALTER TABLE email_templates ADD COLUMN deleted_at TIMESTAMP NULL;
ALTER TABLE promotions MODIFY COLUMN status VARCHAR(255) NULL;
```

- [x] **Step 6: Run the test to verify it passes**

Run: `cd server-nest && npx jest --config test/jest-e2e.json database`
Expected: PASS (schema synthesized from entities on sqlite; JSON round-trip + soft delete work).

- [x] **Step 7: Verify migration runs against MySQL (if a local MySQL is available)**

Run: `cd server-nest && npm run migration:run`
Expected: `InitialSchema1700000000000` executed. (Skip if no local MySQL; CI/tests don't need it.)

- [x] **Step 8: Commit**

```bash
git add server-nest/src server-nest/test server-nest/package.json
git commit -m "feat(server-nest): TypeORM entities, initial MySQL migration, sqlite test harness"
```

---

### Task 4: Auth core — JWT strategy, guards, hash/token services

**Files:**
- Create: `server-nest/src/auth/auth.module.ts` (replace Task 3 stub), `jwt.strategy.ts`, `hash.service.ts`, `token.service.ts`, `decorators.ts`, `guards/jwt-auth.guard.ts`, `guards/admin.guard.ts`, `guards/client.guard.ts`
- Test: `server-nest/test/auth-core.e2e-spec.ts`

- [x] **Step 1: Write the failing test**

`server-nest/test/auth-core.e2e-spec.ts`:

```ts
import { Controller, Get, INestApplication, Module, UseGuards } from '@nestjs/common';
import * as request from 'supertest';
import { createTestApp, seedAdmin, seedClientUser, signToken } from './utils/create-test-app';
import { JwtAuthGuard } from '../src/auth/guards/jwt-auth.guard';
import { AdminGuard } from '../src/auth/guards/admin.guard';
import { ClientGuard } from '../src/auth/guards/client.guard';
import { CurrentUser, CurrentClient } from '../src/auth/decorators';
import { DataSource } from 'typeorm';
import { User } from '../src/database/entities/user.entity';
import * as bcrypt from 'bcryptjs';

@Controller('probe')
class ProbeController {
  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user: any) { return { id: user.id, email: user.email }; }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('admin')
  admin() { return { ok: true }; }

  @UseGuards(JwtAuthGuard, ClientGuard)
  @Get('client')
  client(@CurrentClient() client: any) { return { client_id: client.id }; }
}
@Module({ controllers: [ProbeController] })
class ProbeModule {}

describe('auth core', () => {
  let app: INestApplication;
  beforeAll(async () => { app = await createTestApp({ imports: [ProbeModule] }); });
  afterAll(async () => { await app.close(); });

  it('rejects missing/invalid token with Laravel-style 401', async () => {
    const res = await request(app.getHttpServer()).get('/api/probe/me').expect(401);
    expect(res.body.status).toBe('error');
  });

  it('accepts a valid token and loads a fresh user', async () => {
    const { user, token } = await seedAdmin(app);
    const res = await request(app.getHttpServer())
      .get('/api/probe/me').set('Authorization', `Bearer ${token}`).expect(200);
    expect(res.body).toEqual({ id: user.id, email: user.email });
  });

  it('AdminGuard blocks non-admin with 403 envelope', async () => {
    const { token } = await seedClientUser(app, 'nonadmin@test.io');
    const res = await request(app.getHttpServer())
      .get('/api/probe/admin').set('Authorization', `Bearer ${token}`).expect(403);
    expect(res.body).toEqual({ status: 'error', message: 'Accès non autorisé' });
  });

  it('ClientGuard resolves the clients row by email, 403 when none', async () => {
    const { client, token } = await seedClientUser(app, 'withrow@test.io');
    const ok = await request(app.getHttpServer())
      .get('/api/probe/client').set('Authorization', `Bearer ${token}`).expect(200);
    expect(ok.body).toEqual({ client_id: client.id });

    const ds = app.get(DataSource);
    const lone = await ds.getRepository(User).save({
      name: 'No Client', email: 'noclient@test.io',
      password: await bcrypt.hash('x', 4), is_admin: false,
    });
    await request(app.getHttpServer())
      .get('/api/probe/client').set('Authorization', `Bearer ${signToken(app, lone)}`).expect(403);
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `cd server-nest && npx jest --config test/jest-e2e.json auth-core`
Expected: FAIL — guards/strategy modules missing.

- [x] **Step 3: Implement auth core**

`server-nest/src/auth/hash.service.ts`:

```ts
import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class HashService {
  hash(plain: string): Promise<string> {
    return bcrypt.hash(plain, 12);
  }
  // bcryptjs accepts Laravel's $2y$ prefix, so existing hashes keep working.
  compare(plain: string, hashed: string): Promise<boolean> {
    return bcrypt.compare(plain, hashed);
  }
}
```

`server-nest/src/auth/token.service.ts`:

```ts
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User } from '../database/entities/user.entity';

@Injectable()
export class TokenService {
  constructor(private readonly jwt: JwtService) {}

  ttlSeconds(): number {
    return parseInt(process.env.JWT_TTL_MINUTES ?? '60', 10) * 60;
  }

  sign(user: User): string {
    return this.jwt.sign(
      { user_id: user.id, email: user.email, is_admin: user.is_admin },
      { subject: String(user.id) },
    );
  }

  tokenPayload(user: User) {
    return { token: this.sign(user), token_type: 'bearer', expires_in: this.ttlSeconds() };
  }
}
```

`server-nest/src/auth/jwt.strategy.ts`:

```ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../database/entities/user.entity';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(@InjectRepository(User) private readonly users: Repository<User>) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET!,
    });
  }

  async validate(payload: { sub: string }): Promise<User> {
    const user = await this.users.findOneBy({ id: Number(payload.sub) });
    if (!user) throw new UnauthorizedException({ status: 'error', message: 'Token invalide ou expiré' });
    return user;
  }
}
```

`server-nest/src/auth/guards/jwt-auth.guard.ts`:

```ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest(err: any, user: any) {
    if (err || !user) {
      throw new UnauthorizedException({ status: 'error', message: 'Token invalide ou expiré' });
    }
    return user;
  }
}
```

`server-nest/src/auth/guards/admin.guard.ts`:

```ts
import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const user = ctx.switchToHttp().getRequest().user;
    if (!user?.is_admin) {
      throw new ForbiddenException({ status: 'error', message: 'Accès non autorisé' });
    }
    return true;
  }
}
```

`server-nest/src/auth/guards/client.guard.ts` (D2):

```ts
import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Client } from '../../database/entities/client.entity';

@Injectable()
export class ClientGuard implements CanActivate {
  constructor(@InjectRepository(Client) private readonly clients: Repository<Client>) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const client = req.user?.email
      ? await this.clients.findOneBy({ email: req.user.email })
      : null;
    if (!client) {
      throw new ForbiddenException({
        status: 'error',
        message: "Vous n'êtes pas autorisé à accéder à cette ressource.",
      });
    }
    req.client = client;
    return true;
  }
}
```

`server-nest/src/auth/decorators.ts`:

```ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext) => ctx.switchToHttp().getRequest().user,
);
export const CurrentClient = createParamDecorator(
  (_: unknown, ctx: ExecutionContext) => ctx.switchToHttp().getRequest().client,
);
```

`server-nest/src/auth/auth.module.ts` (replaces the Task 3 stub — feature controllers register in Tasks 5-7):

```ts
import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../database/entities/user.entity';
import { Client } from '../database/entities/client.entity';
import { JwtStrategy } from './jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AdminGuard } from './guards/admin.guard';
import { ClientGuard } from './guards/client.guard';
import { HashService } from './hash.service';
import { TokenService } from './token.service';

@Global()
@Module({
  imports: [
    PassportModule,
    TypeOrmModule.forFeature([User, Client]),
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: process.env.JWT_SECRET,
        signOptions: { expiresIn: `${process.env.JWT_TTL_MINUTES ?? 60}m` },
      }),
    }),
  ],
  providers: [JwtStrategy, JwtAuthGuard, AdminGuard, ClientGuard, HashService, TokenService],
  exports: [JwtModule, TypeOrmModule, JwtAuthGuard, AdminGuard, ClientGuard, HashService, TokenService],
})
export class AuthModule {}
```

- [x] **Step 4: Run tests to verify they pass**

Run: `cd server-nest && npx jest --config test/jest-e2e.json auth-core`
Expected: 4 passed.

- [x] **Step 5: Commit**

```bash
git add server-nest/src/auth server-nest/test
git commit -m "feat(server-nest): JWT auth core - strategy, guards, hash/token services"
```

---
### Task 5: Admin auth module (`/api/admin/...`)

**Files:**
- Create: `server-nest/src/common/match.decorator.ts`, `server-nest/src/auth/user.util.ts`
- Create: `server-nest/src/auth/admin-auth/admin-auth.module.ts`, `admin-auth.controller.ts`, `admin-auth.service.ts`, `dto/register-admin.dto.ts`, `dto/login.dto.ts`, `dto/change-password.dto.ts`
- Modify: `server-nest/src/app.module.ts` (import AdminAuthModule)
- Test: `server-nest/test/admin-auth.e2e-spec.ts`

- [x] **Step 1: Write the failing test**

`server-nest/test/admin-auth.e2e-spec.ts`:

```ts
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createTestApp, seedAdmin, seedClientUser } from './utils/create-test-app';
import { AdminAuthModule } from '../src/auth/admin-auth/admin-auth.module';

describe('admin auth', () => {
  let app: INestApplication;
  beforeAll(async () => { app = await createTestApp({ imports: [AdminAuthModule] }); });
  afterAll(async () => { await app.close(); });
  const http = () => request(app.getHttpServer());

  it('POST /api/admin/register creates admin and returns token', async () => {
    const res = await http().post('/api/admin/register').send({
      name: 'Boss', email: 'boss@aura.io',
      password: 'secret123', password_confirmation: 'secret123',
    }).expect(201);
    expect(res.body.status).toBe('success');
    expect(res.body.message).toBe('Compte administrateur créé avec succès');
    expect(res.body.data.user).toMatchObject({ name: 'Boss', email: 'boss@aura.io', is_admin: true });
    expect(res.body.data.token_type).toBe('bearer');
    expect(res.body.data.expires_in).toBe(3600);
    expect(res.body.data.user.password).toBeUndefined();
  });

  it('register rejects duplicate email with 422 envelope', async () => {
    const res = await http().post('/api/admin/register').send({
      name: 'Boss2', email: 'boss@aura.io',
      password: 'secret123', password_confirmation: 'secret123',
    }).expect(422);
    expect(res.body).toMatchObject({ status: 'error', message: 'Erreur de validation' });
    expect(res.body.errors.email).toBeDefined();
  });

  it('register rejects mismatched confirmation', async () => {
    const res = await http().post('/api/admin/register').send({
      name: 'X', email: 'x@aura.io', password: 'secret123', password_confirmation: 'nope',
    }).expect(422);
    expect(res.body.errors.password_confirmation).toBeDefined();
  });

  it('POST /api/admin/login: wrong creds 401, non-admin 403, admin 200', async () => {
    const bad = await http().post('/api/admin/login')
      .send({ email: 'boss@aura.io', password: 'wrong' }).expect(401);
    expect(bad.body.message).toBe('Les identifiants sont incorrects.');

    await seedClientUser(app, 'plain@aura.io');
    const forb = await http().post('/api/admin/login')
      .send({ email: 'plain@aura.io', password: 'password123' }).expect(403);
    expect(forb.body.message).toBe("Vous n'êtes pas autorisé à vous connecter en tant qu'administrateur.");

    const ok = await http().post('/api/admin/login')
      .send({ email: 'boss@aura.io', password: 'secret123' }).expect(200);
    expect(ok.body.message).toBe('Connexion administrateur réussie');
    expect(ok.body.data.user.last_login_at).toBeTruthy();
  });

  it('protected routes: profile, check-token, change-password, logout, refresh', async () => {
    const { token } = await seedAdmin(app, 'admin2@aura.io');
    await http().get('/api/admin/profile').expect(401);
    const prof = await http().get('/api/admin/profile')
      .set('Authorization', `Bearer ${token}`).expect(200);
    expect(prof.body.data.user.email).toBe('admin2@aura.io');

    const chk = await http().get('/api/admin/check-token')
      .set('Authorization', `Bearer ${token}`).expect(200);
    expect(chk.body.message).toBe('Token admin valide');

    const badPw = await http().post('/api/admin/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ current_password: 'wrong', new_password: 'newsecret1', new_password_confirmation: 'newsecret1' })
      .expect(400);
    expect(badPw.body.message).toBe('Le mot de passe actuel est incorrect');

    await http().post('/api/admin/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ current_password: 'password123', new_password: 'newsecret1', new_password_confirmation: 'newsecret1' })
      .expect(200);

    const ref = await http().post('/api/admin/refresh')
      .set('Authorization', `Bearer ${token}`).expect(200);
    expect(ref.body.data.token).toBeTruthy();

    const out = await http().post('/api/admin/logout')
      .set('Authorization', `Bearer ${token}`).expect(200);
    expect(out.body.message).toBe('Déconnexion réussie');
  });

  it('admin management: list, deactivate (not self), activate, destroy', async () => {
    const { user: me, token } = await seedAdmin(app, 'root@aura.io');
    const { user: other } = await seedAdmin(app, 'other@aura.io');

    const list = await http().get('/api/admin/list')
      .set('Authorization', `Bearer ${token}`).expect(200);
    expect(list.body.pagination.total).toBeGreaterThanOrEqual(2);

    const self = await http().post(`/api/admin/${me.id}/deactivate`)
      .set('Authorization', `Bearer ${token}`).expect(400);
    expect(self.body.message).toBe('Vous ne pouvez pas désactiver votre propre compte');

    await http().post(`/api/admin/${other.id}/deactivate`)
      .set('Authorization', `Bearer ${token}`).expect(200);
    await http().post(`/api/admin/${other.id}/activate`)
      .set('Authorization', `Bearer ${token}`).expect(200);
    await http().delete(`/api/admin/${other.id}`)
      .set('Authorization', `Bearer ${token}`).expect(200);
    await http().delete(`/api/admin/${other.id}`)
      .set('Authorization', `Bearer ${token}`).expect(404);
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `cd server-nest && npx jest --config test/jest-e2e.json admin-auth`
Expected: FAIL — module missing.

- [x] **Step 3: Implement**

`server-nest/src/common/match.decorator.ts` (Laravel `confirmed` rule):

```ts
import {
  registerDecorator, ValidationArguments, ValidationOptions,
} from 'class-validator';

export function Match(property: string, options?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      name: 'match',
      target: object.constructor,
      propertyName,
      constraints: [property],
      options,
      validator: {
        validate(value: unknown, args: ValidationArguments) {
          return value === (args.object as Record<string, unknown>)[args.constraints[0]];
        },
        defaultMessage: (args: ValidationArguments) =>
          `${args.property} ne correspond pas à ${args.constraints[0]}`,
      },
    });
  };
}
```

`server-nest/src/auth/user.util.ts`:

```ts
import { User } from '../database/entities/user.entity';

export function sanitizeUser(user: User) {
  const { password, remember_token, ...rest } = user;
  return rest;
}

export function pickUser(user: User, keys: (keyof User)[]) {
  return Object.fromEntries(keys.map((k) => [k, user[k]]));
}
```

`server-nest/src/auth/admin-auth/dto/register-admin.dto.ts`:

```ts
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import { Match } from '../../../common/match.decorator';

export class RegisterAdminDto {
  @IsString() @MaxLength(255) name: string;
  @IsEmail() email: string;
  @IsString() @MinLength(8) password: string;
  @IsString() @Match('password') password_confirmation: string;
}
```

`server-nest/src/auth/admin-auth/dto/login.dto.ts`:

```ts
import { IsEmail, IsString } from 'class-validator';

export class LoginDto {
  @IsEmail() email: string;
  @IsString() password: string;
}
```

`server-nest/src/auth/admin-auth/dto/change-password.dto.ts`:

```ts
import { IsString, MinLength } from 'class-validator';
import { Match } from '../../../common/match.decorator';

export class ChangePasswordDto {
  @IsString() current_password: string;
  @IsString() @MinLength(8) new_password: string;
  @IsString() @Match('new_password') new_password_confirmation: string;
}
```

`server-nest/src/auth/admin-auth/admin-auth.service.ts`:

```ts
import {
  BadRequestException, ForbiddenException, Injectable, NotFoundException,
  UnauthorizedException, UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Request } from 'express';
import { User } from '../../database/entities/user.entity';
import { HashService } from '../hash.service';
import { TokenService } from '../token.service';
import { pickUser, sanitizeUser } from '../user.util';
import { success } from '../../common/envelope';
import { RegisterAdminDto } from './dto/register-admin.dto';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@Injectable()
export class AdminAuthService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly hash: HashService,
    private readonly tokens: TokenService,
  ) {}

  private validationError(errors: Record<string, string[]>): never {
    throw new UnprocessableEntityException({
      status: 'error', message: 'Erreur de validation', errors,
    });
  }

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

  async login(dto: LoginDto, req: Request) {
    const user = await this.users.findOneBy({ email: dto.email });
    if (!user || !(await this.hash.compare(dto.password, user.password))) {
      throw new UnauthorizedException({ status: 'error', message: 'Les identifiants sont incorrects.' });
    }
    if (!user.is_admin) {
      throw new ForbiddenException({
        status: 'error',
        message: "Vous n'êtes pas autorisé à vous connecter en tant qu'administrateur.",
      });
    }
    await this.users.update(user.id, { last_login_at: new Date(), ip_address: req.ip });
    const fresh = await this.users.findOneByOrFail({ id: user.id });
    return success(
      {
        user: pickUser(fresh, ['id', 'name', 'email', 'is_admin', 'last_login_at']),
        ...this.tokens.tokenPayload(fresh),
      },
      'Connexion administrateur réussie',
    );
  }

  logout() {
    return success(undefined, 'Déconnexion réussie');
  }

  refresh(user: User) {
    return success(this.tokens.tokenPayload(user));
  }

  profile(user: User) {
    return success({
      user: pickUser(user, [
        'id', 'name', 'email', 'is_admin', 'last_login_at', 'ip_address', 'created_at', 'updated_at',
      ]),
    });
  }

  checkToken(user: User) {
    return success(
      { user: pickUser(user, ['id', 'name', 'email', 'is_admin']) },
      'Token admin valide',
    );
  }

  async changePassword(user: User, dto: ChangePasswordDto) {
    if (!(await this.hash.compare(dto.current_password, user.password))) {
      throw new BadRequestException({ status: 'error', message: 'Le mot de passe actuel est incorrect' });
    }
    await this.users.update(user.id, { password: await this.hash.hash(dto.new_password) });
    return success(undefined, 'Mot de passe mis à jour avec succès');
  }

  async list(query: Record<string, any>) {
    const perPage = Math.max(1, parseInt(query.per_page, 10) || 15);
    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const [items, total] = await this.users.findAndCount({
      where: { is_admin: true },
      order: { created_at: 'DESC' },
      skip: (page - 1) * perPage,
      take: perPage,
    });
    return success(items.map(sanitizeUser), undefined, {
      pagination: {
        current_page: page,
        last_page: Math.max(1, Math.ceil(total / perPage)),
        per_page: perPage,
        total,
      },
    });
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
}
```

`server-nest/src/auth/admin-auth/admin-auth.controller.ts`:

```ts
import {
  Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Post, Query, Req, UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { AdminAuthService } from './admin-auth.service';
import { RegisterAdminDto } from './dto/register-admin.dto';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { AdminGuard } from '../guards/admin.guard';
import { CurrentUser } from '../decorators';
import { User } from '../../database/entities/user.entity';

@Controller('admin')
export class AdminAuthController {
  constructor(private readonly service: AdminAuthService) {}

  @Post('register')
  register(@Body() dto: RegisterAdminDto) { return this.service.register(dto); }

  @HttpCode(200)
  @Post('login')
  login(@Body() dto: LoginDto, @Req() req: Request) { return this.service.login(dto, req); }

  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  @Post('logout')
  logout() { return this.service.logout(); }

  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  @Post('refresh')
  refresh(@CurrentUser() user: User) { return this.service.refresh(user); }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('profile')
  profile(@CurrentUser() user: User) { return this.service.profile(user); }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('check-token')
  checkToken(@CurrentUser() user: User) { return this.service.checkToken(user); }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @HttpCode(200)
  @Post('change-password')
  changePassword(@CurrentUser() user: User, @Body() dto: ChangePasswordDto) {
    return this.service.changePassword(user, dto);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('list')
  list(@Query() query: Record<string, any>) { return this.service.list(query); }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @HttpCode(200)
  @Post(':id/deactivate')
  deactivate(@CurrentUser() user: User, @Param('id', ParseIntPipe) id: number) {
    return this.service.deactivate(user, id);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @HttpCode(200)
  @Post(':id/activate')
  activate(@Param('id', ParseIntPipe) id: number) { return this.service.activate(id); }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Delete(':id')
  destroy(@CurrentUser() user: User, @Param('id', ParseIntPipe) id: number) {
    return this.service.destroy(user, id);
  }
}
```

PHP parity note: Laravel protected these management routes with `auth:api` only + in-controller `is_admin` checks; guard composition here is equivalent (401 without token, 403 non-admin).

`server-nest/src/auth/admin-auth/admin-auth.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { AdminAuthController } from './admin-auth.controller';
import { AdminAuthService } from './admin-auth.service';

@Module({ controllers: [AdminAuthController], providers: [AdminAuthService] })
export class AdminAuthModule {}
```

Register in `server-nest/src/app.module.ts` imports: `AdminAuthModule`.

- [x] **Step 4: Run tests to verify they pass**

Run: `cd server-nest && npx jest --config test/jest-e2e.json admin-auth`
Expected: 6 passed.

- [x] **Step 5: Commit**

```bash
git add server-nest/src server-nest/test
git commit -m "feat(server-nest): admin auth endpoints with Laravel response parity"
```

---

### Task 6: Praticien auth module (`/api/v1/praticien/...`) + file storage

**Files:**
- Create: `server-nest/src/common/storage.service.ts`, `server-nest/src/common/upload.util.ts`
- Create: `server-nest/src/auth/praticien-auth/praticien-auth.module.ts`, `praticien-auth.controller.ts`, `praticien-auth.service.ts`, `dto/register-praticien.dto.ts`
- Modify: `server-nest/src/app.module.ts`
- Test: `server-nest/test/praticien-auth.e2e-spec.ts`

- [x] **Step 1: Write the failing test**

`server-nest/test/praticien-auth.e2e-spec.ts`:

```ts
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createTestApp } from './utils/create-test-app';
import { PraticienAuthModule } from '../src/auth/praticien-auth/praticien-auth.module';
import { DataSource } from 'typeorm';
import { Praticien } from '../src/database/entities/praticien.entity';

const DOC_FIELDS = ['piece_identite', 'certification', 'assurance', 'domicile', 'charte'];

function attachDocs(req: request.Test) {
  for (const f of DOC_FIELDS) {
    req = req.attach(`documents[${f}]`, Buffer.from('%PDF-1.4 fake'), {
      filename: `${f}.pdf`, contentType: 'application/pdf',
    });
  }
  return req;
}

const FIELDS = {
  firstname: 'Jean', lastname: 'Dupont', email: 'jean@aura.io',
  password: 'secret123', password_confirmation: 'secret123',
  telephone: '0600000000', ville: 'Lyon', niveau: 'expert',
  specialite: 'yoga', mode: 'presentiel', tarif: '50', experience: '5',
  bio: 'Une biographie suffisamment longue pour dépasser la limite des cinquante caractères.',
};

describe('praticien auth', () => {
  let app: INestApplication;
  beforeAll(async () => { app = await createTestApp({ imports: [PraticienAuthModule] }); });
  afterAll(async () => { await app.close(); });
  const http = () => request(app.getHttpServer());

  it('register creates user + praticien + 5 documents in one transaction', async () => {
    let req = http().post('/api/v1/praticien/register');
    for (const [k, v] of Object.entries(FIELDS)) req = req.field(k, v);
    const res = await attachDocs(req).expect(201);
    expect(res.body.message).toContain('En attente de vérification');
    expect(res.body.data.praticien.statut_verification).toBe('en_attente');
    expect(res.body.data.documents_soumis).toBe(5);
    expect(res.body.data.documents_requis).toBe(5);
    expect(res.body.data.user.password).toBeUndefined();

    const ds = app.get(DataSource);
    const prat = await ds.getRepository(Praticien).findOneOrFail({
      where: { email: 'jean@aura.io' }, relations: { documents: true },
    });
    expect(prat.documents).toHaveLength(5);
  });

  it('register 422 when a document is missing', async () => {
    let req = http().post('/api/v1/praticien/register');
    for (const [k, v] of Object.entries({ ...FIELDS, email: 'other@aura.io' })) req = req.field(k, v);
    for (const f of DOC_FIELDS.slice(0, 4)) {
      req = req.attach(`documents[${f}]`, Buffer.from('x'), { filename: `${f}.pdf`, contentType: 'application/pdf' });
    }
    const res = await req.expect(422);
    expect(res.body.errors['documents.charte']).toBeDefined();
  });

  it('login returns praticien payload; rejected praticien gets 403 with motif', async () => {
    const ok = await http().post('/api/v1/praticien/login')
      .send({ email: 'jean@aura.io', password: 'secret123' }).expect(200);
    expect(ok.body.data.verification_status).toBe('en_attente');
    expect(ok.body.data.is_verified).toBe(false);

    const ds = app.get(DataSource);
    await ds.getRepository(Praticien).update(
      { email: 'jean@aura.io' },
      { statut_verification: 'rejete', motif_rejet: 'Documents illisibles' },
    );
    const rej = await http().post('/api/v1/praticien/login')
      .send({ email: 'jean@aura.io', password: 'secret123' }).expect(403);
    expect(rej.body.message).toContain('Documents illisibles');
    expect(rej.body.motif_rejet).toBe('Documents illisibles');
    await ds.getRepository(Praticien).update(
      { email: 'jean@aura.io' }, { statut_verification: 'en_attente', motif_rejet: null },
    );
  });

  it('profile returns praticien + documents_stats; check-token works', async () => {
    const login = await http().post('/api/v1/praticien/login')
      .send({ email: 'jean@aura.io', password: 'secret123' }).expect(200);
    const token = login.body.data.token;

    const prof = await http().get('/api/v1/praticien/profile')
      .set('Authorization', `Bearer ${token}`).expect(200);
    expect(prof.body.data.documents_stats).toEqual({ total: 5, en_attente: 5, valide: 0, rejete: 0 });

    const chk = await http().get('/api/v1/praticien/check-token')
      .set('Authorization', `Bearer ${token}`).expect(200);
    expect(chk.body.message).toBe('Token valide');

    await http().post('/api/v1/praticien/refresh')
      .set('Authorization', `Bearer ${token}`).expect(200);
    await http().post('/api/v1/praticien/logout')
      .set('Authorization', `Bearer ${token}`).expect(200);
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `cd server-nest && npx jest --config test/jest-e2e.json praticien-auth`
Expected: FAIL — module missing.

- [x] **Step 3: Implement storage + upload validation**

`server-nest/src/common/storage.service.ts`:

```ts
import { Injectable } from '@nestjs/common';
import { promises as fs } from 'fs';
import { join } from 'path';

@Injectable()
export class StorageService {
  private readonly base = process.env.UPLOAD_DIR ?? join(process.cwd(), 'storage', 'uploads');

  async save(file: Express.Multer.File, subdir: string): Promise<string> {
    const dir = join(this.base, subdir);
    await fs.mkdir(dir, { recursive: true });
    const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${file.originalname}`;
    await fs.writeFile(join(dir, name), file.buffer);
    return `${subdir}/${name}`;
  }
}
```

`server-nest/src/common/upload.util.ts`:

```ts
import { UnprocessableEntityException } from '@nestjs/common';

const MIME_BY_EXT: Record<string, string[]> = {
  jpg: ['image/jpeg'], jpeg: ['image/jpeg'], png: ['image/png'], gif: ['image/gif'],
  pdf: ['application/pdf'],
  doc: ['application/msword'],
  docx: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
};

export function assertUpload(
  file: Express.Multer.File,
  field: string,
  allowedExts: string[],
  maxKb = 5120,
) {
  const errors: Record<string, string[]> = {};
  const allowedMimes = allowedExts.flatMap((e) => MIME_BY_EXT[e] ?? []);
  if (file.size > maxKb * 1024) {
    errors[field] = [`Le fichier ne doit pas dépasser ${maxKb} Ko.`];
  } else if (!allowedMimes.includes(file.mimetype)) {
    errors[field] = [`Type de fichier invalide (attendu: ${allowedExts.join(', ')}).`];
  }
  if (Object.keys(errors).length) {
    throw new UnprocessableEntityException({
      status: 'error', message: 'Erreur de validation', errors,
    });
  }
}
```

- [x] **Step 4: Implement the module**

`server-nest/src/auth/praticien-auth/dto/register-praticien.dto.ts`:

```ts
import { IsEmail, IsInt, IsNumber, IsString, MaxLength, Min, MinLength } from 'class-validator';
import { Type } from 'class-transformer';
import { Match } from '../../../common/match.decorator';

export class RegisterPraticienDto {
  @IsString() @MaxLength(255) firstname: string;
  @IsString() @MaxLength(255) lastname: string;
  @IsEmail() email: string;
  @IsString() @MinLength(8) password: string;
  @IsString() @Match('password') password_confirmation: string;
  @IsString() @MaxLength(20) telephone: string;
  @IsString() @MaxLength(255) ville: string;
  @IsString() @MaxLength(255) niveau: string;
  @IsString() @MaxLength(255) specialite: string;
  @IsString() @MaxLength(255) mode: string;
  @Type(() => Number) @IsNumber() @Min(0) tarif: number;
  @Type(() => Number) @IsInt() @Min(0) experience: number;
  @IsString() @MinLength(50) bio: string;
}
```

`server-nest/src/auth/praticien-auth/praticien-auth.service.ts`:

```ts
import {
  ForbiddenException, Injectable, NotFoundException,
  UnauthorizedException, UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Request } from 'express';
import { User } from '../../database/entities/user.entity';
import { Praticien } from '../../database/entities/praticien.entity';
import { PraticienDocument } from '../../database/entities/praticien-document.entity';
import { HashService } from '../hash.service';
import { TokenService } from '../token.service';
import { sanitizeUser } from '../user.util';
import { success } from '../../common/envelope';
import { StorageService } from '../../common/storage.service';
import { assertUpload } from '../../common/upload.util';
import { RegisterPraticienDto } from './dto/register-praticien.dto';
import { LoginDto } from '../admin-auth/dto/login.dto';

export const DOC_TYPES = ['piece_identite', 'certification', 'assurance', 'domicile', 'charte'] as const;

@Injectable()
export class PraticienAuthService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Praticien) private readonly praticiens: Repository<Praticien>,
    private readonly dataSource: DataSource,
    private readonly hash: HashService,
    private readonly tokens: TokenService,
    private readonly storage: StorageService,
  ) {}

  private validationError(errors: Record<string, string[]>): never {
    throw new UnprocessableEntityException({
      status: 'error', message: 'Erreur de validation', errors,
    });
  }

  async register(dto: RegisterPraticienDto, files: Record<string, Express.Multer.File[]>) {
    const docErrors: Record<string, string[]> = {};
    for (const type of DOC_TYPES) {
      const file = files[`documents[${type}]`]?.[0];
      if (!file) {
        docErrors[`documents.${type}`] = [`Le document ${type} est requis.`];
        continue;
      }
      assertUpload(file, `documents.${type}`, ['jpg', 'jpeg', 'png', 'pdf']);
    }
    if (Object.keys(docErrors).length) this.validationError(docErrors);

    if (await this.users.findOneBy({ email: dto.email })) {
      this.validationError({ email: ['Cette adresse email est déjà utilisée.'] });
    }
    if (await this.praticiens.findOneBy({ email: dto.email })) {
      this.validationError({ email: ['Cette adresse email est déjà utilisée.'] });
    }

    // D11: single transaction (PHP had none — orphan rows on mid-failure)
    const { user, praticien, documentsUploades } = await this.dataSource.transaction(async (em) => {
      const user = await em.getRepository(User).save({
        name: `${dto.firstname} ${dto.lastname}`,
        email: dto.email,
        password: await this.hash.hash(dto.password),
        is_admin: false,
      });
      const praticien = await em.getRepository(Praticien).save({
        firstname: dto.firstname, lastname: dto.lastname, email: dto.email,
        telephone: dto.telephone, ville: dto.ville, niveau: dto.niveau,
        specialite: dto.specialite, mode: dto.mode, status: 'actif',
        tarif: dto.tarif, experience: dto.experience, bio: dto.bio,
        statut_verification: 'en_attente', date_inscription: new Date(),
      });
      let documentsUploades = 0;
      for (const type of DOC_TYPES) {
        const file = files[`documents[${type}]`][0];
        const chemin = await this.storage.save(file, `praticiens/${praticien.id}/documents`);
        await em.getRepository(PraticienDocument).save({
          praticien_id: praticien.id, type,
          nom_fichier: file.originalname, chemin,
          mime_type: file.mimetype, taille: file.size, statut: 'en_attente',
        });
        documentsUploades++;
      }
      return { user, praticien, documentsUploades };
    });

    return success(
      {
        user: sanitizeUser(user),
        praticien,
        ...this.tokens.tokenPayload(user),
        documents_soumis: documentsUploades,
        documents_requis: 5,
      },
      "Votre compte a été créé avec succès. En attente de vérification par l'administrateur.",
    );
  }

  async login(dto: LoginDto, req: Request) {
    const user = await this.users.findOneBy({ email: dto.email });
    if (!user || !(await this.hash.compare(dto.password, user.password))) {
      throw new UnauthorizedException({ status: 'error', message: 'Les identifiants sont incorrects.' });
    }
    const praticien = await this.praticiens.findOneBy({ email: user.email });
    if (!praticien) {
      throw new ForbiddenException({
        status: 'error',
        message: "Vous n'êtes pas autorisé à vous connecter en tant que praticien.",
      });
    }
    if (praticien.statut_verification === 'rejete') {
      throw new ForbiddenException({
        status: 'error',
        message: `Votre compte a été rejeté. Motif : ${praticien.motif_rejet ?? 'Non spécifié'}`,
        motif_rejet: praticien.motif_rejet,
      });
    }
    await this.users.update(user.id, { last_login_at: new Date(), ip_address: req.ip });
    const fresh = await this.users.findOneByOrFail({ id: user.id });
    return success(
      {
        user: sanitizeUser(fresh),
        praticien,
        ...this.tokens.tokenPayload(fresh),
        verification_status: praticien.statut_verification,
        is_verified: praticien.statut_verification === 'valide',
      },
      'Connexion réussie',
    );
  }

  logout() { return success(undefined, 'Déconnexion réussie'); }
  refresh(user: User) { return success(this.tokens.tokenPayload(user)); }

  async profile(user: User) {
    const praticien = await this.praticiens.findOne({
      where: { email: user.email },
      relations: { documents: true, verifiePar: true },
    });
    if (!praticien) {
      throw new NotFoundException({ status: 'error', message: 'Profil praticien non trouvé' });
    }
    const docs = praticien.documents ?? [];
    return success({
      user: sanitizeUser(user),
      praticien,
      documents_stats: {
        total: docs.length,
        en_attente: docs.filter((d) => d.statut === 'en_attente').length,
        valide: docs.filter((d) => d.statut === 'valide').length,
        rejete: docs.filter((d) => d.statut === 'rejete').length,
      },
    });
  }

  checkToken(user: User) {
    return success({ user: sanitizeUser(user), is_admin: user.is_admin }, 'Token valide');
  }
}
```

`server-nest/src/auth/praticien-auth/praticien-auth.controller.ts`:

```ts
import {
  Body, Controller, Get, HttpCode, Post, Req, UploadedFiles, UseGuards, UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { Request } from 'express';
import { PraticienAuthService, DOC_TYPES } from './praticien-auth.service';
import { RegisterPraticienDto } from './dto/register-praticien.dto';
import { LoginDto } from '../admin-auth/dto/login.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CurrentUser } from '../decorators';
import { User } from '../../database/entities/user.entity';

@Controller('v1/praticien')
export class PraticienAuthController {
  constructor(private readonly service: PraticienAuthService) {}

  @Post('register')
  @UseInterceptors(
    FileFieldsInterceptor(DOC_TYPES.map((t) => ({ name: `documents[${t}]`, maxCount: 1 }))),
  )
  register(
    @Body() dto: RegisterPraticienDto,
    @UploadedFiles() files: Record<string, Express.Multer.File[]>,
  ) {
    return this.service.register(dto, files ?? {});
  }

  @HttpCode(200)
  @Post('login')
  login(@Body() dto: LoginDto, @Req() req: Request) { return this.service.login(dto, req); }

  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  @Post('logout')
  logout() { return this.service.logout(); }

  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  @Post('refresh')
  refresh(@CurrentUser() user: User) { return this.service.refresh(user); }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  profile(@CurrentUser() user: User) { return this.service.profile(user); }

  @UseGuards(JwtAuthGuard)
  @Get('check-token')
  checkToken(@CurrentUser() user: User) { return this.service.checkToken(user); }
}
```

`server-nest/src/auth/praticien-auth/praticien-auth.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Praticien } from '../../database/entities/praticien.entity';
import { PraticienDocument } from '../../database/entities/praticien-document.entity';
import { PraticienAuthController } from './praticien-auth.controller';
import { PraticienAuthService } from './praticien-auth.service';
import { StorageService } from '../../common/storage.service';

@Module({
  imports: [TypeOrmModule.forFeature([Praticien, PraticienDocument])],
  controllers: [PraticienAuthController],
  providers: [PraticienAuthService, StorageService],
})
export class PraticienAuthModule {}
```

Register `PraticienAuthModule` in `app.module.ts`. In tests, set `process.env.UPLOAD_DIR` to a temp dir in `create-test-app.ts` (add `process.env.UPLOAD_DIR = require('os').tmpdir() + '/aura-test-uploads';` next to the JWT env lines).

- [x] **Step 5: Run tests to verify they pass**

Run: `cd server-nest && npx jest --config test/jest-e2e.json praticien-auth`
Expected: 4 passed.

- [x] **Step 6: Commit**

```bash
git add server-nest/src server-nest/test
git commit -m "feat(server-nest): praticien registration/login with document upload (transactional)"
```

---

### Task 7: Praticien verification module (`/api/v1/admin/praticiens/verification...`)

**Files:**
- Create: `server-nest/src/auth/praticien-verification/praticien-verification.module.ts`, `praticien-verification.controller.ts`, `praticien-verification.service.ts`, `dto/verify-documents.dto.ts`, `dto/reject-praticien.dto.ts`
- Modify: `server-nest/src/app.module.ts`
- Test: `server-nest/test/praticien-verification.e2e-spec.ts`

All routes: `@UseGuards(JwtAuthGuard, AdminGuard)` (D1 — PHP's `admin` middleware was never registered). Literal `statistics` route declared BEFORE `:id` (D7).

- [x] **Step 1: Write the failing test**

`server-nest/test/praticien-verification.e2e-spec.ts`:

```ts
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
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
  const docs = [];
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
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `cd server-nest && npx jest --config test/jest-e2e.json praticien-verification`
Expected: FAIL — module missing.

- [x] **Step 3: Implement**

`server-nest/src/auth/praticien-verification/dto/verify-documents.dto.ts`:

```ts
import { Type } from 'class-transformer';
import {
  IsArray, IsIn, IsInt, IsOptional, IsString, ValidateIf, ValidateNested,
} from 'class-validator';

export class VerifyDocumentItemDto {
  @IsInt() id: number;
  @IsIn(['valide', 'rejete']) statut: string;
  @ValidateIf((o) => o.statut === 'rejete')
  @IsString()
  commentaire_rejet?: string;
}

export class VerifyDocumentsDto {
  @IsArray() @ValidateNested({ each: true }) @Type(() => VerifyDocumentItemDto)
  documents: VerifyDocumentItemDto[];
  @IsOptional() @IsString() commentaire_global?: string;
}
```

`server-nest/src/auth/praticien-verification/dto/reject-praticien.dto.ts`:

```ts
import { IsString, MinLength } from 'class-validator';

export class RejectPraticienDto {
  @IsString() @MinLength(10) motif_rejet: string;
}
```

`server-nest/src/auth/praticien-verification/praticien-verification.service.ts`:

```ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Praticien } from '../../database/entities/praticien.entity';
import { PraticienDocument } from '../../database/entities/praticien-document.entity';
import { User } from '../../database/entities/user.entity';
import { success } from '../../common/envelope';
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
    const perPage = Math.max(1, parseInt(query.per_page, 10) || 15);
    const page = Math.max(1, parseInt(query.page, 10) || 1);
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
    const [data, total] = await qb.orderBy('p.created_at', 'ASC')
      .skip((page - 1) * perPage).take(perPage).getManyAndCount();
    const count = (st: string) => this.praticiens.countBy({ statut_verification: st });
    return success(data, undefined, {
      pagination: {
        current_page: page, last_page: Math.max(1, Math.ceil(total / perPage)),
        per_page: perPage, total,
      },
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
}
```

`server-nest/src/auth/praticien-verification/praticien-verification.controller.ts` — NOTE `statistics` declared before `:id`:

```ts
import {
  Body, Controller, Get, HttpCode, Param, ParseIntPipe, Post, Query, UseGuards,
} from '@nestjs/common';
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

  @Get('statistics')
  statistics() { return this.service.statistics(); }

  @Get()
  index(@Query() query: Record<string, any>) { return this.service.index(query); }

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

`server-nest/src/auth/praticien-verification/praticien-verification.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Praticien } from '../../database/entities/praticien.entity';
import { PraticienDocument } from '../../database/entities/praticien-document.entity';
import { PraticienVerificationController } from './praticien-verification.controller';
import { PraticienVerificationService } from './praticien-verification.service';

@Module({
  imports: [TypeOrmModule.forFeature([Praticien, PraticienDocument])],
  controllers: [PraticienVerificationController],
  providers: [PraticienVerificationService],
})
export class PraticienVerificationModule {}
```

Register `PraticienVerificationModule` in `app.module.ts`.

- [x] **Step 4: Run tests to verify they pass**

Run: `cd server-nest && npx jest --config test/jest-e2e.json praticien-verification`
Expected: 6 passed.

- [x] **Step 5: Commit**

```bash
git add server-nest/src server-nest/test
git commit -m "feat(server-nest): admin praticien verification workflow with working authz"
```

---
### Task 8: Cercles module (`/api/cercles`)

**Files:**
- Create: `server-nest/src/cercles/cercles.module.ts`, `cercles.controller.ts`, `cercles.service.ts`, `dto/create-cercle.dto.ts`, `dto/update-cercle.dto.ts`
- Modify: `server-nest/src/app.module.ts`
- Test: `server-nest/test/cercles.e2e-spec.ts`

PHP parity notes: routes are public. PHP's `update` was fatally broken (unimported `Rule`) — Nest implements the intended unique-ignoring-self check (fix). Index pagination includes `next_page_url`/`prev_page_url`.

- [x] **Step 1: Write the failing test**

`server-nest/test/cercles.e2e-spec.ts`:

```ts
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createTestApp } from './utils/create-test-app';
import { CerclesModule } from '../src/cercles/cercles.module';

describe('cercles', () => {
  let app: INestApplication;
  beforeAll(async () => { app = await createTestApp({ imports: [CerclesModule] }); });
  afterAll(async () => { await app.close(); });
  const http = () => request(app.getHttpServer());

  it('POST / creates; duplicate nom → 422; bad color → 422', async () => {
    const res = await http().post('/api/cercles')
      .send({ nom: 'Zen', description: 'd', color: '#AABBCC', animateur: 'Ana' }).expect(201);
    expect(res.body.message).toBe('Cercle créé avec succès');
    const dup = await http().post('/api/cercles').send({ nom: 'Zen' }).expect(422);
    expect(dup.body.errors.nom).toBeDefined();
    const bad = await http().post('/api/cercles').send({ nom: 'Autre', color: 'red' }).expect(422);
    expect(bad.body.errors.color).toBeDefined();
  });

  it('GET / paginates with URLs', async () => {
    const res = await http().get('/api/cercles?per_page=1').expect(200);
    expect(res.body.pagination).toMatchObject({ current_page: 1, per_page: 1 });
    expect(res.body.pagination).toHaveProperty('next_page_url');
    expect(res.body.pagination).toHaveProperty('prev_page_url');
  });

  it('GET/PUT/DELETE /:id with 404 envelopes', async () => {
    const created = await http().post('/api/cercles').send({ nom: 'Flow' }).expect(201);
    const id = created.body.data.id;
    await http().get(`/api/cercles/${id}`).expect(200);
    const upd = await http().put(`/api/cercles/${id}`).send({ nom: 'Flow 2' }).expect(200);
    expect(upd.body.message).toBe('Cercle mis à jour avec succès');
    // unique ignores self
    await http().put(`/api/cercles/${id}`).send({ nom: 'Flow 2' }).expect(200);
    // unique blocks other row's nom
    const clash = await http().put(`/api/cercles/${id}`).send({ nom: 'Zen' }).expect(422);
    expect(clash.body.errors.nom).toBeDefined();
    await http().delete(`/api/cercles/${id}`).expect(200);
    const nf = await http().get(`/api/cercles/${id}`).expect(404);
    expect(nf.body).toEqual({ status: 'error', message: 'Cercle non trouvé' });
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `cd server-nest && npx jest --config test/jest-e2e.json cercles`
Expected: FAIL — module missing.

- [x] **Step 3: Implement**

`server-nest/src/cercles/dto/create-cercle.dto.ts`:

```ts
import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class CreateCercleDto {
  @IsString() @MaxLength(255) nom: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() @MaxLength(50)
  @Matches(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, { message: 'color doit être un code hexadécimal valide' })
  color?: string;
  @IsOptional() @IsString() @MaxLength(255) animateur?: string;
}
```

`server-nest/src/cercles/dto/update-cercle.dto.ts`:

```ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateCercleDto } from './create-cercle.dto';

export class UpdateCercleDto extends PartialType(CreateCercleDto) {}
```

(Install once: `npm i @nestjs/mapped-types` — add to Task 1 deps if not pulled transitively.)

`server-nest/src/cercles/cercles.service.ts`:

```ts
import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { Request } from 'express';
import { Cercle } from '../database/entities/cercle.entity';
import { success } from '../common/envelope';
import { parsePagination, paginateQb, paginationUrls } from '../common/pagination';
import { CreateCercleDto } from './dto/create-cercle.dto';
import { UpdateCercleDto } from './dto/update-cercle.dto';

@Injectable()
export class CerclesService {
  constructor(@InjectRepository(Cercle) private readonly cercles: Repository<Cercle>) {}

  private async assertUniqueNom(nom: string, ignoreId?: number) {
    const clash = await this.cercles.findOneBy(
      ignoreId ? { nom, id: Not(ignoreId) } : { nom },
    );
    if (clash) {
      throw new UnprocessableEntityException({
        status: 'error', message: 'Erreur de validation',
        errors: { nom: ['Ce nom est déjà utilisé.'] },
      });
    }
  }

  private async findOr404(id: number): Promise<Cercle> {
    const cercle = await this.cercles.findOneBy({ id });
    if (!cercle) throw new NotFoundException({ status: 'error', message: 'Cercle non trouvé' });
    return cercle;
  }

  async index(query: Record<string, any>, req: Request) {
    const { page, perPage } = parsePagination(query, 10);
    const { data, pagination, lastPage } = await paginateQb(
      this.cercles.createQueryBuilder('c'), page, perPage,
    );
    return success(data, undefined, {
      pagination: { ...pagination, ...paginationUrls(req, page, lastPage) },
    });
  }

  async store(dto: CreateCercleDto) {
    await this.assertUniqueNom(dto.nom);
    const cercle = await this.cercles.save({ ...dto });
    return success(cercle, 'Cercle créé avec succès');
  }

  async show(id: number) {
    return success(await this.findOr404(id));
  }

  async update(id: number, dto: UpdateCercleDto) {
    const cercle = await this.findOr404(id);
    if (dto.nom !== undefined) await this.assertUniqueNom(dto.nom, id);
    await this.cercles.update(id, { ...dto });
    return success(await this.findOr404(id), 'Cercle mis à jour avec succès');
  }

  async destroy(id: number) {
    await this.findOr404(id);
    await this.cercles.delete(id);
    return success(undefined, 'Cercle supprimé avec succès');
  }
}
```

`server-nest/src/cercles/cercles.controller.ts`:

```ts
import {
  Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query, Req,
} from '@nestjs/common';
import { Request } from 'express';
import { CerclesService } from './cercles.service';
import { CreateCercleDto } from './dto/create-cercle.dto';
import { UpdateCercleDto } from './dto/update-cercle.dto';

@Controller('cercles')
export class CerclesController {
  constructor(private readonly service: CerclesService) {}

  @Get()
  index(@Query() query: Record<string, any>, @Req() req: Request) {
    return this.service.index(query, req);
  }

  @Post()
  store(@Body() dto: CreateCercleDto) { return this.service.store(dto); }

  @Get(':id')
  show(@Param('id', ParseIntPipe) id: number) { return this.service.show(id); }

  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCercleDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  destroy(@Param('id', ParseIntPipe) id: number) { return this.service.destroy(id); }
}
```

`server-nest/src/cercles/cercles.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Cercle } from '../database/entities/cercle.entity';
import { CerclesController } from './cercles.controller';
import { CerclesService } from './cercles.service';

@Module({
  imports: [TypeOrmModule.forFeature([Cercle])],
  controllers: [CerclesController],
  providers: [CerclesService],
})
export class CerclesModule {}
```

Register `CerclesModule` in `app.module.ts`.

- [x] **Step 4: Run tests to verify they pass**

Run: `cd server-nest && npx jest --config test/jest-e2e.json cercles`
Expected: 3 passed.

- [x] **Step 5: Commit**

```bash
git add server-nest/src server-nest/test
git commit -m "feat(server-nest): cercles CRUD"
```

---

### Task 9: Events module (`/api/events`, pivot animateurs)

**Files:**
- Create: `server-nest/src/events/events.module.ts`, `events.controller.ts`, `events.service.ts`, `dto/create-event.dto.ts`, `dto/update-event.dto.ts`
- Modify: `server-nest/src/app.module.ts`
- Test: `server-nest/test/events.e2e-spec.ts`

Parity: store path is `POST /api/events/create-event` (non-standard, kept). Response embeds `animateurs` each with a Laravel-style `pivot` object. `status` not settable via API (defaults `brouillon`) — PHP behaved the same.

- [x] **Step 1: Write the failing test**

`server-nest/test/events.e2e-spec.ts`:

```ts
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { createTestApp } from './utils/create-test-app';
import { EventsModule } from '../src/events/events.module';
import { Praticien } from '../src/database/entities/praticien.entity';

describe('events', () => {
  let app: INestApplication;
  let praticienId: number;
  beforeAll(async () => {
    app = await createTestApp({ imports: [EventsModule] });
    const ds = app.get(DataSource);
    praticienId = (await ds.getRepository(Praticien).save({
      firstname: 'A', lastname: 'B', email: 'anim@aura.io', telephone: '06', ville: 'Paris',
      niveau: 'expert', specialite: 'yoga', mode: 'presentiel', status: 'actif',
      tarif: 50, experience: 3, bio: 'b'.repeat(60),
    })).id;
  });
  afterAll(async () => { await app.close(); });
  const http = () => request(app.getHttpServer());

  const payload = () => ({
    titre: 'Retraite', type: 'atelier', dates: ['2026-08-01', '2026-08-02'],
    lieu: 'Lyon', prix: 120, nombre_places: 20, description: 'desc',
    animateurs: [{ id: praticienId, role: 'chef' }],
  });

  it('POST /create-event stores event, attaches animateurs with pivot', async () => {
    const res = await http().post('/api/events/create-event').send(payload()).expect(201);
    expect(res.body.data.status).toBe('brouillon');
    expect(res.body.data.dates).toEqual(['2026-08-01', '2026-08-02']);
    expect(res.body.data.animateurs).toHaveLength(1);
    expect(res.body.data.animateurs[0].pivot).toMatchObject({ role: 'chef' });
  });

  it('store 422 on unknown animateur id', async () => {
    const res = await http().post('/api/events/create-event')
      .send({ ...payload(), animateurs: [{ id: 99999 }] }).expect(422);
    expect(res.body.errors['animateurs.0.id']).toBeDefined();
  });

  it('PUT /:id re-syncs animateurs; DELETE detaches then deletes', async () => {
    const created = await http().post('/api/events/create-event').send(payload()).expect(201);
    const id = created.body.data.id;
    const upd = await http().put(`/api/events/${id}`)
      .send({ titre: 'Retraite 2', animateurs: [{ id: praticienId }] }).expect(200);
    expect(upd.body.message).toBe('Événement mis à jour avec succès');
    expect(upd.body.data.animateurs[0].pivot.role).toBe('animateur');
    await http().delete(`/api/events/${id}`).expect(200);
    const nf = await http().get(`/api/events/${id}`).expect(404);
    expect(nf.body.message).toBe('Événement non trouvé');
  });

  it('GET / paginates', async () => {
    const res = await http().get('/api/events').expect(200);
    expect(res.body.pagination).toHaveProperty('total');
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `cd server-nest && npx jest --config test/jest-e2e.json events`
Expected: FAIL.

- [x] **Step 3: Implement**

`server-nest/src/events/dto/create-event.dto.ts`:

```ts
import { Type } from 'class-transformer';
import {
  ArrayMinSize, IsArray, IsDateString, IsInt, IsNumber, IsOptional, IsString,
  MaxLength, ValidateNested,
} from 'class-validator';

export class EventAnimateurDto {
  @IsInt() id: number;
  @IsOptional() @IsString() role?: string;
}

export class CreateEventDto {
  @IsString() @MaxLength(255) titre: string;
  @IsString() type: string;
  @IsArray() @ArrayMinSize(1) @IsDateString({}, { each: true }) dates: string[];
  @IsString() lieu: string;
  @Type(() => Number) @IsNumber() prix: number;
  @Type(() => Number) @IsInt() nombre_places: number;
  @IsString() description: string;
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => EventAnimateurDto)
  animateurs?: EventAnimateurDto[];
}
```

`server-nest/src/events/dto/update-event.dto.ts`:

```ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateEventDto } from './create-event.dto';

export class UpdateEventDto extends PartialType(CreateEventDto) {}
```

`server-nest/src/events/events.service.ts`:

```ts
import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Request } from 'express';
import { Event } from '../database/entities/event.entity';
import { EventPraticien } from '../database/entities/event-praticien.entity';
import { Praticien } from '../database/entities/praticien.entity';
import { success } from '../common/envelope';
import { parsePagination, paginateQb, paginationUrls } from '../common/pagination';
import { CreateEventDto, EventAnimateurDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(Event) private readonly events: Repository<Event>,
    @InjectRepository(EventPraticien) private readonly links: Repository<EventPraticien>,
    @InjectRepository(Praticien) private readonly praticiens: Repository<Praticien>,
  ) {}

  private async findOr404(id: number): Promise<Event> {
    const event = await this.events.findOneBy({ id });
    if (!event) throw new NotFoundException({ status: 'error', message: 'Événement non trouvé' });
    return event;
  }

  private async assertAnimateursExist(animateurs: EventAnimateurDto[]) {
    const ids = animateurs.map((a) => a.id);
    const found = await this.praticiens.findBy({ id: In(ids) });
    const foundIds = new Set(found.map((p) => p.id));
    const errors: Record<string, string[]> = {};
    animateurs.forEach((a, i) => {
      if (!foundIds.has(a.id)) errors[`animateurs.${i}.id`] = ['Le praticien sélectionné est invalide.'];
    });
    if (Object.keys(errors).length) {
      throw new UnprocessableEntityException({
        status: 'error', message: 'Erreur de validation', errors,
      });
    }
  }

  // Laravel serializes belongsToMany as praticien objects carrying a `pivot` key
  private async withAnimateurs(event: Event) {
    const links = await this.links.find({
      where: { event_id: event.id }, relations: { praticien: true },
    });
    return {
      ...event,
      animateurs: links.map((l) => ({
        ...l.praticien,
        pivot: {
          event_id: l.event_id, praticien_id: l.praticien_id, role: l.role,
          created_at: l.created_at, updated_at: l.updated_at,
        },
      })),
    };
  }

  private async syncAnimateurs(eventId: number, animateurs: EventAnimateurDto[]) {
    await this.links.delete({ event_id: eventId });
    for (const a of animateurs) {
      await this.links.save({ event_id: eventId, praticien_id: a.id, role: a.role ?? 'animateur' });
    }
  }

  async index(query: Record<string, any>, req: Request) {
    const { page, perPage } = parsePagination(query, 10);
    const { data, pagination, lastPage } = await paginateQb(
      this.events.createQueryBuilder('e'), page, perPage,
    );
    return success(data, undefined, {
      pagination: { ...pagination, ...paginationUrls(req, page, lastPage) },
    });
  }

  async store(dto: CreateEventDto) {
    if (dto.animateurs?.length) await this.assertAnimateursExist(dto.animateurs);
    const { animateurs, ...fields } = dto;
    const event = await this.events.save({ ...fields });
    if (animateurs?.length) await this.syncAnimateurs(event.id, animateurs);
    return success(await this.withAnimateurs(event));
  }

  async show(id: number) {
    const event = await this.findOr404(id);
    return success(await this.withAnimateurs(event));
  }

  async update(id: number, dto: UpdateEventDto) {
    const event = await this.findOr404(id);
    if (dto.animateurs?.length) await this.assertAnimateursExist(dto.animateurs);
    const { animateurs, ...fields } = dto;
    if (Object.keys(fields).length) await this.events.update(id, fields);
    if (animateurs !== undefined) await this.syncAnimateurs(id, animateurs ?? []);
    return success(
      await this.withAnimateurs(await this.findOr404(id)),
      'Événement mis à jour avec succès',
    );
  }

  async destroy(id: number) {
    await this.findOr404(id);
    await this.links.delete({ event_id: id });
    await this.events.delete(id);
    return success(undefined, 'Événement supprimé avec succès');
  }
}
```

`server-nest/src/events/events.controller.ts`:

```ts
import {
  Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query, Req,
} from '@nestjs/common';
import { Request } from 'express';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';

@Controller('events')
export class EventsController {
  constructor(private readonly service: EventsService) {}

  @Get()
  index(@Query() query: Record<string, any>, @Req() req: Request) {
    return this.service.index(query, req);
  }

  @Post('create-event')
  store(@Body() dto: CreateEventDto) { return this.service.store(dto); }

  @Get(':id')
  show(@Param('id', ParseIntPipe) id: number) { return this.service.show(id); }

  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateEventDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  destroy(@Param('id', ParseIntPipe) id: number) { return this.service.destroy(id); }
}
```

`server-nest/src/events/events.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Event } from '../database/entities/event.entity';
import { EventPraticien } from '../database/entities/event-praticien.entity';
import { Praticien } from '../database/entities/praticien.entity';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';

@Module({
  imports: [TypeOrmModule.forFeature([Event, EventPraticien, Praticien])],
  controllers: [EventsController],
  providers: [EventsService],
})
export class EventsModule {}
```

Register `EventsModule` in `app.module.ts`.

- [x] **Step 4: Run tests to verify they pass**

Run: `cd server-nest && npx jest --config test/jest-e2e.json events`
Expected: 4 passed.

- [x] **Step 5: Commit**

```bash
git add server-nest/src server-nest/test
git commit -m "feat(server-nest): events CRUD with animateurs pivot"
```

---

### Task 10: Promotions module (`/api/promotions`)

**Files:**
- Create: `server-nest/src/promotions/promotions.module.ts`, `promotions.controller.ts`, `promotions.service.ts`, `dto/create-promotion.dto.ts`, `dto/update-promotion.dto.ts`
- Modify: `server-nest/src/app.module.ts`
- Test: `server-nest/test/promotions.e2e-spec.ts`

- [x] **Step 1: Write the failing test**

`server-nest/test/promotions.e2e-spec.ts`:

```ts
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createTestApp } from './utils/create-test-app';
import { PromotionsModule } from '../src/promotions/promotions.module';

const future = () => {
  const d = new Date(); d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
};

describe('promotions', () => {
  let app: INestApplication;
  beforeAll(async () => { app = await createTestApp({ imports: [PromotionsModule] }); });
  afterAll(async () => { await app.close(); });
  const http = () => request(app.getHttpServer());

  it('POST / validates code unique, type in-list, date after today', async () => {
    await http().post('/api/promotions')
      .send({ code: 'ETE10', type: 'pourcentage', valeur: 10, date_expiration: future() })
      .expect(201);
    const dup = await http().post('/api/promotions')
      .send({ code: 'ETE10', type: 'fixe', valeur: 5, date_expiration: future() }).expect(422);
    expect(dup.body.errors.code).toBeDefined();
    const past = await http().post('/api/promotions')
      .send({ code: 'OLD', type: 'fixe', valeur: 5, date_expiration: '2020-01-01' }).expect(422);
    expect(past.body.errors.date_expiration).toBeDefined();
    const badType = await http().post('/api/promotions')
      .send({ code: 'X', type: 'autre', valeur: 5, date_expiration: future() }).expect(422);
    expect(badType.body.errors.type).toBeDefined();
  });

  it('GET/PUT/DELETE lifecycle with French messages', async () => {
    const created = await http().post('/api/promotions')
      .send({ code: 'NOEL', type: 'fixe', valeur: 15, date_expiration: future() }).expect(201);
    const id = created.body.data.id;
    await http().get(`/api/promotions/${id}`).expect(200);
    const upd = await http().put(`/api/promotions/${id}`).send({ valeur: 20 }).expect(200);
    expect(upd.body.message).toBe('Promotion mise à jour avec succès');
    await http().delete(`/api/promotions/${id}`).expect(200);
    const nf = await http().get(`/api/promotions/${id}`).expect(404);
    expect(nf.body.message).toBe('Promotion non trouvée');
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `cd server-nest && npx jest --config test/jest-e2e.json promotions`
Expected: FAIL.

- [x] **Step 3: Implement**

`server-nest/src/promotions/dto/create-promotion.dto.ts`:

```ts
import { Type } from 'class-transformer';
import { IsDateString, IsIn, IsNumber, IsString, MaxLength, Min } from 'class-validator';

export class CreatePromotionDto {
  @IsString() @MaxLength(50) code: string;
  @IsIn(['pourcentage', 'fixe']) type: string;
  @Type(() => Number) @IsNumber() @Min(0) valeur: number;
  @IsDateString() date_expiration: string;
}
```

`server-nest/src/promotions/dto/update-promotion.dto.ts`:

```ts
import { PartialType } from '@nestjs/mapped-types';
import { CreatePromotionDto } from './create-promotion.dto';

export class UpdatePromotionDto extends PartialType(CreatePromotionDto) {}
```

`server-nest/src/promotions/promotions.service.ts`:

```ts
import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { Request } from 'express';
import { Promotion } from '../database/entities/promotion.entity';
import { success } from '../common/envelope';
import { isStrictlyAfterToday } from '../common/format';
import { parsePagination, paginateQb, paginationUrls } from '../common/pagination';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';

@Injectable()
export class PromotionsService {
  constructor(@InjectRepository(Promotion) private readonly promotions: Repository<Promotion>) {}

  private validationError(errors: Record<string, string[]>): never {
    throw new UnprocessableEntityException({
      status: 'error', message: 'Erreur de validation', errors,
    });
  }

  private async findOr404(id: number): Promise<Promotion> {
    const promo = await this.promotions.findOneBy({ id });
    if (!promo) throw new NotFoundException({ status: 'error', message: 'Promotion non trouvée' });
    return promo;
  }

  private assertFuture(dateExpiration: string) {
    // Laravel 'after:today' — timezone-safe calendar-date comparison, shared
    // via src/common/format.ts so other tasks (e.g. Echanges' `delai_souhaite`)
    // reuse the same logic instead of re-deriving it.
    if (!isStrictlyAfterToday(dateExpiration)) {
      this.validationError({ date_expiration: ["La date d'expiration doit être postérieure à aujourd'hui."] });
    }
  }

  private async assertUniqueCode(code: string, ignoreId?: number) {
    const clash = await this.promotions.findOneBy(
      ignoreId ? { code, id: Not(ignoreId) } : { code },
    );
    if (clash) this.validationError({ code: ['Ce code est déjà utilisé.'] });
  }

  async index(query: Record<string, any>, req: Request) {
    const { page, perPage } = parsePagination(query, 10);
    const { data, pagination, lastPage } = await paginateQb(
      this.promotions.createQueryBuilder('p'), page, perPage,
    );
    return success(data, undefined, {
      pagination: { ...pagination, ...paginationUrls(req, page, lastPage) },
    });
  }

  async store(dto: CreatePromotionDto) {
    await this.assertUniqueCode(dto.code);
    this.assertFuture(dto.date_expiration);
    const promo = await this.promotions.save({ ...dto });
    return success(promo, 'Promotion créée avec succès');
  }

  async show(id: number) {
    return success(await this.findOr404(id));
  }

  async update(id: number, dto: UpdatePromotionDto) {
    await this.findOr404(id);
    if (dto.code !== undefined) await this.assertUniqueCode(dto.code, id);
    if (dto.date_expiration !== undefined) this.assertFuture(dto.date_expiration);
    await this.promotions.update(id, { ...dto });
    return success(await this.findOr404(id), 'Promotion mise à jour avec succès');
  }

  async destroy(id: number) {
    await this.findOr404(id);
    await this.promotions.delete(id);
    return success(undefined, 'Promotion supprimée avec succès');
  }
}
```

`server-nest/src/promotions/promotions.controller.ts`:

```ts
import {
  Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query, Req,
} from '@nestjs/common';
import { Request } from 'express';
import { PromotionsService } from './promotions.service';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';

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

`server-nest/src/promotions/promotions.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Promotion } from '../database/entities/promotion.entity';
import { PromotionsController } from './promotions.controller';
import { PromotionsService } from './promotions.service';

@Module({
  imports: [TypeOrmModule.forFeature([Promotion])],
  controllers: [PromotionsController],
  providers: [PromotionsService],
})
export class PromotionsModule {}
```

Register `PromotionsModule` in `app.module.ts`.

- [x] **Step 4: Run tests to verify they pass**

Run: `cd server-nest && npx jest --config test/jest-e2e.json promotions`
Expected: 2 passed.

- [x] **Step 5: Commit**

```bash
git add server-nest/src server-nest/test
git commit -m "feat(server-nest): promotions CRUD"
```

---

### Task 11: Disciplines module (`/api/disciplines`)

**Files:**
- Create: `server-nest/src/common/slug.ts`
- Create: `server-nest/src/disciplines/disciplines.module.ts`, `disciplines.controller.ts`, `disciplines.service.ts`, `dto/create-discipline.dto.ts`, `dto/update-discipline.dto.ts`
- Modify: `server-nest/src/app.module.ts`
- Test: `server-nest/test/disciplines.e2e-spec.ts`

Parity: store path `POST /api/disciplines/create-discipline`; index returns ALL rows (no pagination); slug generated from `nom` (`Str::slug` equivalent).

- [ ] **Step 1: Write the failing test**

`server-nest/test/disciplines.e2e-spec.ts`:

```ts
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createTestApp } from './utils/create-test-app';
import { DisciplinesModule } from '../src/disciplines/disciplines.module';

describe('disciplines', () => {
  let app: INestApplication;
  beforeAll(async () => { app = await createTestApp({ imports: [DisciplinesModule] }); });
  afterAll(async () => { await app.close(); });
  const http = () => request(app.getHttpServer());

  it('POST /create-discipline slugifies nom (accents stripped)', async () => {
    const res = await http().post('/api/disciplines/create-discipline')
      .send({ nom: 'Méditation Guidée', tonalite: 'calme', glyphe: 'G', accroche: 'a' })
      .expect(201);
    expect(res.body.data.slug).toBe('meditation-guidee');
    expect(res.body.message).toBe('Discipline créée avec succès');
    const dup = await http().post('/api/disciplines/create-discipline')
      .send({ nom: 'Méditation Guidée', tonalite: 't', glyphe: 'g', accroche: 'a' }).expect(422);
    expect(dup.body.errors.nom).toBeDefined();
  });

  it('index returns all without pagination envelope', async () => {
    const res = await http().get('/api/disciplines').expect(200);
    expect(res.body.message).toBe('Disciplines récupérées avec succès');
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.pagination).toBeUndefined();
  });

  it('update regenerates slug when nom changes; 404 envelope', async () => {
    const created = await http().post('/api/disciplines/create-discipline')
      .send({ nom: 'Yoga', tonalite: 't', glyphe: 'g', accroche: 'a' }).expect(201);
    const id = created.body.data.id;
    const upd = await http().put(`/api/disciplines/${id}`).send({ nom: 'Yoga Doux' }).expect(200);
    expect(upd.body.data.slug).toBe('yoga-doux');
    await http().delete(`/api/disciplines/${id}`).expect(200);
    const nf = await http().put(`/api/disciplines/${id}`).send({ nom: 'X' }).expect(404);
    expect(nf.body.message).toBe('Discipline non trouvée');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server-nest && npx jest --config test/jest-e2e.json disciplines`
Expected: FAIL.

- [ ] **Step 3: Implement**

`server-nest/src/common/slug.ts`:

```ts
// Equivalent of Laravel Str::slug for this codebase's usage
export function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
```

`server-nest/src/disciplines/dto/create-discipline.dto.ts`:

```ts
import { IsString, MaxLength } from 'class-validator';

export class CreateDisciplineDto {
  @IsString() @MaxLength(255) nom: string;
  @IsString() @MaxLength(255) tonalite: string;
  @IsString() @MaxLength(255) glyphe: string;
  @IsString() @MaxLength(255) accroche: string;
}
```

`server-nest/src/disciplines/dto/update-discipline.dto.ts`:

```ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateDisciplineDto } from './create-discipline.dto';

export class UpdateDisciplineDto extends PartialType(CreateDisciplineDto) {}
```

`server-nest/src/disciplines/disciplines.service.ts`:

```ts
import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { Discipline } from '../database/entities/discipline.entity';
import { success } from '../common/envelope';
import { slugify } from '../common/slug';
import { CreateDisciplineDto } from './dto/create-discipline.dto';
import { UpdateDisciplineDto } from './dto/update-discipline.dto';

@Injectable()
export class DisciplinesService {
  constructor(@InjectRepository(Discipline) private readonly disciplines: Repository<Discipline>) {}

  private async findOr404(id: number): Promise<Discipline> {
    const d = await this.disciplines.findOneBy({ id });
    if (!d) throw new NotFoundException({ status: 'error', message: 'Discipline non trouvée' });
    return d;
  }

  private async assertUniqueNom(nom: string, ignoreId?: number) {
    const clash = await this.disciplines.findOneBy(
      ignoreId ? { nom, id: Not(ignoreId) } : { nom },
    );
    if (clash) {
      throw new UnprocessableEntityException({
        status: 'error', message: 'Erreur de validation',
        errors: { nom: ['Ce nom est déjà utilisé.'] },
      });
    }
  }

  async index() {
    return success(await this.disciplines.find(), 'Disciplines récupérées avec succès');
  }

  async store(dto: CreateDisciplineDto) {
    await this.assertUniqueNom(dto.nom);
    const d = await this.disciplines.save({ ...dto, slug: slugify(dto.nom) });
    return success(d, 'Discipline créée avec succès');
  }

  async show(id: number) {
    return success(await this.findOr404(id), 'Discipline récupérée avec succès');
  }

  async update(id: number, dto: UpdateDisciplineDto) {
    await this.findOr404(id);
    if (dto.nom !== undefined) await this.assertUniqueNom(dto.nom, id);
    const patch: Record<string, unknown> = { ...dto };
    if (dto.nom !== undefined) patch.slug = slugify(dto.nom);
    await this.disciplines.update(id, patch);
    return success(await this.findOr404(id), 'Discipline mise à jour avec succès');
  }

  async destroy(id: number) {
    await this.findOr404(id);
    await this.disciplines.delete(id);
    return success(undefined, 'Discipline supprimée avec succès');
  }
}
```

`server-nest/src/disciplines/disciplines.controller.ts`:

```ts
import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put } from '@nestjs/common';
import { DisciplinesService } from './disciplines.service';
import { CreateDisciplineDto } from './dto/create-discipline.dto';
import { UpdateDisciplineDto } from './dto/update-discipline.dto';

@Controller('disciplines')
export class DisciplinesController {
  constructor(private readonly service: DisciplinesService) {}

  @Get()
  index() { return this.service.index(); }

  @Post('create-discipline')
  store(@Body() dto: CreateDisciplineDto) { return this.service.store(dto); }

  @Get(':id')
  show(@Param('id', ParseIntPipe) id: number) { return this.service.show(id); }

  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateDisciplineDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  destroy(@Param('id', ParseIntPipe) id: number) { return this.service.destroy(id); }
}
```

`server-nest/src/disciplines/disciplines.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Discipline } from '../database/entities/discipline.entity';
import { DisciplinesController } from './disciplines.controller';
import { DisciplinesService } from './disciplines.service';

@Module({
  imports: [TypeOrmModule.forFeature([Discipline])],
  controllers: [DisciplinesController],
  providers: [DisciplinesService],
})
export class DisciplinesModule {}
```

Register `DisciplinesModule` in `app.module.ts`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd server-nest && npx jest --config test/jest-e2e.json disciplines`
Expected: 3 passed.

- [ ] **Step 5: Commit**

```bash
git add server-nest/src server-nest/test
git commit -m "feat(server-nest): disciplines CRUD with slug generation"
```

---

### Task 12: Clients + Praticiens index modules (`/api/clients`, `/api/praticiens`)

**Files:**
- Create: `server-nest/src/clients/clients.module.ts`, `clients.controller.ts`
- Create: `server-nest/src/praticiens/praticiens.module.ts`, `praticiens.controller.ts`
- Modify: `server-nest/src/app.module.ts`
- Test: `server-nest/test/listing.e2e-spec.ts`

These are single-endpoint listing controllers — thin enough to skip a service class.

- [ ] **Step 1: Write the failing test**

`server-nest/test/listing.e2e-spec.ts`:

```ts
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { createTestApp } from './utils/create-test-app';
import { ClientsModule } from '../src/clients/clients.module';
import { PraticiensModule } from '../src/praticiens/praticiens.module';
import { Client } from '../src/database/entities/client.entity';
import { Praticien } from '../src/database/entities/praticien.entity';

describe('clients + praticiens listing', () => {
  let app: INestApplication;
  beforeAll(async () => {
    app = await createTestApp({ imports: [ClientsModule, PraticiensModule] });
    const ds = app.get(DataSource);
    await ds.getRepository(Client).save([
      { firstname: 'C1', lastname: 'L', email: 'c1@x.io', city: 'Paris' },
      { firstname: 'C2', lastname: 'L', email: 'c2@x.io', city: 'Lyon' },
    ]);
    await ds.getRepository(Praticien).save({
      firstname: 'P', lastname: 'L', email: 'p@x.io', telephone: '06', ville: 'Nice',
      niveau: 'n', specialite: 's', mode: 'm', status: 'actif',
      tarif: 10, experience: 1, bio: 'b'.repeat(60),
    });
  });
  afterAll(async () => { await app.close(); });
  const http = () => request(app.getHttpServer());

  it('GET /api/clients paginates with default per_page 10', async () => {
    const res = await http().get('/api/clients?per_page=1&page=2').expect(200);
    expect(res.body.pagination).toMatchObject({ current_page: 2, per_page: 1, total: 2 });
    expect(res.body.data).toHaveLength(1);
  });

  it('GET /api/praticiens paginates', async () => {
    const res = await http().get('/api/praticiens').expect(200);
    expect(res.body.pagination.total).toBe(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server-nest && npx jest --config test/jest-e2e.json listing`
Expected: FAIL.

- [ ] **Step 3: Implement**

`server-nest/src/clients/clients.controller.ts`:

```ts
import { Controller, Get, Query, Req } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Request } from 'express';
import { Client } from '../database/entities/client.entity';
import { success } from '../common/envelope';
import { parsePagination, paginateQb, paginationUrls } from '../common/pagination';

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

`server-nest/src/clients/clients.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Client } from '../database/entities/client.entity';
import { ClientsController } from './clients.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Client])],
  controllers: [ClientsController],
})
export class ClientsModule {}
```

`server-nest/src/praticiens/praticiens.controller.ts`:

```ts
import { Controller, Get, Query, Req } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Request } from 'express';
import { Praticien } from '../database/entities/praticien.entity';
import { success } from '../common/envelope';
import { parsePagination, paginateQb, paginationUrls } from '../common/pagination';

@Controller('praticiens')
export class PraticiensController {
  constructor(@InjectRepository(Praticien) private readonly praticiens: Repository<Praticien>) {}

  @Get()
  async index(@Query() query: Record<string, any>, @Req() req: Request) {
    const { page, perPage } = parsePagination(query, 10);
    const { data, pagination, lastPage } = await paginateQb(
      this.praticiens.createQueryBuilder('p'), page, perPage,
    );
    return success(data, undefined, {
      pagination: { ...pagination, ...paginationUrls(req, page, lastPage) },
    });
  }
}
```

`server-nest/src/praticiens/praticiens.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Praticien } from '../database/entities/praticien.entity';
import { PraticiensController } from './praticiens.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Praticien])],
  controllers: [PraticiensController],
})
export class PraticiensModule {}
```

Register both modules in `app.module.ts`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd server-nest && npx jest --config test/jest-e2e.json listing`
Expected: 2 passed.

- [ ] **Step 5: Commit**

```bash
git add server-nest/src server-nest/test
git commit -m "feat(server-nest): clients and praticiens listing endpoints"
```

---
### Task 13: Articles module (`/api/articles`)

**Files:**
- Create: `server-nest/src/articles/articles.module.ts`, `articles.controller.ts`, `articles.service.ts`, `dto/create-article.dto.ts`, `dto/update-article.dto.ts`
- Modify: `server-nest/src/app.module.ts`
- Test: `server-nest/test/articles.e2e-spec.ts`

Parity: store path `POST /api/articles/create-article`. Publish/archive get distinct routes (D5). No `incrementViews`, no `auteur_id` (D8).

- [ ] **Step 1: Write the failing test**

`server-nest/test/articles.e2e-spec.ts`:

```ts
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createTestApp } from './utils/create-test-app';
import { ArticlesModule } from '../src/articles/articles.module';

const base = {
  titre: 'Mon Article Zen', categorie: 'bien-etre', tonalite: 'calme',
  extrait: 'extrait', corps: 'corps long', status: 'brouillon',
  auteur: 'Alice', temps_lecture: 4,
};

describe('articles', () => {
  let app: INestApplication;
  beforeAll(async () => { app = await createTestApp({ imports: [ArticlesModule] }); });
  afterAll(async () => { await app.close(); });
  const http = () => request(app.getHttpServer());

  it('store slugifies titre and suffixes duplicates', async () => {
    const a = await http().post('/api/articles/create-article').send(base).expect(201);
    expect(a.body.data.slug).toBe('mon-article-zen');
    const b = await http().post('/api/articles/create-article').send(base).expect(201);
    expect(b.body.data.slug).toMatch(/^mon-article-zen-/);
    const bad = await http().post('/api/articles/create-article')
      .send({ ...base, status: 'invalide' }).expect(422);
    expect(bad.body.errors.status).toBeDefined();
  });

  it('index filters by status and categorie', async () => {
    await http().post('/api/articles/create-article')
      .send({ ...base, titre: 'Autre', status: 'en_revue', categorie: 'sante' }).expect(201);
    const res = await http().get('/api/articles?status=en_revue&categorie=sante').expect(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.pagination).toHaveProperty('next_page_url');
  });

  it('update regenerates slug on titre change; publish/archive transitions', async () => {
    const created = await http().post('/api/articles/create-article')
      .send({ ...base, titre: 'Titre Original' }).expect(201);
    const id = created.body.data.id;

    const upd = await http().put(`/api/articles/${id}`).send({ titre: 'Titre Modifié' }).expect(200);
    expect(upd.body.data.slug).toBe('titre-modifie');

    const pub = await http().put(`/api/articles/${id}/publish`).expect(200);
    expect(pub.body.message).toBe('Article publié avec succès');
    expect(pub.body.data.status).toBe('publié');
    expect(pub.body.data.date_publication).toBeTruthy();

    const arc = await http().put(`/api/articles/${id}/archive`).expect(200);
    expect(arc.body.data.status).toBe('archivé');

    await http().delete(`/api/articles/${id}`).expect(200);
    const nf = await http().get(`/api/articles/${id}`).expect(404);
    expect(nf.body.message).toBe('Article non trouvé');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server-nest && npx jest --config test/jest-e2e.json articles`
Expected: FAIL.

- [ ] **Step 3: Implement**

`server-nest/src/articles/dto/create-article.dto.ts`:

```ts
import { Type } from 'class-transformer';
import {
  IsDateString, IsIn, IsInt, IsOptional, IsString, MaxLength, Min,
} from 'class-validator';

export class CreateArticleDto {
  @IsString() @MaxLength(255) titre: string;
  @IsString() @MaxLength(100) categorie: string;
  @IsString() @MaxLength(50) tonalite: string;
  @IsString() @MaxLength(500) extrait: string;
  @IsString() corps: string;
  @IsIn(['brouillon', 'en_revue', 'publié', 'archivé']) status: string;
  @IsString() @MaxLength(255) auteur: string;
  @Type(() => Number) @IsInt() @Min(1) temps_lecture: number;
  @IsOptional() @IsString() @MaxLength(255) image_couverture?: string;
  @IsOptional() @IsString() @MaxLength(255) meta_description?: string;
  @IsOptional() @IsString() @MaxLength(255) mot_clef?: string;
  @IsOptional() @IsDateString() date_publication?: string;
}
```

`server-nest/src/articles/dto/update-article.dto.ts`:

```ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateArticleDto } from './create-article.dto';

export class UpdateArticleDto extends PartialType(CreateArticleDto) {}
```

`server-nest/src/articles/articles.service.ts`:

```ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { Request } from 'express';
import { Article } from '../database/entities/article.entity';
import { success } from '../common/envelope';
import { parsePagination, paginateQb, paginationUrls } from '../common/pagination';
import { slugify } from '../common/slug';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';

@Injectable()
export class ArticlesService {
  constructor(@InjectRepository(Article) private readonly articles: Repository<Article>) {}

  private async findOr404(id: number): Promise<Article> {
    const article = await this.articles.findOneBy({ id });
    if (!article) throw new NotFoundException({ status: 'error', message: 'Article non trouvé' });
    return article;
  }

  // PHP: Str::slug + '-' . uniqid() on collision
  private async uniqueSlug(titre: string, ignoreId?: number): Promise<string> {
    const slug = slugify(titre);
    const clash = await this.articles.findOneBy(
      ignoreId ? { slug, id: Not(ignoreId) } : { slug },
    );
    return clash ? `${slug}-${Date.now().toString(36)}` : slug;
  }

  async index(query: Record<string, any>, req: Request) {
    const { page, perPage } = parsePagination(query, 10);
    const qb = this.articles.createQueryBuilder('a');
    if (query.status !== undefined) qb.andWhere('a.status = :status', { status: query.status });
    if (query.categorie !== undefined) qb.andWhere('a.categorie = :cat', { cat: query.categorie });
    qb.orderBy('a.created_at', 'DESC');
    const { data, pagination, lastPage } = await paginateQb(qb, page, perPage);
    return success(data, undefined, {
      pagination: { ...pagination, ...paginationUrls(req, page, lastPage) },
    });
  }

  async store(dto: CreateArticleDto) {
    const article = await this.articles.save({
      ...dto,
      date_publication: dto.date_publication ? new Date(dto.date_publication) : null,
      slug: await this.uniqueSlug(dto.titre),
    });
    return success(article, 'Article créé avec succès');
  }

  async show(id: number) {
    return success(await this.findOr404(id));
  }

  async update(id: number, dto: UpdateArticleDto) {
    const article = await this.findOr404(id);
    const patch: Record<string, unknown> = { ...dto };
    if (dto.date_publication !== undefined) {
      patch.date_publication = dto.date_publication ? new Date(dto.date_publication) : null;
    }
    if (dto.titre !== undefined && dto.titre !== article.titre) {
      patch.slug = await this.uniqueSlug(dto.titre, id);
    }
    await this.articles.update(id, patch);
    return success(await this.findOr404(id), 'Article mis à jour avec succès');
  }

  async publish(id: number) {
    await this.findOr404(id);
    await this.articles.update(id, { status: 'publié', date_publication: new Date() });
    return success(await this.findOr404(id), 'Article publié avec succès');
  }

  async archive(id: number) {
    await this.findOr404(id);
    await this.articles.update(id, { status: 'archivé' });
    return success(await this.findOr404(id), 'Article archivé avec succès');
  }

  async destroy(id: number) {
    await this.findOr404(id);
    await this.articles.delete(id);
    return success(undefined, 'Article supprimé avec succès');
  }
}
```

`server-nest/src/articles/articles.controller.ts`:

```ts
import {
  Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query, Req,
} from '@nestjs/common';
import { Request } from 'express';
import { ArticlesService } from './articles.service';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';

@Controller('articles')
export class ArticlesController {
  constructor(private readonly service: ArticlesService) {}

  @Get()
  index(@Query() query: Record<string, any>, @Req() req: Request) {
    return this.service.index(query, req);
  }

  @Post('create-article')
  store(@Body() dto: CreateArticleDto) { return this.service.store(dto); }

  @Get(':id')
  show(@Param('id', ParseIntPipe) id: number) { return this.service.show(id); }

  @Put(':id/publish')
  publish(@Param('id', ParseIntPipe) id: number) { return this.service.publish(id); }

  @Put(':id/archive')
  archive(@Param('id', ParseIntPipe) id: number) { return this.service.archive(id); }

  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateArticleDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  destroy(@Param('id', ParseIntPipe) id: number) { return this.service.destroy(id); }
}
```

`server-nest/src/articles/articles.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Article } from '../database/entities/article.entity';
import { ArticlesController } from './articles.controller';
import { ArticlesService } from './articles.service';

@Module({
  imports: [TypeOrmModule.forFeature([Article])],
  controllers: [ArticlesController],
  providers: [ArticlesService],
})
export class ArticlesModule {}
```

Register `ArticlesModule` in `app.module.ts`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd server-nest && npx jest --config test/jest-e2e.json articles`
Expected: 3 passed.

- [ ] **Step 5: Commit**

```bash
git add server-nest/src server-nest/test
git commit -m "feat(server-nest): articles CRUD with slug generation and publish/archive"
```

---

### Task 14: Notifications module (`/api/notifications`)

**Files:**
- Create: `server-nest/src/notifications/notifications.module.ts`, `notifications.controller.ts`, `notifications.service.ts`, `dto/create-notification.dto.ts`, `dto/update-notification.dto.ts`
- Modify: `server-nest/src/app.module.ts`
- Test: `server-nest/test/notifications.e2e-spec.ts`

- [ ] **Step 1: Write the failing test**

`server-nest/test/notifications.e2e-spec.ts`:

```ts
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createTestApp } from './utils/create-test-app';
import { NotificationsModule } from '../src/notifications/notifications.module';

describe('notifications', () => {
  let app: INestApplication;
  beforeAll(async () => { app = await createTestApp({ imports: [NotificationsModule] }); });
  afterAll(async () => { await app.close(); });
  const http = () => request(app.getHttpServer());

  it('CRUD lifecycle with filters and search', async () => {
    const created = await http().post('/api/notifications').send({
      audience: 'clients', canal: 'email', titre: 'Promo été', message: 'Contenu promo',
    }).expect(201);
    expect(created.body.message).toBe('Notification créée avec succès');
    const id = created.body.data.id;

    await http().post('/api/notifications').send({
      audience: 'praticiens', canal: 'sms', titre: 'Rappel', message: 'Autre contenu',
    }).expect(201);

    const filtered = await http().get('/api/notifications?audience=clients').expect(200);
    expect(filtered.body.data).toHaveLength(1);
    const searched = await http().get('/api/notifications?search=promo').expect(200);
    expect(searched.body.data).toHaveLength(1);

    const upd = await http().put(`/api/notifications/${id}`).send({ titre: 'Promo hiver' }).expect(200);
    expect(upd.body.message).toBe('Notification mise à jour avec succès');
    await http().delete(`/api/notifications/${id}`).expect(200);
    const nf = await http().get(`/api/notifications/${id}`).expect(404);
    expect(nf.body.message).toBe('Notification non trouvée');
  });

  it('store validates required fields', async () => {
    const res = await http().post('/api/notifications').send({ audience: 'x' }).expect(422);
    expect(res.body.errors.canal).toBeDefined();
    expect(res.body.errors.titre).toBeDefined();
    expect(res.body.errors.message).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server-nest && npx jest --config test/jest-e2e.json notifications`
Expected: FAIL.

- [ ] **Step 3: Implement**

`server-nest/src/notifications/dto/create-notification.dto.ts`:

```ts
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateNotificationDto {
  @IsString() @MaxLength(255) audience: string;
  @IsString() @MaxLength(255) canal: string;
  @IsString() @MaxLength(255) titre: string;
  @IsOptional() @IsString() @MaxLength(255) status?: string;
  @IsString() message: string;
}
```

`server-nest/src/notifications/dto/update-notification.dto.ts`:

```ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateNotificationDto } from './create-notification.dto';

export class UpdateNotificationDto extends PartialType(CreateNotificationDto) {}
```

`server-nest/src/notifications/notifications.service.ts`:

```ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from '../database/entities/notification.entity';
import { success } from '../common/envelope';
import { parsePagination, paginateQb } from '../common/pagination';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification) private readonly notifications: Repository<Notification>,
  ) {}

  private async findOr404(id: number): Promise<Notification> {
    const n = await this.notifications.findOneBy({ id });
    if (!n) throw new NotFoundException({ status: 'error', message: 'Notification non trouvée' });
    return n;
  }

  async index(query: Record<string, any>) {
    const { page, perPage } = parsePagination(query, 15);
    const qb = this.notifications.createQueryBuilder('n');
    if (query.audience !== undefined) qb.andWhere('n.audience = :a', { a: query.audience });
    if (query.canal !== undefined) qb.andWhere('n.canal = :c', { c: query.canal });
    if (query.status !== undefined) qb.andWhere('n.status = :s', { s: query.status });
    if (query.search !== undefined) {
      qb.andWhere('(n.titre LIKE :q OR n.message LIKE :q)', { q: `%${query.search}%` });
    }
    qb.orderBy('n.created_at', 'DESC');
    const { data, pagination } = await paginateQb(qb, page, perPage);
    return success(data, undefined, { pagination });
  }

  async store(dto: CreateNotificationDto) {
    const n = await this.notifications.save({ ...dto });
    return success(n, 'Notification créée avec succès');
  }

  async show(id: number) {
    return success(await this.findOr404(id));
  }

  async update(id: number, dto: UpdateNotificationDto) {
    await this.findOr404(id);
    await this.notifications.update(id, { ...dto });
    return success(await this.findOr404(id), 'Notification mise à jour avec succès');
  }

  async destroy(id: number) {
    await this.findOr404(id);
    await this.notifications.delete(id);
    return success(undefined, 'Notification supprimée avec succès');
  }
}
```

`server-nest/src/notifications/notifications.controller.ts`:

```ts
import {
  Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';

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

`server-nest/src/notifications/notifications.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from '../database/entities/notification.entity';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

@Module({
  imports: [TypeOrmModule.forFeature([Notification])],
  controllers: [NotificationsController],
  providers: [NotificationsService],
})
export class NotificationsModule {}
```

Register `NotificationsModule` in `app.module.ts`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd server-nest && npx jest --config test/jest-e2e.json notifications`
Expected: 2 passed.

- [ ] **Step 5: Commit**

```bash
git add server-nest/src server-nest/test
git commit -m "feat(server-nest): notifications CRUD"
```

---

### Task 15: Email templates module (`/api/emails`)

**Files:**
- Create: `server-nest/src/email-templates/email-templates.module.ts`, `email-templates.controller.ts`, `email-templates.service.ts`, `dto/create-email-template.dto.ts`, `dto/update-email-template.dto.ts`
- Modify: `server-nest/src/app.module.ts`
- Test: `server-nest/test/email-templates.e2e-spec.ts`

Parity notes: only the 5 routed endpoints are ported (D10). Routes are public in PHP, so `auth()->id()` was always null there → `created_by` stays `null` here (kept; wire a user if these routes get guarded later). Destroy is a SOFT delete. Variables are auto-extracted from `corps` with `/{{(.*?)}}/`.

- [ ] **Step 1: Write the failing test**

`server-nest/test/email-templates.e2e-spec.ts`:

```ts
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { createTestApp } from './utils/create-test-app';
import { EmailTemplatesModule } from '../src/email-templates/email-templates.module';
import { EmailTemplate } from '../src/database/entities/email-template.entity';

describe('email templates', () => {
  let app: INestApplication;
  beforeAll(async () => { app = await createTestApp({ imports: [EmailTemplatesModule] }); });
  afterAll(async () => { await app.close(); });
  const http = () => request(app.getHttpServer());

  it('store extracts variables from corps; unique nom enforced', async () => {
    const res = await http().post('/api/emails').send({
      nom: 'Bienvenue', objet: 'Salut {{prenom}}',
      corps: 'Bonjour {{prenom}} {{nom}}, bienvenue. {{prenom}}',
    }).expect(201);
    expect(res.body.data.statut).toBe('actif');
    expect(res.body.data.variables).toEqual(['prenom', 'nom']);
    const dup = await http().post('/api/emails')
      .send({ nom: 'Bienvenue', objet: 'x', corps: 'y' }).expect(422);
    expect(dup.body.errors.nom).toBeDefined();
  });

  it('update re-extracts variables when corps changes', async () => {
    const created = await http().post('/api/emails')
      .send({ nom: 'Relance', objet: 'o', corps: '{{a}}' }).expect(201);
    const id = created.body.data.id;
    const upd = await http().put(`/api/emails/${id}`).send({ corps: '{{x}} et {{y}}' }).expect(200);
    expect(upd.body.data.variables).toEqual(['x', 'y']);
  });

  it('index filters statut + search; destroy soft-deletes', async () => {
    const list = await http().get('/api/emails?search=Bienvenue').expect(200);
    expect(list.body.data).toHaveLength(1);

    const id = list.body.data[0].id;
    await http().delete(`/api/emails/${id}`).expect(200);
    await http().get(`/api/emails/${id}`).expect(404);
    // row still exists, soft-deleted
    const ds = app.get(DataSource);
    const raw = await ds.getRepository(EmailTemplate).findOne({ where: { id }, withDeleted: true });
    expect(raw?.deleted_at).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server-nest && npx jest --config test/jest-e2e.json email-templates`
Expected: FAIL.

- [ ] **Step 3: Implement**

`server-nest/src/email-templates/dto/create-email-template.dto.ts`:

```ts
import { IsArray, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateEmailTemplateDto {
  @IsString() @MaxLength(255) nom: string;
  @IsString() @MaxLength(255) objet: string;
  @IsString() corps: string;
  @IsOptional() @IsIn(['actif', 'inactif', 'archive']) statut?: string;
  @IsOptional() @IsArray() variables?: string[];
}
```

`server-nest/src/email-templates/dto/update-email-template.dto.ts`:

```ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateEmailTemplateDto } from './create-email-template.dto';

export class UpdateEmailTemplateDto extends PartialType(CreateEmailTemplateDto) {}
```

`server-nest/src/email-templates/email-templates.service.ts`:

```ts
import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { EmailTemplate } from '../database/entities/email-template.entity';
import { success } from '../common/envelope';
import { parsePagination, paginateQb } from '../common/pagination';
import { CreateEmailTemplateDto } from './dto/create-email-template.dto';
import { UpdateEmailTemplateDto } from './dto/update-email-template.dto';

@Injectable()
export class EmailTemplatesService {
  constructor(
    @InjectRepository(EmailTemplate) private readonly templates: Repository<EmailTemplate>,
  ) {}

  // PHP: preg_match_all('/{{(.*?)}}/'), trimmed, unique
  private extractVariables(corps: string): string[] {
    const found = [...corps.matchAll(/{{(.*?)}}/g)].map((m) => m[1].trim());
    return [...new Set(found)];
  }

  private async findOr404(id: number): Promise<EmailTemplate> {
    const t = await this.templates.findOne({ where: { id }, relations: { createdBy: true } });
    if (!t) throw new NotFoundException({ status: 'error', message: 'Modèle non trouvé' });
    return t;
  }

  private async assertUniqueNom(nom: string, ignoreId?: number) {
    const clash = await this.templates.findOne({
      where: ignoreId ? { nom, id: Not(ignoreId) } : { nom },
      withDeleted: true,
    });
    if (clash) {
      throw new UnprocessableEntityException({
        status: 'error', message: 'Erreur de validation',
        errors: { nom: ['Ce nom est déjà utilisé.'] },
      });
    }
  }

  async index(query: Record<string, any>) {
    const { page, perPage } = parsePagination(query, 15);
    const qb = this.templates.createQueryBuilder('t').leftJoinAndSelect('t.createdBy', 'createdBy');
    if (query.statut !== undefined) qb.andWhere('t.statut = :st', { st: query.statut });
    if (query.search !== undefined) {
      qb.andWhere('(t.nom LIKE :q OR t.objet LIKE :q OR t.corps LIKE :q)', { q: `%${query.search}%` });
    }
    const sortBy = ['nom', 'objet', 'statut', 'created_at', 'updated_at'].includes(query.sort_by)
      ? query.sort_by : 'created_at';
    const sortOrder = String(query.sort_order).toLowerCase() === 'asc' ? 'ASC' : 'DESC';
    qb.orderBy(`t.${sortBy}`, sortOrder);
    const { data, pagination } = await paginateQb(qb, page, perPage);
    return success(data, undefined, { pagination });
  }

  async store(dto: CreateEmailTemplateDto) {
    await this.assertUniqueNom(dto.nom);
    const t = await this.templates.save({
      nom: dto.nom, objet: dto.objet, corps: dto.corps,
      statut: dto.statut ?? 'actif',
      variables: dto.variables ?? this.extractVariables(dto.corps),
      created_by: null, // public route in PHP → auth()->id() was always null
    });
    return success(await this.findOr404(t.id), 'Modèle créé avec succès');
  }

  async show(id: number) {
    return success(await this.findOr404(id));
  }

  async update(id: number, dto: UpdateEmailTemplateDto) {
    await this.findOr404(id);
    if (dto.nom !== undefined) await this.assertUniqueNom(dto.nom, id);
    const patch: Record<string, unknown> = { ...dto };
    if (dto.corps !== undefined) patch.variables = this.extractVariables(dto.corps);
    await this.templates.update(id, patch);
    return success(await this.findOr404(id), 'Modèle mis à jour avec succès');
  }

  async destroy(id: number) {
    await this.findOr404(id);
    await this.templates.softDelete(id);
    return success(undefined, 'Modèle supprimé avec succès');
  }
}
```

`server-nest/src/email-templates/email-templates.controller.ts`:

```ts
import {
  Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query,
} from '@nestjs/common';
import { EmailTemplatesService } from './email-templates.service';
import { CreateEmailTemplateDto } from './dto/create-email-template.dto';
import { UpdateEmailTemplateDto } from './dto/update-email-template.dto';

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

`server-nest/src/email-templates/email-templates.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmailTemplate } from '../database/entities/email-template.entity';
import { EmailTemplatesController } from './email-templates.controller';
import { EmailTemplatesService } from './email-templates.service';

@Module({
  imports: [TypeOrmModule.forFeature([EmailTemplate])],
  controllers: [EmailTemplatesController],
  providers: [EmailTemplatesService],
})
export class EmailTemplatesModule {}
```

Register `EmailTemplatesModule` in `app.module.ts`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd server-nest && npx jest --config test/jest-e2e.json email-templates`
Expected: 3 passed.

- [ ] **Step 5: Commit**

```bash
git add server-nest/src server-nest/test
git commit -m "feat(server-nest): email templates CRUD with variable extraction"
```

---
### Task 16: Echanges module (`/api/echanges`, client + admin)

**Files:**
- Create: `server-nest/src/auth/guards/optional-jwt.guard.ts`
- Create: `server-nest/src/echanges/echanges.module.ts`, `echanges.controller.ts`, `echanges.service.ts`, `dto/create-echange.dto.ts`, `dto/update-echange.dto.ts`, `dto/admin-update-echange.dto.ts`, `dto/report-echange.dto.ts`
- Modify: `server-nest/src/app.module.ts`, `server-nest/src/auth/auth.module.ts` (provide/export OptionalJwtGuard)
- Test: `server-nest/test/echanges.e2e-spec.ts`

Route paths preserved from PHP (including the odd nesting): client endpoints live at `/api/echanges/client/echanges[...]` and require `JwtAuthGuard + ClientGuard` (D2). Admin endpoints (`/api/echanges...`) were public in PHP — kept public (D17), but use `OptionalJwtGuard` so `traite_par`/`signale_par` capture the acting user when a token IS supplied (mirrors PHP's `auth()->check()`). `statistics` declared before `:id` (D7). Soft deletes.

- [ ] **Step 1: Write the failing test**

`server-nest/test/echanges.e2e-spec.ts`:

```ts
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
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

  it('client store requires auth + client row; creates with defaults', async () => {
    await http().post('/api/echanges/client/echanges').expect(401);
    const res = await http().post('/api/echanges/client/echanges')
      .set('Authorization', `Bearer ${clientToken}`)
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

  it('client index/show scoped to own rows; type must be in list', async () => {
    const bad = await http().post('/api/echanges/client/echanges')
      .set('Authorization', `Bearer ${clientToken}`)
      .field('sujet', 's').field('type', 'invalide').field('message', 'assez long message')
      .expect(422);
    expect(bad.body.errors.type).toBeDefined();

    const list = await http().get('/api/echanges/client/echanges')
      .set('Authorization', `Bearer ${clientToken}`).expect(200);
    expect(list.body.data).toHaveLength(1);
    const id = list.body.data[0].id;
    await http().get(`/api/echanges/client/echanges/${id}`)
      .set('Authorization', `Bearer ${clientToken}`).expect(200);
    const nf = await http().get('/api/echanges/client/echanges/99999')
      .set('Authorization', `Bearer ${clientToken}`).expect(404);
    expect(nf.body.message).toBe('Échange non trouvé');
  });

  it('adminShow marks en_attente as lu; adminUpdate traite sets traite_par from token', async () => {
    const list = await http().get('/api/echanges').expect(200);
    const id = list.body.data[0].id;

    const shown = await http().get(`/api/echanges/${id}`).expect(200);
    expect(shown.body.data.statut).toBe('lu');
    expect(shown.body.data.lu_a).toBeTruthy();

    const upd = await http().put(`/api/echanges/${id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ statut: 'traite', reponse_admin: 'Réponse admin' }).expect(200);
    expect(upd.body.data.statut).toBe('traite');
    expect(upd.body.data.traite_a).toBeTruthy();
    expect(upd.body.data.repondu_a).toBeTruthy();
    expect(upd.body.data.traite_par).toBeTruthy();
  });

  it('client update/destroy blocked once statut not en_attente/lu', async () => {
    const list = await http().get('/api/echanges/client/echanges')
      .set('Authorization', `Bearer ${clientToken}`).expect(200);
    const id = list.body.data[0].id; // statut is now 'traite'
    const upd = await http().put(`/api/echanges/client/echanges/${id}`)
      .set('Authorization', `Bearer ${clientToken}`).send({ sujet: 'Nouveau' }).expect(404);
    expect(upd.body.message).toBe('Échange non trouvé ou ne peut pas être modifié');
    const del = await http().delete(`/api/echanges/client/echanges/${id}`)
      .set('Authorization', `Bearer ${clientToken}`).expect(404);
    expect(del.body.message).toBe('Échange non trouvé ou ne peut pas être supprimé');
  });

  it('adminHide toggles, adminReport flags, statistics reachable', async () => {
    const list = await http().get('/api/echanges').expect(200);
    const id = list.body.data[0].id;

    const hide = await http().post(`/api/echanges/${id}/hide`).expect(200);
    expect(hide.body.message).toBe('Échange masqué');
    const unhide = await http().post(`/api/echanges/${id}/hide`).expect(200);
    expect(unhide.body.message).toBe('Échange démasqué');

    const rep = await http().post(`/api/echanges/${id}/report`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ motif_signalement: 'contenu inapproprié' }).expect(200);
    expect(rep.body.data.statut).toBe('signale');
    expect(rep.body.data.signale_par).toBeTruthy();

    const stats = await http().get('/api/echanges/statistics').expect(200);
    expect(stats.body.data).toHaveProperty('par_type');
    expect(stats.body.data.total).toBeGreaterThanOrEqual(1);

    const del = await http().delete(`/api/echanges/${id}`).expect(200);
    expect(del.body.message).toBe('Échange supprimé avec succès');
    await http().get(`/api/echanges/${id}`).expect(404);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server-nest && npx jest --config test/jest-e2e.json echanges`
Expected: FAIL.

- [ ] **Step 3: Implement**

`server-nest/src/auth/guards/optional-jwt.guard.ts` (add to AuthModule providers+exports):

```ts
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class OptionalJwtGuard extends AuthGuard('jwt') {
  handleRequest(err: any, user: any) {
    return user || null; // never rejects; request.user stays null without a valid token
  }
}
```

`server-nest/src/echanges/dto/create-echange.dto.ts`:

```ts
import {
  IsDateString, IsIn, IsOptional, IsString, MaxLength, MinLength,
} from 'class-validator';

export class CreateEchangeDto {
  @IsString() @MaxLength(255) sujet: string;
  @IsIn(['proposition', 'demande', 'information', 'autre']) type: string;
  @IsString() @MinLength(10) message: string;
  @IsOptional() @IsString() @MaxLength(500) ce_que_je_propose?: string;
  @IsOptional() @IsString() @MaxLength(500) ce_que_je_recherche?: string;
  @IsOptional() @IsString() @MaxLength(255) format?: string;
  @IsOptional() @IsDateString() delai_souhaite?: string;
}
```

`server-nest/src/echanges/dto/update-echange.dto.ts`:

```ts
import {
  IsDateString, IsOptional, IsString, MaxLength, MinLength,
} from 'class-validator';

export class UpdateEchangeDto {
  @IsOptional() @IsString() @MaxLength(255) sujet?: string;
  @IsOptional() @IsString() @MinLength(10) message?: string;
  @IsOptional() @IsString() @MaxLength(500) ce_que_je_propose?: string;
  @IsOptional() @IsString() @MaxLength(500) ce_que_je_recherche?: string;
  @IsOptional() @IsString() @MaxLength(255) format?: string;
  @IsOptional() @IsDateString() delai_souhaite?: string;
}
```

`server-nest/src/echanges/dto/admin-update-echange.dto.ts`:

```ts
import { IsIn, IsInt, IsOptional, IsString } from 'class-validator';

export class AdminUpdateEchangeDto {
  @IsOptional() @IsIn(['en_attente', 'lu', 'en_cours', 'traite', 'archive', 'signale'])
  statut?: string;
  @IsOptional() @IsIn(['basse', 'moyenne', 'haute', 'urgente'])
  priorite?: string;
  @IsOptional() @IsString() reponse_admin?: string;
  @IsOptional() @IsInt() traite_par?: number;
}
```

`server-nest/src/echanges/dto/report-echange.dto.ts`:

```ts
import { IsString, MaxLength } from 'class-validator';

export class ReportEchangeDto {
  @IsString() @MaxLength(500) motif_signalement: string;
}
```

`server-nest/src/echanges/echanges.service.ts`:

```ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Echange } from '../database/entities/echange.entity';
import { Client } from '../database/entities/client.entity';
import { User } from '../database/entities/user.entity';
import { success } from '../common/envelope';
import { parsePagination, paginateQb } from '../common/pagination';
import { StorageService } from '../common/storage.service';
import { assertUpload } from '../common/upload.util';
import { CreateEchangeDto } from './dto/create-echange.dto';
import { UpdateEchangeDto } from './dto/update-echange.dto';
import { AdminUpdateEchangeDto } from './dto/admin-update-echange.dto';
import { ReportEchangeDto } from './dto/report-echange.dto';

const PIECE_JOINTE_EXTS = ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'doc', 'docx'];

@Injectable()
export class EchangesService {
  constructor(
    @InjectRepository(Echange) private readonly echanges: Repository<Echange>,
    private readonly storage: StorageService,
  ) {}

  private notFound(message: string): never {
    throw new NotFoundException({ status: 'error', message });
  }

  private withRelations() {
    return this.echanges.createQueryBuilder('e')
      .leftJoinAndSelect('e.client', 'client')
      .leftJoinAndSelect('e.traitePar', 'traitePar')
      .leftJoinAndSelect('e.signalePar', 'signalePar');
  }

  // ---- client-facing ----

  async index(client: Client, query: Record<string, any>) {
    const { page, perPage } = parsePagination(query, 10);
    const qb = this.echanges.createQueryBuilder('e')
      .leftJoinAndSelect('e.client', 'client')
      .where('e.client_id = :cid', { cid: client.id });
    if (query.statut !== undefined) qb.andWhere('e.statut = :st', { st: query.statut });
    if (query.type !== undefined) qb.andWhere('e.type = :ty', { ty: query.type });
    if (query.search !== undefined) {
      qb.andWhere('(e.sujet LIKE :q OR e.message LIKE :q)', { q: `%${query.search}%` });
    }
    qb.orderBy('e.created_at', 'DESC');
    const { data, pagination } = await paginateQb(qb, page, perPage);
    return success(data, undefined, { pagination });
  }

  async store(client: Client, dto: CreateEchangeDto, files: Express.Multer.File[]) {
    const pieces = [];
    for (const file of files ?? []) {
      assertUpload(file, 'pieces_jointes', PIECE_JOINTE_EXTS);
      const chemin = await this.storage.save(file, `echanges/${client.id}`);
      pieces.push({ nom: file.originalname, chemin, taille: file.size, type: file.mimetype });
    }
    const saved = await this.echanges.save({
      client_id: client.id,
      sujet: dto.sujet, type: dto.type, message: dto.message,
      ce_que_je_propose: dto.ce_que_je_propose ?? null,
      ce_que_je_recherche: dto.ce_que_je_recherche ?? null,
      format: dto.format ?? null,
      delai_souhaite: dto.delai_souhaite ?? null,
      pieces_jointes: pieces.length ? pieces : null,
      statut: 'en_attente', priorite: 'moyenne',
    });
    const fresh = await this.echanges.findOne({ where: { id: saved.id }, relations: { client: true } });
    return success(fresh, 'Votre message a été envoyé avec succès');
  }

  async show(client: Client, id: number) {
    const echange = await this.echanges.findOne({
      where: { id, client_id: client.id }, relations: { client: true },
    });
    if (!echange) this.notFound('Échange non trouvé');
    return success(echange);
  }

  async update(client: Client, id: number, dto: UpdateEchangeDto) {
    const echange = await this.echanges.findOneBy({
      id, client_id: client.id, statut: In(['en_attente', 'lu']),
    });
    if (!echange) this.notFound('Échange non trouvé ou ne peut pas être modifié');
    await this.echanges.update(id, { ...dto });
    const fresh = await this.echanges.findOne({ where: { id }, relations: { client: true } });
    return success(fresh, 'Échange mis à jour avec succès');
  }

  async destroy(client: Client, id: number) {
    const echange = await this.echanges.findOneBy({
      id, client_id: client.id, statut: In(['en_attente', 'lu']),
    });
    if (!echange) this.notFound('Échange non trouvé ou ne peut pas être supprimé');
    await this.echanges.softDelete(id);
    return success(undefined, 'Échange supprimé avec succès');
  }

  // ---- admin-facing ----

  async adminIndex(query: Record<string, any>) {
    const { page, perPage } = parsePagination(query, 15);
    const qb = this.withRelations();
    if (query.statut !== undefined) qb.andWhere('e.statut = :st', { st: query.statut });
    if (query.priorite !== undefined) qb.andWhere('e.priorite = :pr', { pr: query.priorite });
    if (query.type !== undefined) qb.andWhere('e.type = :ty', { ty: query.type });
    if (query.client_id !== undefined) qb.andWhere('e.client_id = :cid', { cid: query.client_id });
    if (query.search !== undefined) {
      qb.andWhere(
        '(e.sujet LIKE :q OR e.message LIKE :q OR client.firstname LIKE :q OR client.lastname LIKE :q OR client.email LIKE :q)',
        { q: `%${query.search}%` },
      );
    }
    const sortBy = ['created_at', 'updated_at', 'statut', 'priorite', 'type'].includes(query.sort_by)
      ? query.sort_by : 'created_at';
    const sortOrder = String(query.sort_order).toLowerCase() === 'asc' ? 'ASC' : 'DESC';
    qb.orderBy(`e.${sortBy}`, sortOrder);
    const { data, pagination } = await paginateQb(qb, page, perPage);
    return success(data, undefined, { pagination });
  }

  async adminShow(id: number) {
    const echange = await this.withRelations().where('e.id = :id', { id }).getOne();
    if (!echange) this.notFound('Échange non trouvé');
    if (echange.statut === 'en_attente') {
      await this.echanges.update(id, { statut: 'lu', lu_a: new Date() });
      echange.statut = 'lu';
      echange.lu_a = new Date();
    }
    return success(echange);
  }

  async adminUpdate(id: number, dto: AdminUpdateEchangeDto, user: User | null) {
    const echange = await this.echanges.findOneBy({ id });
    if (!echange) this.notFound('Échange non trouvé');
    const patch: Record<string, unknown> = { ...dto };
    if (dto.statut === 'traite') {
      patch.traite_a = new Date();
      if (user) patch.traite_par = user.id;
    }
    if (dto.reponse_admin) patch.repondu_a = new Date();
    await this.echanges.update(id, patch);
    const fresh = await this.withRelations().where('e.id = :id', { id }).getOne();
    return success(fresh, 'Échange mis à jour avec succès');
  }

  async adminHide(id: number) {
    const echange = await this.echanges.findOneBy({ id });
    if (!echange) this.notFound('Échange non trouvé');
    const masque = !echange.est_masque;
    await this.echanges.update(id, { est_masque: masque });
    const fresh = await this.echanges.findOneBy({ id });
    return success(fresh, masque ? 'Échange masqué' : 'Échange démasqué');
  }

  async adminReport(id: number, dto: ReportEchangeDto, user: User | null) {
    const echange = await this.echanges.findOneBy({ id });
    if (!echange) this.notFound('Échange non trouvé');
    await this.echanges.update(id, {
      statut: 'signale',
      signale_par: user?.id ?? null,
      motif_signalement: dto.motif_signalement,
      signale_a: new Date(),
    });
    return success(await this.echanges.findOneBy({ id }), 'Échange signalé avec succès');
  }

  async adminDestroy(id: number) {
    const echange = await this.echanges.findOneBy({ id });
    if (!echange) this.notFound('Échange non trouvé');
    await this.echanges.softDelete(id);
    return success(undefined, 'Échange supprimé avec succès');
  }

  async adminStatistics() {
    const count = (statut?: string) =>
      statut ? this.echanges.countBy({ statut }) : this.echanges.count();
    const grouped = (col: 'type' | 'priorite') =>
      this.echanges.createQueryBuilder('e')
        .select(`e.${col}`, col).addSelect('COUNT(*)', 'count')
        .groupBy(`e.${col}`).getRawMany()
        .then((rows) => rows.map((r) => ({ ...r, count: Number(r.count) })));
    const derniers = await this.echanges.find({
      relations: { client: true }, order: { created_at: 'DESC' }, take: 10,
    });
    return success({
      total: await count(),
      en_attente: await count('en_attente'),
      en_cours: await count('en_cours'),
      traites: await count('traite'),
      signales: await count('signale'),
      archives: await count('archive'),
      par_type: await grouped('type'),
      par_priorite: await grouped('priorite'),
      derniers_echanges: derniers,
    });
  }
}
```

`server-nest/src/echanges/echanges.controller.ts` — order matters: `statistics` and the `client/echanges` literals before `:id`:

```ts
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
import { OptionalJwtGuard } from '../auth/guards/optional-jwt.guard';
import { CurrentClient, CurrentUser } from '../auth/decorators';
import { Client } from '../database/entities/client.entity';
import { User } from '../database/entities/user.entity';

@Controller('echanges')
export class EchangesController {
  constructor(private readonly service: EchangesService) {}

  // ---- client (path parity with PHP: /api/echanges/client/echanges) ----

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

  // ---- admin (public in PHP — D17; OptionalJwtGuard captures acting user) ----

  @Get('statistics')
  adminStatistics() { return this.service.adminStatistics(); }

  @Get()
  adminIndex(@Query() query: Record<string, any>) { return this.service.adminIndex(query); }

  @Get(':id')
  adminShow(@Param('id', ParseIntPipe) id: number) { return this.service.adminShow(id); }

  @UseGuards(OptionalJwtGuard)
  @Put(':id')
  adminUpdate(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AdminUpdateEchangeDto,
    @CurrentUser() user: User | null,
  ) {
    return this.service.adminUpdate(id, dto, user);
  }

  @UseGuards(OptionalJwtGuard)
  @Patch(':id')
  adminPatch(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AdminUpdateEchangeDto,
    @CurrentUser() user: User | null,
  ) {
    return this.service.adminUpdate(id, dto, user);
  }

  @HttpCode(200)
  @Post(':id/hide')
  adminHide(@Param('id', ParseIntPipe) id: number) { return this.service.adminHide(id); }

  @UseGuards(OptionalJwtGuard)
  @HttpCode(200)
  @Post(':id/report')
  adminReport(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReportEchangeDto,
    @CurrentUser() user: User | null,
  ) {
    return this.service.adminReport(id, dto, user);
  }

  @Delete(':id')
  adminDestroy(@Param('id', ParseIntPipe) id: number) { return this.service.adminDestroy(id); }
}
```

`server-nest/src/echanges/echanges.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Echange } from '../database/entities/echange.entity';
import { EchangesController } from './echanges.controller';
import { EchangesService } from './echanges.service';
import { StorageService } from '../common/storage.service';

@Module({
  imports: [TypeOrmModule.forFeature([Echange])],
  controllers: [EchangesController],
  providers: [EchangesService, StorageService],
})
export class EchangesModule {}
```

Add `OptionalJwtGuard` to `auth.module.ts` providers + exports. Register `EchangesModule` in `app.module.ts`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd server-nest && npx jest --config test/jest-e2e.json echanges`
Expected: 5 passed.

- [ ] **Step 5: Commit**

```bash
git add server-nest/src server-nest/test
git commit -m "feat(server-nest): echanges client+admin workflows with corrected schema"
```

---
### Task 17: Paiements module (`/api/paiements`)

**Files:**
- Create: `server-nest/src/paiements/paiements.module.ts`, `paiements.controller.ts`, `paiements.service.ts`
- Modify: `server-nest/src/app.module.ts`
- Test: `server-nest/test/paiements.e2e-spec.ts`

Parity notes: no write endpoints except DELETE (PHP routes `DELETE /paiements/{id}` to a `destroy` that doesn't exist in the controller — implemented here as soft delete with a standard envelope, flagged as a fix). Client-scoped routes (`/clients`, `/:id`, `/export/comptable`) get `JwtAuthGuard + ClientGuard` (D2). Admin routes stay public (D17). Literal routes declared before `:id`. Stats aggregates are computed with independent queries — the PHP code reused one mutating builder (a latent bug the extraction flagged); the Nest version computes each aggregate on a fresh query with the same filters, which is what the PHP intended.

- [ ] **Step 1: Write the failing test**

`server-nest/test/paiements.e2e-spec.ts`:

```ts
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { createTestApp, seedClientUser } from './utils/create-test-app';
import { PaiementsModule } from '../src/paiements/paiements.module';
import { Paiement } from '../src/database/entities/paiement.entity';

describe('paiements', () => {
  let app: INestApplication;
  let clientToken: string;
  let clientId: number;
  beforeAll(async () => {
    app = await createTestApp({ imports: [PaiementsModule] });
    const seeded = await seedClientUser(app, 'payer@aura.io');
    clientToken = seeded.token;
    clientId = seeded.client.id;
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

  it('client index scoped + statistiques block', async () => {
    await http().get('/api/paiements/clients').expect(401);
    const res = await http().get('/api/paiements/clients')
      .set('Authorization', `Bearer ${clientToken}`).expect(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.statistiques).toMatchObject({
      total_paiements: 2, total_montant: 150, total_commission: 15, total_net: 135,
    });
    expect(res.body.statistiques.par_moyen).toHaveLength(2);

    const filtered = await http().get('/api/paiements/clients?statut=paid')
      .set('Authorization', `Bearer ${clientToken}`).expect(200);
    expect(filtered.body.data).toHaveLength(1);
  });

  it('client show 404 for foreign paiement', async () => {
    const other = await seedClientUser(app, 'other-payer@aura.io');
    const list = await http().get('/api/paiements/clients')
      .set('Authorization', `Bearer ${clientToken}`).expect(200);
    const id = list.body.data[0].id;
    await http().get(`/api/paiements/${id}`)
      .set('Authorization', `Bearer ${clientToken}`).expect(200);
    const nf = await http().get(`/api/paiements/${id}`)
      .set('Authorization', `Bearer ${other.token}`).expect(404);
    expect(nf.body.message).toBe('Paiement non trouvé');
  });

  it('adminIndex lists all; adminStatistics aggregates; par_mois formatted YYYY-MM', async () => {
    const idx = await http().get('/api/paiements').expect(200);
    expect(idx.body.pagination.total).toBe(2);

    const stats = await http().get('/api/paiements/statistics').expect(200);
    expect(stats.body.data.general).toMatchObject({
      total_transactions: 2, montant_total: 150,
    });
    expect(stats.body.data.par_mois[0].mois).toMatch(/^\d{4}-\d{2}$/);
    expect(stats.body.data.par_statut.length).toBeGreaterThanOrEqual(2);
  });

  it('exports: JSON export only paid; CSV has French header and semicolons', async () => {
    const exp = await http().get('/api/paiements/export').expect(200);
    expect(exp.body.data.total_transactions).toBe(1);
    expect(exp.body.data.transactions[0].brut).toBe('100.00 €');

    const csv = await http().get('/api/paiements/export/csv').expect(200);
    expect(csv.body.data.filename).toMatch(/^export_paiements_\d{8}_\d{6}\.csv$/);
    const lines = csv.body.data.csv.split('\n');
    expect(lines[0]).toBe(
      'Référence;Date;Client;Email Client;Praticien;Brut (€);Commission (€);Net Praticien (€);Moyen de paiement;Statut',
    );
    expect(lines[1]).toContain('TX-11111;');

    const compta = await http().get('/api/paiements/export/comptable')
      .set('Authorization', `Bearer ${clientToken}`).expect(200);
    expect(compta.body.data.total_transactions).toBe(1);
    expect(compta.body.data.transactions[0].statut).toBe('paid');
  });

  it('DELETE /:id soft deletes', async () => {
    const idx = await http().get('/api/paiements').expect(200);
    const id = idx.body.data.find((p: any) => p.statut === 'en_attente').id;
    await http().delete(`/api/paiements/${id}`).expect(200);
    const after = await http().get('/api/paiements').expect(200);
    expect(after.body.pagination.total).toBe(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server-nest && npx jest --config test/jest-e2e.json paiements`
Expected: FAIL.

- [ ] **Step 3: Implement**

`server-nest/src/paiements/paiements.service.ts`:

```ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository, SelectQueryBuilder } from 'typeorm';
import { Paiement } from '../database/entities/paiement.entity';
import { Client } from '../database/entities/client.entity';
import { Praticien } from '../database/entities/praticien.entity';
import { success } from '../common/envelope';
import { parsePagination, paginateQb } from '../common/pagination';
import { euro, exportTimestamp, formatDateFr, formatDateTimeFr, numberFormat } from '../common/format';

// D16: portable YYYY-MM (MySQL DATE_FORMAT equivalent that also runs on SQLite tests)
const MONTH_EXPR = "SUBSTR(CAST(p.date_paiement AS CHAR), 1, 7)";

@Injectable()
export class PaiementsService {
  constructor(
    @InjectRepository(Paiement) private readonly paiements: Repository<Paiement>,
    @InjectRepository(Client) private readonly clients: Repository<Client>,
    @InjectRepository(Praticien) private readonly praticiens: Repository<Praticien>,
  ) {}

  private baseQb(): SelectQueryBuilder<Paiement> {
    return this.paiements.createQueryBuilder('p')
      .leftJoinAndSelect('p.client', 'client')
      .leftJoinAndSelect('p.praticien', 'praticien');
  }

  private applyCommonFilters(qb: SelectQueryBuilder<Paiement>, query: Record<string, any>) {
    if (query.statut !== undefined) qb.andWhere('p.statut = :st', { st: query.statut });
    if (query.moyen_paiement !== undefined) {
      qb.andWhere('p.moyen_paiement LIKE :mp', { mp: `%${query.moyen_paiement}%` });
    }
    if (query.date_debut !== undefined) {
      qb.andWhere('DATE(p.date_paiement) >= :dd', { dd: query.date_debut });
    }
    if (query.date_fin !== undefined) {
      qb.andWhere('DATE(p.date_paiement) <= :df', { df: query.date_fin });
    }
    return qb;
  }

  private applySort(qb: SelectQueryBuilder<Paiement>, query: Record<string, any>) {
    const sortBy = ['date_paiement', 'montant_brut', 'created_at', 'statut', 'reference']
      .includes(query.sort_by) ? query.sort_by : 'date_paiement';
    const sortOrder = String(query.sort_order).toLowerCase() === 'asc' ? 'ASC' : 'DESC';
    return qb.orderBy(`p.${sortBy}`, sortOrder);
  }

  // ---- client-scoped ----

  async index(client: Client, query: Record<string, any>) {
    const { page, perPage } = parsePagination(query, 15);
    const filtered = () => {
      const qb = this.applyCommonFilters(
        this.baseQb().where('p.client_id = :cid', { cid: client.id }), query,
      );
      if (query.search !== undefined) {
        qb.andWhere(
          '(p.reference LIKE :q OR client.firstname LIKE :q OR client.lastname LIKE :q OR praticien.firstname LIKE :q OR praticien.lastname LIKE :q)',
          { q: `%${query.search}%` },
        );
      }
      return qb;
    };
    const { data, pagination } = await paginateQb(this.applySort(filtered(), query), page, perPage);

    // stats over the FULL filtered set (what the PHP intended)
    const agg = await filtered()
      .select('COUNT(p.id)', 'count')
      .addSelect('COALESCE(SUM(p.montant_brut),0)', 'brut')
      .addSelect('COALESCE(SUM(p.commission),0)', 'com')
      .addSelect('COALESCE(SUM(p.montant_net_praticien),0)', 'net')
      .getRawOne();
    const parMoyen = await filtered()
      .select('p.moyen_paiement', 'moyen_paiement')
      .addSelect('COUNT(p.id)', 'count')
      .addSelect('COALESCE(SUM(p.montant_brut),0)', 'total')
      .groupBy('p.moyen_paiement').getRawMany();

    return success(data, undefined, {
      pagination,
      statistiques: {
        total_paiements: Number(agg.count),
        total_montant: Number(agg.brut),
        total_commission: Number(agg.com),
        total_net: Number(agg.net),
        par_moyen: parMoyen.map((r) => ({
          moyen_paiement: r.moyen_paiement, count: Number(r.count), total: Number(r.total),
        })),
      },
    });
  }

  async show(client: Client, id: number) {
    const paiement = await this.baseQb()
      .where('p.client_id = :cid AND p.id = :id', { cid: client.id, id }).getOne();
    if (!paiement) throw new NotFoundException({ status: 'error', message: 'Paiement non trouvé' });
    return success(paiement);
  }

  async exportComptable(client: Client, query: Record<string, any>) {
    const qb = this.baseQb()
      .where('p.client_id = :cid', { cid: client.id })
      .andWhere("p.statut = 'paid'");
    if (query.date_debut !== undefined) qb.andWhere('DATE(p.date_paiement) >= :dd', { dd: query.date_debut });
    if (query.date_fin !== undefined) qb.andWhere('DATE(p.date_paiement) <= :df', { df: query.date_fin });
    if (query.mois !== undefined && query.annee !== undefined) {
      qb.andWhere(`${MONTH_EXPR} = :ym`, {
        ym: `${query.annee}-${String(query.mois).padStart(2, '0')}`,
      });
    }
    const rows = await qb.orderBy('p.date_paiement', 'DESC').getMany();
    const sum = (f: (p: Paiement) => number) => rows.reduce((a, p) => a + f(p), 0);
    return success({
      periode: { debut: query.date_debut ?? null, fin: query.date_fin ?? null },
      total_transactions: rows.length,
      total_brut: sum((p) => p.montant_brut),
      total_commission: sum((p) => p.commission),
      total_net: sum((p) => p.montant_net_praticien),
      transactions: rows.map((p) => ({
        reference: p.reference,
        date: formatDateFr(p.date_paiement),
        client: `${p.client.firstname} ${p.client.lastname}`,
        praticien: p.praticien ? `${p.praticien.firstname} ${p.praticien.lastname}` : 'N/A',
        brut: euro(p.montant_brut),
        commission: euro(p.commission),
        net_praticien: euro(p.montant_net_praticien),
        moyen: p.moyen_paiement,
        statut: p.statut,
      })),
    });
  }

  // ---- admin ----

  async adminIndex(query: Record<string, any>) {
    const { page, perPage } = parsePagination(query, 15);
    const qb = this.applyCommonFilters(this.baseQb(), query);
    if (query.client_id !== undefined) qb.andWhere('p.client_id = :cid', { cid: query.client_id });
    if (query.praticien_id !== undefined) qb.andWhere('p.praticien_id = :pid', { pid: query.praticien_id });
    if (query.search !== undefined) {
      qb.andWhere(
        '(p.reference LIKE :q OR client.firstname LIKE :q OR client.lastname LIKE :q OR client.email LIKE :q OR praticien.firstname LIKE :q OR praticien.lastname LIKE :q)',
        { q: `%${query.search}%` },
      );
    }
    const { data, pagination } = await paginateQb(this.applySort(qb, query), page, perPage);
    return success(data, undefined, { pagination });
  }

  async adminStatistics(query: Record<string, any>) {
    const filtered = () => this.applyCommonFilters(
      this.paiements.createQueryBuilder('p'),
      { date_debut: query.date_debut, date_fin: query.date_fin },
    );
    const agg = await filtered()
      .select('COUNT(p.id)', 'count')
      .addSelect('COALESCE(SUM(p.montant_brut),0)', 'brut')
      .addSelect('COALESCE(SUM(p.commission),0)', 'com')
      .addSelect('COALESCE(SUM(p.montant_net_praticien),0)', 'net')
      .getRawOne();
    const grouped = async (col: string, key: string) =>
      (await filtered()
        .select(`p.${col}`, key).addSelect('COUNT(p.id)', 'count')
        .addSelect('COALESCE(SUM(p.montant_brut),0)', 'total')
        .groupBy(`p.${col}`).getRawMany())
        .map((r) => ({ [key]: r[key], count: Number(r.count), total: Number(r.total) }));
    const parMois = (await filtered()
      .select(MONTH_EXPR, 'mois').addSelect('COUNT(p.id)', 'count')
      .addSelect('COALESCE(SUM(p.montant_brut),0)', 'total')
      .groupBy('mois').orderBy('mois', 'DESC').limit(12).getRawMany())
      .map((r) => ({ mois: r.mois, count: Number(r.count), total: Number(r.total) }));

    const topBy = async (col: 'client_id' | 'praticien_id') =>
      filtered()
        .select(`p.${col}`, col).addSelect('COUNT(p.id)', 'count')
        .addSelect('COALESCE(SUM(p.montant_brut),0)', 'total')
        .groupBy(`p.${col}`).orderBy('total', 'DESC').limit(5).getRawMany();
    const topClientsRaw = await topBy('client_id');
    const topPraticiensRaw = await topBy('praticien_id');
    const clientById = new Map(
      (await this.clients.findBy({ id: In(topClientsRaw.map((r) => r.client_id).filter(Boolean)) }))
        .map((c) => [c.id, c]),
    );
    const praticienById = new Map(
      (await this.praticiens.findBy({ id: In(topPraticiensRaw.map((r) => r.praticien_id).filter(Boolean)) }))
        .map((p) => [p.id, p]),
    );

    return success({
      general: {
        total_transactions: Number(agg.count),
        montant_total: Number(agg.brut),
        commission_totale: Number(agg.com),
        net_total: Number(agg.net),
      },
      par_statut: await grouped('statut', 'statut'),
      par_moyen: await grouped('moyen_paiement', 'moyen_paiement'),
      par_mois: parMois,
      top_clients: topClientsRaw.map((r) => ({
        client_id: r.client_id, count: Number(r.count), total: Number(r.total),
        client: clientById.get(r.client_id) ?? null,
      })),
      top_praticiens: topPraticiensRaw.map((r) => ({
        praticien_id: r.praticien_id, count: Number(r.count), total: Number(r.total),
        praticien: praticienById.get(r.praticien_id) ?? null,
      })),
    });
  }

  private async paidRows(query: Record<string, any>): Promise<Paiement[]> {
    const qb = this.baseQb().where("p.statut = 'paid'");
    if (query.date_debut !== undefined) qb.andWhere('DATE(p.date_paiement) >= :dd', { dd: query.date_debut });
    if (query.date_fin !== undefined) qb.andWhere('DATE(p.date_paiement) <= :df', { df: query.date_fin });
    return qb.orderBy('p.date_paiement', 'DESC').getMany();
  }

  async adminExport(query: Record<string, any>) {
    const rows = await this.paidRows(query);
    const sum = (f: (p: Paiement) => number) => rows.reduce((a, p) => a + f(p), 0);
    return success({
      periode: { debut: query.date_debut ?? 'Toutes', fin: query.date_fin ?? 'Toutes' },
      date_export: formatDateTimeFr(new Date()),
      total_transactions: rows.length,
      montant_total_brut: euro(sum((p) => p.montant_brut)),
      commission_totale: euro(sum((p) => p.commission)),
      net_total: euro(sum((p) => p.montant_net_praticien)),
      transactions: rows.map((p) => ({
        reference: p.reference,
        date: formatDateFr(p.date_paiement),
        client: `${p.client.firstname} ${p.client.lastname}`,
        praticien: p.praticien ? `${p.praticien.firstname} ${p.praticien.lastname}` : 'N/A',
        brut: euro(p.montant_brut),
        commission: euro(p.commission),
        net_praticien: euro(p.montant_net_praticien),
        moyen: p.moyen_paiement,
      })),
    });
  }

  async adminExportCsv(query: Record<string, any>) {
    const rows = await this.paidRows(query);
    // PHP parity: semicolon delimiter, \n terminator, NO quoting, French header
    const header = 'Référence;Date;Client;Email Client;Praticien;Brut (€);Commission (€);Net Praticien (€);Moyen de paiement;Statut';
    const lines = rows.map((p) => [
      p.reference,
      formatDateFr(p.date_paiement),
      `${p.client.firstname} ${p.client.lastname}`,
      p.client.email,
      p.praticien ? `${p.praticien.firstname} ${p.praticien.lastname}` : 'N/A',
      numberFormat(p.montant_brut),
      numberFormat(p.commission),
      numberFormat(p.montant_net_praticien),
      p.moyen_paiement,
      p.statut,
    ].join(';'));
    return success({
      filename: `export_paiements_${exportTimestamp()}.csv`,
      csv: [header, ...lines].join('\n'),
      total: rows.length,
    });
  }

  // PHP routed DELETE /paiements/{id} to a nonexistent method — implemented as soft delete
  async destroy(id: number) {
    const paiement = await this.paiements.findOneBy({ id });
    if (!paiement) throw new NotFoundException({ status: 'error', message: 'Paiement non trouvé' });
    await this.paiements.softDelete(id);
    return success(undefined, 'Paiement supprimé avec succès');
  }
}
```

`server-nest/src/paiements/paiements.controller.ts` — literals before `:id`:

```ts
import {
  Controller, Delete, Get, Param, ParseIntPipe, Query, UseGuards,
} from '@nestjs/common';
import { PaiementsService } from './paiements.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ClientGuard } from '../auth/guards/client.guard';
import { CurrentClient } from '../auth/decorators';
import { Client } from '../database/entities/client.entity';

@Controller('paiements')
export class PaiementsController {
  constructor(private readonly service: PaiementsService) {}

  @Get('statistics')
  adminStatistics(@Query() query: Record<string, any>) {
    return this.service.adminStatistics(query);
  }

  @Get('export/csv')
  adminExportCsv(@Query() query: Record<string, any>) {
    return this.service.adminExportCsv(query);
  }

  @UseGuards(JwtAuthGuard, ClientGuard)
  @Get('export/comptable')
  exportComptable(@CurrentClient() client: Client, @Query() query: Record<string, any>) {
    return this.service.exportComptable(client, query);
  }

  @Get('export')
  adminExport(@Query() query: Record<string, any>) {
    return this.service.adminExport(query);
  }

  @UseGuards(JwtAuthGuard, ClientGuard)
  @Get('clients')
  index(@CurrentClient() client: Client, @Query() query: Record<string, any>) {
    return this.service.index(client, query);
  }

  @Get()
  adminIndex(@Query() query: Record<string, any>) {
    return this.service.adminIndex(query);
  }

  @UseGuards(JwtAuthGuard, ClientGuard)
  @Get(':id')
  show(@CurrentClient() client: Client, @Param('id', ParseIntPipe) id: number) {
    return this.service.show(client, id);
  }

  @Delete(':id')
  destroy(@Param('id', ParseIntPipe) id: number) {
    return this.service.destroy(id);
  }
}
```

`server-nest/src/paiements/paiements.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Paiement } from '../database/entities/paiement.entity';
import { Client } from '../database/entities/client.entity';
import { Praticien } from '../database/entities/praticien.entity';
import { PaiementsController } from './paiements.controller';
import { PaiementsService } from './paiements.service';

@Module({
  imports: [TypeOrmModule.forFeature([Paiement, Client, Praticien])],
  controllers: [PaiementsController],
  providers: [PaiementsService],
})
export class PaiementsModule {}
```

Register `PaiementsModule` in `app.module.ts`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd server-nest && npx jest --config test/jest-e2e.json paiements`
Expected: 5 passed.

- [ ] **Step 5: Commit**

```bash
git add server-nest/src server-nest/test
git commit -m "feat(server-nest): paiements listing, statistics, exports (JSON + CSV)"
```

---
### Task 18: Remboursements module (`/api/remboursements`)

**Files:**
- Create: `server-nest/src/remboursements/remboursements.module.ts`, `remboursements.controller.ts`, `remboursements.service.ts`, `dto/create-remboursement.dto.ts`, `dto/approve-remboursement.dto.ts`, `dto/refuse-remboursement.dto.ts`
- Modify: `server-nest/src/app.module.ts`
- Test: `server-nest/test/remboursements.e2e-spec.ts`

Parity notes: client routes guarded (D2); admin routes public like PHP (D17). `admin/statistics` + `admin/export` before `admin/:id` (D7). `admin/:id/complete` fixes the `admi/` typo (D6). Reference format `RMB-#####`. Cancel maps to statut `refuse` (PHP behavior kept). Approving flips the linked paiement to `rembourse`. `taux_evolution` stays the hardcoded `"+0.3"` (PHP parity — it was a stub there too).

- [ ] **Step 1: Write the failing test**

`server-nest/test/remboursements.e2e-spec.ts`:

```ts
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { createTestApp, seedClientUser } from './utils/create-test-app';
import { RemboursementsModule } from '../src/remboursements/remboursements.module';
import { Paiement } from '../src/database/entities/paiement.entity';

describe('remboursements', () => {
  let app: INestApplication;
  let clientToken: string;
  let clientId: number;
  let paidId: number;
  beforeAll(async () => {
    app = await createTestApp({ imports: [RemboursementsModule] });
    const seeded = await seedClientUser(app, 'refund@aura.io');
    clientToken = seeded.token;
    clientId = seeded.client.id;
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

    await http().post(`/api/remboursements/admin/${id}/complete`).expect(404);

    const appr = await http().post(`/api/remboursements/admin/${id}/approve`)
      .send({ commentaire_admin: 'OK' }).expect(200);
    expect(appr.body.data.statut).toBe('approuve');
    const ds = app.get(DataSource);
    const paiement = await ds.getRepository(Paiement).findOneByOrFail({ id: paidId });
    expect(paiement.statut).toBe('rembourse');

    const done = await http().post(`/api/remboursements/admin/${id}/complete`).expect(200);
    expect(done.body.data.statut).toBe('completed');
  });

  it('admin refuse requires commentaire min 10; adminIndex embeds statistiques; export + statistics reachable', async () => {
    const badRefuse = await http().post('/api/remboursements/admin/99999/refuse')
      .send({ commentaire_admin: 'commentaire suffisant' }).expect(404);
    expect(badRefuse.body.status).toBe('error');

    const idx = await http().get('/api/remboursements/admin').expect(200);
    expect(idx.body.statistiques).toHaveProperty('taux_remboursement');
    expect(idx.body.statistiques.taux_evolution).toBe('+0.3');

    const stats = await http().get('/api/remboursements/admin/statistics').expect(200);
    expect(stats.body.data).toHaveProperty('par_motif');
    expect(stats.body.data).toHaveProperty('par_mois');

    const exp = await http().get('/api/remboursements/admin/export').expect(200);
    expect(exp.body.data.remboursements[0].statut).toBe('Complété');
    expect(exp.body.data.remboursements[0].reference).toMatch(/^RMB-/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server-nest && npx jest --config test/jest-e2e.json remboursements`
Expected: FAIL.

- [ ] **Step 3: Implement**

`server-nest/src/remboursements/dto/create-remboursement.dto.ts`:

```ts
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateRemboursementDto {
  @Type(() => Number) @IsInt() paiement_id: number;
  @IsString() @MaxLength(255) motif: string;
  @IsOptional() @IsString() description?: string;
}
```

`server-nest/src/remboursements/dto/approve-remboursement.dto.ts`:

```ts
import { IsDateString, IsOptional, IsString } from 'class-validator';

export class ApproveRemboursementDto {
  @IsOptional() @IsString() commentaire_admin?: string;
  @IsOptional() @IsDateString() date_remboursement?: string;
}
```

`server-nest/src/remboursements/dto/refuse-remboursement.dto.ts`:

```ts
import { IsString, MinLength } from 'class-validator';

export class RefuseRemboursementDto {
  @IsString() @MinLength(10) commentaire_admin: string;
}
```

`server-nest/src/remboursements/remboursements.service.ts`:

```ts
import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Not, Repository, SelectQueryBuilder } from 'typeorm';
import {
  Remboursement, REMBOURSEMENT_STATUT_LABELS,
} from '../database/entities/remboursement.entity';
import { Paiement } from '../database/entities/paiement.entity';
import { Client } from '../database/entities/client.entity';
import { success } from '../common/envelope';
import { parsePagination, paginateQb } from '../common/pagination';
import { StorageService } from '../common/storage.service';
import { assertUpload } from '../common/upload.util';
import { euro, formatDateFr, formatDateTimeFr, numberFormat } from '../common/format';
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
  ) {}

  private notFound(message: string): never {
    throw new NotFoundException({ status: 'error', message });
  }

  private validationError(errors: Record<string, string[]>): never {
    throw new UnprocessableEntityException({
      status: 'error', message: 'Erreur de validation', errors,
    });
  }

  private baseQb(): SelectQueryBuilder<Remboursement> {
    return this.remboursements.createQueryBuilder('r')
      .leftJoinAndSelect('r.client', 'client')
      .leftJoinAndSelect('r.paiement', 'paiement')
      .leftJoinAndSelect('r.praticien', 'praticien');
  }

  private async loaded(id: number): Promise<Remboursement | null> {
    return this.baseQb().where('r.id = :id', { id }).getOne();
  }

  private generateReference(): string {
    return `RMB-${Math.floor(10000 + Math.random() * 90000)}`; // PHP parity: RMB-#####
  }

  // ---- client ----

  async index(client: Client, query: Record<string, any>) {
    const { page, perPage } = parsePagination(query, 15);
    const qb = this.baseQb().where('r.client_id = :cid', { cid: client.id });
    if (query.statut !== undefined) qb.andWhere('r.statut = :st', { st: query.statut });
    if (query.search !== undefined) {
      qb.andWhere('(r.reference LIKE :q OR r.motif LIKE :q OR paiement.reference LIKE :q)',
        { q: `%${query.search}%` });
    }
    qb.orderBy('r.created_at', 'DESC');
    const { data, pagination } = await paginateQb(qb, page, perPage);
    return success(data, undefined, { pagination });
  }

  async store(client: Client, dto: CreateRemboursementDto, files: Express.Multer.File[]) {
    const paiement = await this.paiements.findOneBy({
      id: dto.paiement_id, client_id: client.id, statut: 'paid',
    });
    if (!paiement) {
      this.validationError({
        paiement_id: ["Ce paiement n'existe pas ou n'est pas éligible au remboursement."],
      });
    }
    const existing = await this.remboursements.existsBy({
      paiement_id: dto.paiement_id, client_id: client.id,
      statut: Not(In(['refuse', 'completed'])),
    });
    if (existing) {
      this.validationError({
        paiement_id: ['Une demande de remboursement existe déjà pour ce paiement.'],
      });
    }

    const documents = [];
    for (const file of files ?? []) {
      assertUpload(file, 'documents', DOC_EXTS);
      const chemin = await this.storage.save(file, `remboursements/${client.id}`);
      documents.push({ nom: file.originalname, chemin, taille: file.size, type: file.mimetype });
    }

    const saved = await this.remboursements.save({
      reference: this.generateReference(),
      client_id: client.id,
      paiement_id: dto.paiement_id,
      praticien_id: paiement.praticien_id,
      montant: paiement.montant_brut,
      motif: dto.motif,
      description: dto.description ?? null,
      documents: documents.length ? documents : null,
      statut: 'en_attente',
    });
    return success(
      await this.loaded(saved.id),
      'Votre demande de remboursement a été envoyée avec succès.',
    );
  }

  async show(client: Client, id: number) {
    const r = await this.baseQb()
      .where('r.id = :id AND r.client_id = :cid', { id, cid: client.id }).getOne();
    if (!r) this.notFound('Remboursement non trouvé');
    return success(r);
  }

  async cancel(client: Client, id: number) {
    const r = await this.remboursements.findOneBy({
      id, client_id: client.id, statut: In(['en_attente', 'en_cours']),
    });
    if (!r) this.notFound('Remboursement non trouvé ou ne peut pas être annulé');
    await this.remboursements.update(id, { statut: 'refuse' });
    return success(
      await this.remboursements.findOneBy({ id }),
      'Demande de remboursement annulée avec succès',
    );
  }

  // ---- admin ----

  async adminIndex(query: Record<string, any>) {
    const { page, perPage } = parsePagination(query, 15);
    const qb = this.baseQb();
    if (query.statut !== undefined) qb.andWhere('r.statut = :st', { st: query.statut });
    if (query.client_id !== undefined) qb.andWhere('r.client_id = :cid', { cid: query.client_id });
    if (query.praticien_id !== undefined) qb.andWhere('r.praticien_id = :pid', { pid: query.praticien_id });
    if (query.date_debut !== undefined) qb.andWhere('DATE(r.created_at) >= :dd', { dd: query.date_debut });
    if (query.date_fin !== undefined) qb.andWhere('DATE(r.created_at) <= :df', { df: query.date_fin });
    if (query.search !== undefined) {
      qb.andWhere(
        '(r.reference LIKE :q OR r.motif LIKE :q OR client.firstname LIKE :q OR client.lastname LIKE :q OR client.email LIKE :q OR paiement.reference LIKE :q)',
        { q: `%${query.search}%` },
      );
    }
    const sortBy = ['created_at', 'montant', 'statut', 'reference'].includes(query.sort_by)
      ? query.sort_by : 'created_at';
    const sortOrder = String(query.sort_order).toLowerCase() === 'asc' ? 'ASC' : 'DESC';
    qb.orderBy(`r.${sortBy}`, sortOrder);
    const { data, pagination } = await paginateQb(qb, page, perPage);
    return success(data, undefined, {
      pagination,
      statistiques: await this.computeStatistics(query),
    });
  }

  async adminShow(id: number) {
    const r = await this.loaded(id);
    if (!r) this.notFound('Remboursement non trouvé');
    return success(r);
  }

  async adminApprove(id: number, dto: ApproveRemboursementDto) {
    const r = await this.remboursements.findOneBy({
      id, statut: In(['en_attente', 'en_cours']),
    });
    if (!r) this.notFound('Remboursement non trouvé ou ne peut pas être approuvé');
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

  private async computeStatistics(query: Record<string, any>) {
    const filtered = () => {
      const qb = this.remboursements.createQueryBuilder('r');
      if (query.date_debut !== undefined) qb.andWhere('DATE(r.created_at) >= :dd', { dd: query.date_debut });
      if (query.date_fin !== undefined) qb.andWhere('DATE(r.created_at) <= :df', { df: query.date_fin });
      return qb;
    };
    const sumWhere = async (statuts: string[]) => Number(
      (await filtered().andWhere('r.statut IN (:...s)', { s: statuts })
        .select('COALESCE(SUM(r.montant),0)', 'sum').getRawOne()).sum,
    );
    const countWhere = (statuts: string[]) =>
      filtered().andWhere('r.statut IN (:...s)', { s: statuts }).getCount();

    const totalCompleted = await sumWhere(['completed']);
    const totalRemboursements = await filtered().getCount();
    const totalPaiements = await this.paiements.countBy({ statut: 'paid' });
    const taux = totalPaiements > 0 ? (totalRemboursements / totalPaiements) * 100 : 0;

    const parMotif = (await filtered()
      .select('r.motif', 'motif').addSelect('COUNT(r.id)', 'count')
      .addSelect('COALESCE(SUM(r.montant),0)', 'total')
      .groupBy('r.motif').getRawMany())
      .map((x) => ({ motif: x.motif, count: Number(x.count), total: Number(x.total) }));
    const parMois = (await filtered()
      .select(MONTH_EXPR, 'mois').addSelect('COUNT(r.id)', 'count')
      .addSelect('COALESCE(SUM(r.montant),0)', 'total')
      .groupBy('mois').orderBy('mois', 'DESC').limit(6).getRawMany())
      .map((x) => ({ mois: x.mois, count: Number(x.count), total: Number(x.total) }));

    return {
      total_rembourse: numberFormat(totalCompleted),
      total_rembourse_formatted: euro(totalCompleted),
      en_attente: await countWhere(['en_attente', 'en_cours']),
      approuves: await countWhere(['approuve']),
      refuses: await countWhere(['refuse']),
      completed: totalCompleted,
      taux_remboursement: `${taux.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`,
      taux_evolution: '+0.3', // PHP parity: hardcoded stub
      par_motif: parMotif,
      par_mois: parMois,
    };
  }

  async adminStatistics(query: Record<string, any>) {
    return success(await this.computeStatistics(query));
  }

  async adminExport(query: Record<string, any>) {
    const qb = this.baseQb();
    if (query.date_debut !== undefined) qb.andWhere('DATE(r.created_at) >= :dd', { dd: query.date_debut });
    if (query.date_fin !== undefined) qb.andWhere('DATE(r.created_at) <= :df', { df: query.date_fin });
    if (query.statut !== undefined) qb.andWhere('r.statut = :st', { st: query.statut });
    const rows = await qb.orderBy('r.created_at', 'DESC').getMany();
    const total = rows.reduce((a, r) => a + r.montant, 0);
    return success({
      periode: { debut: query.date_debut ?? 'Toutes', fin: query.date_fin ?? 'Toutes' },
      date_export: formatDateTimeFr(new Date()),
      total_remboursements: rows.length,
      montant_total: euro(total),
      remboursements: rows.map((r) => ({
        reference: r.reference,
        date: formatDateFr(r.created_at),
        transaction: r.paiement?.reference ?? 'N/A',
        client: `${r.client.firstname} ${r.client.lastname}`,
        montant: euro(r.montant),
        motif: r.motif,
        statut: REMBOURSEMENT_STATUT_LABELS[r.statut] ?? r.statut,
      })),
    });
  }
}
```

`server-nest/src/remboursements/remboursements.controller.ts` — `admin/statistics` + `admin/export` before `admin/:id`:

```ts
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

  // ---- admin (public in PHP — D17) ----

  @Get('admin/statistics')
  adminStatistics(@Query() query: Record<string, any>) {
    return this.service.adminStatistics(query);
  }

  @Get('admin/export')
  adminExport(@Query() query: Record<string, any>) {
    return this.service.adminExport(query);
  }

  @Get('admin')
  adminIndex(@Query() query: Record<string, any>) {
    return this.service.adminIndex(query);
  }

  @Get('admin/:id')
  adminShow(@Param('id', ParseIntPipe) id: number) {
    return this.service.adminShow(id);
  }

  @HttpCode(200)
  @Post('admin/:id/approve')
  adminApprove(@Param('id', ParseIntPipe) id: number, @Body() dto: ApproveRemboursementDto) {
    return this.service.adminApprove(id, dto);
  }

  @HttpCode(200)
  @Post('admin/:id/refuse')
  adminRefuse(@Param('id', ParseIntPipe) id: number, @Body() dto: RefuseRemboursementDto) {
    return this.service.adminRefuse(id, dto);
  }

  @HttpCode(200)
  @Post('admin/:id/complete') // D6: PHP route said 'admi/'
  adminComplete(@Param('id', ParseIntPipe) id: number) {
    return this.service.adminComplete(id);
  }
}
```

`server-nest/src/remboursements/remboursements.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Remboursement } from '../database/entities/remboursement.entity';
import { Paiement } from '../database/entities/paiement.entity';
import { RemboursementsController } from './remboursements.controller';
import { RemboursementsService } from './remboursements.service';
import { StorageService } from '../common/storage.service';

@Module({
  imports: [TypeOrmModule.forFeature([Remboursement, Paiement])],
  controllers: [RemboursementsController],
  providers: [RemboursementsService, StorageService],
})
export class RemboursementsModule {}
```

Register `RemboursementsModule` in `app.module.ts`.

Ordering note (minor PHP deviation): PHP found the record BEFORE validating, so bad id + invalid body returned 404; in Nest the validation pipe runs first, so invalid body returns 422 even for a missing id. Kept — 422-before-404 is the saner contract.

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd server-nest && npx jest --config test/jest-e2e.json remboursements`
Expected: 4 passed.

- [ ] **Step 5: Commit**

```bash
git add server-nest/src server-nest/test
git commit -m "feat(server-nest): remboursements client requests and admin workflow"
```

---

### Task 19: Final wiring, full test run, README

**Files:**
- Modify: `server-nest/src/app.module.ts` (final module list)
- Create: `server-nest/README.md`
- Modify: root `package.json` (optional convenience scripts)

- [ ] **Step 1: Final app.module.ts**

```ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { buildDataSourceOptions } from './database/typeorm.config';
import { AuthModule } from './auth/auth.module';
import { AdminAuthModule } from './auth/admin-auth/admin-auth.module';
import { PraticienAuthModule } from './auth/praticien-auth/praticien-auth.module';
import { PraticienVerificationModule } from './auth/praticien-verification/praticien-verification.module';
import { CerclesModule } from './cercles/cercles.module';
import { EventsModule } from './events/events.module';
import { PromotionsModule } from './promotions/promotions.module';
import { DisciplinesModule } from './disciplines/disciplines.module';
import { ClientsModule } from './clients/clients.module';
import { PraticiensModule } from './praticiens/praticiens.module';
import { ArticlesModule } from './articles/articles.module';
import { NotificationsModule } from './notifications/notifications.module';
import { EmailTemplatesModule } from './email-templates/email-templates.module';
import { EchangesModule } from './echanges/echanges.module';
import { PaiementsModule } from './paiements/paiements.module';
import { RemboursementsModule } from './remboursements/remboursements.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({ ...buildDataSourceOptions(), autoLoadEntities: true }),
    AuthModule,
    AdminAuthModule,
    PraticienAuthModule,
    PraticienVerificationModule,
    CerclesModule,
    EventsModule,
    PromotionsModule,
    DisciplinesModule,
    ClientsModule,
    PraticiensModule,
    ArticlesModule,
    NotificationsModule,
    EmailTemplatesModule,
    EchangesModule,
    PaiementsModule,
    RemboursementsModule,
  ],
})
export class AppModule {}
```

- [ ] **Step 2: Run the FULL test suite**

```bash
cd server-nest && npm run build && npx jest && npx jest --config test/jest-e2e.json
```

Expected: build clean, all unit + e2e suites pass.

- [ ] **Step 3: Boot against MySQL and smoke-test (requires local MySQL)**

```bash
cd server-nest
npm run migration:run
npm run start:dev &
sleep 5
curl -s http://localhost:8000/api/disciplines | head -c 200
curl -s -X POST http://localhost:8000/api/admin/register -H "Content-Type: application/json" \
  -d '{"name":"Admin","email":"smoke@aura.io","password":"secret123","password_confirmation":"secret123"}'
```

Expected: disciplines returns the success envelope; register returns 201 with a token. Kill the dev server after.

- [ ] **Step 4: Write `server-nest/README.md`**

```markdown
# Aura API (NestJS)

NestJS port of the Laravel API in `../server`. Same routes, same JSON envelopes.

## Run
cp .env.example .env   # fill DB_* and JWT_SECRET (reuse values from ../server/.env)
npm i
npm run migration:run  # fresh DB only — see docs/superpowers/plans/2026-07-13-php-to-nestjs-migration.md for the existing-DB delta
npm run start:dev      # http://localhost:8000/api

## Test
npx jest                             # unit
npx jest --config test/jest-e2e.json # e2e (in-memory sqlite)

## Deliberate deviations from the PHP app
See decision table D1-D17 in docs/superpowers/plans/2026-07-13-php-to-nestjs-migration.md.
Highlights: admin verification routes actually enforce admin now (D1); client-scoped
endpoints authenticate via JWT + clients-row-by-email (D2); echanges/paiements schemas
gained the columns the PHP models pretended existed (D3/D4).

## Security debt (inherited from PHP, unchanged)
Catalog/content/admin-echanges/paiements-admin/remboursements-admin routes are PUBLIC,
as they were in Laravel (D17). Locking them down is a product decision — do it next.
```

- [ ] **Step 5: Commit**

```bash
git add server-nest
git commit -m "feat(server-nest): final module wiring, README, full suite green"
```

---

## Post-migration follow-ups (explicitly OUT of scope, listed so they aren't forgotten)

1. **Auth hardening (D17):** put `JwtAuthGuard + AdminGuard` on all admin surfaces currently public.
2. **Data migration:** script to copy rows from the Laravel DB (delta SQL in Task 3 makes the old DB Nest-compatible in place).
3. **Frontend switch:** point `web/` + `mobile/` at the Nest base URL; verify D12 (numbers vs strings, camelCase relation keys) doesn't break consumers.
4. **Decommission `server/`** once parity is verified in staging.
5. Unported unrouted endpoints (D10) if the frontend ever needed them.

## Execution checklist recap

| Task | Module | Endpoints |
|---|---|---|
| 1 | Scaffold | — |
| 2 | Common infra | — |
| 3 | Entities + migration | — |
| 4 | Auth core | — |
| 5 | Admin auth | 11 |
| 6 | Praticien auth | 6 |
| 7 | Praticien verification | 6 |
| 8 | Cercles | 5 |
| 9 | Events | 5 |
| 10 | Promotions | 5 |
| 11 | Disciplines | 5 |
| 12 | Clients + Praticiens | 2 |
| 13 | Articles | 7 |
| 14 | Notifications | 5 |
| 15 | Email templates | 5 |
| 16 | Echanges | 14 |
| 17 | Paiements | 8 |
| 18 | Remboursements | 11 |
| 19 | Wiring + smoke | — |
