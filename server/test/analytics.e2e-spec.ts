import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { createTestApp, seedAdmin, seedClientUser } from './utils/create-test-app';
import { AnalyticsModule } from '../src/analytics/analytics.module';
import { Client } from '../src/database/entities/client.entity';
import { Praticien } from '../src/database/entities/praticien.entity';
import { RendezVous } from '../src/database/entities/rendez-vous.entity';
import { Paiement } from '../src/database/entities/paiement.entity';
import { Remboursement } from '../src/database/entities/remboursement.entity';

describe('analytics: guards', () => {
  let app: INestApplication;
  let clientToken: string;
  let adminToken: string;

  beforeAll(async () => {
    app = await createTestApp({ imports: [AnalyticsModule] });
    clientToken = (await seedClientUser(app, 'analytics-client@aura.io')).token;
    adminToken = (await seedAdmin(app, 'analytics-admin@aura.io')).token;
  });
  afterAll(async () => { await app.close(); });
  const http = () => request(app.getHttpServer());
  const asAdmin = (r: request.Test) => r.set('Authorization', `Bearer ${adminToken}`);
  const asClient = (r: request.Test) => r.set('Authorization', `Bearer ${clientToken}`);

  const ROUTES = ['dashboard', 'revenue', 'growth', 'retention'];

  it('all 4 routes require admin auth', async () => {
    for (const route of ROUTES) {
      await http().get(`/api/admin/analytics/${route}`).expect(401);
      await asClient(http().get(`/api/admin/analytics/${route}`)).expect(403);
      const res = await asAdmin(http().get(`/api/admin/analytics/${route}`)).expect(200);
      expect(res.body.status).toBe('success');
    }
  });
});

describe('analytics: dashboard', () => {
  let app: INestApplication;
  let adminToken: string;
  beforeAll(async () => {
    app = await createTestApp({ imports: [AnalyticsModule] });
    adminToken = (await seedAdmin(app, 'analytics-dashboard-admin@aura.io')).token;
  });
  afterAll(async () => { await app.close(); });
  const http = () => request(app.getHttpServer());
  const asAdmin = (r: request.Test) => r.set('Authorization', `Bearer ${adminToken}`);

  it('dashboard: composes this-month vs last-month deltas across paiements/remboursements/bookings/praticiens', async () => {
    const ds = app.get(DataSource);
    const now = new Date();
    const y = now.getUTCFullYear();
    const m = now.getUTCMonth();
    const thisMonthStart = new Date(Date.UTC(y, m, 1, 0, 0, 0));
    const prevRef = new Date(Date.UTC(y, m - 1, 1));
    const prevMonthStart = new Date(Date.UTC(prevRef.getUTCFullYear(), prevRef.getUTCMonth(), 1, 0, 0, 0));

    // Explicit created_at two months back: without an override, @CreateDateColumn stamps
    // this row with the actual test-run timestamp, which always falls in the current
    // calendar month and would incorrectly inflate new_praticiens_this_month below —
    // basePrat is a pre-existing baseline used only as an FK target, not a "new" praticien.
    const twoMonthsAgoRef = new Date(Date.UTC(y, m - 2, 1));
    const twoMonthsAgo = new Date(Date.UTC(twoMonthsAgoRef.getUTCFullYear(), twoMonthsAgoRef.getUTCMonth(), 15));
    const basePrat = await ds.getRepository(Praticien).save({
      firstname: 'Base', lastname: 'Prat', email: 'dash-base-prat@aura.io', telephone: '0600000000',
      ville: 'Paris', niveau: 'Novice', specialite: 'Reiki', mode: 'visio',
      status: 'actif', tarif: 50, experience: 1, bio: 'bio', created_at: twoMonthsAgo,
    });
    await ds.getRepository(Praticien).save([
      { firstname: 'New1', lastname: 'P', email: 'dash-new1@aura.io', telephone: '0600000001',
        ville: 'Paris', niveau: 'Novice', specialite: 'Magnétisme', mode: 'visio',
        status: 'actif', tarif: 50, experience: 1, bio: 'bio', created_at: thisMonthStart },
      { firstname: 'New2', lastname: 'P', email: 'dash-new2@aura.io', telephone: '0600000002',
        ville: 'Lyon', niveau: 'Novice', specialite: 'Hypnose', mode: 'visio',
        status: 'actif', tarif: 50, experience: 1, bio: 'bio', created_at: thisMonthStart },
    ]);
    await ds.getRepository(Praticien).save({
      firstname: 'Old1', lastname: 'P', email: 'dash-old1@aura.io', telephone: '0600000003',
      ville: 'Nice', niveau: 'Novice', specialite: 'Massage', mode: 'visio',
      status: 'actif', tarif: 50, experience: 1, bio: 'bio', created_at: prevMonthStart,
    });

    const seededClient = (await seedClientUser(app, 'dash-client@aura.io')).client;

    const paiements = await ds.getRepository(Paiement).save([
      { reference: 'DASH-1', client_id: seededClient.id, praticien_id: basePrat.id,
        montant_brut: 100, commission: 10, montant_net_praticien: 90, moyen_paiement: 'Carte',
        statut: 'paid', date_paiement: thisMonthStart },
      { reference: 'DASH-2', client_id: seededClient.id, praticien_id: basePrat.id,
        montant_brut: 200, commission: 20, montant_net_praticien: 180, moyen_paiement: 'Carte',
        statut: 'paid', date_paiement: thisMonthStart },
      { reference: 'DASH-3', client_id: seededClient.id, praticien_id: basePrat.id,
        montant_brut: 100, commission: 10, montant_net_praticien: 90, moyen_paiement: 'Carte',
        statut: 'paid', date_paiement: prevMonthStart },
    ]);

    await ds.getRepository(RendezVous).save([
      { client_id: seededClient.id, praticien_id: basePrat.id, date_heure: thisMonthStart,
        duree_minutes: 60, mode: 'visio', statut: 'confirme', tarif: 50 },
      { client_id: seededClient.id, praticien_id: basePrat.id, date_heure: thisMonthStart,
        duree_minutes: 60, mode: 'visio', statut: 'termine', tarif: 50 },
      { client_id: seededClient.id, praticien_id: basePrat.id, date_heure: thisMonthStart,
        duree_minutes: 60, mode: 'visio', statut: 'confirme', tarif: 50 },
      { client_id: seededClient.id, praticien_id: basePrat.id, date_heure: thisMonthStart,
        duree_minutes: 60, mode: 'visio', statut: 'annule', tarif: 50 },
      { client_id: seededClient.id, praticien_id: basePrat.id, date_heure: prevMonthStart,
        duree_minutes: 60, mode: 'visio', statut: 'confirme', tarif: 50 },
      { client_id: seededClient.id, praticien_id: basePrat.id, date_heure: prevMonthStart,
        duree_minutes: 60, mode: 'visio', statut: 'confirme', tarif: 50 },
    ]);

    await ds.getRepository(Remboursement).save({
      reference: 'RMB-DASH-1', client_id: seededClient.id, paiement_id: paiements[0].id,
      montant: 50, motif: 'Test', statut: 'en_attente', created_at: thisMonthStart,
    });

    const res = await asAdmin(http().get('/api/admin/analytics/dashboard')).expect(200);
    expect(res.body.data).toMatchObject({
      revenue_this_month: 300,
      revenue_delta_pct: 200,
      bookings_this_month: 3,
      bookings_delta_pct: 50,
      new_praticiens_this_month: 2,
      new_praticiens_delta: 1,
      refund_rate: '33.3%',
    });
  });
});

