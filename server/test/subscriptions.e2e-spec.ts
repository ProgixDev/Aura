process.env.STRIPE_PRICE_ID_PRO = 'price_test_pro';
process.env.STRIPE_PRICE_ID_PREMIUM = 'price_test_premium';

import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { createTestApp, seedAdmin, seedClientUser, seedPraticienUser } from './utils/create-test-app';
import { SubscriptionsModule } from '../src/subscriptions/subscriptions.module';
import { Subscription } from '../src/database/entities/subscription.entity';
import { StripeService } from '../src/common/stripe.service';
import { RendezVousModule } from '../src/rendez-vous/rendez-vous.module';

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
});

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
    const fakeEvent = {
      id: 'evt_pi_untouched', type: 'payment_intent.succeeded',
      data: { object: { id: 'pi_untouched', metadata: {} } },
    };
    webhookStripeMock.constructWebhookEvent.mockImplementationOnce(() => fakeEvent);
    await http().post('/api/webhooks/stripe').set('stripe-signature', 'sig').send(fakeEvent).expect(200);
  });
});
