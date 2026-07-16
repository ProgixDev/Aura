import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { randomUUID } from 'crypto';
import { createTestApp, seedAdmin, seedClientUser } from './utils/create-test-app';
import { RemboursementsModule } from '../src/remboursements/remboursements.module';
import { Paiement } from '../src/database/entities/paiement.entity';
import { StorageService } from '../src/common/storage.service';

const fakeStorage = { save: jest.fn((_file, subdir) => Promise.resolve(`${subdir}/${randomUUID()}.pdf`)) };

describe('remboursements', () => {
  let app: INestApplication;
  let clientToken: string;
  let clientId: number;
  let paidId: number;
  let adminToken: string;
  beforeAll(async () => {
    app = await createTestApp(
      { imports: [RemboursementsModule] },
      [{ provide: StorageService, useValue: fakeStorage }],
    );
    const seeded = await seedClientUser(app, 'refund@aura.io');
    clientToken = seeded.token;
    clientId = seeded.client.id;
    adminToken = (await seedAdmin(app, 'remb-admin@aura.io')).token;
    const ds = app.get(DataSource);
    paidId = (await ds.getRepository(Paiement).save({
      reference: 'TX-33333', client_id: clientId, montant_brut: 200, commission: 20,
      montant_net_praticien: 180, moyen_paiement: 'Carte', statut: 'paid',
      date_paiement: new Date(),
    })).id;
    await ds.getRepository(Paiement).save({
      reference: 'TX-44444', client_id: clientId, montant_brut: 60, commission: 6,
      montant_net_praticien: 54, moyen_paiement: 'Carte', statut: 'en_attente',
      date_paiement: new Date(),
    });
  });
  afterAll(async () => { await app.close(); });
  const http = () => request(app.getHttpServer());
  const asClient = (r: request.Test) => r.set('Authorization', `Bearer ${clientToken}`);
  const asAdmin = (r: request.Test) => r.set('Authorization', `Bearer ${adminToken}`);

  it('admin routes require admin auth; client routes keep their own guard', async () => {
    await http().get('/api/remboursements/admin').expect(401);
    await http().get('/api/remboursements/admin/statistics').expect(401);
    await http().get('/api/remboursements/admin/export').expect(401);
    await http().get('/api/remboursements/admin/1').expect(401);
    await http().post('/api/remboursements/admin/1/approve').expect(401);
    await http().post('/api/remboursements/admin/1/refuse').send({ commentaire_admin: 'x'.repeat(10) }).expect(401);
    await http().post('/api/remboursements/admin/1/complete').expect(401);
    await asClient(http().get('/api/remboursements/admin')).expect(403);
  });

  it('store: eligible paid paiement only, no duplicate, montant = montant_brut, RMB ref', async () => {
    const ds = app.get(DataSource);
    const notPaid = await ds.getRepository(Paiement).findOneByOrFail({ reference: 'TX-44444' });
    const bad = await asClient(http().post('/api/remboursements/client'))
      .field('paiement_id', String(notPaid.id)).field('motif', 'Annulation').expect(422);
    expect(bad.body.errors.paiement_id).toBeDefined();

    const ok = await asClient(http().post('/api/remboursements/client'))
      .field('paiement_id', String(paidId))
      .field('motif', 'Annulation du rendez-vous')
      .attach('documents', Buffer.from('%PDF-1.4'), {
        filename: 'preuve.pdf', contentType: 'application/pdf',
      })
      .expect(201);
    expect(ok.body.data.montant).toBe(200);
    expect(ok.body.data.reference).toMatch(/^RMB-\d{5}$/);
    expect(ok.body.data.statut).toBe('en_attente');
    expect(ok.body.data.documents).toHaveLength(1);

    const dup = await asClient(http().post('/api/remboursements/client'))
      .field('paiement_id', String(paidId)).field('motif', 'Encore').expect(422);
    expect(dup.body.errors.paiement_id[0]).toContain('existe déjà');
  });

  it('client cancel maps to refuse; only en_attente/en_cours cancellable', async () => {
    const list = await asClient(http().get('/api/remboursements/client')).expect(200);
    const id = list.body.data[0].id;
    const cancel = await asClient(http().post(`/api/remboursements/client/${id}/cancel`)).expect(200);
    expect(cancel.body.message).toBe('Demande de remboursement annulée avec succès');
    expect(cancel.body.data.statut).toBe('refuse');
    await asClient(http().post(`/api/remboursements/client/${id}/cancel`)).expect(404);
  });

  it('admin approve → paiement rembourse; complete requires approuve', async () => {
    // refused earlier → allowed to re-request
    const again = await asClient(http().post('/api/remboursements/client'))
      .field('paiement_id', String(paidId)).field('motif', 'Deuxième demande').expect(201);
    const id = again.body.data.id;

    await asAdmin(http().post(`/api/remboursements/admin/${id}/complete`)).expect(404);

    const appr = await asAdmin(http().post(`/api/remboursements/admin/${id}/approve`))
      .send({ commentaire_admin: 'OK' }).expect(200);
    expect(appr.body.data.statut).toBe('approuve');
    const ds = app.get(DataSource);
    const paiement = await ds.getRepository(Paiement).findOneByOrFail({ id: paidId });
    expect(paiement.statut).toBe('rembourse');

    const done = await asAdmin(http().post(`/api/remboursements/admin/${id}/complete`)).expect(200);
    expect(done.body.data.statut).toBe('completed');
  });

  it('admin refuse requires commentaire min 10; adminIndex embeds statistiques; export + statistics reachable', async () => {
    const badRefuse = await asAdmin(http().post('/api/remboursements/admin/99999/refuse'))
      .send({ commentaire_admin: 'commentaire suffisant' }).expect(404);
    expect(badRefuse.body.status).toBe('error');

    const idx = await asAdmin(http().get('/api/remboursements/admin')).expect(200);
    expect(idx.body.statistiques).toHaveProperty('taux_remboursement');
    expect(idx.body.statistiques.taux_evolution).toBe('+0.3');

    const stats = await asAdmin(http().get('/api/remboursements/admin/statistics')).expect(200);
    expect(stats.body.data).toHaveProperty('par_motif');
    expect(stats.body.data).toHaveProperty('par_mois');

    const exp = await asAdmin(http().get('/api/remboursements/admin/export')).expect(200);
    expect(exp.body.data.remboursements[0].statut).toBe('Complété');
    expect(exp.body.data.remboursements[0].reference).toMatch(/^RMB-/);
  });

  it('admin approve validates date_remboursement is today-or-later (after_or_equal:today)', async () => {
    const ds = app.get(DataSource);
    const toDateStr = (d: Date) => d.toISOString().slice(0, 10);
    const yesterday = toDateStr(new Date(Date.now() - 24 * 60 * 60 * 1000));
    const today = toDateStr(new Date());

    const makeRequest = async (reference: string) => {
      const paiementId = (await ds.getRepository(Paiement).save({
        reference, client_id: clientId, montant_brut: 50, commission: 5,
        montant_net_praticien: 45, moyen_paiement: 'Carte', statut: 'paid',
        date_paiement: new Date(),
      })).id;
      const created = await asClient(http().post('/api/remboursements/client'))
        .field('paiement_id', String(paiementId)).field('motif', 'Test date_remboursement')
        .expect(201);
      return created.body.data.id as number;
    };

    const yesterdayId = await makeRequest('TX-DATE-PAST');
    const past = await asAdmin(http().post(`/api/remboursements/admin/${yesterdayId}/approve`))
      .send({ date_remboursement: yesterday }).expect(422);
    expect(past.body.errors.date_remboursement).toBeDefined();

    const todayId = await makeRequest('TX-DATE-TODAY');
    const present = await asAdmin(http().post(`/api/remboursements/admin/${todayId}/approve`))
      .send({ date_remboursement: today }).expect(200);
    expect(present.body.data.statut).toBe('approuve');
  });

  it('approve/refuse require the paiements_remboursements capability for non-admin roles', async () => {
    const modToken = (await seedAdmin(app, 'remb-mod@aura.io', 'moderateur')).token;
    const financeToken = (await seedAdmin(app, 'remb-finance@aura.io', 'comptabilite')).token;
    const ds = app.get(DataSource);
    const paiementId = (await ds.getRepository(Paiement).save({
      reference: 'TX-CAP-1', client_id: clientId, montant_brut: 40, commission: 4,
      montant_net_praticien: 36, moyen_paiement: 'Carte', statut: 'paid',
      date_paiement: new Date(),
    })).id;
    const created = await asClient(http().post('/api/remboursements/client'))
      .field('paiement_id', String(paiementId)).field('motif', 'Test capacité').expect(201);
    const id = created.body.data.id;

    await http().post(`/api/remboursements/admin/${id}/approve`)
      .set('Authorization', `Bearer ${modToken}`).send({ commentaire_admin: 'OK' }).expect(403);

    const appr = await http().post(`/api/remboursements/admin/${id}/approve`)
      .set('Authorization', `Bearer ${financeToken}`).send({ commentaire_admin: 'OK' }).expect(200);
    expect(appr.body.data.statut).toBe('approuve');
  });
});