describe('analytics: revenue', () => {
  let app: INestApplication;
  let adminToken: string;
  beforeAll(async () => {
    app = await createTestApp({ imports: [AnalyticsModule] });
    adminToken = (await seedAdmin(app, 'analytics-revenue-admin@aura.io')).token;
  });
  afterAll(async () => { await app.close(); });
  const http = () => request(app.getHttpServer());
  const asAdmin = (r: request.Test) => r.set('Authorization', `Bearer ${adminToken}`);

  it('revenue: composes general totals, adds per-month commission/net and discipline share', async () => {
    const ds = app.get(DataSource);
    const now = new Date();
    const y = now.getUTCFullYear();
    const m = now.getUTCMonth();
    const thisMonthStart = new Date(Date.UTC(y, m, 1, 0, 0, 0));
    const prevRef = new Date(Date.UTC(y, m - 1, 1));
    const prevMonthStart = new Date(Date.UTC(prevRef.getUTCFullYear(), prevRef.getUTCMonth(), 1, 0, 0, 0));
    const thisYm = `${y}-${String(m + 1).padStart(2, '0')}`;
    const prevYm = `${prevRef.getUTCFullYear()}-${String(prevRef.getUTCMonth() + 1).padStart(2, '0')}`;

    const reiki = await ds.getRepository(Praticien).save({
      firstname: 'R', lastname: 'P', email: 'rev-reiki@aura.io', telephone: '0600000010',
      ville: 'Paris', niveau: 'Novice', specialite: 'Reiki', mode: 'visio',
      status: 'actif', tarif: 50, experience: 1, bio: 'bio',
    });
    const magnetisme = await ds.getRepository(Praticien).save({
      firstname: 'M', lastname: 'P', email: 'rev-magnetisme@aura.io', telephone: '0600000011',
      ville: 'Lyon', niveau: 'Novice', specialite: 'Magnétisme', mode: 'visio',
      status: 'actif', tarif: 50, experience: 1, bio: 'bio',
    });
    const seededClient = (await seedClientUser(app, 'rev-client@aura.io')).client;

    await ds.getRepository(Paiement).save([
      { reference: 'REV-1', client_id: seededClient.id, praticien_id: reiki.id,
        montant_brut: 100, commission: 10, montant_net_praticien: 90, moyen_paiement: 'Carte',
        statut: 'paid', date_paiement: thisMonthStart },
      { reference: 'REV-2', client_id: seededClient.id, praticien_id: magnetisme.id,
        montant_brut: 50, commission: 5, montant_net_praticien: 45, moyen_paiement: 'Carte',
        statut: 'en_attente', date_paiement: thisMonthStart },
      { reference: 'REV-3', client_id: seededClient.id, praticien_id: reiki.id,
        montant_brut: 150, commission: 15, montant_net_praticien: 135, moyen_paiement: 'Carte',
        statut: 'paid', date_paiement: prevMonthStart },
    ]);

    const res = await asAdmin(http().get('/api/admin/analytics/revenue')).expect(200);
    expect(res.body.data.general).toMatchObject({
      total_transactions: 3, montant_total: 300, commission_totale: 30, net_total: 270,
    });
    const parMois = res.body.data.par_mois;
    expect(parMois.find((r: any) => r.mois === thisYm)).toEqual({ mois: thisYm, total: 150, commission: 15, net: 135 });
    expect(parMois.find((r: any) => r.mois === prevYm)).toEqual({ mois: prevYm, total: 150, commission: 15, net: 135 });
    expect(res.body.data.par_discipline).toEqual([
      { specialite: 'Reiki', total: 250, pct: 83.3 },
      { specialite: 'Magnétisme', total: 50, pct: 16.7 },
    ]);
  });
});
