import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './utils/create-test-app';
import { PromotionsModule } from '../src/promotions/promotions.module';

const future = () => {
  const d = new Date(); d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
};

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
});
