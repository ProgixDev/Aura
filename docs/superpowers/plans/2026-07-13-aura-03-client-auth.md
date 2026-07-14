# Aura Plan 03 — Client Auth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give Aura a real client (end-customer) identity end-to-end — a backend `client-auth` module issuing the same JWTs as admin/praticien auth — and wire real login/signup/logout on both `web/` and `mobile/`, replacing every decorative auth form.

**Architecture:** Add `server/src/auth/client-auth/` mirroring `praticien-auth`'s dual-write pattern (one DB transaction creates a `users` row + a linked `clients` row), but reusing the existing `ClientGuard`/`JwtAuthGuard`/`HashService`/`TokenService`/`AuthModule` — no new auth infrastructure, only a new controller+service+DTOs module. On `web/`, add a `zustand` + `persist` auth store (`web/lib/auth-store.js`) mirroring `mobile/src/store/session.ts`'s already-built `token` / `setToken` / `signOut` shape, then rewire `connexion`, `inscription`, `AuthModal`, `mot-de-passe-oublie`, and the `/compte/*` area to call the real endpoints and guard on the client. On `mobile/`, extend the existing `onboarding/auth.tsx` react-hook-form screen with a login/signup mode toggle and wire its submit to the same endpoints (mobile logout is already real, from Plan 01 — verified below, not rebuilt).

**Tech Stack:** NestJS 11 + TypeORM + bcryptjs + class-validator (server); Next.js 15 + zustand 5 (persist middleware) + Vitest (web); Expo 54 + react-hook-form + zod (mobile).

**Reference:** [master roadmap](2026-07-13-aura-master-roadmap.md) · [checklist](../../frontend-functionality-checklist.md) · [Plan 01](2026-07-13-aura-01-foundation.md)

**Run each `npm` command from the relevant package dir** (`server/`, `web/`, `mobile/`), not the repo root.

---

## File structure

