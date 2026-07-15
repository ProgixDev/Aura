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
