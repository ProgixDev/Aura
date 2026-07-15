# Aura Plan 08f — Integrations (Stripe Connect only) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give praticiens a real way to receive their share of booking payments — Stripe Connect Express onboarding, a webhook that tracks when Stripe has actually enabled payouts on the connected account, and a booking PaymentIntent that finally splits funds (`application_fee_amount` + `transfer_data.destination`) instead of always defaulting `commission`/`montant_net_praticien` to 0. The admin `parametres/integrations` page stops pretending Google Calendar/Mailchimp/Twilio/Zapier are connected (they're deleted, not faked), and the praticien mobile dashboard gains a real "Paiements" section.

**Architecture:** New `StripeConnectModule` (`server/src/stripe-connect/`) owns Connect account creation, the onboarding-link endpoint, status lookup, and admin aggregate stats — mirroring the existing `rendez-vous` module's controller/service split. `StripeService` (already real, from Plan 05) gains two thin pass-through methods (`createConnectAccount`, `createAccountLink`) plus an optional Connect-fields parameter on the existing `createPaymentIntent`. The existing single Stripe webhook endpoint (`POST /api/webhooks/stripe`, in `rendez-vous/stripe-webhook.controller.ts`) gains a second event-type branch — `account.updated` routes to `StripeConnectService`, everything else keeps routing to `RendezVousService` exactly as Plan 05 left it. `RendezVousService.create()` becomes Connect-aware: if the praticien has completed onboarding, the PaymentIntent carries `application_fee_amount`/`transfer_data.destination`; if not, it falls back to a plain PaymentIntent (never blocking the booking) and logs a warning that the praticien's share needs manual payout. The webhook's `payment_intent.succeeded` handler reads `application_fee_amount` straight off the Stripe payload to populate `commission`/`montant_net_praticien` on the resulting `paiements` row — the first time either column is ever set to something other than 0.

**Tech Stack:** NestJS 11 + TypeORM (existing) + `stripe` (Node SDK, already installed and pinned to `apiVersion: '2026-06-24.dahlia'` by Plan 05 — this plan does not touch that pin). Web: Next.js 15 + `@tanstack/react-query` (already used by other admin pages, e.g. `web/app/admin/signalements/page.jsx`). Mobile: Expo 54 / React Native + `@tanstack/react-query` (already used by `mobile/app/payment-history.tsx` and others) — no new native dependency; the onboarding link opens in the system browser via React Native's built-in `Linking.openURL`. Server e2e tests stay on Jest + better-sqlite3 with `StripeService` mocked via `overrideProvider`, exactly like Plan 05 — **no test in this plan ever calls real Stripe.**

**Reference:** [Plan 08 design spec](../specs/2026-07-15-aura-08-heavy-modules-design.md) (P8-4, "08f — Integrations" sketch) · [Plan 05 Bookings + Stripe](2026-07-13-aura-05-bookings-stripe.md) (source of truth for the existing `StripeService`, webhook plumbing, and the "supply your own Stripe test keys" framing this plan reuses verbatim)

**Run each `npm` command from the relevant package dir** (`server/`, `web/`, `mobile/`), not the repo root.

---

## Prerequisites — you must supply real Stripe test-mode credentials AND enable Connect before running this end-to-end

This plan's automated tests (server e2e) never touch real Stripe — `StripeService` is mocked via Nest's `overrideProvider` everywhere, exactly as Plan 05 established. But to actually exercise Connect onboarding and a real destination-charge booking by hand, you need everything Plan 05 already asked for, **plus one additional manual step that is a Stripe *dashboard* setting, not a code change**:

