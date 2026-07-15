# Aura Plan 08e — Subscriptions/Abonnements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace both frontends' contradictory subscription mocks (web's real 3-tier Essentiel/Pro/Premium model vs. mobile's single flat-rate trial) with one real, Stripe-Subscriptions-backed `subscriptions` module — Checkout-Session signup/upgrade, webhook-driven status sync, a real admin-configurable commission-rate config, and admin list/stats — so `admin/abonnements`, `admin/parametres/facturation`, and mobile's `subscription.tsx`/`dashboard.tsx` all read and write the same real data.

**Architecture:** A new `subscriptions` table (`SubscriptionsModule`, `server/src/subscriptions/`) mirrors the existing `rendez-vous` module's controller/service split, reusing `PraticienGuard` (from Plan 08a) for praticien-facing routes and `AdminGuard` for admin routes. Signup/upgrade goes through a Stripe Checkout Session in `mode: 'subscription'` (not a custom card form — Stripe's own recommended path for recurring billing), paid for with one of two Stripe Prices the operator creates by hand (Essentiel is free, no Stripe object). The existing shared `POST /api/webhooks/stripe` endpoint (owned by `rendez-vous/stripe-webhook.controller.ts` since Plan 05) gains a second event-type branch — `checkout.session.completed` / `customer.subscription.updated` / `customer.subscription.deleted` / `invoice.payment_failed` route to the new `SubscriptionsService`, while Plan 05's original `payment_intent.*` routing to `RendezVousService` is untouched. A second, small `PlatformSettingsModule` owns a single-row `platform_settings` table holding the platform commission rate (a decimal fraction, e.g. `0.15`) — this is the real config Plan 08f's `server/src/common/commission.ts` placeholder (`getCommissionRate()`) is waiting to be swapped to call; this plan writes `commission.ts` for real (it doesn't exist in the codebase yet — 08f only adds a stand-in fallback if this plan hasn't landed first). Both frontends get real data: mobile's `subscription.tsx` is reworked from its flat-rate mock into the same 3 tiers `web/lib/data/content.js` already defines, with a real Checkout redirect via `expo-web-browser`; web's `admin/abonnements` and `admin/parametres/facturation`'s commission field are wired to the new endpoints.

**Tech Stack:** NestJS 11 + TypeORM 0.3 + class-validator (server, unchanged) + `stripe` (Node SDK, already installed and pinned to `apiVersion: '2026-06-24.dahlia'` by Plan 05 — this plan does not touch that pin). Web: Next.js 15 + `@tanstack/react-query` (already used by every other wired admin page). Mobile: Expo 54 / React Native + `@tanstack/react-query` + a new `expo-web-browser` dependency for the Checkout redirect (justified in Task 11 — `@stripe/stripe-react-native`, already installed for the Plan 05 booking Payment Sheet, does not cover hosted Checkout Sessions). Server e2e tests stay on Jest + better-sqlite3 with `StripeService` mocked via `overrideProvider`, exactly like Plan 05 and Plan 08f — **no test in this plan ever calls real Stripe.**