| File | Responsibility |
|---|---|
| `server/src/auth/client-auth/dto/register-client.dto.ts` (create) | Register payload validation (firstname/lastname/email/password/password_confirmation/city) |
| `server/src/auth/client-auth/dto/forgot-password.dto.ts` (create) | Forgot-password payload validation (email) |
| `server/src/auth/client-auth/client-auth.service.ts` (create) | register/login/logout/refresh/profile/checkToken/forgotPassword business logic |
| `server/src/auth/client-auth/client-auth.controller.ts` (create) | `@Controller('client')` — routes `/api/client/*` |
| `server/src/auth/client-auth/client-auth.module.ts` (create) | Wires controller + service (no `imports`; `User`/`Client` repos already global via `AuthModule`) |
| `server/src/app.module.ts` (modify) | Register `ClientAuthModule` |
| `server/test/client-auth.e2e-spec.ts` (create) | Full e2e coverage: register, login, protected routes, forgot-password |
| `web/lib/auth-store.js` (create) | Zustand + persist auth store: `token`, `client`, `setSession()`, `signOut()` |
| `web/lib/auth-store.test.js` (create) | Vitest unit tests for the store |
| `web/app/(site)/connexion/page.jsx` (modify) | Real controlled login form |
| `web/app/(site)/inscription/page.jsx` (modify) | Real controlled registration form (client role only; praticien role links out) |
| `web/components/modals/AuthModal.jsx` (modify) | Real login/signup/forgot modal (used by `SiteNav`'s header buttons) |
| `web/app/(site)/compte/layout.jsx` (modify) | Client-side auth guard for `/compte/*` |
| `web/components/layout/AccountNav.jsx` (modify) | Add a real "Se déconnecter" action |
| `web/app/(site)/mot-de-passe-oublie/page.jsx` (modify) | Real controlled forgot-password form |
| `mobile/app/onboarding/auth.tsx` (modify) | Login/signup mode toggle; wire submit to the real endpoints |
| `mobile/app/onboarding/role.tsx` (modify) | "Se connecter" link now routes to login mode instead of reusing the signup flow |

---

## Task 1: Backend — `ClientAuthModule` DTOs + register + login

**Files:**
- Create: `server/src/auth/client-auth/dto/register-client.dto.ts`
- Create: `server/src/auth/client-auth/client-auth.service.ts`
- Create: `server/src/auth/client-auth/client-auth.controller.ts`
- Create: `server/src/auth/client-auth/client-auth.module.ts`
- Test: `server/test/client-auth.e2e-spec.ts`

- [ ] **Step 1: Write the failing e2e tests**

Create `server/test/client-auth.e2e-spec.ts`:

```typescript
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { createTestApp, seedClientUser, signToken } from './utils/create-test-app';
import { ClientAuthModule } from '../src/auth/client-auth/client-auth.module';
import { User } from '../src/database/entities/user.entity';
import { Client } from '../src/database/entities/client.entity';

describe('client auth', () => {
  let app: INestApplication;
  beforeAll(async () => { app = await createTestApp({ imports: [ClientAuthModule] }); });
  afterAll(async () => { await app.close(); });
  const http = () => request(app.getHttpServer());

  it('POST /api/client/register creates a users row + a linked clients row and returns a token', async () => {
    const res = await http().post('/api/client/register').send({
      firstname: 'Camille', lastname: 'Rossi', email: 'camille@aura.io',
      password: 'secret123', password_confirmation: 'secret123', city: 'Lyon',
    }).expect(201);
    expect(res.body.status).toBe('success');
    expect(res.body.message).toBe('Compte créé avec succès');
    expect(res.body.data.user).toMatchObject({ name: 'Camille Rossi', email: 'camille@aura.io', is_admin: false });
    expect(res.body.data.user.password).toBeUndefined();
    expect(res.body.data.client).toMatchObject({
      firstname: 'Camille', lastname: 'Rossi', email: 'camille@aura.io', city: 'Lyon',
    });
    expect(res.body.data.token_type).toBe('bearer');
    expect(res.body.data.expires_in).toBe(3600);

    const ds = app.get(DataSource);
    const user = await ds.getRepository(User).findOneByOrFail({ email: 'camille@aura.io' });
    const client = await ds.getRepository(Client).findOneByOrFail({ email: 'camille@aura.io' });
    expect(user.is_admin).toBe(false);
    expect(client.city).toBe('Lyon');
  });

  it('register rejects a duplicate email with a 422 envelope', async () => {
    const res = await http().post('/api/client/register').send({
      firstname: 'Camille', lastname: 'Autre', email: 'camille@aura.io',
      password: 'secret123', password_confirmation: 'secret123', city: 'Paris',
    }).expect(422);
    expect(res.body).toMatchObject({ status: 'error', message: 'Erreur de validation' });
    expect(res.body.errors.email).toEqual(['Cette adresse email est déjà utilisée.']);
  });

  it('register rejects mismatched password confirmation', async () => {
    const res = await http().post('/api/client/register').send({
      firstname: 'X', lastname: 'Y', email: 'x@aura.io',
      password: 'secret123', password_confirmation: 'nope', city: 'Nice',
    }).expect(422);
    expect(res.body.errors.password_confirmation).toBeDefined();
  });

  it('login: wrong password 401, non-client user 403, valid client 200', async () => {
    const bad = await http().post('/api/client/login')
      .send({ email: 'camille@aura.io', password: 'wrong' }).expect(401);
    expect(bad.body.message).toBe('Les identifiants sont incorrects.');

    const ds = app.get(DataSource);
    await ds.getRepository(User).save({
      name: 'No Client', email: 'noclient@aura.io',
      password: await bcrypt.hash('password123', 10), is_admin: false,
    });
    const forb = await http().post('/api/client/login')
      .send({ email: 'noclient@aura.io', password: 'password123' }).expect(403);
    expect(forb.body.message).toBe("Vous n'êtes pas autorisé à vous connecter en tant que client.");

    const ok = await http().post('/api/client/login')
      .send({ email: 'camille@aura.io', password: 'secret123' }).expect(200);
    expect(ok.body.message).toBe('Connexion réussie');
    expect(ok.body.data.client.firstname).toBe('Camille');
    expect(ok.body.data.user.last_login_at).toBeTruthy();
  });
});
```

(`seedClientUser` and `signToken` are imported now because Task 2 reuses them in the same `describe` block; unused-import errors would only appear once ts-jest actually runs Task 2's additions — for this step's isolated run, `seedClientUser` is unused so far. That's fine: it will be used by the end of Task 2, and TypeScript does not error on unused imports by default in this project's `tsconfig` — only `noUnusedLocals`-style linting would, and this repo's `test:e2e` runs through `ts-jest`, not a separate lint gate.)

- [ ] **Step 2: Run the tests to verify they fail**

Run (in `server/`): `npm run test:e2e -- client-auth.e2e-spec.ts`
Expected: FAIL — `Cannot find module '../src/auth/client-auth/client-auth.module'`.

- [ ] **Step 3: Write the register DTO**

Create `server/src/auth/client-auth/dto/register-client.dto.ts`:

```typescript
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import { Match } from '../../../common/match.decorator';

export class RegisterClientDto {
  @IsString() @MaxLength(255) firstname: string;
  @IsString() @MaxLength(255) lastname: string;
  @IsEmail() email: string;
  @IsString() @MinLength(8) password: string;
  @IsString() @Match('password') password_confirmation: string;
  @IsString() @MaxLength(255) city: string;
}
```

- [ ] **Step 4: Write the service**

Create `server/src/auth/client-auth/client-auth.service.ts`:

```typescript
import {
  ForbiddenException, Injectable, UnauthorizedException, UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import type { Request } from 'express';
import { User } from '../../database/entities/user.entity';
import { Client } from '../../database/entities/client.entity';
import { HashService } from '../hash.service';
import { TokenService } from '../token.service';
import { sanitizeUser } from '../user.util';
import { success } from '../../common/envelope';
import { RegisterClientDto } from './dto/register-client.dto';
import { LoginDto } from '../admin-auth/dto/login.dto';

@Injectable()
export class ClientAuthService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Client) private readonly clients: Repository<Client>,
    private readonly dataSource: DataSource,
    private readonly hash: HashService,
    private readonly tokens: TokenService,
  ) {}

  private validationError(errors: Record<string, string[]>): never {
    throw new UnprocessableEntityException({
      status: 'error', message: 'Erreur de validation', errors,
    });
  }

  async register(dto: RegisterClientDto) {
    if (await this.users.findOneBy({ email: dto.email })) {
      this.validationError({ email: ['Cette adresse email est déjà utilisée.'] });
    }
    if (await this.clients.findOneBy({ email: dto.email })) {
      this.validationError({ email: ['Cette adresse email est déjà utilisée.'] });
    }

    // One transaction so a mid-way failure never leaves an orphaned User or
    // Client row behind — same fix praticien-auth.service.ts applies to its
    // User+Praticien dual-write.
    const { user, client } = await this.dataSource.transaction(async (em) => {
      const user = await em.getRepository(User).save({
        name: `${dto.firstname} ${dto.lastname}`,
        email: dto.email,
        password: await this.hash.hash(dto.password),
        is_admin: false,
      });
      const client = await em.getRepository(Client).save({
        firstname: dto.firstname,
        lastname: dto.lastname,
        email: dto.email,
        city: dto.city,
      });
      return { user, client };
    });

    return success(
      { user: sanitizeUser(user), client, ...this.tokens.tokenPayload(user) },
      'Compte créé avec succès',
    );
  }

  async login(dto: LoginDto, req: Request) {
    const user = await this.users.findOneBy({ email: dto.email });
    if (!user || !(await this.hash.compare(dto.password, user.password))) {
      throw new UnauthorizedException({ status: 'error', message: 'Les identifiants sont incorrects.' });
    }
    const client = await this.clients.findOneBy({ email: user.email });
    if (!client) {
      throw new ForbiddenException({
        status: 'error',
        message: "Vous n'êtes pas autorisé à vous connecter en tant que client.",
      });
    }
    await this.users.update(user.id, { last_login_at: new Date(), ip_address: req.ip });
    const fresh = await this.users.findOneByOrFail({ id: user.id });
    return success(
      { user: sanitizeUser(fresh), client, ...this.tokens.tokenPayload(fresh) },
      'Connexion réussie',
    );
  }
}
```

- [ ] **Step 5: Write the controller**

Create `server/src/auth/client-auth/client-auth.controller.ts`:

```typescript
import { Body, Controller, HttpCode, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { ClientAuthService } from './client-auth.service';
import { RegisterClientDto } from './dto/register-client.dto';
import { LoginDto } from '../admin-auth/dto/login.dto';

@Controller('client')
export class ClientAuthController {
  constructor(private readonly service: ClientAuthService) {}

  @Post('register')
  register(@Body() dto: RegisterClientDto) { return this.service.register(dto); }

  @HttpCode(200)
  @Post('login')
  login(@Body() dto: LoginDto, @Req() req: Request) { return this.service.login(dto, req); }
}
```

- [ ] **Step 6: Write the module**

Create `server/src/auth/client-auth/client-auth.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { ClientAuthController } from './client-auth.controller';
import { ClientAuthService } from './client-auth.service';

@Module({ controllers: [ClientAuthController], providers: [ClientAuthService] })
export class ClientAuthModule {}
```

No `imports` array is needed: `AuthModule` is `@Global()` and already runs `TypeOrmModule.forFeature([User, Client])`, exporting `TypeOrmModule` — so `@InjectRepository(User)` / `@InjectRepository(Client)` resolve anywhere without redeclaring `forFeature`. This mirrors `admin-auth.module.ts` exactly (compare: `praticien-auth.module.ts` DOES declare `TypeOrmModule.forFeature([Praticien, PraticienDocument])`, because those two entities are *not* covered by `AuthModule`'s global registration).

- [ ] **Step 7: Run the tests to verify they pass**

Run (in `server/`): `npm run test:e2e -- client-auth.e2e-spec.ts`
Expected: PASS (4 tests).

- [ ] **Step 8: Commit**

```bash
git add server/src/auth/client-auth/dto/register-client.dto.ts server/src/auth/client-auth/client-auth.service.ts server/src/auth/client-auth/client-auth.controller.ts server/src/auth/client-auth/client-auth.module.ts server/test/client-auth.e2e-spec.ts
git commit -m "feat(server): add client register and login endpoints"
```

---

## Task 2: Backend — logout, refresh, profile, check-token, forgot-password + app registration

**Files:**
- Modify: `server/src/auth/client-auth/client-auth.service.ts`
- Modify: `server/src/auth/client-auth/client-auth.controller.ts`
- Modify: `server/src/app.module.ts`
- Create: `server/src/auth/client-auth/dto/forgot-password.dto.ts`
- Test: `server/test/client-auth.e2e-spec.ts`

- [ ] **Step 1: Extend the e2e spec with failing tests**

In `server/test/client-auth.e2e-spec.ts`, add these three tests before the closing `});` of the `describe` block:

```typescript
  it('protected routes: profile, check-token, refresh, logout', async () => {
    const { client, token } = await seedClientUser(app, 'proto@aura.io');
    await http().get('/api/client/profile').expect(401);

    const prof = await http().get('/api/client/profile')
      .set('Authorization', `Bearer ${token}`).expect(200);
    expect(prof.body.data.user.email).toBe('proto@aura.io');
    expect(prof.body.data.client).toMatchObject({ id: client.id, email: 'proto@aura.io' });

    const chk = await http().get('/api/client/check-token')
      .set('Authorization', `Bearer ${token}`).expect(200);
    expect(chk.body.message).toBe('Token client valide');

    const ref = await http().post('/api/client/refresh')
      .set('Authorization', `Bearer ${token}`).expect(200);
    expect(ref.body.data.token).toBeTruthy();

    const out = await http().post('/api/client/logout')
      .set('Authorization', `Bearer ${token}`).expect(200);
    expect(out.body.message).toBe('Déconnexion réussie');
  });

  it('profile/check-token reject a non-client user with 403', async () => {
    const ds = app.get(DataSource);
    const lone = await ds.getRepository(User).save({
      name: 'Lone User', email: 'lone@aura.io',
      password: await bcrypt.hash('password123', 10), is_admin: false,
    });
    const token = signToken(app, lone);
    await http().get('/api/client/profile').set('Authorization', `Bearer ${token}`).expect(403);
    await http().get('/api/client/check-token').set('Authorization', `Bearer ${token}`).expect(403);
  });

  it('forgot-password always returns the same generic message (no user enumeration)', async () => {
    const known = await http().post('/api/client/forgot-password')
      .send({ email: 'camille@aura.io' }).expect(200);
    const unknown = await http().post('/api/client/forgot-password')
      .send({ email: 'nobody@aura.io' }).expect(200);
    expect(known.body.message).toBe(unknown.body.message);
    expect(known.body.message).toBe(
      'Si un compte existe avec cette adresse email, vous recevrez un lien de réinitialisation.',
    );

    const bad = await http().post('/api/client/forgot-password').send({ email: 'not-an-email' }).expect(422);
    expect(bad.body.errors.email).toBeDefined();
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run (in `server/`): `npm run test:e2e -- client-auth.e2e-spec.ts`
Expected: FAIL — 401/404-style failures on `/api/client/profile`, `/api/client/check-token`, `/api/client/refresh`, `/api/client/logout`, `/api/client/forgot-password` (routes don't exist yet).

- [ ] **Step 3: Write the forgot-password DTO**

Create `server/src/auth/client-auth/dto/forgot-password.dto.ts`:

```typescript
import { IsEmail } from 'class-validator';

export class ForgotPasswordDto {
  @IsEmail() email: string;
}
```

- [ ] **Step 4: Extend the service**

In `server/src/auth/client-auth/client-auth.service.ts`, add the import:

```typescript
import { ForgotPasswordDto } from './dto/forgot-password.dto';
```

Then add these methods at the end of the `ClientAuthService` class, after `login()` and before the closing `}`:

```typescript
  logout() { return success(undefined, 'Déconnexion réussie'); }
  refresh(user: User) { return success(this.tokens.tokenPayload(user)); }

  profile(user: User, client: Client) {
    return success({ user: sanitizeUser(user), client });
  }

  checkToken(user: User, client: Client) {
    return success({ user: sanitizeUser(user), client }, 'Token client valide');
  }

  // Deliberately does not check whether the email exists, and does not send
  // anything yet (no email infrastructure decision has been made) — always
  // returns the same generic message so this endpoint cannot be used to
  // enumerate registered accounts.
  forgotPassword(_dto: ForgotPasswordDto) {
    return success(
      undefined,
      'Si un compte existe avec cette adresse email, vous recevrez un lien de réinitialisation.',
    );
  }
```

`profile`/`checkToken` take `client` as a parameter rather than re-querying it, because the controller resolves it via `ClientGuard` (see Step 5) — the same resolution `ClientGuard` already does for every other client-scoped route in the app, so the service does not duplicate that lookup.

- [ ] **Step 5: Extend the controller**

Replace the full contents of `server/src/auth/client-auth/client-auth.controller.ts`:

```typescript
import { Body, Controller, Get, HttpCode, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { ClientAuthService } from './client-auth.service';
import { RegisterClientDto } from './dto/register-client.dto';
import { LoginDto } from '../admin-auth/dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { ClientGuard } from '../guards/client.guard';
import { CurrentUser, CurrentClient } from '../decorators';
import { User } from '../../database/entities/user.entity';
import { Client } from '../../database/entities/client.entity';

@Controller('client')
export class ClientAuthController {
  constructor(private readonly service: ClientAuthService) {}

  @Post('register')
  register(@Body() dto: RegisterClientDto) { return this.service.register(dto); }

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

  @UseGuards(JwtAuthGuard, ClientGuard)
  @Get('profile')
  profile(@CurrentUser() user: User, @CurrentClient() client: Client) {
    return this.service.profile(user, client);
  }

  @UseGuards(JwtAuthGuard, ClientGuard)
  @Get('check-token')
  checkToken(@CurrentUser() user: User, @CurrentClient() client: Client) {
    return this.service.checkToken(user, client);
  }

  @HttpCode(200)
  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) { return this.service.forgotPassword(dto); }
}
```

- [ ] **Step 6: Register the module in `app.module.ts`**

Replace the full contents of `server/src/app.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { buildDataSourceOptions } from './database/typeorm.config';
import { AuthModule } from './auth/auth.module';
import { AdminAuthModule } from './auth/admin-auth/admin-auth.module';
import { PraticienAuthModule } from './auth/praticien-auth/praticien-auth.module';
import { PraticienVerificationModule } from './auth/praticien-verification/praticien-verification.module';
import { ClientAuthModule } from './auth/client-auth/client-auth.module';
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
    ClientAuthModule,
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
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

- [ ] **Step 7: Run the tests to verify they pass**

Run (in `server/`): `npm run test:e2e -- client-auth.e2e-spec.ts`
Expected: PASS (7 tests total in the file).

- [ ] **Step 8: Run the full e2e suite to check for regressions**

Run (in `server/`): `npm run test:e2e`
Expected: PASS (no other suite depends on the absence of `/api/client/*`, and `ClientsModule` at `@Controller('clients')` — plural — does not collide with the new `@Controller('client')` singular routes).

- [ ] **Step 9: Commit**

```bash
git add server/src/auth/client-auth/client-auth.service.ts server/src/auth/client-auth/client-auth.controller.ts server/src/auth/client-auth/dto/forgot-password.dto.ts server/src/app.module.ts server/test/client-auth.e2e-spec.ts
git commit -m "feat(server): add client logout, refresh, profile, check-token, forgot-password"
```

---

## Task 3: Web — `auth-store.js` + Vitest tests

**Files:**
- Create: `web/lib/auth-store.js`, `web/lib/auth-store.test.js`

- [ ] **Step 1: Write the failing test**

Create `web/lib/auth-store.test.js`:

```javascript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api, setAuthToken } from './api';
import { useAuthStore } from './auth-store';

function mockFetch(status, body) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    text: async () => (body === undefined ? '' : JSON.stringify(body)),
  });
}

function mockLocalStorage() {
  let store = {};
  return {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
  };
}

describe('web auth store', () => {
  beforeEach(() => {
    global.localStorage = mockLocalStorage();
    setAuthToken(null);
    useAuthStore.setState({ token: null, client: null, hasHydrated: false });
  });

  it('setSession stores the token/client and pushes the token into the api client', async () => {
    const client = { id: 1, firstname: 'Sarah' };
    useAuthStore.getState().setSession('tok123', client);

    expect(useAuthStore.getState().token).toBe('tok123');
    expect(useAuthStore.getState().client).toEqual(client);

    global.fetch = mockFetch(200, { status: 'success', data: {} });
    await api.get('/client/profile');
    const [, opts] = global.fetch.mock.calls[0];
    expect(opts.headers.Authorization).toBe('Bearer tok123');
  });

  it('signOut clears the token/client and the api client bearer token', async () => {
    useAuthStore.getState().setSession('tok123', { id: 1 });
    useAuthStore.getState().signOut();

    expect(useAuthStore.getState().token).toBeNull();
    expect(useAuthStore.getState().client).toBeNull();

    global.fetch = mockFetch(200, { status: 'success', data: {} });
    await api.get('/client/profile');
    const [, opts] = global.fetch.mock.calls[0];
    expect(opts.headers.Authorization).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run (in `web/`): `npm test`
Expected: FAIL — `./auth-store` does not exist ("Failed to resolve import").

- [ ] **Step 3: Write the store**

Create `web/lib/auth-store.js`:

```javascript
'use client';

// Web auth store. Mirrors mobile/src/store/session.ts's token/setToken/signOut
// shape: persists { token, client } to localStorage and keeps web/lib/api.js's
// in-memory bearer token in sync.
//
// skipHydration + a manual rehydrate() call (see compte/layout.jsx) is used
// instead of the default auto-hydration, for two reasons:
//   1. Next.js renders this 'use client' module's first pass on the server,
//      where `localStorage` does not exist — auto-hydration would read
//      storage synchronously at store-creation time and crash SSR.
//   2. Even client-side, hydrating synchronously at import time would make
//      the very first client render differ from the server-rendered HTML
//      (a hydration mismatch) on any component that reads `token` on mount —
//      exactly what the /compte guard does.
// Deferring hydration to an effect (after the first render matches SSR)
// avoids both problems. This also means importing this module never touches
// `localStorage`, so it loads cleanly under Vitest's plain `node` environment.
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { setAuthToken } from './api';

export const useAuthStore = create(
  persist(
    (set) => ({
      token: null,
      client: null,
      hasHydrated: false,
      // setSession/signOut also force hasHydrated: true. Both are the result
      // of an explicit, authoritative action (a successful login/register
      // call, or a deliberate sign-out) — there is no need to wait for a
      // storage read to "confirm" state we just set ourselves. Without this,
      // a fresh login immediately followed by navigating to /compte would
      // show a needless "Chargement…" flash until rehydrate() caught up.
      setSession: (token, client) => {
        setAuthToken(token);
        set({ token, client, hasHydrated: true });
      },
      signOut: () => {
        setAuthToken(null);
        set({ token: null, client: null, hasHydrated: true });
      },
      setHasHydrated: (value) => set({ hasHydrated: value }),
    }),
    {
      name: 'aura.auth',
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      onRehydrateStorage: () => (state) => {
        if (state?.token) setAuthToken(state.token);
        state?.setHasHydrated(true);
      },
    },
  ),
);
```

- [ ] **Step 4: Run the test to verify it passes**

Run (in `web/`): `npm test`
Expected: PASS (2 new tests; existing `api.test.js` tests still pass too).

- [ ] **Step 5: Commit**

```bash
git add web/lib/auth-store.js web/lib/auth-store.test.js
git commit -m "feat(web): add auth store with localStorage persistence"
```

---

## Task 4: Web — wire `connexion` page

**Files:**
- Modify: `web/app/(site)/connexion/page.jsx`

- [ ] **Step 1: Replace the page with a real controlled form**

Replace the full contents of `web/app/(site)/connexion/page.jsx`:

```jsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { Lotus } from '@/components/ui/Lotus';
import { ModalButton } from '@/components/ui/ModalButton';
import { api, ApiError } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { useUI } from '@/lib/store';

const POINTS = [
  'Praticiens vérifiés un par un',
  'Paiement protégé, versé après la séance',
  'Messagerie sécurisée avant de réserver',
];

export default function ConnexionPage() {
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);
  const toast = useUI((s) => s.toast);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api.post('/client/login', { email, password });
      setSession(res.data.token, res.data.client);
      toast('Bienvenue', 'success');
      router.push('/compte');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="section">
      <div className="container">
        <div className="card" style={{ overflow: 'hidden', padding: 0, maxWidth: 960, margin: '0 auto' }}>
          <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 0, alignItems: 'stretch' }}>
            {/* Aurora welcome panel */}
            <div
              className="aurora-dark grain reveal hide-sm"
              style={{ '--orb-x': '30%', '--orb-y': '20%', '--orb-1': '#C4B0E8', '--orb-2': '#7B5FCF', padding: '48px 40px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
            >
              <div className="row gap-2">
                <Lotus size={22} color="#fff" />
                <span className="serif" style={{ color: '#fff', fontSize: 22, letterSpacing: '.04em' }}>AURA</span>
              </div>
              <div>
                <h2 className="h-1" style={{ color: '#fff', marginBottom: 14 }}>
                  Ravie de vous <span className="italic" style={{ color: 'var(--violet)' }}>revoir</span>.
                </h2>
                <p className="lead" style={{ color: 'rgba(255,255,255,0.82)', marginBottom: 24 }}>
                  Retrouvez vos praticiens, vos réservations et vos échanges, en toute sérénité.
                </p>
                <ul className="stack gap-3" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {POINTS.map((t) => (
                    <li key={t} className="row gap-2" style={{ color: 'rgba(255,255,255,0.9)' }}>
                      <Icon name="checkCircle" size={18} color="var(--violet)" /> <span className="small">{t}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <p className="tiny" style={{ color: 'rgba(255,255,255,0.55)' }}>Un espace doux, respectueux, sans jugement.</p>
            </div>

            {/* Form panel */}
            <div className="card-pad reveal r-1" style={{ padding: '48px 40px' }}>
              <span className="eyebrow">Connexion</span>
              <h1 className="h-2" style={{ margin: '6px 0 22px' }}>Se connecter</h1>

              <form onSubmit={submit}>
                {error && (
                  <p className="small" style={{ color: 'var(--danger, #b5524f)', marginBottom: 14 }}>{error}</p>
                )}
                <div className="field">
                  <label>Adresse email</label>
                  <input
                    className="input" type="email" placeholder="vous@exemple.fr" autoComplete="email" required
                    value={email} onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="field">
                  <div className="between">
                    <label>Mot de passe</label>
                    <Link href="/mot-de-passe-oublie" className="tiny" style={{ color: 'var(--violet-2)' }}>Oublié ?</Link>
                  </div>
                  <input
                    className="input" type="password" placeholder="••••••••" autoComplete="current-password" required
                    value={password} onChange={(e) => setPassword(e.target.value)}
                  />
                </div>

                <label className="row gap-2 small" style={{ margin: '4px 0 18px', cursor: 'pointer' }}>
                  <input type="checkbox" className="checkbox" /> Rester connecté(e)
                </label>

                <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={loading}>
                  {loading ? 'Connexion…' : 'Se connecter'}
                </button>
              </form>

              <div className="row gap-3" style={{ alignItems: 'center', margin: '20px 0' }}>
                <div className="divider flex-1" style={{ margin: 0 }} />
                <span className="tiny muted">ou</span>
                <div className="divider flex-1" style={{ margin: 0 }} />
              </div>

              <ModalButton modal="login" className="btn btn-soft btn-block">
                <span className="row gap-2"><Icon name="mail" size={16} /> Continuer avec Google</span>
              </ModalButton>

              <p className="small center" style={{ marginTop: 24 }}>
                Pas encore de compte ?{' '}
                <Link href="/inscription" style={{ color: 'var(--violet-2)', fontWeight: 600 }}>Créer un compte</Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
```

Two deliberate scope notes:
- "Rester connecté(e)" stays a decorative checkbox: the backend issues one fixed-TTL JWT (`JWT_TTL_MINUTES`), there is no shorter-lived-vs-remembered token variant to switch between.
- "Continuer avec Google" keeps its existing `<ModalButton modal="login">` wrapper unchanged — it already opens the same login modal `AuthModal` wires for real in Task 6, so no separate OAuth integration is needed or in scope here.

- [ ] **Step 2: Verify the build compiles**

Run (in `web/`): `npm run build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add web/app/\(site\)/connexion/page.jsx
git commit -m "feat(web): wire connexion page to real login"
```

---

## Task 5: Web — wire `inscription` page

**Files:**
- Modify: `web/app/(site)/inscription/page.jsx`

The current page collects one "Nom complet" field, no city, no password confirmation — none of which match `RegisterClientDto`. The role selector (client/praticien) stays, but only the client path is wired for real: praticien registration needs 5 document uploads and many more fields (see `praticien-auth`), which is out of this plan's scope, so picking "Je suis praticien" swaps the CTA for a link to the existing `/devenir-praticien` page instead of attempting a mismatched submit.

- [ ] **Step 1: Replace the page with a real controlled form**

Replace the full contents of `web/app/(site)/inscription/page.jsx`:

```jsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { Lotus } from '@/components/ui/Lotus';
import { api, ApiError } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { useUI } from '@/lib/store';

const ROLES = [
  { key: 'client', icon: 'heart', title: 'Je cherche un praticien', desc: 'Trouvez, échangez et réservez des séances en toute confiance.' },
  { key: 'praticien', icon: 'sparkle', title: 'Je suis praticien', desc: 'Recevez des demandes, gérez votre agenda, développez votre activité.' },
];

const PERKS = [
  'Inscription gratuite, sans engagement',
  'Vos données protégées et confidentielles',
  'Annulation gratuite jusqu’à 24h avant',
];

export default function InscriptionPage() {
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);
  const toast = useUI((s) => s.toast);
  const [role, setRole] = useState('client');
  const [firstname, setFirstname] = useState('');
  const [lastname, setLastname] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    setLoading(true);
    try {
      const res = await api.post('/client/register', {
        firstname, lastname, email, city,
        password, password_confirmation: passwordConfirmation,
      });
      setSession(res.data.token, res.data.client);
      toast('Compte créé', 'success');
      router.push('/compte');
    } catch (err) {
      if (err instanceof ApiError && err.status === 422) {
        setFieldErrors(err.body?.errors ?? {});
        setError('Merci de corriger les champs indiqués.');
      } else {
        setError(err instanceof ApiError ? err.message : 'Une erreur est survenue');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="section">
      <div className="container">
        <div className="card" style={{ overflow: 'hidden', padding: 0, maxWidth: 960, margin: '0 auto' }}>
          <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 0, alignItems: 'stretch' }}>
            {/* Aurora panel */}
            <div
              className="aurora-dark grain reveal hide-sm"
              style={{ '--orb-x': '70%', '--orb-y': '25%', '--orb-1': '#C4B0E8', '--orb-2': '#7B5FCF', padding: '48px 40px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
            >
              <div className="row gap-2">
                <Lotus size={22} color="#fff" />
                <span className="serif" style={{ color: '#fff', fontSize: 22, letterSpacing: '.04em' }}>AURA</span>
              </div>
              <div>
                <h2 className="h-1" style={{ color: '#fff', marginBottom: 14 }}>
                  Rejoignez un lieu de <span className="italic" style={{ color: 'var(--violet)' }}>confiance</span>.
                </h2>
                <p className="lead" style={{ color: 'rgba(255,255,255,0.82)', marginBottom: 24 }}>
                  Des milliers de personnes prennent soin d’elles autrement. À votre tour.
                </p>
                <ul className="stack gap-3" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {PERKS.map((t) => (
                    <li key={t} className="row gap-2" style={{ color: 'rgba(255,255,255,0.9)' }}>
                      <Icon name="checkCircle" size={18} color="var(--violet)" /> <span className="small">{t}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <p className="tiny" style={{ color: 'rgba(255,255,255,0.55)' }}>2 400+ praticiens vérifiés vous attendent.</p>
            </div>

            {/* Form panel */}
            <div className="card-pad reveal r-1" style={{ padding: '48px 40px' }}>
              <span className="eyebrow">Inscription</span>
              <h1 className="h-2" style={{ margin: '6px 0 18px' }}>Créer un compte</h1>

              {/* Role choice */}
              <div className="stack gap-3" style={{ marginBottom: 22 }}>
                {ROLES.map((r) => {
                  const active = role === r.key;
                  return (
                    <button
                      key={r.key}
                      type="button"
                      onClick={() => setRole(r.key)}
                      className="card card-pad card-hover"
                      style={{
                        textAlign: 'left', cursor: 'pointer', padding: '14px 16px',
                        border: `1.5px solid ${active ? 'var(--violet-2)' : 'var(--line)'}`,
                        background: active ? 'rgba(164,139,216,0.08)' : 'var(--card)',
                      }}
                    >
                      <div className="row gap-3" style={{ alignItems: 'center' }}>
                        <span className="tile-icon tint-violet"><Icon name={r.icon} size={18} color="var(--violet-2)" /></span>
                        <div className="flex-1">
                          <div className="serif" style={{ fontSize: 16 }}>{r.title}</div>
                          <div className="tiny muted">{r.desc}</div>
                        </div>
                        {active && <Icon name="checkCircle" size={20} color="var(--violet-2)" />}
                      </div>
                    </button>
                  );
                })}
              </div>

              {role === 'praticien' ? (
                <>
                  <p className="small" style={{ marginBottom: 18 }}>
                    L’inscription praticien se fait sur un parcours dédié (vérification de documents, tarifs, disciplines).
                  </p>
                  <Link href="/devenir-praticien" className="btn btn-primary btn-block btn-lg">
                    Devenir praticien
                  </Link>
                </>
              ) : (
                <form onSubmit={submit}>
                  {error && (
                    <p className="small" style={{ color: 'var(--danger, #b5524f)', marginBottom: 14 }}>{error}</p>
                  )}
                  <div className="field">
                    <label>Prénom</label>
                    <input className="input" type="text" placeholder="Prénom" autoComplete="given-name" required value={firstname} onChange={(e) => setFirstname(e.target.value)} />
                    {fieldErrors.firstname && <p className="tiny" style={{ color: 'var(--danger, #b5524f)' }}>{fieldErrors.firstname[0]}</p>}
                  </div>
                  <div className="field">
                    <label>Nom</label>
                    <input className="input" type="text" placeholder="Nom" autoComplete="family-name" required value={lastname} onChange={(e) => setLastname(e.target.value)} />
                    {fieldErrors.lastname && <p className="tiny" style={{ color: 'var(--danger, #b5524f)' }}>{fieldErrors.lastname[0]}</p>}
                  </div>
                  <div className="field">
                    <label>Adresse email</label>
                    <input className="input" type="email" placeholder="vous@exemple.fr" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                    {fieldErrors.email && <p className="tiny" style={{ color: 'var(--danger, #b5524f)' }}>{fieldErrors.email[0]}</p>}
                  </div>
                  <div className="field">
                    <label>Ville</label>
                    <input className="input" type="text" placeholder="Paris" autoComplete="address-level2" required value={city} onChange={(e) => setCity(e.target.value)} />
                    {fieldErrors.city && <p className="tiny" style={{ color: 'var(--danger, #b5524f)' }}>{fieldErrors.city[0]}</p>}
                  </div>
                  <div className="field">
                    <label>Mot de passe</label>
                    <input className="input" type="password" placeholder="8 caractères minimum" autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
                  </div>
                  <div className="field">
                    <label>Confirmer le mot de passe</label>
                    <input className="input" type="password" placeholder="8 caractères minimum" autoComplete="new-password" required value={passwordConfirmation} onChange={(e) => setPasswordConfirmation(e.target.value)} />
                    {fieldErrors.password_confirmation && <p className="tiny" style={{ color: 'var(--danger, #b5524f)' }}>{fieldErrors.password_confirmation[0]}</p>}
                  </div>

                  <label className="row gap-2 tiny muted" style={{ margin: '4px 0 18px', cursor: 'pointer' }}>
                    <input type="checkbox" className="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} required />
                    J’accepte les conditions générales et la politique de confidentialité.
                  </label>

                  <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={loading || !accepted}>
                    {loading ? 'Création…' : 'Créer mon compte'}
                  </button>
                </form>
              )}

              <p className="small center" style={{ marginTop: 24 }}>
                Déjà inscrit(e) ?{' '}
                <Link href="/connexion" style={{ color: 'var(--violet-2)', fontWeight: 600 }}>Se connecter</Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Verify the build compiles**

Run (in `web/`): `npm run build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add web/app/\(site\)/inscription/page.jsx
git commit -m "feat(web): wire inscription page to real client registration"
```

---

## Task 6: Web — wire `AuthModal`

**Files:**
- Modify: `web/components/modals/AuthModal.jsx`

`AuthModal` is opened directly by `SiteNav`'s header "Connexion"/"Commencer" buttons (`open('login')` / `open('signup')`, registered in `web/components/modals/registry.jsx`) — a separate entry point from the standalone pages wired in Tasks 4–5, so it needs its own real submit logic. Its signup mode must collect the same fields `RegisterClientDto` requires (firstname/lastname/email/city/password/password_confirmation) since it calls the same endpoint — this makes the modal's signup form larger than before, which is an unavoidable consequence of the fixed DTO contract, not a design embellishment.

- [ ] **Step 1: Replace the modal with real submit logic**

Replace the full contents of `web/components/modals/AuthModal.jsx`:

```jsx
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Modal } from './Modal';
import { useUI } from '@/lib/store';
import { api, ApiError } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';

/** Login / signup / forgot, switchable. Calls the real client-auth endpoints. */
export function AuthModal({ id, mode: initial = 'login' }) {
  const [mode, setMode] = useState(initial);
  const close = useUI((s) => s.closeModal);
  const toast = useUI((s) => s.toast);
  const setSession = useAuthStore((s) => s.setSession);
  const router = useRouter();

  const [firstname, setFirstname] = useState('');
  const [lastname, setLastname] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === 'forgot') {
        const res = await api.post('/client/forgot-password', { email });
        toast(res.message || 'Email de réinitialisation envoyé', 'success');
        close(id);
        return;
      }
      if (mode === 'signup') {
        const res = await api.post('/client/register', {
          firstname, lastname, email, city, password, password_confirmation: passwordConfirmation,
        });
        setSession(res.data.token, res.data.client);
        close(id);
        toast('Compte créé', 'success');
        router.push('/compte');
        return;
      }
      const res = await api.post('/client/login', { email, password });
      setSession(res.data.token, res.data.client);
      close(id);
      toast('Bienvenue', 'success');
      router.push('/compte');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  const title = mode === 'login' ? 'Connexion' : mode === 'signup' ? 'Créer un compte' : 'Mot de passe oublié';
  return (
    <Modal id={id} title={title} subtitle={mode === 'forgot' ? 'Nous vous enverrons un lien de réinitialisation.' : 'Accédez à votre espace Aura.'} size="modal-sm">
      <form onSubmit={submit}>
        {error && <p className="small" style={{ color: 'var(--danger, #b5524f)', marginBottom: 12 }}>{error}</p>}
        {mode === 'signup' && (
          <>
            <div className="field"><label>Prénom</label><input className="input" value={firstname} onChange={(e) => setFirstname(e.target.value)} placeholder="Sarah" required /></div>
            <div className="field"><label>Nom</label><input className="input" value={lastname} onChange={(e) => setLastname(e.target.value)} placeholder="Lemoine" required /></div>
            <div className="field"><label>Ville</label><input className="input" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Paris" required /></div>
          </>
        )}
        <div className="field"><label>Email</label><input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vous@exemple.fr" required /></div>
        {mode !== 'forgot' && (
          <div className="field"><label>Mot de passe</label><input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required /></div>
        )}
        {mode === 'signup' && (
          <div className="field"><label>Confirmer le mot de passe</label><input className="input" type="password" value={passwordConfirmation} onChange={(e) => setPasswordConfirmation(e.target.value)} placeholder="••••••••" required /></div>
        )}
        <button type="submit" className="btn btn-primary btn-block" style={{ marginTop: 6 }} disabled={loading}>
          {loading ? '…' : mode === 'login' ? 'Se connecter' : mode === 'signup' ? "S'inscrire" : 'Envoyer le lien'}
        </button>
      </form>
      <div className="center small" style={{ marginTop: 16 }}>
        {mode === 'login' && <>Pas encore de compte ? <button className="btn-link" onClick={() => { setMode('signup'); setError(null); }}>Créer un compte</button><br /><button className="btn-link" onClick={() => { setMode('forgot'); setError(null); }} style={{ marginTop: 6 }}>Mot de passe oublié ?</button></>}
        {mode === 'signup' && <>Déjà inscrit ? <button className="btn-link" onClick={() => { setMode('login'); setError(null); }}>Se connecter</button></>}
        {mode === 'forgot' && <button className="btn-link" onClick={() => { setMode('login'); setError(null); }}>Retour à la connexion</button>}
      </div>
    </Modal>
  );
}

export default AuthModal;
```

Note the behavior change from the old fake version: `close(id)` now only runs *after* a successful API call, instead of unconditionally at the top of `submit()`. On error, the modal now stays open showing the message so the user can correct and retry — this is a deliberate, necessary change now that submission can actually fail.

- [ ] **Step 2: Verify the build compiles**

Run (in `web/`): `npm run build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add web/components/modals/AuthModal.jsx
git commit -m "feat(web): wire AuthModal login/signup/forgot to real endpoints"
```

---

## Task 7: Web — guard `/compte/*` and wire real logout

**Files:**
- Modify: `web/app/(site)/compte/layout.jsx`
- Modify: `web/components/layout/AccountNav.jsx`

`compte/layout.jsx` has no auth check at all today. It becomes a client component that calls `useAuthStore.persist.rehydrate()` on mount (see Task 3's comment on why hydration is deferred), then redirects to `/connexion` once hydration has completed and no token is present. There is no working logout anywhere on `/compte/*` today (`compte/parametres/page.jsx`'s "Déconnecter tous les appareils" is a different, still-decorative feature — revoking *other* sessions — and is out of scope: this backend issues stateless JWTs with no revocation list, matching how `admin`/`praticien` logout already behave). `AccountNav` — the persistent sidebar on every `/compte/*` page — gets a real "Se déconnecter" action instead.

(Mobile logout is already real — `mobile/app/(tabs)/profil.tsx`'s `handleSignOut` already calls the session store's `signOut()`, built in Plan 01. Nothing to do there.)

- [ ] **Step 1: Add the guard**

Replace the full contents of `web/app/(site)/compte/layout.jsx`:

```jsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AccountNav from '@/components/layout/AccountNav';
import { useAuthStore } from '@/lib/auth-store';

export default function CompteLayout({ children }) {
  const router = useRouter();
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const token = useAuthStore((s) => s.token);

  useEffect(() => {
    useAuthStore.persist.rehydrate();
  }, []);

  useEffect(() => {
    if (hasHydrated && !token) router.replace('/connexion');
  }, [hasHydrated, token, router]);

  if (!hasHydrated || !token) {
    return (
      <div className="container section-sm">
        <p className="small muted center">Chargement…</p>
      </div>
    );
  }

  return (
    <div className="container section-sm">
      <div className="grid" style={{ gridTemplateColumns: '240px 1fr', gap: 28, alignItems: 'start' }}>
        <AccountNav />
        <div>{children}</div>
      </div>
    </div>
  );
}
```

This is a client-side-only guard (no `middleware.js` exists in this repo, and adding one is out of scope for this plan — see Plan 01's findings). Its known trade-off: every `/compte/*` route briefly renders "Chargement…" before the guard resolves, since the server-rendered HTML cannot know localStorage's contents. That's expected and matches the fixed decision to keep this client-side rather than add middleware.

- [ ] **Step 2: Add a real logout action to `AccountNav`**

Replace the full contents of `web/components/layout/AccountNav.jsx`:

```jsx
'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';

const ITEMS = [
  { href: '/compte', label: 'Aperçu', icon: 'home', exact: true },
  { href: '/compte/reservations', label: 'Réservations', icon: 'calendar' },
  { href: '/compte/messages', label: 'Messages', icon: 'message' },
  { href: '/compte/favoris', label: 'Favoris', icon: 'heart' },
  { href: '/compte/avis', label: 'Mes avis', icon: 'star' },
  { href: '/compte/echanges', label: 'Échanges', icon: 'share' },
  { href: '/compte/paiements', label: 'Paiements', icon: 'card' },
  { href: '/compte/parametres', label: 'Paramètres', icon: 'settings' },
];

export default function AccountNav() {
  const pathname = usePathname();
  const router = useRouter();
  const signOut = useAuthStore((s) => s.signOut);
  const active = (it) => (it.exact ? pathname === it.href : pathname.startsWith(it.href));

  const handleSignOut = async () => {
    try { await api.post('/client/logout'); } catch { /* best-effort; clear the local session regardless */ }
    signOut();
    router.replace('/connexion');
  };

  return (
    <nav className="card card-pad" style={{ position: 'sticky', top: 92 }}>
      <div className="stack gap-1">
        {ITEMS.map((it) => (
          <Link key={it.href} href={it.href} className="row gap-3" style={{ padding: '10px 12px', borderRadius: 11, fontSize: 14, fontWeight: 500, background: active(it) ? 'var(--mist)' : 'transparent', color: active(it) ? 'var(--ink)' : 'var(--ink-soft)' }}>
            <Icon name={it.icon} size={17} color={active(it) ? 'var(--violet-2)' : 'var(--muted)'} />{it.label}
          </Link>
        ))}
      </div>
      <div className="divider" style={{ margin: '10px 0' }} />
      <button
        type="button"
        onClick={handleSignOut}
        className="row gap-3"
        style={{ padding: '10px 12px', borderRadius: 11, fontSize: 14, fontWeight: 500, background: 'transparent', color: 'var(--ink-soft)', width: '100%', textAlign: 'left', border: 'none', cursor: 'pointer' }}
      >
        <Icon name="logout" size={17} color="var(--muted)" />Se déconnecter
      </button>
    </nav>
  );
}
```

- [ ] **Step 3: Verify the build compiles**

Run (in `web/`): `npm run build`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add web/app/\(site\)/compte/layout.jsx web/components/layout/AccountNav.jsx
git commit -m "feat(web): guard /compte routes and wire real logout"
```

---

## Task 8: Web — wire `mot-de-passe-oublie` page

**Files:**
- Modify: `web/app/(site)/mot-de-passe-oublie/page.jsx`

Per the fixed decision, this gets a real (but non-emailing) backend endpoint — `POST /api/client/forgot-password`, built in Task 2 — rather than a "coming soon" placeholder. The page below calls it for real.

- [ ] **Step 1: Replace the page with a real controlled form**

Replace the full contents of `web/app/(site)/mot-de-passe-oublie/page.jsx`:

```jsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { Lotus } from '@/components/ui/Lotus';
import { api, ApiError } from '@/lib/api';
import { useUI } from '@/lib/store';

export default function MotDePasseOubliePage() {
  const toast = useUI((s) => s.toast);
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api.post('/client/forgot-password', { email });
      toast(res.message || 'Lien de réinitialisation envoyé — vérifiez vos emails', 'success');
      setSent(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="section">
      <div className="container-narrow" style={{ maxWidth: 480 }}>
        <div className="card card-pad reveal" style={{ padding: '40px 36px' }}>
          <div className="center" style={{ marginBottom: 22 }}>
            <span className="tile-icon tint-violet" style={{ margin: '0 auto 16px' }}>
              <Lotus size={22} color="var(--violet-2)" />
            </span>
            <span className="eyebrow">Mot de passe oublié</span>
            <h1 className="h-2" style={{ margin: '6px 0 8px' }}>
              Pas de <span className="serif-accent">panique</span>
            </h1>
            <p className="body">
              Saisissez votre adresse email : si un compte existe, nous vous enverrons un lien sécurisé pour réinitialiser votre mot de passe.
            </p>
          </div>

          {sent ? (
            <p className="small center" style={{ color: 'var(--ink-soft)' }}>
              Si un compte existe avec cette adresse, un email vient de vous être envoyé.
            </p>
          ) : (
            <form onSubmit={submit}>
              {error && <p className="small" style={{ color: 'var(--danger, #b5524f)', marginBottom: 14 }}>{error}</p>}
              <div className="field">
                <label>Adresse email</label>
                <input
                  className="input" type="email" placeholder="vous@exemple.fr" autoComplete="email" required
                  value={email} onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={loading}>
                {loading ? 'Envoi…' : 'Envoyer le lien'}
              </button>
            </form>
          )}

          <div className="center" style={{ marginTop: 22 }}>
            <Link href="/connexion" className="btn btn-ghost btn-sm">
              <Icon name="arrowLeft" size={15} /> Retour à la connexion
            </Link>
          </div>
        </div>

        <p className="tiny muted center" style={{ marginTop: 18 }}>
          Vous ne recevez rien ? Vérifiez vos spams ou{' '}
          <Link href="/aide" style={{ color: 'var(--violet-2)' }}>contactez le support</Link>.
        </p>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Verify the build compiles**

Run (in `web/`): `npm run build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add web/app/\(site\)/mot-de-passe-oublie/page.jsx
git commit -m "feat(web): wire mot-de-passe-oublie page to forgot-password endpoint"
```

---

## Task 9: Mobile — wire `onboarding/auth.tsx` to register/login

**Files:**
- Modify: `mobile/app/onboarding/auth.tsx`
- Modify: `mobile/app/onboarding/role.tsx`

**Login-vs-signup research finding:** `onboarding/auth.tsx` is mobile's only auth screen, and it is signup-only — its schema requires `firstName`, and its copy/flow ("Créer mon espace" → quiz) is registration-specific. `onboarding/role.tsx` already has a "Déjà membre ? Se connecter" link, but today it calls the exact same `continueFlow()` as the "Continuer" button — i.e. it's decorative, routing to the same signup screen regardless. There is no separate login screen anywhere else in `mobile/app/` (confirmed by searching the whole tree). Per the task's own guidance, this plan adds a mode toggle to the single `auth.tsx` screen (mirroring web's `AuthModal`) rather than building a second screen: `role.tsx`'s existing link now passes `?mode=login`, and `auth.tsx` reads that as its initial mode, with an in-screen toggle link for switching either direction afterward.

**Field-mismatch decision:** `RegisterClientDto` needs `firstname`, `lastname`, `email`, `password`, `password_confirmation`, `city`; the existing screen only collects `firstName`. `lastName`/`city` inputs are added (shown only in signup mode); `password_confirmation` is not given its own input field (the screen has always had a single password field, and adding a second is not requested) — it is populated as `data.password` on submit, since the only requirement on the wire is that the two values match, which is trivially true when both come from the same field. Defaults for `firstName`/`email`/`password` also change from hardcoded demo values (`'Sarah'`, `'sarah.l@email.fr'`, `'••••••••'`) to empty strings — the old defaults were fake placeholder data that would otherwise get silently submitted to a now-real endpoint.

- [ ] **Step 1: Point `role.tsx`'s "Se connecter" link at login mode**

In `mobile/app/onboarding/role.tsx`, replace:

```tsx
        <Button label="Continuer" onPress={continueFlow} />
        <Text style={styles.connect}>
          Déjà membre ?{' '}
          <Text style={styles.link} onPress={continueFlow}>
            Se connecter
          </Text>
        </Text>
```

with:

```tsx
        <Button label="Continuer" onPress={continueFlow} />
        <Text style={styles.connect}>
          Déjà membre ?{' '}
          <Text style={styles.link} onPress={() => router.push('/onboarding/auth?mode=login' as any)}>
            Se connecter
          </Text>
        </Text>
```

(`router` is already in scope — it's the same `useRouter()` instance `continueFlow` uses two lines above.)

- [ ] **Step 2: Rewrite `auth.tsx` with a mode toggle and real API calls**

Replace the full contents of `mobile/app/onboarding/auth.tsx`:

```tsx
import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ScreenHeader } from '@components/ScreenHeader';
import { Button } from '@components/Button';
import { Input } from '@components/Input';
import Svg, { Path } from 'react-native-svg';
import { colors } from '@theme/colors';
import { typography } from '@theme/typography';
import { useSession } from '@store/session';
import { api, ApiError } from '@data/api/client';

const schema = z.object({
  firstName: z.string().min(1, 'Votre prénom').optional(),
  lastName: z.string().min(1, 'Votre nom').optional(),
  city: z.string().min(1, 'Votre ville').optional(),
  email: z.string().email('Email invalide'),
  password: z.string().min(8, '8 caractères minimum'),
});
type FormValues = z.infer<typeof schema>;

interface AuthResponse {
  data: {
    token: string;
    client: { firstname: string };
  };
}

export default function Auth() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ mode?: string }>();
  const [mode, setMode] = useState<'signup' | 'login'>(params.mode === 'login' ? 'login' : 'signup');
  const [submitting, setSubmitting] = useState(false);
  const setFirstName = useSession((s) => s.setFirstName);
  const setOnboardingSeen = useSession((s) => s.setOnboardingSeen);

  const { control, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { firstName: '', lastName: '', city: '', email: '', password: '' },
  });

  const submit = async (data: FormValues) => {
    setSubmitting(true);
    try {
      if (mode === 'login') {
        const res = await api.post<AuthResponse>('/client/login', {
          email: data.email,
          password: data.password,
        });
        useSession.getState().setToken(res.data.token);
        setFirstName(res.data.client.firstname);
        setOnboardingSeen();
        router.replace('/(tabs)' as any);
        return;
      }

      if (!data.firstName || !data.lastName || !data.city) {
        Alert.alert('Champs requis', 'Merci de renseigner votre prénom, nom et ville.');
        return;
      }
      const res = await api.post<AuthResponse>('/client/register', {
        firstname: data.firstName,
        lastname: data.lastName,
        email: data.email,
        city: data.city,
        password: data.password,
        password_confirmation: data.password,
      });
      useSession.getState().setToken(res.data.token);
      setFirstName(res.data.client.firstname);
      setOnboardingSeen();
      router.push('/onboarding/quiz?step=0' as any);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Une erreur est survenue.';
      Alert.alert(mode === 'login' ? 'Connexion impossible' : 'Inscription impossible', message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.pearl }}>
      <ScreenHeader transparent />
      <ScrollView
        contentContainerStyle={{
          padding: 24,
          paddingTop: 12,
          paddingBottom: insets.bottom + 32,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.h1}>
          {mode === 'login' ? (
            <>Bon <Text style={styles.italic}>retour</Text></>
          ) : (
            <>Créer mon <Text style={styles.italic}>espace</Text></>
          )}
        </Text>
        <Text style={styles.small}>
          {mode === 'login' ? 'Ravie de vous revoir.' : 'Quelques informations, en toute discrétion.'}
        </Text>

        <View style={{ height: 24 }} />

        {mode === 'signup' && (
          <>
            <Controller
              control={control}
              name="firstName"
              render={({ field: { onChange, value } }) => (
                <Input label="Prénom" value={value} onChangeText={onChange} />
              )}
            />
            <Controller
              control={control}
              name="lastName"
              render={({ field: { onChange, value } }) => (
                <Input label="Nom" value={value} onChangeText={onChange} />
              )}
            />
            <Controller
              control={control}
              name="city"
              render={({ field: { onChange, value } }) => (
                <Input label="Ville" value={value} onChangeText={onChange} />
              )}
            />
          </>
        )}
        <Controller
          control={control}
          name="email"
          render={({ field: { onChange, value } }) => (
            <Input
              label="Email"
              value={value}
              onChangeText={onChange}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          )}
        />
        {errors.email && <Text style={styles.error}>{errors.email.message}</Text>}
        <Controller
          control={control}
          name="password"
          render={({ field: { onChange, value } }) => (
            <Input
              label="Mot de passe"
              value={value}
              onChangeText={onChange}
              secureTextEntry
            />
          )}
        />
        {errors.password && <Text style={styles.error}>{errors.password.message}</Text>}

        <Text style={styles.legal}>
          En continuant, vous acceptez notre{' '}
          <Text style={styles.link}>charte de bienveillance</Text> et notre{' '}
          <Text style={styles.link}>politique de confidentialité</Text>.
        </Text>

        <Button
          label={submitting ? 'Un instant…' : mode === 'login' ? 'Se connecter' : 'Créer mon compte'}
          onPress={handleSubmit(submit)}
          disabled={submitting}
        />

        <Text style={styles.switchMode}>
          {mode === 'login' ? (
            <>
              Pas encore de compte ?{' '}
              <Text style={styles.link} onPress={() => setMode('signup')}>Créer un compte</Text>
            </>
          ) : (
            <>
              Déjà membre ?{' '}
              <Text style={styles.link} onPress={() => setMode('login')}>Se connecter</Text>
            </>
          )}
        </Text>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerTxt}>ou</Text>
          <View style={styles.dividerLine} />
        </View>

        <Button
          label="Continuer avec Apple"
          variant="soft"
          leftIcon={
            <Svg width={18} height={18} viewBox="0 0 24 24">
              <Path
                fill="#000"
                d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.08zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"
              />
            </Svg>
          }
          style={{ marginBottom: 10 }}
        />
        <Button
          label="Continuer avec Google"
          variant="soft"
          leftIcon={
            <Svg width={18} height={18} viewBox="0 0 24 24">
              <Path
                fill="#EA4335"
                d="M5.27 9.76A7.08 7.08 0 0 1 12 5.04 7 7 0 0 1 17.18 7l2.79-2.79A11 11 0 0 0 12 1 11 11 0 0 0 2.18 7.07l3.09 2.69z"
              />
              <Path
                fill="#34A853"
                d="M16.05 18.13A6.94 6.94 0 0 1 12 19.32a7.07 7.07 0 0 1-6.72-4.85L2.16 17.1A11 11 0 0 0 12 23a10.5 10.5 0 0 0 7.25-2.66l-3.2-2.21z"
              />
              <Path
                fill="#4A90E2"
                d="M19.25 20.34a11.46 11.46 0 0 0 3.53-8.84c0-.74-.07-1.45-.2-2.14H12v4.5h6.07c-.29 1.4-1.07 2.59-2.22 3.43l3.4 3.05z"
              />
              <Path
                fill="#FBBC05"
                d="M5.28 14.46A7 7 0 0 1 4.91 12c0-.86.14-1.69.38-2.46L2.18 6.85A11 11 0 0 0 1 12c0 1.81.43 3.52 1.18 5.04l3.1-2.58z"
              />
            </Svg>
          }
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  h1: { ...typography.h1, marginBottom: 6 },
  italic: {
    fontFamily: 'CormorantGaramond_400Regular_Italic',
    color: colors.violet2,
  },
  small: { ...typography.small },
  legal: { ...typography.small, fontSize: 12, marginVertical: 12, lineHeight: 18 },
  link: { color: colors.violet2 },
  switchMode: {
    textAlign: 'center',
    marginTop: 16,
    ...typography.small,
    fontSize: 13,
  },
  error: {
    ...typography.tiny,
    color: colors.danger,
    marginTop: -10,
    marginBottom: 10,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 24,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.line },
  dividerTxt: { ...typography.tiny },
});
```

"Continuer avec Apple"/"Continuer avec Google" keep their existing lack of `onPress` — decorative, out of scope, unchanged from before.

No new unit test is added for this wiring: the zod schema (the only real "logic" in this screen) was already exercised before this plan, and connecting an existing validated form to an API call is integration wiring, not new logic — consistent with how Plan 01 verified non-logic UI wiring. Verification is via typecheck.

- [ ] **Step 3: Run typecheck**

Run (in `mobile/`): `npm run typecheck`
Expected: PASS (no type errors).

- [ ] **Step 4: Re-run the existing mobile test suite to confirm no breakage**

Run (in `mobile/`): `npm test`
Expected: PASS (the `client.test.ts` api-client tests from Plan 01 are untouched by this change).

- [ ] **Step 5: Commit**

```bash
git add mobile/app/onboarding/auth.tsx mobile/app/onboarding/role.tsx
git commit -m "feat(mobile): wire onboarding auth screen to client register/login"
```

---

## Self-review checklist (run before handing off)

- [ ] `server/`: `npm run test:e2e` green (full suite, not just `client-auth.e2e-spec.ts`).
- [ ] `web/`: `npm test` green (includes both `api.test.js` and the new `auth-store.test.js`); `npm run build` succeeds.
- [ ] `mobile/`: `npm test` green; `npm run typecheck` clean.
- [ ] `POST /api/client/register` and `POST /api/client/login` both return the same `{user, client, token, token_type, expires_in}` shape — every caller (`web/lib/auth-store.js`'s `setSession`, mobile's `setToken`+`setFirstName`) reads `res.data.token` / `res.data.client` from either response interchangeably.
- [ ] `useAuthStore`'s public surface (`token`, `client`, `hasHydrated`, `setSession(token, client)`, `signOut()`) is called with matching names/arities everywhere it's used: `connexion/page.jsx`, `inscription/page.jsx`, `AuthModal.jsx`, `compte/layout.jsx`, `AccountNav.jsx`.
- [ ] No route collision between the new `@Controller('client')` (singular) and the existing `@Controller('clients')` (plural, `ClientsController`).
- [ ] Every new/rewired web form (`connexion`, `inscription`, `AuthModal`, `mot-de-passe-oublie`) shows a real error message on failure rather than failing silently.
- [ ] Mobile `onboarding/auth.tsx` defaults are empty strings, not the old hardcoded demo values.

## Exit criteria → unblocks Plan 04/06/07

A real client can register, log in, stay logged in across a page reload/app restart, and log out — for real, against the live backend — on both `web/` and `mobile/`. `web/lib/auth-store.js` (`token`/`client`/`setSession`/`signOut`) and `mobile/src/store/session.ts` (`token`/`setToken`/`signOut`, already built in Plan 01) give every later plan a consistent way to read the current client identity and attach it to requests. **Next:** Plan 04 builds client-scoped read/write domains (paiements history, échanges CRUD, remboursements) directly on top of this identity. Plan 06's admin login gate mirrors this plan's `auth-store.js` pattern with its own separate admin-store, and its admin clients list/detail screens now have real `users`+`clients` rows (created via this plan's registration flow) to manage instead of speculative data. Plan 07's greenfield modules (reviews, reports, favorites) attach authored content to this same client identity. (Plan 05 — bookings/Stripe — also builds on this identity once its required brainstorm settles the booking schema; it is not listed above because it isn't immediately ready the way 04/06/07 are.)