1. Everything from [Plan 05's Prerequisites section](2026-07-13-aura-05-bookings-stripe.md#prerequisites--you-must-supply-real-stripe-test-mode-credentials-before-running-this-end-to-end): a Stripe account in test mode, `STRIPE_SECRET_KEY`/`STRIPE_WEBHOOK_SECRET` in `server/.env`, and `stripe listen --forward-to localhost:8000/api/webhooks/stripe` running locally.
2. **Stripe Connect must be enabled on your Stripe account** — in the test-mode dashboard, go to **Connect → Get started** (or `https://dashboard.stripe.com/test/connect/accounts/overview`) and enable Connect if it isn't already. Without this, `stripe.accounts.create({ type: 'express', ... })` returns a real Stripe API error ("Connect is not enabled for your account") — this is a dashboard toggle, not something any code in this plan can do for you.
3. `stripe listen` must also forward `account.updated` events for the local webhook test to receive real onboarding-completion signals: `stripe listen --events payment_intent.succeeded,payment_intent.payment_failed,account.updated --forward-to localhost:8000/api/webhooks/stripe` (Plan 05 only listened for the two `payment_intent.*` events; this plan adds the third).
4. No new frontend env vars are needed — unlike Plan 05's Elements/Payment-Sheet integrations, Connect onboarding here is a server-issued, Stripe-hosted redirect URL, not a client-side Stripe SDK integration. Optionally set `STRIPE_CONNECT_RETURN_URL` in `server/.env` (Task 3 adds it to `.env.example`, empty) if you want the post-onboarding redirect to land somewhere other than the mobile app's default deep link (`aura://dashboard`).

None of the above blocks writing or committing the code in this plan — only manual, real end-to-end verification (Task 9, Step 4).

---

## Design notes — decisions filled in beyond the locked spec

The spec's schema (`praticiens.stripe_account_id`, `praticiens.stripe_payouts_enabled`), the onboarding endpoint, the `account.updated` webhook, and the destination-charge PaymentIntent fields are locked and implemented exactly as given. Several implementation details weren't specified and had to be decided; recorded here so they're visible at self-review time, not buried in a diff.

- **Ground-truth check on the two cross-plan dependencies (Task 1).** This plan was written in parallel with 08a (messaging, which is supposed to add `PraticienGuard`) and 08e (subscriptions, which is supposed to add a commission-rate config). As of this plan's own research (2026-07-15), a repo-wide search confirmed **neither exists yet**: no `server/src/auth/guards/praticien.guard.ts`, no `CurrentPraticien` decorator, no `subscriptions`/`settings` entity or module, and no commission-rate config of any shape anywhere in `server/src`. Task 1 therefore creates `PraticienGuard` itself (mirroring `ClientGuard` exactly) and Task 3 creates a hardcoded commission-rate fallback. **Both are written as explicit ground-truth-check steps** — if you're executing this plan after 08a and/or 08e have actually landed, re-run the searches in Task 1/Task 3 first; if the real artifacts exist by then, use them instead of what's built here (see the specific swap-in instructions in each task).
- **What happens when a praticien hasn't finished Connect onboarding and a client books anyway: proceed without Connect, never block the booking.** The spec explicitly asks this plan to decide and justify. Blocking bookings for praticiens who haven't onboarded to Stripe Connect would break the platform's core revenue path (a client trying to pay a praticien who simply hasn't gotten around to Stripe onboarding yet) over a secondary payout-plumbing concern — and it isn't actually the safer option money-wise: the platform's own Stripe account still captures 100% of the charge either way, so no money is at risk of being lost, only delayed until a manual payout. Attaching `transfer_data.destination` to an account that hasn't completed Connect's `transfers` capability is the option that risks *failing the whole payment* at Stripe's end. So: if `praticien.stripe_account_id` is null or `stripe_payouts_enabled` is false, `RendezVousService.create()` creates a plain, non-Connect PaymentIntent (identical to Plan 05's original behavior) and logs a structured warning naming the rendez-vous and praticien, so ops can find and manually pay out these bookings. `commission`/`montant_net_praticien` stay 0 on the resulting `paiements` row for that booking, honestly reflecting that no split happened.
- **`commission`/`montant_net_praticien` are computed from `application_fee_amount` on the *webhook's* PaymentIntent payload, not recomputed from the commission-rate constant at confirm time.** Stripe's `payment_intent.succeeded` webhook event carries the PaymentIntent object, which includes the real `application_fee_amount` that was actually attached at creation time (0/absent for the no-Connect fallback path above). Reading it straight off the payload means the stored commission always matches what Stripe really charged, with no risk of drifting from a rate that might change between booking creation and webhook delivery, and no need for a new column on `rendez_vous` to smuggle the number through.
- **The `account.updated` handler mirrors Stripe's `charges_enabled`/`payouts_enabled` state in both directions, not a one-way latch.** The spec says "when Stripe reports the account's `charges_enabled`/`payouts_enabled` becoming true, set `stripe_payouts_enabled = true`" — read literally that's one-directional. This plan sets `stripe_payouts_enabled = Boolean(account.charges_enabled && account.payouts_enabled)` on every `account.updated` event, so if Stripe later restricts a connected account (compliance hold, negative balance, etc.) and reports `payouts_enabled: false`, this plan's copy of that flag follows suit. Since Task 6's booking flow uses this flag to decide whether to attach `transfer_data.destination`, a one-way latch would keep routing money to an account Stripe itself has since disabled — a real financial risk. Mirroring both directions is the safer read of "money is involved, pick the safer option," even though it's a small deviation from the spec's literal one-directional phrasing.
- **The onboarding endpoint gains a sibling `GET /praticien/stripe/connect/status` and an admin `GET /admin/integrations/stripe/status`, beyond the spec's one locked route.** The spec only locks `POST /praticien/stripe/connect/onboard`, but the frontend requirements ("shows Connect onboarding status" on mobile, "shows actual connection status" on admin) need *something* to read that status from. Rather than overload the onboard endpoint's response for this, two small read-only GETs were added — both trivial pass-throughs of the two new `praticiens` columns / a `COUNT` aggregate, no new business logic.
- **Admin's "real" Stripe card links out to Stripe's own dashboard rather than building account-management UI in Aura.** The spec explicitly offers this as the simpler option ("just links out to Stripe's dashboard — your call, keep it simple"). Building a table of every praticien's Connect status inside Aura's admin would duplicate what Stripe's own Connect dashboard already does well, for no locked requirement. The card shows a live count (`connected_praticiens / total_praticiens`) from the new admin endpoint plus an external link — enough to prove the integration is real without reinventing Stripe's UI.
- **Connect account creation always requests `country: 'FR'`.** Every other piece of copy in this codebase (VAT rate defaults, `Aura SAS` billing address in `web/app/admin/parametres/facturation/page.jsx`, French-language UI throughout) confirms this is a French platform; Stripe requires a `country` on Express account creation, and there is no per-praticien country field anywhere in the `Praticien` entity to source it from instead.
- **The onboarding link's `refresh_url`/`return_url` default to the mobile app's own deep-link scheme (`aura://dashboard`), not a web URL.** Per this plan's own research (confirmed by grep — see Task 8) and the master research doc's own finding ("no praticien-facing reply surface exists except `mobile/app/dashboard.tsx`"), there is no praticien-facing web surface to redirect back to; the CTA in this plan is mobile-only. `mobile/app.json` already declares `"scheme": "aura"` (confirmed in Task 8's research), so a deep link back into the app after Stripe's hosted onboarding flow is a real, working redirect target, not an invented one. Both URLs are read from a `STRIPE_CONNECT_RETURN_URL` env var with that deep link as the code-level fallback, so this can be swapped to a real `https://` URL later without a code change if Stripe's dashboard-configured allow-list for custom URL schemes ever needs adjusting for a given Stripe account.
- **Mobile praticien login is a known, pre-existing gap this plan does not fix.** A repo-wide search (Task 8) confirms there is no real praticien login flow wired on mobile yet — `useSession().token` is only ever set today by whatever screens set it, and no mobile screen currently calls the real `POST /api/v1/praticien/login` endpoint. This plan's mobile UI (Task 8) assumes `useSession().token` already holds a valid praticien JWT when `role === 'practitioner'`, exactly the same assumption 08a's messaging plan has to make for its own praticien-facing screens — it's a pre-existing, cross-cutting gap in mobile auth wiring, not something introduced or owned by this plan. Manual end-to-end verification of the mobile screen therefore requires manually seeding a praticien JWT (Task 9, Step 4) rather than a real login flow.

---

## File Structure

| File | Responsibility |
|---|---|
| `server/src/auth/guards/praticien.guard.ts` (create, if missing — see Task 1) | `PraticienGuard`, mirrors `ClientGuard`; resolves `req.user.email` against `praticiens`, sets `req.praticien` |
| `server/src/auth/decorators.ts` (modify) | Add `CurrentPraticien` param decorator |
| `server/src/auth/auth.module.ts` (modify) | Register `Praticien` in `TypeOrmModule.forFeature`, register/export `PraticienGuard` |
| `server/test/utils/create-test-app.ts` (modify) | Add `seedPraticienUser()` test helper, mirroring `seedClientUser()` |
| `server/src/common/commission.ts` (create) | `getCommissionRate()` — hardcoded fallback until 08e lands a real config; documented swap-in point |
| `server/src/common/commission.spec.ts` (create) | Unit test for `getCommissionRate()` |
| `server/src/database/entities/praticien.entity.ts` (modify) | Add `stripe_account_id` (nullable), `stripe_payouts_enabled` (boolean, default false) |
| `server/src/database/migrations/1700000000008-AddStripeConnectToPraticiens.ts` (create) | `ALTER TABLE praticiens ADD COLUMN ...` |
| `server/src/common/stripe.service.ts` (modify) | Add `createConnectAccount`, `createAccountLink`; extend `createPaymentIntent` with an optional Connect-fields parameter |
| `server/src/stripe-connect/stripe-connect.module.ts` (create) | Module wiring |
| `server/src/stripe-connect/stripe-connect.controller.ts` (create) | `POST/GET /praticien/stripe/connect/*` (`PraticienGuard`), `GET /admin/integrations/stripe/status` (`AdminGuard`) |
| `server/src/stripe-connect/stripe-connect.service.ts` (create) | Account creation/reuse, onboarding link, status, admin aggregate, `account.updated` handling |
| `server/src/rendez-vous/stripe-webhook.controller.ts` (modify) | Route `account.updated` to `StripeConnectService`; everything else still routes to `RendezVousService` |
| `server/src/rendez-vous/rendez-vous.module.ts` (modify) | Import `StripeConnectModule` |
| `server/src/rendez-vous/rendez-vous.service.ts` (modify) | Connect-aware PaymentIntent creation in `create()`; populate `commission`/`montant_net_praticien` in `confirmFromPaymentIntent()` |
| `server/src/app.module.ts` (modify) | Register `StripeConnectModule` |
| `server/test/stripe-connect.e2e-spec.ts` (create) | Full e2e coverage (Stripe mocked): onboard/status/admin endpoints, `account.updated` webhook, Connect-aware booking creation |
| `web/app/admin/parametres/integrations/page.jsx` (modify) | Delete the 4 decorative cards (Google Calendar/Mailchimp/Twilio/Zapier) and their mock data; Stripe card becomes real |
| `mobile/src/data/types.ts` (modify) | Add `StripeConnectStatus` type |
| `mobile/src/data/repos/index.ts` (modify) | Add `stripeConnectRepo` (real backend calls) |
| `mobile/src/data/repos/stripeConnect.test.ts` (create) | Unit tests for `stripeConnectRepo`, mirrors `rendezVous.test.ts` |
| `mobile/app/dashboard.tsx` (modify) | New "Paiements" section: status + onboarding CTA |

---

## Task 1: `PraticienGuard` — ground-truth check, then create if missing

**Files:**
- Create (if missing): `server/src/auth/guards/praticien.guard.ts`
- Modify: `server/src/auth/decorators.ts`, `server/src/auth/auth.module.ts`, `server/test/utils/create-test-app.ts`

This guard is a cross-plan dependency (08a's messaging plan is also supposed to add it). Do not silently assume either way — verify first.

- [ ] **Step 1: Ground-truth check**

Run (in `server/`):

```bash
find src/auth/guards -iname "praticien.guard.ts"
grep -rn "CurrentPraticien" src/auth/decorators.ts
grep -n "Praticien" src/auth/auth.module.ts
```

- If `praticien.guard.ts` **exists** (08a landed first): read it, confirm it resolves `req.user.email` against the `praticiens` repository and sets `req.praticien` (the same shape `ClientGuard` uses for `req.client`), confirm `CurrentPraticien` exists in `decorators.ts`, and confirm `AuthModule` already registers `Praticien` + the guard. If all three are already correct, **skip Steps 2–6** below and go straight to Step 7 (verify the full suite still passes) before committing nothing (no changes needed) and moving to Task 2.
- If **absent** (confirmed absent as of this plan's own research on 2026-07-15) — proceed with Steps 2–6.

- [ ] **Step 2: Register `Praticien` in `AuthModule` and add `PraticienGuard` to its providers/exports**

Modify `server/src/auth/auth.module.ts` (full resulting file):

```typescript
import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../database/entities/user.entity';
import { Client } from '../database/entities/client.entity';
import { Praticien } from '../database/entities/praticien.entity';
import { JwtStrategy } from './jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AdminGuard } from './guards/admin.guard';
import { ClientGuard } from './guards/client.guard';
import { PraticienGuard } from './guards/praticien.guard';
import { OptionalJwtGuard } from './guards/optional-jwt.guard';
import { HashService } from './hash.service';
import { TokenService } from './token.service';

@Global()
@Module({
  imports: [
    PassportModule,
    TypeOrmModule.forFeature([User, Client, Praticien]),
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: process.env.JWT_SECRET,
        signOptions: { expiresIn: parseInt(process.env.JWT_TTL_MINUTES ?? '60', 10) * 60 },
      }),
    }),
  ],
  providers: [
    JwtStrategy, JwtAuthGuard, AdminGuard, ClientGuard, PraticienGuard,
    OptionalJwtGuard, HashService, TokenService,
  ],
  exports: [
    JwtModule, TypeOrmModule, JwtAuthGuard, AdminGuard, ClientGuard, PraticienGuard,
    OptionalJwtGuard, HashService, TokenService,
  ],
})
export class AuthModule {}
```

- [ ] **Step 3: Create `PraticienGuard`, mirroring `ClientGuard` exactly**

Create `server/src/auth/guards/praticien.guard.ts`:

```typescript
import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Praticien } from '../../database/entities/praticien.entity';

@Injectable()
export class PraticienGuard implements CanActivate {
  constructor(@InjectRepository(Praticien) private readonly praticiens: Repository<Praticien>) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const praticien = req.user?.email
      ? await this.praticiens.findOneBy({ email: req.user.email })
      : null;
    if (!praticien) {
      throw new ForbiddenException({
        status: 'error',
        message: "Vous n'êtes pas autorisé à accéder à cette ressource.",
      });
    }
    req.praticien = praticien;
    return true;
  }
}
```

- [ ] **Step 4: Add the `CurrentPraticien` decorator**

Modify `server/src/auth/decorators.ts` (full resulting file):

```typescript
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext) => ctx.switchToHttp().getRequest().user,
);
export const CurrentClient = createParamDecorator(
  (_: unknown, ctx: ExecutionContext) => ctx.switchToHttp().getRequest().client,
);
export const CurrentPraticien = createParamDecorator(
  (_: unknown, ctx: ExecutionContext) => ctx.switchToHttp().getRequest().praticien,
);
```

- [ ] **Step 5: Add a `seedPraticienUser` test helper, mirroring `seedClientUser`**

Modify `server/test/utils/create-test-app.ts` — add the import and the new function (this file already imports `Praticien`, `bcrypt`, `DataSource`, `User`; only the new function and its `Praticien` usage in a seeding role are new):

```typescript
export async function seedPraticienUser(app: INestApplication, email = 'praticien@test.io') {
  const ds = app.get(DataSource);
  const user = await ds.getRepository(User).save({
    name: 'Praticien Test',
    email,
    password: await bcrypt.hash('password123', 10),
    is_admin: false,
  });
  const praticien = await ds.getRepository(Praticien).save({
    firstname: 'Praticien',
    lastname: 'Test',
    email,
    telephone: '0600000000',
    ville: 'Lyon',
    niveau: 'Expert',
    specialite: 'Sophrologie',
    mode: 'présentiel & visio',
    status: 'actif',
    tarif: 60,
    experience: 5,
    bio: 'Praticien de test pour les specs e2e.',
    statut_verification: 'valide',
  });
  return { user, praticien, token: signToken(app, user) };
}
```

Add this function after the existing `seedClientUser` function, before `signToken` (which it calls and which must already be defined above it, or hoisted — `signToken` is declared with `export function signToken(...)` further down the file, which is fine: function declarations are hoisted in the module, so the call inside `seedPraticienUser` resolves correctly regardless of source order).

- [ ] **Step 6: Verify the guard compiles and doesn't break anything, via a throwaway smoke check**

There is no standalone unit-test convention for guards in this codebase — `ClientGuard` itself has no dedicated spec file; every existing guard is exercised indirectly through the e2e tests of controllers that use it (confirmed by searching `server/src/auth/guards/*.spec.ts` — none exist). `PraticienGuard` will be exercised the same way, by Task 4's `stripe-connect.e2e-spec.ts`. For now, just confirm the module graph still compiles:

Run (in `server/`): `npm run build`
Expected: succeeds, no TypeScript errors.

- [ ] **Step 7: Run the full e2e suite to check for regressions**

Run (in `server/`): `npm run test:e2e`
Expected: PASS — every existing suite still green. `PraticienGuard` isn't wired into any route yet, so this only proves the `AuthModule`/entity/decorator changes didn't break anything already using `AuthModule`.

- [ ] **Step 8: Commit**

```bash
git add server/src/auth/guards/praticien.guard.ts server/src/auth/decorators.ts server/src/auth/auth.module.ts server/test/utils/create-test-app.ts
git commit -m "feat(server): add PraticienGuard mirroring ClientGuard"
```

---

## Task 2: `praticiens.stripe_account_id` / `stripe_payouts_enabled` — entity + migration

**Files:**
- Modify: `server/src/database/entities/praticien.entity.ts`
- Create: `server/src/database/migrations/1700000000008-AddStripeConnectToPraticiens.ts`

- [ ] **Step 1: Add the two columns to the `Praticien` entity**

Modify `server/src/database/entities/praticien.entity.ts` (full resulting file):

```typescript
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
  @Column({ type: 'varchar', nullable: true }) stripe_account_id: string | null;
  @Column({ default: false }) stripe_payouts_enabled: boolean;
  @CreateDateColumn({ name: 'created_at' }) created_at: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updated_at: Date;

  @OneToMany(() => PraticienDocument, (d) => d.praticien) documents: PraticienDocument[];
  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'verifie_par' })
  verifiePar: User | null;
}
```

- [ ] **Step 2: Write the migration**

Create `server/src/database/migrations/1700000000008-AddStripeConnectToPraticiens.ts`, matching the `ALTER TABLE` style already used by `1700000000002-AddFavoritesAndNotificationPreferences.ts`:

```typescript
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStripeConnectToPraticiens1700000000008 implements MigrationInterface {
  public async up(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE praticiens
      ADD COLUMN stripe_account_id VARCHAR(255) NULL,
      ADD COLUMN stripe_payouts_enabled TINYINT(1) NOT NULL DEFAULT 0`);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE praticiens DROP COLUMN stripe_payouts_enabled`);
    await q.query(`ALTER TABLE praticiens DROP COLUMN stripe_account_id`);
  }
}
```

- [ ] **Step 3: Verify the existing suite still passes with the new columns**

Run (in `server/`): `npm run test:e2e`
Expected: PASS — `synchronize: true` in the test harness picks up the two new nullable/defaulted columns on `praticiens` without breaking any existing seed data (every existing `praticiens.save({...})` call across the test suite omits both new columns, which is fine since one is nullable and the other defaults to `false`).

- [ ] **Step 4: Commit**

```bash
git add server/src/database/entities/praticien.entity.ts server/src/database/migrations/1700000000008-AddStripeConnectToPraticiens.ts
git commit -m "feat(server): add stripe_account_id and stripe_payouts_enabled to praticiens"
```

---

## Task 3: Commission-rate fallback + `StripeService` Connect methods

**Files:**
- Create: `server/src/common/commission.ts`
- Test: `server/src/common/commission.spec.ts`
- Modify: `server/src/common/stripe.service.ts`, `server/.env.example`

**Context7 verification:** `mcp__context7__query-docs` against `/stripe/stripe-node` confirmed: `stripe.accounts.create({ type: 'express', country, email, capabilities: { card_payments: { requested: true }, transfers: { requested: true } } })` (from `AccountCreateParams`'s `type: 'custom' | 'express' | 'standard'` union and the library's own connected-account creation examples); `stripe.accountLinks.create({ account, refresh_url, return_url, type: 'account_onboarding' })` (from the library's own `accountLinks.create()` example, using the v1 `AccountLinkCreateParams` shape — not the newer V2 Core API, which uses a different `use_case` nested shape and is not what this codebase's pinned SDK style uses elsewhere); `PaymentIntentCreateParams`/`PaymentIntent` both carry `application_fee_amount: number | null` and `transfer_data?: { destination: string | Account; amount?: number }` (from `src/resources/PaymentIntents.ts`); `Account` exposes `charges_enabled: boolean`, `payouts_enabled: boolean`, `details_submitted: boolean` (from `src/resources/Accounts.ts`) — these are the exact fields the `account.updated` webhook handler (Task 5) reads. None of this was guessed.

- [ ] **Step 1: Ground-truth check for 08e's commission-rate config**

Run (in `server/`):

```bash
grep -rni "commission" src --include=*.ts -l
grep -rni "subscription\|abonnement" src --include=*.ts -l
```

As of this plan's own research (2026-07-15): `commission` only appears in `paiement.entity.ts` (the always-0-today columns this plan finally populates), `paiements.service.ts` (reads/sums the column, doesn't set a rate), `database/migrations/1700000000000-InitialSchema.ts` (column definition), and `README.md`. No `subscriptions`/`abonnements` module, entity, or settings table exists anywhere. **08e has not landed** — proceed with the hardcoded fallback below.

If executing this plan after 08e *has* landed: re-run the greps above. If they now show a real settings/config source for the commission rate (e.g. a `platform_settings` table, a `SubscriptionsModule`-adjacent config service), skip Step 2 below and instead inject/call whatever 08e actually built from `RendezVousService.create()` (Task 6) in place of `getCommissionRate()`. Delete `commission.ts`'s fallback constant at that point — it exists only to unblock this plan while 08e is still pending.

- [ ] **Step 2: Write the failing test**

Create `server/src/common/commission.spec.ts`:

```typescript
import { DEFAULT_COMMISSION_RATE, getCommissionRate } from './commission';

describe('commission', () => {
  it('getCommissionRate returns the platform default commission rate', () => {
    expect(getCommissionRate()).toBe(DEFAULT_COMMISSION_RATE);
  });

  it('DEFAULT_COMMISSION_RATE is a fraction between 0 and 1', () => {
    expect(DEFAULT_COMMISSION_RATE).toBeGreaterThan(0);
    expect(DEFAULT_COMMISSION_RATE).toBeLessThan(1);
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npm test -- commission.spec.ts` (in `server/`)
Expected: FAIL — cannot find module `./commission`.

- [ ] **Step 4: Write `commission.ts`**

Create `server/src/common/commission.ts`:

```typescript
/**
 * Platform commission rate (fraction of `montant_brut` kept by Aura, the rest going to
 * the praticien via Stripe Connect's `application_fee_amount`).
 *
 * This is a hardcoded fallback, matching the decorative default already shown in
 * web/app/admin/parametres/facturation/page.jsx ("Taux de commission (%)", defaultValue
 * "15") — 15%. It exists only because Plan 08e (subscriptions) is the plan that owns
 * building a real, admin-configurable commission-rate setting, and 08e had not landed as
 * of this plan's own research (2026-07-15; see stripe-connect Task 3's ground-truth-check
 * step for the exact search performed).
 *
 * TECH DEBT: once 08e lands a real commission-rate config, replace the body of
 * getCommissionRate() below with a lookup against that config, and delete this constant
 * (and this comment). Every caller of getCommissionRate() (RendezVousService.create(),
 * Task 6) is unaffected by that swap — the function signature stays the same.
 */
export const DEFAULT_COMMISSION_RATE = 0.15;

export function getCommissionRate(): number {
  return DEFAULT_COMMISSION_RATE;
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm test -- commission.spec.ts` (in `server/`)
Expected: PASS (2 tests).

- [ ] **Step 6: Add `createConnectAccount` and `createAccountLink` to `StripeService`; extend `createPaymentIntent` with an optional Connect-fields parameter**

`createConnectAccount`/`createAccountLink` are thin pass-throughs to real network calls — following Plan 05's own precedent for `createPaymentIntent` (see that plan's `stripe.service.spec.ts`, which deliberately tests only `constructWebhookEvent`, the one genuinely offline-testable method), neither gets a dedicated unit test here; both are exercised via e2e with `StripeService` mocked (Task 4/5).