**Reference:** [Plan 08 design spec](../specs/2026-07-15-aura-08-heavy-modules-design.md) (P8-3, "08e — Subscriptions" sketch) · [Plan 05 Bookings + Stripe](2026-07-13-aura-05-bookings-stripe.md) (source of truth for `StripeService`, webhook plumbing, and the "supply your own Stripe test keys" framing this plan reuses) · [Plan 08a Messaging](2026-07-15-aura-08a-messaging.md) (source of `PraticienGuard`) · [Plan 08f Stripe Connect](2026-07-15-aura-08f-stripe-connect.md) (the sub-plan that depends on this one's commission-rate config)

**Run each `npm` command from the relevant package dir** (`server/`, `web/`, `mobile/`), not the repo root.

---

## Prerequisites — you must supply real Stripe test-mode credentials AND 2 subscription Prices before running this end-to-end

This plan's automated tests (server e2e) never touch real Stripe — `StripeService` is mocked via Nest's `overrideProvider` everywhere, exactly as Plan 05 and Plan 08f established. But to actually exercise a real signup/upgrade/cancel flow by hand, you need:

1. Everything from [Plan 05's Prerequisites section](2026-07-13-aura-05-bookings-stripe.md#prerequisites--you-must-supply-real-stripe-test-mode-credentials-before-running-this-end-to-end): a Stripe account in test mode, `STRIPE_SECRET_KEY`/`STRIPE_WEBHOOK_SECRET` in `server/.env`, and `stripe listen --forward-to localhost:8000/api/webhooks/stripe` running locally.
2. **Create 2 Products, each with one recurring monthly Price**, in your Stripe test-mode dashboard (`https://dashboard.stripe.com/test/products`): "Aura Pro" at 29€/month and "Aura Premium" at 59€/month — matching the prices already shown on `/tarifs` (`web/lib/data/content.js`'s `plans` array). **Essentiel is free and needs no Stripe Product/Price at all.**
3. Copy the resulting Price IDs (`price_...`, not the Product IDs `prod_...`) into `server/.env` as `STRIPE_PRICE_ID_PRO` and `STRIPE_PRICE_ID_PREMIUM` (Task 4 adds both, empty, to `.env.example`).
4. Optionally set `STRIPE_SUBSCRIPTION_SUCCESS_URL` / `STRIPE_SUBSCRIPTION_CANCEL_URL` in `server/.env` (Task 5 adds both, empty, to `.env.example`) if you want the post-Checkout redirect to land somewhere other than the mobile app's own deep link (`aura://subscription?checkout=success` / `...=cancel`, the code-level fallback).
5. `stripe listen` must forward the new subscription event types alongside Plan 05's originals: `stripe listen --events payment_intent.succeeded,payment_intent.payment_failed,checkout.session.completed,customer.subscription.updated,customer.subscription.deleted,invoice.payment_failed --forward-to localhost:8000/api/webhooks/stripe`.
6. For mobile: Task 11 adds `expo-web-browser` to open the Stripe-hosted Checkout URL. The browser-open itself works in Expo Go, but the deep-link return (`aura://subscription`) requires a development build — same constraint Plan 05's Payment Sheet and Plan 08f's Connect onboarding CTA already have on this codebase (`npx expo prebuild` + `npx expo run:ios`/`run:android`, or an EAS development build). This plan's automated verification for mobile stops at `npm test` + `npm run typecheck`, exactly like Plan 05/08f.

None of the above blocks writing or committing the code in this plan — only manual, real end-to-end verification (Task 13, Step 4).

---

## Design notes — decisions filled in beyond the locked spec

The brief's schema, Stripe flow, and endpoint list are locked and implemented exactly as given. Several implementation details weren't specified and had to be decided; recorded here so they're visible at self-review time, not buried in a diff.

- **Ground-truth check on `PraticienGuard` (Task 1).** This plan was written after Plan 08a's document (which adds `PraticienGuard`) but a fresh repo-wide search on 2026-07-15 confirms **it does not exist in the actual codebase yet** — none of Plan 08's sub-plans have been executed against real code, only written as documents. Plan 08f's own document independently reached the same conclusion and defensively creates the guard itself if missing. This plan does the same, for the same reason: per the locked sequencing (`08a → 08b → 08c → 08d → 08e → 08f → 08g`) `PraticienGuard` should exist by the time this plan actually executes, but Task 1 verifies that rather than assuming it blindly, so this plan is safe to execute even if 08a hasn't landed yet.
- **`seedPraticienUser`'s exact seed values reconcile a discrepancy between 08a's and 08f's own versions of this helper.** Both sibling plans independently write a `seedPraticienUser()` test helper (since both need one), but with different field values — 08a uses `ville: 'Paris', niveau: 'expert', mode: 'presentiel'` (lowercase, unaccented); 08f uses `ville: 'Lyon', niveau: 'Expert', mode: 'présentiel & visio'` (capitalized, accented). This plan also needs the helper (for its own praticien-guarded e2e tests) and, if it has to create it (Task 1's ground-truth check comes up empty), uses 08f's version verbatim — it matches the capitalization/accent conventions already used by real seed data elsewhere in this codebase (e.g. Plan 05's own `rendez-vous.e2e-spec.ts` seeds `niveau: 'Expert'`, `mode: 'présentiel'`). This is flagged here, not silently resolved, because whichever of 08a/08f/08e actually creates the helper first "wins" for the whole codebase — the other two plans' ground-truth-check steps will find it already present and skip creating their own version.
- **Commission-rate unit: a decimal fraction (0–1), not a percentage (0–100), stored and returned by the backend everywhere — including the admin API.** Plan 08f's placeholder `getCommissionRate()` already returns `0.15` and is called directly in cents arithmetic (`Math.round(amountCents * getCommissionRate())`), so the real implementation must return the same unit or silently break 08f's math. The existing decorative `admin/parametres/facturation` input shows a percentage (`defaultValue="15"`) — that conversion (× 100 to display, ÷ 100 to save) is done entirely in the web page component (Task 9), not the API, so the backend has exactly one unit end to end.
- **The commission-rate config is a real DB-backed setting, but `getCommissionRate()` stays a synchronous, dependency-free function — an in-memory cache, not a live DB read.** Plan 08f's booking hot path (`RendezVousService.create()`) calls `getCommissionRate()` synchronously while building a PaymentIntent; an async DB round-trip there would add latency to every booking for a value that changes rarely. `server/src/common/commission.ts` keeps `DEFAULT_COMMISSION_RATE`/`getCommissionRate()` (matching 08f's exact placeholder shape) plus a new `setCommissionRate()` setter; a small `PlatformSettingsModule` owns the real `platform_settings` table and calls `setCommissionRate()` once at boot (`OnModuleInit`, warming the cache from the persisted row) and again on every admin `PUT`. This is why Plan 08f's own tech-debt comment ("replace the body of `getCommissionRate()` ... the function signature stays the same") works out exactly as that plan expects: the function name, signature, and return unit are unchanged; only its internals go from "hardcoded constant" to "reads a cache warmed from the database."
- **No shared "settings" entity existed to extend.** A repo-wide check (`grep -rni "settings" server/src`) turned up nothing — no generic key-value config table anywhere in this codebase. A single-row `platform_settings` table (one typed column, `commission_rate`) was chosen over a generic key-value store: the only real requirement today is one platform-wide number, and a single typed row is simpler to read/write than building generic key-value plumbing for one value that doesn't need it yet (YAGNI).
- **Migration timestamp collision, not this plan's to fix, but worth flagging.** Both Plan 08a (`1700000000003-AddConversationsAndMessages.ts`) and Plan 08f (`1700000000003-AddStripeConnectToPraticiens.ts`) independently claimed the same numeric migration prefix — a real, pre-existing inconsistency between those two sibling plans' documents (not introduced by this plan). This plan's own migration uses `1700000000007`, the next free slot after Plan 05's `1700000000001` and the existing `1700000000002`, to avoid compounding the collision.
- **Upgrading between paid plans cancels the old Stripe subscription immediately, then starts a fresh Checkout Session for the new plan — no in-place proration/price-swap API call.** The locked endpoint list only gives this plan `checkout`, `cancel`, and `current` (no dedicated "switch plan" endpoint), and the spec says Checkout Sessions cover "signup/upgrade." An in-place price swap (`stripe.subscriptions.update(id, {items: [{id: itemId, price: newPriceId}]})`) would need to fetch the existing subscription-item id first and handle proration bookkeeping — real complexity with no locked requirement calling for it. Canceling-then-recreating is simpler, uses only already-verified SDK calls, and is a legitimate real-world simplification for MVP scope: it does forfeit any unused proration credit from the old billing period, called out here as a known, accepted trade-off.
- **`POST /praticien/subscription/cancel` schedules cancellation at period end (`cancel_at_period_end: true`), not an immediate `stripe.subscriptions.cancel()`.** The existing, already-shipped billing FAQ copy (`web/lib/data/content.js`'s `BILLING_FAQ`) explicitly promises: *"Vous résiliez en un clic depuis votre espace, et restez actif jusqu'à la fin de la période payée."* An immediate cancel would contradict that live copy. `statut` is therefore **not** flipped to `'canceled'` by the cancel action itself — the Stripe subscription is still genuinely active until the period ends, so flipping local state early would lie about it. The real transition to `'canceled'` is webhook-driven (`customer.subscription.deleted`), mirroring Plan 05's own established rule that only the Stripe webhook ever flips a *confirmed* billing state — `RendezVousService`'s self-review checklist states this explicitly for payments, and this plan applies the identical reasoning to subscriptions.
- **On `customer.subscription.deleted`, `plan` is left untouched — only `statut` flips to `'canceled'`.** The locked schema has no separate "what plan were they last on" column, and overwriting `plan` to `'essentiel'` on cancellation would destroy that history, which is useful for admin analytics (e.g. "which plan do canceled praticiens churn from" — feeds Plan 08g's future analytics). Both frontends derive *effective* access from `statut === 'canceled' ? 'essentiel' : plan`, not from `plan` alone (a small, unit-tested `effectivePlan()` helper on both platforms — Task 10 mobile, inlined directly in Task 8's web JSX since there's no shared web/mobile logic layer in this codebase).
- **Stripe's 8-value `Subscription.Status` enum is mapped down to this plan's locked 4-value `statut` enum** (`active|past_due|canceled|trialing`) via an explicit `mapStripeStatus()` function: `incomplete`/`unpaid`/`paused` fold into `past_due` (still needs attention, not yet terminal), `incomplete_expired` folds into `canceled`. This mapping is a judgment call with no single locked-in answer from the spec; documented here rather than left implicit in a `switch` statement with no comment.
- **`Invoice.subscription` does not exist as a top-level field in the API version this codebase is pinned to** (`2026-06-24.dahlia`) — confirmed via context7 against `stripe-node`'s own `Invoices.ts`: the subscription reference moved to `invoice.parent.subscription_details.subscription` in a 2025-era API version and this codebase's pin is newer still. Guessing the old top-level field here would have silently broken `invoice.payment_failed` handling in a way no local test could catch without a correctly-shaped fixture — this plan's e2e test fixture and service code both use the new nested path (Task 7).
- **`SubscriptionItem.current_period_end` (not `Subscription.current_period_end`) is where the renewal date lives**, for the same "moved in a recent API version" reason as `Invoice.subscription` above — also confirmed via context7 against `stripe-node`'s own `SubscriptionItems.ts`. `customer.subscription.updated`'s handler reads `subscription.items.data[0].current_period_end`.
- **Mobile's Checkout redirect uses `expo-web-browser`'s `WebBrowser.openAuthSessionAsync(url, redirectUrl)`, not the plain `Linking.openURL` Plan 08f uses for Connect onboarding.** Researched via web search (cited in Task 11) rather than copied from 08f on the assumption it's "the same kind of redirect": Connect onboarding is a fire-and-forget, possibly-long, multi-step external form the user might leave and resume later, so 08f's `Linking.openURL` (no return signal needed) fits. Stripe Checkout is a short, single-screen "enter card, pay" flow where the app benefits from knowing exactly when the browser session ends so it can immediately refetch subscription status — `openAuthSessionAsync` returns a promise that resolves on that close/redirect, which `Linking.openURL` does not provide. This is a deliberate, researched deviation from 08f's pattern, not an oversight of it.
- **Admin routes use plain `AdminGuard`, not a Plan 08b capability gate.** Plan 08b (roles & permissions) has not landed either as of this plan's research, and both sibling plans that already reached this same fork (08a's admin conversation-moderation routes, 08f's admin Stripe-status route) chose plain `AdminGuard` for identical reasons — no locked requirement ties this specifically to the `abonnements_promos` capability, and gating now would need retrofitting once 08b's `@RequireCapability` decorator actually exists. Noted here as the same call, made for the same reason, for consistency across the three sub-plans.
- **A note on shared-file interoperability with 08a and 08f.** This plan (per the locked sequencing) executes after 08a and before 08f, but all three were *written* in parallel from the same pre-Plan-08 codebase snapshot. Four files this plan touches are also touched by a sibling plan's document: `server/src/common/stripe.service.ts` and `server/src/rendez-vous/stripe-webhook.controller.ts` (08f adds more methods/a webhook branch to both, based on Plan 05's original, pre-08e version of each file), and `server/test/utils/create-test-app.ts` / `server/src/app.module.ts` (08a and 08f both add their own entries). This plan's own edits to all four are additive and structured for easy merging (explicit "add this after that line" steps, not blind full-file overwrites, for the two files with the most sibling-plan traffic). Whoever executes 08f *after* this plan must manually merge 08f's Task 3/Task 5 code blocks for `stripe.service.ts`/`stripe-webhook.controller.ts` alongside what this plan adds, rather than pasting 08f's "full resulting file" over this plan's version — flagged explicitly here since it isn't this plan's job to edit 08f's document, only to avoid silently destroying its own output for a future executor.

---

## File Structure

| File | Responsibility |
|---|---|
| `server/src/auth/guards/praticien.guard.ts` (create, if missing — Task 1) | `PraticienGuard`, mirrors `ClientGuard` |
| `server/src/auth/decorators.ts` (modify, if missing) | Add `CurrentPraticien` param decorator |
| `server/src/auth/auth.module.ts` (modify, if missing) | Register `Praticien` + `PraticienGuard` globally |
| `server/test/utils/create-test-app.ts` (modify) | Add `seedPraticienUser` (if missing); register `Subscription`/`PlatformSetting` in `ALL_ENTITIES` |
| `server/src/database/entities/subscription.entity.ts` (create) | `Subscription` TypeORM entity |
| `server/src/database/entities/platform-setting.entity.ts` (create) | `PlatformSetting` TypeORM entity (single-row commission config) |
| `server/src/database/migrations/1700000000007-AddSubscriptionsAndPlatformSettings.ts` (create) | `subscriptions` + `platform_settings` tables |
| `server/src/common/commission.ts` (create) | Real `DEFAULT_COMMISSION_RATE`/`getCommissionRate()`/`setCommissionRate()` — the exact swap-in point Plan 08f's placeholder documents |
| `server/src/common/commission.spec.ts` (create) | Unit test for the cache pair |
| `server/src/platform-settings/platform-settings.module.ts` (create) | Module wiring |
| `server/src/platform-settings/platform-settings.controller.ts` (create) | `GET/PUT /admin/settings/commission` |
| `server/src/platform-settings/platform-settings.service.ts` (create) | Single-row get-or-create + `OnModuleInit` cache warm-up |
| `server/src/platform-settings/dto/update-commission.dto.ts` (create) | `{commission_rate}` request shape |
| `server/test/platform-settings.e2e-spec.ts` (create) | Full e2e coverage incl. cache-refresh proof |
| `server/src/common/stripe.service.ts` (modify) | Add `createCustomer`, `createCheckoutSession`, `updateSubscriptionCancelAtPeriodEnd`, `cancelSubscriptionImmediately` |
| `server/.env.example` (modify) | Append `STRIPE_PRICE_ID_PRO`, `STRIPE_PRICE_ID_PREMIUM`, `STRIPE_SUBSCRIPTION_SUCCESS_URL`, `STRIPE_SUBSCRIPTION_CANCEL_URL` |
| `server/src/subscriptions/plans.ts` (create) | `PLAN_PRICES` constant + `priceIdForPlan()` |
| `server/src/subscriptions/dto/create-checkout.dto.ts` (create) | `{plan}` request shape |
| `server/src/subscriptions/subscriptions.service.ts` (create) | `current`/`checkout`/`cancel`/admin list+stats/webhook handling |
| `server/src/subscriptions/subscriptions.controller.ts` (create) | Praticien + admin routes |
| `server/src/subscriptions/subscriptions.module.ts` (create) | Module wiring |
| `server/src/rendez-vous/rendez-vous.module.ts` (modify) | Import `SubscriptionsModule` so the webhook controller can inject `SubscriptionsService` |
| `server/src/rendez-vous/stripe-webhook.controller.ts` (modify) | Route subscription event types to `SubscriptionsService`; `payment_intent.*` still routes to `RendezVousService` |
| `server/src/app.module.ts` (modify) | Register `PlatformSettingsModule`, `SubscriptionsModule` |
| `server/test/subscriptions.e2e-spec.ts` (create) | Full e2e coverage: praticien routes, admin routes, webhook routing (Stripe mocked) |
| `web/app/admin/abonnements/page.jsx` (modify) | Real list + stats from `/admin/subscriptions[/statistics]` |
| `web/app/admin/parametres/facturation/page.jsx` (modify) | Commission field wired to `/admin/settings/commission`, real save/error/success |
| `mobile/package.json` (modify) | Add `expo-web-browser` |
| `mobile/src/data/types.ts` (modify) | Add `Subscription`, `SubscriptionPlan`, `SubscriptionStatut` |
| `mobile/src/data/plans.ts` (create) | `PLANS` — mirrors `web/lib/data/content.js`'s `plans` array |
| `mobile/src/utils/subscriptionPlan.ts` (create) | `effectivePlan()` |
| `mobile/src/utils/subscriptionPlan.test.ts` (create) | Unit tests for the above |
| `mobile/src/data/repos/index.ts` (modify) | Add `subscriptionRepo` |
| `mobile/src/data/repos/subscription.test.ts` (create) | Unit tests for the repo layer |
| `mobile/app/subscription.tsx` (modify) | Full rework: real 3-tier cards, real Checkout redirect, real cancel |
| `mobile/app/dashboard.tsx` (modify) | Trial box → real "Mon abonnement" box (targeted edit — additive with Plan 08f's later "Paiements" section) |

---

## Task 1: `PraticienGuard` — ground-truth check, then create if missing

**Files:**
- Create (if missing): `server/src/auth/guards/praticien.guard.ts`
- Modify (if missing): `server/src/auth/decorators.ts`, `server/src/auth/auth.module.ts`, `server/test/utils/create-test-app.ts`

This guard is a cross-plan dependency (Plan 08a's messaging plan is the plan that's supposed to add it; Plan 08f's plan defensively adds it too if 08a hasn't landed). Do not assume either way — verify first.

- [ ] **Step 1: Ground-truth check**

Run (in `server/`):

```bash
find src/auth/guards -iname "praticien.guard.ts"
grep -n "CurrentPraticien" src/auth/decorators.ts
grep -n "Praticien" src/auth/auth.module.ts
grep -n "seedPraticienUser" test/utils/create-test-app.ts
```

- If `praticien.guard.ts` **exists**: read it, confirm it resolves `req.user.email` against the `praticiens` repository and sets `req.praticien`, confirm `CurrentPraticien` exists in `decorators.ts`, confirm `AuthModule` already registers `Praticien` + the guard, and confirm `seedPraticienUser` exists in `create-test-app.ts`. If all four are already correct, **skip Steps 2–7 below** and go straight to Step 8 (verify the full suite still passes) before moving to Task 2 — nothing to commit for this task.
- If **absent** (confirmed absent as of this plan's own research on 2026-07-15) — proceed with Steps 2–7.

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

- [ ] **Step 5: Add a `seedPraticienUser` test helper**

Modify `server/test/utils/create-test-app.ts` — add the import alongside the other entity imports:

```typescript
import { Praticien } from '../../src/database/entities/praticien.entity';
```

(This import already exists in the current file for `ALL_ENTITIES` — do not duplicate it if so.) Add the new function after the existing `seedClientUser` function:

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

- [ ] **Step 6: Run build to verify the guard and module wiring compile**

Run (in `server/`): `npm run build`
Expected: Build succeeds.

- [ ] **Step 7: Run the full e2e suite to check for regressions**

Run (in `server/`): `npm run test:e2e`
Expected: PASS — no existing suite depends on the changed files' old shape.

- [ ] **Step 8: Commit (only if Steps 2–7 actually ran — skip if Step 1 found everything already present)**

```bash
git add server/src/auth/guards/praticien.guard.ts server/src/auth/decorators.ts server/src/auth/auth.module.ts server/test/utils/create-test-app.ts
git commit -m "feat(server): add PraticienGuard mirroring ClientGuard"
```

---

## Task 2: `Subscription` + `PlatformSetting` entities and migration

**Files:**
- Create: `server/src/database/entities/subscription.entity.ts`, `server/src/database/entities/platform-setting.entity.ts`
- Create: `server/src/database/migrations/1700000000007-AddSubscriptionsAndPlatformSettings.ts`
- Modify: `server/test/utils/create-test-app.ts`

- [ ] **Step 1: Write the `Subscription` entity**

Create `server/src/database/entities/subscription.entity.ts`:

```typescript
import {
  Column, CreateDateColumn, Entity, JoinColumn, ManyToOne,
  PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm';
import { Praticien } from './praticien.entity';

@Entity('subscriptions')
export class Subscription {
  @PrimaryGeneratedColumn() id: number;
  @Column({ unique: true }) praticien_id: number;
  @Column({ type: 'varchar', length: 20, default: 'essentiel' }) plan: string; // 'essentiel'|'pro'|'premium'
  @Column({ type: 'varchar', length: 20, default: 'active' }) statut: string; // 'active'|'past_due'|'canceled'|'trialing'
  @Column({ type: 'varchar', nullable: true }) stripe_subscription_id: string | null;
  @Column({ type: 'varchar', nullable: true }) stripe_customer_id: string | null;
  @Column({ type: 'datetime', nullable: true }) current_period_end: Date | null;
  @CreateDateColumn({ name: 'created_at' }) created_at: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updated_at: Date;

  @ManyToOne(() => Praticien, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'praticien_id' })
  praticien: Praticien;
}
```

- [ ] **Step 2: Write the `PlatformSetting` entity**

Create `server/src/database/entities/platform-setting.entity.ts`:

```typescript
import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { decimalTransformer } from '../../common/transformers';

// Single-row settings table, always operated on via the fixed id=1 row (see
// PlatformSettingsService.getOrCreate()) — a generic key-value config table was considered
// and rejected: the only real requirement today is one platform-wide number, and a single
// typed row is simpler than key-value plumbing for one value (YAGNI).
@Entity('platform_settings')
export class PlatformSetting {
  @PrimaryColumn() id: number;
  @Column({ type: 'decimal', precision: 5, scale: 4, transformer: decimalTransformer }) commission_rate: number;
  @CreateDateColumn({ name: 'created_at' }) created_at: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updated_at: Date;
}
```

- [ ] **Step 3: Write the migration**

Create `server/src/database/migrations/1700000000007-AddSubscriptionsAndPlatformSettings.ts`. This mirrors the existing `1700000000001-RendezVous.ts` / `1700000000002-AddFavoritesAndNotificationPreferences.ts` raw-SQL style exactly:

```typescript
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSubscriptionsAndPlatformSettings1700000000007 implements MigrationInterface {
  public async up(q: QueryRunner): Promise<void> {
    await q.query(`CREATE TABLE subscriptions (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      praticien_id BIGINT UNSIGNED NOT NULL,
      plan VARCHAR(20) NOT NULL DEFAULT 'essentiel',
      statut VARCHAR(20) NOT NULL DEFAULT 'active',
      stripe_subscription_id VARCHAR(255) NULL,
      stripe_customer_id VARCHAR(255) NULL,
      current_period_end TIMESTAMP NULL,
      created_at TIMESTAMP NULL,
      updated_at TIMESTAMP NULL,
      UNIQUE KEY uq_subscriptions_praticien (praticien_id),
      CONSTRAINT fk_sub_praticien FOREIGN KEY (praticien_id) REFERENCES praticiens(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await q.query(`CREATE TABLE platform_settings (
      id BIGINT UNSIGNED PRIMARY KEY,
      commission_rate DECIMAL(5,4) NOT NULL DEFAULT 0.1500,
      created_at TIMESTAMP NULL,
      updated_at TIMESTAMP NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE IF EXISTS platform_settings`);
    await q.query(`DROP TABLE IF EXISTS subscriptions`);
  }
}
```

- [ ] **Step 4: Register both entities in the e2e test harness**

In `server/test/utils/create-test-app.ts`, add the imports alongside the other entity imports:

```typescript
import { Subscription } from '../../src/database/entities/subscription.entity';
import { PlatformSetting } from '../../src/database/entities/platform-setting.entity';
```

And add both to `ALL_ENTITIES`:

```typescript
const ALL_ENTITIES = [
  User, Client, Praticien, PraticienDocument, Cercle, Event, EventPraticien,
  Promotion, Discipline, Article, Notification, EmailTemplate, Echange, Paiement,
  Remboursement, RendezVous, Avis, Signalement, Favorite, NotificationPreference,
  Subscription, PlatformSetting,
];
```

(If Task 1 already ran and added `Conversation`/`Message` — from Plan 08a having landed first — keep those entries too; this is additive to whatever the list already contains, not a replacement.)

- [ ] **Step 5: Verify the existing suite still passes with the new entities registered**

Run: `npm run test:e2e` (in `server/`)
Expected: PASS — every existing suite still green; `synchronize: true` picks up the two new entities and the FK to `praticiens` without touching any existing table.

- [ ] **Step 6: Commit**

```bash
git add server/src/database/entities/subscription.entity.ts server/src/database/entities/platform-setting.entity.ts server/src/database/migrations/1700000000007-AddSubscriptionsAndPlatformSettings.ts server/test/utils/create-test-app.ts
git commit -m "feat(server): add subscriptions and platform_settings entities and migration"
```

---

## Task 3: Real commission-rate config (`commission.ts`) + `PlatformSettingsModule`

**Files:**
- Create: `server/src/common/commission.ts`
- Test: `server/src/common/commission.spec.ts`
- Create: `server/src/platform-settings/dto/update-commission.dto.ts`, `platform-settings.service.ts`, `platform-settings.controller.ts`, `platform-settings.module.ts`
- Test: `server/test/platform-settings.e2e-spec.ts`
- Modify: `server/src/app.module.ts`

**Ground-truth check (do this before writing anything):** run `grep -rn "commission" server/src --include=*.ts -l` from the repo root. As of this plan's own research (2026-07-15) it only appears in `paiement.entity.ts` (columns), `paiements.service.ts` (reads/sums, never sets a rate), and `1700000000000-InitialSchema.ts` (column definition) — no `commission.ts` file exists anywhere yet, confirming Plan 08f has not landed first. If a `server/src/common/commission.ts` *does* already exist by the time you run this (Plan 08f executed first and created its own fallback), read it: if it's the simple `DEFAULT_COMMISSION_RATE = 0.15` constant described in that plan's Task 3, replace its body with the real, cache-backed version below (same exported names, `DEFAULT_COMMISSION_RATE` and `getCommissionRate()`, plus the new `setCommissionRate()`) — do not create a second file.

- [ ] **Step 1: Write the failing unit test for the cache pair**

Create `server/src/common/commission.spec.ts`:

```typescript
import { DEFAULT_COMMISSION_RATE, getCommissionRate, setCommissionRate } from './commission';

describe('commission', () => {
  afterEach(() => setCommissionRate(DEFAULT_COMMISSION_RATE));

  it('getCommissionRate returns the default rate before anything overrides it', () => {
    expect(getCommissionRate()).toBe(DEFAULT_COMMISSION_RATE);
  });

  it('DEFAULT_COMMISSION_RATE is a fraction between 0 and 1', () => {
    expect(DEFAULT_COMMISSION_RATE).toBeGreaterThan(0);
    expect(DEFAULT_COMMISSION_RATE).toBeLessThan(1);
  });

  it('setCommissionRate updates what getCommissionRate returns', () => {
    setCommissionRate(0.2);
    expect(getCommissionRate()).toBe(0.2);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- commission.spec.ts` (in `server/`)
Expected: FAIL — cannot find module `./commission`.

- [ ] **Step 3: Write `commission.ts`**

Create `server/src/common/commission.ts`:

```typescript
/**
 * Platform commission rate (fraction of a booking's montant_brut kept by Aura, the rest
 * going to the praticien via Stripe Connect's application_fee_amount — see Plan 08f).
 *
 * Kept as a synchronous, dependency-free pair of module-level functions (not a service
 * method) because the booking hot path (RendezVousService.create(), Plan 08f) calls
 * getCommissionRate() synchronously while building a PaymentIntent — an async DB round
 * trip there would add latency for a value that changes rarely (an admin edits it from
 * admin/parametres/facturation a handful of times a year, not per booking). The real,
 * persisted source of truth is the platform_settings table (PlatformSetting entity); this
 * module holds an in-memory cache of its one row, warmed at boot and refreshed on every
 * admin write — see PlatformSettingsService (server/src/platform-settings/).
 *
 * Unit: a decimal fraction (0.15, not 15) end to end — the admin API and this module agree
 * on this unit; only the web admin/parametres/facturation page (which shows a percentage
 * input) converts, at its own presentation boundary.
 */
export const DEFAULT_COMMISSION_RATE = 0.15;

let currentRate = DEFAULT_COMMISSION_RATE;

export function getCommissionRate(): number {
  return currentRate;
}

/** Called by PlatformSettingsService.onModuleInit() and after every admin PUT. */
export function setCommissionRate(rate: number): void {
  currentRate = rate;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- commission.spec.ts` (in `server/`)
Expected: PASS (3 tests).

- [ ] **Step 5: Write the DTO**

Create `server/src/platform-settings/dto/update-commission.dto.ts`:

```typescript
import { Type } from 'class-transformer';
import { IsNumber, Max, Min } from 'class-validator';

export class UpdateCommissionDto {
  @Type(() => Number) @IsNumber() @Min(0) @Max(1) commission_rate: number;
}
```

- [ ] **Step 6: Write the failing e2e spec**

Create `server/test/platform-settings.e2e-spec.ts`:

```typescript
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, seedAdmin, seedClientUser } from './utils/create-test-app';
import { PlatformSettingsModule } from '../src/platform-settings/platform-settings.module';
import { getCommissionRate, DEFAULT_COMMISSION_RATE } from '../src/common/commission';

describe('platform-settings (commission rate)', () => {
  let app: INestApplication;
  let adminToken: string;

  beforeAll(async () => {
    app = await createTestApp({ imports: [PlatformSettingsModule] });
    adminToken = (await seedAdmin(app, 'ps-admin@aura.io')).token;
  });
  afterAll(async () => { await app.close(); });
  const http = () => request(app.getHttpServer());

  it('GET /api/admin/settings/commission requires AdminGuard', async () => {
    await http().get('/api/admin/settings/commission').expect(401);
    const { token: clientToken } = await seedClientUser(app, 'ps-client@aura.io');
    await http().get('/api/admin/settings/commission')
      .set('Authorization', `Bearer ${clientToken}`).expect(403);
  });

  it('GET returns the default commission rate, auto-creating the settings row on first access', async () => {
    const res = await http().get('/api/admin/settings/commission')
      .set('Authorization', `Bearer ${adminToken}`).expect(200);
    expect(res.body.data.commission_rate).toBe(DEFAULT_COMMISSION_RATE);
  });

  it('onModuleInit warms the in-memory cache getCommissionRate() reads from', () => {
    // PlatformSettingsModule.onModuleInit ran during createTestApp() above (app.init()
    // triggers Nest lifecycle hooks) — getCommissionRate() is a synchronous module-level
    // function with no DI, called directly the same way Plan 08f's RendezVousService.create()
    // will call it.
    expect(getCommissionRate()).toBe(DEFAULT_COMMISSION_RATE);
  });

  it('PUT validates commission_rate is between 0 and 1', async () => {
    const tooHigh = await http().put('/api/admin/settings/commission')
      .set('Authorization', `Bearer ${adminToken}`).send({ commission_rate: 1.5 }).expect(422);
    expect(tooHigh.body.errors.commission_rate).toBeDefined();
    const negative = await http().put('/api/admin/settings/commission')
      .set('Authorization', `Bearer ${adminToken}`).send({ commission_rate: -0.1 }).expect(422);
    expect(negative.body.errors.commission_rate).toBeDefined();
  });

  it('PUT updates the persisted rate and refreshes the in-memory cache immediately', async () => {
    const res = await http().put('/api/admin/settings/commission')
      .set('Authorization', `Bearer ${adminToken}`).send({ commission_rate: 0.2 }).expect(200);
    expect(res.body.data.commission_rate).toBe(0.2);
    expect(res.body.message).toBe('Taux de commission mis à jour');
    expect(getCommissionRate()).toBe(0.2);

    const fresh = await http().get('/api/admin/settings/commission')
      .set('Authorization', `Bearer ${adminToken}`).expect(200);
    expect(fresh.body.data.commission_rate).toBe(0.2);
  });
});
```

- [ ] **Step 7: Run the spec to verify it fails**

Run: `npm run test:e2e -- platform-settings.e2e-spec.ts` (in `server/`)
Expected: FAIL — `Cannot find module '../src/platform-settings/platform-settings.module'`.

- [ ] **Step 8: Write `PlatformSettingsService`**

Create `server/src/platform-settings/platform-settings.service.ts`:

```typescript
import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlatformSetting } from '../database/entities/platform-setting.entity';
import { success } from '../common/envelope';
import { DEFAULT_COMMISSION_RATE, setCommissionRate } from '../common/commission';

const SETTINGS_ROW_ID = 1;

@Injectable()
export class PlatformSettingsService implements OnModuleInit {
  constructor(
    @InjectRepository(PlatformSetting) private readonly settings: Repository<PlatformSetting>,
  ) {}

  async onModuleInit() {
    const row = await this.getOrCreate();
    setCommissionRate(row.commission_rate);
  }

  private async getOrCreate(): Promise<PlatformSetting> {
    let row = await this.settings.findOneBy({ id: SETTINGS_ROW_ID });
    if (!row) {
      row = await this.settings.save({ id: SETTINGS_ROW_ID, commission_rate: DEFAULT_COMMISSION_RATE });
    }
    return row;
  }

  async getCommission() {
    const row = await this.getOrCreate();
    return success({ commission_rate: row.commission_rate });
  }

  async updateCommission(rate: number) {
    await this.getOrCreate();
    await this.settings.update(SETTINGS_ROW_ID, { commission_rate: rate });
    setCommissionRate(rate);
    return success({ commission_rate: rate }, 'Taux de commission mis à jour');
  }
}
```

- [ ] **Step 9: Write `PlatformSettingsController`**

Create `server/src/platform-settings/platform-settings.controller.ts`:

```typescript
import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { PlatformSettingsService } from './platform-settings.service';
import { UpdateCommissionDto } from './dto/update-commission.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

@Controller('admin/settings')
export class PlatformSettingsController {
  constructor(private readonly service: PlatformSettingsService) {}

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('commission')
  get() {
    return this.service.getCommission();
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Put('commission')
  update(@Body() dto: UpdateCommissionDto) {
    return this.service.updateCommission(dto.commission_rate);
  }
}
```

- [ ] **Step 10: Write `PlatformSettingsModule` and register it**

Create `server/src/platform-settings/platform-settings.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlatformSetting } from '../database/entities/platform-setting.entity';
import { PlatformSettingsController } from './platform-settings.controller';
import { PlatformSettingsService } from './platform-settings.service';

@Module({
  imports: [TypeOrmModule.forFeature([PlatformSetting])],
  controllers: [PlatformSettingsController],
  providers: [PlatformSettingsService],
})
export class PlatformSettingsModule {}
```

In `server/src/app.module.ts`, add the import:

```typescript
import { PlatformSettingsModule } from './platform-settings/platform-settings.module';
```

And add `PlatformSettingsModule` to the `imports` array (anywhere alongside the other feature modules — order has no functional effect):

```typescript
    RendezVousModule,
    PlatformSettingsModule,
```

- [ ] **Step 11: Run the spec to verify it passes**

Run: `npm run test:e2e -- platform-settings.e2e-spec.ts` (in `server/`)
Expected: PASS (5 tests).

- [ ] **Step 12: Run the full unit + e2e suites to check for regressions**

Run (in `server/`): `npm test`
Expected: PASS, including the new `commission.spec.ts` (3 tests).

Run (in `server/`): `npm run test:e2e`
Expected: PASS.

- [ ] **Step 13: Commit**

```bash
git add server/src/common/commission.ts server/src/common/commission.spec.ts server/src/platform-settings server/test/platform-settings.e2e-spec.ts server/src/app.module.ts
git commit -m "feat(server): add real commission-rate config with admin GET/PUT endpoints"
```

---

## Task 4: `StripeService` — customer + Checkout Session + subscription-cancel methods

**Files:**
- Modify: `server/src/common/stripe.service.ts`, `server/.env.example`

**Context7 verification:** `mcp__context7__query-docs` against `/stripe/stripe-node` confirmed, straight from the SDK's own source (not guessed): `SessionCreateParams` carries `mode?: 'payment' | 'setup' | 'subscription'`, `customer?: string`, `line_items?: Array<{price?: string; quantity?: number}>`, `success_url?: string`, `cancel_url?: string`, `metadata?: MetadataParam` (`src/resources/Checkout/Sessions.ts`); `Session.subscription: string | Subscription | null` is the created subscription's id when `mode: 'subscription'` and not expanded. `Subscription.cancel_at_period_end: boolean` is a real, settable field (`src/resources/Subscriptions.ts`), and `stripe.subscriptions.update(id, params)` / `stripe.subscriptions.cancel(id)` (not the removed `.del()`) are the current real methods (`src/resources/Subscriptions.ts`, migration-guide wiki page for v13 confirming `.cancel()` replaced `.del()`). `stripe.customers.create({email, metadata})` is confirmed by the SDK's own migration-guide examples. None of this was guessed from training data.

- [ ] **Step 1: Modify `StripeService`**

Modify `server/src/common/stripe.service.ts` (full resulting file):

```typescript
import { Injectable } from '@nestjs/common';
import Stripe from 'stripe';

// Pinned to the Stripe API version this SDK release ships with (confirmed via context7
// against stripe-node's own src/apiVersion.ts) rather than left to drift.
const STRIPE_API_VERSION = '2026-06-24.dahlia';

@Injectable()
export class StripeService {
  private readonly stripe: Stripe;

  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', {
      apiVersion: STRIPE_API_VERSION,
    });
  }

  createPaymentIntent(amountCents: number, metadata: Record<string, string>) {
    return this.stripe.paymentIntents.create({
      amount: amountCents,
      currency: 'eur',
      metadata,
      // Lets PaymentElement (web) / the Payment Sheet (mobile) offer whatever payment
      // methods are enabled on the Stripe account, without hardcoding to 'card' only.
      automatic_payment_methods: { enabled: true },
    });
  }

  constructWebhookEvent(rawBody: Buffer, signature: string, secret: string): Stripe.Event {
    return this.stripe.webhooks.constructEvent(rawBody, signature, secret);
  }

  // ---- Subscriptions (Plan 08e) ----

  createCustomer(email: string, metadata: Record<string, string>) {
    return this.stripe.customers.create({ email, metadata });
  }

  createCheckoutSession(params: {
    customerId: string;
    priceId: string;
    successUrl: string;
    cancelUrl: string;
    metadata: Record<string, string>;
  }) {
    return this.stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: params.customerId,
      line_items: [{ price: params.priceId, quantity: 1 }],
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      metadata: params.metadata,
    });
  }

  /** Schedules cancellation at the end of the current billing period — billing/access stay
   * live until then. Used by the user-initiated cancel action (see SubscriptionsService.cancel). */
  updateSubscriptionCancelAtPeriodEnd(subscriptionId: string) {
    return this.stripe.subscriptions.update(subscriptionId, { cancel_at_period_end: true });
  }

  /** Stops billing immediately — used only when switching between two paid plans (the old
   * subscription must stop before the new Checkout Session's subscription starts, to avoid
   * double-billing). Not used by the user-initiated cancel action. */
  cancelSubscriptionImmediately(subscriptionId: string) {
    return this.stripe.subscriptions.cancel(subscriptionId);
  }
}
```

This is additive to Plan 05's original file — the two pre-existing methods (`createPaymentIntent`, `constructWebhookEvent`) are byte-for-byte unchanged, so no existing caller or test is affected. (Plan 08f's own document independently adds *different* new methods — `createConnectAccount`, `createAccountLink`, plus an optional third parameter on `createPaymentIntent` — to this same file, based on Plan 05's original version; per this plan's Design notes, whoever executes 08f after this plan must merge its Task 3 code block with this task's result rather than overwrite it.)

- [ ] **Step 2: Append the subscription-related env vars**

Modify `server/.env.example` — append (do not reformat the existing lines):

```
STRIPE_PRICE_ID_PRO=
STRIPE_PRICE_ID_PREMIUM=
STRIPE_SUBSCRIPTION_SUCCESS_URL=
STRIPE_SUBSCRIPTION_CANCEL_URL=
```

- [ ] **Step 3: Run the existing Stripe unit test to confirm no regression**

Run: `npm test -- stripe.service.spec.ts` (in `server/`)
Expected: PASS (2 tests, unchanged — this task added new methods but didn't touch `constructWebhookEvent`, the only one that file tests).

- [ ] **Step 4: Commit**

```bash
git add server/src/common/stripe.service.ts server/.env.example
git commit -m "feat(server): add Stripe customer, Checkout Session, and subscription-cancel methods"
```

---

## Task 5: `SubscriptionsModule` — praticien routes (`current`, `checkout`, `cancel`)

**Files:**
- Create: `server/src/subscriptions/plans.ts`, `server/src/subscriptions/dto/create-checkout.dto.ts`
- Create: `server/src/subscriptions/subscriptions.service.ts`, `subscriptions.controller.ts`, `subscriptions.module.ts`
- Create: `server/test/subscriptions.e2e-spec.ts`
- Modify: `server/src/app.module.ts`

- [ ] **Step 1: Write `plans.ts`**

Create `server/src/subscriptions/plans.ts`:

```typescript
// Canonical 3-tier plan pricing (P8-3) — mirrors web/lib/data/content.js's `plans` array
// exactly. Kept in sync by hand: this codebase has no shared package between server/ and
// web/, matching how mobile's own copy of this data (Task 10) is also a hand-kept mirror.
export const PLAN_PRICES: Record<'essentiel' | 'pro' | 'premium', number> = {
  essentiel: 0,
  pro: 29,
  premium: 59,
};

export function priceIdForPlan(plan: 'pro' | 'premium'): string {
  const envVar = plan === 'pro' ? 'STRIPE_PRICE_ID_PRO' : 'STRIPE_PRICE_ID_PREMIUM';
  const id = process.env[envVar];
  if (!id) {
    throw new Error(
      `Missing ${envVar} — set it in server/.env to a real Stripe test-mode Price id ` +
      `before creating a Checkout Session for the "${plan}" plan (see this plan's Prerequisites section).`,
    );
  }
  return id;
}
```

- [ ] **Step 2: Write the DTO**

Create `server/src/subscriptions/dto/create-checkout.dto.ts`:

```typescript
import { IsIn } from 'class-validator';

export class CreateCheckoutDto {
  @IsIn(['pro', 'premium']) plan: 'pro' | 'premium';
}
```

- [ ] **Step 3: Write the failing e2e spec (praticien routes)**

Create `server/test/subscriptions.e2e-spec.ts`:

```typescript
process.env.STRIPE_PRICE_ID_PRO = 'price_test_pro';
process.env.STRIPE_PRICE_ID_PREMIUM = 'price_test_premium';

import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { createTestApp, seedAdmin, seedClientUser, seedPraticienUser } from './utils/create-test-app';
import { SubscriptionsModule } from '../src/subscriptions/subscriptions.module';
import { Subscription } from '../src/database/entities/subscription.entity';
import { StripeService } from '../src/common/stripe.service';

const stripeServiceMock = {
  createPaymentIntent: jest.fn(),
  constructWebhookEvent: jest.fn(),
  createCustomer: jest.fn().mockResolvedValue({ id: 'cus_test_123' }),
  createCheckoutSession: jest.fn().mockResolvedValue({ id: 'cs_test_123', url: 'https://checkout.stripe.com/test_123' }),
  updateSubscriptionCancelAtPeriodEnd: jest.fn().mockResolvedValue({ id: 'sub_test', cancel_at_period_end: true }),
  cancelSubscriptionImmediately: jest.fn().mockResolvedValue({ id: 'sub_old', status: 'canceled' }),
};

describe('subscriptions (praticien routes)', () => {
  let app: INestApplication;
  let ds: DataSource;

  beforeAll(async () => {
    app = await createTestApp(
      { imports: [SubscriptionsModule] },
      [{ provide: StripeService, useValue: stripeServiceMock }],
    );
    ds = app.get(DataSource);
  });
  afterAll(async () => { await app.close(); });
  beforeEach(() => { jest.clearAllMocks(); });
  const http = () => request(app.getHttpServer());

  it('requires auth on every praticien route', async () => {
    await http().get('/api/praticien/subscription').expect(401);
    await http().post('/api/praticien/subscription/checkout').send({ plan: 'pro' }).expect(401);
    await http().post('/api/praticien/subscription/cancel').expect(401);
  });

  it('PraticienGuard rejects a client token — it is a separate identity from ClientGuard', async () => {
    const { token: clientToken } = await seedClientUser(app, 'sub-client@aura.io');
    await http().get('/api/praticien/subscription')
      .set('Authorization', `Bearer ${clientToken}`).expect(403);
  });

  it('GET current lazily creates an Essentiel/active row on first access, then reuses it', async () => {
    const { token } = await seedPraticienUser(app, 'sub-praticien-1@aura.io');
    const first = await http().get('/api/praticien/subscription')
      .set('Authorization', `Bearer ${token}`).expect(200);
    expect(first.body.data).toMatchObject({ plan: 'essentiel', statut: 'active' });
    const id = first.body.data.id;

    const second = await http().get('/api/praticien/subscription')
      .set('Authorization', `Bearer ${token}`).expect(200);
    expect(second.body.data.id).toBe(id);
  });

  it('POST checkout rejects plan "essentiel" — the free tier has no Stripe object', async () => {
    const { token } = await seedPraticienUser(app, 'sub-praticien-2@aura.io');
    const res = await http().post('/api/praticien/subscription/checkout')
      .set('Authorization', `Bearer ${token}`).send({ plan: 'essentiel' }).expect(422);
    expect(res.body.errors.plan).toBeDefined();
  });

  it('POST checkout creates a Stripe customer + Checkout Session and returns the redirect url', async () => {
    const { praticien, token } = await seedPraticienUser(app, 'sub-praticien-3@aura.io');
    const res = await http().post('/api/praticien/subscription/checkout')
      .set('Authorization', `Bearer ${token}`).send({ plan: 'pro' }).expect(200);
    expect(res.body.data.url).toBe('https://checkout.stripe.com/test_123');
    expect(stripeServiceMock.createCustomer).toHaveBeenCalledWith(
      'sub-praticien-3@aura.io', { praticien_id: String(praticien.id) },
    );
    expect(stripeServiceMock.createCheckoutSession).toHaveBeenCalledWith({
      customerId: 'cus_test_123',
      priceId: 'price_test_pro',
      successUrl: expect.any(String),
      cancelUrl: expect.any(String),
      metadata: { praticien_id: String(praticien.id), plan: 'pro' },
    });

    const fresh = await ds.getRepository(Subscription).findOneByOrFail({ praticien_id: praticien.id });
    expect(fresh.stripe_customer_id).toBe('cus_test_123');
  });

  it('POST checkout reuses an existing stripe_customer_id instead of creating a new one', async () => {
    const { praticien, token } = await seedPraticienUser(app, 'sub-praticien-4@aura.io');
    await http().post('/api/praticien/subscription/checkout')
      .set('Authorization', `Bearer ${token}`).send({ plan: 'pro' }).expect(200);
    jest.clearAllMocks();

    await http().post('/api/praticien/subscription/checkout')
      .set('Authorization', `Bearer ${token}`).send({ plan: 'premium' }).expect(200);
    expect(stripeServiceMock.createCustomer).not.toHaveBeenCalled();
    expect(stripeServiceMock.createCheckoutSession).toHaveBeenCalledWith(
      expect.objectContaining({ customerId: 'cus_test_123', priceId: 'price_test_premium' }),
    );
    void praticien;
  });

  it('POST checkout rejects re-choosing the plan already active', async () => {
    const { praticien, token } = await seedPraticienUser(app, 'sub-praticien-5@aura.io');
    await ds.getRepository(Subscription).save({
      praticien_id: praticien.id, plan: 'pro', statut: 'active',
      stripe_subscription_id: 'sub_already', stripe_customer_id: 'cus_already',
    });
    const res = await http().post('/api/praticien/subscription/checkout')
      .set('Authorization', `Bearer ${token}`).send({ plan: 'pro' }).expect(422);
    expect(res.body.errors.plan).toBeDefined();
  });

  it('POST checkout cancels the old Stripe subscription immediately when switching between two paid plans', async () => {
    const { praticien, token } = await seedPraticienUser(app, 'sub-praticien-6@aura.io');
    await ds.getRepository(Subscription).save({
      praticien_id: praticien.id, plan: 'pro', statut: 'active',
      stripe_subscription_id: 'sub_old_pro', stripe_customer_id: 'cus_switching',
    });
    const res = await http().post('/api/praticien/subscription/checkout')
      .set('Authorization', `Bearer ${token}`).send({ plan: 'premium' }).expect(200);
    expect(res.body.data.url).toBe('https://checkout.stripe.com/test_123');
    expect(stripeServiceMock.cancelSubscriptionImmediately).toHaveBeenCalledWith('sub_old_pro');
    expect(stripeServiceMock.createCheckoutSession).toHaveBeenCalledWith(
      expect.objectContaining({ customerId: 'cus_switching', priceId: 'price_test_premium' }),
    );
  });

  it('POST cancel 404s when the praticien has no active paid subscription', async () => {
    const { token } = await seedPraticienUser(app, 'sub-praticien-7@aura.io');
    const res = await http().post('/api/praticien/subscription/cancel')
      .set('Authorization', `Bearer ${token}`).expect(404);
    expect(res.body.message).toBe('Aucun abonnement payant actif à résilier');
  });

  it('POST cancel schedules cancellation at period end without immediately flipping statut', async () => {
    const { praticien, token } = await seedPraticienUser(app, 'sub-praticien-8@aura.io');
    await ds.getRepository(Subscription).save({
      praticien_id: praticien.id, plan: 'premium', statut: 'active',
      stripe_subscription_id: 'sub_to_cancel', stripe_customer_id: 'cus_to_cancel',
    });
    const res = await http().post('/api/praticien/subscription/cancel')
      .set('Authorization', `Bearer ${token}`).expect(200);
    expect(res.body.message).toBe('Résiliation programmée en fin de période');
    expect(res.body.data.statut).toBe('active'); // still active — webhook-driven, see Task 7
    expect(stripeServiceMock.updateSubscriptionCancelAtPeriodEnd).toHaveBeenCalledWith('sub_to_cancel');
  });
});
```

- [ ] **Step 4: Run the spec to verify it fails**

Run: `npm run test:e2e -- subscriptions.e2e-spec.ts` (in `server/`)
Expected: FAIL — `Cannot find module '../src/subscriptions/subscriptions.module'`.

- [ ] **Step 5: Write `SubscriptionsService`**

Create `server/src/subscriptions/subscriptions.service.ts`:

```typescript
import { Injectable, Logger, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subscription } from '../database/entities/subscription.entity';
import { Praticien } from '../database/entities/praticien.entity';
import { success } from '../common/envelope';
import { StripeService } from '../common/stripe.service';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { priceIdForPlan } from './plans';

// Stripe-hosted Checkout is a browser flow; there is no praticien-facing web surface to
// redirect back to (same finding Plan 08f's Connect onboarding made for its own return URL
// — see that plan's Design notes), so both URLs default to the mobile app's own deep-link
// scheme. Overridable via env in case a given Stripe account's allow-list needs a real
// https:// URL instead.
const SUCCESS_URL = process.env.STRIPE_SUBSCRIPTION_SUCCESS_URL || 'aura://subscription?checkout=success';
const CANCEL_URL = process.env.STRIPE_SUBSCRIPTION_CANCEL_URL || 'aura://subscription?checkout=cancel';

const ACTIVE_STATUSES = ['active', 'trialing', 'past_due'];

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(
    @InjectRepository(Subscription) private readonly subscriptions: Repository<Subscription>,
    private readonly stripeService: StripeService,
  ) {}

  private notFound(message: string): never {
    throw new NotFoundException({ status: 'error', message });
  }

  private validationError(errors: Record<string, string[]>): never {
    throw new UnprocessableEntityException({ status: 'error', message: 'Erreur de validation', errors });
  }

  private async findOrCreateFor(praticien: Praticien): Promise<Subscription> {
    let sub = await this.subscriptions.findOneBy({ praticien_id: praticien.id });
    if (!sub) {
      sub = await this.subscriptions.save({ praticien_id: praticien.id, plan: 'essentiel', statut: 'active' });
    }
    return sub;
  }

  async current(praticien: Praticien) {
    return success(await this.findOrCreateFor(praticien));
  }

  async checkout(praticien: Praticien, dto: CreateCheckoutDto) {
    const sub = await this.findOrCreateFor(praticien);

    if (sub.plan === dto.plan && ACTIVE_STATUSES.includes(sub.statut)) {
      this.validationError({ plan: ['Vous êtes déjà abonné à cette formule.'] });
    }

    let customerId = sub.stripe_customer_id;
    if (!customerId) {
      const customer = await this.stripeService.createCustomer(praticien.email, {
        praticien_id: String(praticien.id),
      });
      customerId = customer.id;
      await this.subscriptions.update(sub.id, { stripe_customer_id: customerId });
    }

    // Switching between two paid plans: stop the old Stripe subscription immediately rather
    // than juggling subscription-item ids for an in-place price swap — see this plan's
    // Design notes for why.
    if (sub.stripe_subscription_id && ACTIVE_STATUSES.includes(sub.statut)) {
      await this.stripeService.cancelSubscriptionImmediately(sub.stripe_subscription_id);
    }

    const session = await this.stripeService.createCheckoutSession({
      customerId,
      priceId: priceIdForPlan(dto.plan),
      successUrl: SUCCESS_URL,
      cancelUrl: CANCEL_URL,
      metadata: { praticien_id: String(praticien.id), plan: dto.plan },
    });
    return success({ url: session.url });
  }

  async cancel(praticien: Praticien) {
    const sub = await this.findOrCreateFor(praticien);
    if (!sub.stripe_subscription_id || !ACTIVE_STATUSES.includes(sub.statut)) {
      this.notFound('Aucun abonnement payant actif à résilier');
    }
    await this.stripeService.updateSubscriptionCancelAtPeriodEnd(sub.stripe_subscription_id);
    // statut is intentionally left as-is here (still 'active'/'trialing'/'past_due') — Stripe
    // keeps billing/access live until the current period ends, matching the platform's own
    // billing FAQ ("vous résiliez en un clic ... et restez actif jusqu'à la fin de la période
    // payée", web/lib/data/content.js's BILLING_FAQ). The real transition to 'canceled' is
    // webhook-driven (Task 7's onSubscriptionDeleted), mirroring Plan 05's rule that only the
    // Stripe webhook ever flips a confirmed billing state.
    return success(
      await this.subscriptions.findOneBy({ id: sub.id }),
      'Résiliation programmée en fin de période',
    );
  }
}
```

(Admin methods are added in Task 6; webhook handling is added in Task 7 — each shown as the complete resulting file at that point.)

- [ ] **Step 6: Write `SubscriptionsController`**

Create `server/src/subscriptions/subscriptions.controller.ts`:

```typescript
import { Body, Controller, Get, HttpCode, Post, UseGuards } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PraticienGuard } from '../auth/guards/praticien.guard';
import { CurrentPraticien } from '../auth/decorators';
import { Praticien } from '../database/entities/praticien.entity';

