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
import { currentWeekRange } from '../src/analytics/analytics.utils';

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
      // Refund rate is refunds-created-this-month ÷ paid-payments-this-month: 1 refund / 2 paid
      // paiements this month (DASH-1, DASH-2 — DASH-3 is last month) = 50%. Both numerator and
      // denominator are scoped to the same date_debut/date_fin window (review-fixed: previously
      // the denominator was silently all-time regardless of any date filter).
      refund_rate: '50.0%',
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

describe('analytics: growth', () => {
  let app: INestApplication;
  let adminToken: string;
  beforeAll(async () => {
    app = await createTestApp({ imports: [AnalyticsModule] });
    adminToken = (await seedAdmin(app, 'analytics-growth-admin@aura.io')).token;
  });
  afterAll(async () => { await app.close(); });
  const http = () => request(app.getHttpServer());
  const asAdmin = (r: request.Test) => r.set('Authorization', `Bearer ${adminToken}`);

  it('growth: signups by month, this-week daily bookings, conversion/activation rates, avg days to first booking', async () => {
    const ds = app.get(DataSource);
    const now = new Date();
    const twoMonthsAgo = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 2, 1, 0, 0, 0));
    const threeMonthsAgo = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 3, 1, 0, 0, 0));
    const twoMonthsAgoYm = `${twoMonthsAgo.getUTCFullYear()}-${String(twoMonthsAgo.getUTCMonth() + 1).padStart(2, '0')}`;
    const threeMonthsAgoYm = `${threeMonthsAgo.getUTCFullYear()}-${String(threeMonthsAgo.getUTCMonth() + 1).padStart(2, '0')}`;
    const recentDate = new Date(now.getTime() - 12 * 24 * 60 * 60 * 1000); // always < 30 days old

    const prat = await ds.getRepository(Praticien).save({
      firstname: 'G', lastname: 'P', email: 'growth-prat@aura.io', telephone: '0600000020',
      ville: 'Paris', niveau: 'Novice', specialite: 'Reiki', mode: 'visio',
      status: 'actif', tarif: 50, experience: 1, bio: 'bio',
    });

    // 2 months ago: 3 signups, none booked
    await ds.getRepository(Client).save([
      { firstname: 'C1', lastname: 'X', email: 'growth-c1@aura.io', city: 'Paris', created_at: twoMonthsAgo },
      { firstname: 'C2', lastname: 'X', email: 'growth-c2@aura.io', city: 'Paris', created_at: twoMonthsAgo },
      { firstname: 'C3', lastname: 'X', email: 'growth-c3@aura.io', city: 'Paris', created_at: twoMonthsAgo },
    ]);
    // 3 months ago: 2 signups, C4 books 5 days after signup, C5 never books
    const c4 = await ds.getRepository(Client).save({
      firstname: 'C4', lastname: 'X', email: 'growth-c4@aura.io', city: 'Paris', created_at: threeMonthsAgo,
    });
    await ds.getRepository(Client).save({
      firstname: 'C5', lastname: 'X', email: 'growth-c5@aura.io', city: 'Paris', created_at: threeMonthsAgo,
    });
    // Recent (12 days ago): C6 books 10 days ago (2 days after signup, activated), C7 never books
    const c6 = await ds.getRepository(Client).save({
      firstname: 'C6', lastname: 'X', email: 'growth-c6@aura.io', city: 'Paris', created_at: recentDate,
    });
    await ds.getRepository(Client).save({
      firstname: 'C7', lastname: 'X', email: 'growth-c7@aura.io', city: 'Paris', created_at: recentDate,
    });

    await ds.getRepository(RendezVous).save([
      { client_id: c4.id, praticien_id: prat.id,
        date_heure: new Date(threeMonthsAgo.getTime() + 5 * 24 * 60 * 60 * 1000),
        duree_minutes: 60, mode: 'visio', statut: 'confirme', tarif: 50 },
      { client_id: c6.id, praticien_id: prat.id,
        date_heure: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
        duree_minutes: 60, mode: 'visio', statut: 'confirme', tarif: 50 },
    ]);

    // This-week bookings, anchored to the same reference logic the endpoint uses. A dedicated
    // client (C8) is used here rather than reusing C1-C7 — its bookings are dated relative to
    // `weekStart` (which itself is relative to "now"), so its `created_at` must ALSO be anchored
    // to `weekStart` (not to a fixed calendar month) for its contribution to
    // `avg_days_to_first_booking` to be a fixed, hand-computable number regardless of what day
    // the suite happens to run on.
    const { start: weekStart } = currentWeekRange(now);
    const c8 = await ds.getRepository(Client).save({
      firstname: 'C8', lastname: 'X', email: 'growth-c8@aura.io', city: 'Paris',
      created_at: new Date(weekStart.getTime() - 30 * 24 * 60 * 60 * 1000),
    });
    await ds.getRepository(RendezVous).save([
      { client_id: c8.id, praticien_id: prat.id, date_heure: weekStart,
        duree_minutes: 60, mode: 'visio', statut: 'confirme', tarif: 50 },
      { client_id: c8.id, praticien_id: prat.id, date_heure: weekStart,
        duree_minutes: 60, mode: 'visio', statut: 'termine', tarif: 50 },
      { client_id: c8.id, praticien_id: prat.id,
        date_heure: new Date(weekStart.getTime() + 2 * 24 * 60 * 60 * 1000),
        duree_minutes: 60, mode: 'visio', statut: 'confirme', tarif: 50 },
      { client_id: c8.id, praticien_id: prat.id,
        date_heure: new Date(weekStart.getTime() - 24 * 60 * 60 * 1000), // previous week, excluded from bookings_this_week
        duree_minutes: 60, mode: 'visio', statut: 'confirme', tarif: 50 },
      { client_id: c8.id, praticien_id: prat.id, date_heure: weekStart, // cancelled, excluded everywhere
        duree_minutes: 60, mode: 'visio', statut: 'annule', tarif: 50 },
    ]);

    const res = await asAdmin(http().get('/api/admin/analytics/growth')).expect(200);
    const signups = res.body.data.signups;
    expect(signups.find((r: any) => r.mois === twoMonthsAgoYm)).toEqual({ mois: twoMonthsAgoYm, count: 3 });
    expect(signups.find((r: any) => r.mois === threeMonthsAgoYm)).toEqual({ mois: threeMonthsAgoYm, count: 2 });
    expect(res.body.data.bookings_this_week).toEqual([
      { jour: 'Lun', count: 2 }, { jour: 'Mar', count: 0 }, { jour: 'Mer', count: 1 },
      { jour: 'Jeu', count: 0 }, { jour: 'Ven', count: 0 }, { jour: 'Sam', count: 0 }, { jour: 'Dim', count: 0 },
    ]);
    // 8 total clients seeded here (C1-C8); 3 have ever booked (C4, C6, C8) -> 3/8 = 37.5%
    expect(res.body.data.conversion_rate_pct).toBe(37.5);
    // recent (<=30d) clients: C6, C7 (C8's created_at is always <= weekStart-30d <= now-30d, so it
    // never falls inside the 30-day recency window); 1 of 2 activated -> 50%
    expect(res.body.data.activation_rate_pct).toBe(50);
    // avg days to first booking: C4 (5 days), C6 (2 days), C8 (its earliest non-cancelled booking
    // is weekStart-1day, exactly 29 days after its created_at of weekStart-30days) -> (5+2+29)/3 = 12
    expect(res.body.data.avg_days_to_first_booking).toBe(12);
    expect(res.body.data.funnel).toEqual({ visiteurs: null, inscrits: 8, a_reserve: 3 });
  });
});