Modify `server/src/common/stripe.service.ts` (full resulting file):

```typescript
import { Injectable } from '@nestjs/common';
import Stripe from 'stripe';

// Pinned to the Stripe API version this SDK release ships with (confirmed via context7
// against stripe-node's own src/apiVersion.ts) rather than left to drift.
const STRIPE_API_VERSION = '2026-06-24.dahlia';

export interface PaymentIntentConnectFields {
  applicationFeeAmount: number;
  destination: string;
}

@Injectable()
export class StripeService {
  private readonly stripe: Stripe;

  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', {
      apiVersion: STRIPE_API_VERSION,
    });
  }

  createPaymentIntent(
    amountCents: number,
    metadata: Record<string, string>,
    connect?: PaymentIntentConnectFields,
  ) {
    return this.stripe.paymentIntents.create({
      amount: amountCents,
      currency: 'eur',
      metadata,
      // Lets PaymentElement (web) / the Payment Sheet (mobile) offer whatever payment
      // methods are enabled on the Stripe account, without hardcoding to 'card' only.
      automatic_payment_methods: { enabled: true },
      // Standard Stripe Connect "destination charges" pattern: the platform's own Stripe
      // account is the merchant of record, application_fee_amount is what the platform
      // keeps, and the rest is transferred automatically to the connected account once the
      // charge settles. Only attached when the caller resolved a Connect-eligible praticien
      // (see RendezVousService.create(), Task 6) — omitted entirely otherwise, so this stays
      // byte-for-byte identical to Plan 05's original call for every existing test/caller
      // that doesn't pass `connect`.
      ...(connect
        ? {
            application_fee_amount: connect.applicationFeeAmount,
            transfer_data: { destination: connect.destination },
          }
        : {}),
    });
  }

  createConnectAccount(email: string) {
    return this.stripe.accounts.create({
      type: 'express',
      country: 'FR',
      email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
    });
  }

  createAccountLink(accountId: string, refreshUrl: string, returnUrl: string) {
    return this.stripe.accountLinks.create({
      account: accountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: 'account_onboarding',
    });
  }

  constructWebhookEvent(rawBody: Buffer, signature: string, secret: string): Stripe.Event {
    return this.stripe.webhooks.constructEvent(rawBody, signature, secret);
  }
}
```

- [ ] **Step 7: Append the Connect return-URL env var**

Modify `server/.env.example` — append (do not reformat the existing lines):

```
STRIPE_CONNECT_RETURN_URL=
```

- [ ] **Step 8: Run the full unit + e2e suites to check for regressions**

