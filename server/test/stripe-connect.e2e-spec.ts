import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { createTestApp, seedAdmin, seedClientUser, seedPraticienUser } from './utils/create-test-app';
import { StripeConnectModule } from '../src/stripe-connect/stripe-connect.module';
import { RendezVousModule } from '../src/rendez-vous/rendez-vous.module';
import { StripeService } from '../src/common/stripe.service';
import { Praticien } from '../src/database/entities/praticien.entity';
import { Paiement } from '../src/database/entities/paiement.entity';

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

describe('stripe-connect (account.updated webhook)', () => {
  let app: INestApplication;
  let ds: DataSource;
  let connectEnabledPraticienId: number;
  let notConnectedPraticienId: number;

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
    // Own account id, distinct from the previous test's praticien: createConnectAccount is
    // otherwise a fixed-value mock, and this describe block reuses one in-memory DB across
    // all its tests (beforeAll, not beforeEach), so reusing 'acct_webhook_test' here would
    // give two different praticien rows the same stripe_account_id and make the webhook
    // lookup below ambiguous between them.
    webhookStripeMock.createConnectAccount.mockResolvedValueOnce({ id: 'acct_webhook_test_2' });
    await http().post('/api/praticien/stripe/connect/onboard').set('Authorization', `Bearer ${token}`).expect(200);

    const enabledEvent = {
      id: 'evt_acct_2a', type: 'account.updated',
      data: { object: { id: 'acct_webhook_test_2', charges_enabled: true, payouts_enabled: true } },
    };
    webhookStripeMock.constructWebhookEvent.mockImplementationOnce(() => enabledEvent);
    await http().post('/api/webhooks/stripe').set('stripe-signature', 'sig').send(enabledEvent).expect(200);
    expect((await ds.getRepository(Praticien).findOneByOrFail({ id: praticien.id })).stripe_payouts_enabled).toBe(true);

    const disabledEvent = {
      id: 'evt_acct_2b', type: 'account.updated',
      data: { object: { id: 'acct_webhook_test_2', charges_enabled: false, payouts_enabled: false } },
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
});
