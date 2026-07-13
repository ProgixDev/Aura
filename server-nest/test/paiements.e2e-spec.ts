import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { createTestApp, seedClientUser } from './utils/create-test-app';
import { PaiementsModule } from '../src/paiements/paiements.module';
import { Paiement } from '../src/database/entities/paiement.entity';

describe('paiements', () => {
  let app: INestApplication;
  let clientToken: string;
  let clientId: number;
  beforeAll(async () => {
    app = await createTestApp({ imports: [PaiementsModule] });
    const seeded = await seedClientUser(app, 'payer@aura.io');
    clientToken = seeded.token;
    clientId = seeded.client.id;
    const ds = app.get(DataSource);
    await ds.getRepository(Paiement).save([
      { reference: 'TX-11111', client_id: clientId, montant_brut: 100, commission: 10,
        montant_net_praticien: 90, moyen_paiement: 'Carte', statut: 'paid',
        date_paiement: new Date('2026-06-15T10:00:00Z') },
      { reference: 'TX-22222', client_id: clientId, montant_brut: 50, commission: 5,
        montant_net_praticien: 45, moyen_paiement: 'PayPal', statut: 'en_attente',
        date_paiement: new Date('2026-07-01T10:00:00Z') },
    ]);
  });
  afterAll(async () => { await app.close(); });
  const http = () => request(app.getHttpServer());

  it('client index scoped + statistiques block', async () => {
    await http().get('/api/paiements/clients').expect(401);
    const res = await http().get('/api/paiements/clients')
      .set('Authorization', `Bearer ${clientToken}`).expect(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.statistiques).toMatchObject({
      total_paiements: 2, total_montant: 150, total_commission: 15, total_net: 135,
    });
    expect(res.body.statistiques.par_moyen).toHaveLength(2);

    const filtered = await http().get('/api/paiements/clients?statut=paid')
      .set('Authorization', `Bearer ${clientToken}`).expect(200);
    expect(filtered.body.data).toHaveLength(1);
  });

  it('client show 404 for foreign paiement', async () => {
    const other = await seedClientUser(app, 'other-payer@aura.io');
    const list = await http().get('/api/paiements/clients')
      .set('Authorization', `Bearer ${clientToken}`).expect(200);
    const id = list.body.data[0].id;
    await http().get(`/api/paiements/${id}`)
      .set('Authorization', `Bearer ${clientToken}`).expect(200);
    const nf = await http().get(`/api/paiements/${id}`)
      .set('Authorization', `Bearer ${other.token}`).expect(404);
    expect(nf.body.message).toBe('Paiement non trouvé');
  });

  it('adminIndex lists all; adminStatistics aggregates; par_mois formatted YYYY-MM', async () => {
    const idx = await http().get('/api/paiements').expect(200);
    expect(idx.body.pagination.total).toBe(2);

    const stats = await http().get('/api/paiements/statistics').expect(200);
    expect(stats.body.data.general).toMatchObject({
      total_transactions: 2, montant_total: 150,
    });
    expect(stats.body.data.par_mois[0].mois).toMatch(/^\d{4}-\d{2}$/);
    expect(stats.body.data.par_statut.length).toBeGreaterThanOrEqual(2);
  });

  it('exports: JSON export only paid; CSV has French header and semicolons', async () => {
    const exp = await http().get('/api/paiements/export').expect(200);
    expect(exp.body.data.total_transactions).toBe(1);
    expect(exp.body.data.transactions[0].brut).toBe('100.00 €');

    const csv = await http().get('/api/paiements/export/csv').expect(200);
    expect(csv.body.data.filename).toMatch(/^export_paiements_\d{8}_\d{6}\.csv$/);
    const lines = csv.body.data.csv.split('\n');
    expect(lines[0]).toBe(
      'Référence;Date;Client;Email Client;Praticien;Brut (€);Commission (€);Net Praticien (€);Moyen de paiement;Statut',
    );
    expect(lines[1]).toContain('TX-11111;');

    const compta = await http().get('/api/paiements/export/comptable')
      .set('Authorization', `Bearer ${clientToken}`).expect(200);
    expect(compta.body.data.total_transactions).toBe(1);
    expect(compta.body.data.transactions[0].statut).toBe('paid');
  });

  it('DELETE /:id soft deletes', async () => {
    const idx = await http().get('/api/paiements').expect(200);
    const id = idx.body.data.find((p: any) => p.statut === 'en_attente').id;
    await http().delete(`/api/paiements/${id}`).expect(200);
    const after = await http().get('/api/paiements').expect(200);
    expect(after.body.pagination.total).toBe(1);
  });
});