Run (in `server/`): `npm test`
Expected: PASS, including the new `commission.spec.ts` (2 tests) alongside the existing `stripe.service.spec.ts` (2 tests, untouched — `constructWebhookEvent` wasn't modified).

Run (in `server/`): `npm run test:e2e`
Expected: PASS — in particular, `rendez-vous.e2e-spec.ts`'s existing assertions like `expect(stripeServiceMock.createPaymentIntent).toHaveBeenCalledWith(8000, { rendez_vous_id: ... })` (an exact 2-argument match) still pass unmodified, because `createPaymentIntent`'s new third parameter is optional and this plan's own Task 6 only ever passes it when a praticien is actually Connect-eligible — no existing test seeds a praticien with `stripe_account_id` set, so every existing call site still invokes the mock with exactly 2 arguments.

- [ ] **Step 9: Commit**

```bash
git add server/src/common/commission.ts server/src/common/commission.spec.ts server/src/common/stripe.service.ts server/.env.example
git commit -m "feat(server): add commission-rate fallback and Stripe Connect account/link methods"
```

---

## Task 4: `StripeConnectModule` — onboarding, status, admin aggregate

**Files:**
- Create: `server/src/stripe-connect/stripe-connect.module.ts`, `server/src/stripe-connect/stripe-connect.controller.ts`, `server/src/stripe-connect/stripe-connect.service.ts`
- Modify: `server/src/app.module.ts`
- Test: `server/test/stripe-connect.e2e-spec.ts` (create)

- [ ] **Step 1: Write the failing e2e tests**

Create `server/test/stripe-connect.e2e-spec.ts`:

```typescript
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { createTestApp, seedAdmin, seedClientUser, seedPraticienUser } from './utils/create-test-app';
import { StripeConnectModule } from '../src/stripe-connect/stripe-connect.module';
import { StripeService } from '../src/common/stripe.service';
import { Praticien } from '../src/database/entities/praticien.entity';

const stripeServiceMock = {
  createPaymentIntent: jest.fn(),
  constructWebhookEvent: jest.fn(),
  createConnectAccount: jest.fn().mockResolvedValue({ id: 'acct_test_123' }),
  createAccountLink: jest.fn().mockResolvedValue({ url: 'https://connect.stripe.com/setup/test_123' }),
};

describe('stripe-connect (praticien + admin endpoints)', () => {
  let app: INestApplication;
  let ds: DataSource;

  beforeAll(async () => {
    app = await createTestApp(
      { imports: [StripeConnectModule] },
      [{ provide: StripeService, useValue: stripeServiceMock }],
    );
    ds = app.get(DataSource);
  });
  afterAll(async () => { await app.close(); });
  beforeEach(() => { jest.clearAllMocks(); });
  const http = () => request(app.getHttpServer());

  it('POST /api/praticien/stripe/connect/onboard requires auth', async () => {
    await http().post('/api/praticien/stripe/connect/onboard').expect(401);
  });

  it('POST /api/praticien/stripe/connect/onboard 403s for a non-praticien user', async () => {
    const client = await seedClientUser(app, 'sc-client@aura.io');
    const res = await http().post('/api/praticien/stripe/connect/onboard')
      .set('Authorization', `Bearer ${client.token}`).expect(403);
    expect(res.body.message).toBe("Vous n'êtes pas autorisé à accéder à cette ressource.");
  });

  it('POST /api/praticien/stripe/connect/onboard creates a Connect account on first call and returns an onboarding url', async () => {
    const { praticien, token } = await seedPraticienUser(app, 'sc-praticien-1@aura.io');
    const res = await http().post('/api/praticien/stripe/connect/onboard')
      .set('Authorization', `Bearer ${token}`).expect(200);
    expect(res.body.data.url).toBe('https://connect.stripe.com/setup/test_123');
    expect(stripeServiceMock.createConnectAccount).toHaveBeenCalledWith('sc-praticien-1@aura.io');
    expect(stripeServiceMock.createAccountLink).toHaveBeenCalledWith(
      'acct_test_123', expect.any(String), expect.any(String),
    );
    const fresh = await ds.getRepository(Praticien).findOneByOrFail({ id: praticien.id });
    expect(fresh.stripe_account_id).toBe('acct_test_123');
  });

  it('POST /api/praticien/stripe/connect/onboard reuses the existing account on a second call', async () => {
    const { token } = await seedPraticienUser(app, 'sc-praticien-2@aura.io');
    await http().post('/api/praticien/stripe/connect/onboard').set('Authorization', `Bearer ${token}`).expect(200);
    jest.clearAllMocks();
    const res = await http().post('/api/praticien/stripe/connect/onboard')
      .set('Authorization', `Bearer ${token}`).expect(200);
    expect(res.body.data.url).toBe('https://connect.stripe.com/setup/test_123');
    expect(stripeServiceMock.createConnectAccount).not.toHaveBeenCalled();
    expect(stripeServiceMock.createAccountLink).toHaveBeenCalledWith('acct_test_123', expect.any(String), expect.any(String));
  });

  it('GET /api/praticien/stripe/connect/status reports the current onboarding state', async () => {
    const { token } = await seedPraticienUser(app, 'sc-praticien-3@aura.io');
    const before = await http().get('/api/praticien/stripe/connect/status')
      .set('Authorization', `Bearer ${token}`).expect(200);
    expect(before.body.data).toEqual({ stripe_account_id: null, stripe_payouts_enabled: false });

    await http().post('/api/praticien/stripe/connect/onboard').set('Authorization', `Bearer ${token}`).expect(200);
    const after = await http().get('/api/praticien/stripe/connect/status')
      .set('Authorization', `Bearer ${token}`).expect(200);
    expect(after.body.data).toEqual({ stripe_account_id: 'acct_test_123', stripe_payouts_enabled: false });
  });

  it('GET /api/admin/integrations/stripe/status requires AdminGuard and returns aggregate counts', async () => {
    await http().get('/api/admin/integrations/stripe/status').expect(401);

    const { token: praticienToken } = await seedPraticienUser(app, 'sc-praticien-4@aura.io');
    await http().get('/api/admin/integrations/stripe/status')
      .set('Authorization', `Bearer ${praticienToken}`).expect(403);

    const admin = await seedAdmin(app, 'sc-admin@aura.io');
    const res = await http().get('/api/admin/integrations/stripe/status')
      .set('Authorization', `Bearer ${admin.token}`).expect(200);
    expect(res.body.data.total_praticiens).toBeGreaterThanOrEqual(4);
    expect(typeof res.body.data.connected_praticiens).toBe('number');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm run test:e2e -- stripe-connect.e2e-spec.ts` (in `server/`)
Expected: FAIL — `Cannot find module '../src/stripe-connect/stripe-connect.module'`.

- [ ] **Step 3: Write `StripeConnectService`**

Create `server/src/stripe-connect/stripe-connect.service.ts`:

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Stripe from 'stripe';
import { Praticien } from '../database/entities/praticien.entity';
import { StripeService } from '../common/stripe.service';
import { success } from '../common/envelope';

// Stripe-hosted onboarding is a browser flow; there is no praticien-facing web surface to
// redirect back to (confirmed by this plan's own research — see Task 8), so both the
// refresh and return URLs default to the mobile app's own deep-link scheme. Overridable via
// env in case a given Stripe account's allow-list needs a real https:// URL instead.
const CONNECT_RETURN_URL = process.env.STRIPE_CONNECT_RETURN_URL || 'aura://dashboard';

@Injectable()
export class StripeConnectService {
  private readonly logger = new Logger(StripeConnectService.name);

  constructor(
    @InjectRepository(Praticien) private readonly praticiens: Repository<Praticien>,
    private readonly stripeService: StripeService,
  ) {}

  async onboard(praticien: Praticien) {
    let accountId = praticien.stripe_account_id;
    if (!accountId) {
      const account = await this.stripeService.createConnectAccount(praticien.email);
      accountId = account.id;
      await this.praticiens.update(praticien.id, { stripe_account_id: accountId });
    }
    const link = await this.stripeService.createAccountLink(accountId, CONNECT_RETURN_URL, CONNECT_RETURN_URL);
    return success({ url: link.url });
  }

  status(praticien: Praticien) {
    return success({
      stripe_account_id: praticien.stripe_account_id,
      stripe_payouts_enabled: praticien.stripe_payouts_enabled,
    });
  }

  async adminStatus() {
    const total_praticiens = await this.praticiens.count();
    const connected_praticiens = await this.praticiens.count({ where: { stripe_payouts_enabled: true } });
    return success({ total_praticiens, connected_praticiens });
  }

  async handleAccountUpdated(event: Stripe.Event) {
    const account = event.data.object as Stripe.Account;
    const praticien = await this.praticiens.findOneBy({ stripe_account_id: account.id });
    if (!praticien) return success(undefined, 'ok');

    // Mirrors Stripe's real-time state in both directions (not a one-way latch): if Stripe
    // later restricts an account that was previously payout-enabled, this plan's copy of
    // that flag must follow suit, since RendezVousService.create() (Task 6) uses it to
    // decide whether to route money to this account. See this plan's Design notes.
    const payoutsEnabled = Boolean(account.charges_enabled && account.payouts_enabled);
    if (praticien.stripe_payouts_enabled !== payoutsEnabled) {
      await this.praticiens.update(praticien.id, { stripe_payouts_enabled: payoutsEnabled });
      this.logger.log(`praticien ${praticien.id} stripe_payouts_enabled -> ${payoutsEnabled}`);
    }
    return success(undefined, 'ok');
  }
}
```

- [ ] **Step 4: Write `StripeConnectController`**

Create `server/src/stripe-connect/stripe-connect.controller.ts`:

```typescript
import { Controller, Get, HttpCode, Post, UseGuards } from '@nestjs/common';
import { StripeConnectService } from './stripe-connect.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PraticienGuard } from '../auth/guards/praticien.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { CurrentPraticien } from '../auth/decorators';
import { Praticien } from '../database/entities/praticien.entity';

@Controller()
export class StripeConnectController {
  constructor(private readonly service: StripeConnectService) {}

  @UseGuards(JwtAuthGuard, PraticienGuard)
  @HttpCode(200)
  @Post('praticien/stripe/connect/onboard')
  onboard(@CurrentPraticien() praticien: Praticien) {
    return this.service.onboard(praticien);
  }

  @UseGuards(JwtAuthGuard, PraticienGuard)
  @Get('praticien/stripe/connect/status')
  status(@CurrentPraticien() praticien: Praticien) {
    return this.service.status(praticien);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('admin/integrations/stripe/status')
  adminStatus() {
    return this.service.adminStatus();
  }
}
```

- [ ] **Step 5: Write `StripeConnectModule`**

Create `server/src/stripe-connect/stripe-connect.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Praticien } from '../database/entities/praticien.entity';
import { StripeConnectController } from './stripe-connect.controller';
import { StripeConnectService } from './stripe-connect.service';
import { StripeService } from '../common/stripe.service';

@Module({
  imports: [TypeOrmModule.forFeature([Praticien])],
  controllers: [StripeConnectController],
  providers: [StripeConnectService, StripeService],
  exports: [StripeConnectService],
})
export class StripeConnectModule {}
```

- [ ] **Step 6: Register the module in `AppModule`**

Modify `server/src/app.module.ts` — add the import and list entry:

```typescript
import { StripeConnectModule } from './stripe-connect/stripe-connect.module';
```

```typescript
    RemboursementsModule,
    StripeConnectModule,
    AvisModule,
```

(Placed alongside the other feature modules; order within the `imports` array has no functional effect.)

- [ ] **Step 7: Run the tests to verify they pass**

Run: `npm run test:e2e -- stripe-connect.e2e-spec.ts` (in `server/`)
Expected: PASS (6 tests).

- [ ] **Step 8: Run the full e2e suite to check for regressions**

Run: `npm run test:e2e` (in `server/`)
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add server/src/stripe-connect server/src/app.module.ts server/test/stripe-connect.e2e-spec.ts
git commit -m "feat(server): add Stripe Connect onboarding, status, and admin endpoints"
```

---

## Task 5: `account.updated` webhook routing

**Files:**
- Modify: `server/src/rendez-vous/stripe-webhook.controller.ts`, `server/src/rendez-vous/rendez-vous.module.ts`
- Test: `server/test/stripe-connect.e2e-spec.ts` (modify)

There is exactly one Stripe webhook endpoint in this codebase (`POST /api/webhooks/stripe`, registered by `RendezVousModule`) — Stripe delivers every subscribed event type to the same URL. This task adds a second event-type branch to the existing controller rather than standing up a second endpoint, so this plan doesn't require the user to configure a second webhook in their Stripe dashboard.

- [ ] **Step 1: Write the failing e2e tests**

Add a second `describe` block to `server/test/stripe-connect.e2e-spec.ts`, after the existing one — this one needs `RendezVousModule` (where `StripeWebhookController` lives), which after this task's Step 3 will transitively pull in `StripeConnectModule` too.

First, add this import to the file's existing top-of-file import block (alongside `createTestApp`, `StripeConnectModule`, `StripeService`, `Praticien`) — do not place it mid-file:

```typescript
import { RendezVousModule } from '../src/rendez-vous/rendez-vous.module';
```

Then append the new `describe` block itself, after the closing `});` of the first one:

```typescript
describe('stripe-connect (account.updated webhook)', () => {
  let app: INestApplication;
  let ds: DataSource;

  const webhookStripeMock = {
    createPaymentIntent: jest.fn().mockResolvedValue({ id: 'pi_test_999', client_secret: 'pi_test_999_secret' }),
    constructWebhookEvent: jest.fn(),
    createConnectAccount: jest.fn().mockResolvedValue({ id: 'acct_webhook_test' }),
    createAccountLink: jest.fn().mockResolvedValue({ url: 'https://connect.stripe.com/setup/webhook_test' }),
  };

  beforeAll(async () => {
    app = await createTestApp(
      { imports: [RendezVousModule] },
      [{ provide: StripeService, useValue: webhookStripeMock }],
    );
    ds = app.get(DataSource);
  });
  afterAll(async () => { await app.close(); });
  beforeEach(() => { jest.clearAllMocks(); });
  const http = () => request(app.getHttpServer());

  it('POST /api/webhooks/stripe account.updated sets stripe_payouts_enabled true once both flags are true', async () => {
    const { praticien, token } = await seedPraticienUser(app, 'wh-praticien-1@aura.io');
    await http().post('/api/praticien/stripe/connect/onboard').set('Authorization', `Bearer ${token}`).expect(200);

    const fakeEvent = {
      id: 'evt_acct_1',
      type: 'account.updated',
      data: { object: { id: 'acct_webhook_test', charges_enabled: true, payouts_enabled: true, details_submitted: true } },
    };
    webhookStripeMock.constructWebhookEvent.mockImplementation(() => fakeEvent);
    await http().post('/api/webhooks/stripe').set('stripe-signature', 'sig').send(fakeEvent).expect(200);

    const fresh = await ds.getRepository(Praticien).findOneByOrFail({ id: praticien.id });
    expect(fresh.stripe_payouts_enabled).toBe(true);
  });

  it('POST /api/webhooks/stripe account.updated reverts stripe_payouts_enabled to false if Stripe later disables the account', async () => {
    const { praticien, token } = await seedPraticienUser(app, 'wh-praticien-2@aura.io');
    await http().post('/api/praticien/stripe/connect/onboard').set('Authorization', `Bearer ${token}`).expect(200);

    const enabledEvent = {
      id: 'evt_acct_2a', type: 'account.updated',
      data: { object: { id: 'acct_webhook_test', charges_enabled: true, payouts_enabled: true } },
    };
    webhookStripeMock.constructWebhookEvent.mockImplementationOnce(() => enabledEvent);
    await http().post('/api/webhooks/stripe').set('stripe-signature', 'sig').send(enabledEvent).expect(200);
    expect((await ds.getRepository(Praticien).findOneByOrFail({ id: praticien.id })).stripe_payouts_enabled).toBe(true);

    const disabledEvent = {
      id: 'evt_acct_2b', type: 'account.updated',
      data: { object: { id: 'acct_webhook_test', charges_enabled: false, payouts_enabled: false } },
    };
    webhookStripeMock.constructWebhookEvent.mockImplementationOnce(() => disabledEvent);
    await http().post('/api/webhooks/stripe').set('stripe-signature', 'sig').send(disabledEvent).expect(200);
    expect((await ds.getRepository(Praticien).findOneByOrFail({ id: praticien.id })).stripe_payouts_enabled).toBe(false);
  });

  it('POST /api/webhooks/stripe account.updated for an unknown account id is a no-op 200', async () => {
    const fakeEvent = {
      id: 'evt_acct_unknown', type: 'account.updated',
      data: { object: { id: 'acct_does_not_exist', charges_enabled: true, payouts_enabled: true } },
    };
    webhookStripeMock.constructWebhookEvent.mockImplementationOnce(() => fakeEvent);
    await http().post('/api/webhooks/stripe').set('stripe-signature', 'sig').send(fakeEvent).expect(200);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm run test:e2e -- stripe-connect.e2e-spec.ts` (in `server/`)
Expected: FAIL — the `acct_webhook_test` account never gets `stripe_payouts_enabled` set, because the webhook controller doesn't yet route `account.updated` anywhere (`RendezVousService.handleStripeWebhookEvent` silently ignores unrecognized event types and returns `ok`, so the request itself returns 200 but the assertion on the praticien row fails).

- [ ] **Step 3: Import `StripeConnectModule` into `RendezVousModule`**

Modify `server/src/rendez-vous/rendez-vous.module.ts` (full resulting file):

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RendezVous } from '../database/entities/rendez-vous.entity';
import { Paiement } from '../database/entities/paiement.entity';
import { Praticien } from '../database/entities/praticien.entity';
import { RendezVousController } from './rendez-vous.controller';
import { StripeWebhookController } from './stripe-webhook.controller';
import { RendezVousService } from './rendez-vous.service';
import { StripeService } from '../common/stripe.service';
import { PromotionsModule } from '../promotions/promotions.module';
import { StripeConnectModule } from '../stripe-connect/stripe-connect.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([RendezVous, Paiement, Praticien]),
    PromotionsModule,
    StripeConnectModule,
  ],
  controllers: [RendezVousController, StripeWebhookController],
  providers: [RendezVousService, StripeService],
})
export class RendezVousModule {}
```

- [ ] **Step 4: Route `account.updated` in `StripeWebhookController`**

Modify `server/src/rendez-vous/stripe-webhook.controller.ts` (full resulting file):

```typescript
import { BadRequestException, Controller, Headers, HttpCode, Post, Req } from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import Stripe from 'stripe';
import { RendezVousService } from './rendez-vous.service';
import { StripeConnectService } from '../stripe-connect/stripe-connect.service';
import { StripeService } from '../common/stripe.service';

