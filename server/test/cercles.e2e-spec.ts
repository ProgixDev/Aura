import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, seedAdmin, seedClientUser } from './utils/create-test-app';
import { CerclesModule } from '../src/cercles/cercles.module';

describe('cercles', () => {
  let app: INestApplication;
  let adminToken: string;
  beforeAll(async () => {
    app = await createTestApp({ imports: [CerclesModule] });
    adminToken = (await seedAdmin(app, 'cercles-admin@aura.io')).token;
  });
  afterAll(async () => { await app.close(); });
  const http = () => request(app.getHttpServer());
  const asAdmin = (r: request.Test) => r.set('Authorization', `Bearer ${adminToken}`);

  it('write routes require admin auth; reads stay public', async () => {
    await http().post('/api/cercles').send({ nom: 'Sans Token' }).expect(401);
    const client = await seedClientUser(app, 'cercles-reader@aura.io');
    await http().post('/api/cercles')
      .set('Authorization', `Bearer ${client.token}`).send({ nom: 'Avec Client' }).expect(403);
    await http().get('/api/cercles').expect(200);
  });

  it('POST / creates; duplicate nom → 422; bad color → 422', async () => {
    const res = await asAdmin(http().post('/api/cercles'))
      .send({ nom: 'Zen', description: 'd', color: '#AABBCC', animateur: 'Ana' }).expect(201);
    expect(res.body.message).toBe('Cercle créé avec succès');
    const dup = await asAdmin(http().post('/api/cercles')).send({ nom: 'Zen' }).expect(422);
    expect(dup.body.errors.nom).toBeDefined();
    const bad = await asAdmin(http().post('/api/cercles')).send({ nom: 'Autre', color: 'red' }).expect(422);
    expect(bad.body.errors.color).toBeDefined();
  });

  it('GET / paginates with URLs (public, no auth required)', async () => {
    const res = await http().get('/api/cercles?per_page=1').expect(200);
    expect(res.body.pagination).toMatchObject({ current_page: 1, per_page: 1 });
    expect(res.body.pagination).toHaveProperty('next_page_url');
    expect(res.body.pagination).toHaveProperty('prev_page_url');
  });

  it('GET/PUT/DELETE /:id with 404 envelopes', async () => {
    const created = await asAdmin(http().post('/api/cercles')).send({ nom: 'Flow' }).expect(201);
    const id = created.body.data.id;
    await http().get(`/api/cercles/${id}`).expect(200);
    const upd = await asAdmin(http().put(`/api/cercles/${id}`)).send({ nom: 'Flow 2' }).expect(200);
    expect(upd.body.message).toBe('Cercle mis à jour avec succès');
    await asAdmin(http().put(`/api/cercles/${id}`)).send({ nom: 'Flow 2' }).expect(200);
    const clash = await asAdmin(http().put(`/api/cercles/${id}`)).send({ nom: 'Zen' }).expect(422);
    expect(clash.body.errors.nom).toBeDefined();
    await asAdmin(http().delete(`/api/cercles/${id}`)).expect(200);
    const nf = await http().get(`/api/cercles/${id}`).expect(404);
    expect(nf.body).toEqual({ status: 'error', message: 'Cercle non trouvé' });
  });
});
