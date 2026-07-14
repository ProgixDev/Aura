# Aura Plan 05 — Bookings + Stripe Payments Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give both frontends' existing booking-flow UI something real to call: a lightweight `rendez_vous` (booking) module on the backend, real Stripe payment processing (PaymentIntents + webhook-driven confirmation), and server-validated promo codes — then wire `web/app/(site)/reserver/[id]/BookingFlow.jsx` and `mobile/app/booking/{slot,payment,confirmation}.tsx` to it for real.

**Architecture:** New `rendez_vous` table + `RendezVousModule` (`server/src/rendez-vous/`) mirrors the existing `echanges` module's controller/service/DTO split. A client calls `POST /api/rendez-vous`, which resolves the praticien's real tarif (discounted server-side if a `promotion_code` validates), creates an `en_attente` rendez-vous row, and creates a Stripe `PaymentIntent` for that exact amount — the client never sends an amount. The frontend confirms payment client-side with Stripe Elements (web) / the Payment Sheet (mobile) using the returned `client_secret`, but the row only flips to `confirme` — and a `paiements` row only gets created — when Stripe calls `POST /api/webhooks/stripe` with a signed `payment_intent.succeeded` event; the webhook is idempotent (checks for an existing `paiements` row before inserting) since Stripe retries undelivered webhooks. Promo validation (`POST /api/promotions/validate`) is factored into a `PromotionsService.validate()` method reused by both the public endpoint and the booking-creation flow, so the discount logic lives in exactly one place. This finally gives the already-existing but currently-dangling `paiements.rendez_vous_id` column a real purpose, via a new `Paiement.rendezVous` relation.

**Tech Stack:** NestJS 11 + TypeORM (existing) + `stripe` (Node SDK, pinned `apiVersion: '2026-06-24.dahlia'` — confirmed via context7 against `stripe-node`'s own source, see Task 2). Web: Next.js 15 + `@stripe/stripe-js` + `@stripe/react-stripe-js` (Payment Element). Mobile: Expo 54 / React Native + `@stripe/stripe-react-native` (Payment Sheet). Server e2e tests stay on Jest + better-sqlite3 with `StripeService` mocked via `overrideProvider` — **no test in this plan ever calls real Stripe.**

**Reference:** [master roadmap](2026-07-13-aura-master-roadmap.md) · [Plan 01 Foundation](2026-07-13-aura-01-foundation.md) (established the api clients / react-query / test harnesses this plan builds on)

**Run each `npm` command from the relevant package dir** (`server/`, `web/`, `mobile/`), not the repo root.

---

## Prerequisites — you must supply real Stripe test-mode credentials before running this end-to-end

This plan's automated tests (server e2e, mobile repo test) never touch real Stripe — `StripeService` is mocked via Nest's `overrideProvider` everywhere. But to actually exercise the booking flow by hand (web browser / Expo dev build), you need:

1. A free Stripe account, in **test mode**.
2. `STRIPE_SECRET_KEY` (`sk_test_...`) and `STRIPE_WEBHOOK_SECRET` (`whsec_...`) in `server/.env` (Task 2 adds these keys to `.env.example`; copy them into your real `.env`, which is gitignored).
3. `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (`pk_test_...`) in `web/.env.development` (Task 9).
4. `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` (`pk_test_...`) in `mobile/.env.development` (Task 10).
5. The [Stripe CLI](https://docs.stripe.com/stripe-cli) running `stripe listen --forward-to localhost:8000/api/webhooks/stripe` locally so Stripe can deliver webhook events to your dev machine, and to obtain a matching `whsec_...` for local testing.
6. For mobile specifically: `@stripe/stripe-react-native` contains native code, so the Payment Sheet cannot be exercised in Expo Go — you need a development build (`npx expo prebuild` + `npx expo run:ios` / `npx expo run:android`, or an EAS development build). Task 10 covers install/config and Task 12 wires the actual `initPaymentSheet`/`presentPaymentSheet` calls; this plan's automated verification for both stops at `npm run typecheck` (and `npm test` for the logic that can be unit tested) — this sandbox has no simulator/device to actually launch a dev build against.

None of the above blocks writing or committing the code in this plan — only manual, real end-to-end verification.

---

## Design notes — decisions filled in beyond the locked spec

The brief's schema, Stripe flow, and promo contract are locked and implemented exactly as given. A few implementation details weren't specified and had to be decided; recorded here so they're visible at self-review time, not buried in a diff:

- **`duree_minutes` defaults to a fixed `60`.** The `POST /api/rendez-vous` request body (`{praticien_id, date_heure, mode, promotion_code?}`) has no duration field, and `Praticien` has no per-praticien duration column. R3 (lightweight, no calendar engine) makes a fixed default the right call rather than inventing a duration-configuration feature.
- **`date_heure` is built client-side from each frontend's existing (hardcoded, mock) day/slot pickers.** Neither `BookingFlow.jsx`'s `DAYS`/`SLOTS` nor mobile `slot.tsx`'s `days`/`slots` produce a real ISO datetime today (French month names, no year; `'14h00'`-style times). Small helpers (`buildDateHeureIso`) convert what's already selected into a valid ISO string. This plan does not replace the fake day/slot UI itself — that's a real calendar/availability engine, explicitly out of scope per R3.
- **The client-side-only "frais de service" (web: flat `2€`) / "frais de plateforme" (mobile: flat `3.50€`) display line is removed.** The backend only ever charges `praticien.tarif` (minus a promo discount) — there's no fee field anywhere in the locked schema or DTO. Keeping a fake add-on fee in the UI would show a total that doesn't match what Stripe actually charges. Both frontends now display the server-authoritative `tarif`.
- **`PromotionsService.validate()` is introduced in Task 3, not Task 7.** `RendezVousService.create()` depends on it (per the brief: "the rendez-vous creation endpoint... calls this same validation logic internally"), so the shared method has to exist before Task 3's own promo-related tests can pass. Task 7 only adds the dedicated public `POST /api/promotions/validate` controller route + its own tests, reusing the method Task 3 already introduced.
- **`Paiement.rendezVous` and its migration FK use no explicit `onDelete`/`ON DELETE`**, matching the brief's given entity snippet literally (`{nullable: true}`, no `onDelete`, unlike the sibling `praticien` relation on the same entity which explicitly uses `SET NULL`). MySQL's implicit default for an omitted FK action is `RESTRICT`.
- **Mobile's fake payment-method tiles (Visa/Apple Pay/"Add a card") are removed from `payment.tsx`.** Stripe's Payment Sheet is itself the payment-method selection UI; the old tiles didn't do anything and would now be actively misleading.
- **Event-registration payment** (mentioned in the master roadmap's one-line Plan 05 summary) is **not** part of this plan's locked brief — only the rendez-vous booking flow. Not built here.
- **The mobile payment screen's Stripe reassurance copy no longer claims delayed/escrow-style fund release.** The original mock text ("les fonds ne sont reversés à la praticienne qu'après la séance, une fois validée par vous") describes a hold-then-manually-released payment model that isn't part of the locked Stripe flow — `StripeService.createPaymentIntent()` uses automatic capture, and the webhook marks the `paiements` row `paid` immediately on `payment_intent.succeeded` (Task 6). Task 12 keeps the `EscrowNotice` component itself (it's shared with other screens) but rewrites its copy at this one call site to describe what actually happens — the same reasoning already applied to the frais-de-plateforme removal above.

---

## File Structure

| File | Responsibility |
|---|---|
| `server/src/database/entities/rendez-vous.entity.ts` (create) | `RendezVous` TypeORM entity |
| `server/src/database/entities/paiement.entity.ts` (modify) | Add `rendezVous` relation |
| `server/src/database/migrations/1700000000001-RendezVous.ts` (create) | `rendez_vous` table + FK on existing `paiements.rendez_vous_id` |
| `server/test/utils/create-test-app.ts` (modify) | Register `RendezVous` entity; support provider overrides + `rawBody` |
| `server/src/common/stripe.service.ts` (create) | Thin injectable wrapping the Stripe Node SDK |
| `server/src/common/stripe.service.spec.ts` (create) | Unit test for webhook signature verification (offline, no network) |
| `server/.env.example` (modify) | Append `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` |
| `server/package.json` (modify) | Add `stripe` dependency |
| `server/src/rendez-vous/rendez-vous.module.ts` (create) | Module wiring |
| `server/src/rendez-vous/rendez-vous.controller.ts` (create) | Client-facing rendez-vous routes |
| `server/src/rendez-vous/stripe-webhook.controller.ts` (create) | Public Stripe webhook route |
| `server/src/rendez-vous/rendez-vous.service.ts` (create) | Booking creation, list/show/cancel, webhook handling |
| `server/src/rendez-vous/dto/create-rendez-vous.dto.ts` (create) | Booking creation request shape |
| `server/src/app.module.ts` (modify) | Register `RendezVousModule` |
| `server/src/main.ts` (modify) | Enable `rawBody: true` for webhook signature verification |
| `server/test/rendez-vous.e2e-spec.ts` (create) | Full e2e coverage (Stripe mocked) |
| `server/src/promotions/dto/validate-promotion.dto.ts` (create) | `{code}` request shape |
| `server/src/promotions/promotions.service.ts` (modify) | Add shared `validate()` method |
| `server/src/promotions/promotions.controller.ts` (modify) | Add `POST /promotions/validate` |
| `server/src/promotions/promotions.module.ts` (modify) | Export `PromotionsService` |
| `server/test/promotions.e2e-spec.ts` (modify) | Add `/validate` tests |
| `web/package.json` (modify) | Add `@stripe/stripe-js`, `@stripe/react-stripe-js` |
| `web/.env.development` (modify) | Append `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` |
| `web/lib/pricing.js` (create) | `computeDiscountedTarif()` — testable extraction of the promo preview math |
| `web/lib/pricing.test.js` (create) | Unit tests for `computeDiscountedTarif()` |
| `web/app/(site)/reserver/[id]/BookingFlow.jsx` (modify) | Real promo validation + Stripe Elements + real confirmation |
| `mobile/package.json` (modify) | Add `@stripe/stripe-react-native` |
| `mobile/.env.development` (modify) | Append `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` |
| `mobile/app.json` (modify) | Add `@stripe/stripe-react-native` config plugin |
| `mobile/app/_layout.tsx` (modify) | Wrap app in `<StripeProvider>` |
| `mobile/src/data/types.ts` (modify) | Add `RendezVous` / `RendezVousPraticien` types |
| `mobile/src/data/repos/index.ts` (modify) | Replace stub `bookingRepo` with real `rendezVousRepo` |
| `mobile/src/data/repos/rendezVous.test.ts` (create) | Unit test for the repo layer (mirrors `client.test.ts`) |
| `mobile/src/utils/booking.ts` (create) | `buildDateHeureIso()` — mobile's slot-label → ISO datetime helper |
| `mobile/src/utils/booking.test.ts` (create) | Unit tests for `buildDateHeureIso()` |
| `mobile/app/booking/payment.tsx` (modify) | Real tarif, real booking creation, Stripe Payment Sheet |
| `mobile/app/booking/confirmation.tsx` (modify) | Render the real returned `rendez_vous` |

---

## Task 1: `RendezVous` entity + migration

**Files:**
- Create: `server/src/database/entities/rendez-vous.entity.ts`
- Create: `server/src/database/migrations/1700000000001-RendezVous.ts`
- Modify: `server/test/utils/create-test-app.ts`

- [ ] **Step 1: Write the entity**

Create `server/src/database/entities/rendez-vous.entity.ts`:

```typescript
import {
  Column, CreateDateColumn, Entity, JoinColumn, ManyToOne,
  PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm';
import { decimalTransformer } from '../../common/transformers';
import { Client } from './client.entity';
import { Praticien } from './praticien.entity';

@Entity('rendez_vous')
export class RendezVous {
  @PrimaryGeneratedColumn() id: number;
  @Column() client_id: number;
  @Column() praticien_id: number;
  @Column({ type: 'datetime' }) date_heure: Date;
  @Column({ type: 'int' }) duree_minutes: number;
  @Column({ length: 20 }) mode: string; // 'présentiel' | 'visio'
  @Column({ type: 'varchar', length: 20, default: 'en_attente' }) statut: string; // en_attente|confirme|annule|termine
  @Column({ type: 'decimal', precision: 10, scale: 2, transformer: decimalTransformer }) tarif: number;
  @Column({ type: 'int', nullable: true }) promotion_id: number | null;
  @Column({ type: 'varchar', nullable: true }) stripe_payment_intent_id: string | null;
  @CreateDateColumn({ name: 'created_at' }) created_at: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updated_at: Date;

  @ManyToOne(() => Client, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'client_id' })
  client: Client;
  @ManyToOne(() => Praticien, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'praticien_id' })
  praticien: Praticien;
}
```

- [ ] **Step 2: Write the migration**

Create `server/src/database/migrations/1700000000001-RendezVous.ts`. This mirrors `1700000000000-InitialSchema.ts`'s raw-SQL style exactly (including using `TIMESTAMP` for `datetime`-typed columns, matching how `paiements.date_paiement` etc. are declared there despite the entity saying `type: 'datetime'`):

```typescript
import { MigrationInterface, QueryRunner } from 'typeorm';

export class RendezVous1700000000001 implements MigrationInterface {
  public async up(q: QueryRunner): Promise<void> {
    await q.query(`CREATE TABLE rendez_vous (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      client_id BIGINT UNSIGNED NOT NULL,
      praticien_id BIGINT UNSIGNED NOT NULL,
      date_heure TIMESTAMP NOT NULL,
      duree_minutes INT NOT NULL,
      mode VARCHAR(20) NOT NULL,
      statut VARCHAR(20) NOT NULL DEFAULT 'en_attente',
      tarif DECIMAL(10,2) NOT NULL,
      promotion_id BIGINT UNSIGNED NULL,
      stripe_payment_intent_id VARCHAR(255) NULL,
      created_at TIMESTAMP NULL,
      updated_at TIMESTAMP NULL,
      CONSTRAINT fk_rdv_client FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
      CONSTRAINT fk_rdv_praticien FOREIGN KEY (praticien_id) REFERENCES praticiens(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    // paiements.rendez_vous_id has existed since the initial schema (BIGINT UNSIGNED NULL,
    // no FK) but was dangling until this table existed. No ON DELETE clause here, matching
    // the Paiement.rendezVous relation added in this plan (Task 8), which also omits an
    // explicit onDelete — unlike the sibling nullable praticien_id FK on the same table,
    // which uses SET NULL. MySQL's implicit default for an unspecified FK action is RESTRICT.
    await q.query(`ALTER TABLE paiements
      ADD CONSTRAINT fk_pai_rendez_vous FOREIGN KEY (rendez_vous_id) REFERENCES rendez_vous(id)`);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE paiements DROP FOREIGN KEY fk_pai_rendez_vous`);
    await q.query(`DROP TABLE IF EXISTS rendez_vous`);
  }
}
```

- [ ] **Step 3: Register the entity in the e2e test harness**

Every e2e test builds its schema from the explicit `ALL_ENTITIES` list in `server/test/utils/create-test-app.ts` (not just `autoLoadEntities`), per that file's own comment. Read the file (already done above), then add the import and list entry.

In `server/test/utils/create-test-app.ts`, add the import alongside the other entity imports:

```typescript
import { RendezVous } from '../../src/database/entities/rendez-vous.entity';
```

And add `RendezVous` to `ALL_ENTITIES`:

```typescript
const ALL_ENTITIES = [
  User, Client, Praticien, PraticienDocument, Cercle, Event, EventPraticien,
  Promotion, Discipline, Article, Notification, EmailTemplate, Echange, Paiement,
  Remboursement, RendezVous,
];
```

- [ ] **Step 4: Verify the existing suite still passes with the new entity registered**

Run: `npm run test:e2e` (in `server/`)
Expected: PASS — every existing suite still green; `synchronize: true` picks up the new `RendezVous` entity and its FKs to `clients`/`praticiens` without touching any existing table.

- [ ] **Step 5: Commit**

```bash
git add server/src/database/entities/rendez-vous.entity.ts server/src/database/migrations/1700000000001-RendezVous.ts server/test/utils/create-test-app.ts
git commit -m "feat(server): add rendez_vous entity and migration"
```

---

## Task 2: `StripeService` + Stripe env vars

**Files:**
- Create: `server/src/common/stripe.service.ts`
- Test: `server/src/common/stripe.service.spec.ts`
- Modify: `server/.env.example`, `server/package.json`

**Context7 verification:** `mcp__context7__resolve-library-id` → `/stripe/stripe-node` → `mcp__context7__query-docs` returned the library's own pinned version constant straight from source (`src/apiVersion.ts`): `export const ApiVersion = '2026-06-24.dahlia';`. That is the exact string used below — not guessed. Docs also confirmed `stripe.webhooks.constructEvent(rawBody, signature, secret)` (raw body required, not parsed JSON) and `stripe.webhooks.generateTestHeaderString({payload, secret})` for building a real, verifiable signature in tests without any network call.

- [ ] **Step 1: Install the Stripe SDK**

Run (in `server/`): `npm install stripe`

- [ ] **Step 2: Append Stripe env vars**

Modify `server/.env.example` — append (do not reformat the existing lines):

```
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
```

- [ ] **Step 3: Write the failing test**

Create `server/src/common/stripe.service.spec.ts`. This only tests `constructWebhookEvent` — Stripe's webhook signature check is pure local HMAC verification (no network), so it's genuinely unit-testable offline. `createPaymentIntent` is intentionally **not** unit tested here (it's a thin pass-through to a real network call); it's exercised in the e2e suite via `overrideProvider`, never hitting real Stripe:

```typescript
import Stripe from 'stripe';
import { StripeService } from './stripe.service';