@Controller()
export class SubscriptionsController {
  constructor(private readonly service: SubscriptionsService) {}

  @UseGuards(JwtAuthGuard, PraticienGuard)
  @Get('praticien/subscription')
  current(@CurrentPraticien() praticien: Praticien) {
    return this.service.current(praticien);
  }

  @UseGuards(JwtAuthGuard, PraticienGuard)
  @HttpCode(200)
  @Post('praticien/subscription/checkout')
  checkout(@CurrentPraticien() praticien: Praticien, @Body() dto: CreateCheckoutDto) {
    return this.service.checkout(praticien, dto);
  }

  @UseGuards(JwtAuthGuard, PraticienGuard)
  @HttpCode(200)
  @Post('praticien/subscription/cancel')
  cancel(@CurrentPraticien() praticien: Praticien) {
    return this.service.cancel(praticien);
  }
}
```

(Admin routes are added to this same controller in Task 6.)

- [ ] **Step 7: Write `SubscriptionsModule` and register it**

Create `server/src/subscriptions/subscriptions.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Subscription } from '../database/entities/subscription.entity';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsService } from './subscriptions.service';
import { StripeService } from '../common/stripe.service';

@Module({
  imports: [TypeOrmModule.forFeature([Subscription])],
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService, StripeService],
  exports: [SubscriptionsService],
})
export class SubscriptionsModule {}
```

In `server/src/app.module.ts`, add the import:

```typescript
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
```

And add `SubscriptionsModule` to the `imports` array:

```typescript
    PlatformSettingsModule,
    SubscriptionsModule,
