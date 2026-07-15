# Aura Plan 08b — Roles & Permissions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the binary `User.is_admin` model with a real 4-role system (`admin`/`moderateur`/`support`/`comptabilite`) backed by a hardcoded 11-capability matrix, apply capability-checking to a small proof-of-concept subset of existing admin routes, and turn `admin/equipe` and `admin/roles` from mock-driven pages into real, role-aware ones — all without changing what the single existing admin can do today.

**Architecture:** Backend: a new `role: string | null` column on `users` (nullable, meaningful only when `is_admin=true`, defaults to `'admin'` for every row that already exists). A new pure module `server/src/auth/capabilities.ts` hardcodes the `Role`/`Capability` types and the `CAPABILITIES: Record<Role, Set<Capability>>` matrix, transcribed exactly from the mock (`web/app/admin/roles/page.jsx` + `web/lib/data/admin.js`). Capability-checking is added as an **opt-in layer**, not a replacement: a new `@RequireCapability(capability)` decorator + a new `CapabilityGuard` (Reflector-based, NestJS's standard RBAC pattern) is appended to `@UseGuards(JwtAuthGuard, AdminGuard, ...)` only on routes that opt in. `AdminGuard` itself is untouched — every route that only has `AdminGuard` today keeps behaving exactly as it does today, for every admin regardless of role. `CapabilityGuard` treats a `null`/unrecognized `role` as `'admin'` (full access), which is what makes this non-breaking: the guard only ever *adds* a new way to be blocked (missing a specific capability), never a new way an existing `is_admin=true` user loses access they already had.

**Capability-check scope (read before starting):** this plan applies `@RequireCapability` to exactly **3 controllers, 6 routes** — `AvisController` (`publish`/`reject`, capability `avis_moderation`), `SignalementsController` (`resolve`/`reject`, capability `signalements_litiges`), `RemboursementsController` (`adminApprove`/`adminRefuse`, capability `paiements_remboursements`). This is a deliberate, small proof-of-concept, not an oversight — the design spec (`docs/superpowers/specs/2026-07-15-aura-08-heavy-modules-design.md`, decision P8-6) calls for capability-checking to be applied "progressively," and exhaustively retrofitting all ~17 `AdminGuard`-using controllers is explicitly out of scope for this plan. In particular: the `CAPABILITIES` matrix defines `equipe_roles` and `reglages_systeme` as admin-only capabilities (matching the mock), and both are correctly *displayed* on the real `admin/roles` page this plan builds — but no route anywhere (including this plan's own new `admin/equipe` role-management endpoints) is gated on either of them. Every admin, regardless of role, can still reach every route this plan doesn't explicitly list above; that is unchanged, existing, `AdminGuard`-only behavior, left alone on purpose.

**Tech Stack:** NestJS 11 + TypeORM 0.3 + MySQL (prod) / better-sqlite3 (e2e, existing `createTestApp` harness, `synchronize: true`) · Next.js 15 (React 19, plain JSX) + `@tanstack/react-query` (existing `web/lib/api.js` client from Plan 01/06).

**Depends on:** Plan 06 (admin auth + `admin/equipe`/`admin/roles` wiring groundwork — `web/lib/admin-auth-store.js`, `AdminAuthGate`, and the already-real `GET /admin/list` endpoint this plan reuses for both pages). Nothing in Plan 08a (messaging) is required. Per the Plan 08 design spec's sequencing, this sub-plan (08b) should land before 08c (audit log), 08d (disputes), and 08f (Stripe Connect admin surface) — those sub-plans are written in parallel against this plan's exact `Role`/`Capability` shape and are expected to import `server/src/auth/capabilities.ts` and reuse the `RequireCapability`/`CapabilityGuard` mechanism this plan introduces, not invent their own.

**Reference:** [Plan 08 design spec](../specs/2026-07-15-aura-08-heavy-modules-design.md) · [Plan 06 (closest format/quality analog)](2026-07-13-aura-06-admin-wiring.md)

**Run each `npm` command from the relevant package dir** (`server/`, `web/`), not the repo root.

---

## File structure

| File | Responsibility |
|---|---|
| `server/src/auth/capabilities.ts` (create) | `Role`/`Capability` types, `ROLES`, `ROLE_LABELS`, `CAPABILITY_ORDER`, `CAPABILITY_LABELS`, the hardcoded `CAPABILITIES: Record<Role, Set<Capability>>` matrix, `hasCapability()` |
| `server/src/auth/capabilities.spec.ts` (create) | Unit tests: matrix matches the mock exactly, `hasCapability()` defaulting behavior |
| `server/src/database/entities/user.entity.ts` (modify) | Add nullable `role` column |
| `server/src/database/migrations/1700000000004-AddRoleToUsers.ts` (create) | `ALTER TABLE users ADD COLUMN role`, backfill existing admins to `'admin'` |
| `server/test/utils/create-test-app.ts` (modify) | `seedAdmin()` gains an optional `role` param (defaults `'admin'`, non-breaking for every existing caller) |
| `server/src/auth/decorators.ts` (modify) | Add `CAPABILITY_KEY` + `RequireCapability()` decorator |
| `server/src/auth/guards/capability.guard.ts` (create) | Reflector-based capability check; no-op when a route has no `@RequireCapability` |
| `server/src/auth/auth.module.ts` (modify) | Register/export `CapabilityGuard` alongside the existing guards |
| `server/src/avis/avis.controller.ts` (modify) | `avis_moderation` capability required on `publish`/`reject` |
| `server/test/avis.e2e-spec.ts` (modify) | Capability-check e2e coverage for the two gated routes |
| `server/src/signalements/signalements.controller.ts` (modify) | `signalements_litiges` capability required on `resolve`/`reject` |
| `server/test/signalements.e2e-spec.ts` (modify) | Capability-check e2e coverage |
| `server/src/remboursements/remboursements.controller.ts` (modify) | `paiements_remboursements` capability required on `adminApprove`/`adminRefuse` |
| `server/test/remboursements.e2e-spec.ts` (modify) | Capability-check e2e coverage |
| `server/src/auth/admin-auth/dto/register-admin.dto.ts` (modify) | Optional `role` field, validated against `ROLES` |
| `server/src/auth/admin-auth/dto/update-admin-role.dto.ts` (create) | `{ role }` body DTO for the new role-update route |
| `server/src/auth/admin-auth/admin-auth.service.ts` (modify) | `register`/`login`/`profile` responses carry `role`; new `updateRole()` |
| `server/src/auth/admin-auth/admin-auth.controller.ts` (modify) | New `POST /admin/:id/role` route |
| `server/test/admin-auth.e2e-spec.ts` (modify) | Role defaulting/validation on register + update-role e2e coverage |
| `web/lib/capabilities.js` (create) | Plain-JS mirror of the server's roles/capabilities constants (no shared-types build step between `web/` and `server/`) |
| `web/app/admin/roles/page.jsx` (modify) | Real per-role member counts (from `/admin/list`) + the fixed matrix; decorative "Nouveau rôle"/"Modifier" controls removed (they had no backend) |
| `web/components/modals/registry.jsx` (modify) | Remove the now-dead `editRole` modal entry (was only referenced by `admin/roles`) |
| `web/app/admin/equipe/page.jsx` (modify) | Role column, role selector on the "Ajouter un administrateur" form, new "Modifier le rôle" per-row action |

---

## Task 1: `server/src/auth/capabilities.ts` — the fixed role/capability matrix

**Files:**
- Create: `server/src/auth/capabilities.ts`
- Test: `server/src/auth/capabilities.spec.ts`

The 11 capabilities and their per-role checkmarks are transcribed exactly from `web/app/admin/roles/page.jsx:11-23`'s `CAPABILITIES` array (role ids there: `admin`/`mod`/`support`/`finance` — renamed here to the design spec's `admin`/`moderateur`/`support`/`comptabilite`, same 4 roles, same checkmarks):

| Capacité (mock label) | admin | moderateur (mock: `mod`) | support | comptabilite (mock: `finance`) |
|---|---|---|---|---|
| Tableau de bord | ✓ | ✓ | ✓ | ✓ |
| Praticiens & vérifications | ✓ | ✓ | | |
| Clients | ✓ | ✓ | ✓ | |
| Réservations | ✓ | | ✓ | |
| Avis & modération | ✓ | ✓ | | |
| Signalements & litiges | ✓ | ✓ | | |
| Tickets de support | ✓ | | ✓ | |
| Paiements & remboursements | ✓ | | | ✓ |
| Abonnements & promos | ✓ | | | ✓ |
| Équipe & rôles | ✓ | | | |
| Réglages système | ✓ | | | |

- [ ] **Step 1: Write the failing unit test**

Create `server/src/auth/capabilities.spec.ts`:

```typescript
import { CAPABILITIES, CAPABILITY_ORDER, hasCapability, ROLES } from './capabilities';

describe('capabilities', () => {
  it('defines exactly the 4 roles from the mock', () => {
    expect(ROLES).toEqual(['admin', 'moderateur', 'support', 'comptabilite']);
  });

  it('admin has all 11 capabilities', () => {
    expect(CAPABILITIES.admin.size).toBe(11);
    for (const cap of CAPABILITY_ORDER) expect(CAPABILITIES.admin.has(cap)).toBe(true);
  });

  it("moderateur matches the mock's checked columns exactly", () => {
    expect([...CAPABILITIES.moderateur].sort()).toEqual(
      ['avis_moderation', 'clients', 'dashboard', 'praticiens_verification', 'signalements_litiges'].sort(),
    );
  });

  it("support matches the mock's checked columns exactly", () => {
    expect([...CAPABILITIES.support].sort()).toEqual(
      ['clients', 'dashboard', 'reservations', 'tickets_support'].sort(),
    );
  });

  it("comptabilite matches the mock's checked columns exactly", () => {
    expect([...CAPABILITIES.comptabilite].sort()).toEqual(
      ['abonnements_promos', 'dashboard', 'paiements_remboursements'].sort(),
    );
  });

  it('hasCapability: admin always passes, other roles only pass their own capabilities', () => {
    expect(hasCapability('admin', 'reglages_systeme')).toBe(true);
    expect(hasCapability('moderateur', 'avis_moderation')).toBe(true);
    expect(hasCapability('moderateur', 'paiements_remboursements')).toBe(false);
    expect(hasCapability('support', 'reservations')).toBe(true);
    expect(hasCapability('support', 'signalements_litiges')).toBe(false);
    expect(hasCapability('comptabilite', 'paiements_remboursements')).toBe(true);
    expect(hasCapability('comptabilite', 'clients')).toBe(false);
  });

  it('defaults a null/undefined/unrecognized role to full admin access', () => {
    expect(hasCapability(null, 'reglages_systeme')).toBe(true);
    expect(hasCapability(undefined, 'equipe_roles')).toBe(true);
    expect(hasCapability('superadmin', 'reglages_systeme')).toBe(true);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run (in `server/`): `npm test -- capabilities.spec.ts`
Expected: FAIL — cannot find module `./capabilities`.

- [ ] **Step 3: Write the module**

Create `server/src/auth/capabilities.ts`:

```typescript
// Fixed roles + capability matrix for the admin panel — mirrors the mock exactly
// (web/app/admin/roles/page.jsx's CAPABILITIES array + web/lib/data/admin.js's
// `roles` array). This is a hardcoded constant, not an editable/dynamic system —
// see Plan 08b's design note: a live permission-matrix editor is explicitly out
// of scope (docs/superpowers/specs/2026-07-15-aura-08-heavy-modules-design.md,
// decision P8-6).
export type Role = 'admin' | 'moderateur' | 'support' | 'comptabilite';

export const ROLES: Role[] = ['admin', 'moderateur', 'support', 'comptabilite'];

export const ROLE_LABELS: Record<Role, string> = {
  admin: 'Administrateur',
  moderateur: 'Modérateur',
  support: 'Support',
  comptabilite: 'Comptabilité',
};

export type Capability =
  | 'dashboard'
  | 'praticiens_verification'
  | 'clients'
  | 'reservations'
  | 'avis_moderation'
  | 'signalements_litiges'
  | 'tickets_support'
  | 'paiements_remboursements'
  | 'abonnements_promos'
  | 'equipe_roles'
  | 'reglages_systeme';

// Order matches the mock's row order exactly (web/app/admin/roles/page.jsx:11-23).
export const CAPABILITY_ORDER: Capability[] = [
  'dashboard',
  'praticiens_verification',
  'clients',
  'reservations',
  'avis_moderation',
  'signalements_litiges',
  'tickets_support',
  'paiements_remboursements',
  'abonnements_promos',
  'equipe_roles',
  'reglages_systeme',
];

export const CAPABILITY_LABELS: Record<Capability, string> = {
  dashboard: 'Tableau de bord',
  praticiens_verification: 'Praticiens & vérifications',
  clients: 'Clients',
  reservations: 'Réservations',
  avis_moderation: 'Avis & modération',
  signalements_litiges: 'Signalements & litiges',
  tickets_support: 'Tickets de support',
  paiements_remboursements: 'Paiements & remboursements',
  abonnements_promos: 'Abonnements & promos',
  equipe_roles: 'Équipe & rôles',
  reglages_systeme: 'Réglages système',
};

// role -> capability set, transcribed exactly from the mock's per-capability
// `roles` arrays (web/app/admin/roles/page.jsx:11-23): admin has every
// capability checked; moderateur/support/comptabilite each have a subset.
export const CAPABILITIES: Record<Role, Set<Capability>> = {
  admin: new Set(CAPABILITY_ORDER),
  moderateur: new Set<Capability>([
    'dashboard', 'praticiens_verification', 'clients', 'avis_moderation', 'signalements_litiges',
  ]),
  support: new Set<Capability>(['dashboard', 'clients', 'reservations', 'tickets_support']),
  comptabilite: new Set<Capability>(['dashboard', 'paiements_remboursements', 'abonnements_promos']),
};

function isRole(value: unknown): value is Role {
  return typeof value === 'string' && (ROLES as string[]).includes(value);
}

// A null/undefined/unrecognized role defaults to full 'admin' access. This is
// what keeps the whole change non-breaking: every admin row that existed before
// this plan (or is ever created without an explicit role) behaves exactly as it
// did when AdminGuard's binary is_admin check was the only thing that mattered.
export function hasCapability(role: string | null | undefined, capability: Capability): boolean {
  const effective: Role = isRole(role) ? role : 'admin';
  return CAPABILITIES[effective].has(capability);
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test -- capabilities.spec.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add server/src/auth/capabilities.ts server/src/auth/capabilities.spec.ts
git commit -m "feat(server): add fixed role/capability matrix mirroring the roles mock"
```

---

## Task 2: `users.role` column — entity, migration, test harness

**Files:**
- Modify: `server/src/database/entities/user.entity.ts`
- Create: `server/src/database/migrations/1700000000004-AddRoleToUsers.ts`
- Modify: `server/test/utils/create-test-app.ts`

This task has no natural "red" test to write first — it's a foundational schema addition that nothing yet depends on (same shape as Plan 05 Task 1's `RendezVous` entity+migration addition). The verification step is running the full e2e suite to confirm the new column integrates cleanly and nothing existing breaks.

- [ ] **Step 1: Add the column to the entity**

Replace `server/src/database/entities/user.entity.ts` in full:

```typescript
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
  // 'admin'|'moderateur'|'support'|'comptabilite' — nullable, meaningful only when
  // is_admin=true. See server/src/auth/capabilities.ts for the Role type and the
  // fixed capability matrix each value maps to.
  @Column({ type: 'varchar', length: 20, nullable: true }) role: string | null;
  @Column({ type: 'datetime', nullable: true }) last_login_at: Date | null;
  @Column({ type: 'varchar', nullable: true }) ip_address: string | null;
  @CreateDateColumn({ name: 'created_at' }) created_at: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updated_at: Date;
}
```

- [ ] **Step 2: Write the migration**

Create `server/src/database/migrations/1700000000004-AddRoleToUsers.ts`. Mirrors `1700000000000-InitialSchema.ts`'s raw-SQL style (this codebase's migrations use `QueryRunner#query` with raw MySQL, not the TypeORM QueryRunner schema-builder API):

```typescript
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRoleToUsers1700000000004 implements MigrationInterface {
  public async up(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE users ADD COLUMN role VARCHAR(20) NULL AFTER is_admin`);
    // Existing admin row(s) predate the roles system entirely — default them to
    // the 'admin' role so nothing about their access changes (CapabilityGuard
    // treats 'admin' as having every capability, matching the old
    // is_admin-only behavior exactly).
    await q.query(`UPDATE users SET role = 'admin' WHERE is_admin = 1`);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE users DROP COLUMN role`);
  }
}
```