describe('StripeService', () => {
  const secret = 'whsec_test_secret';
  let service: StripeService;

  beforeEach(() => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_dummy';
    service = new StripeService();
  });

  it('constructWebhookEvent parses a correctly signed payload', () => {
    const payload = JSON.stringify({ id: 'evt_test', object: 'event', type: 'payment_intent.succeeded' });
    const header = Stripe.webhooks.generateTestHeaderString({ payload, secret });
    const event = service.constructWebhookEvent(Buffer.from(payload), header, secret);
    expect(event.id).toBe('evt_test');
    expect(event.type).toBe('payment_intent.succeeded');
  });

  it('constructWebhookEvent throws when the payload does not match the signature', () => {
    const payload = JSON.stringify({ id: 'evt_test', object: 'event', type: 'payment_intent.succeeded' });
    const header = Stripe.webhooks.generateTestHeaderString({ payload, secret });
    expect(() =>
      service.constructWebhookEvent(Buffer.from(payload + 'tampered'), header, secret),
    ).toThrow();
  });
});
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `npm test -- stripe.service.spec.ts` (in `server/`)
Expected: FAIL — cannot find module `./stripe.service`.

- [ ] **Step 5: Write `StripeService`**

Create `server/src/common/stripe.service.ts`:

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
}
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npm test -- stripe.service.spec.ts` (in `server/`)
Expected: PASS (2 tests).

- [ ] **Step 7: Commit**

```bash
git add server/src/common/stripe.service.ts server/src/common/stripe.service.spec.ts server/.env.example server/package.json server/package-lock.json
git commit -m "feat(server): add StripeService wrapping the Stripe Node SDK"
```

---

## Task 3: `RendezVousModule` + `POST /api/rendez-vous` (booking creation)

**Files:**
- Create: `server/src/rendez-vous/rendez-vous.module.ts`, `server/src/rendez-vous/rendez-vous.controller.ts`, `server/src/rendez-vous/rendez-vous.service.ts`, `server/src/rendez-vous/dto/create-rendez-vous.dto.ts`
- Modify: `server/src/promotions/promotions.service.ts`, `server/src/promotions/promotions.module.ts` (add the shared `validate()` method this endpoint depends on — see Design notes)
- Modify: `server/src/app.module.ts`, `server/test/utils/create-test-app.ts`
- Test: `server/test/rendez-vous.e2e-spec.ts` (create)

- [ ] **Step 1: Add `PromotionsService.validate()`**

`RendezVousService.create()` (written below) needs this method to exist. Modify `server/src/promotions/promotions.service.ts` — add the method at the end of the class (full resulting file):

```typescript
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

  /**
   * Shared by POST /api/promotions/validate (Task 7) and RendezVousService.create() — looks
   * up a promo code and checks it hasn't expired. Throws rather than returning an
   * invalid/expired promo, so callers never have to re-check the result.
   */
  async validate(code: string): Promise<Promotion> {
    const promo = await this.promotions.findOneBy({ code });
    if (!promo || !isStrictlyAfterToday(promo.date_expiration)) {
      throw new NotFoundException({ status: 'error', message: 'Code promo invalide ou expiré' });
    }
    return promo;
  }
}
```

Modify `server/src/promotions/promotions.module.ts` to export the service so other modules can inject it (full resulting file):

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Promotion } from '../database/entities/promotion.entity';
import { PromotionsController } from './promotions.controller';
import { PromotionsService } from './promotions.service';

@Module({
  imports: [TypeOrmModule.forFeature([Promotion])],
  controllers: [PromotionsController],
  providers: [PromotionsService],
  exports: [PromotionsService],
})
export class PromotionsModule {}
```

- [ ] **Step 2: Extend the e2e test harness for provider overrides + raw body**

The brief's mocking pattern (`Test.createTestingModule({...}).overrideProvider(StripeService).useValue({...})`) needs a hook into the shared `createTestApp()` helper. Modify `server/test/utils/create-test-app.ts` — change the `createTestApp` function signature and body (keep everything else in the file, including the `RendezVous` import/entity-list change from Task 1):

```typescript
export async function createTestApp(
  metadata: Pick<ModuleMetadata, 'imports'> = {},
  overrides: Array<{ provide: any; useValue: any }> = [],
): Promise<INestApplication> {
  let builder = Test.createTestingModule({
    imports: [
      TypeOrmModule.forRoot({
        type: 'better-sqlite3',
        database: ':memory:',
        entities: ALL_ENTITIES,
        autoLoadEntities: true,
        synchronize: true,
      }),
      AuthModule,
      ...(metadata.imports ?? []),
    ],
  });
  for (const o of overrides) {
    builder = builder.overrideProvider(o.provide).useValue(o.useValue);
  }
  const moduleRef = await builder.compile();
  const app = moduleRef.createNestApplication(undefined, { rawBody: true });
  applyGlobalConfig(app);
  await app.init();
  return app;
}
```

This is backward compatible (new `overrides` param defaults to `[]`) — none of the 15 existing e2e spec files pass it, so they're unaffected. `rawBody: true` only adds a `req.rawBody` Buffer alongside normal JSON body parsing (needed by Task 6); it doesn't change `req.body` for any existing test, including the multipart (`FilesInterceptor`) ones in `echanges`/`remboursements`, since multipart requests bypass the JSON body-parser entirely.

- [ ] **Step 3: Write the DTO**

Create `server/src/rendez-vous/dto/create-rendez-vous.dto.ts`:

```typescript
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsISO8601, IsOptional, IsString, Min } from 'class-validator';

export class CreateRendezVousDto {
  @Type(() => Number) @IsInt() @Min(1) praticien_id: number;
  @IsISO8601() date_heure: string;
  @IsIn(['présentiel', 'visio']) mode: string;
  @IsOptional() @IsString() promotion_code?: string;
}
```

- [ ] **Step 4: Write the failing e2e tests**

Create `server/test/rendez-vous.e2e-spec.ts`:

```typescript
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { createTestApp, seedClientUser } from './utils/create-test-app';
import { RendezVousModule } from '../src/rendez-vous/rendez-vous.module';
import { StripeService } from '../src/common/stripe.service';
import { Praticien } from '../src/database/entities/praticien.entity';
import { Promotion } from '../src/database/entities/promotion.entity';
import { Paiement } from '../src/database/entities/paiement.entity';

const stripeServiceMock = {
  createPaymentIntent: jest.fn().mockResolvedValue({ id: 'pi_test_123', client_secret: 'pi_test_123_secret_abc' }),
  constructWebhookEvent: jest.fn(),
};

const future = () => {
  const d = new Date(); d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
};

describe('rendez-vous', () => {
  let app: INestApplication;
  let ds: DataSource;
  let clientToken: string;
  let praticienId: number;

  beforeAll(async () => {
    app = await createTestApp(
      { imports: [RendezVousModule] },
      [{ provide: StripeService, useValue: stripeServiceMock }],
    );
    clientToken = (await seedClientUser(app, 'rdv-client@aura.io')).token;
    ds = app.get(DataSource);
    const praticien = await ds.getRepository(Praticien).save({
      firstname: 'Elodie', lastname: 'Marceau', email: 'elodie@aura.io', telephone: '06',
      ville: 'Annecy', niveau: 'Expert', specialite: 'Magnétisme', mode: 'présentiel & visio',
      status: 'actif', tarif: 80, experience: 10, bio: 'Praticienne expérimentée.',
    });
    praticienId = praticien.id;
    await ds.getRepository(Promotion).save({
      code: 'PROMO10', type: 'pourcentage', valeur: 10, date_expiration: future(),
    });
  });
  afterAll(async () => { await app.close(); });
  beforeEach(() => { jest.clearAllMocks(); });
  const http = () => request(app.getHttpServer());

  it('POST /api/rendez-vous requires auth', async () => {
    await http().post('/api/rendez-vous')
      .send({ praticien_id: praticienId, date_heure: '2026-08-01T14:00:00', mode: 'présentiel' })
      .expect(401);
  });

  it('POST /api/rendez-vous 404s for a missing praticien', async () => {
    const res = await http().post('/api/rendez-vous')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ praticien_id: 999999, date_heure: '2026-08-01T14:00:00', mode: 'présentiel' })
      .expect(404);
    expect(res.body.message).toBe('Praticien introuvable');
  });

  it('POST /api/rendez-vous creates an en_attente rendez_vous and a PaymentIntent', async () => {
    const res = await http().post('/api/rendez-vous')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ praticien_id: praticienId, date_heure: '2026-08-01T14:00:00', mode: 'présentiel' })
      .expect(201);
    expect(res.body.data.rendez_vous).toMatchObject({
      praticien_id: praticienId, mode: 'présentiel', statut: 'en_attente', tarif: 80,
    });
    expect(res.body.data.client_secret).toBe('pi_test_123_secret_abc');
    expect(stripeServiceMock.createPaymentIntent).toHaveBeenCalledWith(
      8000, { rendez_vous_id: String(res.body.data.rendez_vous.id) },
    );
  });

  it('POST /api/rendez-vous applies a valid promotion_code and discounts the tarif', async () => {
    const res = await http().post('/api/rendez-vous')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ praticien_id: praticienId, date_heure: '2026-08-01T15:00:00', mode: 'visio', promotion_code: 'PROMO10' })
      .expect(201);
    expect(res.body.data.rendez_vous.tarif).toBe(72); // 80 - 10%
    expect(stripeServiceMock.createPaymentIntent).toHaveBeenCalledWith(7200, expect.any(Object));
  });

  it('POST /api/rendez-vous 404s for an invalid promotion_code', async () => {
    const res = await http().post('/api/rendez-vous')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ praticien_id: praticienId, date_heure: '2026-08-01T16:00:00', mode: 'visio', promotion_code: 'NOPE' })
      .expect(404);
    expect(res.body.message).toBe('Code promo invalide ou expiré');
  });
});
```

- [ ] **Step 5: Run the tests to verify they fail**

Run: `npm run test:e2e -- rendez-vous.e2e-spec.ts` (in `server/`)
Expected: FAIL — `Cannot find module '../src/rendez-vous/rendez-vous.module'`.

- [ ] **Step 6: Write `RendezVousService` (create-only for now)**

Create `server/src/rendez-vous/rendez-vous.service.ts`:

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RendezVous } from '../database/entities/rendez-vous.entity';
import { Paiement } from '../database/entities/paiement.entity';
import { Praticien } from '../database/entities/praticien.entity';
import { Client } from '../database/entities/client.entity';
import { success } from '../common/envelope';
import { StripeService } from '../common/stripe.service';
import { PromotionsService } from '../promotions/promotions.service';
import { CreateRendezVousDto } from './dto/create-rendez-vous.dto';

@Injectable()
export class RendezVousService {
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

    const paymentIntent = await this.stripeService.createPaymentIntent(
      Math.round(tarif * 100),
      { rendez_vous_id: String(saved.id) },
    );
    await this.rendezVous.update(saved.id, { stripe_payment_intent_id: paymentIntent.id });

    const fresh = await this.withRelations().where('rdv.id = :id', { id: saved.id }).getOne();
    return success({ rendez_vous: fresh, client_secret: paymentIntent.client_secret });
  }
}
```

(`indexForClient`, `showForClient`, `cancelForClient`, `handleStripeWebhookEvent` are added in Tasks 4–6 — each step below shows the complete file again as it grows.)

- [ ] **Step 7: Write `RendezVousController`**

Create `server/src/rendez-vous/rendez-vous.controller.ts`:

```typescript
import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { RendezVousService } from './rendez-vous.service';
import { CreateRendezVousDto } from './dto/create-rendez-vous.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ClientGuard } from '../auth/guards/client.guard';
import { CurrentClient } from '../auth/decorators';
import { Client } from '../database/entities/client.entity';

@Controller('rendez-vous')
export class RendezVousController {
  constructor(private readonly service: RendezVousService) {}

  @UseGuards(JwtAuthGuard, ClientGuard)
  @Post()
  create(@CurrentClient() client: Client, @Body() dto: CreateRendezVousDto) {
    return this.service.create(client, dto);
  }
}
```

- [ ] **Step 8: Write `RendezVousModule`**

Create `server/src/rendez-vous/rendez-vous.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RendezVous } from '../database/entities/rendez-vous.entity';
import { Paiement } from '../database/entities/paiement.entity';
import { Praticien } from '../database/entities/praticien.entity';
import { RendezVousController } from './rendez-vous.controller';
import { RendezVousService } from './rendez-vous.service';
import { StripeService } from '../common/stripe.service';
import { PromotionsModule } from '../promotions/promotions.module';

@Module({
  imports: [TypeOrmModule.forFeature([RendezVous, Paiement, Praticien]), PromotionsModule],
  controllers: [RendezVousController],
  providers: [RendezVousService, StripeService],
})
export class RendezVousModule {}
```

(`StripeWebhookController` is added to this module's `controllers` array in Task 6.)

- [ ] **Step 9: Register the module in `AppModule`**

Modify `server/src/app.module.ts` — add the import and list entry:

```typescript
import { RendezVousModule } from './rendez-vous/rendez-vous.module';
```

```typescript
    EchangesModule,
    PaiementsModule,
    RemboursementsModule,
    RendezVousModule,
