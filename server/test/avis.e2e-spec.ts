import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { createTestApp, seedAdmin, seedClientUser } from './utils/create-test-app';
import { AvisModule } from '../src/avis/avis.module';
import { Praticien } from '../src/database/entities/praticien.entity';

describe('avis', () => {
  let app: INestApplication;
  let clientToken: string;
  let adminToken: string;
  let praticienId: number;
  let avisId: number;

  beforeAll(async () => {
    app = await createTestApp({ imports: [AvisModule] });
    clientToken = (await seedClientUser(app, 'avis-client@aura.io')).token;
    adminToken = (await seedAdmin(app, 'avis-admin@aura.io')).token;
    const ds = app.get(DataSource);
    const p = await ds.getRepository(Praticien).save({
      firstname: 'P', lastname: 'L', email: 'avis-prat@x.io', telephone: '06',
      ville: 'Nice', niveau: 'n', specialite: 's', mode: 'm', status: 'actif',
      tarif: 10, experience: 1, bio: 'b'.repeat(60),
    });
    praticienId = p.id;
  });
  afterAll(async () => { await app.close(); });
  const http = () => request(app.getHttpServer());

  it('public GET /api/avis requires praticien_id and returns only publié rows', async () => {
    const missing = await http().get('/api/avis').expect(422);
    expect(missing.body.errors.praticien_id).toBeDefined();

    const empty = await http().get(`/api/avis?praticien_id=${praticienId}`).expect(200);
    expect(empty.body.data).toEqual([]);
  });

  it('client store requires auth, validates note 1-5, creates en_attente attributed by full name', async () => {
    await http().post('/api/client/avis')
      .send({ praticien_id: praticienId, note: 5, avis: 'Une très belle séance' }).expect(401);

    const bad = await http().post('/api/client/avis')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ praticien_id: praticienId, note: 9, avis: 'x' }).expect(422);
    expect(bad.body.errors.note).toBeDefined();

    const res = await http().post('/api/client/avis')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ praticien_id: praticienId, note: 5, avis: 'Une très belle séance' }).expect(201);
    expect(res.body.data.statut).toBe('en_attente');
    expect(res.body.data.full_name_author).toBe('Client Test');
    expect(res.body.data.date_ajout).toBeTruthy();
    avisId = res.body.data.id;
  });

  it('a fresh avis stays hidden from the public feed while en_attente', async () => {
    const res = await http().get(`/api/avis?praticien_id=${praticienId}`).expect(200);
    expect(res.body.data).toEqual([]);
  });

  it('client GET /client/avis lists own reviews by full-name match, joined with praticien', async () => {
    const res = await http().get('/api/client/avis')
      .set('Authorization', `Bearer ${clientToken}`).expect(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].praticien).toMatchObject({ id: praticienId });
  });

  it('client can update the avis while en_attente', async () => {
    const upd = await http().put(`/api/client/avis/${avisId}`)
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ note: 4, avis: 'Édité : toujours aussi bien' }).expect(200);
    expect(upd.body.data.note).toBe(4);
    expect(upd.body.data.avis).toBe('Édité : toujours aussi bien');
  });

  it('admin publish makes the avis visible on the public feed', async () => {
    const pub = await http().post(`/api/admin/avis/${avisId}/publish`)
      .set('Authorization', `Bearer ${adminToken}`).expect(200);
    expect(pub.body.data.statut).toBe('publié');

    const feed = await http().get(`/api/avis?praticien_id=${praticienId}`).expect(200);
    expect(feed.body.data).toHaveLength(1);
    expect(feed.body.data[0].statut).toBe('publié');
  });

  it('client can no longer edit or delete once published', async () => {
    const upd = await http().put(`/api/client/avis/${avisId}`)
      .set('Authorization', `Bearer ${clientToken}`).send({ note: 1 }).expect(404);
    expect(upd.body.message).toBe('Avis non trouvé ou ne peut pas être modifié');
    const del = await http().delete(`/api/client/avis/${avisId}`)
      .set('Authorization', `Bearer ${clientToken}`).expect(404);
    expect(del.body.message).toBe('Avis non trouvé ou ne peut pas être supprimé');
  });

  it('admin index paginates, filters by statut, and requires AdminGuard', async () => {
    const res = await http().get('/api/admin/avis?statut=publié')
      .set('Authorization', `Bearer ${adminToken}`).expect(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.pagination).toBeDefined();

    await http().get('/api/admin/avis').expect(401);
  });

  it('admin reject sets statut and admin delete removes the row', async () => {
    const created = await http().post('/api/client/avis')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ praticien_id: praticienId, note: 2, avis: 'Deuxième avis du même auteur' }).expect(201);
    const id2 = created.body.data.id;

    const rej = await http().post(`/api/admin/avis/${id2}/reject`)
      .set('Authorization', `Bearer ${adminToken}`).expect(200);
    expect(rej.body.data.statut).toBe('rejeté');

    await http().delete(`/api/admin/avis/${id2}`)
      .set('Authorization', `Bearer ${adminToken}`).expect(200);
    const list = await http().get('/api/admin/avis')
      .set('Authorization', `Bearer ${adminToken}`).expect(200);
    expect(list.body.data.find((a: any) => a.id === id2)).toBeUndefined();
  });

  it('publish/reject require the avis_moderation capability for non-admin roles', async () => {
    const modToken = (await seedAdmin(app, 'avis-mod@aura.io', 'moderateur')).token;
    const supportToken = (await seedAdmin(app, 'avis-support@aura.io', 'support')).token;

    const created = await http().post('/api/client/avis')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ praticien_id: praticienId, note: 3, avis: 'Avis pour test de capacité' }).expect(201);
    const id = created.body.data.id;

    await http().post(`/api/admin/avis/${id}/publish`)
      .set('Authorization', `Bearer ${supportToken}`).expect(403);

    const pub = await http().post(`/api/admin/avis/${id}/publish`)
      .set('Authorization', `Bearer ${modToken}`).expect(200);
    expect(pub.body.data.statut).toBe('publié');
  });
});