- [ ] **Step 3: Give the e2e test harness a way to seed a specific role**

`server/test/utils/create-test-app.ts` builds its schema via `synchronize: true` against the entity metadata directly (not the migration files above — the migration is what runs against the real MySQL database via `npm run migration:run`; e2e tests never execute migration files, per this file's own top-of-file comment). The entity change in Step 1 is therefore already enough for e2e tests to see the new column; this step only extends the `seedAdmin` helper so tests can pick a non-default role.

In `server/test/utils/create-test-app.ts`, replace the `seedAdmin` function:

```typescript
export async function seedAdmin(app: INestApplication, email = 'admin@test.io', role: string | null = 'admin') {
  const ds = app.get(DataSource);
  const user = await ds.getRepository(User).save({
    name: 'Admin Test',
    email,
    password: await bcrypt.hash('password123', 10),
    is_admin: true,
    role,
  });
  return { user, token: signToken(app, user) };
}
```

Every existing call site (`seedAdmin(app, 'x@y.io')`, 2 args) is unaffected — the new third parameter defaults to `'admin'`, so every pre-existing e2e test keeps seeding an admin with `role: 'admin'` exactly as before.

- [ ] **Step 4: Verify the full suite still passes**

Run (in `server/`): `npm run build` (confirms the entity/migration compile), then `npm run test:e2e`
Expected: PASS — every existing suite green. `synchronize: true` picks up the new `role` column on `users` without touching any other table; no existing test asserts an exact key-set on a `User`-shaped response object (they use `toMatchObject`/explicit field reads), so the new column doesn't break any assertion.

- [ ] **Step 5: Commit**

```bash
git add server/src/database/entities/user.entity.ts server/src/database/migrations/1700000000004-AddRoleToUsers.ts server/test/utils/create-test-app.ts
git commit -m "feat(server): add nullable role column to users, defaulting existing admins to admin"
```

---

## Task 3: `RequireCapability` + `CapabilityGuard`, wired to `AvisController`

**Files:**
- Modify: `server/src/auth/decorators.ts`
- Create: `server/src/auth/guards/capability.guard.ts`
- Modify: `server/src/auth/auth.module.ts`
- Modify: `server/src/avis/avis.controller.ts`
- Test: `server/test/avis.e2e-spec.ts`

This codebase's existing guards (`AdminGuard`, `ClientGuard`) have no unit `.spec.ts` files — they're exercised exclusively through e2e specs hitting real guarded routes. `CapabilityGuard` follows the same convention: no isolated guard unit test, tested here through its first real usage on `AvisController`.

- [ ] **Step 1: Write the failing e2e test**

Add a new test to the end of `server/test/avis.e2e-spec.ts` (append before the file's closing `});`, after the existing `'admin reject sets statut and admin delete removes the row'` test):

```typescript
  it('publish/reject require the avis_moderation capability for non-admin roles', async () => {
    const modToken = (await seedAdmin(app, 'avis-mod@aura.io', 'moderateur')).token;
    const supportToken = (await seedAdmin(app, 'avis-support@aura.io', 'support')).token;

    const created = await http().post('/api/client/avis')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ praticien_id: praticienId, note: 3, avis: 'Avis pour test de capacité' }).expect(201);
    const id = created.body.data.id;

    await http().post(`/api/admin/avis/${id}/publish`)
      .set('Authorization', `Bearer ${supportToken}`).expect(403);

    const pub = await http().post(`/api/admin/avis/${id}/publish`)
      .set('Authorization', `Bearer ${modToken}`).expect(200);
    expect(pub.body.data.statut).toBe('publié');
  });
```

- [ ] **Step 2: Run to verify it fails**

Run (in `server/`): `npm run test:e2e -- avis.e2e-spec.ts`
Expected: FAIL — the `support` token gets `200` (any admin can publish today), not the expected `403`.

- [ ] **Step 3: Add the decorator**

In `server/src/auth/decorators.ts`, replace the file in full:

```typescript
import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import { Capability } from './capabilities';

export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext) => ctx.switchToHttp().getRequest().user,
);
export const CurrentClient = createParamDecorator(
  (_: unknown, ctx: ExecutionContext) => ctx.switchToHttp().getRequest().client,
);

// Attaches the capability a route requires as route metadata; read by
// CapabilityGuard via Reflector. Must be listed after AdminGuard in the
// route's @UseGuards(...) chain — it assumes req.user.is_admin is already true.
export const CAPABILITY_KEY = 'capability';
export const RequireCapability = (capability: Capability) => SetMetadata(CAPABILITY_KEY, capability);
```

- [ ] **Step 4: Add the guard**

Create `server/src/auth/guards/capability.guard.ts`:

```typescript
import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CAPABILITY_KEY } from '../decorators';
import { Capability, hasCapability } from '../capabilities';

/**
 * Reads the @RequireCapability(...) metadata (if any) off the route handler
 * and checks it against the requesting admin's role. Routes with no
 * @RequireCapability decorator pass through unchanged — this guard is opt-in,
 * layered on top of AdminGuard rather than replacing its binary is_admin
 * check. Must be listed after AdminGuard in @UseGuards(...) so req.user is
 * already confirmed to be an admin by the time this runs.
 */
@Injectable()
export class CapabilityGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Capability | undefined>(CAPABILITY_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (!required) return true;
    const user = ctx.switchToHttp().getRequest().user;
    if (!hasCapability(user?.role, required)) {
      throw new ForbiddenException({
        status: 'error',
        message: "Vous n'avez pas la permission d'effectuer cette action.",
      });
    }
    return true;
  }
}
```

- [ ] **Step 5: Register the guard in `AuthModule`**

Replace `server/src/auth/auth.module.ts` in full:

```typescript
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
import { OptionalJwtGuard } from './guards/optional-jwt.guard';
import { CapabilityGuard } from './guards/capability.guard';
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
        signOptions: { expiresIn: parseInt(process.env.JWT_TTL_MINUTES ?? '60', 10) * 60 },
      }),
    }),
  ],
  providers: [
    JwtStrategy, JwtAuthGuard, AdminGuard, ClientGuard, OptionalJwtGuard, CapabilityGuard,
    HashService, TokenService,
  ],
  exports: [
    JwtModule, TypeOrmModule, JwtAuthGuard, AdminGuard, ClientGuard, OptionalJwtGuard, CapabilityGuard,
    HashService, TokenService,
  ],
})
export class AuthModule {}
```

- [ ] **Step 6: Wire the capability onto `AvisController`'s publish/reject routes**

Replace `server/src/avis/avis.controller.ts` in full:

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
import { CapabilityGuard } from '../auth/guards/capability.guard';
import { CurrentClient, RequireCapability } from '../auth/decorators';
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

  @UseGuards(JwtAuthGuard, AdminGuard, CapabilityGuard)
  @RequireCapability('avis_moderation')
  @HttpCode(200)
  @Post('admin/avis/:id/publish')
  publish(@Param('id', ParseIntPipe) id: number) {
    return this.service.publish(id);
  }

  @UseGuards(JwtAuthGuard, AdminGuard, CapabilityGuard)
  @RequireCapability('avis_moderation')
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

Note `adminIndex` (list/read) and `adminDestroy` are deliberately left `AdminGuard`-only — this plan's PoC only gates the two moderation-decision routes (`publish`/`reject`), not read access or deletion.

- [ ] **Step 7: Run to verify it passes**

Run: `npm run test:e2e -- avis.e2e-spec.ts`
Expected: PASS (8 tests) — `support` role gets `403` on publish, `moderateur` role gets `200`.

- [ ] **Step 8: Commit**

```bash
git add server/src/auth/decorators.ts server/src/auth/guards/capability.guard.ts server/src/auth/auth.module.ts server/src/avis/avis.controller.ts server/test/avis.e2e-spec.ts
git commit -m "feat(server): add capability-check guard, apply to avis moderation as proof of concept"
```

---

## Task 4: Capability-check on `SignalementsController`

**Files:**
- Modify: `server/src/signalements/signalements.controller.ts`
- Test: `server/test/signalements.e2e-spec.ts`

- [ ] **Step 1: Write the failing e2e test**

Append to the end of `server/test/signalements.e2e-spec.ts` (before the closing `});`, after the existing `'admin reject sets statut to rejected...'` test):

```typescript
  it('resolve/reject require the signalements_litiges capability for non-admin roles', async () => {
    const modToken = (await seedAdmin(app, 'sig-mod@aura.io', 'moderateur')).token;
    const financeToken = (await seedAdmin(app, 'sig-finance@aura.io', 'comptabilite')).token;

    const created = await http().post('/api/signalements')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        praticien_id: praticienId, type: 'overclaim',
        sujet: 'Test capacité', motif: 'Motif suffisant pour le test',
      }).expect(201);
    const id = created.body.data.id;

    await http().post(`/api/admin/signalements/${id}/resolve`)
      .set('Authorization', `Bearer ${financeToken}`).expect(403);

    const res = await http().post(`/api/admin/signalements/${id}/resolve`)
      .set('Authorization', `Bearer ${modToken}`).expect(200);
    expect(res.body.data.statut).toBe('resolved');
  });
```

- [ ] **Step 2: Run to verify it fails**

Run (in `server/`): `npm run test:e2e -- signalements.e2e-spec.ts`
Expected: FAIL — the `comptabilite` token gets `200`, not the expected `403`.

- [ ] **Step 3: Wire the capability onto `resolve`/`reject`**

Replace `server/src/signalements/signalements.controller.ts` in full:

```typescript
import {
  Body, Controller, Get, HttpCode, Param, ParseIntPipe, Post, Query, UseGuards,
} from '@nestjs/common';
import { SignalementsService } from './signalements.service';
import { CreateSignalementDto } from './dto/create-signalement.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { CapabilityGuard } from '../auth/guards/capability.guard';
import { CurrentUser, RequireCapability } from '../auth/decorators';
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

  @UseGuards(JwtAuthGuard, AdminGuard, CapabilityGuard)
  @RequireCapability('signalements_litiges')
  @HttpCode(200)
  @Post('admin/signalements/:id/resolve')
  resolve(@Param('id', ParseIntPipe) id: number) {
    return this.service.resolve(id);
  }

  @UseGuards(JwtAuthGuard, AdminGuard, CapabilityGuard)
  @RequireCapability('signalements_litiges')
  @HttpCode(200)
  @Post('admin/signalements/:id/reject')
  reject(@Param('id', ParseIntPipe) id: number) {
    return this.service.reject(id);
  }
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm run test:e2e -- signalements.e2e-spec.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add server/src/signalements/signalements.controller.ts server/test/signalements.e2e-spec.ts
git commit -m "feat(server): require signalements_litiges capability on resolve/reject"
```

---

## Task 5: Capability-check on `RemboursementsController`

**Files:**
- Modify: `server/src/remboursements/remboursements.controller.ts`
- Test: `server/test/remboursements.e2e-spec.ts`

- [ ] **Step 1: Write the failing e2e test**

Append to the end of `server/test/remboursements.e2e-spec.ts` (before the closing `});`, after the existing `'admin approve validates date_remboursement...'` test):

```typescript
  it('approve/refuse require the paiements_remboursements capability for non-admin roles', async () => {
    const modToken = (await seedAdmin(app, 'remb-mod@aura.io', 'moderateur')).token;
    const financeToken = (await seedAdmin(app, 'remb-finance@aura.io', 'comptabilite')).token;
    const ds = app.get(DataSource);
    const paiementId = (await ds.getRepository(Paiement).save({
      reference: 'TX-CAP-1', client_id: clientId, montant_brut: 40, commission: 4,
      montant_net_praticien: 36, moyen_paiement: 'Carte', statut: 'paid',
      date_paiement: new Date(),
    })).id;
    const created = await asClient(http().post('/api/remboursements/client'))
      .field('paiement_id', String(paiementId)).field('motif', 'Test capacité').expect(201);
    const id = created.body.data.id;

    await http().post(`/api/remboursements/admin/${id}/approve`)
      .set('Authorization', `Bearer ${modToken}`).send({ commentaire_admin: 'OK' }).expect(403);

    const appr = await http().post(`/api/remboursements/admin/${id}/approve`)
      .set('Authorization', `Bearer ${financeToken}`).send({ commentaire_admin: 'OK' }).expect(200);
    expect(appr.body.data.statut).toBe('approuve');
  });
```

- [ ] **Step 2: Run to verify it fails**

Run (in `server/`): `npm run test:e2e -- remboursements.e2e-spec.ts`
Expected: FAIL — the `moderateur` token gets `200`, not the expected `403`.

- [ ] **Step 3: Wire the capability onto `adminApprove`/`adminRefuse`**

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
import { CapabilityGuard } from '../auth/guards/capability.guard';
import { CurrentClient, RequireCapability } from '../auth/decorators';
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

  @UseGuards(JwtAuthGuard, AdminGuard, CapabilityGuard)
  @RequireCapability('paiements_remboursements')
  @HttpCode(200)
  @Post('admin/:id/approve')
  adminApprove(@Param('id', ParseIntPipe) id: number, @Body() dto: ApproveRemboursementDto) {
    return this.service.adminApprove(id, dto);
  }

  @UseGuards(JwtAuthGuard, AdminGuard, CapabilityGuard)
  @RequireCapability('paiements_remboursements')
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

- [ ] **Step 4: Run to verify it passes**

Run: `npm run test:e2e -- remboursements.e2e-spec.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add server/src/remboursements/remboursements.controller.ts server/test/remboursements.e2e-spec.ts
git commit -m "feat(server): require paiements_remboursements capability on approve/refuse"
```

---

## Task 6: Admin registration/login/profile carry `role`

**Files:**
- Modify: `server/src/auth/admin-auth/dto/register-admin.dto.ts`
- Modify: `server/src/auth/admin-auth/admin-auth.service.ts`
- Test: `server/test/admin-auth.e2e-spec.ts`

- [ ] **Step 1: Write the failing e2e tests**

Append to the end of `server/test/admin-auth.e2e-spec.ts` (before the closing `});`, after the existing `'admin management: list, deactivate...'` test):

```typescript
  it('register accepts an optional role, defaulting to admin', async () => {
    const withRole = await http().post('/api/admin/register').send({
      name: 'Modo', email: 'modo@aura.io', password: 'secret123', password_confirmation: 'secret123',
      role: 'moderateur',
    }).expect(201);
    expect(withRole.body.data.user.role).toBe('moderateur');

    const noRole = await http().post('/api/admin/register').send({
      name: 'Defaultist', email: 'defaultist@aura.io', password: 'secret123', password_confirmation: 'secret123',
    }).expect(201);
    expect(noRole.body.data.user.role).toBe('admin');
  });

  it('register rejects an unknown role', async () => {
    const res = await http().post('/api/admin/register').send({
      name: 'Bad', email: 'badrole@aura.io', password: 'secret123', password_confirmation: 'secret123',
      role: 'superadmin',
    }).expect(422);
    expect(res.body.errors.role).toBeDefined();
  });

  it('list returns each admin\'s role', async () => {
    const { token } = await seedAdmin(app, 'roles-list@aura.io');
    const res = await http().get('/api/admin/list')
      .set('Authorization', `Bearer ${token}`).expect(200);
    expect(res.body.data.find((u: any) => u.email === 'roles-list@aura.io').role).toBe('admin');
  });
```

- [ ] **Step 2: Run to verify it fails**

Run (in `server/`): `npm run test:e2e -- admin-auth.e2e-spec.ts`
Expected: FAIL — `role` is stripped by the validation pipe's `whitelist: true` (not a recognized DTO field yet), so `withRole.body.data.user.role` is `undefined`, not `'moderateur'`.

- [ ] **Step 3: Add `role` to the register DTO**

Replace `server/src/auth/admin-auth/dto/register-admin.dto.ts` in full:

```typescript
import { IsEmail, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { Match } from '../../../common/match.decorator';
import { ROLES } from '../../capabilities';

export class RegisterAdminDto {
  @IsString() @MaxLength(255) name: string;
  @IsEmail() email: string;
  @IsString() @MinLength(8) password: string;
  @IsString() @Match('password') password_confirmation: string;
  @IsOptional() @IsIn(ROLES) role?: string;
}
```

- [ ] **Step 4: Carry `role` through `register`/`login`/`profile`**

Replace `server/src/auth/admin-auth/admin-auth.service.ts` in full:

```typescript
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
import { parsePagination, paginateQb } from '../../common/pagination';
import { RegisterAdminDto } from './dto/register-admin.dto';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateAdminRoleDto } from './dto/update-admin-role.dto';

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
      role: dto.role ?? 'admin',
    });
    return success(
      {
        user: pickUser(user, ['id', 'name', 'email', 'is_admin', 'role', 'created_at']),
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
        user: pickUser(fresh, ['id', 'name', 'email', 'is_admin', 'role', 'last_login_at']),
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
        'id', 'name', 'email', 'is_admin', 'role', 'last_login_at', 'ip_address', 'created_at', 'updated_at',
      ]),
    });
  }

  checkToken(user: User) {
    if (!user.is_admin) {
      throw new ForbiddenException({ status: 'error', message: 'Token invalide ou non admin' });
    }
    return success(
      { user: pickUser(user, ['id', 'name', 'email', 'is_admin']) },
      'Token admin valide',
    );
  }

  async changePassword(user: User, dto: ChangePasswordDto) {
    const fresh = await this.users.findOneByOrFail({ id: user.id });
    if (!(await this.hash.compare(dto.current_password, fresh.password))) {
      throw new BadRequestException({ status: 'error', message: 'Le mot de passe actuel est incorrect' });
    }
    await this.users.update(user.id, { password: await this.hash.hash(dto.new_password) });
    return success(undefined, 'Mot de passe mis à jour avec succès');
  }

  async list(query: Record<string, any>) {
    const { page, perPage } = parsePagination(query, 15);
    const qb = this.users
      .createQueryBuilder('u')
      .where('u.is_admin = :isAdmin', { isAdmin: true })
      .orderBy('u.created_at', 'DESC');
    const { data, pagination } = await paginateQb(qb, page, perPage);
    return success(data.map(sanitizeUser), undefined, { pagination });
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

  async updateRole(id: number, dto: UpdateAdminRoleDto) {
    const admin = await this.users.findOneBy({ id, is_admin: true });
    if (!admin) throw new NotFoundException({ status: 'error', message: 'Administrateur non trouvé' });
    await this.users.update(id, { role: dto.role });
    const fresh = await this.users.findOneByOrFail({ id });
    return success(sanitizeUser(fresh), 'Rôle mis à jour avec succès');
  }
}
```

`updateRole` is implemented here (it needs the same `NotFoundException` shape as the other admin-management methods) but not yet reachable — its DTO and route are added in Task 7. Importing `UpdateAdminRoleDto` now and adding it next task keeps this task's diff focused on the `role`-carrying changes to the three existing methods (`register`/`login`/`profile`); Task 7 wires the controller route.

- [ ] **Step 5: Run to verify it passes**

Run: `npm run test:e2e -- admin-auth.e2e-spec.ts`
Expected: Still FAIL at this point — `admin-auth.service.ts` now imports `UpdateAdminRoleDto` from a file that doesn't exist yet (`./dto/update-admin-role.dto`). This is expected and resolved in Task 7's Step 1, which creates that file before anything re-compiles. Do not skip ahead — Task 7 starts immediately below and its first step is exactly this file.

- [ ] **Step 6: Commit is deferred to the end of Task 7**

Task 6 and Task 7 share one commit because `admin-auth.service.ts` (edited in Task 6) references `UpdateAdminRoleDto` (created in Task 7) — committing between them would leave a broken intermediate state. Continue directly into Task 7.

---

## Task 7: `POST /admin/:id/role` — the role-update endpoint

**Files:**
- Create: `server/src/auth/admin-auth/dto/update-admin-role.dto.ts`
- Modify: `server/src/auth/admin-auth/admin-auth.controller.ts`
- Test: `server/test/admin-auth.e2e-spec.ts`

- [ ] **Step 1: Create the DTO**

Create `server/src/auth/admin-auth/dto/update-admin-role.dto.ts`:

```typescript
import { IsIn } from 'class-validator';
import { ROLES } from '../../capabilities';

export class UpdateAdminRoleDto {
  @IsIn(ROLES) role: string;
}
```

At this point `npm run build` compiles again (Task 6's `admin-auth.service.ts` import now resolves) and Task 6's three tests pass. Continue to the route itself.

- [ ] **Step 2: Write the failing e2e test**

Append to the end of `server/test/admin-auth.e2e-spec.ts` (before the closing `});`):

```typescript
  it('admin management: update role, rejects unknown role, 404s on unknown id', async () => {
    const { token } = await seedAdmin(app, 'role-updater@aura.io');
    const { user: other } = await seedAdmin(app, 'role-target@aura.io');

    const bad = await http().post(`/api/admin/${other.id}/role`)
      .set('Authorization', `Bearer ${token}`).send({ role: 'superadmin' }).expect(422);
    expect(bad.body.errors.role).toBeDefined();

    const ok = await http().post(`/api/admin/${other.id}/role`)
      .set('Authorization', `Bearer ${token}`).send({ role: 'support' }).expect(200);
    expect(ok.body.data.role).toBe('support');

    await http().post('/api/admin/999999/role')
      .set('Authorization', `Bearer ${token}`).send({ role: 'support' }).expect(404);

    await http().post(`/api/admin/${other.id}/role`).send({ role: 'admin' }).expect(401);
  });
```

- [ ] **Step 3: Run to verify it fails**

Run (in `server/`): `npm run test:e2e -- admin-auth.e2e-spec.ts`
Expected: FAIL — `POST /api/admin/:id/role` doesn't exist yet (404 "Cannot POST" from Nest's default not-found handler, not the expected validation/success responses).

- [ ] **Step 4: Add the route**

Replace `server/src/auth/admin-auth/admin-auth.controller.ts` in full:

```typescript
import {
  Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Post, Query, Req, UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { AdminAuthService } from './admin-auth.service';
import { RegisterAdminDto } from './dto/register-admin.dto';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateAdminRoleDto } from './dto/update-admin-role.dto';
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

  @UseGuards(JwtAuthGuard)
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
  @HttpCode(200)
  @Post(':id/role')
  updateRole(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateAdminRoleDto) {
    return this.service.updateRole(id, dto);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Delete(':id')
  destroy(@CurrentUser() user: User, @Param('id', ParseIntPipe) id: number) {
    return this.service.destroy(user, id);
  }
}
```

`updateRole` is guarded by `AdminGuard` only (no `@RequireCapability`) — consistent with this plan's stated scope boundary that team/role management is not part of the capability-check proof-of-concept, even though `equipe_roles` exists as a displayed capability on the real `admin/roles` page (Task 9). The route uses `POST :id/role` rather than `PUT :id`, matching this controller's own established convention for admin-management actions (`POST :id/deactivate`, `POST :id/activate`) rather than a generic REST `PUT`, since there is no general "update an admin" endpoint this fits into.

- [ ] **Step 5: Run to verify it passes**

Run: `npm run test:e2e -- admin-auth.e2e-spec.ts`
Expected: PASS (all tests, including Task 6's 3 new tests and this task's 1 new test).

- [ ] **Step 6: Commit (covers Tasks 6 and 7 together)**

```bash
git add server/src/auth/admin-auth/dto/register-admin.dto.ts server/src/auth/admin-auth/dto/update-admin-role.dto.ts server/src/auth/admin-auth/admin-auth.service.ts server/src/auth/admin-auth/admin-auth.controller.ts server/test/admin-auth.e2e-spec.ts
git commit -m "feat(server): carry admin role through register/login/profile, add role-update route"
```

---

## Task 8: `web/lib/capabilities.js` — the web-side mirror

**Files:**
- Create: `web/lib/capabilities.js`

`web/` and `server/` are separate npm packages with no shared-types build step (confirmed: separate `package.json`, separate language — TypeScript on the server, plain JSX on the web — no monorepo package linking anywhere in this codebase). Every other server-side enum value in this app is already re-declared as a plain JS value on the web side rather than imported (e.g. `CreateArticleDto.status`'s 4 values are hardcoded into the `admin/contenu` form). This file follows that same, already-established pattern.

- [ ] **Step 1: Create the file**

Create `web/lib/capabilities.js`:

```javascript
// Mirrors server/src/auth/capabilities.ts exactly — same role ids, same
// capability ids, same per-role capability sets. Kept as a manually-synced
// duplicate because web/ and server/ are separate packages with no
// shared-types build step (the same pattern already used for every other
// server-side enum re-declared as a plain JS value on the web side). If the
// server's CAPABILITIES matrix ever changes, this file must change with it.
export const ROLE_ORDER = ['admin', 'moderateur', 'support', 'comptabilite'];

export const ROLE_LABELS = {
  admin: 'Administrateur',
  moderateur: 'Modérateur',
  support: 'Support',
  comptabilite: 'Comptabilité',
};

export const ROLE_DESCRIPTIONS = {
  admin: 'Accès complet à tous les modules et réglages.',
  moderateur: 'Modération des contenus, avis, signalements et messages.',
  support: 'Gestion des tickets et assistance utilisateur.',
  comptabilite: 'Paiements, remboursements, exports comptables.',
};

export const CAPABILITY_ORDER = [
  'dashboard',
  'praticiens_verification',
  'clients',
  'reservations',
  'avis_moderation',
  'signalements_litiges',
  'tickets_support',
  'paiements_remboursements',
  'abonnements_promos',
  'equipe_roles',
  'reglages_systeme',
];

export const CAPABILITY_LABELS = {
  dashboard: 'Tableau de bord',
  praticiens_verification: 'Praticiens & vérifications',
  clients: 'Clients',
  reservations: 'Réservations',
  avis_moderation: 'Avis & modération',
  signalements_litiges: 'Signalements & litiges',
  tickets_support: 'Tickets de support',
  paiements_remboursements: 'Paiements & remboursements',
  abonnements_promos: 'Abonnements & promos',
  equipe_roles: 'Équipe & rôles',
  reglages_systeme: 'Réglages système',
};

// role -> capability ids, transcribed from server/src/auth/capabilities.ts's
// CAPABILITIES matrix (itself transcribed from the original mock).
export const CAPABILITIES = {
  admin: [...CAPABILITY_ORDER],
  moderateur: ['dashboard', 'praticiens_verification', 'clients', 'avis_moderation', 'signalements_litiges'],
  support: ['dashboard', 'clients', 'reservations', 'tickets_support'],
  comptabilite: ['dashboard', 'paiements_remboursements', 'abonnements_promos'],
};
```

No test file: this module is pure static data (arrays and object literals, no functions), matching the no-test precedent already set by every file in `web/lib/data/*.js` in this codebase. It's exercised indirectly by Tasks 9 and 10's manual walkthroughs.

- [ ] **Step 2: Commit**

```bash
git add web/lib/capabilities.js
git commit -m "feat(web): add JS mirror of the server role/capability constants"
```

---

## Task 9: `admin/roles` — real display, decorative controls removed

**Files:**
- Modify: `web/app/admin/roles/page.jsx`
- Modify: `web/components/modals/registry.jsx`

**Decision — the "Nouveau rôle" header button and each card's "Modifier" button are removed, not left decorative.** Both currently open the `editRole` modal, a `FormModal` preset with no backend behind it (it doesn't call any API — see `web/components/modals/registry.jsx`, the `editRole` entry). The established precedent in this program (Plans 06, 07, 09) is to remove decorative controls that have no real backend rather than leave them wired to a modal that silently does nothing on submit. This plan's own design spec (P8-6) is explicit that the roles page becomes a "real, read-only display," not an editor — so removing the edit affordances, rather than leaving them as dead UI, is the correct match for that decision, not a scope overrun. Because `editRole` becomes unreferenced anywhere in the codebase once this task lands (confirmed: it's currently referenced only by this page), its entry in the shared modal registry is deleted too, rather than left as dead code.

- [ ] **Step 1: Rewrite the page**

Replace `web/app/admin/roles/page.jsx` in full:

```jsx
'use client';
import { useQuery } from '@tanstack/react-query';
import { PageHead } from '@/components/ui/PageHead';
import { Icon } from '@/components/ui/Icon';
import { api } from '@/lib/api';
import {
  ROLE_ORDER, ROLE_LABELS, ROLE_DESCRIPTIONS,
  CAPABILITY_ORDER, CAPABILITY_LABELS, CAPABILITIES,
} from '@/lib/capabilities';

const ROLE_TINT = { admin: 'tint-violet', moderateur: 'tint-sky', support: 'tint-sage', comptabilite: 'tint-gold' };
const ROLE_GLYPH = { admin: 'var(--violet-2)', moderateur: 'var(--sky-2)', support: 'var(--sage-2)', comptabilite: 'var(--gold)' };
const ROLE_SHORT = { admin: 'Admin', moderateur: 'Modér.', support: 'Support', comptabilite: 'Compta.' };

export default function RolesPage() {
  const { data, isError } = useQuery({
    queryKey: ['admin', 'team'],
    queryFn: () => api.get('/admin/list?per_page=100'),
  });
  const team = data?.data ?? [];
  const counts = ROLE_ORDER.reduce((acc, rid) => {
    acc[rid] = team.filter((u) => (u.role ?? 'admin') === rid).length;
    return acc;
  }, {});

  return (
    <>
      <PageHead
        title="Rôles & permissions"
        subtitle="Ce que chaque rôle de l'équipe peut faire — matrice fixe, non éditable."
        crumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Rôles' }]}
      />

      {isError && <div className="empty"><div className="glyph">❍</div>Impossible de charger les rôles.</div>}

      <div className="grid grid-2" style={{ marginBottom: 24 }}>
        {ROLE_ORDER.map((rid) => (
          <div key={rid} className="card card-pad">
            <div className="row gap-3" style={{ marginBottom: 12 }}>
              <span className={`tile-icon ${ROLE_TINT[rid]}`}><Icon name="shield" size={18} color={ROLE_GLYPH[rid]} /></span>
              <div>
                <h3 className="h-4">{ROLE_LABELS[rid]}</h3>
                <div className="tiny">{counts[rid] || 0} membre{(counts[rid] || 0) > 1 ? 's' : ''}</div>
              </div>
            </div>
            <p className="small" style={{ marginBottom: 14 }}>{ROLE_DESCRIPTIONS[rid]}</p>
            <div className="divider" />
            <div className="stack gap-2" style={{ marginTop: 14 }}>
              {CAPABILITIES[rid].map((cap) => (
                <div key={cap} className="row gap-2">
                  <Icon name="checkCircle" size={16} color="var(--sage-2)" />
                  <span className="small">{CAPABILITY_LABELS[cap]}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        <div className="between" style={{ padding: '18px 20px' }}>
          <h3 className="h-3">Matrice des permissions</h3>
          <span className="tiny">accès par capacité</span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Capacité</th>
                {ROLE_ORDER.map((rid) => <th key={rid} className="center">{ROLE_SHORT[rid]}</th>)}
              </tr>
            </thead>
            <tbody>
              {CAPABILITY_ORDER.map((cap) => (
                <tr key={cap}>
                  <td className="table-cell-main">{CAPABILITY_LABELS[cap]}</td>
                  {ROLE_ORDER.map((rid) => (
                    <td key={rid} className="center">
                      {CAPABILITIES[rid].includes(cap)
                        ? <Icon name="check" size={16} color="var(--sage-2)" />
                        : <span className="tiny muted">—</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
```

This drops the `roles` mock import (`@/lib/data/admin`), the `Badge`/`ModalButton` imports (both were already unused or only used by the now-removed edit buttons), and both decorative buttons. Member counts come from the same `GET /admin/list?per_page=100` endpoint and `['admin', 'team']` query key `admin/equipe` already uses (Task 10) — react-query shares the cache between the two pages.

- [ ] **Step 2: Remove the dead `editRole` modal entry**

In `web/components/modals/registry.jsx`, delete this line (it's the only reference to `editRole` anywhere in the codebase once Step 1 lands):

```jsx
  editRole: (p) => <FormModal title="Modifier le rôle" fields={[{ name: 'role', label: 'Rôle', type: 'select', options: ['Administrateur', 'Modérateur', 'Support', 'Comptabilité'], required: true }, { name: 'scope', label: 'Périmètre', type: 'textarea', placeholder: 'Permissions…' }]} submitLabel="Enregistrer" successToast="Rôle mis à jour" {...p} />,
```

Every other entry in `MODAL_REGISTRY` (including the still-used `invite`, which is a separate, still-referenced-elsewhere-in-spirit preset not touched by this plan) is left exactly as-is.

- [ ] **Step 3: Verify**

Run (in `web/`): `npm run lint` then `npm run build`.

Manual walkthrough: `/admin/roles` shows 4 real role cards with real member counts (matching whatever admins currently exist via `/admin/list`) and the same 11×4 capability matrix the mock had, with no "Nouveau rôle"/"Modifier" buttons anywhere on the page.

- [ ] **Step 4: Commit**

```bash
git add web/app/admin/roles/page.jsx web/components/modals/registry.jsx
git commit -m "feat(web): wire admin roles page to real member counts, remove decorative editor"
```

---

## Task 10: `admin/equipe` — role selector on create + a "Modifier le rôle" action

**Files:**
- Modify: `web/app/admin/equipe/page.jsx`

- [ ] **Step 1: Rewrite the page**

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
import { ROLE_ORDER, ROLE_LABELS } from '@/lib/capabilities';

const roleOptions = ROLE_ORDER.map((r) => ({ value: r, label: ROLE_LABELS[r] }));

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
  });
  const updateRoleMutation = useMutation({
    mutationFn: ({ id, role }) => api.post(`/admin/${id}/role`, { role }),
    onSuccess: () => { invalidate(); toast('Rôle mis à jour', 'success'); },
  });
  const deactivateMutation = useMutation({
    mutationFn: (id) => api.post(`/admin/${id}/deactivate`),
    onSuccess: () => { invalidate(); toast('Administrateur désactivé', 'success'); },
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => api.del(`/admin/${id}`),
    onSuccess: () => { invalidate(); toast('Administrateur supprimé', 'success'); },
  });

  const columns = [
    { key: 'name', label: 'Membre', sortable: true, render: (u) => (
      <div className="row gap-3">
        <Avatar name={u.name} size={36} />
        <div><div style={{ fontWeight: 500 }}>{u.name}</div><div className="tiny">{u.email}</div></div>
      </div>
    ) },
    { key: 'role', label: 'Rôle', sortable: true, render: (u) => <span className="small">{ROLE_LABELS[u.role ?? 'admin']}</span> },
    { key: 'last_login_at', label: 'Dernière connexion', sortable: true, render: (u) => <span className="small">{u.last_login_at ? dateFr(u.last_login_at) : 'Jamais connecté'}</span> },
    { key: 'created_at', label: 'Membre depuis', sortable: true, render: (u) => <span className="small">{dateFr(u.created_at)}</span> },
    {
      key: 'actions', label: '', width: 170,
      render: (u) => {
        if (me?.id === u.id) return <span className="tiny muted">Vous</span>;
        return (
          <div className="row gap-2" onClick={(e) => e.stopPropagation()}>
            <ModalButton modal="form" payload={{
              title: 'Modifier le rôle',
              subtitle: `${u.name} — rôle actuel : ${ROLE_LABELS[u.role ?? 'admin']}`,
              submitLabel: 'Enregistrer', successToast: null,
              fields: [{ name: 'role', label: 'Rôle', type: 'select', required: true, value: u.role ?? 'admin', options: roleOptions }],
              onSubmit: (values) => updateRoleMutation.mutateAsync({ id: u.id, role: values.role }),
            }} className="btn btn-soft btn-sm btn-icon" as="button" title="Modifier le rôle">
              <Icon name="edit" size={15} />
            </ModalButton>
            <ModalButton modal="confirm" payload={{
              title: 'Désactiver cet administrateur', danger: true,
              message: `${u.name} perdra l'accès à l'administration.`,
              confirmLabel: 'Désactiver', successToast: null,
              onConfirm: () => deactivateMutation.mutateAsync(u.id),
            }} className="btn btn-danger-soft btn-sm btn-icon" as="button" title="Désactiver">
              <Icon name="shield" size={15} />
            </ModalButton>
            <ModalButton modal="confirm" payload={{
              title: 'Supprimer cet administrateur', danger: true,
              message: `« ${u.name} » sera définitivement supprimé.`,
              confirmLabel: 'Supprimer', successToast: null,
              onConfirm: () => deleteMutation.mutateAsync(u.id),
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
              { name: 'role', label: 'Rôle', type: 'select', required: true, value: 'admin', options: roleOptions },
              { name: 'password', label: 'Mot de passe (8 caractères min.)', type: 'password', required: true },
              { name: 'password_confirmation', label: 'Confirmer le mot de passe', type: 'password', required: true },
            ],
            onSubmit: (values) => addAdminMutation.mutateAsync(values),
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

The signed-in admin's own row still shows only "Vous" with no action buttons at all — role-editing is deliberately excluded from self-service alongside deactivate/delete (an admin downgrading their own role could strip their own access to this very page with no other UI path back, the same self-lockout risk `equipe`'s existing self-deactivate/self-delete block already guards against, just not yet enforced server-side for roles — this task keeps the guard client-side only, matching the plan's stated capability-check scope boundary of not touching the equipe/role-management routes' guards).

- [ ] **Step 2: Verify**

Run (in `web/`): `npm run lint` then `npm run build`.

Manual walkthrough: "Ajouter un administrateur" now includes a "Rôle" select (defaulting to Administrateur); creating an account with role "Modérateur" shows "Modérateur" in the new Rôle column; clicking "Modifier le rôle" on any non-self row opens a form pre-filled with that admin's current role, and saving updates the table on refetch; the signed-in admin's own row still shows only "Vous".

- [ ] **Step 3: Commit**

```bash
git add web/app/admin/equipe/page.jsx
git commit -m "feat(web): add role selector to admin equipe create form and a per-row role editor"
```

---

## Self-review

**1. Spec coverage.** Checked against the Plan 08 design spec's P8-6 row and the 08b sketch:
- "`users.role: 'admin'|'moderateur'|'support'|'comptabilite'` (nullable, meaningful only when `is_admin=true`; existing admin row(s) default `'admin'`)" — Task 2 (entity + migration backfill).
- "`server/src/auth/capabilities.ts` — hardcoded `CAPABILITIES: Record<Role, Set<Capability>>` matching the 11-row mock matrix exactly" — Task 1, transcribed and unit-tested against the mock's exact checkmarks.
- "New `@RequireCapability(...)` decorator + guard... applied progressively to existing admin routes without changing behavior for `'admin'` role" — Tasks 3–5 (decorator + guard + 3 controllers, 6 routes); `hasCapability`'s admin-set-of-11 plus its null/unrecognized-role default both keep `'admin'` role behavior unchanged, verified in Task 1's unit tests and exercised end-to-end in Tasks 3–5's e2e tests.
- "`admin/equipe` create/edit gains a real role selector" — Task 10 (create form's new `role` select field + the new "Modifier le rôle" per-row action, backed by Task 7's new endpoint).
- "`admin/roles` becomes a real, read-only display of the `CAPABILITIES` constant + real per-role member counts (not an editor)" — Task 9, with the decision to remove (not merely leave decorative) the "Nouveau rôle"/"Modifier" controls stated explicitly, matching this program's established precedent.
- The plan's own stated scope boundary (capability-checking applied to exactly 3 controllers / 6 routes, not exhaustively) is stated in the Architecture section up front and is not contradicted by any task — Tasks 3–5 are the only controller modifications that add `@RequireCapability`.

**2. Placeholder scan.** Searched the plan for `TBD`, `TODO`, `FIXME`, `XXX`, "add appropriate", "handle edge cases", "coming soon" — no matches. Every task shows the full, real file content for every file it touches (or, for `registry.jsx`, the exact single line being deleted); every e2e test has real assertions against real response shapes already confirmed from the actual controllers/services/DTOs read during research, not invented ones.

**3. Type/signature consistency.**
- `Role` (server, `capabilities.ts`) = `'admin' | 'moderateur' | 'support' | 'comptabilite'`, and `ROLE_ORDER` (web, `capabilities.js`) = `['admin', 'moderateur', 'support', 'comptabilite']` — same 4 values, same order, in both Task 1 and Task 8.
- `Capability` (server) has the same 11 string values, in the same order, as `CAPABILITY_ORDER` (web) in Task 8 — cross-checked term-by-term against the mock transcription table at the top of Task 1.
- `CAPABILITIES` matrix membership (server `Set<Capability>` vs. web plain arrays) has identical per-role contents in both files — moderateur=5, support=4, comptabilite=3, admin=11, verified against the same transcription table in both Task 1 and Task 8.
- The `role` field name is used identically everywhere it crosses a boundary: `User.role` (entity), `dto.role` (`RegisterAdminDto`, `UpdateAdminRoleDto`), `values.role` (web forms), `u.role` (web table rows) — no task introduces a differently-cased or differently-named variant (no `Role`/`user_role`/`roleId`).
- `hasCapability(role, capability)` (Task 1) is called with exactly this signature from `CapabilityGuard` (Task 3) as `hasCapability(user?.role, required)` — matching argument order and types (`string | null | undefined`, `Capability`).
- The 3 gated capabilities used in `@RequireCapability(...)` calls (`'avis_moderation'`, `'signalements_litiges'`, `'paiements_remboursements'`) are all members of `CAPABILITY_ORDER`/`Capability` defined in Task 1 — no route references a capability string that doesn't exist in the matrix.

**4. Commit message hygiene.** Every commit message across all 9 commits in this plan is a plain, single-line `feat(...)`/`feat(server)`/`feat(web)` message with no `Co-Authored-By` or AI-attribution trailer, per the project's hard rule.

**5. Deviations from a literal reading of the prompt, disclosed here.**
- **`admin/equipe`'s "edit" role selector required a new backend endpoint the design spec sketch didn't explicitly name.** The 08b sketch's schema/backend bullets only mention the `role` column and the capability decorator/guard; it doesn't call out a role-update route. Since the mock's "edit" affordance and this plan's own instruction ("gains a real role selector on create/edit") can't be satisfied by `POST /admin/register` alone (that only covers creation), Task 7 adds one small, clearly-scoped `POST /admin/:id/role` route, guarded by the existing `AdminGuard` only (no capability gate, consistent with the plan's stated 3-controller PoC boundary). This is a minimal, load-bearing addition, not scope creep — without it, "edit" would be false advertising in the plan's own task list.
- **Tasks 6 and 7 share a single commit.** `admin-auth.service.ts` (Task 6) imports `UpdateAdminRoleDto`, which doesn't exist until Task 7's first step. Committing between the two tasks would leave a non-compiling intermediate commit, which contradicts "every commit should represent working state" more than sharing one commit between two adjacent, tightly-coupled tasks does. This is called out explicitly in Task 6's final step rather than silently merging the tasks.

## Exit criteria

- Every admin row that existed before this plan (`is_admin=true`, `role` backfilled to `'admin'` by the migration) has exactly the same access as before — verified by `hasCapability('admin', <any capability>)` always returning `true` (Task 1) and by every existing e2e test in `avis`/`signalements`/`remboursements`/`admin-auth` still passing unmodified (Tasks 2–7).
- A new admin account can be created via `admin/equipe`'s "Ajouter un administrateur" form with one of the 4 real roles selected at creation time (Task 10), and any existing admin's role can be changed afterwards via that same page's new "Modifier le rôle" action (Tasks 7 + 10) — except for the signed-in admin's own row, which has no self-service role edit (nor deactivate/delete), unchanged from before this plan.
- `admin/roles` shows the real, current per-role member counts (queried live from `GET /admin/list`) and the exact 11×4 capability matrix from the original mock, with zero editable or decorative controls — no "Nouveau rôle" button, no "Modifier" button on any role card (Task 9).
- A `moderateur`-role admin can publish/reject avis and resolve/reject signalements, but gets `403 Forbidden` attempting to approve/refuse a remboursement. A `comptabilite`-role admin can approve/refuse remboursements, but gets `403` on avis/signalement moderation actions. A `support`-role admin gets `403` on all three PoC areas (none of its 4 capabilities — `dashboard`, `clients`, `reservations`, `tickets_support` — cover them). All of this is enforced server-side and verified by e2e tests in Tasks 3–5.
- Every other admin route in the codebase (list/read endpoints on avis/signalements/remboursements, and all ~14 other `AdminGuard`-using controllers untouched by this plan — articles, cercles, disciplines, events, email-templates, notifications, promotions, clients, echanges, paiements, praticien-verification, and the admin-auth management routes themselves) is completely unaffected: reachable by any `is_admin=true` user regardless of role, exactly as before this plan.
- What this plan does **not** do, on purpose: it does not build an editable permission-matrix UI (P8-6); it does not gate `admin/equipe`'s own register/deactivate/destroy/role-update routes behind a capability (only `AdminGuard`, as before); it does not retrofit capability-checking onto any admin route beyond the 3 named controllers / 6 named routes. These are exactly the boundaries 08c (audit log), 08d (disputes), and 08f (Stripe Connect admin surface) are expected to build on top of — they should import `Role`/`Capability`/`CAPABILITIES`/`hasCapability` from `server/src/auth/capabilities.ts` and reuse `RequireCapability`/`CapabilityGuard` for their own routes rather than inventing a parallel mechanism.