describe('analytics: retention', () => {
  let app: INestApplication;
  let adminToken: string;
  beforeAll(async () => {
    app = await createTestApp({ imports: [AnalyticsModule] });
    adminToken = (await seedAdmin(app, 'analytics-retention-admin@aura.io')).token;
  });
  afterAll(async () => { await app.close(); });
  const http = () => request(app.getHttpServer());
  const asAdmin = (r: request.Test) => r.set('Authorization', `Bearer ${adminToken}`);

  it('retention: signup-month cohort table, weighted overall + curve, repeat distribution, CLV, churn', async () => {
    const ds = app.get(DataSource);
    const now = new Date();
    const cohortAMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 3, 1, 0, 0, 0));
    const cohortBMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1, 0, 0, 0));
    const cohortAYm = `${cohortAMonth.getUTCFullYear()}-${String(cohortAMonth.getUTCMonth() + 1).padStart(2, '0')}`;
    const cohortBYm = `${cohortBMonth.getUTCFullYear()}-${String(cohortBMonth.getUTCMonth() + 1).padStart(2, '0')}`;

    const prat = await ds.getRepository(Praticien).save({
      firstname: 'R', lastname: 'P', email: 'ret-prat@aura.io', telephone: '0600000030',
      ville: 'Paris', niveau: 'Novice', specialite: 'Reiki', mode: 'visio',
      status: 'actif', tarif: 50, experience: 1, bio: 'bio',
    });

    // Cohort A (3 months ago): A1 retained at m1/m2/m3, A2 retained only at m1
    const a1 = await ds.getRepository(Client).save({
      firstname: 'A1', lastname: 'X', email: 'ret-a1@aura.io', city: 'Paris', created_at: cohortAMonth,
    });
    const a2 = await ds.getRepository(Client).save({
      firstname: 'A2', lastname: 'X', email: 'ret-a2@aura.io', city: 'Paris', created_at: cohortAMonth,
    });
    // Cohort B (1 month ago): B1, never books
    await ds.getRepository(Client).save({
      firstname: 'B1', lastname: 'X', email: 'ret-b1@aura.io', city: 'Paris', created_at: cohortBMonth,
    });

    const monthPlus = (base: Date, n: number) => new Date(Date.UTC(
      base.getUTCFullYear(), base.getUTCMonth() + n, 15, 0, 0, 0,
    ));
    await ds.getRepository(RendezVous).save([
      // A1: bookings in cohortA+1, +2, +3
      { client_id: a1.id, praticien_id: prat.id, date_heure: monthPlus(cohortAMonth, 1),
        duree_minutes: 60, mode: 'visio', statut: 'confirme', tarif: 50 },
      { client_id: a1.id, praticien_id: prat.id, date_heure: monthPlus(cohortAMonth, 2),
        duree_minutes: 60, mode: 'visio', statut: 'confirme', tarif: 50 },
      { client_id: a1.id, praticien_id: prat.id, date_heure: monthPlus(cohortAMonth, 3),
        duree_minutes: 60, mode: 'visio', statut: 'confirme', tarif: 50 },
      // A2: booking only in cohortA+1
      { client_id: a2.id, praticien_id: prat.id, date_heure: monthPlus(cohortAMonth, 1),
        duree_minutes: 60, mode: 'visio', statut: 'confirme', tarif: 50 },
    ]);

    // paid paiements for CLV: A1 = 100+150=250, A2 = 80
    await ds.getRepository(Paiement).save([
      { reference: 'RET-1', client_id: a1.id, praticien_id: prat.id, montant_brut: 100, commission: 10,
        montant_net_praticien: 90, moyen_paiement: 'Carte', statut: 'paid', date_paiement: monthPlus(cohortAMonth, 1) },
      { reference: 'RET-2', client_id: a1.id, praticien_id: prat.id, montant_brut: 150, commission: 15,
        montant_net_praticien: 135, moyen_paiement: 'Carte', statut: 'paid', date_paiement: monthPlus(cohortAMonth, 2) },
      { reference: 'RET-3', client_id: a2.id, praticien_id: prat.id, montant_brut: 80, commission: 8,
        montant_net_praticien: 72, moyen_paiement: 'Carte', statut: 'paid', date_paiement: monthPlus(cohortAMonth, 1) },
    ]);

    const res = await asAdmin(http().get('/api/admin/analytics/retention')).expect(200);
    const cohorts = res.body.data.cohorts;
    expect(cohorts).toEqual([
      { cohort: cohortAYm, size: 2, m1: 100, m2: 50, m3: 50, m6: null, m12: null },
      { cohort: cohortBYm, size: 1, m1: 0, m2: null, m3: null, m6: null, m12: null },
    ]);
    expect(res.body.data.overall).toEqual({
      retention_30j_pct: 66.7,   // (2 retained + 0 retained) / (2 + 1) at offset 1
      retention_90j_pct: 50,     // 1/2 at offset 3 (only cohort A eligible)
      retention_12m_pct: null,   // no cohort has reached +12 months yet
      curve: [
        { offset: 'M0', pct: 100 }, { offset: 'M1', pct: 66.7 }, { offset: 'M2', pct: 50 },
        { offset: 'M3', pct: 50 }, { offset: 'M6', pct: null }, { offset: 'M12', pct: null },
      ],
    });
    expect(res.body.data.repeat_bookings).toEqual([
      { label: '1 séance', count: 1, pct: 50 },
      { label: '2 à 3 séances', count: 1, pct: 50 },
      { label: '4 à 6 séances', count: 0, pct: 0 },
      { label: '7 séances et +', count: 0, pct: 0 },
    ]);
    expect(res.body.data.repeat_rate_pct).toBe(50);
    expect(res.body.data.avg_lifetime_value).toBe(165);
    expect(res.body.data.churn_rate_pct).toBe(50);
    expect(res.body.data.churn_reasons).toBeNull();
  });
});
