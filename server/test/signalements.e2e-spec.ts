import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { createTestApp, seedAdmin, seedClientUser } from './utils/create-test-app';
import { SignalementsModule } from '../src/signalements/signalements.module';
import { Praticien } from '../src/database/entities/praticien.entity';

describe('signalements', () => {
  let app: INestApplication;
  let userToken: string;
  let adminToken: string;
  let praticienId: number;
  let signalementId: number;

  beforeAll(async () => {
    app = await createTestApp({ imports: [SignalementsModule] });
    // seedClientUser also creates a plain `users` row — its token is exactly
    // what a JwtAuthGuard-only route needs; no linked `clients` row is required
    // here (signalements has no client_id column, see plan Architecture notes).
    userToken = (await seedClientUser(app, 'sig-user@aura.io')).token;
    adminToken = (await seedAdmin(app, 'sig-admin@aura.io')).token;
    const ds = app.get(DataSource);
    const p = await ds.getRepository(Praticien).save({
      firstname: 'P', lastname: 'L', email: 'sig-prat@x.io', siret: '11111111111111', telephone: '06',
      ville: 'Nice', niveau: 'n', specialite: 's', mode: 'm', status: 'actif',
      tarif: 10, experience: 1, bio: 'b'.repeat(60),
    });
    praticienId = p.id;
  });
  afterAll(async () => { await app.close(); });
  const http = () => request(app.getHttpServer());

  it('POST /api/signalements requires a valid JWT (401 without one)', async () => {
    await http().post('/api/signalements')
      .send({ praticien_id: praticienId, type: 'overclaim', sujet: 'Test', motif: 'Un motif suffisant' })
      .expect(401);
  });

  it('validates required fields', async () => {
    const res = await http().post('/api/signalements')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ praticien_id: praticienId }).expect(422);
    expect(res.body.errors.type).toBeDefined();
    expect(res.body.errors.sujet).toBeDefined();
    expect(res.body.errors.motif).toBeDefined();
  });

  it('creates a signalement attributed to the JWT user, pending, default priorite normale', async () => {
    const res = await http().post('/api/signalements')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        praticien_id: praticienId, type: 'overclaim',
        sujet: 'Promesses de guérison', motif: 'Le praticien a promis un miracle.',
      }).expect(201);
    expect(res.body.data.statut).toBe('pending');
    expect(res.body.data.priorite).toBe('normale');
    expect(res.body.data.signale_par_id).toBeDefined();
    signalementId = res.body.data.id;
  });

  it('rejects an unknown priorite, accepts one of the known values', async () => {
    const bad = await http().post('/api/signalements')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        praticien_id: praticienId, type: 'fake', sujet: 'Faux avis',
        motif: 'Témoignage inventé', priorite: 'inconnue',
      }).expect(422);
    expect(bad.body.errors.priorite).toBeDefined();

    const ok = await http().post('/api/signalements')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        praticien_id: praticienId, type: 'fake', sujet: 'Faux avis',
        motif: 'Témoignage inventé', priorite: 'urgente',
      }).expect(201);
    expect(ok.body.data.priorite).toBe('urgente');
  });

  it('admin index requires JwtAuthGuard + AdminGuard and paginates', async () => {
    await http().get('/api/admin/signalements').expect(401);
    await http().get('/api/admin/signalements')
      .set('Authorization', `Bearer ${userToken}`).expect(403);

    const res = await http().get('/api/admin/signalements')
      .set('Authorization', `Bearer ${adminToken}`).expect(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(2);
    expect(res.body.pagination).toBeDefined();
  });

  it('admin index filters by type', async () => {
    const res = await http().get('/api/admin/signalements?type=fake')
      .set('Authorization', `Bearer ${adminToken}`).expect(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data.every((s: any) => s.type === 'fake')).toBe(true);
  });

  it('admin resolve sets statut to resolved', async () => {
    const res = await http().post(`/api/admin/signalements/${signalementId}/resolve`)
      .set('Authorization', `Bearer ${adminToken}`).expect(200);
    expect(res.body.data.statut).toBe('resolved');
  });

  it('admin reject sets statut to rejected, and admin index filters by statut', async () => {
    const created = await http().post('/api/signalements')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        praticien_id: praticienId, type: 'other',
        sujet: 'Autre motif', motif: 'Détails du signalement',
      }).expect(201);

    const rej = await http().post(`/api/admin/signalements/${created.body.data.id}/reject`)
      .set('Authorization', `Bearer ${adminToken}`).expect(200);
    expect(rej.body.data.statut).toBe('rejected');

    const filtered = await http().get('/api/admin/signalements?statut=rejected')
      .set('Authorization', `Bearer ${adminToken}`).expect(200);
    expect(filtered.body.data.find((s: any) => s.id === created.body.data.id)).toBeDefined();
  });

  it('resolve/reject require the signalements_litiges capability for non-admin roles', async () => {
    const modToken = (await seedAdmin(app, 'sig-mod@aura.io', 'moderateur')).token;
    const financeToken = (await seedAdmin(app, 'sig-finance@aura.io', 'comptabilite')).token;

    const created = await http().post('/api/signalements')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        praticien_id: praticienId, type: 'overclaim',
        sujet: 'Test capacité', motif: 'Motif suffisant pour le test',
      }).expect(201);
    const id = created.body.data.id;

    await http().post(`/api/admin/signalements/${id}/resolve`)
      .set('Authorization', `Bearer ${financeToken}`).expect(403);

    const res = await http().post(`/api/admin/signalements/${id}/resolve`)
      .set('Authorization', `Bearer ${modToken}`).expect(200);
    expect(res.body.data.statut).toBe('resolved');
  });
});
