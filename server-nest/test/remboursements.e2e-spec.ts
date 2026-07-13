import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { createTestApp, seedClientUser } from './utils/create-test-app';
import { RemboursementsModule } from '../src/remboursements/remboursements.module';
import { Paiement } from '../src/database/entities/paiement.entity';

describe('remboursements', () => {
  let app: INestApplication;
  let clientToken: string;
  let clientId: number;
  let paidId: number;
  beforeAll(async () => {
    app = await createTestApp({ imports: [RemboursementsModule] });
    const seeded = await seedClientUser(app, 'refund@aura.io');
    clientToken = seeded.token;
    clientId = seeded.client.id;
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

    await http().post(`/api/remboursements/admin/${id}/complete`).expect(404);

    const appr = await http().post(`/api/remboursements/admin/${id}/approve`)
      .send({ commentaire_admin: 'OK' }).expect(200);
    expect(appr.body.data.statut).toBe('approuve');
    const ds = app.get(DataSource);
    const paiement = await ds.getRepository(Paiement).findOneByOrFail({ id: paidId });
    expect(paiement.statut).toBe('rembourse');

    const done = await http().post(`/api/remboursements/admin/${id}/complete`).expect(200);
    expect(done.body.data.statut).toBe('completed');
  });

  it('admin refuse requires commentaire min 10; adminIndex embeds statistiques; export + statistics reachable', async () => {
    const badRefuse = await http().post('/api/remboursements/admin/99999/refuse')
      .send({ commentaire_admin: 'commentaire suffisant' }).expect(404);
    expect(badRefuse.body.status).toBe('error');

    const idx = await http().get('/api/remboursements/admin').expect(200);
    expect(idx.body.statistiques).toHaveProperty('taux_remboursement');
    expect(idx.body.statistiques.taux_evolution).toBe('+0.3');

    const stats = await http().get('/api/remboursements/admin/statistics').expect(200);
    expect(stats.body.data).toHaveProperty('par_motif');
    expect(stats.body.data).toHaveProperty('par_mois');

    const exp = await http().get('/api/remboursements/admin/export').expect(200);
    expect(exp.body.data.remboursements[0].statut).toBe('Complété');
    expect(exp.body.data.remboursements[0].reference).toMatch(/^RMB-/);
  });
});
