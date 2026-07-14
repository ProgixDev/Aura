import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, seedAdmin, seedClientUser } from './utils/create-test-app';
import { DisciplinesModule } from '../src/disciplines/disciplines.module';

describe('disciplines', () => {
  let app: INestApplication;
  let adminToken: string;
  beforeAll(async () => {
    app = await createTestApp({ imports: [DisciplinesModule] });
    adminToken = (await seedAdmin(app, 'disciplines-admin@aura.io')).token;
  });
  afterAll(async () => { await app.close(); });
  const http = () => request(app.getHttpServer());
  const asAdmin = (r: request.Test) => r.set('Authorization', `Bearer ${adminToken}`);

  it('write routes require admin auth; reads stay public', async () => {
    await http().post('/api/disciplines/create-discipline')
      .send({ nom: 'Sans Token', tonalite: 't', glyphe: 'g', accroche: 'a' }).expect(401);
    const client = await seedClientUser(app, 'disciplines-reader@aura.io');
    await http().post('/api/disciplines/create-discipline')
      .set('Authorization', `Bearer ${client.token}`)
      .send({ nom: 'Avec Client', tonalite: 't', glyphe: 'g', accroche: 'a' }).expect(403);
    await http().get('/api/disciplines').expect(200);
  });

  it('POST /create-discipline slugifies nom (accents stripped)', async () => {
    const res = await asAdmin(http().post('/api/disciplines/create-discipline'))
      .send({ nom: 'Méditation Guidée', tonalite: 'calme', glyphe: 'G', accroche: 'a' })
      .expect(201);
    expect(res.body.data.slug).toBe('meditation-guidee');
    expect(res.body.message).toBe('Discipline créée avec succès');
    const dup = await asAdmin(http().post('/api/disciplines/create-discipline'))
      .send({ nom: 'Méditation Guidée', tonalite: 't', glyphe: 'g', accroche: 'a' }).expect(422);
    expect(dup.body.errors.nom).toBeDefined();
  });

  it('index returns all without pagination envelope (public, no auth required)', async () => {
    const res = await http().get('/api/disciplines').expect(200);
    expect(res.body.message).toBe('Disciplines récupérées avec succès');
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.pagination).toBeUndefined();
  });

  it('update regenerates slug when nom changes; 404 envelope', async () => {
    const created = await asAdmin(http().post('/api/disciplines/create-discipline'))
      .send({ nom: 'Yoga', tonalite: 't', glyphe: 'g', accroche: 'a' }).expect(201);
    const id = created.body.data.id;
    const upd = await asAdmin(http().put(`/api/disciplines/${id}`)).send({ nom: 'Yoga Doux' }).expect(200);
    expect(upd.body.data.slug).toBe('yoga-doux');
    await asAdmin(http().delete(`/api/disciplines/${id}`)).expect(200);
    const nf = await asAdmin(http().put(`/api/disciplines/${id}`)).send({ nom: 'X' }).expect(404);
    expect(nf.body.message).toBe('Discipline non trouvée');
  });
});
