import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { createTestApp, seedAdmin, seedClientUser } from './utils/create-test-app';
import { PromotionsModule } from '../src/promotions/promotions.module';
import { Promotion } from '../src/database/entities/promotion.entity';

const future = () => {
  const d = new Date(); d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
};

const today = () => new Date().toISOString().slice(0, 10);

describe('promotions', () => {
  let app: INestApplication;
  let adminToken: string;
  beforeAll(async () => {
    app = await createTestApp({ imports: [PromotionsModule] });
    adminToken = (await seedAdmin(app, 'promos-admin@aura.io')).token;
  });
  afterAll(async () => { await app.close(); });
  const http = () => request(app.getHttpServer());
  const asAdmin = (r: request.Test) => r.set('Authorization', `Bearer ${adminToken}`);

  it('admin CRUD routes require admin auth; validate stays public', async () => {
    await http().get('/api/promotions').expect(401);
    await http().post('/api/promotions')
      .send({ code: 'X', type: 'fixe', valeur: 5, date_expiration: future() }).expect(401);
    const client = await seedClientUser(app, 'promos-reader@aura.io');
    await http().get('/api/promotions').set('Authorization', `Bearer ${client.token}`).expect(403);
  });

  it('POST / validates code unique, type in-list, date after today', async () => {
    await asAdmin(http().post('/api/promotions'))
      .send({ code: 'ETE10', type: 'pourcentage', valeur: 10, date_expiration: future() })
      .expect(201);
    const dup = await asAdmin(http().post('/api/promotions'))
      .send({ code: 'ETE10', type: 'fixe', valeur: 5, date_expiration: future() }).expect(422);
    expect(dup.body.errors.code).toBeDefined();
    const past = await asAdmin(http().post('/api/promotions'))
      .send({ code: 'OLD', type: 'fixe', valeur: 5, date_expiration: '2020-01-01' }).expect(422);
    expect(past.body.errors.date_expiration).toBeDefined();
    const badType = await asAdmin(http().post('/api/promotions'))
      .send({ code: 'X', type: 'autre', valeur: 5, date_expiration: future() }).expect(422);
    expect(badType.body.errors.type).toBeDefined();
  });

  it('POST / rejects date_expiration set to today (must be strictly after today)', async () => {
    const res = await asAdmin(http().post('/api/promotions'))
      .send({ code: 'TODAY1', type: 'fixe', valeur: 5, date_expiration: today() }).expect(422);
    expect(res.body.errors.date_expiration).toBeDefined();
  });

  it('GET/PUT/DELETE lifecycle with French messages', async () => {
    const created = await asAdmin(http().post('/api/promotions'))
      .send({ code: 'NOEL', type: 'fixe', valeur: 15, date_expiration: future() }).expect(201);
    const id = created.body.data.id;
    await asAdmin(http().get(`/api/promotions/${id}`)).expect(200);
    const upd = await asAdmin(http().put(`/api/promotions/${id}`)).send({ valeur: 20 }).expect(200);
    expect(upd.body.message).toBe('Promotion mise à jour avec succès');
    await asAdmin(http().delete(`/api/promotions/${id}`)).expect(200);
    const nf = await asAdmin(http().get(`/api/promotions/${id}`)).expect(404);
    expect(nf.body.message).toBe('Promotion non trouvée');
  });

  it('POST /api/promotions/validate returns the promotion for a valid, non-expired code', async () => {
    await asAdmin(http().post('/api/promotions'))
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
    await asAdmin(http().post('/api/promotions'))
      .send({ code: 'EXPIRED1', type: 'fixe', valeur: 5, date_expiration: future() }).expect(201);
    const ds = app.get(DataSource);
    await ds.getRepository(Promotion).update({ code: 'EXPIRED1' }, { date_expiration: '2020-01-01' });
    const res = await http().post('/api/promotions/validate').send({ code: 'EXPIRED1' }).expect(404);
    expect(res.body.message).toBe('Code promo invalide ou expiré');
  });
});