@Controller('webhooks/stripe')
export class StripeWebhookController {
  constructor(
    private readonly rendezVousService: RendezVousService,
    private readonly stripeConnectService: StripeConnectService,
    private readonly stripeService: StripeService,
  ) {}

  @HttpCode(200)
  @Post()
  async handle(@Req() req: RawBodyRequest<Request>, @Headers('stripe-signature') signature: string) {
    let event: Stripe.Event;
    try {
      event = this.stripeService.constructWebhookEvent(
        req.rawBody as Buffer,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET ?? '',
      );
    } catch {
      throw new BadRequestException({ status: 'error', message: 'Signature Stripe invalide' });
    }
    if (event.type === 'account.updated') {
      return this.stripeConnectService.handleAccountUpdated(event);
    }
    return this.rendezVousService.handleStripeWebhookEvent(event);
  }
}
```

This is additive only — every event type Plan 05 already handled (`payment_intent.succeeded`, `payment_intent.payment_failed`) still falls through to `rendezVousService.handleStripeWebhookEvent(event)` exactly as before; `account.updated` is the one new branch.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm run test:e2e -- stripe-connect.e2e-spec.ts` (in `server/`)
Expected: PASS (9 tests total across both `describe` blocks).

- [ ] **Step 6: Run the full e2e suite to check for regressions**

Run: `npm run test:e2e` (in `server/`)
Expected: PASS — in particular `rendez-vous.e2e-spec.ts`'s own webhook tests (Plan 05's Task 6) are unaffected, since `payment_intent.*` events still route the same way they always did.

- [ ] **Step 7: Commit**

```bash
git add server/src/rendez-vous/rendez-vous.module.ts server/src/rendez-vous/stripe-webhook.controller.ts server/test/stripe-connect.e2e-spec.ts
git commit -m "feat(server): route account.updated webhook events to StripeConnectService"
```

---

## Task 6: Connect-aware booking PaymentIntent + real `commission`/`montant_net_praticien`

**Files:**
- Modify: `server/src/rendez-vous/rendez-vous.service.ts`
- Test: `server/test/stripe-connect.e2e-spec.ts` (modify)

This is the task that finally gives `paiements.commission`/`montant_net_praticien` real, non-zero values — both columns have defaulted to 0 for every payment since Plan 05, since nothing ever set them.

- [ ] **Step 1: Write the failing e2e tests**

Add these tests inside the second `describe` block in `server/test/stripe-connect.e2e-spec.ts` (the one importing `RendezVousModule`), after the existing `account.updated` tests. They need two more seeded `Praticien` rows. Declare the two ID variables right after the block's existing `let app`/`let ds` declarations, then add a **second, separate `beforeAll(...)`** call — do not merge this into Task 5's existing `beforeAll`; Jest runs multiple `beforeAll`s in the same `describe` in declaration order, so a second one added after the first (both inside the same `describe`) runs after Task 5's app/ds setup completes, with `ds` already available as a variable from the outer `describe` scope:

```typescript
  let connectEnabledPraticienId: number;
  let notConnectedPraticienId: number;

  beforeAll(async () => {
    const connectEnabled = await ds.getRepository(Praticien).save({
      firstname: 'Connectée', lastname: 'Praticienne', email: 'wh-connect-enabled@aura.io',
      telephone: '06', ville: 'Nice', niveau: 'Expert', specialite: 'Reiki',
      mode: 'présentiel & visio', status: 'actif', tarif: 100, experience: 8,
      bio: 'Praticienne avec Stripe Connect actif.', statut_verification: 'valide',
      stripe_account_id: 'acct_booking_connected', stripe_payouts_enabled: true,
    });
    connectEnabledPraticienId = connectEnabled.id;

    const notConnected = await ds.getRepository(Praticien).save({
      firstname: 'NonConnectée', lastname: 'Praticienne', email: 'wh-not-connected@aura.io',
      telephone: '06', ville: 'Nice', niveau: 'Novice', specialite: 'Reiki',
      mode: 'présentiel & visio', status: 'actif', tarif: 80, experience: 1,
      bio: 'Praticienne sans Stripe Connect.', statut_verification: 'valide',
    });
    notConnectedPraticienId = notConnected.id;
  });

  it('POST /api/rendez-vous attaches application_fee_amount + transfer_data.destination when the praticien is Connect-enabled', async () => {
    const { token } = await seedClientUser(app, 'wh-booking-client-1@aura.io');
    const res = await http().post('/api/rendez-vous')
      .set('Authorization', `Bearer ${token}`)
      .send({ praticien_id: connectEnabledPraticienId, date_heure: '2026-09-01T10:00:00', mode: 'visio' })
      .expect(201);
    expect(res.body.data.rendez_vous.tarif).toBe(100);
    expect(webhookStripeMock.createPaymentIntent).toHaveBeenCalledWith(
      10000,
      { rendez_vous_id: String(res.body.data.rendez_vous.id) },
      { applicationFeeAmount: 1500, destination: 'acct_booking_connected' }, // 15% of 100€
    );
  });

  it('POST /api/rendez-vous falls back to a plain PaymentIntent when the praticien has not finished Connect onboarding', async () => {
    const { token } = await seedClientUser(app, 'wh-booking-client-2@aura.io');
    const res = await http().post('/api/rendez-vous')
      .set('Authorization', `Bearer ${token}`)
      .send({ praticien_id: notConnectedPraticienId, date_heure: '2026-09-01T11:00:00', mode: 'visio' })
      .expect(201);
    expect(webhookStripeMock.createPaymentIntent).toHaveBeenCalledWith(
      8000,
      { rendez_vous_id: String(res.body.data.rendez_vous.id) },
    );
  });

  it('POST /api/webhooks/stripe payment_intent.succeeded populates commission/montant_net_praticien from application_fee_amount', async () => {
    const { token } = await seedClientUser(app, 'wh-booking-client-3@aura.io');
    const created = await http().post('/api/rendez-vous')
      .set('Authorization', `Bearer ${token}`)
      .send({ praticien_id: connectEnabledPraticienId, date_heure: '2026-09-02T10:00:00', mode: 'visio' })
      .expect(201);
    const rdv = created.body.data.rendez_vous;

    const fakeEvent = {
      id: 'evt_pi_connect_1', type: 'payment_intent.succeeded',
      data: { object: { id: 'pi_connect_1', application_fee_amount: 1500, metadata: { rendez_vous_id: String(rdv.id) } } },
    };
    webhookStripeMock.constructWebhookEvent.mockImplementationOnce(() => fakeEvent);
    await http().post('/api/webhooks/stripe').set('stripe-signature', 'sig').send(fakeEvent).expect(200);

    const paiement = await ds.getRepository(Paiement).findOneByOrFail({ rendez_vous_id: rdv.id });
    expect(paiement.commission).toBe(15);
    expect(paiement.montant_net_praticien).toBe(85);
  });
```

Add the corresponding `Paiement` import to the file's existing top-of-file import block, alongside `RendezVousModule` (added in Task 5) — not mid-file:

```typescript
import { Paiement } from '../src/database/entities/paiement.entity';
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm run test:e2e -- stripe-connect.e2e-spec.ts` (in `server/`)
Expected: FAIL — `createPaymentIntent` is called with only 2 arguments regardless of the praticien's Connect status (the 3-argument assertion for the Connect-enabled praticien fails), and the `commission`/`montant_net_praticien` assertions fail (both still 0).

- [ ] **Step 3: Make `RendezVousService.create()` Connect-aware and populate commission on confirm**

Modify `server/src/rendez-vous/rendez-vous.service.ts` (full resulting file):

