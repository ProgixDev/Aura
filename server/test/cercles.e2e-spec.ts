import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, seedAdmin, seedClientUser, seedPraticienUser } from './utils/create-test-app';
import { CerclesModule } from '../src/cercles/cercles.module';

describe('cercles', () => {
  let app: INestApplication;
  let adminToken: string;
  let praticienToken: string;
  let clientToken: string;
  beforeAll(async () => {
    app = await createTestApp({ imports: [CerclesModule] });
    adminToken = (await seedAdmin(app, 'cercles-admin@aura.io')).token;
    praticienToken = (await seedPraticienUser(app, 'cercles-prat@aura.io')).token;
    clientToken = (await seedClientUser(app, 'cercles-client@aura.io')).token;
  });
  afterAll(async () => { await app.close(); });
  const http = () => request(app.getHttpServer());
  const asAdmin = (r: request.Test) => r.set('Authorization', `Bearer ${adminToken}`);
  const asPraticien = (r: request.Test) => r.set('Authorization', `Bearer ${praticienToken}`);
  const asClient = (r: request.Test) => r.set('Authorization', `Bearer ${clientToken}`);

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

  it('praticien routes require praticien auth; a praticien creates and lists their own cercles', async () => {
    await http().get('/api/cercles/praticien/mine').expect(401);
    await asClient(http().get('/api/cercles/praticien/mine')).expect(403);

    const created = await asPraticien(http().post('/api/cercles/praticien/mine'))
      .send({ nom: 'Cercle du praticien', description: 'Un cercle payant', prix: 15 }).expect(201);
    expect(created.body.data.prix).toBe(15);

    const mine = await asPraticien(http().get('/api/cercles/praticien/mine')).expect(200);
    expect(mine.body.data.some((c: any) => c.nom === 'Cercle du praticien')).toBe(true);

    // Shows up in the public list with the praticien relation joined.
    const list = await http().get('/api/cercles?per_page=100').expect(200);
    const row = list.body.data.find((c: any) => c.nom === 'Cercle du praticien');
    expect(row.praticien).toBeDefined();
  });

  it('client subscribes to a cercle — duplicate 422s, myInscription reflects state', async () => {
    const cercle = await asAdmin(http().post('/api/cercles'))
      .send({ nom: 'Cercle à rejoindre', prix: 0 }).expect(201);
    const cercleId = cercle.body.data.id;

    const before = await asClient(http().get(`/api/cercles/${cercleId}/inscription/me`)).expect(200);
    expect(before.body.data).toBeNull();

    await http().post(`/api/cercles/${cercleId}/inscription`).expect(401);

    const sub = await asClient(http().post(`/api/cercles/${cercleId}/inscription`)).expect(201);
    expect(sub.body.message).toBe('Votre inscription a bien été enregistrée.');

    const dup = await asClient(http().post(`/api/cercles/${cercleId}/inscription`)).expect(422);
    expect(dup.body.errors.cercle).toBeDefined();

    const after = await asClient(http().get(`/api/cercles/${cercleId}/inscription/me`)).expect(200);
    expect(after.body.data).toMatchObject({ cercle_id: cercleId, statut: 'inscrit' });
  });
});