```

- [ ] **Step 8: Run the spec to verify it passes**

Run: `npm run test:e2e -- subscriptions.e2e-spec.ts` (in `server/`)
Expected: PASS (10 tests).

- [ ] **Step 9: Run the full e2e suite to check for regressions**

Run: `npm run test:e2e` (in `server/`)
Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add server/src/subscriptions server/test/subscriptions.e2e-spec.ts server/src/app.module.ts
git commit -m "feat(server): add praticien subscription current/checkout/cancel endpoints"
```

---

## Task 6: Admin subscription list + statistics

**Files:**
- Modify: `server/src/subscriptions/subscriptions.service.ts`, `server/src/subscriptions/subscriptions.controller.ts`
- Test: `server/test/subscriptions.e2e-spec.ts` (modify)

- [ ] **Step 1: Write the failing tests**

Add these tests to `server/test/subscriptions.e2e-spec.ts`, after the existing `it` blocks (still inside `describe('subscriptions (praticien routes)', ...)`, and still using the same `ds`/`http` from that block — `seedPraticienUser` needs to be imported already, which it is):

```typescript
  it('GET /api/admin/subscriptions requires AdminGuard and lists rows with the praticien joined', async () => {
    await http().get('/api/admin/subscriptions').expect(401);
    const { token: praticienToken } = await seedPraticienUser(app, 'sub-praticien-9@aura.io');
    await http().get('/api/admin/subscriptions')
      .set('Authorization', `Bearer ${praticienToken}`).expect(403);

    const { token: adminToken } = await seedAdmin(app, 'sub-admin-1@aura.io');
    const res = await http().get('/api/admin/subscriptions')
      .set('Authorization', `Bearer ${adminToken}`).expect(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.pagination).toBeDefined();
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data[0].praticien).toBeDefined();
  });

  it('GET /api/admin/subscriptions filters by plan and statut', async () => {
    const { token: adminToken } = await seedAdmin(app, 'sub-admin-2@aura.io');
    const { praticien } = await seedPraticienUser(app, 'sub-praticien-10@aura.io');
    await ds.getRepository(Subscription).save({
      praticien_id: praticien.id, plan: 'premium', statut: 'past_due',
      stripe_subscription_id: 'sub_filter_test', stripe_customer_id: 'cus_filter_test',
    });

    const byPlan = await http().get('/api/admin/subscriptions?plan=premium')
      .set('Authorization', `Bearer ${adminToken}`).expect(200);
    expect(byPlan.body.data.every((s: any) => s.plan === 'premium')).toBe(true);

    const byStatut = await http().get('/api/admin/subscriptions?statut=past_due')
      .set('Authorization', `Bearer ${adminToken}`).expect(200);
    expect(byStatut.body.data.every((s: any) => s.statut === 'past_due')).toBe(true);
    expect(byStatut.body.data.some((s: any) => s.praticien_id === praticien.id)).toBe(true);
  });

  it('GET /api/admin/subscriptions/statistics requires AdminGuard and aggregates mrr/counts correctly', async () => {
    const { token: adminToken } = await seedAdmin(app, 'sub-admin-3@aura.io');
    await http().get('/api/admin/subscriptions/statistics').expect(401);

    const before = await http().get('/api/admin/subscriptions/statistics')
      .set('Authorization', `Bearer ${adminToken}`).expect(200);

    const proPraticien = (await seedPraticienUser(app, 'sub-praticien-11@aura.io')).praticien;
    await ds.getRepository(Subscription).save({
      praticien_id: proPraticien.id, plan: 'pro', statut: 'active',
      stripe_subscription_id: 'sub_stats_pro', stripe_customer_id: 'cus_stats_pro',
    });
    const pastDuePraticien = (await seedPraticienUser(app, 'sub-praticien-12@aura.io')).praticien;
    await ds.getRepository(Subscription).save({
      praticien_id: pastDuePraticien.id, plan: 'premium', statut: 'past_due',
      stripe_subscription_id: 'sub_stats_pastdue', stripe_customer_id: 'cus_stats_pastdue',
    });

    const after = await http().get('/api/admin/subscriptions/statistics')
      .set('Authorization', `Bearer ${adminToken}`).expect(200);

    // Deltas rather than absolute values — this describe block's earlier tests already
    // seeded other subscriptions, so only the *change* caused by this test is asserted.
    expect(after.body.data.general.mrr - before.body.data.general.mrr).toBe(29); // +1 active pro
    expect(after.body.data.general.active_count - before.body.data.general.active_count).toBe(1);
    expect(after.body.data.general.past_due_count - before.body.data.general.past_due_count).toBe(1);
    expect(typeof after.body.data.general.by_plan).toBe('object');
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm run test:e2e -- subscriptions.e2e-spec.ts` (in `server/`)
Expected: FAIL — `404 Not Found` for `GET /api/admin/subscriptions` (no such route yet).

- [ ] **Step 3: Add the admin service methods**

Modify `server/src/subscriptions/subscriptions.service.ts` — add `parsePagination`/`paginateQb` to the imports, `PLAN_PRICES` to the `plans` import, and two new methods after `cancel()` (full resulting file):

```typescript
import { Injectable, Logger, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subscription } from '../database/entities/subscription.entity';
import { Praticien } from '../database/entities/praticien.entity';
import { success } from '../common/envelope';
import { parsePagination, paginateQb } from '../common/pagination';
import { StripeService } from '../common/stripe.service';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { PLAN_PRICES, priceIdForPlan } from './plans';

const SUCCESS_URL = process.env.STRIPE_SUBSCRIPTION_SUCCESS_URL || 'aura://subscription?checkout=success';
const CANCEL_URL = process.env.STRIPE_SUBSCRIPTION_CANCEL_URL || 'aura://subscription?checkout=cancel';

const ACTIVE_STATUSES = ['active', 'trialing', 'past_due'];

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(
    @InjectRepository(Subscription) private readonly subscriptions: Repository<Subscription>,
    private readonly stripeService: StripeService,
  ) {}

  private notFound(message: string): never {
    throw new NotFoundException({ status: 'error', message });
  }

  private validationError(errors: Record<string, string[]>): never {
    throw new UnprocessableEntityException({ status: 'error', message: 'Erreur de validation', errors });
  }

  private async findOrCreateFor(praticien: Praticien): Promise<Subscription> {
    let sub = await this.subscriptions.findOneBy({ praticien_id: praticien.id });
    if (!sub) {
      sub = await this.subscriptions.save({ praticien_id: praticien.id, plan: 'essentiel', statut: 'active' });
    }
    return sub;
  }

  async current(praticien: Praticien) {
    return success(await this.findOrCreateFor(praticien));
  }

  async checkout(praticien: Praticien, dto: CreateCheckoutDto) {
    const sub = await this.findOrCreateFor(praticien);

    if (sub.plan === dto.plan && ACTIVE_STATUSES.includes(sub.statut)) {
      this.validationError({ plan: ['Vous êtes déjà abonné à cette formule.'] });
    }

    let customerId = sub.stripe_customer_id;
    if (!customerId) {
      const customer = await this.stripeService.createCustomer(praticien.email, {
        praticien_id: String(praticien.id),
      });
      customerId = customer.id;
      await this.subscriptions.update(sub.id, { stripe_customer_id: customerId });
    }

    if (sub.stripe_subscription_id && ACTIVE_STATUSES.includes(sub.statut)) {
      await this.stripeService.cancelSubscriptionImmediately(sub.stripe_subscription_id);
    }

    const session = await this.stripeService.createCheckoutSession({
      customerId,
      priceId: priceIdForPlan(dto.plan),
      successUrl: SUCCESS_URL,
      cancelUrl: CANCEL_URL,
      metadata: { praticien_id: String(praticien.id), plan: dto.plan },
    });
    return success({ url: session.url });
  }

  async cancel(praticien: Praticien) {
    const sub = await this.findOrCreateFor(praticien);
    if (!sub.stripe_subscription_id || !ACTIVE_STATUSES.includes(sub.statut)) {
      this.notFound('Aucun abonnement payant actif à résilier');
    }
    await this.stripeService.updateSubscriptionCancelAtPeriodEnd(sub.stripe_subscription_id);
    return success(
      await this.subscriptions.findOneBy({ id: sub.id }),
      'Résiliation programmée en fin de période',
    );
  }

  // ---- admin ----

  async adminIndex(query: Record<string, any>) {
    const { page, perPage } = parsePagination(query, 15);
    const qb = this.subscriptions.createQueryBuilder('s')
      .leftJoinAndSelect('s.praticien', 'praticien')
      .orderBy('s.created_at', 'DESC');
    if (query.statut !== undefined) qb.andWhere('s.statut = :st', { st: query.statut });
    if (query.plan !== undefined) qb.andWhere('s.plan = :pl', { pl: query.plan });
    const { data, pagination } = await paginateQb(qb, page, perPage);
    return success(data, undefined, { pagination });
  }

  async adminStatistics() {
    const rows = await this.subscriptions.createQueryBuilder('s')
      .select('s.plan', 'plan')
      .addSelect('s.statut', 'statut')
      .addSelect('COUNT(s.id)', 'count')
      .groupBy('s.plan')
      .addGroupBy('s.statut')
      .getRawMany();

    const byPlan: Record<string, number> = { essentiel: 0, pro: 0, premium: 0 };
    let active_count = 0;
    let trialing_count = 0;
    let past_due_count = 0;
    let canceled_count = 0;
    let mrr = 0;

    for (const r of rows) {
      const count = Number(r.count);
      byPlan[r.plan] = (byPlan[r.plan] ?? 0) + count;
      if (r.statut === 'active') {
        active_count += count;
        mrr += count * (PLAN_PRICES[r.plan as keyof typeof PLAN_PRICES] ?? 0);
      } else if (r.statut === 'trialing') {
        trialing_count += count;
      } else if (r.statut === 'past_due') {
        past_due_count += count;
      } else if (r.statut === 'canceled') {
        canceled_count += count;
      }
    }

    return success({
      general: {
        mrr,
        active_count,
        trialing_count,
        past_due_count,
        canceled_count,
        by_plan: Object.entries(byPlan).map(([plan, count]) => ({ plan, count })),
      },
    });
  }
}
```

- [ ] **Step 4: Add the admin controller routes**

Modify `server/src/subscriptions/subscriptions.controller.ts` (full resulting file):

```typescript
import { Body, Controller, Get, HttpCode, Post, Query, UseGuards } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PraticienGuard } from '../auth/guards/praticien.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { CurrentPraticien } from '../auth/decorators';
import { Praticien } from '../database/entities/praticien.entity';

@Controller()
export class SubscriptionsController {
  constructor(private readonly service: SubscriptionsService) {}

  // ---- praticien ----

  @UseGuards(JwtAuthGuard, PraticienGuard)
  @Get('praticien/subscription')
  current(@CurrentPraticien() praticien: Praticien) {
    return this.service.current(praticien);
  }

  @UseGuards(JwtAuthGuard, PraticienGuard)
  @HttpCode(200)
  @Post('praticien/subscription/checkout')
  checkout(@CurrentPraticien() praticien: Praticien, @Body() dto: CreateCheckoutDto) {
    return this.service.checkout(praticien, dto);
  }

  @UseGuards(JwtAuthGuard, PraticienGuard)
  @HttpCode(200)
  @Post('praticien/subscription/cancel')
  cancel(@CurrentPraticien() praticien: Praticien) {
    return this.service.cancel(praticien);
  }

  // ---- admin ----

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('admin/subscriptions')
  adminIndex(@Query() query: Record<string, any>) {
    return this.service.adminIndex(query);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('admin/subscriptions/statistics')
  adminStatistics() {
    return this.service.adminStatistics();
  }
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm run test:e2e -- subscriptions.e2e-spec.ts` (in `server/`)
Expected: PASS (13 tests).

- [ ] **Step 6: Run the full e2e suite to check for regressions**