```typescript
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import Stripe from 'stripe';
import { RendezVous } from '../database/entities/rendez-vous.entity';
import { Paiement } from '../database/entities/paiement.entity';
import { Praticien } from '../database/entities/praticien.entity';
import { Client } from '../database/entities/client.entity';
import { success } from '../common/envelope';
import { parsePagination, paginateQb } from '../common/pagination';
import { StripeService } from '../common/stripe.service';
import { getCommissionRate } from '../common/commission';
import { PromotionsService } from '../promotions/promotions.service';
import { CreateRendezVousDto } from './dto/create-rendez-vous.dto';

@Injectable()
export class RendezVousService {
  private readonly logger = new Logger(RendezVousService.name);

  constructor(
    @InjectRepository(RendezVous) private readonly rendezVous: Repository<RendezVous>,
    @InjectRepository(Paiement) private readonly paiements: Repository<Paiement>,
    @InjectRepository(Praticien) private readonly praticiens: Repository<Praticien>,
    private readonly stripeService: StripeService,
    private readonly promotionsService: PromotionsService,
  ) {}

  private notFound(message: string): never {
    throw new NotFoundException({ status: 'error', message });
  }

  private withRelations() {
    return this.rendezVous.createQueryBuilder('rdv')
      .leftJoinAndSelect('rdv.praticien', 'praticien');
  }

  async create(client: Client, dto: CreateRendezVousDto) {
    const praticien = await this.praticiens.findOneBy({ id: dto.praticien_id });
    if (!praticien) this.notFound('Praticien introuvable');

    let tarif = praticien.tarif;
    let promotionId: number | null = null;
    if (dto.promotion_code) {
      const promo = await this.promotionsService.validate(dto.promotion_code);
      tarif = promo.type === 'pourcentage'
        ? tarif * (1 - promo.valeur / 100)
        : Math.max(0, tarif - promo.valeur);
      tarif = Math.round(tarif * 100) / 100;
      promotionId = promo.id;
    }

    const saved = await this.rendezVous.save({
      client_id: client.id,
      praticien_id: dto.praticien_id,
      date_heure: new Date(dto.date_heure),
      duree_minutes: 60,
      mode: dto.mode,
      statut: 'en_attente',
      tarif,
      promotion_id: promotionId,
    });

    const amountCents = Math.round(tarif * 100);
    let paymentIntent: Stripe.PaymentIntent;
    if (praticien.stripe_account_id && praticien.stripe_payouts_enabled) {
      // Standard Stripe Connect "destination charges" pattern — see StripeService.createPaymentIntent.
      paymentIntent = await this.stripeService.createPaymentIntent(
        amountCents,
        { rendez_vous_id: String(saved.id) },
        {
          applicationFeeAmount: Math.round(amountCents * getCommissionRate()),
          destination: praticien.stripe_account_id,
        },
      );
    } else {
      // Praticien hasn't finished Connect onboarding — never block the booking over payout
      // plumbing (see this plan's Design notes). The platform's own Stripe account still
      // captures the full charge; the praticien's share needs a manual payout later.
      this.logger.warn(
        `rendez_vous ${saved.id}: praticien ${praticien.id} n'a pas terminé l'onboarding Stripe Connect — paiement créé sans reversement automatique, versement manuel requis.`,
      );
      paymentIntent = await this.stripeService.createPaymentIntent(amountCents, { rendez_vous_id: String(saved.id) });
    }
    await this.rendezVous.update(saved.id, { stripe_payment_intent_id: paymentIntent.id });

    const fresh = await this.withRelations().where('rdv.id = :id', { id: saved.id }).getOne();
    return success({ rendez_vous: fresh, client_secret: paymentIntent.client_secret });
  }

  async indexForClient(client: Client, query: Record<string, any>) {
    const { page, perPage } = parsePagination(query, 10);
    const qb = this.withRelations().where('rdv.client_id = :cid', { cid: client.id });
    if (query.statut !== undefined) qb.andWhere('rdv.statut = :st', { st: query.statut });
    qb.orderBy('rdv.date_heure', 'DESC');
    const { data, pagination } = await paginateQb(qb, page, perPage);
    return success(data, undefined, { pagination });
  }

  async showForClient(client: Client, id: number) {
    const rdv = await this.withRelations()
      .where('rdv.id = :id AND rdv.client_id = :cid', { id, cid: client.id }).getOne();
    if (!rdv) this.notFound('Rendez-vous non trouvé');
    return success(rdv);
  }

  async cancelForClient(client: Client, id: number) {
    const rdv = await this.rendezVous.findOneBy({
      id, client_id: client.id, statut: In(['en_attente', 'confirme']),
    });
    if (!rdv) this.notFound('Rendez-vous non trouvé ou ne peut pas être annulé');
    await this.rendezVous.update(id, { statut: 'annule' });
    const fresh = await this.withRelations().where('rdv.id = :id', { id }).getOne();
    return success(fresh, 'Rendez-vous annulé avec succès');
  }

  async handleStripeWebhookEvent(event: Stripe.Event) {
    if (event.type === 'payment_intent.succeeded') {
      await this.confirmFromPaymentIntent(event.data.object as Stripe.PaymentIntent);
    } else if (event.type === 'payment_intent.payment_failed') {
      await this.cancelFromPaymentIntent(event.data.object as Stripe.PaymentIntent);
    }
    return success(undefined, 'ok');
  }

  private async confirmFromPaymentIntent(intent: Stripe.PaymentIntent) {
    const rdvId = Number(intent.metadata?.rendez_vous_id);
    if (!rdvId) return;
    const rdv = await this.rendezVous.findOneBy({ id: rdvId });
    // A client-initiated cancel can race a Stripe webhook that was already in flight (Stripe
    // retries undelivered events for hours) — never let a late success event resurrect a
    // booking the client explicitly cancelled.
    if (!rdv || rdv.statut === 'annule') return;

    await this.rendezVous.update(rdvId, { statut: 'confirme' });

    const existing = await this.paiements.findOneBy({ rendez_vous_id: rdvId });
    if (existing) return; // idempotent: this event was already processed

    // Read the commission actually attached to this PaymentIntent straight off the Stripe
    // payload — 0 when the booking used the no-Connect fallback in create() above, so this
    // always matches what Stripe really charged rather than being recomputed from a rate
    // that could differ between booking creation and webhook delivery.
    const commissionCents = intent.application_fee_amount ?? 0;
    const commission = Math.round(commissionCents) / 100;
    const montantNetPraticien = Math.round((rdv.tarif - commission) * 100) / 100;

    try {
      await this.paiements.save({
        reference: `RDV-${rdv.id}-${Date.now()}`,
        client_id: rdv.client_id,
        praticien_id: rdv.praticien_id,
        rendez_vous_id: rdv.id,
        montant_brut: rdv.tarif,
        commission,
        montant_net_praticien: montantNetPraticien,
        moyen_paiement: 'card',
        statut: 'paid',
        date_paiement: new Date(),
      });
    } catch (err) {
      // The findOneBy check above is a TOCTOU race under concurrent/duplicate webhook
      // delivery — the real backstop is the UNIQUE constraint on rendez_vous_id (see the
      // Paiement entity / RendezVous migration). A concurrent delivery of the same event may
      // have already inserted the row between our check and this save; that's fine, idempotent.
      if (!this.isDuplicatePaiementError(err)) throw err;
    }
  }

  private async cancelFromPaymentIntent(intent: Stripe.PaymentIntent) {
    const rdvId = Number(intent.metadata?.rendez_vous_id);
    if (!rdvId) return;
    const rdv = await this.rendezVous.findOneBy({ id: rdvId });
    // Stripe doesn't guarantee webhook event ordering — a stale payment_intent.payment_failed
    // from an earlier failed attempt must not un-confirm a booking a later attempt already paid.
    if (!rdv || rdv.statut === 'confirme') return;
    await this.rendezVous.update(rdvId, { statut: 'annule' });
  }

  private isDuplicatePaiementError(err: unknown): boolean {
    const code = (err as { code?: string } | undefined)?.code;
    if (code === 'ER_DUP_ENTRY' || code === 'SQLITE_CONSTRAINT_UNIQUE' || code === 'SQLITE_CONSTRAINT') {
      return true;
    }
    const message = (err as { message?: string } | undefined)?.message ?? '';
    return /UNIQUE constraint failed|Duplicate entry/i.test(message);
  }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm run test:e2e -- stripe-connect.e2e-spec.ts` (in `server/`)
Expected: PASS (12 tests total across both `describe` blocks).

- [ ] **Step 5: Run the full e2e suite to check for regressions**

Run: `npm run test:e2e` (in `server/`)
Expected: PASS — `rendez-vous.e2e-spec.ts`'s own `payment_intent.succeeded` test (Plan 05's Task 6) still passes unmodified: its fake event has no `application_fee_amount` field, so `intent.application_fee_amount ?? 0` evaluates to `0`, `commission` comes out `0`, and that test's assertions (which never check `commission`/`montant_net_praticien`) are unaffected.

Run (in `server/`): `npm test`
Expected: PASS — full unit suite, including Task 1/3's additions, unaffected.

- [ ] **Step 6: Commit**

```bash
git add server/src/rendez-vous/rendez-vous.service.ts server/test/stripe-connect.e2e-spec.ts
git commit -m "feat(server): attach Connect fields to booking PaymentIntents and populate real commission"
```

---

## Task 7: Web — `admin/parametres/integrations` becomes real (Stripe only)

**Files:**
- Modify: `web/app/admin/parametres/integrations/page.jsx`

- [ ] **Step 1: Rewrite the page**

