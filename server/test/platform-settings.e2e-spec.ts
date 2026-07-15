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

  it('PUT requires the abonnements_promos capability for non-admin roles', async () => {
    const modToken = (await seedAdmin(app, 'ps-mod@aura.io', 'moderateur')).token;
    const financeToken = (await seedAdmin(app, 'ps-finance@aura.io', 'comptabilite')).token;

    await http().put('/api/admin/settings/commission')
      .set('Authorization', `Bearer ${modToken}`).send({ commission_rate: 0.25 }).expect(403);

    const res = await http().put('/api/admin/settings/commission')
      .set('Authorization', `Bearer ${financeToken}`).send({ commission_rate: 0.25 }).expect(200);
    expect(res.body.data.commission_rate).toBe(0.25);
  });
});