Run: `npm run test:e2e` (in `server/`)
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add server/src/subscriptions/subscriptions.service.ts server/src/subscriptions/subscriptions.controller.ts server/test/subscriptions.e2e-spec.ts
git commit -m "feat(server): add admin subscriptions list and statistics endpoints"
```

---

## Task 7: Stripe webhook routing — `checkout.session.completed` / `customer.subscription.*` / `invoice.payment_failed`

This is the task where a Checkout Session actually turns into a confirmed `subscriptions` row — split into small steps since getting the event-shape details wrong (see this plan's Design notes on `Invoice.parent.subscription_details` and `SubscriptionItem.current_period_end`) would silently break status sync in production while looking fine in casual testing.

**Files:**
- Modify: `server/src/subscriptions/subscriptions.service.ts`
- Modify: `server/src/rendez-vous/rendez-vous.module.ts`, `server/src/rendez-vous/stripe-webhook.controller.ts`
- Test: `server/test/subscriptions.e2e-spec.ts` (modify)

**Context7 verification:** confirmed via `mcp__context7__query-docs` against `/stripe/stripe-node` (also cited in Task 4 and this plan's Design notes): `Session.subscription: string | Subscription | null` and `Session.metadata` are both real, top-level Checkout Session fields; `Subscription.status` is one of `'active'|'canceled'|'incomplete'|'incomplete_expired'|'past_due'|'paused'|'trialing'|'unpaid'` (`src/resources/Subscriptions.ts`); `SubscriptionItem.current_period_end: number` lives on each item, not on the top-level `Subscription`, "In API 2025-10-29.clover (stripe-node v22)" per that file's own comment — this codebase's pin (`2026-06-24.dahlia`) is newer still, so the same shape applies; `Invoice.parent.subscription_details.subscription: string | Subscription` is the real (relocated) path to an invoice's subscription id (`src/resources/Invoices.ts`), replacing the older top-level `Invoice.subscription` field this codebase's pinned API version no longer has.

- [ ] **Step 1: Write the failing e2e tests**

Add a second `describe` block to `server/test/subscriptions.e2e-spec.ts`, after the closing `});` of the first one. This one needs `RendezVousModule` (where `StripeWebhookController` lives), which after this task's Step 3 transitively pulls in `SubscriptionsModule` too. Add the import to the file's existing top-of-file import block (alongside `SubscriptionsModule`, `Subscription`, `StripeService`) — not mid-file:

```typescript
import { RendezVousModule } from '../src/rendez-vous/rendez-vous.module';
```

Then append the new `describe` block:

```typescript
describe('subscriptions (Stripe webhook routing)', () => {
  let app: INestApplication;
  let ds: DataSource;

  const webhookStripeMock = {
    createPaymentIntent: jest.fn().mockResolvedValue({ id: 'pi_test_999', client_secret: 'pi_test_999_secret' }),
    constructWebhookEvent: jest.fn(),
    createCustomer: jest.fn(),
    createCheckoutSession: jest.fn(),
    updateSubscriptionCancelAtPeriodEnd: jest.fn(),
    cancelSubscriptionImmediately: jest.fn(),
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

  it('checkout.session.completed links the new Stripe subscription/customer and activates the plan', async () => {
    const { praticien } = await seedPraticienUser(app, 'wh-sub-praticien-1@aura.io');
    await ds.getRepository(Subscription).save({ praticien_id: praticien.id, plan: 'essentiel', statut: 'active' });

    const fakeEvent = {
      id: 'evt_checkout_1', type: 'checkout.session.completed',
      data: { object: {
        mode: 'subscription',
        subscription: 'sub_new_123',
        customer: 'cus_new_123',
        metadata: { praticien_id: String(praticien.id), plan: 'pro' },
      } },
    };
    webhookStripeMock.constructWebhookEvent.mockImplementationOnce(() => fakeEvent);
    await http().post('/api/webhooks/stripe').set('stripe-signature', 'sig').send(fakeEvent).expect(200);

    const fresh = await ds.getRepository(Subscription).findOneByOrFail({ praticien_id: praticien.id });
    expect(fresh).toMatchObject({
      plan: 'pro', statut: 'active',
      stripe_subscription_id: 'sub_new_123', stripe_customer_id: 'cus_new_123',
    });
  });

  it('checkout.session.completed in "payment" mode (not this plan\'s concern) is a safe no-op', async () => {
    const fakeEvent = {
      id: 'evt_checkout_payment_mode', type: 'checkout.session.completed',
      data: { object: { mode: 'payment', subscription: null, customer: 'cus_x', metadata: {} } },
    };
    webhookStripeMock.constructWebhookEvent.mockImplementationOnce(() => fakeEvent);
    await http().post('/api/webhooks/stripe').set('stripe-signature', 'sig').send(fakeEvent).expect(200);
    // No assertion beyond "did not throw" — this event shape is never produced by this
    // plan's own Checkout Session creation (always mode: 'subscription'); the guard exists
    // defensively in case the shared webhook endpoint ever receives a payment-mode session
    // from elsewhere in this codebase.
  });

  it('customer.subscription.updated syncs statut and current_period_end from the subscription item', async () => {
    const { praticien } = await seedPraticienUser(app, 'wh-sub-praticien-2@aura.io');
    await ds.getRepository(Subscription).save({
      praticien_id: praticien.id, plan: 'pro', statut: 'active', stripe_subscription_id: 'sub_update_1',
    });
    const periodEndSeconds = Math.floor(new Date('2026-09-01T00:00:00.000Z').getTime() / 1000);
    const fakeEvent = {
      id: 'evt_sub_updated_1', type: 'customer.subscription.updated',
      data: { object: {
        id: 'sub_update_1', status: 'past_due',
        items: { data: [{ current_period_end: periodEndSeconds }] },
      } },
    };
    webhookStripeMock.constructWebhookEvent.mockImplementationOnce(() => fakeEvent);
    await http().post('/api/webhooks/stripe').set('stripe-signature', 'sig').send(fakeEvent).expect(200);

    const fresh = await ds.getRepository(Subscription).findOneByOrFail({ praticien_id: praticien.id });
    expect(fresh.statut).toBe('past_due');
    expect(new Date(fresh.current_period_end as unknown as string).toISOString()).toBe('2026-09-01T00:00:00.000Z');
  });

  it('customer.subscription.updated maps unpaid/incomplete/paused to past_due and incomplete_expired to canceled', async () => {
    const { praticien: p1 } = await seedPraticienUser(app, 'wh-sub-praticien-3@aura.io');
    await ds.getRepository(Subscription).save({
      praticien_id: p1.id, plan: 'pro', statut: 'active', stripe_subscription_id: 'sub_map_unpaid',
    });
    const unpaidEvent = {
      id: 'evt_map_1', type: 'customer.subscription.updated',
      data: { object: { id: 'sub_map_unpaid', status: 'unpaid', items: { data: [] } } },
    };
    webhookStripeMock.constructWebhookEvent.mockImplementationOnce(() => unpaidEvent);
    await http().post('/api/webhooks/stripe').set('stripe-signature', 'sig').send(unpaidEvent).expect(200);
    expect((await ds.getRepository(Subscription).findOneByOrFail({ praticien_id: p1.id })).statut).toBe('past_due');

    const { praticien: p2 } = await seedPraticienUser(app, 'wh-sub-praticien-4@aura.io');
    await ds.getRepository(Subscription).save({
      praticien_id: p2.id, plan: 'premium', statut: 'active', stripe_subscription_id: 'sub_map_expired',
    });
    const expiredEvent = {
      id: 'evt_map_2', type: 'customer.subscription.updated',
      data: { object: { id: 'sub_map_expired', status: 'incomplete_expired', items: { data: [] } } },
    };
    webhookStripeMock.constructWebhookEvent.mockImplementationOnce(() => expiredEvent);
    await http().post('/api/webhooks/stripe').set('stripe-signature', 'sig').send(expiredEvent).expect(200);
    expect((await ds.getRepository(Subscription).findOneByOrFail({ praticien_id: p2.id })).statut).toBe('canceled');
  });

  it('customer.subscription.deleted sets statut canceled and leaves plan untouched', async () => {
    const { praticien } = await seedPraticienUser(app, 'wh-sub-praticien-5@aura.io');
    await ds.getRepository(Subscription).save({
      praticien_id: praticien.id, plan: 'premium', statut: 'active', stripe_subscription_id: 'sub_deleted_1',
    });
    const fakeEvent = {
      id: 'evt_sub_deleted_1', type: 'customer.subscription.deleted',
      data: { object: { id: 'sub_deleted_1', status: 'canceled' } },
    };
    webhookStripeMock.constructWebhookEvent.mockImplementationOnce(() => fakeEvent);
    await http().post('/api/webhooks/stripe').set('stripe-signature', 'sig').send(fakeEvent).expect(200);

    const fresh = await ds.getRepository(Subscription).findOneByOrFail({ praticien_id: praticien.id });
    expect(fresh.statut).toBe('canceled');
    expect(fresh.plan).toBe('premium'); // last paid tier kept for admin history — see Design notes
  });

  it('invoice.payment_failed reads the subscription id from invoice.parent.subscription_details and sets past_due', async () => {
    const { praticien } = await seedPraticienUser(app, 'wh-sub-praticien-6@aura.io');
    await ds.getRepository(Subscription).save({
      praticien_id: praticien.id, plan: 'pro', statut: 'active', stripe_subscription_id: 'sub_invoice_failed_1',
    });
    const fakeEvent = {
      id: 'evt_invoice_failed_1', type: 'invoice.payment_failed',
      data: { object: { parent: { subscription_details: { subscription: 'sub_invoice_failed_1' } } } },
    };
    webhookStripeMock.constructWebhookEvent.mockImplementationOnce(() => fakeEvent);
    await http().post('/api/webhooks/stripe').set('stripe-signature', 'sig').send(fakeEvent).expect(200);

    const fresh = await ds.getRepository(Subscription).findOneByOrFail({ praticien_id: praticien.id });
    expect(fresh.statut).toBe('past_due');
  });

  it('subscription webhook events for an unknown stripe_subscription_id are a safe no-op 200', async () => {
    const fakeEvent = {
      id: 'evt_unknown_1', type: 'customer.subscription.updated',
      data: { object: { id: 'sub_does_not_exist', status: 'active', items: { data: [] } } },
    };
    webhookStripeMock.constructWebhookEvent.mockImplementationOnce(() => fakeEvent);
    await http().post('/api/webhooks/stripe').set('stripe-signature', 'sig').send(fakeEvent).expect(200);
  });

  it('payment_intent.* events still route to RendezVousService, unaffected by this task', async () => {
    // Regression proof for Plan 05's original routing, exercised again here since this
    // describe block shares the same StripeWebhookController the payment_intent.* tests in
    // rendez-vous.e2e-spec.ts also cover — this assertion is intentionally shallow (just
    // "did not 404 and did not get routed into subscriptions logic"); the full behavior is
    // already covered by Plan 05's own suite.
    const fakeEvent = {
      id: 'evt_pi_untouched', type: 'payment_intent.succeeded',
      data: { object: { id: 'pi_untouched', metadata: {} } },
    };
    webhookStripeMock.constructWebhookEvent.mockImplementationOnce(() => fakeEvent);
    await http().post('/api/webhooks/stripe').set('stripe-signature', 'sig').send(fakeEvent).expect(200);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm run test:e2e -- subscriptions.e2e-spec.ts` (in `server/`)
Expected: FAIL — none of the webhook-driven rows update (`StripeWebhookController` doesn't route any subscription event type yet, so `RendezVousService.handleStripeWebhookEvent` silently ignores them and returns `ok` with 200, but the row-state assertions fail).

- [ ] **Step 3: Import `SubscriptionsModule` into `RendezVousModule`**

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
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([RendezVous, Paiement, Praticien]),
    PromotionsModule,
    SubscriptionsModule,
  ],
  controllers: [RendezVousController, StripeWebhookController],
  providers: [RendezVousService, StripeService],
})
export class RendezVousModule {}
```

(Plan 08f's own document also modifies this same file, to additionally import `StripeConnectModule` — whoever executes 08f after this plan must add that import/array-entry alongside `SubscriptionsModule`, not in place of it.)

- [ ] **Step 4: Route subscription event types in `StripeWebhookController`**

Modify `server/src/rendez-vous/stripe-webhook.controller.ts` (full resulting file):

```typescript
import { BadRequestException, Controller, Headers, HttpCode, Post, Req } from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import Stripe from 'stripe';
import { RendezVousService } from './rendez-vous.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { StripeService } from '../common/stripe.service';

// Event types this plan's SubscriptionsService owns — everything else (Plan 05's
// payment_intent.* events, and Plan 08f's future account.updated branch) keeps routing to
// RendezVousService exactly as it did before this plan's change.
const SUBSCRIPTION_EVENT_TYPES = new Set([
  'checkout.session.completed',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.payment_failed',
]);

@Controller('webhooks/stripe')
export class StripeWebhookController {
  constructor(
    private readonly rendezVousService: RendezVousService,
    private readonly subscriptionsService: SubscriptionsService,
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
    if (SUBSCRIPTION_EVENT_TYPES.has(event.type)) {
      return this.subscriptionsService.handleStripeWebhookEvent(event);
    }
    return this.rendezVousService.handleStripeWebhookEvent(event);
  }
}
```

(Plan 08f's own document also modifies this same file to add an `account.updated` branch, based on Plan 05's original version — see this plan's Design notes. Whoever executes 08f after this plan must add that `if` branch and the `StripeConnectService` constructor parameter alongside what this task adds, not overwrite this file with 08f's own "full resulting file" snapshot.)

- [ ] **Step 5: Add webhook handling to `SubscriptionsService`**

Modify `server/src/subscriptions/subscriptions.service.ts` — add the `Stripe` import and four new private methods plus the public dispatcher, at the end of the class (full resulting file):

```typescript
import { Injectable, Logger, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Stripe from 'stripe';
import { Subscription } from '../database/entities/subscription.entity';
import { Praticien } from '../database/entities/praticien.entity';
import { success } from '../common/envelope';
import { parsePagination, paginateQb } from '../common/pagination';
import { StripeService } from '../common/stripe.service';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { PLAN_PRICES, priceIdForPlan } from './plans';

const SUCCESS_URL = process.env.STRIPE_SUBSCRIPTION_SUCCESS_URL || 'aura://subscription?checkout=success';
const CANCEL_URL = process.env.STRIPE_SUBSCRIPTION_CANCEL_URL || 'aura://subscription?checkout=cancel';

const ACTIVE_STATUSES = ['active', 'trialing', 'past_due'];

type Statut = 'active' | 'past_due' | 'canceled' | 'trialing';

function mapStripeStatus(status: Stripe.Subscription.Status): Statut {
  switch (status) {
    case 'active':
      return 'active';
    case 'trialing':
      return 'trialing';
    case 'past_due':
    case 'unpaid':
    case 'incomplete':
      return 'past_due';
    case 'canceled':
    case 'incomplete_expired':
      return 'canceled';
    case 'paused':
      // Not a terminal state — the praticien may resume without re-subscribing. Folded into
      // past_due (the closest "needs attention, not yet over" state in this plan's coarser
      // 4-value enum) rather than canceled — see this plan's Design notes.
      return 'past_due';
    default:
      return 'past_due';
  }
}

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(
    @InjectRepository(Subscription) private readonly subscriptions: Repository<Subscription>,
    private readonly stripeService: StripeService,
  ) {}

  private notFound(message: string): never {
    throw new NotFoundException({ status: 'error', message });
  }

  private validationError(errors: Record<string, string[]>): never {
    throw new UnprocessableEntityException({ status: 'error', message: 'Erreur de validation', errors });
  }

  private async findOrCreateFor(praticien: Praticien): Promise<Subscription> {
    let sub = await this.subscriptions.findOneBy({ praticien_id: praticien.id });
    if (!sub) {
      sub = await this.subscriptions.save({ praticien_id: praticien.id, plan: 'essentiel', statut: 'active' });
    }
    return sub;
  }

  // ---- praticien ----

  async current(praticien: Praticien) {
    return success(await this.findOrCreateFor(praticien));
  }

  async checkout(praticien: Praticien, dto: CreateCheckoutDto) {
    const sub = await this.findOrCreateFor(praticien);

    if (sub.plan === dto.plan && ACTIVE_STATUSES.includes(sub.statut)) {
      this.validationError({ plan: ['Vous êtes déjà abonné à cette formule.'] });
    }

    let customerId = sub.stripe_customer_id;
    if (!customerId) {
      const customer = await this.stripeService.createCustomer(praticien.email, {
        praticien_id: String(praticien.id),
      });
      customerId = customer.id;
      await this.subscriptions.update(sub.id, { stripe_customer_id: customerId });
    }

    if (sub.stripe_subscription_id && ACTIVE_STATUSES.includes(sub.statut)) {
      await this.stripeService.cancelSubscriptionImmediately(sub.stripe_subscription_id);
    }

    const session = await this.stripeService.createCheckoutSession({
      customerId,
      priceId: priceIdForPlan(dto.plan),
      successUrl: SUCCESS_URL,
      cancelUrl: CANCEL_URL,
      metadata: { praticien_id: String(praticien.id), plan: dto.plan },
    });
    return success({ url: session.url });
  }

  async cancel(praticien: Praticien) {
    const sub = await this.findOrCreateFor(praticien);
    if (!sub.stripe_subscription_id || !ACTIVE_STATUSES.includes(sub.statut)) {
      this.notFound('Aucun abonnement payant actif à résilier');
    }
    await this.stripeService.updateSubscriptionCancelAtPeriodEnd(sub.stripe_subscription_id);
    return success(
      await this.subscriptions.findOneBy({ id: sub.id }),
      'Résiliation programmée en fin de période',
    );
  }

  // ---- admin ----

  async adminIndex(query: Record<string, any>) {
    const { page, perPage } = parsePagination(query, 15);
    const qb = this.subscriptions.createQueryBuilder('s')
      .leftJoinAndSelect('s.praticien', 'praticien')
      .orderBy('s.created_at', 'DESC');
    if (query.statut !== undefined) qb.andWhere('s.statut = :st', { st: query.statut });
    if (query.plan !== undefined) qb.andWhere('s.plan = :pl', { pl: query.plan });
    const { data, pagination } = await paginateQb(qb, page, perPage);
    return success(data, undefined, { pagination });
  }

  async adminStatistics() {
    const rows = await this.subscriptions.createQueryBuilder('s')
      .select('s.plan', 'plan')
      .addSelect('s.statut', 'statut')
      .addSelect('COUNT(s.id)', 'count')
      .groupBy('s.plan')
      .addGroupBy('s.statut')
      .getRawMany();

    const byPlan: Record<string, number> = { essentiel: 0, pro: 0, premium: 0 };
    let active_count = 0;
    let trialing_count = 0;
    let past_due_count = 0;
    let canceled_count = 0;
    let mrr = 0;

    for (const r of rows) {
      const count = Number(r.count);
      byPlan[r.plan] = (byPlan[r.plan] ?? 0) + count;
      if (r.statut === 'active') {
        active_count += count;
        mrr += count * (PLAN_PRICES[r.plan as keyof typeof PLAN_PRICES] ?? 0);
      } else if (r.statut === 'trialing') {
        trialing_count += count;
      } else if (r.statut === 'past_due') {
        past_due_count += count;
      } else if (r.statut === 'canceled') {
        canceled_count += count;
      }
    }

    return success({
      general: {
        mrr,
        active_count,
        trialing_count,
        past_due_count,
        canceled_count,
        by_plan: Object.entries(byPlan).map(([plan, count]) => ({ plan, count })),
      },
    });
  }

  // ---- Stripe webhook ----

  async handleStripeWebhookEvent(event: Stripe.Event) {
    switch (event.type) {
      case 'checkout.session.completed':
        await this.onCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case 'customer.subscription.updated':
        await this.onSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
      case 'customer.subscription.deleted':
        await this.onSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      case 'invoice.payment_failed':
        await this.onInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;
    }
    return success(undefined, 'ok');
  }

  private async onCheckoutCompleted(session: Stripe.Checkout.Session) {
    if (session.mode !== 'subscription') return;
    const praticienId = Number(session.metadata?.praticien_id);
    const plan = session.metadata?.plan;
    if (!praticienId || (plan !== 'pro' && plan !== 'premium')) return;

    const subscriptionId = typeof session.subscription === 'string'
      ? session.subscription
      : session.subscription?.id;
    if (!subscriptionId) return;
    const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id;

    const sub = await this.subscriptions.findOneBy({ praticien_id: praticienId });
    if (!sub) return; // checkout() always runs findOrCreateFor() first, so this should exist

    await this.subscriptions.update(sub.id, {
      plan,
      statut: 'active',
      stripe_subscription_id: subscriptionId,
      ...(customerId ? { stripe_customer_id: customerId } : {}),
    });
  }

  private async onSubscriptionUpdated(subscription: Stripe.Subscription) {
    const sub = await this.subscriptions.findOneBy({ stripe_subscription_id: subscription.id });
    if (!sub) return;
    const periodEndSeconds = subscription.items?.data?.[0]?.current_period_end;
    await this.subscriptions.update(sub.id, {
      statut: mapStripeStatus(subscription.status),
      ...(periodEndSeconds ? { current_period_end: new Date(periodEndSeconds * 1000) } : {}),
    });
  }

  private async onSubscriptionDeleted(subscription: Stripe.Subscription) {
    const sub = await this.subscriptions.findOneBy({ stripe_subscription_id: subscription.id });
    if (!sub) return;
    // `plan` is left as-is (the last paid tier they were on) — see this plan's Design notes.
    // Both frontends derive *effective* access from statut, not plan alone.
    await this.subscriptions.update(sub.id, { statut: 'canceled' });
  }

  private async onInvoicePaymentFailed(invoice: Stripe.Invoice) {
    // Invoice.subscription was replaced by invoice.parent.subscription_details.subscription
    // in the API version this codebase is pinned to — see this task's Context7 verification.
    const raw = invoice.parent?.subscription_details?.subscription;
    const subscriptionId = typeof raw === 'string' ? raw : raw?.id;
    if (!subscriptionId) return;
    const sub = await this.subscriptions.findOneBy({ stripe_subscription_id: subscriptionId });
    if (!sub) return;
    await this.subscriptions.update(sub.id, { statut: 'past_due' });
  }
}
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npm run test:e2e -- subscriptions.e2e-spec.ts` (in `server/`)
Expected: PASS (21 tests total across both `describe` blocks — 13 from the first, 8 from the second).

- [ ] **Step 7: Run the full e2e suite to check for regressions**

Run: `npm run test:e2e` (in `server/`)
Expected: PASS — in particular `rendez-vous.e2e-spec.ts`'s own webhook tests (Plan 05's Task 6) are unaffected, since `payment_intent.*` events still route the same way they always did.

Run (in `server/`): `npm test`
Expected: PASS — full unit suite, including this plan's `commission.spec.ts`, unaffected.

- [ ] **Step 8: Commit**

```bash
git add server/src/subscriptions/subscriptions.service.ts server/src/rendez-vous/rendez-vous.module.ts server/src/rendez-vous/stripe-webhook.controller.ts server/test/subscriptions.e2e-spec.ts
git commit -m "feat(server): route Stripe subscription webhook events to SubscriptionsService"
```

---

## Task 8: Web — `admin/abonnements` wired to real list + statistics

**Files:**
- Modify: `web/app/admin/abonnements/page.jsx`

**Context:** the current file (read in full during this plan's research) renders a static `subscriptions` mock array imported from `web/lib/data/admin.js`, computing `mrr`/`active.length` client-side by reducing over that array. This task replaces both the data source and the derived-stats computation, following the exact pattern already established by `web/app/admin/paiements/page.jsx` (a separate `useQuery` for `/paiements/statistics`, not a client-side reduce) rather than `web/app/admin/signalements/page.jsx`'s client-computed-stats pattern — this plan's backend exposes a dedicated `/admin/subscriptions/statistics` endpoint precisely so the stat cards reflect the *whole* table, not just whatever page of rows the list query happens to return.

- [ ] **Step 1: Rewrite the page**

Modify `web/app/admin/abonnements/page.jsx` (full resulting file):

```jsx
'use client';
import { useQuery } from '@tanstack/react-query';
import { PageHead } from '@/components/ui/PageHead';
import { StatCard } from '@/components/ui/StatCard';
import { DataTable } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { ModalButton } from '@/components/ui/ModalButton';
import { api } from '@/lib/api';
import { euro, dateFr, tone } from '@/lib/format';

const PLAN_LABEL = { essentiel: 'Essentiel', pro: 'Pro', premium: 'Premium' };
const STATUT_LABEL = { active: 'actif', past_due: 'impayé', canceled: 'résilié', trialing: 'essai' };

export default function AdminAbonnementsPage() {
  const { data } = useQuery({
    queryKey: ['admin', 'subscriptions'],
    queryFn: () => api.get('/admin/subscriptions?per_page=100'),
  });
  // Real, table-wide aggregates (not affected by the 100-row page cap) — same reasoning as
  // admin/paiements/page.jsx: the stat cards hit a dedicated endpoint instead of reducing
  // over the (possibly truncated) list below.
  const { data: statsData } = useQuery({
    queryKey: ['admin', 'subscriptions', 'statistics'],
    queryFn: () => api.get('/admin/subscriptions/statistics'),
  });
  const stats = statsData?.data?.general;

  const subscriptions = (data?.data ?? []).map((s) => ({
    ...s,
    praticien_nom: s.praticien ? `${s.praticien.firstname} ${s.praticien.lastname}` : '',
  }));

  const columns = [
    {
      key: 'praticien_nom', label: 'Praticien', sortable: true,
      render: (r) => (
        <div className="row gap-2">
          <Avatar name={r.praticien_nom || '—'} size={28} tone="violet" />
          {r.praticien_nom || '—'}
        </div>
      ),
    },
    { key: 'plan', label: 'Formule', sortable: true, render: (r) => <Badge variant={r.plan === 'premium' ? 'featured' : r.plan === 'pro' ? 'info' : 'neutral'}>{PLAN_LABEL[r.plan] ?? r.plan}</Badge> },
    { key: 'created_at', label: 'Depuis', sortable: true, render: (r) => <span className="small">{dateFr(r.created_at)}</span> },
    { key: 'current_period_end', label: 'Renouvellement', render: (r) => <span className="small">{r.current_period_end ? dateFr(r.current_period_end) : '—'}</span> },
    { key: 'statut', label: 'Statut', render: (r) => <Badge variant={tone(r.statut)}>{STATUT_LABEL[r.statut] ?? r.statut}</Badge> },
  ];

  return (
    <>
      <PageHead
        title="Abonnements"
        subtitle="Formules praticien et revenus récurrents."
        crumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Abonnements' }]}
        actions={<ModalButton modal="exportData" className="btn btn-soft btn-sm"><Icon name="download" size={15} /> Exporter</ModalButton>}
      />

      <div className="grid grid-3" style={{ marginBottom: 24 }}>
        <StatCard label="MRR" value={euro(stats?.mrr)} icon="euro" />
        <StatCard label="Abonnés actifs" value={String(stats?.active_count ?? 0)} icon="users" />
        <StatCard label="Revenu annuel projeté" value={euro((stats?.mrr ?? 0) * 12)} icon="chart" />
      </div>

      <DataTable
        columns={columns}
        rows={subscriptions}
        searchKeys={['praticien_nom']}
        filters={[{ key: 'statut', label: 'Statut', options: [
          { value: 'active', label: 'Actif' },
          { value: 'trialing', label: 'Essai' },
          { value: 'past_due', label: 'Impayé' },
          { value: 'canceled', label: 'Résilié' },
        ] }]}
        searchPlaceholder="Rechercher un abonné…"
        pageSize={10}
        toolbar={<ModalButton modal="exportData" className="btn btn-soft btn-sm"><Icon name="download" size={15} /> Export</ModalButton>}
      />
    </>
  );
}
```

This drops the `subscriptions` import from `web/lib/data/admin.js` entirely (the mock array itself is left in that file, unused — consistent with how sibling Plan 08 sub-plans leave other now-unused mock arrays in `web/lib/data/admin.js` in place rather than editing a file shared by many pages just to delete one array; deleting it is not required for this task's exit criteria).

- [ ] **Step 2: Verify the page builds**

Run (in `web/`): `npm run build`
Expected: succeeds — no broken JSX, no dead-import lint failures for anything this task actually removed.

- [ ] **Step 3: Run the full web test suite to check for regressions**

Run (in `web/`): `npm test`
Expected: PASS — no existing test touches this page (confirmed: no `abonnements` test file exists in `web/`), so this is a pure regression check on everything else.

- [ ] **Step 4: Commit**

```bash
git add web/app/admin/abonnements/page.jsx
git commit -m "feat(web): wire admin abonnements page to real subscriptions list and statistics"
```

---

## Task 9: Web — `admin/parametres/facturation`'s commission field wired to the real config

**Files:**
- Modify: `web/app/admin/parametres/facturation/page.jsx`

**Context:** the current file (read in full during this plan's research) is entirely decorative — every field is an uncontrolled `<input defaultValue="...">`, and the "Enregistrer" button is a `ToastButton` that fires a fixed success message on click regardless of what's actually in the fields, with no backend call anywhere. Per this plan's locked scope (P8-3), only the "Taux de commission (%)" field becomes real; every other field on this page (versement frequency, minimum threshold, retraction delay, VAT, company details, the four toggle "Options") stays exactly as it is today — genuinely decorative, out of scope for this plan, not silently faked as more real than it is.

- [ ] **Step 1: Rewrite the page**

Modify `web/app/admin/parametres/facturation/page.jsx` (full resulting file):

```jsx
'use client';
import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { PageHead } from '@/components/ui/PageHead';
import { Icon } from '@/components/ui/Icon';
import { ToastButton } from '@/components/ui/ToastButton';
import { api, errorMessage } from '@/lib/api';
import { useToast } from '@/lib/store';

const OPTIONS = [
  { label: 'Facturation automatique', desc: 'Émettre une facture à chaque séance confirmée.', on: true },
  { label: 'TVA appliquée', desc: 'Inclure la TVA sur les commissions de plateforme.', on: true },
  { label: 'Versements automatiques', desc: 'Reverser les praticiens sans validation manuelle.', on: true },
  { label: 'Retenue en cas de litige', desc: 'Geler le versement tant qu’un litige est ouvert.', on: true },
];

export default function BillingSettingsPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: ['admin', 'settings', 'commission'],
    queryFn: () => api.get('/admin/settings/commission'),
  });
  // Backend stores/returns a decimal fraction (0.15); this field displays/edits a
  // percentage (15) — the only conversion boundary, kept entirely in this component.
  const [ratePercent, setRatePercent] = useState('15');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (typeof data?.data?.commission_rate === 'number') {
      setRatePercent(String(Math.round(data.data.commission_rate * 1000) / 10));
    }
  }, [data]);

  const saveCommission = async () => {
    setSaving(true);
    setError('');
    try {
      await api.put('/admin/settings/commission', { commission_rate: Number(ratePercent) / 100 });
      await queryClient.invalidateQueries({ queryKey: ['admin', 'settings', 'commission'] });
      toast('Taux de commission mis à jour', 'success');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHead
        title="Facturation"
        subtitle="Commission, versements et fiscalité."
        crumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Réglages', href: '/admin/parametres' }, { label: 'Facturation' }]}
      />

      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
        <div className="card card-pad">
          <h3 className="h-3" style={{ marginBottom: 18 }}>Commission & versements</h3>
          <div className="stack gap-4">
            <div className="field">
              <label>Taux de commission (%)</label>
              <input
                className="input"
                type="number"
                min="0"
                max="100"
                value={ratePercent}
                onChange={(e) => setRatePercent(e.target.value)}
              />
              {error && <div className="tiny" style={{ color: 'var(--danger)', marginTop: 4 }}>{error}</div>}
              <div className="tiny" style={{ marginTop: 4 }}>
                Utilisé par Stripe Connect pour calculer la part reversée aux praticiens sur chaque séance payée.
              </div>
            </div>
            <div className="field">
              <label>Fréquence des versements</label>
              <select className="input" defaultValue="hebdo">
                <option value="quotidien">Quotidien</option>
                <option value="hebdo">Hebdomadaire (lundi)</option>
                <option value="mensuel">Mensuel (1er du mois)</option>
              </select>
            </div>
            <div className="field">
              <label>Seuil minimum de versement (€)</label>
              <input className="input" type="number" defaultValue="50" />
            </div>
            <div className="field">
              <label>Délai de rétractation client (jours)</label>
              <input className="input" type="number" defaultValue="14" />
            </div>
          </div>
        </div>

        <div className="card card-pad">
          <h3 className="h-3" style={{ marginBottom: 18 }}>Fiscalité & facturation</h3>
          <div className="stack gap-4">
            <div className="field">
              <label>Taux de TVA (%)</label>
              <input className="input" type="number" defaultValue="20" />
            </div>
            <div className="field">
              <label>Numéro de TVA intracommunautaire</label>
              <input className="input" defaultValue="FR 42 902 145 678" />
            </div>
            <div className="field">
              <label>Raison sociale</label>
              <input className="input" defaultValue="Aura SAS" />
            </div>
            <div className="field">
              <label>Adresse de facturation</label>
              <textarea className="input" rows={3} defaultValue={"12 rue des Lilas\n74000 Annecy, France"} />
            </div>
          </div>
        </div>
      </div>

      <div className="card card-pad" style={{ marginBottom: 24 }}>
        <h3 className="h-3" style={{ marginBottom: 18 }}>Options</h3>
        <div className="stack gap-4">
          {OPTIONS.map((o) => (
            <div key={o.label}>
              <div className="row between" style={{ alignItems: 'flex-start' }}>
                <div className="flex-1" style={{ paddingRight: 12 }}>
                  <div style={{ fontWeight: 500, fontSize: 14 }}>{o.label}</div>
                  <div className="tiny">{o.desc}</div>
                </div>
                <span className={`switch${o.on ? ' on' : ''}`} role="switch" aria-checked={o.on}><span className="knob" /></span>
              </div>
              <div className="divider" />
            </div>
          ))}
        </div>
      </div>

      <div className="row" style={{ justifyContent: 'flex-end', gap: 10 }}>
        <ToastButton
          message="Autres réglages de facturation enregistrés"
          tone="success"
          className="btn btn-soft"
          title="Les autres champs de cette page (TVA, versements, options) restent décoratifs — hors périmètre de ce plan"
        >
          Enregistrer les autres champs
        </ToastButton>
        <button type="button" className="btn btn-primary" onClick={saveCommission} disabled={saving}>
          <Icon name="check" size={16} /> {saving ? 'Enregistrement…' : 'Enregistrer la commission'}
        </button>
      </div>
    </>
  );
}
```

This splits the page's single save action into two: a real button for the one field this plan makes real, and the pre-existing `ToastButton` (unchanged behavior) for everything else — so the UI never implies a save succeeded for fields that still don't persist anywhere.

- [ ] **Step 2: Verify the page builds**

Run (in `web/`): `npm run build`
Expected: succeeds.

- [ ] **Step 3: Run the full web test suite to check for regressions**

Run (in `web/`): `npm test`
Expected: PASS — no existing test touches this page.

- [ ] **Step 4: Commit**

```bash
git add web/app/admin/parametres/facturation/page.jsx
git commit -m "feat(web): wire admin facturation commission field to the real config"
```

---

## Task 10: Mobile — types, `PLANS`, `effectivePlan()`, `subscriptionRepo`

**Files:**
- Modify: `mobile/src/data/types.ts`, `mobile/src/data/repos/index.ts`
- Create: `mobile/src/data/plans.ts`, `mobile/src/utils/subscriptionPlan.ts`, `mobile/src/utils/subscriptionPlan.test.ts`, `mobile/src/data/repos/subscription.test.ts`

- [ ] **Step 1: Add the `Subscription` types**

Modify `mobile/src/data/types.ts` — append at the end of the file:

```typescript

export type SubscriptionPlan = 'essentiel' | 'pro' | 'premium';
export type SubscriptionStatut = 'active' | 'past_due' | 'canceled' | 'trialing';

export interface Subscription {
  id: number;
  praticien_id: number;
  plan: SubscriptionPlan;
  statut: SubscriptionStatut;
  stripe_subscription_id: string | null;
  stripe_customer_id: string | null;
  current_period_end: string | null;
  created_at: string;
  updated_at: string;
}
```

- [ ] **Step 2: Write `plans.ts`**

Create `mobile/src/data/plans.ts`:

```typescript
export interface PlanDef {
  id: 'essentiel' | 'pro' | 'premium';
  name: string;
  price: number;
  period: string;
  tagline: string;
  features: string[];
  cta: string;
  highlight: boolean;
}

// Mirrors web/lib/data/content.js's `plans` array exactly — canonical 3-tier copy (P8-3).
// Kept as a hand-written mirror since this codebase has no shared package between web/ and
// mobile/ — confirmed by this plan's own research (no shared workspace/lib directory).
export const PLANS: PlanDef[] = [
  {
    id: 'essentiel', name: 'Essentiel', price: 0, period: 'gratuit', tagline: 'Pour démarrer',
    features: ['Profil public vérifié', "Jusqu'à 5 séances / mois", 'Messagerie sécurisée', 'Paiement protégé'],
    cta: 'Rester en Essentiel', highlight: false,
  },
  {
    id: 'pro', name: 'Pro', price: 29, period: '/ mois', tagline: 'Le choix des praticiens établis',
    features: ['Tout Essentiel', 'Séances illimitées', 'Mise en avant dans la recherche', 'Statistiques détaillées', "Gestion d'événements", 'Troc de soins'],
    cta: 'Choisir Pro', highlight: true,
  },
  {
    id: 'premium', name: 'Premium', price: 59, period: '/ mois', tagline: 'Pour rayonner',
    features: ['Tout Pro', 'Badge « À la une »', 'Page praticien personnalisée', 'Support prioritaire', 'Accompagnement dédié', 'Outils retraites & cercles'],
    cta: 'Choisir Premium', highlight: false,
  },
];
```

- [ ] **Step 3: Write the failing test for `effectivePlan`**

Create `mobile/src/utils/subscriptionPlan.test.ts`:

```typescript
import { effectivePlan } from './subscriptionPlan';

describe('effectivePlan', () => {
  it('returns the stored plan when the subscription is active', () => {
    expect(effectivePlan({ plan: 'pro', statut: 'active' })).toBe('pro');
  });

  it('returns the stored plan when trialing', () => {
    expect(effectivePlan({ plan: 'premium', statut: 'trialing' })).toBe('premium');
  });

  it('returns the stored plan when past_due — access continues while Stripe retries billing', () => {
    expect(effectivePlan({ plan: 'pro', statut: 'past_due' })).toBe('pro');
  });

  it('returns essentiel when canceled, even though the stored plan is still the last paid tier', () => {
    expect(effectivePlan({ plan: 'premium', statut: 'canceled' })).toBe('essentiel');
  });
});
```

- [ ] **Step 4: Run the test to verify it fails**

Run (in `mobile/`): `npm test -- subscriptionPlan`
Expected: FAIL — `Cannot find module './subscriptionPlan'`.

- [ ] **Step 5: Implement `effectivePlan`**

Create `mobile/src/utils/subscriptionPlan.ts`:

```typescript
import type { SubscriptionPlan, SubscriptionStatut } from '../data/types';

export interface SubscriptionLike {
  plan: SubscriptionPlan;
  statut: SubscriptionStatut;
}

/**
 * The plan a praticien actually has access to right now. A 'canceled' subscription has
 * lost paid-tier access even though `plan` on the server still records the last paid tier
 * they were on (kept there for admin history — see
 * server/src/subscriptions/subscriptions.service.ts's onSubscriptionDeleted). 'past_due'
 * still grants access — Stripe keeps billing/retrying before a hard cancellation.
 */
export function effectivePlan(sub: SubscriptionLike): SubscriptionPlan {
  return sub.statut === 'canceled' ? 'essentiel' : sub.plan;
}
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npm test -- subscriptionPlan`
Expected: PASS (4 tests).

- [ ] **Step 7: Write the failing test for `subscriptionRepo`**

Create `mobile/src/data/repos/subscription.test.ts`, mirroring `rendezVous.test.ts`'s structure exactly:

```typescript
import { subscriptionRepo } from './index';
import { setAuthToken } from '../api/client';

function mockFetch(status: number, body?: unknown) {
  return jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    text: async () => (body === undefined ? '' : JSON.stringify(body)),
  });
}

describe('subscriptionRepo', () => {
  beforeEach(() => setAuthToken('test-token'));

  it('current fetches /praticien/subscription and unwraps the data', async () => {
    (global as any).fetch = mockFetch(200, {
      status: 'success', data: { id: 1, plan: 'essentiel', statut: 'active' },
    });
    const res = await subscriptionRepo.current();
    expect(res.plan).toBe('essentiel');
    const [url] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toContain('/praticien/subscription');
  });

  it('checkout posts { plan } to /praticien/subscription/checkout and unwraps the url', async () => {
    (global as any).fetch = mockFetch(200, {
      status: 'success', data: { url: 'https://checkout.stripe.com/test_abc' },
    });
    const res = await subscriptionRepo.checkout('pro');
    expect(res.url).toBe('https://checkout.stripe.com/test_abc');
    const [url, opts] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toContain('/praticien/subscription/checkout');
    expect(opts.method).toBe('POST');
    expect(JSON.parse(opts.body)).toEqual({ plan: 'pro' });
  });

  it('cancel posts to /praticien/subscription/cancel and unwraps the updated subscription', async () => {
    (global as any).fetch = mockFetch(200, {
      status: 'success', data: { id: 1, plan: 'pro', statut: 'active' },
    });
    const res = await subscriptionRepo.cancel();
    expect(res.statut).toBe('active');
    const [url, opts] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toContain('/praticien/subscription/cancel');
    expect(opts.method).toBe('POST');
  });
});
```

- [ ] **Step 8: Run the test to verify it fails**

Run: `npm test -- subscription.test.ts` (in `mobile/`)
Expected: FAIL — `subscriptionRepo` is not exported from `./index`.

- [ ] **Step 9: Add `subscriptionRepo`**

Modify `mobile/src/data/repos/index.ts` — add `Subscription` to the existing `import type { ... } from '../types';` block, and append the new repo at the end of the file:

```typescript
import type {
  Practitioner,
  Discipline,
  Event,
  Exchange,
  Conversation,
  ChatMessage,
  RendezVous,
  Subscription,
} from '../types';
```

(This shows only the fields relevant to this task — keep every other type already imported by this file in Plans 05/07/09 as-is; add `Subscription` to whatever the actual current import list is rather than replacing it wholesale.)

```typescript
// ---------- Subscriptions (praticien billing) — real backend ----------
export const subscriptionRepo = {
  current: (): Promise<Subscription> =>
    api.get<{ status: string; data: Subscription }>('/praticien/subscription').then((res) => res.data),

  checkout: (plan: 'pro' | 'premium'): Promise<{ url: string }> =>
    api
      .post<{ status: string; data: { url: string } }>('/praticien/subscription/checkout', { plan })
      .then((res) => res.data),

  cancel: (): Promise<Subscription> =>
    api.post<{ status: string; data: Subscription }>('/praticien/subscription/cancel').then((res) => res.data),
};
```

- [ ] **Step 10: Run the test to verify it passes**

Run: `npm test -- subscription.test.ts` (in `mobile/`)
Expected: PASS (3 tests).

- [ ] **Step 11: Verify types compile and the full mobile test suite is green**

Run (in `mobile/`): `npm run typecheck && npm test`
Expected: PASS, including `subscriptionPlan.test.ts` (4 tests) and `subscription.test.ts` (3 tests).

- [ ] **Step 12: Commit**

```bash
git add mobile/src/data/types.ts mobile/src/data/plans.ts mobile/src/utils/subscriptionPlan.ts mobile/src/utils/subscriptionPlan.test.ts mobile/src/data/repos/index.ts mobile/src/data/repos/subscription.test.ts
git commit -m "feat(mobile): add subscription types, plan copy, effectivePlan, and subscriptionRepo"
```

---

## Task 11: Mobile — real 3-tier `subscription.tsx` with a real Checkout redirect

**Files:**
- Modify: `mobile/package.json`, `mobile/app/subscription.tsx`

**Research — how to open a Stripe Checkout Session URL from Expo/React Native:** `@stripe/stripe-react-native` (already installed since Plan 05) covers PaymentIntents via the Payment Sheet, not Stripe-hosted Checkout Sessions — a URL has to be opened in a browser instead. A web search (`"Expo React Native open Stripe Checkout Session hosted URL best practice"`) surfaced the community-standard pattern: use `expo-web-browser`'s `WebBrowser.openAuthSessionAsync(url, redirectUrl)` for this exact "open a hosted page, get redirected back into the app" flow — it is purpose-built for it (used for OAuth flows for the same reason) and, unlike plain `Linking.openURL`, returns a promise that resolves once the browser session ends (either via the deep-link redirect firing, or the user manually closing it), so the screen can immediately refetch subscription status instead of waiting on the user to navigate back manually. This is confirmed via `mcp__context7__query-docs` against `/expo/expo`, straight from the SDK's own source (`packages/expo-web-browser/src/WebBrowser.ts`): `openAuthSessionAsync(url: string, redirectUrl?: string | null, options?): Promise<WebBrowserAuthSessionResult>`, resolving `{type: 'success'|'cancel'|'dismiss', url?: string}`. This is a deliberate difference from Plan 08f's Connect-onboarding CTA (`Linking.openURL`, fire-and-forget) — see this plan's Design notes for why the two flows warrant different APIs, not an inconsistency.

- [ ] **Step 1: Install `expo-web-browser`**

Run (in `mobile/`): `npx expo install expo-web-browser`

- [ ] **Step 2: Verify types compile with the new dependency present**

Run (in `mobile/`): `npm run typecheck`
Expected: PASS (no behavior changed yet — this only proves the install itself is clean).

- [ ] **Step 3: Rewrite `subscription.tsx`**

Modify `mobile/app/subscription.tsx` (full resulting file):

```tsx
import React from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as WebBrowser from 'expo-web-browser';
import { AuroraBackground } from '@components/AuroraBackground';
import { Button } from '@components/Button';
import { Icon } from '@components/Icon';
import { Lotus } from '@components/Lotus';
import { colors } from '@theme/colors';
import { typography } from '@theme/typography';
import { shadows } from '@theme/shadows';
import { subscriptionRepo } from '@data/repos';
import { errorMessage } from '@data/api/client';
import { PLANS, type PlanDef } from '@data/plans';
import { effectivePlan } from '@utils/subscriptionPlan';
import type { Subscription, SubscriptionPlan } from '@data/types';

const RETURN_URL = 'aura://subscription';

export default function Subscription() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { data: sub, isLoading } = useQuery({
    queryKey: ['subscription'],
    queryFn: subscriptionRepo.current,
  });
  const [busyPlan, setBusyPlan] = React.useState<string | null>(null);

  const refetch = () => queryClient.invalidateQueries({ queryKey: ['subscription'] });

  const choose = async (plan: 'pro' | 'premium') => {
    setBusyPlan(plan);
    try {
      const { url } = await subscriptionRepo.checkout(plan);
      await WebBrowser.openAuthSessionAsync(url, RETURN_URL);
      await refetch();
    } catch (err) {
      Alert.alert('Impossible de démarrer le paiement', errorMessage(err));
    } finally {
      setBusyPlan(null);
    }
  };

  const cancel = async () => {
    setBusyPlan('cancel');
    try {
      const updated = await subscriptionRepo.cancel();
      queryClient.setQueryData(['subscription'], updated);
      Alert.alert(
        'Résiliation programmée',
        updated.current_period_end
          ? `Votre abonnement reste actif jusqu'au ${new Date(updated.current_period_end).toLocaleDateString('fr-FR')}, puis passera automatiquement en formule Essentiel.`
          : "Votre abonnement passera en formule Essentiel à la fin de la période en cours.",
      );
    } catch (err) {
      Alert.alert('Impossible de résilier', errorMessage(err));
    } finally {
      setBusyPlan(null);
    }
  };

  const current: SubscriptionPlan = sub ? effectivePlan(sub) : 'essentiel';

  return (
    <View style={{ flex: 1, backgroundColor: colors.pearl }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.backWrap, { top: insets.top + 8 }]}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Icon name="back" size={20} color={colors.ink} />
          </Pressable>
        </View>

        <AuroraBackground variant="soft" style={[styles.hero, { paddingTop: insets.top + 60 }]}>
          <Lotus size={64} color="#fff" />
          <Text style={styles.heroTitle}>
            Faire entendre{'\n'}
            votre <Text style={styles.italic}>pratique.</Text>
          </Text>
          <Text style={styles.heroSub}>
            Une visibilité juste, des outils simples, et une communauté qui vous reconnaît.
          </Text>
        </AuroraBackground>

        {isLoading || !sub ? (
          <Text style={styles.loading}>Chargement de votre abonnement…</Text>
        ) : (
          <View style={styles.cards}>
            {PLANS.map((p) => (
              <PlanCard
                key={p.id}
                plan={p}
                isCurrent={current === p.id}
                busy={busyPlan === p.id || (p.id !== 'essentiel' && current === p.id && busyPlan === 'cancel')}
                statut={sub.statut}
                onChoose={() => choose(p.id as 'pro' | 'premium')}
                onCancel={cancel}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function PlanCard({
  plan,
  isCurrent,
  busy,
  statut,
  onChoose,
  onCancel,
}: {
  plan: PlanDef;
  isCurrent: boolean;
  busy: boolean;
  statut: Subscription['statut'];
  onChoose: () => void;
  onCancel: () => void;
}) {
  const showCancel = isCurrent && plan.id !== 'essentiel' && statut !== 'canceled';
  const showChoose = !isCurrent && plan.id !== 'essentiel';

  return (
    <View style={[styles.card, shadows.cardHover, isCurrent && styles.cardCurrent]}>
      {isCurrent ? (
        <View style={[styles.offerPill, styles.currentPill]}>
          <Text style={styles.offerPillTxt}>VOTRE FORMULE</Text>
        </View>
      ) : plan.highlight ? (
        <View style={styles.offerPill}>
          <Text style={styles.offerPillTxt}>LE PLUS CHOISI</Text>
        </View>
      ) : null}

      <View style={styles.priceBlock}>
        <Text style={styles.planName}>{plan.name}</Text>
        <Text style={styles.price}>
          {plan.price === 0 ? 'Gratuit' : `${plan.price}€`}
          {plan.price > 0 ? <Text style={styles.italic}> {plan.period}</Text> : null}
        </Text>
        <Text style={styles.tagline}>{plan.tagline}</Text>
        {isCurrent && statut === 'past_due' ? (
          <Text style={styles.pastDueNotice}>Paiement en échec — vérifiez votre moyen de paiement</Text>
        ) : null}
      </View>

      {plan.features.map((f) => (
        <View key={f} style={styles.featRow}>
          <View style={styles.featIc}>
            <Icon name="check" size={14} color={colors.chipSageText} />
          </View>
          <Text style={styles.featTxt}>{f}</Text>
        </View>
      ))}

      {showCancel ? (
        <Pressable onPress={onCancel} disabled={busy} style={styles.cancelBtn}>
          <Text style={styles.cancelBtnTxt}>{busy ? 'Résiliation…' : 'Résilier cette formule →'}</Text>
        </Pressable>
      ) : showChoose ? (
        <Button
          variant="aurora"
          label={busy ? 'Ouverture…' : plan.cta}
          onPress={onChoose}
          disabled={busy}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  backWrap: { position: 'absolute', left: 16, zIndex: 10 },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.whiteAlpha85,
    alignItems: 'center',
    justifyContent: 'center',
  },

  hero: {
    paddingHorizontal: 24,
    paddingBottom: 60,
    alignItems: 'center',
  },
  heroTitle: {
    color: '#fff',
    fontFamily: 'CormorantGaramond_300Light',
    fontSize: 34,
    textAlign: 'center',
    marginTop: 14,
    marginBottom: 8,
    lineHeight: 36,
  },
  italic: { fontFamily: 'CormorantGaramond_400Regular_Italic' },
  heroSub: {
    color: '#fff',
    fontSize: 14,
    opacity: 0.9,
    textAlign: 'center',
    maxWidth: 280,
  },

  loading: { ...typography.small, textAlign: 'center', marginTop: 24 },
  cards: { paddingHorizontal: 16, marginTop: -30, gap: 20 },

  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
  },
  cardCurrent: {
    borderWidth: 2,
    borderColor: colors.gold,
  },
  offerPill: {
    alignSelf: 'center',
    backgroundColor: colors.chipSage,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    marginBottom: 12,
  },
  currentPill: { backgroundColor: colors.gold },
  offerPillTxt: {
    color: colors.chipSageText,
    fontSize: 11,
    fontFamily: 'Outfit_500Medium',
    letterSpacing: 1.6,
  },
  priceBlock: { alignItems: 'center', paddingVertical: 10 },
  planName: {
    fontFamily: 'CormorantGaramond_500Medium',
    fontSize: 20,
    color: colors.ink,
    marginBottom: 4,
  },
  price: {
    fontFamily: 'CormorantGaramond_400Regular',
    fontSize: 38,
    lineHeight: 42,
    color: colors.ink,
    textAlign: 'center',
  },
  tagline: { ...typography.small, fontSize: 13, marginTop: 6, textAlign: 'center' },
  pastDueNotice: {
    ...typography.small,
    fontSize: 12,
    color: colors.danger,
    marginTop: 8,
    textAlign: 'center',
  },

  featRow: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  featIc: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.chipSage,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featTxt: { flex: 1, ...typography.small, fontSize: 13.5, lineHeight: 20, color: colors.inkSoft },

  cancelBtn: { marginTop: 16, alignSelf: 'center' },
  cancelBtnTxt: { color: colors.muted, fontFamily: 'Outfit_500Medium', fontSize: 13 },
});
```

This drops the old flat-rate "1 MOIS OFFERT" / "0€ pendant 30 jours puis 9,90€/mois" pricing card, the fixed 7-item generic feature list, and the fake testimonial block entirely — all three were part of the mock flat-rate model this task replaces, not content this plan's locked scope asks to keep. `colors.danger` and `colors.gold` are pre-existing theme tokens (already used elsewhere in this file's own original version, and in `dashboard.tsx`'s `pauseIc`/`trialSub` styles respectively) — no new theme tokens introduced.

- [ ] **Step 4: Verify types compile**

Run (in `mobile/`): `npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Run the full mobile test suite**

Run (in `mobile/`): `npm test`
Expected: PASS — this task has no component-render test harness (mirrors Plan 05/08f's own screens — no RN screen in this codebase is unit-rendered), so verification here is `typecheck` plus the untouched existing suite staying green.

- [ ] **Step 6: Commit**

```bash
git add mobile/package.json mobile/package-lock.json mobile/app/subscription.tsx
git commit -m "feat(mobile): rework subscription screen to real 3-tier plans with Stripe Checkout"
```

---

## Task 12: Mobile — `dashboard.tsx`'s trial box → real "Mon abonnement" box

**Files:**
- Modify: `mobile/app/dashboard.tsx`

**Why this is a targeted edit, not a full-file rewrite:** Plan 08f's own document also modifies this file (adding a "Paiements" section between the `activeRow` and `pauseBox` views, plus its own new imports) based on the pre-Plan-08e version of this file. This task only touches the top trial box and the imports/hooks it needs — structurally disjoint from where 08f inserts its section — so the two edits compose cleanly as long as whoever executes 08f afterward *merges* import blocks (both this task and 08f add a `useQuery` import from `@tanstack/react-query` — keep one, not two) rather than pasting 08f's "full resulting file" over this task's result. Flagged here per this plan's Design notes.

- [ ] **Step 1: Replace the import block and the two `useSession` hooks it feeds**

In `mobile/app/dashboard.tsx`, replace the current top of the file:

```tsx
import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuroraBackground } from '@components/AuroraBackground';
import { Button } from '@components/Button';
import { Icon } from '@components/Icon';
import { ScreenHeader } from '@components/ScreenHeader';
import { Toggle } from '@components/Toggle';
import { colors } from '@theme/colors';
import { typography } from '@theme/typography';
import { useSession } from '@store/session';

export default function Dashboard() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const active = useSession((s) => s.practitionerActive);
  const toggle = useSession((s) => s.togglePractitionerActive);
  const trialDays = useSession((s) => s.trialDaysLeft);
```

with:

```tsx
import React from 'react';
import {
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
import { subscriptionRepo } from '@data/repos';
import { effectivePlan } from '@utils/subscriptionPlan';
import type { Subscription } from '@data/types';

const PLAN_LABEL: Record<'essentiel' | 'pro' | 'premium', string> = {
  essentiel: 'Essentiel',
  pro: 'Pro',
  premium: 'Premium',
};

function subscriptionSubtitle(sub?: Subscription): string {
  if (!sub) return 'Chargement…';
  const plan = effectivePlan(sub);
  if (plan === 'essentiel') return "Formule gratuite · jusqu'à 5 séances/mois";
  const price = plan === 'pro' ? '29€/mois' : '59€/mois';
  if (sub.statut === 'past_due') return `${price} · paiement en échec, vérifiez votre moyen de paiement`;
  return `${price} · annulable à tout moment`;
}

export default function Dashboard() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const active = useSession((s) => s.practitionerActive);
  const toggle = useSession((s) => s.togglePractitionerActive);
  const { data: subscription } = useQuery({
    queryKey: ['subscription'],
    queryFn: subscriptionRepo.current,
  });
```

`trialDays`/`s.trialDaysLeft` is no longer read here — confirmed via a repo-wide search (`grep -rn "trialDaysLeft" mobile`) that `dashboard.tsx` was its only consumer besides the `session.ts` field declaration itself; the store field is left in place (removing a zustand field is a larger, unrelated change than this task's scope, and no other screen references it either way).

- [ ] **Step 2: Replace the trial box JSX**

In the same file, replace:

```tsx
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
```

with:

```tsx
        <View style={{ paddingHorizontal: 20, paddingBottom: 16 }}>
          <AuroraBackground variant="soft" rounded={22} style={styles.trial}>
            <Text style={styles.trialEyebrow}>MON ABONNEMENT</Text>
            <Text style={styles.trialTitle}>
              {PLAN_LABEL[subscription ? effectivePlan(subscription) : 'essentiel']}
            </Text>
            <Text style={styles.trialSub}>{subscriptionSubtitle(subscription)}</Text>
            <Pressable
              onPress={() => router.push('/subscription' as any)}
              style={styles.trialBtn}
            >
              <Text style={styles.trialBtnTxt}>Gérer mon abonnement →</Text>
            </Pressable>
          </AuroraBackground>
        </View>
```

No style changes are needed — `styles.trial`/`trialEyebrow`/`trialTitle`/`trialSub`/`trialBtn`/`trialBtnTxt` all stay exactly as they were; only the text content and its data source changed.

- [ ] **Step 3: Verify types compile**

Run (in `mobile/`): `npm run typecheck`
Expected: PASS.

- [ ] **Step 4: Run the full mobile test suite**

Run (in `mobile/`): `npm test`
Expected: PASS — no existing test renders `dashboard.tsx` (no RN screen in this codebase is unit-rendered, per Plan 05/08f precedent); this is a pure regression check plus the typecheck above.

- [ ] **Step 5: Commit**

```bash
git add mobile/app/dashboard.tsx
git commit -m "feat(mobile): show real subscription plan/status on the praticien dashboard"
```

---

## Task 13: Full cross-codebase verification

**Files:** none (verification only — no commit).

- [ ] **Step 1: Backend full check**

Run (in `server/`): `npm test`
Expected: PASS — includes the new `commission.spec.ts` (3 tests, Task 3) alongside the pre-existing unit spec files (`app.controller`, `all-exceptions.filter`, `common`, `pagination`, `storage`, `transformers`, `stripe.service.spec.ts`), none of which this plan otherwise modified.

Run (in `server/`): `npm run test:e2e`
Expected: PASS — every pre-existing e2e suite unaffected, in particular `rendez-vous.e2e-spec.ts` (Plan 05's `payment_intent.*` webhook routing untouched) and any praticien-auth/verification suites (unaffected by the `AuthModule`/`Praticien`-entity changes, which are additive), plus the new `platform-settings.e2e-spec.ts` (5 tests, Task 3) and `subscriptions.e2e-spec.ts` (21 tests across two `describe` blocks, Tasks 5–7).

- [ ] **Step 2: Web full check**

Run (in `web/`): `npm test`
Expected: PASS — no test in this plan's scope touches web's unit-testable `lib/*.js` modules, so this is a pure regression check.

Run (in `web/`): `npm run build`
Expected: succeeds — `admin/abonnements` and `admin/parametres/facturation` both compile with their new `useQuery`/`api` real-data wiring, no dead-import lint failures.

- [ ] **Step 3: Mobile full check**

Run (in `mobile/`): `npm test`
Expected: PASS — includes the new `subscriptionPlan.test.ts` (4 tests) and `subscription.test.ts` (3 tests, both Task 10), alongside every pre-existing suite, untouched.

Run (in `mobile/`): `npm run typecheck`
Expected: PASS, no errors — in particular confirms `subscription.tsx`'s and `dashboard.tsx`'s new `useQuery`/`subscriptionRepo`/`effectivePlan` usage type-checks against the `Subscription`/`SubscriptionPlan`/`SubscriptionStatut` types defined in Task 10, and that `expo-web-browser`'s own type definitions for `openAuthSessionAsync` line up with how Task 11 calls it.

- [ ] **Step 4: Manual smoke check (documented, not automated — this plan's automated tests never touch real Stripe, per the Prerequisites section; no component-rendering test harness exists on web per Plan 01's scope, and RN screens aren't unit-rendered in this codebase either)**

With real Stripe test-mode keys and the two Price ids wired per the Prerequisites section, `stripe listen --events payment_intent.succeeded,payment_intent.payment_failed,checkout.session.completed,customer.subscription.updated,customer.subscription.deleted,invoice.payment_failed --forward-to localhost:8000/api/webhooks/stripe` running, `server/` running on `:8000`, and a real Plan-03/08a-registered praticien logged in:

1. `admin/parametres/facturation` → change "Taux de commission (%)" to a new value → save → reload the page → the new value persists (proves the real `GET/PUT /admin/settings/commission` round-trip, not just an optimistic UI update).
2. Mobile: `dashboard.tsx` shows "Mon abonnement — Essentiel — Formule gratuite · jusqu'à 5 séances/mois" for a fresh praticien (proves `GET /praticien/subscription`'s lazy-create path) → tap "Gérer mon abonnement" → `subscription.tsx` shows all 3 tiers with Essentiel marked "VOTRE FORMULE" → tap "Choisir Pro" → the device browser opens a real Stripe Checkout page for the 29€/mois Price → pay with Stripe's `4242 4242 4242 4242` test card → the browser redirects back into the app → within a few seconds (webhook delivery), `subscription.tsx` refetches and shows Pro as "VOTRE FORMULE" (proves the full `checkout.session.completed` webhook path) → `dashboard.tsx`'s "Mon abonnement" box now reads "Pro — 29€/mois · annulable à tout moment".
3. On the same Pro subscription: tap "Résilier cette formule" → confirm the alert shows the real `current_period_end` date → `subscription.tsx` still shows Pro as current immediately after (statut stays `active`, not `canceled` — proves the cancel action does *not* prematurely flip state) → in the Stripe test-mode dashboard, manually advance/simulate the billing period ending (or use `stripe trigger customer.subscription.deleted`) → confirm the `stripe listen` terminal shows the event delivered and returned 200 → `subscription.tsx` (after a refetch) now shows Essentiel as current, and `admin/abonnements`'s row for this praticien shows `plan: Pro, statut: résilié` (proving `plan` intentionally stays as the historical last-paid-tier — see Design notes).
4. `admin/abonnements` → the MRR stat card and the table both reflect the real subscription created in step 2 (and its cancellation in step 3) — not the old static mock numbers.
5. Webhook idempotency/ordering: resending the same `checkout.session.completed` event (`stripe events resend <id>`) does not create a second `subscriptions` row or duplicate any Stripe object — `onCheckoutCompleted` only ever `update()`s the single row already created by `checkout()`'s own `findOrCreateFor()`, never inserts.

This step has no pass/fail command output to paste — it's a checklist the executing engineer ticks off by hand before considering the plan done, exactly like Plan 05's and Plan 08f's own closing tasks.

---

## Self-review checklist (run before handing off)

- [ ] `server/`: `npm test` green, including the new `commission.spec.ts` (3 tests, Task 3). `npm run test:e2e` green, including `platform-settings.e2e-spec.ts` (5 tests, Task 3) and `subscriptions.e2e-spec.ts` (21 tests across two `describe` blocks, Tasks 5–7).
- [ ] `web/`: `npm test` green. `npm run build` succeeds.
- [ ] `mobile/`: `npm test` green, including `subscriptionPlan.test.ts` (4 tests) and `subscription.test.ts` (3 tests, both Task 10). `npm run typecheck` clean.
- [ ] Every task's Stripe SDK usage (backend `stripe`, `expo-web-browser` on mobile) carries a "Context7 verification" / "Research" paragraph naming the exact library/id queried and what was confirmed — none of it was guessed from training data, including the two genuinely non-obvious, easy-to-guess-wrong details (`SubscriptionItem.current_period_end` vs. a top-level `Subscription.current_period_end`; `Invoice.parent.subscription_details.subscription` vs. a top-level `Invoice.subscription`).
- [ ] The webhook (Task 7) is the only code path that ever sets `statut: 'canceled'` on a subscription that was genuinely paid — `SubscriptionsService.cancel()` (Task 5) never does, by design (see Design notes).
- [ ] No commit message in this document carries a "Co-Authored-By" trailer or any other AI-attribution line (all 13 tasks' commits are single-line, plain `feat(...)` subjects).
- [ ] The old flat-rate mock content (mobile's "1 MOIS OFFERT" pricing card, "0€ pendant 30 jours puis 9,90€/mois", the fake testimonial, `dashboard.tsx`'s stale "PÉRIODE D'ESSAI"/"9,90 €/mois" copy) is actually gone from the rewritten files — not just described as removed.
- [ ] `commission.ts`'s `getCommissionRate()` keeps the exact name/signature/return-unit (`(): number`, decimal fraction) that Plan 08f's placeholder already documents as its swap-in point.

## Self-review

**1. Spec coverage** — walked every requirement in the P8 design spec's 08e sketch (and the P8-3 locked-decisions row) against the tasks above:

- Schema (`subscriptions`: `id, praticien_id FK unique, plan, statut, stripe_subscription_id, stripe_customer_id, current_period_end, created_at, updated_at`): Task 2, entity + migration match the locked column list exactly.
- Manual prerequisite (2 Stripe Products/Prices for Pro/Premium, Essentiel free, mirroring Plan 05's "supply your own keys" framing): stated in its own Prerequisites section, first, before any task.
- Real commission-rate config, satisfying Plan 08f's `getCommissionRate()` placeholder in the same unit (decimal fraction) at the same swap-in point (same file, same function name/signature): Tasks 2–3 (`PlatformSetting` entity + `commission.ts` + `PlatformSettingsModule`).
- Stripe Checkout Session for signup/upgrade: Task 4 (`StripeService.createCheckoutSession`) + Task 5 (`SubscriptionsService.checkout()`).
- Webhook handler for `customer.subscription.*`/`invoice.payment_failed`, extending the existing `/api/webhooks/stripe` controller with new event-type routing, not a new endpoint: Task 7 — plus `checkout.session.completed`, which the locked spec's sketch doesn't name explicitly but which this plan's Design notes justify as the only real way to link a newly-created Stripe subscription back to the right praticien row (Checkout Sessions, not raw `subscriptions.create()`, are what `checkout()` actually calls).
- `GET/POST /praticien/subscription`, `POST /praticien/subscription/cancel`: Task 5 (`GET /praticien/subscription` as `current`; `POST .../checkout` as the signup/upgrade action — the locked spec's own sketch text says "`GET/POST /praticien/subscription`" but the endpoint list further down names `POST /praticien/subscription/checkout` explicitly, which this plan follows verbatim, treating the sketch's shorthand `GET/POST` as referring to `current` + `checkout` together, not a second `POST /praticien/subscription` route).
- `GET /admin/subscriptions`, `GET /admin/subscriptions/statistics`: Task 6.
- Mobile `subscription.tsx` reworked to real 3-tier + real Checkout redirect: Task 11, with the redirect mechanism researched (not guessed) in Task 11's own "Research" note.
- Web `admin/abonnements` wired to real list+stats: Task 8.
- `admin/parametres/facturation`'s commission-rate field wired to the real config: Task 9.
- Context7 verification for every Stripe SDK surface touched, not guessed: `stripe.checkout.sessions.create`, `stripe.customers.create`, `stripe.subscriptions.update`/`.cancel`, `Session.subscription`, `Subscription.status`/`SubscriptionItem.current_period_end`, `Invoice.parent.subscription_details.subscription` (Task 4's and Task 7's own Context7 verification notes) — plus `expo-web-browser`'s `openAuthSessionAsync` (Task 11's Research note, web search + context7 cross-checked).
- Full cross-cutting regression pass covering all three codebases plus a manual smoke checklist: Task 13.
- Hard project rule — no AI-attribution commit trailer: verified by reading every commit message in this document; none found across all 13 tasks.
- This closing structure itself (Self-review + Exit criteria): this section and the one below.

**2. Placeholder scan** — grepped the entire finished document for `TBD`, `TODO`, `FIXME`, "add appropriate", "similar to Task N", "rest of the file", "remains unchanged", "write the rest", and bare trailing ellipses. None found as a genuine placeholder. Every step that touches code shows the complete resulting file or the complete new function/test, never a description of one — including Task 12's targeted before/after snippets, which show the exact full text on both sides of the edit rather than an abbreviated diff. The only "TECH DEBT"-style language anywhere in this document is in `commission.ts`'s own doc comment (Task 3), which documents *this plan's own, already-complete* design decision (cache-warmed-from-DB, not a live read) — not an unwritten piece of scope.

**3. Type/signature consistency** — cross-checked names and shapes across every task that touches them:

- `getCommissionRate(): number` / `setCommissionRate(rate: number): void` / `DEFAULT_COMMISSION_RATE` (Task 3) are called with exactly these names by `PlatformSettingsService` (Task 3) and by `commission.spec.ts`'s own tests — the same names Plan 08f's placeholder already documents as the swap-in point, confirmed identical.
- `SubscriptionsService.current(praticien)` / `.checkout(praticien, dto)` / `.cancel(praticien)` / `.adminIndex(query)` / `.adminStatistics()` / `.handleStripeWebhookEvent(event)` (Tasks 5–7) are called with exactly these names and argument shapes from `SubscriptionsController` (Tasks 5–6) and `StripeWebhookController` (Task 7) — no call site invents a method these tasks didn't define.
- `Subscription` entity fields (Task 2: `id, praticien_id, plan, statut, stripe_subscription_id, stripe_customer_id, current_period_end, created_at, updated_at, praticien?`) are used verbatim — no camelCase remapping layer — in every service method (Tasks 5–7), the web admin page (Task 8, `s.praticien`/`s.plan`/`s.current_period_end`), and the mobile `Subscription` type (Task 10, field-for-field identical names), matching this codebase's established "real field names verbatim" convention already documented in `mobile/src/data/types.ts`'s own comments for other entities.
- `StripeService.createCustomer(email, metadata)` / `.createCheckoutSession({customerId, priceId, successUrl, cancelUrl, metadata})` / `.updateSubscriptionCancelAtPeriodEnd(id)` / `.cancelSubscriptionImmediately(id)` (Task 4) are called with exactly these names and argument shapes in `SubscriptionsService` (Task 5), and the e2e mocks (`stripeServiceMock`/`webhookStripeMock`, Tasks 5–7) implement exactly this surface — no test asserts a call shape the real service doesn't produce, or vice versa.
- `subscriptionRepo.current()` / `.checkout(plan)` / `.cancel()` (Task 10) are called with exactly these names in `subscription.tsx` (Task 11) and `dashboard.tsx` (Task 12) — `subscription.tsx`'s `queryFn: subscriptionRepo.current`, `await subscriptionRepo.checkout(plan)`, `await subscriptionRepo.cancel()`; `dashboard.tsx`'s `queryFn: subscriptionRepo.current`. No renamed method at any call site.
- `effectivePlan({plan, statut})` (Task 10) is called with exactly this one-argument object shape at every call site — `subscription.tsx`'s `effectivePlan(sub)`, `dashboard.tsx`'s `effectivePlan(subscription)` — and its return type (`SubscriptionPlan`) is what both screens index `PLANS`/`PLAN_LABEL` with.
- `PLANS`/`PlanDef` (Task 10, mobile) and `plans` (pre-existing, `web/lib/data/content.js`) carry the same `id`/`name`/`price`/`period`/`tagline`/`features`/`cta`/`highlight` shape and the same three tiers' copy verbatim — confirmed by direct comparison during Task 10's own writing, not assumed.
- The webhook routing set in Task 7 (`SUBSCRIPTION_EVENT_TYPES`) is exhaustively consistent with every event type this plan's own e2e tests fire (`checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`) and with Plan 05's original two (`payment_intent.succeeded`, `payment_intent.payment_failed`), which Task 7's own regression test (`'payment_intent.* events still route to RendezVousService, unaffected by this task'`) explicitly re-confirms still fall through correctly.

---

## Exit criteria

A praticien can, for real, see and manage their subscription from either platform: `GET /praticien/subscription` lazily materializes an Essentiel/active row on first touch; choosing Pro or Premium opens a real Stripe-hosted Checkout Session (mobile via `expo-web-browser`) for a real, operator-created Price; once Stripe confirms payment, the `checkout.session.completed` webhook — never the `checkout()` call itself — flips the local row to the paid plan; canceling schedules an end-of-period cancellation (never an immediate one, matching this platform's own existing billing FAQ copy) and the local row only ever flips to `'canceled'` once Stripe's `customer.subscription.deleted` webhook confirms it really ended. `admin/abonnements` shows the real list and real MRR/active-count statistics instead of a static mock; `admin/parametres/facturation`'s commission field reads and writes a real, persisted, admin-editable rate. That rate is exposed through `server/src/common/commission.ts`'s `getCommissionRate()` — the exact function name, signature, and decimal-fraction unit Plan 08f's own placeholder already documents as its swap-in point — genuinely satisfying what that sibling plan is waiting for, with no further code change required on 08f's side beyond what its own document already describes doing once this plan lands.

`GET/POST/PUT` across `/praticien/subscription*` and `/admin/subscriptions*`/`/admin/settings/commission` are all live and guarded (`PraticienGuard`/`AdminGuard` respectively), covered end to end by e2e tests with `StripeService` mocked; `server/`, `web/`, and `mobile/` are all green (`npm test` + `npm run test:e2e`; `npm test` + `npm run build`; `npm test` + `npm run typecheck`, respectively). Real end-to-end exercise (an actual Checkout payment, a real subscription webhook delivery) additionally requires the two Stripe test-mode Prices and, for mobile's deep-link return, a development build — neither is available in this sandbox, which is why Task 13's Step 4 is a documented manual checklist rather than an automated one, exactly like Plan 05's and Plan 08f's own closing tasks.

Per the Plan 08 design spec's sequencing (`08a → 08b → 08c → 08d → 08e → 08f → 08g`), this plan unblocks 08f (Stripe Connect), which depends on this plan's commission-rate config to compute `application_fee_amount` on booking PaymentIntents. 08g (analytics) is the final plan in the sequence and can compose real data from this plan's now-real MRR/subscriber counts once it runs.