The current file (read in full during this plan's research) hardcodes an `INTEGRATIONS` array of 5 fake "connected" services (Stripe, Google Calendar, Mailchimp, Twilio, Zapier) and renders them via `.map()` with `ToastButton`s that fire a fake success toast on click — no backend call anywhere. Replace it entirely.

Modify `web/app/admin/parametres/integrations/page.jsx` (full resulting file):

```jsx
'use client';
import { useQuery } from '@tanstack/react-query';
import { PageHead } from '@/components/ui/PageHead';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { api } from '@/lib/api';

export default function IntegrationsSettingsPage() {
  const { data: res, isLoading } = useQuery({
    queryKey: ['admin-integrations-stripe-status'],
    queryFn: () => api.get('/admin/integrations/stripe/status'),
  });
  const status = res?.data ?? { total_praticiens: 0, connected_praticiens: 0 };
  const connected = status.connected_praticiens > 0;

  return (
    <>
      <PageHead
        title="Intégrations"
        subtitle="Paiements et versements praticiens via Stripe Connect."
        crumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Réglages', href: '/admin/parametres' }, { label: 'Intégrations' }]}
      />

      <div className="grid grid-2">
        <div className="card card-pad">
          <div className="between" style={{ marginBottom: 12 }}>
            <div className="row gap-3">
              <span className="tile-icon tint-violet"><Icon name="card" size={18} color="var(--violet-2)" /></span>
              <div>
                <h3 className="h-4">Stripe</h3>
                <Badge variant={connected ? 'success' : 'neutral'} dot>
                  {connected ? 'Connecté' : 'Aucun praticien connecté'}
                </Badge>
              </div>
            </div>
          </div>
          <p className="small" style={{ marginBottom: 8 }}>
            Paiements des séances et versements aux praticiens via Stripe Connect (comptes Express).
          </p>
          <div className="tiny" style={{ marginBottom: 16 }}>
            {isLoading
              ? 'Chargement du statut…'
              : `${status.connected_praticiens} sur ${status.total_praticiens} praticiens ont activé leurs versements`}
          </div>
          <div className="row gap-2 wrap">
            <a
              href="https://dashboard.stripe.com/connect/accounts/overview"
              target="_blank"
              rel="noreferrer"
              className="btn btn-soft btn-sm"
            >
              <Icon name="arrowRight" size={15} /> Ouvrir le dashboard Stripe
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
```

This deletes: the `INTEGRATIONS` mock array (all 5 entries, including Stripe's own fabricated `meta`/`connected` fields), the `ToastButton` import (no longer used anywhere on this page — every remaining action is a real external link, not a fake toast), and the `.map()`-rendered grid of 5 cards, replaced with one real card sourced from `GET /api/admin/integrations/stripe/status` (Task 4).

- [ ] **Step 2: Verify the page builds**

Run (in `web/`): `npm run build`
Expected: succeeds — no unused-import lint failures (`ToastButton` is fully removed, not just unused), no broken JSX.

- [ ] **Step 3: Run the full web test suite to check for regressions**

Run (in `web/`): `npm test`
Expected: PASS — no existing test touches this page (confirmed: no `integrations` test file exists in `web/`), so this is a pure regression check on everything else.

- [ ] **Step 4: Commit**

```bash
git add web/app/admin/parametres/integrations/page.jsx
git commit -m "feat(web): wire admin integrations page to real Stripe Connect status, remove fake cards"
```

---

## Task 8: Mobile — praticien dashboard "Paiements" section

**Files:**
- Modify: `mobile/src/data/types.ts`, `mobile/src/data/repos/index.ts`, `mobile/app/dashboard.tsx`
- Test: `mobile/src/data/repos/stripeConnect.test.ts` (create)

- [ ] **Step 1: Ground-truth check on mobile praticien auth (documented, not fixed by this plan)**

Run (in `mobile/`):

```bash
grep -rn "v1/praticien\|praticien.*login" app src
```

As of this plan's research: no match — there is no real praticien login flow wired on mobile yet; `useSession().token` is set by whatever screens already set it (client auth), and no mobile screen calls the real `POST /api/v1/praticien/login`. This plan's "Paiements" section (below) assumes `useSession().token` already holds a valid praticien JWT whenever `role === 'practitioner'` — the same assumption 08a's messaging plan has to make for its own praticien screens. This is a pre-existing, cross-cutting mobile-auth gap, not something this task fixes; it's called out here so it isn't silently assumed. See this plan's Design notes and Task 9 Step 4 for how to manually verify around it.

- [ ] **Step 2: Write the failing repo unit tests**

Create `mobile/src/data/repos/stripeConnect.test.ts`, mirroring `rendezVous.test.ts`'s structure exactly:

```typescript
import { stripeConnectRepo } from './index';
import { setAuthToken } from '../api/client';

function mockFetch(status: number, body?: unknown) {
  return jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    text: async () => (body === undefined ? '' : JSON.stringify(body)),
  });
}

describe('stripeConnectRepo', () => {
  beforeEach(() => setAuthToken('test-token'));

  it('status fetches /praticien/stripe/connect/status and unwraps the data', async () => {
    (global as any).fetch = mockFetch(200, {
      status: 'success',
      data: { stripe_account_id: 'acct_123', stripe_payouts_enabled: true },
    });
    const res = await stripeConnectRepo.status();
    expect(res.stripe_payouts_enabled).toBe(true);
    expect(res.stripe_account_id).toBe('acct_123');
    const [url] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toContain('/praticien/stripe/connect/status');
  });

  it('onboard posts to /praticien/stripe/connect/onboard and unwraps the url', async () => {
    (global as any).fetch = mockFetch(200, {
      status: 'success', data: { url: 'https://connect.stripe.com/setup/test' },
    });
    const res = await stripeConnectRepo.onboard();
    expect(res.url).toBe('https://connect.stripe.com/setup/test');
    const [url, opts] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toContain('/praticien/stripe/connect/onboard');
    expect(opts.method).toBe('POST');
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npm test -- stripeConnect.test.ts` (in `mobile/`)
Expected: FAIL — `stripeConnectRepo` is not exported by `./index`.

- [ ] **Step 4: Add the `StripeConnectStatus` type**

Modify `mobile/src/data/types.ts` — append at the end of the file, after the `RendezVous` interface:

```typescript

export interface StripeConnectStatus {
  stripe_account_id: string | null;
  stripe_payouts_enabled: boolean;
}
```

- [ ] **Step 5: Add `stripeConnectRepo`**

Modify `mobile/src/data/repos/index.ts` — add `StripeConnectStatus` to the existing `import type { ... } from '../types';` block, and append the new repo at the end of the file:

```typescript
import type {
  Practitioner,
  Discipline,
  Event,
  Exchange,
  EchangeInput,
  PaymentRecord,
  Remboursement,
  Conversation,
  ChatMessage,
  Circle,
  Article,
  RendezVous,
  Avis,
  Signalement,
  NotificationPreferences,
  FavoritePraticien,
  StripeConnectStatus,
} from '../types';
```

```typescript
// ---------- Stripe Connect (praticien payouts) — real backend ----------
export const stripeConnectRepo = {
  status: (): Promise<StripeConnectStatus> =>
    api.get<{ status: string; data: StripeConnectStatus }>('/praticien/stripe/connect/status').then((res) => res.data),
  onboard: (): Promise<{ url: string }> =>
    api.post<{ status: string; data: { url: string } }>('/praticien/stripe/connect/onboard').then((res) => res.data),
};
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npm test -- stripeConnect.test.ts` (in `mobile/`)
Expected: PASS (2 tests).

- [ ] **Step 7: Add the "Paiements" section to `dashboard.tsx`**

Modify `mobile/app/dashboard.tsx` (full resulting file):

```typescript
import React from 'react';
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { AuroraBackground } from '@components/AuroraBackground';
import { Button } from '@components/Button';
import { Icon } from '@components/Icon';
import { ScreenHeader } from '@components/ScreenHeader';
import { Toggle } from '@components/Toggle';
import { colors } from '@theme/colors';
import { typography } from '@theme/typography';
import { useSession } from '@store/session';
import { stripeConnectRepo } from '@data/repos';
import { errorMessage } from '@data/api/client';

export default function Dashboard() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const active = useSession((s) => s.practitionerActive);
  const toggle = useSession((s) => s.togglePractitionerActive);
  const trialDays = useSession((s) => s.trialDaysLeft);

  return (
    <View style={{ flex: 1, backgroundColor: colors.pearl }}>
      <ScreenHeader
        title="Mon espace praticien"
        rightAction={<Icon name="bell" size={20} color={colors.ink} />}
      />
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ paddingHorizontal: 20, paddingBottom: 16 }}>
          <AuroraBackground variant="soft" rounded={22} style={styles.trial}>
            <Text style={styles.trialEyebrow}>PÉRIODE D'ESSAI</Text>
            <Text style={styles.trialTitle}>{trialDays} jours restants</Text>
            <Text style={styles.trialSub}>
              puis 9,90 €/mois · annulable à tout moment
            </Text>
            <Pressable
              onPress={() => router.push('/subscription' as any)}
              style={styles.trialBtn}
            >
              <Text style={styles.trialBtnTxt}>Gérer mon abonnement →</Text>
            </Pressable>
          </AuroraBackground>
        </View>

        <View style={styles.statsRow}>
          <Stat v="4" l="à venir" />
          <Stat v="12" l="ce mois" />
          <Stat v="4.9" l="note moy." />
        </View>

        <View style={styles.activeRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.activeTitle}>Profil actif</Text>
            <Text style={styles.activeSub}>
              Vous apparaissez dans les recherches
            </Text>
          </View>
          <Toggle value={active} onValueChange={toggle} />
        </View>

        <PaiementsSection />

        <View style={styles.pauseBox}>
          <View style={styles.pauseIc}>
            <Text style={{ fontSize: 16 }}>🌙</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.pauseTitle}>Besoin de souffler ?</Text>
            <Text style={styles.pauseBody}>
              Mettez votre profil en pause sans perdre vos avis ni votre abonnement.
            </Text>
            <Pressable>
              <Text style={styles.pauseCta}>Mettre en pause →</Text>
            </Pressable>
          </View>
        </View>

        <Row
          icon={<Icon name="cal" size={20} color={colors.ink} />}
          title="Mes prochaines séances"
          sub="4 réservations à confirmer"
        />
        <Row
          icon={<Icon name="inperson" size={20} color={colors.ink} />}
          title="Ma fiche praticien"
          sub="Bio, photos, disciplines, tarifs"
        />
        <Row
          icon={<Icon name="star" size={20} color={colors.ink} />}
          title="Mon niveau & mes tarifs"
          sub="Expert · 75–95€/séance"
        />
        <Row
          icon={<Icon name="cal" size={20} color={colors.ink} />}
          title="Mes événements"
          sub="2 publiés · Retraite équinoxe"
        />
        <Row
          icon={<Icon name="exchange" size={20} color={colors.ink} />}
          title="Mes échanges"
          sub="1 en cours"
          onPress={() => router.push('/exchange' as any)}
        />
        <Row
          icon={<Icon name="card" size={20} color={colors.ink} />}
          title="Revenus & virements"
          sub="1 247 € ce mois"
        />
        <Row icon={<Icon name="shield" size={20} color={colors.ink} />} title="Charte de bienveillance" />
      </ScrollView>
    </View>
  );
}

function PaiementsSection() {
  const { data: status, isLoading, refetch } = useQuery({
    queryKey: ['stripeConnectStatus'],
    queryFn: stripeConnectRepo.status,
  });
  const [submitting, setSubmitting] = React.useState(false);

  const onboard = async () => {
    setSubmitting(true);
    try {
      const { url } = await stripeConnectRepo.onboard();
      await Linking.openURL(url);
      refetch();
    } catch (err) {
      Alert.alert('Impossible de démarrer', errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const payoutsEnabled = status?.stripe_payouts_enabled ?? false;
  const hasAccount = Boolean(status?.stripe_account_id);

  return (
    <View style={styles.paiementsBox}>
      <View style={styles.paiementsHead}>
        <Icon name="card" size={20} color={colors.ink} />
        <Text style={styles.paiementsTitle}>Paiements</Text>
      </View>
      {isLoading ? (
        <Text style={styles.paiementsSub}>Chargement du statut…</Text>
      ) : payoutsEnabled ? (
        <>
          <Text style={styles.paiementsSubOk}>Versements activés</Text>
          <Text style={styles.paiementsSub}>
            Vos paiements sont reversés directement sur votre compte Stripe après chaque séance.
          </Text>
        </>
      ) : (
        <>
          <Text style={styles.paiementsSub}>
            {hasAccount
              ? 'Votre inscription Stripe est en cours — finalisez-la pour recevoir vos versements.'
              : 'Configurez vos versements pour être payée directement après chaque séance.'}
          </Text>
          <Pressable onPress={onboard} disabled={submitting} style={styles.paiementsCta}>
            <Text style={styles.paiementsCtaTxt}>
              {submitting ? 'Ouverture…' : hasAccount ? "Continuer l'inscription →" : 'Configurer mes versements →'}
            </Text>
          </Pressable>
        </>
      )}
    </View>
  );
}

function Stat({ v, l }: { v: string; l: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statV}>{v}</Text>
      <Text style={styles.statL}>{l.toUpperCase()}</Text>
    </View>
  );
}

function Row({
  icon,
  title,
  sub,
  onPress,
}: {
  icon: React.ReactNode;
  title: string;
  sub?: string;
  onPress?: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.row}>
      <View style={styles.rowIc}>{icon}</View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowT}>{title}</Text>
        {sub ? <Text style={styles.rowS}>{sub}</Text> : null}
      </View>
      <Icon name="chevron" size={18} color={colors.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  trial: { padding: 18 },
  trialEyebrow: {
    color: '#fff',
    fontSize: 11,
    letterSpacing: 1.8,
    fontFamily: 'Outfit_500Medium',
    opacity: 0.9,
    marginBottom: 4,
  },
  trialTitle: {
    color: '#fff',
    fontFamily: 'CormorantGaramond_400Regular',
    fontSize: 24,
    marginBottom: 2,
  },
  trialSub: { color: '#fff', fontSize: 12, opacity: 0.85 },
  trialBtn: {
    marginTop: 14,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  trialBtnTxt: { color: '#fff', fontSize: 13, fontFamily: 'Outfit_500Medium' },

  statsRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, marginBottom: 18 },
  stat: {
    flex: 1,
    padding: 14,
    backgroundColor: '#fff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.line,
  },
  statV: { fontFamily: 'CormorantGaramond_500Medium', fontSize: 26, lineHeight: 28 },
  statL: { ...typography.tiny, fontSize: 10, letterSpacing: 0.5, marginTop: 4 },

  activeRow: {
    marginHorizontal: 20,
    marginBottom: 18,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.line,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  activeTitle: { fontFamily: 'CormorantGaramond_500Medium', fontSize: 17 },
  activeSub: { ...typography.small, fontSize: 12 },

  paiementsBox: {
    marginHorizontal: 20,
    marginBottom: 18,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.line,
  },
  paiementsHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  paiementsTitle: { fontFamily: 'CormorantGaramond_500Medium', fontSize: 17 },
  paiementsSubOk: {
    ...typography.small,
    fontSize: 13,
    color: colors.success,
    marginBottom: 4,
    fontFamily: 'Outfit_500Medium',
  },
  paiementsSub: { ...typography.small, fontSize: 12, lineHeight: 17 },
  paiementsCta: { marginTop: 10, alignSelf: 'flex-start' },
  paiementsCtaTxt: { color: colors.ink, fontFamily: 'Outfit_500Medium', fontSize: 13 },

  pauseBox: {
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 14,
    backgroundColor: '#F4ECD9',
    borderRadius: 16,
    flexDirection: 'row',
    gap: 12,
  },
  pauseIc: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pauseTitle: { fontFamily: 'Outfit_500Medium', color: '#5D4F2E', fontSize: 13, marginBottom: 2 },
  pauseBody: { color: '#8A6A36', fontSize: 12, lineHeight: 17 },
  pauseCta: { color: '#5D4F2E', fontFamily: 'Outfit_500Medium', fontSize: 13, marginTop: 8 },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  rowIc: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.mist,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowT: { fontFamily: 'Outfit_500Medium', fontSize: 14, marginBottom: 1 },
  rowS: { ...typography.tiny, fontSize: 12 },
});
```

(`Button` is imported but was already unused-except-for-type-availability in the original file — it stays imported since removing an import this task didn't add the need to remove is out of scope; `PaiementsSection`'s CTA deliberately uses a plain `Pressable` + `Text`, matching the file's existing local style for `trialBtn`/`pauseCta`, rather than pulling in the shared `Button` component's full-width default, which doesn't fit this compact inline-link look.)

- [ ] **Step 8: Run the full mobile test suite and typecheck**

Run (in `mobile/`): `npm test`
Expected: PASS — includes the new `stripeConnect.test.ts` (2 tests) alongside every pre-existing suite, untouched.

Run (in `mobile/`): `npm run typecheck`
Expected: PASS, no errors.

- [ ] **Step 9: Commit**

```bash
git add mobile/src/data/types.ts mobile/src/data/repos/index.ts mobile/src/data/repos/stripeConnect.test.ts mobile/app/dashboard.tsx
git commit -m "feat(mobile): add Paiements section with Stripe Connect onboarding to praticien dashboard"
```

---

## Task 9: Full cross-codebase verification

**Files:** none (verification only — no commit).

- [ ] **Step 1: Backend full check**

Run (in `server/`): `npm test`
Expected: PASS — includes `commission.spec.ts` (2 tests, Task 3) alongside every pre-existing unit spec file, none of which this plan modified.

Run (in `server/`): `npm run test:e2e`
Expected: PASS — every pre-existing e2e suite unaffected, in particular `rendez-vous.e2e-spec.ts` (Plan 05, untouched behavior for every existing scenario) and `praticien-verification.e2e-spec.ts`/`praticien-auth.e2e-spec.ts` (unaffected by the `AuthModule`/`Praticien` entity changes), plus the new `stripe-connect.e2e-spec.ts` (12 tests across two `describe` blocks: Tasks 4/5/6).

- [ ] **Step 2: Web full check**

Run (in `web/`): `npm test`
Expected: PASS — no test in this plan's scope touches web's unit-testable `lib/*.js` modules, so this is a pure regression check.

Run (in `web/`): `npm run build`
Expected: succeeds — `/admin/parametres/integrations` compiles with the new `useQuery`/`api` real-data wiring, no dead-import lint failures.

- [ ] **Step 3: Mobile full check**

Run (in `mobile/`): `npm test`
Expected: PASS — includes the new `stripeConnect.test.ts` (2 tests, Task 8).

Run (in `mobile/`): `npm run typecheck`
Expected: PASS, no errors — in particular confirms `dashboard.tsx`'s new `useQuery`/`stripeConnectRepo` usage type-checks against the `StripeConnectStatus` type defined in Task 8.

- [ ] **Step 4: Manual smoke check (documented, not automated — this plan's automated tests never touch real Stripe, per the Prerequisites section)**

With real Stripe test-mode keys wired, Connect enabled on the test-mode account (Prerequisites, item 2), `stripe listen --events payment_intent.succeeded,payment_intent.payment_failed,account.updated --forward-to localhost:8000/api/webhooks/stripe` running, and `server/` running on `:8000`:

1. Seed a praticien via the real `POST /api/v1/praticien/register` + `POST /api/v1/praticien/login` flow (or via `server/test/utils/create-test-app.ts`'s `seedPraticienUser` pattern against a real dev DB) to obtain a real praticien JWT — mobile has no real praticien login screen yet (Task 8, Step 1), so this step stands in for it.
2. `POST /api/praticien/stripe/connect/onboard` with that JWT (e.g. via `curl`/Postman) → follow the returned `url` in a browser → complete Stripe's test-mode Express onboarding form (test data is fine in test mode) → land on `aura://dashboard` (won't open anything outside a real device with the Aura app installed and the `aura` scheme registered — expected in a browser-only manual check; the important part is that Stripe's flow itself completes without error).
3. Confirm the `stripe listen` terminal shows an `account.updated` event delivered and returned 200, and that `GET /api/praticien/stripe/connect/status` with the same JWT now reports `stripe_payouts_enabled: true`.
4. Create a real booking (`POST /api/rendez-vous`) for that now-Connect-enabled praticien, complete payment with Stripe's `4242 4242 4242 4242` test card (same flow Plan 05 already established), and confirm in the Stripe test-mode dashboard that the PaymentIntent shows a non-zero `application_fee_amount` and a transfer to the connected account. Confirm the resulting `paiements` row has non-zero `commission`/`montant_net_praticien` matching the 15% split.
5. On mobile: with `role: 'practitioner'` and a manually-seeded praticien token in `useSession` (per Step 1's caveat), open `dashboard.tsx` and confirm the "Paiements" section renders the real status and, before onboarding, the CTA button opens the real Stripe onboarding URL via `Linking.openURL`.
6. On web: open `admin/parametres/integrations` as an admin and confirm the Stripe card shows a real, non-fabricated `connected_praticiens / total_praticiens` count and that the "Ouvrir le dashboard Stripe" link opens Stripe's real dashboard.

This step has no pass/fail command output to paste — it's a checklist the executing engineer ticks off by hand before considering the plan done, exactly like Plan 05's own Task 13 Step 4.

---

## Self-review

**1. Spec coverage** — walked every requirement in the P8 design spec's 08f sketch (and the P8-4 locked-decisions row) against the tasks above:
- Schema (`praticiens.stripe_account_id` nullable, `stripe_payouts_enabled` boolean default false): Task 2.
- `POST /praticien/stripe/connect/onboard` (creates an Express account if none exists, returns a Stripe-hosted onboarding link): Task 4, both the "first call creates" and "second call reuses" behaviors covered by dedicated tests.
- Webhook `account.updated` tracking onboarding completion, setting `stripe_payouts_enabled = true`: Task 5 (plus the both-directions mirroring decision, documented in Design notes and covered by a dedicated "reverts to false" test).
- Booking PaymentIntent gains `application_fee_amount` (from 08e's commission-rate config, or this plan's documented fallback) + `transfer_data.destination`: Task 6, with the not-yet-onboarded fallback path (block vs. proceed-with-warning decision, made and justified in Design notes) also covered by its own test.
- `commission`/`montant_net_praticien` finally non-zero: Task 6's webhook-confirm test asserts real values (`15`/`85` on a 100€/15% booking).
- Admin `parametres/integrations` — Stripe card real, other 4 cards deleted (not left decorative): Task 7, with the deletion of the mock array, `ToastButton` import, and `.map()`-rendered grid confirmed explicit in the diff, not just described.
- Praticien `dashboard.tsx` "Paiements" section — status + CTA that hits the onboard endpoint and opens the URL: Task 8.
- Manual prerequisite (Connect must be enabled on the Stripe dashboard before any of this is testable for real): stated in its own Prerequisites section, mirroring Plan 05's "supply your own keys" framing exactly, plus the additional Connect-specific dashboard toggle called out as item 2.
- Both cross-plan dependency ground-truth checks (`PraticienGuard` from 08a, commission-rate config from 08e): Task 1 Step 1 and Task 3 Step 1 respectively, each with the exact search commands run, the exact result found (both absent as of 2026-07-15), and explicit instructions for what to do differently if the real artifact exists by execution time.
- This closing structure itself (Self-review + Exit criteria): this section and the one below.

**2. Placeholder scan** — grepped the finished document for `TBD`, `TODO` (outside the deliberate, fully-specified "TECH DEBT" comment in `commission.ts`, which names the exact swap-in point rather than deferring work), `FIXME`, "add appropriate", "similar to Task N", "rest of the file", "remains unchanged", "write the rest", and bare trailing ellipses. None found as a genuine placeholder — every step that touches code shows the complete resulting file or the complete new function/test, never a description of one. The one "TECH DEBT" comment (`commission.ts`) is intentional documentation of a known, bounded gap (08e hasn't landed), not an unwritten piece of this plan's own scope — `getCommissionRate()` is fully implemented and tested as specified.

**3. Type/signature consistency** — cross-checked names and shapes across every task that touches them:
- `StripeService.createPaymentIntent(amountCents, metadata, connect?)` (Task 3) — the new third parameter's shape (`PaymentIntentConnectFields { applicationFeeAmount: number; destination: string }`) is exactly what `RendezVousService.create()` (Task 6) constructs and passes, and exactly what every e2e assertion (Task 4's mock, Task 6's `toHaveBeenCalledWith`) expects.
- `StripeService.createConnectAccount(email): Promise<Stripe.Account>` and `.createAccountLink(accountId, refreshUrl, returnUrl): Promise<Stripe.AccountLink>` (Task 3) are called with exactly this argument order/count in `StripeConnectService.onboard()` (Task 4), and the e2e mocks in both `stripe-connect.e2e-spec.ts` `describe` blocks (Tasks 4/5) return objects (`{ id: 'acct_...' }`, `{ url: '...' }`) matching what the real Stripe SDK types expose (confirmed via context7, Task 3).
- `PraticienGuard` sets `req.praticien` (Task 1); `CurrentPraticien` reads `req.praticien` (Task 1); `StripeConnectController` (Task 4) is the only consumer, via `@CurrentPraticien() praticien: Praticien`. No call site invents a different request-property name.
- `StripeConnectService.status(praticien)`/`.onboard(praticien)`/`.adminStatus()`/`.handleAccountUpdated(event)` (Task 4) are called with exactly these names and argument shapes from `StripeConnectController` (Task 4) and `StripeWebhookController` (Task 5) — no renamed method at any call site.
- `GET /praticien/stripe/connect/status` response shape `{ stripe_account_id: string | null, stripe_payouts_enabled: boolean }` (Task 4) matches `StripeConnectStatus` (Task 8, mobile) field-for-field, no camelCase remapping layer — consistent with this codebase's established "real field names verbatim" convention (already documented in `mobile/src/data/types.ts`'s own comments for `Avis`/`Signalement`).
- `stripeConnectRepo.status()`/`.onboard()` (Task 8) are called with exactly these names in `dashboard.tsx`'s `PaiementsSection` (Task 8) — `useQuery({ queryFn: stripeConnectRepo.status })` and `await stripeConnectRepo.onboard()`, matching the repo's actual exported shape.
- `Praticien.stripe_account_id`/`stripe_payouts_enabled` (Task 2) are the exact column names read in `RendezVousService.create()`'s Connect-eligibility check (Task 6), `StripeConnectService.status()`/`.onboard()`/`.handleAccountUpdated()` (Task 4/5), and the admin `adminStatus()` count query (Task 4) — no alternate spelling introduced anywhere.
- The webhook routing added in Task 5 (`if (event.type === 'account.updated') return this.stripeConnectService.handleAccountUpdated(event); return this.rendezVousService.handleStripeWebhookEvent(event);`) is exhaustively consistent with Task 6's assumption that `payment_intent.*` events still reach `RendezVousService` unchanged — verified by Task 6's own regression step re-running Plan 05's original webhook test.

---

## Exit criteria

A praticien can, for real, connect a Stripe Express account from the mobile dashboard: tapping the "Paiements" CTA calls `POST /api/praticien/stripe/connect/onboard`, which creates (or reuses) a Connect Express account and opens a real Stripe-hosted onboarding link; once Stripe reports both `charges_enabled` and `payouts_enabled` true via the `account.updated` webhook, `praticiens.stripe_payouts_enabled` flips to true (and back to false if Stripe later restricts the account). From that point on, every booking for that praticien automatically splits funds at the payment level — `application_fee_amount` and `transfer_data.destination` on the PaymentIntent — and the resulting `paiements` row carries real, non-zero `commission`/`montant_net_praticien` for the first time since Plan 05 shipped those columns. Bookings for praticiens who haven't finished onboarding are never blocked; they fall back to a plain PaymentIntent and a logged warning for manual payout. The admin `parametres/integrations` page shows a real, live Stripe connection count instead of five fabricated "connected" services, and the four services with no real backend (Google Calendar, Mailchimp, Twilio, Zapier) are gone from the page entirely, not left decorative.

`POST/GET /api/praticien/stripe/connect/*` and `GET /api/admin/integrations/stripe/status` are live and guarded (`PraticienGuard`/`AdminGuard` respectively — `PraticienGuard` newly created by this plan per its Task 1 ground-truth check), covered end to end by e2e tests with `StripeService` mocked; the `account.updated` webhook path and the Connect-aware booking flow are both covered by dedicated e2e tests layered onto the existing `/api/webhooks/stripe` endpoint without altering any of Plan 05's original event handling. `server/`, `web/`, and `mobile/` are all green (`npm test` + `npm run test:e2e`; `npm test` + `npm run build`; `npm test` + `npm run typecheck`, respectively). Real end-to-end exercise (an actual Connect onboarding flow, a real `account.updated` webhook delivery, a real destination-charge payment) additionally requires Stripe Connect to be enabled on the user's test-mode Stripe account and, for the mobile CTA's deep-link return, a real device or dev build — neither is available in this sandbox, which is why Task 9's Step 4 is a documented manual checklist rather than an automated one, exactly like Plan 05's own closing task.

This plan depended on 08e (subscriptions) for its commission-rate config; that dependency was not yet real as of this plan's own research, so a hardcoded 15% fallback (`server/src/common/commission.ts`) stands in, with the exact swap-in point documented as tech debt for whenever 08e actually lands. This plan also depended on 08a (messaging) for `PraticienGuard`; also not yet real as of this plan's own research, so this plan creates it directly. Per the Plan 08 design spec's sequencing (`08a → 08b → 08c → 08d → 08e → 08f → 08g`), 08g (analytics) is the next plan in the sequence and can compose real data from this plan's now-real `commission`/`montant_net_praticien` columns and Connect status once it runs.