```

- [ ] **Step 10: Run the tests to verify they pass**

Run: `npm run test:e2e -- rendez-vous.e2e-spec.ts` (in `server/`)
Expected: PASS (5 tests).

- [ ] **Step 11: Run the full e2e suite to check for regressions**

Run: `npm run test:e2e` (in `server/`)
Expected: PASS.

- [ ] **Step 12: Commit**

```bash
git add server/src/rendez-vous server/src/promotions/promotions.service.ts server/src/promotions/promotions.module.ts server/src/app.module.ts server/test/utils/create-test-app.ts server/test/rendez-vous.e2e-spec.ts
git commit -m "feat(server): add POST /api/rendez-vous booking + PaymentIntent creation"
```

---

## Task 4: `GET /api/rendez-vous/client` (list) + `GET /api/rendez-vous/client/:id` (show)

**Files:**
- Modify: `server/src/rendez-vous/rendez-vous.service.ts`, `server/src/rendez-vous/rendez-vous.controller.ts`
- Test: `server/test/rendez-vous.e2e-spec.ts` (modify)

- [ ] **Step 1: Write the failing tests**

Add these two tests to `server/test/rendez-vous.e2e-spec.ts`, after the existing `it` blocks (still inside the `describe('rendez-vous', ...)` block):

```typescript
  it("GET /api/rendez-vous/client lists only the client's own rows, filterable by statut", async () => {
    const created = await http().post('/api/rendez-vous').set('Authorization', `Bearer ${clientToken}`)
      .send({ praticien_id: praticienId, date_heure: '2026-08-03T10:00:00', mode: 'visio' }).expect(201);
    const newId = created.body.data.rendez_vous.id;

    const other = await seedClientUser(app, 'rdv-other@aura.io');
    await http().post('/api/rendez-vous').set('Authorization', `Bearer ${other.token}`)
      .send({ praticien_id: praticienId, date_heure: '2026-08-03T11:00:00', mode: 'visio' }).expect(201);

    const res = await http().get('/api/rendez-vous/client')
      .set('Authorization', `Bearer ${clientToken}`).expect(200);
    const ids = res.body.data.map((r: any) => r.id);
    expect(ids).toContain(newId);
    expect(res.body.data.every((r: any) => r.client_id !== other.client.id)).toBe(true);

    const filtered = await http().get('/api/rendez-vous/client?statut=en_attente')
      .set('Authorization', `Bearer ${clientToken}`).expect(200);
    expect(filtered.body.data.every((r: any) => r.statut === 'en_attente')).toBe(true);
  });

  it("GET /api/rendez-vous/client/:id returns the owner's rendez-vous with the praticien relation, 404s otherwise", async () => {
    const created = await http().post('/api/rendez-vous').set('Authorization', `Bearer ${clientToken}`)
      .send({ praticien_id: praticienId, date_heure: '2026-08-04T10:00:00', mode: 'présentiel' }).expect(201);
    const id = created.body.data.rendez_vous.id;

    const shown = await http().get(`/api/rendez-vous/client/${id}`)
      .set('Authorization', `Bearer ${clientToken}`).expect(200);
    expect(shown.body.data.praticien).toMatchObject({ id: praticienId, firstname: 'Elodie' });

    const other = await seedClientUser(app, 'rdv-show-other@aura.io');
    await http().get(`/api/rendez-vous/client/${id}`)
      .set('Authorization', `Bearer ${other.token}`).expect(404);
    await http().get('/api/rendez-vous/client/999999')
      .set('Authorization', `Bearer ${clientToken}`).expect(404);
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm run test:e2e -- rendez-vous.e2e-spec.ts` (in `server/`)
Expected: FAIL — `404 Not Found` for `GET /api/rendez-vous/client` (no such route yet).

- [ ] **Step 3: Add the service methods**

Modify `server/src/rendez-vous/rendez-vous.service.ts` — add `parsePagination`/`paginateQb` to the imports and two new methods after `create()` (full resulting file):

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RendezVous } from '../database/entities/rendez-vous.entity';
import { Paiement } from '../database/entities/paiement.entity';
import { Praticien } from '../database/entities/praticien.entity';
import { Client } from '../database/entities/client.entity';
import { success } from '../common/envelope';
import { parsePagination, paginateQb } from '../common/pagination';
import { StripeService } from '../common/stripe.service';
import { PromotionsService } from '../promotions/promotions.service';
import { CreateRendezVousDto } from './dto/create-rendez-vous.dto';

@Injectable()
export class RendezVousService {
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

    const paymentIntent = await this.stripeService.createPaymentIntent(
      Math.round(tarif * 100),
      { rendez_vous_id: String(saved.id) },
    );
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
}
```

- [ ] **Step 4: Add the controller routes**

Modify `server/src/rendez-vous/rendez-vous.controller.ts` (full resulting file):

```typescript
import {
  Body, Controller, Get, Param, ParseIntPipe, Post, Query, UseGuards,
} from '@nestjs/common';
import { RendezVousService } from './rendez-vous.service';
import { CreateRendezVousDto } from './dto/create-rendez-vous.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ClientGuard } from '../auth/guards/client.guard';
import { CurrentClient } from '../auth/decorators';
import { Client } from '../database/entities/client.entity';

@Controller('rendez-vous')
export class RendezVousController {
  constructor(private readonly service: RendezVousService) {}

  @UseGuards(JwtAuthGuard, ClientGuard)
  @Post()
  create(@CurrentClient() client: Client, @Body() dto: CreateRendezVousDto) {
    return this.service.create(client, dto);
  }

  @UseGuards(JwtAuthGuard, ClientGuard)
  @Get('client')
  index(@CurrentClient() client: Client, @Query() query: Record<string, any>) {
    return this.service.indexForClient(client, query);
  }

  @UseGuards(JwtAuthGuard, ClientGuard)
  @Get('client/:id')
  show(@CurrentClient() client: Client, @Param('id', ParseIntPipe) id: number) {
    return this.service.showForClient(client, id);
  }
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm run test:e2e -- rendez-vous.e2e-spec.ts` (in `server/`)
Expected: PASS (7 tests).

- [ ] **Step 6: Commit**

```bash
git add server/src/rendez-vous/rendez-vous.service.ts server/src/rendez-vous/rendez-vous.controller.ts server/test/rendez-vous.e2e-spec.ts
git commit -m "feat(server): add client rendez-vous list and detail endpoints"
```

---

## Task 5: `POST /api/rendez-vous/client/:id/cancel`

**Files:**
- Modify: `server/src/rendez-vous/rendez-vous.service.ts`, `server/src/rendez-vous/rendez-vous.controller.ts`
- Test: `server/test/rendez-vous.e2e-spec.ts` (modify)

A booking cancelled before payment succeeds just cancels cleanly — Stripe auto-expires/cancels an unconfirmed PaymentIntent on its own. If a PaymentIntent was already captured, issuing the actual refund is the existing `remboursements` module's job (client requests a refund against the resulting `paiements` row, already wired in Plan 04) — **not** implemented here.

- [ ] **Step 1: Write the failing test**

Add to `server/test/rendez-vous.e2e-spec.ts`:

```typescript
  it('POST /api/rendez-vous/client/:id/cancel cancels an en_attente row; repeat cancel 404s', async () => {
    const created = await http().post('/api/rendez-vous').set('Authorization', `Bearer ${clientToken}`)
      .send({ praticien_id: praticienId, date_heure: '2026-08-05T10:00:00', mode: 'visio' }).expect(201);
    const id = created.body.data.rendez_vous.id;

    const cancelled = await http().post(`/api/rendez-vous/client/${id}/cancel`)
      .set('Authorization', `Bearer ${clientToken}`).expect(200);
    expect(cancelled.body.data.statut).toBe('annule');
    expect(cancelled.body.message).toBe('Rendez-vous annulé avec succès');

    const again = await http().post(`/api/rendez-vous/client/${id}/cancel`)
      .set('Authorization', `Bearer ${clientToken}`).expect(404);
    expect(again.body.message).toBe('Rendez-vous non trouvé ou ne peut pas être annulé');
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:e2e -- rendez-vous.e2e-spec.ts` (in `server/`)
Expected: FAIL — `404 Not Found` for `POST /api/rendez-vous/client/:id/cancel` (no such route yet).

- [ ] **Step 3: Add the service method**

Modify `server/src/rendez-vous/rendez-vous.service.ts` — add `In` to the `typeorm` import and add `cancelForClient` after `showForClient` (full resulting file):

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { RendezVous } from '../database/entities/rendez-vous.entity';
import { Paiement } from '../database/entities/paiement.entity';
import { Praticien } from '../database/entities/praticien.entity';
import { Client } from '../database/entities/client.entity';
import { success } from '../common/envelope';
import { parsePagination, paginateQb } from '../common/pagination';
import { StripeService } from '../common/stripe.service';
import { PromotionsService } from '../promotions/promotions.service';
import { CreateRendezVousDto } from './dto/create-rendez-vous.dto';

@Injectable()
export class RendezVousService {
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

    const paymentIntent = await this.stripeService.createPaymentIntent(
      Math.round(tarif * 100),
      { rendez_vous_id: String(saved.id) },
    );
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
}
```

- [ ] **Step 4: Add the controller route**

Modify `server/src/rendez-vous/rendez-vous.controller.ts` (full resulting file):

```typescript
import {
  Body, Controller, Get, HttpCode, Param, ParseIntPipe, Post, Query, UseGuards,
} from '@nestjs/common';
import { RendezVousService } from './rendez-vous.service';
import { CreateRendezVousDto } from './dto/create-rendez-vous.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ClientGuard } from '../auth/guards/client.guard';
import { CurrentClient } from '../auth/decorators';
import { Client } from '../database/entities/client.entity';

@Controller('rendez-vous')
export class RendezVousController {
  constructor(private readonly service: RendezVousService) {}

  @UseGuards(JwtAuthGuard, ClientGuard)
  @Post()
  create(@CurrentClient() client: Client, @Body() dto: CreateRendezVousDto) {
    return this.service.create(client, dto);
  }

  @UseGuards(JwtAuthGuard, ClientGuard)
  @Get('client')
  index(@CurrentClient() client: Client, @Query() query: Record<string, any>) {
    return this.service.indexForClient(client, query);
  }

  @UseGuards(JwtAuthGuard, ClientGuard)
  @Get('client/:id')
  show(@CurrentClient() client: Client, @Param('id', ParseIntPipe) id: number) {
    return this.service.showForClient(client, id);
  }

  @UseGuards(JwtAuthGuard, ClientGuard)
  @HttpCode(200)
  @Post('client/:id/cancel')
  cancel(@CurrentClient() client: Client, @Param('id', ParseIntPipe) id: number) {
    return this.service.cancelForClient(client, id);
  }
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm run test:e2e -- rendez-vous.e2e-spec.ts` (in `server/`)
Expected: PASS (8 tests).

- [ ] **Step 6: Run the full e2e suite to check for regressions**

Run: `npm run test:e2e` (in `server/`)
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add server/src/rendez-vous/rendez-vous.service.ts server/src/rendez-vous/rendez-vous.controller.ts server/test/rendez-vous.e2e-spec.ts
git commit -m "feat(server): add client rendez-vous cancellation endpoint"
```

---

## Task 6: Stripe webhook — raw-body signature verification + idempotent confirmation

This is the fiddliest part of the plan — getting it wrong silently breaks signature verification in production while still looking fine in casual testing. Split into small steps on purpose.

**Files:**
- Modify: `server/src/main.ts` (enable raw body globally)
- Create: `server/src/rendez-vous/stripe-webhook.controller.ts`
- Modify: `server/src/rendez-vous/rendez-vous.service.ts`, `server/src/rendez-vous/rendez-vous.module.ts`
- Test: `server/test/rendez-vous.e2e-spec.ts` (modify)

**Context7 verification:** `mcp__context7__query-docs` against `/nestjs/docs.nestjs.com` (`content/faq/raw-body.md`) confirmed the current, official NestJS v11 idiom is `NestFactory.create<NestExpressApplication>(AppModule, { rawBody: true })`, then `@Req() req: RawBodyRequest<Request>` in the controller to read `req.rawBody` as a `Buffer`. This is a single global option — Nest's body-parser middleware captures the raw bytes into `req.rawBody` *while still* parsing `req.body` as normal JSON for every other route, so no separate `express.raw()` mount is needed (and none of the 8+ existing DTO-validated JSON routes are affected). `Test.createTestingModule(...).overrideProvider(...)` and `moduleRef.createNestApplication()` are the documented e2e patterns (`content/fundamentals/unit-testing.md`); `NestApplicationOptions` (which includes `rawBody`) is accepted by `createNestApplication`'s second argument the same way `NestFactory.create` accepts it — already wired into `createTestApp()` in Task 3, Step 2.

- [ ] **Step 1: Enable raw body capture in the real app**

Modify `server/src/main.ts`:

```typescript
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { applyGlobalConfig } from './app.setup';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { rawBody: true });
  applyGlobalConfig(app);
  await app.listen(process.env.PORT ?? 8000);
}
bootstrap();
```

- [ ] **Step 2: Verify the server still boots**

Run (in `server/`): `npm run build`
Expected: Build succeeds (type-checks `NestExpressApplication` + `rawBody` option).

- [ ] **Step 3: Write the failing e2e tests**

These use a fabricated `Stripe.Event`-shaped object (not real HTTP signature verification — `constructWebhookEvent` is mocked) but go through a **real HTTP POST** to the real controller route, so they also prove the raw-body plumbing itself works: the mock implementation below asserts `rawBody` arrives as a non-empty `Buffer`, which would fail if `rawBody: true` wasn't wired correctly.

Add to `server/test/rendez-vous.e2e-spec.ts`, importing `Paiement` is already done in Task 3's version of the file:

```typescript
  it('POST /api/webhooks/stripe returns 400 when the signature cannot be verified', async () => {
    stripeServiceMock.constructWebhookEvent.mockImplementationOnce(() => {
      throw new Error('invalid signature');
    });
    const res = await http().post('/api/webhooks/stripe')
      .set('stripe-signature', 'bad-sig')
      .send({ id: 'evt_bad', type: 'payment_intent.succeeded' })
      .expect(400);
    expect(res.body.message).toBe('Signature Stripe invalide');
  });

  it('POST /api/webhooks/stripe confirms the rendez_vous and creates a paiements row exactly once, even on retry', async () => {
    const created = await http().post('/api/rendez-vous').set('Authorization', `Bearer ${clientToken}`)
      .send({ praticien_id: praticienId, date_heure: '2026-08-06T10:00:00', mode: 'présentiel' }).expect(201);
    const rdv = created.body.data.rendez_vous;

    const fakeEvent = {
      id: 'evt_succeeded',
      type: 'payment_intent.succeeded',
      data: { object: { id: 'pi_test_123', metadata: { rendez_vous_id: String(rdv.id) } } },
    };
    stripeServiceMock.constructWebhookEvent.mockImplementation((rawBody: unknown) => {
      // Proves the raw-body plumbing actually works, not just that the mock returns something.
      expect(Buffer.isBuffer(rawBody)).toBe(true);
      expect((rawBody as Buffer).length).toBeGreaterThan(0);
      return fakeEvent;
    });

    await http().post('/api/webhooks/stripe').set('stripe-signature', 'sig').send(fakeEvent).expect(200);

    const shown = await http().get(`/api/rendez-vous/client/${rdv.id}`)
      .set('Authorization', `Bearer ${clientToken}`).expect(200);
    expect(shown.body.data.statut).toBe('confirme');

    const paiementRows = await ds.getRepository(Paiement).findBy({ rendez_vous_id: rdv.id });
    expect(paiementRows).toHaveLength(1);
    expect(paiementRows[0]).toMatchObject({ statut: 'paid', moyen_paiement: 'card' });
    expect(paiementRows[0].montant_brut).toBe(rdv.tarif);

    // Stripe retries undelivered/unacknowledged events — must not double-create the paiements row.
    await http().post('/api/webhooks/stripe').set('stripe-signature', 'sig').send(fakeEvent).expect(200);
    const afterRetry = await ds.getRepository(Paiement).findBy({ rendez_vous_id: rdv.id });
    expect(afterRetry).toHaveLength(1);
  });

  it('POST /api/webhooks/stripe cancels the rendez_vous on payment_intent.payment_failed', async () => {
    const created = await http().post('/api/rendez-vous').set('Authorization', `Bearer ${clientToken}`)
      .send({ praticien_id: praticienId, date_heure: '2026-08-07T10:00:00', mode: 'visio' }).expect(201);
    const rdv = created.body.data.rendez_vous;

    const fakeEvent = {
      id: 'evt_failed',
      type: 'payment_intent.payment_failed',
      data: { object: { id: 'pi_test_456', metadata: { rendez_vous_id: String(rdv.id) } } },
    };
    stripeServiceMock.constructWebhookEvent.mockImplementation(() => fakeEvent);

    await http().post('/api/webhooks/stripe').set('stripe-signature', 'sig').send(fakeEvent).expect(200);

    const shown = await http().get(`/api/rendez-vous/client/${rdv.id}`)
      .set('Authorization', `Bearer ${clientToken}`).expect(200);
    expect(shown.body.data.statut).toBe('annule');
  });
```

- [ ] **Step 4: Run the tests to verify they fail**

Run: `npm run test:e2e -- rendez-vous.e2e-spec.ts` (in `server/`)
Expected: FAIL — `404 Not Found` for `POST /api/webhooks/stripe` (no such route yet).

- [ ] **Step 5: Add `handleStripeWebhookEvent` to the service**

Modify `server/src/rendez-vous/rendez-vous.service.ts` — add the `Stripe` import and three new methods at the end of the class (full resulting file):

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
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
import { PromotionsService } from '../promotions/promotions.service';
import { CreateRendezVousDto } from './dto/create-rendez-vous.dto';

@Injectable()
export class RendezVousService {
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

    const paymentIntent = await this.stripeService.createPaymentIntent(
      Math.round(tarif * 100),
      { rendez_vous_id: String(saved.id) },
    );
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
    if (!rdv) return;

    await this.rendezVous.update(rdvId, { statut: 'confirme' });

    const existing = await this.paiements.findOneBy({ rendez_vous_id: rdvId });
    if (existing) return; // idempotent: this event was already processed

    await this.paiements.save({
      reference: `RDV-${rdv.id}-${Date.now()}`,
      client_id: rdv.client_id,
      praticien_id: rdv.praticien_id,
      rendez_vous_id: rdv.id,
      montant_brut: rdv.tarif,
      moyen_paiement: 'card',
      statut: 'paid',
      date_paiement: new Date(),
    });
  }

  private async cancelFromPaymentIntent(intent: Stripe.PaymentIntent) {
    const rdvId = Number(intent.metadata?.rendez_vous_id);
    if (!rdvId) return;
    await this.rendezVous.update(rdvId, { statut: 'annule' });
  }
}
```

- [ ] **Step 6: Add `StripeWebhookController`**

Create `server/src/rendez-vous/stripe-webhook.controller.ts`:

```typescript
import { BadRequestException, Controller, Headers, HttpCode, Post, Req } from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import Stripe from 'stripe';
import { RendezVousService } from './rendez-vous.service';
import { StripeService } from '../common/stripe.service';

@Controller('webhooks/stripe')
export class StripeWebhookController {
  constructor(
    private readonly rendezVousService: RendezVousService,
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
    return this.rendezVousService.handleStripeWebhookEvent(event);
  }
}
```

- [ ] **Step 7: Register the webhook controller in the module**

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

@Module({
  imports: [TypeOrmModule.forFeature([RendezVous, Paiement, Praticien]), PromotionsModule],
  controllers: [RendezVousController, StripeWebhookController],
  providers: [RendezVousService, StripeService],
})
export class RendezVousModule {}
```

- [ ] **Step 8: Run the tests to verify they pass**

Run: `npm run test:e2e -- rendez-vous.e2e-spec.ts` (in `server/`)
Expected: PASS (11 tests).

- [ ] **Step 9: Run the full e2e suite to check for regressions**

Run: `npm run test:e2e` (in `server/`)
Expected: PASS. This specifically also proves `rawBody: true` didn't break the multipart-upload tests in `echanges.e2e-spec.ts` / `remboursements.e2e-spec.ts`.

- [ ] **Step 10: Commit**

```bash
git add server/src/main.ts server/src/rendez-vous server/test/rendez-vous.e2e-spec.ts
git commit -m "feat(server): add Stripe webhook endpoint with raw-body signature verification"
```

---

## Task 7: `POST /api/promotions/validate`

`PromotionsService.validate()` already exists (Task 3, needed by booking creation). This task only adds the public controller route + DTO that expose it directly, plus dedicated tests.

**Files:**
- Create: `server/src/promotions/dto/validate-promotion.dto.ts`
- Modify: `server/src/promotions/promotions.controller.ts`
- Test: `server/test/promotions.e2e-spec.ts` (modify)

- [ ] **Step 1: Write the DTO**

Create `server/src/promotions/dto/validate-promotion.dto.ts`:

```typescript
import { IsString } from 'class-validator';

export class ValidatePromotionDto {
  @IsString() code: string;
}
```

- [ ] **Step 2: Write the failing tests**

Modify `server/test/promotions.e2e-spec.ts` — add `DataSource` and `Promotion` imports, and three new tests. Full resulting file:

```typescript
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { createTestApp } from './utils/create-test-app';
import { PromotionsModule } from '../src/promotions/promotions.module';
import { Promotion } from '../src/database/entities/promotion.entity';

const future = () => {
  const d = new Date(); d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
};

const today = () => new Date().toISOString().slice(0, 10);

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

  it('POST / rejects date_expiration set to today (must be strictly after today)', async () => {
    const res = await http().post('/api/promotions')
      .send({ code: 'TODAY1', type: 'fixe', valeur: 5, date_expiration: today() }).expect(422);
    expect(res.body.errors.date_expiration).toBeDefined();
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

  it('POST /api/promotions/validate returns the promotion for a valid, non-expired code', async () => {
    await http().post('/api/promotions')
      .send({ code: 'VALID20', type: 'fixe', valeur: 20, date_expiration: future() }).expect(201);
    const res = await http().post('/api/promotions/validate').send({ code: 'VALID20' }).expect(200);
    expect(res.body.data).toMatchObject({ code: 'VALID20', type: 'fixe', valeur: 20 });
    expect(res.body.data.id).toBeDefined();
  });

  it('POST /api/promotions/validate 404s for an unknown code', async () => {
    const res = await http().post('/api/promotions/validate').send({ code: 'NOPE' }).expect(404);
    expect(res.body.message).toBe('Code promo invalide ou expiré');
  });

  it('POST /api/promotions/validate 404s for an expired code', async () => {
    await http().post('/api/promotions')
      .send({ code: 'EXPIRED1', type: 'fixe', valeur: 5, date_expiration: future() }).expect(201);
    const ds = app.get(DataSource);
    await ds.getRepository(Promotion).update({ code: 'EXPIRED1' }, { date_expiration: '2020-01-01' });
    const res = await http().post('/api/promotions/validate').send({ code: 'EXPIRED1' }).expect(404);
    expect(res.body.message).toBe('Code promo invalide ou expiré');
  });
});
```

(The `PUT` route validation for an already-past `date_expiration` can't be used to construct the expired-code fixture — `POST /api/promotions` itself rejects a past `date_expiration`, so the last test creates it as valid-future then updates the row directly via the repository, bypassing the API's own validation on purpose.)

- [ ] **Step 3: Run the tests to verify the new ones fail**

Run: `npm run test:e2e -- promotions.e2e-spec.ts` (in `server/`)
Expected: The 3 pre-existing tests PASS; the 3 new `/validate` tests FAIL with `404 Not Found` (no such route yet).

- [ ] **Step 4: Add the controller route**

Modify `server/src/promotions/promotions.controller.ts` (full resulting file):

```typescript
import {
  Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Post, Put, Query, Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { PromotionsService } from './promotions.service';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';
import { ValidatePromotionDto } from './dto/validate-promotion.dto';
import { success } from '../common/envelope';

@Controller('promotions')
export class PromotionsController {
  constructor(private readonly service: PromotionsService) {}

  // ---- public promo-code check (used by the booking flow before payment) ----

  @HttpCode(200)
  @Post('validate')
  async validate(@Body() dto: ValidatePromotionDto) {
    const promo = await this.service.validate(dto.code);
    return success({ id: promo.id, code: promo.code, type: promo.type, valeur: promo.valeur });
  }

  // ---- admin CRUD ----

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

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm run test:e2e -- promotions.e2e-spec.ts` (in `server/`)
Expected: PASS (6 tests).

- [ ] **Step 6: Run the full e2e suite to check for regressions**

Run: `npm run test:e2e` (in `server/`)
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add server/src/promotions/dto/validate-promotion.dto.ts server/src/promotions/promotions.controller.ts server/test/promotions.e2e-spec.ts
git commit -m "feat(server): add POST /api/promotions/validate endpoint"
```

---

## Task 8: `Paiement.rendezVous` relation

**Files:**
- Modify: `server/src/database/entities/paiement.entity.ts`
- Test: `server/test/rendez-vous.e2e-spec.ts` (modify)

- [ ] **Step 1: Write the failing test**

Add to `server/test/rendez-vous.e2e-spec.ts` (after the webhook tests from Task 6):

```typescript
  it('Paiement.rendezVous relation loads the linked rendez_vous', async () => {
    const created = await http().post('/api/rendez-vous').set('Authorization', `Bearer ${clientToken}`)
      .send({ praticien_id: praticienId, date_heure: '2026-08-08T10:00:00', mode: 'présentiel' }).expect(201);
    const rdv = created.body.data.rendez_vous;

    const fakeEvent = {
      id: 'evt_relation_check',
      type: 'payment_intent.succeeded',
      data: { object: { id: 'pi_relation', metadata: { rendez_vous_id: String(rdv.id) } } },
    };
    stripeServiceMock.constructWebhookEvent.mockImplementation(() => fakeEvent);
    await http().post('/api/webhooks/stripe').set('stripe-signature', 'sig').send(fakeEvent).expect(200);

    const paiement = await ds.getRepository(Paiement).findOne({
      where: { rendez_vous_id: rdv.id }, relations: { rendezVous: true },
    });
    expect(paiement?.rendezVous?.id).toBe(rdv.id);
    expect(paiement?.rendezVous?.statut).toBe('confirme');
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:e2e -- rendez-vous.e2e-spec.ts` (in `server/`)
Expected: FAIL — `paiement.rendezVous` is `undefined` (TypeORM ignores the `relations: { rendezVous: true }` option because the entity has no such relation property yet; `Property 'rendezVous' does not exist` at compile time, so this actually fails to compile until Step 3).

- [ ] **Step 3: Add the relation**

Read `server/src/database/entities/paiement.entity.ts` in full (already done during planning) before editing. Modify it — add the `RendezVous` import and the relation property (full resulting file):

```typescript
import {
  Column, CreateDateColumn, DeleteDateColumn, Entity, JoinColumn, ManyToOne,
  PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm';
import { decimalTransformer, jsonTransformer } from '../../common/transformers';
import { Client } from './client.entity';
import { Praticien } from './praticien.entity';
import { RendezVous } from './rendez-vous.entity';

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
  @ManyToOne(() => Praticien, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'praticien_id' })
  praticien: Praticien | null;
  @ManyToOne(() => RendezVous, { nullable: true })
  @JoinColumn({ name: 'rendez_vous_id' })
  rendezVous: RendezVous | null;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test:e2e -- rendez-vous.e2e-spec.ts` (in `server/`)
Expected: PASS (12 tests).

- [ ] **Step 5: Run the full e2e suite to check for regressions**

Run: `npm run test:e2e` (in `server/`)
Expected: PASS — in particular, confirms the `paiements.e2e-spec.ts` and `remboursements.e2e-spec.ts` suites (which build `Paiement` rows directly) are unaffected by the new optional relation.

- [ ] **Step 6: Commit**

```bash
git add server/src/database/entities/paiement.entity.ts server/test/rendez-vous.e2e-spec.ts
git commit -m "feat(server): link Paiement to its originating rendez_vous"
```

---

## Task 9: Web — Stripe Elements in `BookingFlow.jsx`

**Files:**
- Modify: `web/package.json`, `web/.env.development`, `web/app/(site)/reserver/[id]/BookingFlow.jsx`

**Context7 verification:** `mcp__context7__query-docs` against `/stripe/react-stripe-js` confirmed: `loadStripe` comes from `@stripe/stripe-js`; `Elements`/`PaymentElement`/`useStripe`/`useElements` come from `@stripe/react-stripe-js`; `<Elements stripe={stripePromise} options={{clientSecret}}>` is how an existing PaymentIntent's `clientSecret` is attached; `elements.submit()` must run before `stripe.confirmPayment(...)`; and — checked separately against `/websites/stripe_js` (docs.stripe.com's own Payment Element reference) since the first pass didn't surface it — `stripe.confirmPayment({elements, confirmParams:{return_url}, redirect: 'if_required'})` resolves with `{paymentIntent}` (not a redirect) for non-redirect-based payment methods, which is exactly the single-page flow this component needs; only redirect-based methods (e.g. some bank redirects) still navigate away.

No dedicated test harness exists for files under `web/app/` (Vitest is configured for `lib/**/*.test.{js,jsx}` only, per `web/vitest.config.mjs` — see Plan 01) — `BookingFlow.jsx` itself is still verified via `npm run build`, matching the precedent set by Plan 01 Task 3 for the same reason. The one piece of pure, branching logic this task introduces — the discounted-price preview shown in the promo card and the sticky summary rail — is pulled out into `web/lib/pricing.js` precisely so it *can* be unit tested (Steps 3–6 below), rather than left untestable inline in the component.

- [ ] **Step 1: Install Stripe web dependencies**

Run (in `web/`): `npm install @stripe/stripe-js @stripe/react-stripe-js`

- [ ] **Step 2: Append the publishable key env var**

Modify `web/.env.development` — append:

```
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
```

- [ ] **Step 3: Write the failing test for the discount-preview helper**

`discountedPrice` (used in both the step-3 promo preview and the sticky summary rail) is a pure, branching calculation — exactly the kind of logic that should be extracted and unit tested rather than left inline in JSX. Create `web/lib/pricing.test.js`:

```javascript
import { describe, it, expect } from 'vitest';
import { computeDiscountedTarif } from './pricing';

describe('computeDiscountedTarif', () => {
  it('returns the original price when there is no promo', () => {
    expect(computeDiscountedTarif(80, null)).toBe(80);
  });

  it('applies a percentage discount', () => {
    expect(computeDiscountedTarif(80, { type: 'pourcentage', valeur: 10 })).toBe(72);
  });

  it('applies a fixed discount', () => {
    expect(computeDiscountedTarif(80, { type: 'fixe', valeur: 15 })).toBe(65);
  });

  it('clamps a fixed discount larger than the price to 0', () => {
    expect(computeDiscountedTarif(10, { type: 'fixe', valeur: 25 })).toBe(0);
  });

  it('clamps a pathological >100% percentage discount to 0 (the backend only clamps the fixed branch — see RendezVousService.create in Task 3 — so this client-side preview is deliberately more conservative; it must never show a negative estimate)', () => {
    expect(computeDiscountedTarif(80, { type: 'pourcentage', valeur: 150 })).toBe(0);
  });
});
```

- [ ] **Step 4: Run the test to verify it fails**

Run (in `web/`): `npm test -- pricing.test.js`
Expected: FAIL — cannot find module `./pricing`.

- [ ] **Step 5: Write the helper**

Create `web/lib/pricing.js`:

```javascript
// Client-side preview of the server-authoritative discount computation in
// RendezVousService.create() (server/src/rendez-vous/rendez-vous.service.ts). Used only to
// show an estimated total before the booking is created — the tarif actually charged always
// comes back from the POST /api/rendez-vous response, never from this function.
export function computeDiscountedTarif(price, promo) {
  if (!promo) return price;
  return promo.type === 'pourcentage'
    ? Math.max(0, price * (1 - promo.valeur / 100))
    : Math.max(0, price - promo.valeur);
}
```

- [ ] **Step 6: Run the test to verify it passes**

Run (in `web/`): `npm test -- pricing.test.js`
Expected: PASS (5 tests).

- [ ] **Step 7: Rewrite `BookingFlow.jsx`**

Read the current file in full first (already done during planning — this is a complete replacement of that file). Create/overwrite `web/app/(site)/reserver/[id]/BookingFlow.jsx`:

```jsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { Badge } from '@/components/ui/Badge';
import { Rating } from '@/components/ui/Rating';
import { Lotus } from '@/components/ui/Lotus';
import { euro } from '@/lib/format';
import { computeDiscountedTarif } from '@/lib/pricing';
import { api, ApiError } from '@/lib/api';
import { useToast } from '@/lib/store';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

const DAYS = [
  { key: 'd1', dow: 'Lun', dom: '02', month: 'juin', full: 'lundi 2 juin' },
  { key: 'd2', dow: 'Mar', dom: '03', month: 'juin', full: 'mardi 3 juin' },
  { key: 'd3', dow: 'Mer', dom: '04', month: 'juin', full: 'mercredi 4 juin' },
  { key: 'd4', dow: 'Jeu', dom: '05', month: 'juin', full: 'jeudi 5 juin' },
  { key: 'd5', dow: 'Ven', dom: '06', month: 'juin', full: 'vendredi 6 juin' },
];

const SLOTS = [
  { t: '09:00', off: false }, { t: '10:30', off: true }, { t: '11:30', off: false },
  { t: '14:00', off: false }, { t: '15:30', off: false }, { t: '16:30', off: true },
  { t: '17:30', off: false }, { t: '18:30', off: false },
];

const STEPS = ['Créneau', 'Modalité', 'Paiement', 'Confirmation'];

// DAYS/SLOTS above are UI-only mock content (R3: no calendar/availability engine in this
// plan) — French month name, no year. This maps what's already selected into a real ISO
// datetime for the backend, without changing the picker itself.
const FRENCH_MONTHS = {
  janvier: '01', février: '02', mars: '03', avril: '04', mai: '05', juin: '06',
  juillet: '07', août: '08', septembre: '09', octobre: '10', novembre: '11', décembre: '12',
};

function buildDateHeureIso(day, slotTime) {
  const year = new Date().getFullYear();
  const month = FRENCH_MONTHS[day.month] ?? '01';
  return `${year}-${month}-${day.dom}T${slotTime}:00`;
}

function PaymentForm({ booking, total, onBack, onSuccess }) {
  const stripe = useStripe();
  const elements = useElements();
  const toast = useToast();
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState('');

  async function pay() {
    if (!stripe || !elements) return;
    setPaying(true);
    setError('');
    const { error: submitError } = await elements.submit();
    if (submitError) {
      setError(submitError.message);
      setPaying(false);
      return;
    }
    const { error: confirmError } = await stripe.confirmPayment({
      elements,
      clientSecret: booking.clientSecret,
      confirmParams: { return_url: window.location.href },
      redirect: 'if_required',
    });
    if (confirmError) {
      setError(confirmError.message);
      toast(confirmError.message, 'error');
      setPaying(false);
      return;
    }
    toast('Paiement confirmé', 'success');
    onSuccess();
  }

  return (
    <div className="card card-pad">
      <h3 className="h-4 mb-3">Paiement sécurisé</h3>
      <PaymentElement />
      {error && (
        <p className="tiny" style={{ color: 'var(--danger, #C0524A)', marginTop: 8 }}>{error}</p>
      )}
      <p className="tiny muted row gap-2" style={{ marginTop: 8 }}>
        <Icon name="shield" size={14} color="var(--muted)" /> Paiement chiffré. Vos données ne sont jamais stockées en clair.
      </p>
      <div className="row gap-3 mt-6 between">
        <button type="button" className="btn btn-ghost btn-lg" onClick={onBack} disabled={paying}>
          <Icon name="arrowLeft" size={16} /> Retour
        </button>
        <button type="button" className="btn btn-aurora btn-lg" onClick={pay} disabled={paying || !stripe || !elements}>
          {paying ? 'Paiement en cours…' : `Payer ${euro(total)}`}
        </button>
      </div>
    </div>
  );
}

export function BookingFlow({ p }) {
  const [step, setStep] = useState(1);
  const [day, setDay] = useState('');
  const [slot, setSlot] = useState('');
  const [mode, setMode] = useState('');
  const [promoCode, setPromoCode] = useState('');
  const [promoState, setPromoState] = useState({ status: 'idle' }); // idle | checking | valid | invalid
  const [booking, setBooking] = useState(null); // { rendezVous, clientSecret }
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const toast = useToast();

  const canPresentiel = !/visio uniquement/i.test(p.mode || '');
  const canVisio = /visio/i.test(p.mode || '');

  const selectedDay = DAYS.find((d) => d.key === day);

  const discountedPrice = computeDiscountedTarif(
    p.price,
    promoState.status === 'valid' ? promoState.promo : null,
  );
  const total = booking ? booking.rendezVous.tarif : discountedPrice;

  const next = () => setStep((s) => Math.min(4, s + 1));
  const back = () => setStep((s) => Math.max(1, s - 1));
  const pct = (step / STEPS.length) * 100;

  const step1Ready = day && slot;
  const step2Ready = !!mode;

  async function applyPromo() {
    if (!promoCode.trim()) return;
    setPromoState({ status: 'checking' });
    try {
      const res = await api.post('/promotions/validate', { code: promoCode.trim() });
      setPromoState({ status: 'valid', promo: res.data });
      toast('Code promo appliqué', 'success');
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Code promo invalide';
      setPromoState({ status: 'invalid', message });
      toast(message, 'error');
    }
  }

  async function createBooking() {
    setCreating(true);
    setCreateError('');
    try {
      const res = await api.post('/rendez-vous', {
        praticien_id: Number(p.id),
        date_heure: buildDateHeureIso(selectedDay, slot),
        mode,
        ...(promoState.status === 'valid' ? { promotion_code: promoState.promo.code } : {}),
      });
      setBooking({ rendezVous: res.data.rendez_vous, clientSecret: res.data.client_secret });
    } catch (err) {
      setCreateError(err instanceof ApiError ? err.message : 'Impossible de créer la réservation');
    } finally {
      setCreating(false);
    }
  }

  return (
    <section className="section">
      <div className="container">
        {/* Top bar */}
        <div className="between wrap gap-3" style={{ marginBottom: 24 }}>
          <Link href={`/praticien/${p.id}`} className="btn btn-ghost btn-sm">
            <Icon name="chevronLeft" size={16} /> Retour au profil
          </Link>
          <div className="row gap-2" style={{ color: 'var(--muted)' }}>
            <Lotus size={16} color="var(--violet-2)" />
            <span className="small">Réservation sécurisée</span>
          </div>
        </div>

        {/* Progress */}
        <div className="reveal" style={{ marginBottom: 28 }}>
          <div className="between" style={{ marginBottom: 10 }}>
            {STEPS.map((label, i) => (
              <div key={label} className="row gap-2" style={{ opacity: step >= i + 1 ? 1 : 0.4 }}>
                <span style={{
                  width: 26, height: 26, borderRadius: 999, display: 'grid', placeItems: 'center',
                  fontSize: 13, fontWeight: 600,
                  background: step > i + 1 ? 'var(--violet-2)' : step === i + 1 ? 'var(--violet)' : 'var(--line)',
                  color: step >= i + 1 ? '#fff' : 'var(--muted)',
                }}>
                  {step > i + 1 ? <Icon name="check" size={14} color="#fff" /> : i + 1}
                </span>
                <span className="small" style={{ display: 'none' }}>{label}</span>
                <span className="small hide-sm">{label}</span>
              </div>
            ))}
          </div>
          <div style={{ height: 6, borderRadius: 999, background: 'var(--line)', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg,var(--violet),var(--violet-2))', transition: 'width .4s ease' }} />
          </div>
        </div>

        <div className="grid" style={{ gridTemplateColumns: 'minmax(0,1fr) 340px', gap: 28, alignItems: 'start' }}>
          {/* Main column */}
          <div>
            {/* STEP 1 */}
            {step === 1 && (
              <div className="reveal">
                <span className="eyebrow">Étape 1</span>
                <h1 className="h-2" style={{ margin: '6px 0 4px' }}>
                  Choisissez votre <span className="serif-accent">jour</span>
                </h1>
                <p className="body mb-4">Sélectionnez une date puis un créneau disponible.</p>

                <div className="row gap-3 wrap" style={{ marginBottom: 28 }}>
                  {DAYS.map((d) => {
                    const active = day === d.key;
                    return (
                      <button
                        key={d.key}
                        type="button"
                        onClick={() => { setDay(d.key); setSlot(''); }}
                        className="card-hover"
                        style={{
                          flex: '1 1 96px', minWidth: 88, padding: '16px 8px', borderRadius: 20,
                          textAlign: 'center', cursor: 'pointer',
                          border: `1.5px solid ${active ? 'var(--violet-2)' : 'var(--line)'}`,
                          background: active ? 'rgba(164,139,216,0.10)' : 'var(--card)',
                        }}
                      >
                        <div className="tiny" style={{ color: active ? 'var(--violet-2)' : 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em' }}>{d.dow}</div>
                        <div className="serif" style={{ fontSize: 28, lineHeight: 1.1, color: active ? 'var(--violet-2)' : 'var(--ink)' }}>{d.dom}</div>
                        <div className="tiny muted">{d.month}</div>
                      </button>
                    );
                  })}
                </div>

                <h3 className="h-4 mb-3">Créneaux {selectedDay ? `— ${selectedDay.full}` : ''}</h3>
                {!day && <p className="note">Choisissez d’abord un jour pour voir les créneaux.</p>}
                {day && (
                  <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(110px,1fr))', gap: 12 }}>
                    {SLOTS.map((s) => {
                      const active = slot === s.t;
                      return (
                        <button
                          key={s.t}
                          type="button"
                          disabled={s.off}
                          onClick={() => setSlot(s.t)}
                          className="chip"
                          style={{
                            justifyContent: 'center', padding: '12px 0', borderRadius: 14,
                            cursor: s.off ? 'not-allowed' : 'pointer',
                            opacity: s.off ? 0.4 : 1,
                            textDecoration: s.off ? 'line-through' : 'none',
                            border: `1.5px solid ${active ? 'var(--violet-2)' : 'var(--line)'}`,
                            background: active ? 'var(--violet-2)' : 'var(--card)',
                            color: active ? '#fff' : 'var(--ink)',
                          }}
                        >
                          {s.t}
                        </button>
                      );
                    })}
                  </div>
                )}

                <div className="row gap-3 mt-6">
                  <button type="button" className="btn btn-primary btn-lg" disabled={!step1Ready} onClick={next}>
                    Continuer <Icon name="arrowRight" size={16} color="#fff" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2 */}
            {step === 2 && (
              <div className="reveal">
                <span className="eyebrow">Étape 2</span>
                <h1 className="h-2" style={{ margin: '6px 0 4px' }}>
                  Comment souhaitez-vous <span className="serif-accent">vivre la séance</span> ?
                </h1>
                <p className="body mb-4">{p.name} propose : {p.mode}.</p>

                <div className="grid grid-2" style={{ gap: 16 }}>
                  {[
                    { key: 'présentiel', icon: 'pin', title: 'En présentiel', desc: `Au cabinet de ${p.name.split(' ')[0]}, à ${p.city}.`, avail: canPresentiel },
                    { key: 'visio', icon: 'video', title: 'En visio', desc: 'Depuis chez vous, lien sécurisé envoyé avant la séance.', avail: canVisio },
                  ].map((m) => {
                    const active = mode === m.key;
                    return (
                      <button
                        key={m.key}
                        type="button"
                        disabled={!m.avail}
                        onClick={() => setMode(m.key)}
                        className="card card-pad card-hover"
                        style={{
                          textAlign: 'left', cursor: m.avail ? 'pointer' : 'not-allowed',
                          opacity: m.avail ? 1 : 0.45,
                          border: `1.5px solid ${active ? 'var(--violet-2)' : 'var(--line)'}`,
                          background: active ? 'rgba(164,139,216,0.08)' : 'var(--card)',
                        }}
                      >
                        <span className="tile-icon tint-violet" style={{ marginBottom: 12 }}>
                          <Icon name={m.icon} size={20} color="var(--violet-2)" />
                        </span>
                        <div className="between">
                          <h3 className="h-3">{m.title}</h3>
                          {active && <Icon name="checkCircle" size={20} color="var(--violet-2)" />}
                        </div>
                        <p className="body" style={{ marginTop: 4 }}>{m.desc}</p>
                        {!m.avail && <Badge variant="neutral">Non proposé</Badge>}
                      </button>
                    );
                  })}
                </div>

                <div className="row gap-3 mt-6 between">
                  <button type="button" className="btn btn-ghost btn-lg" onClick={back}>
                    <Icon name="arrowLeft" size={16} /> Retour
                  </button>
                  <button type="button" className="btn btn-primary btn-lg" disabled={!step2Ready} onClick={next}>
                    Continuer <Icon name="arrowRight" size={16} color="#fff" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3 */}
            {step === 3 && (
              <div className="reveal">
                <span className="eyebrow">Étape 3</span>
                <h1 className="h-2" style={{ margin: '6px 0 4px' }}>
                  Récapitulatif &amp; <span className="serif-accent">paiement</span>
                </h1>
                <p className="body mb-4">Le montant est débité à la confirmation du paiement. Annulation gratuite jusqu’à 24h avant.</p>

                <div className="card card-pad mb-4">
                  <h3 className="h-4 mb-3">Votre séance</h3>
                  <dl className="dl">
                    <dt>Praticien</dt><dd>{p.name}</dd>
                    <dt>Discipline</dt><dd>{p.specialties.join(' · ')}</dd>
                    <dt>Date</dt><dd>{selectedDay?.full} à {slot}</dd>
                    <dt>Modalité</dt><dd style={{ textTransform: 'capitalize' }}>{mode}</dd>
                    <dt>Durée</dt><dd>{p.duration} min</dd>
                  </dl>
                </div>

                {!booking && (
                  <div className="card card-pad">
                    <h3 className="h-4 mb-3">Code promo</h3>
                    <div className="field">
                      <div className="row gap-2">
                        <input
                          className="input"
                          placeholder="AURA10"
                          value={promoCode}
                          onChange={(e) => { setPromoCode(e.target.value); setPromoState({ status: 'idle' }); }}
                          style={{ flex: 1 }}
                        />
                        <button
                          type="button"
                          className="btn btn-soft"
                          onClick={applyPromo}
                          disabled={promoState.status === 'checking' || !promoCode.trim()}
                        >
                          {promoState.status === 'checking' ? 'Vérification…' : 'Appliquer'}
                        </button>
                      </div>
                      {promoState.status === 'valid' && (
                        <p className="tiny" style={{ color: 'var(--sage-2, #6BA77C)', marginTop: 6 }}>
                          Code {promoState.promo.code} appliqué — nouveau total {euro(discountedPrice)}
                        </p>
                      )}
                      {promoState.status === 'invalid' && (
                        <p className="tiny" style={{ color: 'var(--danger, #C0524A)', marginTop: 6 }}>{promoState.message}</p>
                      )}
                    </div>
                    {createError && (
                      <p className="tiny" style={{ color: 'var(--danger, #C0524A)', marginTop: 8 }}>{createError}</p>
                    )}
                    <div className="row gap-3 mt-6 between">
                      <button type="button" className="btn btn-ghost btn-lg" onClick={back}>
                        <Icon name="arrowLeft" size={16} /> Retour
                      </button>
                      <button type="button" className="btn btn-aurora btn-lg" onClick={createBooking} disabled={creating}>
                        {creating ? 'Préparation du paiement…' : `Continuer vers le paiement · ${euro(discountedPrice)}`}
                      </button>
                    </div>
                  </div>
                )}

                {booking && (
                  <Elements stripe={stripePromise} options={{ clientSecret: booking.clientSecret }}>
                    <PaymentForm
                      booking={booking}
                      total={booking.rendezVous.tarif}
                      onBack={() => setBooking(null)}
                      onSuccess={() => setStep(4)}
                    />
                  </Elements>
                )}
              </div>
            )}

            {/* STEP 4 */}
            {step === 4 && (
              <div className="reveal center" style={{ padding: '24px 0' }}>
                <span style={{
                  width: 84, height: 84, borderRadius: 999, display: 'grid', placeItems: 'center',
                  margin: '0 auto 20px', background: 'rgba(122,178,140,0.15)',
                }}>
                  <Icon name="checkCircle" size={44} color="var(--sage-2, #6BA77C)" />
                </span>
                <span className="eyebrow">C’est confirmé</span>
                <h1 className="h-1" style={{ margin: '8px 0 10px' }}>
                  Votre séance est <span className="serif-accent">réservée</span>
                </h1>
                <p className="lead" style={{ maxWidth: 440, margin: '0 auto 24px' }}>
                  Un email de confirmation vient de vous être envoyé. {p.name.split(' ')[0]} a été prévenu(e).
                </p>

                <div className="card card-pad" style={{ maxWidth: 440, margin: '0 auto 26px', textAlign: 'left' }}>
                  <div className="row gap-3" style={{ marginBottom: 14 }}>
                    <Avatar src={p.photo} name={p.name} tone={p.tone} size={52} rounded />
                    <div>
                      <div className="serif" style={{ fontSize: 18 }}>{p.name}</div>
                      <Rating value={p.rating} count={p.reviews} size={13} showCount />
                    </div>
                  </div>
                  <div className="divider" />
                  <dl className="dl">
                    <dt>Date</dt><dd>{selectedDay?.full} à {slot}</dd>
                    <dt>Modalité</dt><dd style={{ textTransform: 'capitalize' }}>{booking?.rendezVous.mode}</dd>
                    <dt>Total payé</dt><dd>{euro(booking?.rendezVous.tarif ?? 0)}</dd>
                    <dt>Référence</dt><dd>RDV-{booking?.rendezVous.id}</dd>
                  </dl>
                </div>

                <div className="row gap-3" style={{ justifyContent: 'center', flexWrap: 'wrap' }}>
                  <Link href="/compte/reservations" className="btn btn-primary btn-lg">Voir mes réservations</Link>
                  <Link href="/" className="btn btn-ghost btn-lg">Retour à l’accueil</Link>
                </div>
              </div>
            )}
          </div>

          {/* Sticky summary rail */}
          {step < 4 && (
            <aside className="card card-pad" style={{ position: 'sticky', top: 96 }}>
              <div className="row gap-3" style={{ marginBottom: 14 }}>
                <Avatar src={p.photo} name={p.name} tone={p.tone} size={52} rounded />
                <div>
                  <div className="serif" style={{ fontSize: 18, lineHeight: 1.15 }}>{p.name}</div>
                  <div className="tiny muted">{p.specialties.join(' · ')}</div>
                  {p.verified && <Badge variant="verified" dot>Vérifiée</Badge>}
                </div>
              </div>
              <div className="divider" />
              <dl className="dl" style={{ margin: '4px 0' }}>
                <dt>Jour</dt><dd>{selectedDay ? selectedDay.full : <span className="muted">—</span>}</dd>
                <dt>Créneau</dt><dd>{slot || <span className="muted">—</span>}</dd>
                <dt>Modalité</dt><dd style={{ textTransform: 'capitalize' }}>{mode || <span className="muted">—</span>}</dd>
              </dl>
              <div className="divider" />
              <div className="between" style={{ marginTop: 6 }}>
                <span className="small muted">Séance ({p.duration} min)</span>
                <span className="small">{euro(p.price)}</span>
              </div>
              {promoState.status === 'valid' && (
                <div className="between" style={{ marginTop: 4 }}>
                  <span className="small muted">Réduction ({promoState.promo.code})</span>
                  <span className="small">−{euro(p.price - discountedPrice)}</span>
                </div>
              )}
              <div className="between" style={{ marginTop: 10 }}>
                <span className="serif" style={{ fontSize: 17 }}>Total</span>
                <span className="price" style={{ fontSize: 22 }}>{euro(total)}</span>
              </div>
              <p className="tiny muted row gap-2" style={{ marginTop: 14 }}>
                <Icon name="shield" size={14} color="var(--muted)" /> Débité à la confirmation du paiement
              </p>
            </aside>
          )}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 8: Verify the build compiles**

Run (in `web/`): `npm run build`
Expected: Build succeeds (compiles the new Stripe imports and JSX; no runtime errors from `loadStripe` being called at module scope — it lazily loads Stripe.js and doesn't throw synchronously even with an empty publishable key).

- [ ] **Step 9: Run the full web unit test suite to check for regressions**

Run (in `web/`): `npm test`
Expected: PASS, 8 tests total — the pre-existing `api.test.js` (3) plus the new `pricing.test.js` (5) from Step 6.

- [ ] **Step 10: Commit**

```bash
git add web/package.json web/package-lock.json web/.env.development web/lib/pricing.js web/lib/pricing.test.js "web/app/(site)/reserver/[id]/BookingFlow.jsx"
git commit -m "feat(web): wire BookingFlow to real Stripe Elements payment"
```

---

## Task 10: Mobile — `@stripe/stripe-react-native` install + provider

**Files:**
- Modify: `mobile/package.json`, `mobile/.env.development`, `mobile/app.json`, `mobile/app/_layout.tsx`

**Context7 verification:** `mcp__context7__query-docs` against `/stripe/stripe-react-native` confirmed: install via `expo install @stripe/stripe-react-native` (not plain `npm install` — this is a native module, and `expo install` resolves the version compatible with this project's Expo SDK 54); the app must be wrapped in `<StripeProvider publishableKey={...}>`; `useStripe()` returns `{initPaymentSheet, presentPaymentSheet}`; and the Expo config-plugin shape to add to `app.json`'s `"plugins"` array is `["@stripe/stripe-react-native", {"merchantIdentifier": ..., "enableGooglePay": ...}]`. The docs also state a native rebuild (`expo prebuild`) is required after adding the plugin — this project has no `ios`/`android` directories today (managed workflow), so the Payment Sheet cannot be exercised in Expo Go; a development build is required (see Prerequisites). `mobile/.npmrc` (checked — still has `legacy-peer-deps=true` from Plan 01) means the install won't need extra flags.

- [ ] **Step 1: Install the Stripe React Native SDK**

Run (in `mobile/`): `npx expo install @stripe/stripe-react-native`

- [ ] **Step 2: Append the publishable key env var**

Modify `mobile/.env.development` — append:

```
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=
```

- [ ] **Step 3: Add the Expo config plugin**

Modify `mobile/app.json` — add the plugin entry to the existing `"plugins"` array (Apple Pay's `merchantIdentifier` is left unset; it needs a real Apple Developer merchant ID that doesn't exist yet, out of scope here — cards still work without it, only Apple Pay as a payment method would be unavailable):

```json
    "plugins": [
      [
        "expo-router",
        {
          "origin": false
        }
      ],
      "expo-font",
      [
        "@stripe/stripe-react-native",
        {
          "enableGooglePay": false
        }
      ]
    ],
```

- [ ] **Step 4: Wrap the app in `StripeProvider`**

Modify `mobile/app/_layout.tsx` — add the import and constant, and wrap the existing `<QueryClientProvider>` subtree. `urlScheme` uses the app's existing `"scheme": "aura"` from `app.json` (needed so 3D Secure / bank-redirect flows return to the app correctly):

```tsx
import 'react-native-gesture-handler';
import React from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StripeProvider } from '@stripe/stripe-react-native';
import { StatusBar } from 'expo-status-bar';
import {
  useFonts,
  CormorantGaramond_300Light,
  CormorantGaramond_300Light_Italic,
  CormorantGaramond_400Regular,
  CormorantGaramond_400Regular_Italic,
  CormorantGaramond_500Medium,
  CormorantGaramond_500Medium_Italic,
  CormorantGaramond_600SemiBold,
} from '@expo-google-fonts/cormorant-garamond';
import {
  Outfit_300Light,
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold,
} from '@expo-google-fonts/outfit';
import { colors } from '@theme/colors';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const STRIPE_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '';

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    CormorantGaramond_300Light,
    CormorantGaramond_300Light_Italic,
    CormorantGaramond_400Regular,
    CormorantGaramond_400Regular_Italic,
    CormorantGaramond_500Medium,
    CormorantGaramond_500Medium_Italic,
    CormorantGaramond_600SemiBold,
    Outfit_300Light,
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold,
  });

  if (!fontsLoaded && !fontError) {
    return <View style={{ flex: 1, backgroundColor: colors.pearl }} />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.pearl }}>
      <SafeAreaProvider>
        <StripeProvider publishableKey={STRIPE_PUBLISHABLE_KEY} urlScheme="aura">
          <QueryClientProvider client={queryClient}>
            <StatusBar style="dark" />
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.pearl },
                animation: 'slide_from_right',
              }}
            >
              <Stack.Screen name="index" options={{ animation: 'fade' }} />
              <Stack.Screen name="onboarding/index" options={{ animation: 'fade' }} />
              <Stack.Screen name="onboarding/role" />
              <Stack.Screen name="onboarding/auth" />
              <Stack.Screen name="onboarding/quiz" />
              <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
              <Stack.Screen
                name="praticien/[id]"
                options={{ animation: 'slide_from_bottom' }}
              />
              <Stack.Screen name="domain/[slug]" />
              <Stack.Screen name="booking/slot" />
              <Stack.Screen name="booking/payment" />
              <Stack.Screen name="booking/confirmation" options={{ animation: 'fade' }} />
              <Stack.Screen name="chat/[id]" />
              <Stack.Screen name="event/[id]" />
              <Stack.Screen name="exchange/index" />
              <Stack.Screen name="exchange/[id]" />
              <Stack.Screen name="exchange/create" options={{ presentation: 'modal' }} />
              <Stack.Screen name="review" options={{ presentation: 'modal' }} />
              <Stack.Screen name="report" options={{ presentation: 'modal' }} />
              <Stack.Screen name="founder" />
              <Stack.Screen name="dashboard" />
              <Stack.Screen name="subscription" />
            </Stack>
          </QueryClientProvider>
        </StripeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
```

- [ ] **Step 5: Verify types compile**

Run (in `mobile/`): `npm run typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add mobile/package.json mobile/package-lock.json mobile/.env.development mobile/app.json mobile/app/_layout.tsx
git commit -m "feat(mobile): add Stripe React Native provider and config"
```

> **Note:** a native rebuild (`npx expo prebuild` then `npx expo run:ios` / `npx expo run:android`, or an EAS development build) is required before the Payment Sheet can actually be exercised on a device or simulator — this sandbox has neither, so verification for this task and Task 12 stops at `npm run typecheck`.

---

## Task 11: Mobile — `rendezVousRepo` + types

**Files:**
- Modify: `mobile/src/data/types.ts`, `mobile/src/data/repos/index.ts`
- Test: `mobile/src/data/repos/rendezVous.test.ts` (create)

The nested `praticien` object returned by `GET /api/rendez-vous/client/:id` is the backend's raw `Praticien` entity shape (French DB field names: `firstname`, `lastname`, `ville`, `tarif`) — **not** the mobile `Practitioner` display type, which is a mapped/renamed shape produced only by `practitionerRepo`'s own methods. A new, separate, minimal type models this correctly instead of reusing `Practitioner` for something it doesn't describe.

- [ ] **Step 1: Add the types**

Modify `mobile/src/data/types.ts` — append at the end of the file:

```typescript
export interface RendezVousPraticien {
  id: number;
  firstname: string;
  lastname: string;
  ville: string;
  specialite: string;
  tarif: number;
}

export interface RendezVous {
  id: number;
  client_id: number;
  praticien_id: number;
  date_heure: string;
  duree_minutes: number;
  mode: 'présentiel' | 'visio';
  statut: 'en_attente' | 'confirme' | 'annule' | 'termine';
  tarif: number;
  promotion_id: number | null;
  stripe_payment_intent_id: string | null;
  created_at: string;
  updated_at: string;
  praticien?: RendezVousPraticien;
}
```

- [ ] **Step 2: Write the failing test**

Create `mobile/src/data/repos/rendezVous.test.ts` — mirrors `mobile/src/data/api/client.test.ts`'s mocked-`fetch` style:

```typescript
import { rendezVousRepo } from './index';
import { setAuthToken } from '../api/client';

function mockFetch(status: number, body?: unknown) {
  return jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    text: async () => (body === undefined ? '' : JSON.stringify(body)),
  });
}

describe('rendezVousRepo', () => {
  beforeEach(() => setAuthToken('test-token'));

  it('create posts to /rendez-vous and unwraps { rendez_vous, client_secret }', async () => {
    const payload = {
      status: 'success',
      data: { rendez_vous: { id: 1, statut: 'en_attente' }, client_secret: 'secret_abc' },
    };
    (global as any).fetch = mockFetch(201, payload);
    const res = await rendezVousRepo.create({
      praticien_id: 1, date_heure: '2026-08-01T10:00:00', mode: 'présentiel',
    });
    expect(res.client_secret).toBe('secret_abc');
    expect(res.rendez_vous.id).toBe(1);
    const [url, opts] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toContain('/rendez-vous');
    expect(opts.method).toBe('POST');
  });

  it('byId fetches /rendez-vous/client/:id and unwraps the rendez_vous', async () => {
    (global as any).fetch = mockFetch(200, { status: 'success', data: { id: 5, statut: 'confirme' } });
    const res = await rendezVousRepo.byId(5);
    expect(res.id).toBe(5);
    const [url] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toContain('/rendez-vous/client/5');
  });

  it('cancel posts to /rendez-vous/client/:id/cancel', async () => {
    (global as any).fetch = mockFetch(200, { status: 'success', data: { id: 5, statut: 'annule' } });
    await rendezVousRepo.cancel(5);
    const [url, opts] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toContain('/rendez-vous/client/5/cancel');
    expect(opts.method).toBe('POST');
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run (in `mobile/`): `npm test -- rendezVous`
Expected: FAIL — `rendezVousRepo` is not exported from `./index` yet.

- [ ] **Step 4: Replace `bookingRepo` with `rendezVousRepo`**

Modify `mobile/src/data/repos/index.ts` — add the `api` import and `RendezVous` type import, and replace the entire `// ---------- Bookings ----------` section at the bottom of the file (full resulting file):

```typescript
/**
 * Repository layer — every screen reads through these functions.
 * Frontend-only build: all reads are served from the in-memory mock data
 * in `src/data/mock/*`. If a backend is ever added, replace the body of each
 * function — screens never need to change.
 */
import { practitionersMock, reviewsMock } from '../mock/practitioners';
import { disciplinesMock } from '../mock/disciplines';
import { eventsMock } from '../mock/events';
import { exchangesMock } from '../mock/exchanges';
import { conversationsMock, sampleChat } from '../mock/messages';
import {
  practitionerImages,
  disciplineImageSource,
} from '../images';
import { api } from '../api/client';
import type {
  Practitioner,
  Discipline,
  Event,
  Exchange,
  Conversation,
  ChatMessage,
  RendezVous,
} from '../types';

const delay = <T>(value: T, ms = 60): Promise<T> =>
  new Promise((r) => setTimeout(() => r(value), ms));

// Attach registry images onto the plain mock objects.
const withImages = (p: Practitioner): Practitioner => {
  const imgs = practitionerImages[p.id];
  if (!imgs) return p;
  return { ...p, photo: imgs.avatar, hero: imgs.hero, gallery: imgs.gallery };
};

const decoratedPractitioners = practitionersMock.map(withImages);

const withDisciplineImage = (d: Discipline): Discipline => ({
  ...d,
  heroImage: disciplineImageSource(d.slug),
});

const decoratedDisciplines = disciplinesMock.map(withDisciplineImage);

// ---------- Practitioners ----------
export const practitionerRepo = {
  list: (): Promise<Practitioner[]> => delay(decoratedPractitioners),
  byId: (id: string): Promise<Practitioner | undefined> =>
    delay(decoratedPractitioners.find((p) => p.id === id)),
  byDiscipline: (disciplineName: string): Promise<Practitioner[]> =>
    delay(
      decoratedPractitioners.filter((p) =>
        p.specialties.includes(disciplineName)
      )
    ),
  recommended: (): Promise<Practitioner[]> =>
    delay(decoratedPractitioners.slice(0, 4)),
  reviewsFor: (practitionerId: string) =>
    delay(reviewsMock.filter((r) => r.practitionerId === practitionerId)),
};

// ---------- Disciplines ----------
export const disciplineRepo = {
  list: (): Promise<Discipline[]> => delay(decoratedDisciplines),
  bySlug: (slug: string): Promise<Discipline | undefined> =>
    delay(decoratedDisciplines.find((d) => d.slug === slug)),
};

// ---------- Events ----------
export const eventRepo = {
  list: (): Promise<Event[]> => delay(eventsMock),
  byId: (id: string): Promise<Event | undefined> =>
    delay(eventsMock.find((e) => e.id === id)),
  featured: (): Promise<Event[]> => delay(eventsMock.slice(0, 2)),
};

// ---------- Exchanges ----------
export const exchangeRepo = {
  list: (): Promise<Exchange[]> => delay(exchangesMock),
  byId: (id: string): Promise<Exchange | undefined> =>
    delay(exchangesMock.find((x) => x.id === id)),
  create: (draft: Partial<Exchange>): Promise<Exchange> => {
    const created: Exchange = {
      id: `x${Date.now()}`,
      who: 'Vous',
      role: 'Annecy',
      give: draft.give ?? '',
      want: draft.want ?? '',
      tag: (draft.tag ?? 'Soin contre soin') as Exchange['tag'],
      avatar: ['#C4B0E8', '#A8C8E8'] as const,
      ...draft,
    };
    exchangesMock.unshift(created);
    return delay(created);
  },
};

// ---------- Messaging ----------
export const messageRepo = {
  conversations: (): Promise<Conversation[]> => delay(conversationsMock),
  conversation: (id: string): Promise<Conversation | undefined> =>
    delay(conversationsMock.find((c) => c.id === id)),
  messages: (conversationId: string): Promise<ChatMessage[]> =>
    delay(sampleChat(conversationId)),
};

// ---------- Bookings ----------
interface CreateRendezVousParams {
  praticien_id: number;
  date_heure: string;
  mode: 'présentiel' | 'visio';
  promotion_code?: string;
}

export const rendezVousRepo = {
  create: (params: CreateRendezVousParams): Promise<{ rendez_vous: RendezVous; client_secret: string }> =>
    api
      .post<{ status: string; data: { rendez_vous: RendezVous; client_secret: string } }>('/rendez-vous', params)
      .then((res) => res.data),

  byId: (id: number): Promise<RendezVous> =>
    api.get<{ status: string; data: RendezVous }>(`/rendez-vous/client/${id}`).then((res) => res.data),

  cancel: (id: number): Promise<RendezVous> =>
    api.post<{ status: string; data: RendezVous }>(`/rendez-vous/client/${id}/cancel`).then((res) => res.data),
};
```

- [ ] **Step 5: Run the test to verify it passes**

Run (in `mobile/`): `npm test -- rendezVous`
Expected: PASS (3 tests).

- [ ] **Step 6: Verify types compile and the full mobile test suite is green**

Run (in `mobile/`): `npm run typecheck && npm test`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add mobile/src/data/types.ts mobile/src/data/repos/index.ts mobile/src/data/repos/rendezVous.test.ts
git commit -m "feat(mobile): add rendezVousRepo calling the real booking API"
```

---

## Task 12: Mobile — Stripe Payment Sheet in `payment.tsx` + real `confirmation.tsx`

**Files:**
- Create: `mobile/src/utils/booking.ts`, `mobile/src/utils/booking.test.ts`
- Modify: `mobile/app/booking/payment.tsx`, `mobile/app/booking/confirmation.tsx`

`rendezVousRepo` (Task 11) and the `StripeProvider`/config plugin (Task 10) already exist by this point — this task is the actual screen wiring: replace the stub `bookingRepo.hold(...)` call and the hardcoded `subtotal`/`platform` fee with a real `rendezVousRepo.create()` call followed by the real Payment Sheet, then make `confirmation.tsx` render what actually comes back instead of the hardcoded "Élodie Marceau" / "Magnétisme · 75 min" placeholder content.

**Context7 verification:** `mcp__context7__query-docs` against `/stripe/stripe-react-native` (same library Task 10 already resolved) confirmed the exact Payment Sheet call sequence used below, straight from the SDK's own README and `etc/stripe-react-native.api.md`: `const {initPaymentSheet, presentPaymentSheet} = useStripe();`, then `await initPaymentSheet({merchantDisplayName, paymentIntentClientSecret})` — `paymentIntentClientSecret` is the only *required* field; `returnURL` is optional and, per `handleNextAction`'s own doc ("If not provided, the SDK will attempt to use the configured return URL"), falls back to the `urlScheme` already configured on `<StripeProvider>` in Task 10, so it's deliberately omitted here rather than duplicated. This is followed by `await presentPaymentSheet()`, which resolves `{error, didCancel, paymentOption}`. The documented `PaymentSheetError` code values are exactly `'Canceled' | 'Failed' | 'Timeout'` — confirming `error.code === 'Canceled'` (used below to swallow a user-dismissed sheet without showing an error toast, while still surfacing `Failed`/`Timeout`) is a real, current SDK value and not a guess.

No component-rendering test harness exists for RN screens in this codebase (mirrors the web situation in Task 9 — Plan 01 never set one up on either platform). `buildDateHeureIso` is the one piece of pure logic this task introduces, so it gets the same TDD treatment as its web counterpart (Task 9, Steps 3–6); the screens themselves are verified via `npm run typecheck` plus the full `npm test` run in Step 8.

- [ ] **Step 1: Write the failing test for the slot→ISO helper**

Mobile's day/slot picker (`app/booking/slot.tsx`) already produces `draft.day.date` as a `'YYYY-MM-DD'` string, but `draft.slot` is a French-style `'XhYY'` label (e.g. `'9h00'`, `'21h15'`) — not a valid time string. Create `mobile/src/utils/booking.test.ts`:

```typescript
import { buildDateHeureIso } from './booking';

describe('buildDateHeureIso', () => {
  it('converts a zero-padded slot label into an ISO datetime', () => {
    expect(buildDateHeureIso('2025-03-26', '14h00')).toBe('2025-03-26T14:00:00');
  });

  it('pads a single-digit hour', () => {
    expect(buildDateHeureIso('2025-03-26', '9h00')).toBe('2025-03-26T09:00:00');
  });

  it('preserves a non-zero minute', () => {
    expect(buildDateHeureIso('2025-03-29', '21h15')).toBe('2025-03-29T21:15:00');
  });

  it('falls back to 00:00 for an unparseable slot rather than throwing', () => {
    expect(buildDateHeureIso('2025-03-26', 'invalid')).toBe('2025-03-26T00:00:00');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run (in `mobile/`): `npm test -- booking.test.ts`
Expected: FAIL — cannot find module `./booking`.

- [ ] **Step 3: Write the helper**

Create `mobile/src/utils/booking.ts`:

```typescript
/**
 * The mobile day/slot picker (`app/booking/slot.tsx`) is UI-only mock content (R3: no
 * calendar/availability engine in this plan) — `day.date` is already an ISO-shaped
 * 'YYYY-MM-DD' string, but `slot` is a French-style 'XhYY' label (e.g. '9h00', '14h30'),
 * not a valid time string. This converts what's already selected into a real ISO datetime
 * for the backend, without changing the picker itself — mirrors web's `buildDateHeureIso`
 * in `BookingFlow.jsx` (Task 9), adapted for mobile's 'XhYY' slot format instead of French
 * month names.
 */
export function buildDateHeureIso(date: string, slot: string): string {
  const match = /^(\d{1,2})h(\d{2})$/.exec(slot);
  const hh = (match?.[1] ?? '00').padStart(2, '0');
  const mm = match?.[2] ?? '00';
  return `${date}T${hh}:${mm}:00`;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run (in `mobile/`): `npm test -- booking.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Rewrite `payment.tsx`**

Read the current file in full first (already done above — this is a complete replacement). The fake `Pay` payment-method tiles (Visa/Apple Pay/"Add a card") are dropped per the Design notes — the Payment Sheet is itself the payment-method UI. The hardcoded `subtotal = 75` / `platform = 3.5` are replaced by the real praticien tarif (fetched the same way `slot.tsx` already fetches the praticien, via `practitionerRepo.byId`) and, once a booking exists, by the server-authoritative `tarif` on the created `rendez_vous` — there is no platform fee anywhere in the locked schema, matching the same fee removal already made on web (Task 9 / Design notes). Booking creation and the Payment Sheet are only triggered once (the created `rendez_vous`/`client_secret` are kept in local state), so retrying after a declined card or a dismissed sheet re-presents the *same* PaymentIntent instead of creating a second `en_attente` row on every tap. Create/overwrite `mobile/app/booking/payment.tsx`:

```tsx
import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useStripe } from '@stripe/stripe-react-native';
import { Button } from '@components/Button';
import { Card } from '@components/Card';
import { EscrowNotice } from '@components/EscrowNotice';
import { Icon } from '@components/Icon';
import { ScreenHeader } from '@components/ScreenHeader';
import { colors } from '@theme/colors';
import { typography } from '@theme/typography';
import { useBooking } from '@store/booking';
import { practitionerRepo, rendezVousRepo } from '@data/repos';
import { buildDateHeureIso } from '@utils/booking';

type Mode = 'présentiel' | 'visio';

interface PendingBooking {
  id: number;
  clientSecret: string;
  tarif: number;
}

export default function BookPayment() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const draft = useBooking((s) => s.draft);
  const [mode, setMode] = useState<Mode>('présentiel');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [pending, setPending] = useState<PendingBooking | null>(null);

  const { data: praticien } = useQuery({
    queryKey: ['practitioner', draft?.practitionerId],
    queryFn: () => practitionerRepo.byId(draft?.practitionerId ?? ''),
    enabled: !!draft?.practitionerId,
  });

  const subtotal = pending?.tarif ?? praticien?.price ?? 0;

  const confirm = async () => {
    if (!draft || !draft.day || !draft.slot) return;
    setSubmitting(true);
    setError('');
    try {
      let booking = pending;
      if (!booking) {
        const { rendez_vous, client_secret } = await rendezVousRepo.create({
          praticien_id: Number(draft.practitionerId),
          date_heure: buildDateHeureIso(draft.day.date, draft.slot),
          mode,
        });
        // Seeds the query cache confirmation.tsx reads from, so its useQuery resolves
        // instantly with data we already have instead of flashing a loading state.
        queryClient.setQueryData(['rendezVous', String(rendez_vous.id)], rendez_vous);
        booking = { id: rendez_vous.id, clientSecret: client_secret, tarif: rendez_vous.tarif };
        setPending(booking);
      }

      const { error: initError } = await initPaymentSheet({
        merchantDisplayName: 'Aura',
        paymentIntentClientSecret: booking.clientSecret,
      });
      if (initError) {
        setError(initError.message);
        return;
      }

      const { error: presentError } = await presentPaymentSheet();
      if (presentError) {
        // A user-dismissed sheet isn't a failure — nothing to show, just let them retry.
        if (presentError.code !== 'Canceled') setError(presentError.message);
        return;
      }

      router.replace(`/booking/confirmation?id=${booking.id}` as any);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Impossible de créer la réservation');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.pearl }}>
      <ScreenHeader title="Confirmer la séance" />
      <ScrollView
        contentContainerStyle={{ paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ paddingHorizontal: 20 }}>
          <Text style={styles.section}>Mode de séance</Text>

          <Pressable
            style={[styles.tile, mode === 'présentiel' && styles.tileActive]}
            onPress={() => setMode('présentiel')}
            disabled={!!pending}
          >
            <View style={styles.tileIcon}>
              <Icon name="inperson" size={22} color={colors.ink} />
            </View>
            <View>
              <Text style={styles.tileH}>En présentiel</Text>
              <Text style={styles.tileP}>Au cabinet, {praticien?.city ?? 'près de vous'}</Text>
            </View>
          </Pressable>
          <Pressable
            style={[styles.tile, mode === 'visio' && styles.tileActive]}
            onPress={() => setMode('visio')}
            disabled={!!pending}
          >
            <View style={styles.tileIcon}>
              <Icon name="video" size={22} color={colors.ink} />
            </View>
            <View>
              <Text style={styles.tileH}>En visio</Text>
              <Text style={styles.tileP}>Lien sécurisé envoyé 30 min avant</Text>
            </View>
          </Pressable>

          <View style={{ height: 14 }} />
          <EscrowNotice
            title="Paiement sécurisé, via Stripe."
            body="Vos coordonnées bancaires ne transitent jamais par nos serveurs. Le prélèvement est confirmé dès la validation du paiement."
          />

          {!!error && <Text style={styles.error}>{error}</Text>}

          <Text style={[styles.section, { marginTop: 24 }]}>Récapitulatif</Text>
          <Card style={{ padding: 18, marginBottom: 24 }}>
            <SummaryRow
              label={`Séance${praticien?.specialties?.[0] ? ` — ${praticien.specialties[0]}` : ''}`}
              value={`${subtotal.toFixed(2)} €`}
            />
            <View style={styles.total}>
              <Text style={styles.totalLabel}>Total à régler</Text>
              <Text style={styles.totalValue}>{subtotal.toFixed(2)} €</Text>
            </View>
          </Card>
        </View>
      </ScrollView>

      <View style={[styles.dock, { paddingBottom: insets.bottom + 14 }]}>
        <Button
          variant="aurora"
          label={submitting ? 'Paiement en cours…' : `Régler ${subtotal.toFixed(2)} € en toute sécurité`}
          leftIcon={<Icon name="shield" size={18} color="#fff" />}
          onPress={confirm}
          disabled={submitting || !draft || !praticien}
        />
      </View>
    </View>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryL}>{label}</Text>
      <Text style={styles.summaryV}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    fontFamily: 'CormorantGaramond_500Medium',
    fontSize: 20,
    color: colors.ink,
    marginBottom: 12,
  },
  tile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 18,
    backgroundColor: '#fff',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: colors.line,
    marginBottom: 10,
  },
  tileActive: { borderColor: colors.violet2, backgroundColor: '#FBF7FF' },
  tileIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.mist,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileH: { fontFamily: 'CormorantGaramond_500Medium', fontSize: 18 },
  tileP: { ...typography.tiny, fontSize: 12 },

  error: { ...typography.small, color: colors.danger, fontSize: 13, marginTop: 10 },

  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  summaryL: { ...typography.small, fontSize: 14 },
  summaryV: { ...typography.body, fontSize: 14 },
  total: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.line,
    marginTop: 6,
    paddingTop: 14,
  },
  totalLabel: { fontFamily: 'Outfit_600SemiBold', fontSize: 16 },
  totalValue: { fontFamily: 'Outfit_600SemiBold', fontSize: 16 },

  dock: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 14,
    backgroundColor: 'rgba(251,249,246,0.96)',
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
});
```

- [ ] **Step 6: Rewrite `confirmation.tsx`**

Read the current file in full first (already done above). `ref` (a fake string like `AURA-...`) becomes `id` (the real numeric `rendez_vous.id`) — `payment.tsx` above now navigates to `?id=${booking.id}`. The screen re-fetches the rendez-vous by that id via `rendezVousRepo.byId` (the query cache was already seeded by `payment.tsx`, so this normally resolves immediately with no loading flash) to render the real praticien name/specialty/tarif/mode instead of the hardcoded "Élodie Marceau" / "Magnétisme · 75 min" — the picked day/slot label is still read from the `useBooking` draft (it's already a human-readable string produced by the same picker `date_heure` was built from in Task 12 Step 5, so there's no reformatting to do). Create/overwrite `mobile/app/booking/confirmation.tsx`:

```tsx
import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { AuroraBackground } from '@components/AuroraBackground';
import { Button } from '@components/Button';
import { Card } from '@components/Card';
import { Lotus } from '@components/Lotus';
import { colors } from '@theme/colors';
import { typography } from '@theme/typography';
import { shadows } from '@theme/shadows';
import { useBooking } from '@store/booking';
import { rendezVousRepo } from '@data/repos';

export default function Confirmation() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const draft = useBooking((s) => s.draft);
  const clear = useBooking((s) => s.clearDraft);

  const { data: rdv } = useQuery({
    queryKey: ['rendezVous', id],
    queryFn: () => rendezVousRepo.byId(Number(id)),
    enabled: !!id,
  });

  const breath = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(breath, { toValue: 1, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(breath, { toValue: 0, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();
  }, [breath]);
  const scale = breath.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] });

  const firstName = rdv?.praticien?.firstname ?? '';
  const praticienName = rdv?.praticien ? `${rdv.praticien.firstname} ${rdv.praticien.lastname}` : '…';

  return (
    <View style={[styles.container, { paddingTop: insets.top + 32 }]}>
      <View style={styles.body}>
        <Animated.View style={[styles.orb, shadows.glow, { transform: [{ scale }] }]}>
          <AuroraBackground variant="soft" style={StyleSheet.absoluteFillObject}>
            <></>
          </AuroraBackground>
          <Lotus size={64} color="#fff" />
        </Animated.View>
        <Text style={styles.title}>
          Votre séance est{'\n'}
          <Text style={styles.italic}>réservée.</Text>
        </Text>
        <Text style={styles.subtitle}>
          {firstName ? `${firstName} a été prévenu(e).` : 'La praticienne a été prévenue.'} Vous recevrez un rappel doux la veille.
        </Text>

        <Card style={styles.detail}>
          <Row label="Praticien" value={praticienName} />
          <Row
            label="Pratique"
            value={`${rdv?.praticien?.specialite ?? '—'} · ${rdv?.duree_minutes ?? 60} min`}
          />
          <Row label="Date" value={draft?.day ? `${draft.day.label} · ${draft.slot}` : '—'} />
          <Row
            label="Mode"
            value={`${rdv?.mode === 'visio' ? 'En visio' : 'En présentiel'}${rdv?.praticien?.ville ? ` · ${rdv.praticien.ville}` : ''}`}
          />
          <Row label="Total payé" value={`${(rdv?.tarif ?? 0).toFixed(2)} €`} />
          <View style={styles.refRow}>
            <Text style={styles.refL}>Réf.</Text>
            <Text style={styles.refV}>RDV-{rdv?.id ?? id}</Text>
          </View>
        </Card>

        <Button
          label={firstName ? `Envoyer un message à ${firstName}` : 'Envoyer un message'}
          onPress={() => {
            clear();
            router.replace('/chat/m1' as any);
          }}
        />
        <Pressable onPress={() => { clear(); router.replace('/(tabs)' as any); }}>
          <Text style={styles.back}>Retour à l'accueil</Text>
        </Pressable>
      </View>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowL}>{label}</Text>
      <Text style={styles.rowV}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.pearl, padding: 24 },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', maxWidth: 360 },
  orb: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
    overflow: 'hidden',
  },
  title: {
    fontFamily: 'CormorantGaramond_300Light',
    fontSize: 38,
    color: colors.ink,
    textAlign: 'center',
    lineHeight: 40,
    marginBottom: 12,
  },
  italic: {
    fontFamily: 'CormorantGaramond_400Regular_Italic',
    color: colors.violet2,
  },
  subtitle: {
    ...typography.body,
    color: colors.muted,
    textAlign: 'center',
    marginBottom: 24,
    maxWidth: 280,
  },
  detail: { width: '100%', padding: 18, marginBottom: 24 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  rowL: { ...typography.small, fontSize: 13 },
  rowV: { ...typography.bodyMedium, fontSize: 13 },
  refRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.line,
    marginTop: 8,
    paddingTop: 14,
  },
  refL: { ...typography.small, fontSize: 13 },
  refV: { color: colors.violet2, fontFamily: 'Outfit_500Medium', fontSize: 13 },
  back: { ...typography.small, color: colors.muted, marginTop: 14 },
});
```

- [ ] **Step 7: Verify types compile**

Run (in `mobile/`): `npm run typecheck`
Expected: PASS.

- [ ] **Step 8: Run the full mobile test suite**

Run (in `mobile/`): `npm test`
Expected: PASS, 10 tests total — `client.test.ts` (3), `rendezVous.test.ts` (3, Task 11), new `booking.test.ts` (4).

- [ ] **Step 9: Commit**

```bash
git add mobile/src/utils/booking.ts mobile/src/utils/booking.test.ts mobile/app/booking/payment.tsx mobile/app/booking/confirmation.tsx
git commit -m "feat(mobile): wire booking payment screen to the real Stripe Payment Sheet"
```

> **Note:** as stated in the Prerequisites section, exercising this on a real device/simulator requires a development build (`npx expo prebuild` + `npx expo run:ios`/`run:android`, or an EAS development build) — this sandbox has neither, so verification for this task stops at `npm run typecheck` and `npm test`.

---

## Task 13: Full cross-codebase verification

**Files:** none (verification only — no commit).

- [ ] **Step 1: Backend full check**

Run (in `server/`): `npm test`
Expected: PASS — includes the 2 new `stripe.service.spec.ts` tests (Task 2) alongside the 6 pre-existing unit spec files (`app.controller`, `all-exceptions.filter`, `common`, `pagination`, `storage`, `transformers`), none of which this plan touched.

Run (in `server/`): `npm run test:e2e`
Expected: PASS — every pre-existing e2e suite is unaffected (in particular `paiements.e2e-spec.ts` / `echanges.e2e-spec.ts` / `remboursements.e2e-spec.ts`, which read `Paiement` rows, and any suite exercising multipart uploads, which proves `rawBody: true` from Task 6 didn't break `FilesInterceptor`), plus the new `rendez-vous.e2e-spec.ts` (12 tests, Tasks 3/4/5/6/8) and the extended `promotions.e2e-spec.ts` (6 tests, was 3, Task 7).

- [ ] **Step 2: Web full check**

Run (in `web/`): `npm test`
Expected: PASS, 8 tests (`api.test.js` 3, `pricing.test.js` 5).

Run (in `web/`): `npm run build`
Expected: build succeeds — `/reserver/[id]` compiles with the Stripe Elements imports; no page exports both `metadata` and client-only hooks.

- [ ] **Step 3: Mobile full check**

Run (in `mobile/`): `npm test`
Expected: PASS, 10 tests (`client.test.ts` 3, `rendezVous.test.ts` 3, `booking.test.ts` 4).

Run (in `mobile/`): `npm run typecheck`
Expected: PASS, no errors — in particular confirms `@stripe/stripe-react-native`'s own type definitions for `initPaymentSheet`/`presentPaymentSheet` line up with how Task 12 calls them.

- [ ] **Step 4: Manual smoke check (documented, not automated — this plan's automated tests never touch real Stripe, per the Prerequisites section; no component-rendering test harness exists on web per Plan 01's scope, and RN screens aren't unit-rendered in this codebase either)**

With real Stripe test-mode keys wired per the Prerequisites section, `stripe listen --forward-to localhost:8000/api/webhooks/stripe` running, `server/` running on `:8000`, and a real Plan-03-registered client logged in on both frontends:
1. Web: `/reserver/[id]` → pick a day/slot → pick a mode → step 3's Payment Element loads (proves `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` and the real `client_secret` round-trip) → pay with Stripe's `4242 4242 4242 4242` test card → step 4 shows the real tarif/mode/reference → the `stripe listen` terminal shows the webhook delivered and returned 200 → the `rendez_vous` row is `confirme` and a matching `paiements` row exists.
2. Web: entering a real promo code (created via `POST /api/promotions` or seeded) in step 3 reduces the displayed total *and* the amount actually charged (visible in the Stripe test-mode dashboard) matches the discounted `tarif`, not the full praticien price.
3. Mobile (requires a development build per Prerequisites item 6 — not exercisable in this sandbox): `booking/slot` → `booking/payment` → the Payment Sheet presents with the same test card → `booking/confirmation` shows the real practitioner name/specialty/tarif/reference, not placeholder text.
4. Webhook idempotency against the real Stripe CLI (already covered by the automated e2e test in Task 6, worth confirming once against the genuine article): resending the same `payment_intent.succeeded` event (`stripe events resend <id>` or replaying it from the Stripe dashboard) does not create a second `paiements` row.

This step has no pass/fail command output to paste — it's a checklist the executing engineer ticks off by hand before considering the plan done.

---

## Self-review checklist (run before handing off)

- [ ] `server/`: `npm test` green, including the 2 new `stripe.service.spec.ts` tests (Task 2). `npm run test:e2e` green, including the new `rendez-vous.e2e-spec.ts` (12 tests, Tasks 3–6/8) and the extended `promotions.e2e-spec.ts` (6 tests, was 3, Task 7).
- [ ] `web/`: `npm test` green, 8 tests (`api.test.js` 3, `pricing.test.js` 5). `npm run build` succeeds.
- [ ] `mobile/`: `npm test` green, 10 tests (`client.test.ts` 3, `rendezVous.test.ts` 3, `booking.test.ts` 4). `npm run typecheck` clean.
- [ ] Every task's Stripe SDK usage (backend `stripe`, web `@stripe/react-stripe-js`, mobile `@stripe/stripe-react-native`) carries a "Context7 verification" paragraph naming the exact library id queried and what was confirmed — none of it was guessed from training data.
- [ ] The webhook (Task 6) is the only code path that ever sets `statut: 'confirme'` or inserts a `paiements` row — `RendezVousService.create()`/`indexForClient()`/`showForClient()`/`cancelForClient()` (Tasks 3–5) never do either.
- [ ] No commit message in this document carries a "Co-Authored-By" trailer or any other AI-attribution line (all 12 are single-line, plain `feat(...)` subjects).
- [ ] The fake payment-method tiles, the flat platform/service fee, and the delayed-release escrow copy called out in Design notes are actually gone from the rewritten `BookingFlow.jsx`/`payment.tsx` — not just described as removed.

## Self-review

**1. Spec coverage** — walked every requirement in the brief against the tasks above:
- `rendez_vous` schema (`client_id, praticien_id, date_heure, duree_minutes, mode, statut, tarif, promotion_id, stripe_payment_intent_id`): Task 1.
- Stripe PaymentIntent integration (server creates the intent, client never sends an amount): Task 2 (`StripeService`) + Task 3 (`RendezVousService.create()` calls it with the server-computed amount).
- Webhook — `POST /api/webhooks/stripe`, raw-body signature verification, idempotent, the *only* place `statut→confirme` and the `paiements` row get created: Task 6, with the idempotency-on-retry behavior itself asserted in Task 6's own test and the resulting relation exercised again in Task 8.
- `POST /api/promotions/validate`, shared with booking creation: Task 3 Step 1 (`PromotionsService.validate()`, needed first since `RendezVousService.create()` depends on it) + Task 7 (the dedicated public route and its own tests).
- Client list/show/cancel endpoints, rounding out the module into something both frontends can actually build a history/cancel UI on later: Tasks 4–5.
- `Paiement.rendezVous`, giving the dangling `paiements.rendez_vous_id` column a real purpose: Task 8.
- Web `BookingFlow.jsx` — step 3 raw card inputs replaced with Stripe Elements, step 4 renders the real returned `rendez_vous`, real promo-validate call, `@stripe/stripe-js`/`@stripe/react-stripe-js` in `package.json`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` in `.env.development`: Task 9 — all five present; the task's one gap (the discount-preview math had no test) was closed during this pass by extracting `computeDiscountedTarif` into `web/lib/pricing.js` with its own Steps 3–6 TDD cycle.
- Mobile `slot.tsx → payment.tsx → confirmation.tsx` via the `useBooking` store — `@stripe/stripe-react-native` in `package.json`, `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` in `.env.development`, `mobile/.npmrc`'s `legacy-peer-deps=true` left untouched: Task 10. `rendezVousRepo` (built fresh, not rebuilt, since Task 11 already existed when this pass started): Task 11. The hardcoded `subtotal=75`/`platform=3.5` and the stub `bookingRepo.hold(...)` call replaced with the real praticien tarif and `rendezVousRepo` + Payment Sheet, `confirmation.tsx` rendering the real returned `rendez_vous`: Task 12 — this was the task missing when this pass started, along with Task 13 and this closing section.
- Context7 verification for all four Stripe SDK surfaces, not guessed: backend `stripe` (Task 2, pinned API version read straight from `stripe-node`'s own source), `@stripe/react-stripe-js` (Task 9, `Elements`/`PaymentElement`/`useStripe`/`useElements`/`confirmPayment`), `@stripe/stripe-react-native` provider setup (Task 10, `StripeProvider`/config plugin/`expo install`), and — added during this pass — `@stripe/stripe-react-native`'s actual payment flow (Task 12, `initPaymentSheet`/`presentPaymentSheet`/`PaymentSheetError` codes, queried fresh rather than assumed from Task 10's provider-level check).
- Full cross-cutting regression pass covering all three codebases plus a manual smoke checklist: Task 13.
- Hard project rule — no AI-attribution commit trailer: verified by grep against the finished document (see checklist above); none found in any of the 12 commits, including the ones written before this pass.
- This closing structure itself (Self-review + Exit criteria): this section and the one below.

**2. Placeholder scan** — grepped the *entire* finished document (not just the content added in this pass) for `TBD`, `TODO`, `FIXME`, "add appropriate", "similar to Task N", "rest of the file", "remains unchanged", "write the rest", and bare trailing ellipses. None found. Every step that touches code shows the complete resulting file or the complete new function, never a description of one — including in Tasks 1–8, which this pass didn't author but is now responsible for the quality of. All 12 commit messages were also re-checked by hand for an AI-attribution trailer; none carry one.

**3. Type/signature consistency** — cross-checked names and shapes across every task that touches them:
- `rendezVousRepo.create(params): Promise<{rendez_vous: RendezVous; client_secret: string}>`, `.byId(id: number): Promise<RendezVous>`, `.cancel(id: number): Promise<RendezVous>` (Task 11) are called with exactly these names and argument shapes in Task 12 — `payment.tsx` destructures `{ rendez_vous, client_secret }` from `.create()`; `confirmation.tsx` calls `.byId(Number(id))`. No call site invents a method Task 11 didn't define.
- `RendezVous`/`RendezVousPraticien` field names (Task 11: `id, client_id, praticien_id, date_heure, duree_minutes, mode, statut, tarif, promotion_id, stripe_payment_intent_id, praticien?`; `RendezVousPraticien: id, firstname, lastname, ville, specialite, tarif`) are used verbatim in Task 12's `confirmation.tsx` (`rdv.praticien.firstname/lastname/specialite/ville`, `rdv.duree_minutes`, `rdv.mode`, `rdv.tarif`, `rdv.id`) — no camelCase remapping layer, matching backend field names directly, the same ground-truth-field-names rule Plan 04 already established for this codebase.
- `BookingDraft` (pre-existing, untouched by this plan: `practitionerId, day?, slot?, mode?, total?`) is only *read* by Task 12, never written — `draft.day.date`/`draft.slot` feed `buildDateHeureIso`; `draft.day.label`/`draft.slot` still drive the human-readable date row on the confirmation screen. The created booking is carried forward via a local `PendingBooking` slice in `payment.tsx` plus a seeded react-query cache entry, not via new fields bolted onto the draft store.
- Query keys match on both ends: `payment.tsx` seeds `['rendezVous', String(rendez_vous.id)]` via `queryClient.setQueryData(...)` right after creation; `confirmation.tsx`'s `useQuery` reads `['rendezVous', id]` where `id` is the route param `payment.tsx` navigated with (`?id=${booking.id}`) — the same string on both sides, so the seeded cache entry is actually hit instead of silently missed.
- `computeDiscountedTarif(price, promo)` (Task 9) and `buildDateHeureIso(date, slot)` (Task 12) are each called with the same parameter order/names at their one respective call site (`BookingFlow.jsx`'s `discountedPrice`; `payment.tsx`'s `date_heure:` field) and each has a red→green test cycle before that call site is written.
- The `POST /api/rendez-vous` response shape `{rendez_vous, client_secret}` (Task 3) is what both `BookingFlow.jsx` (Task 9: `res.data.rendez_vous` / `res.data.client_secret`) and `rendezVousRepo.create` (Task 11, consumed by Task 12) destructure — no field renamed in transit on either platform.
- `PaymentSheetError`'s `'Canceled'` literal (Task 12) matches the SDK's documented enum value exactly, the same "verify the exact string via context7, don't guess" standard already applied to `StripeService`'s pinned API version (Task 2) and `RawBodyRequest<Request>` (Task 6).
- `EscrowNotice`'s `{title, body, tone?, style?}` props (pre-existing component, unmodified) are called correctly in Task 12's rewritten `payment.tsx` — only the `title`/`body` strings changed, per the Design notes bullet added during this pass.

**Issues found and fixed during this review** (three, none left as notes-to-self — each is already reflected in the task text above):
1. The Prerequisites section's item 6 named only Task 10 for the "Payment Sheet needs a real development build" caveat — but Task 10 only installs and configures `<StripeProvider>`; Task 12 is the task that actually calls `initPaymentSheet`/`presentPaymentSheet`. Updated to name both.
2. Task 9's discount-preview total (`discountedPrice`) was computed by an inline, untested IIFE — inconsistent with this plan's own TDD-where-testable standard, and with Task 11's/Task 12's testable helpers. Extracted into `web/lib/pricing.js` behind a full red→green Vitest cycle (new Steps 3–6). The extraction was kept strictly behavior-preserving (same branches, same `Math.max(0, …)` clamp on *both* the percentage and fixed paths) rather than silently "fixed" to more tightly match the backend's own, slightly less conservative clamping (the backend only clamps the fixed branch) — that mismatch predates this pass and changing it now would be an unrequested behavior change.
3. Task 12's first draft of `payment.tsx` guarded its submit handler with `if (!draft?.day || !draft.slot) return;`, mixing optional chaining with a plain property access inside the same `||`. Not a runtime bug (short-circuit evaluation protects the unguarded access), but it doesn't reliably narrow `draft` to non-null for TypeScript afterward. Changed to `if (!draft || !draft.day || !draft.slot) return;`, which narrows `draft`, `draft.day`, and `draft.slot` cleanly — the same guard-clause shape already used throughout this codebase.

## Exit criteria

A logged-in client can, for real, book and pay for a session on either platform: pick a praticien and a mode (plus, on web, an optional promo code); the server — never the client — computes the authoritative `tarif` and opens a real Stripe PaymentIntent for that exact amount; the client completes payment through Stripe Elements (web) or the Payment Sheet (mobile); and the booking only ever flips to `confirme` — with a matching `paiements` row — once Stripe's webhook confirms the charge server-to-server. `POST/GET /api/rendez-vous*` and `POST /api/promotions/validate` are live and guarded, covered end to end by e2e tests with `StripeService` mocked; `server/`, `web/`, and `mobile/` are all green (`npm test` + `npm run test:e2e`; `npm test` + `npm run build`; `npm test` + `npm run typecheck`, respectively). Real end-to-end exercise (an actual card charge, a real webhook delivery) additionally requires the Stripe test-mode credentials and, for mobile, the development build described in the Prerequisites section — neither is available in this sandbox, which is why Task 13's Step 4 is a documented manual checklist rather than an automated one.

Per the master roadmap, this is the change the roadmap itself describes as unblocking "core product live" — a client can book and pay for a session. Nothing else in the numbered plan sequence formally depends on Plan 05 finishing first (Plans 04 and 07 both branch off Plan 03 directly), so unlike Plans 01/02/03/04, there's no downstream "Next" list here.
