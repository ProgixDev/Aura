import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { createTestApp, seedAdmin, seedClientUser } from './utils/create-test-app';
import { DisputesModule } from '../src/disputes/disputes.module';
import { Praticien } from '../src/database/entities/praticien.entity';

describe('disputes', () => {
  let app: INestApplication;
  let adminToken: string;
  let userToken: string;
  let clientId: number;
  let praticienId: number;
  let disputeId: number;

  beforeAll(async () => {
    app = await createTestApp({ imports: [DisputesModule] });
    adminToken = (await seedAdmin(app, 'disp-admin@aura.io')).token;
    const seeded = await seedClientUser(app, 'disp-client@aura.io');
    userToken = seeded.token;
    clientId = seeded.client.id;
    const ds = app.get(DataSource);
    const p = await ds.getRepository(Praticien).save({
      firstname: 'P', lastname: 'L', email: 'disp-prat@x.io', siret: '11111111111111', telephone: '06',
      ville: 'Nice', niveau: 'n', specialite: 's', mode: 'm', status: 'actif',
      tarif: 10, experience: 1, bio: 'b'.repeat(60),
    });
    praticienId = p.id;
  });
  afterAll(async () => { await app.close(); });
  const http = () => request(app.getHttpServer());

  it('GET /api/admin/disputes requires AdminGuard (401 without a token, 403 for a non-admin user)', async () => {
    await http().get('/api/admin/disputes').expect(401);
    await http().get('/api/admin/disputes').set('Authorization', `Bearer ${userToken}`).expect(403);

    const res = await http().get('/api/admin/disputes')
      .set('Authorization', `Bearer ${adminToken}`).expect(200);
    expect(res.body.data).toEqual([]);
    expect(res.body.pagination).toBeDefined();
  });

  it('POST /api/admin/disputes validates required fields', async () => {
    const res = await http().post('/api/admin/disputes')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({}).expect(422);
    expect(res.body.errors.client_id).toBeDefined();
    expect(res.body.errors.praticien_id).toBeDefined();
    expect(res.body.errors.motif).toBeDefined();
  });

  it('rejects a client_id that does not exist', async () => {
    const res = await http().post('/api/admin/disputes')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ client_id: 999999, praticien_id: praticienId, motif: 'Séance écourtée sans explication' })
      .expect(422);
    expect(res.body.errors.client_id).toBeDefined();
  });

  it('rejects a praticien_id that does not exist', async () => {
    const res = await http().post('/api/admin/disputes')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ client_id: clientId, praticien_id: 999999, motif: 'Séance écourtée sans explication' })
      .expect(422);
    expect(res.body.errors.praticien_id).toBeDefined();
  });

  it('rejects a paiement_id that does not exist', async () => {
    const res = await http().post('/api/admin/disputes')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        client_id: clientId, praticien_id: praticienId, paiement_id: 999999,
        motif: 'Séance écourtée sans explication',
      })
      .expect(422);
    expect(res.body.errors.paiement_id).toBeDefined();
  });

  it('store/resolve require the signalements_litiges capability for non-admin roles', async () => {
    const modToken = (await seedAdmin(app, 'disp-mod@aura.io', 'moderateur')).token;
    const financeToken = (await seedAdmin(app, 'disp-finance@aura.io', 'comptabilite')).token;

    await http().post('/api/admin/disputes')
      .set('Authorization', `Bearer ${financeToken}`)
      .send({ client_id: clientId, praticien_id: praticienId, motif: 'Motif suffisant pour le test' })
      .expect(403);

    const created = await http().post('/api/admin/disputes')
      .set('Authorization', `Bearer ${modToken}`)
      .send({ client_id: clientId, praticien_id: praticienId, motif: 'Motif suffisant pour le test' })
      .expect(201);
    const id = created.body.data.id;

    await http().post(`/api/admin/disputes/${id}/resolve`)
      .set('Authorization', `Bearer ${financeToken}`)
      .send({ resolution_notes: 'Notes suffisantes.' }).expect(403);

    const resolved = await http().post(`/api/admin/disputes/${id}/resolve`)
      .set('Authorization', `Bearer ${modToken}`)
      .send({ resolution_notes: 'Notes suffisantes.' }).expect(200);
    expect(resolved.body.data.statut).toBe('resolu');
  });

  it('creates a dispute, ouvert, priorite normale by default', async () => {
    const res = await http().post('/api/admin/disputes')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        client_id: clientId, praticien_id: praticienId, montant: 95,
        motif: 'Séance écourtée sans explication',
      }).expect(201);
    expect(res.body.data.statut).toBe('ouvert');
    expect(res.body.data.priorite).toBe('normale');
    expect(res.body.data.montant).toBe(95);
    expect(res.body.data.client).toMatchObject({ id: clientId });
    expect(res.body.data.praticien).toMatchObject({ id: praticienId });
    disputeId = res.body.data.id;
  });

  it('accepts an explicit priorite haute', async () => {
    const res = await http().post('/api/admin/disputes')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        client_id: clientId, praticien_id: praticienId,
        motif: 'Praticien injoignable depuis 3 jours', priorite: 'haute',
      }).expect(201);
    expect(res.body.data.priorite).toBe('haute');
  });

  it('GET /api/admin/disputes/:id returns the joined dispute', async () => {
    const res = await http().get(`/api/admin/disputes/${disputeId}`)
      .set('Authorization', `Bearer ${adminToken}`).expect(200);
    expect(res.body.data.id).toBe(disputeId);
    expect(res.body.data.motif).toBe('Séance écourtée sans explication');
  });

  it('GET /api/admin/disputes/:id 404s for an unknown id', async () => {
    const res = await http().get('/api/admin/disputes/999999')
      .set('Authorization', `Bearer ${adminToken}`).expect(404);
    expect(res.body.message).toBe('Litige non trouvé');
  });

  it('admin index filters by priorite', async () => {
    const res = await http().get('/api/admin/disputes?priorite=haute')
      .set('Authorization', `Bearer ${adminToken}`).expect(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data.every((d: any) => d.priorite === 'haute')).toBe(true);
  });

  it('resolve requires resolution_notes', async () => {
    const res = await http().post(`/api/admin/disputes/${disputeId}/resolve`)
      .set('Authorization', `Bearer ${adminToken}`).send({}).expect(422);
    expect(res.body.errors.resolution_notes).toBeDefined();
  });

  it('resolve sets statut to resolu and stores the notes', async () => {
    const res = await http().post(`/api/admin/disputes/${disputeId}/resolve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ resolution_notes: 'Remboursement partiel accordé au client.' }).expect(200);
    expect(res.body.data.statut).toBe('resolu');
    expect(res.body.data.resolution_notes).toBe('Remboursement partiel accordé au client.');
  });

  it('cannot resolve an already-resolved dispute', async () => {
    const res = await http().post(`/api/admin/disputes/${disputeId}/resolve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ resolution_notes: 'Nouvelle tentative.' }).expect(404);
    expect(res.body.message).toBe('Litige non trouvé ou déjà résolu');
  });

  it('admin index filters by statut=resolu', async () => {
    const res = await http().get('/api/admin/disputes?statut=resolu')
      .set('Authorization', `Bearer ${adminToken}`).expect(200);
    expect(res.body.data.find((d: any) => d.id === disputeId)).toBeDefined();
  });
});
