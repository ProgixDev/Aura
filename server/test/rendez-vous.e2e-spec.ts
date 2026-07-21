import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { createTestApp, seedAdmin, seedClientUser } from './utils/create-test-app';
import { RendezVousModule } from '../src/rendez-vous/rendez-vous.module';
import { StripeService } from '../src/common/stripe.service';
import { Praticien } from '../src/database/entities/praticien.entity';
import { Promotion } from '../src/database/entities/promotion.entity';
import { Paiement } from '../src/database/entities/paiement.entity';
import { RendezVous } from '../src/database/entities/rendez-vous.entity';
import { Client } from '../src/database/entities/client.entity';

const stripeServiceMock = {
  createPaymentIntent: jest.fn().mockResolvedValue({ id: 'pi_test_123', client_secret: 'pi_test_123_secret_abc' }),
  constructWebhookEvent: jest.fn(),
};

const future = () => {
  const d = new Date(); d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
};

describe('rendez-vous', () => {
  let app: INestApplication;
  let ds: DataSource;
  let clientToken: string;
  let adminToken: string;
  let praticienId: number;

  beforeAll(async () => {
    app = await createTestApp(
      { imports: [RendezVousModule] },
      [{ provide: StripeService, useValue: stripeServiceMock }],
    );
    clientToken = (await seedClientUser(app, 'rdv-client@aura.io')).token;
    adminToken = (await seedAdmin(app, 'rdv-admin@aura.io')).token;
    ds = app.get(DataSource);
    const praticien = await ds.getRepository(Praticien).save({
      firstname: 'Elodie', lastname: 'Marceau', email: 'elodie@aura.io', telephone: '06',
      ville: 'Annecy', niveau: 'Expert', specialite: 'Magnétisme', mode: 'présentiel & visio',
      status: 'actif', tarif: 80, experience: 10, bio: 'Praticienne expérimentée.',
    });
    praticienId = praticien.id;
    await ds.getRepository(Promotion).save({
      code: 'PROMO10', type: 'pourcentage', valeur: 10, date_expiration: future(),
    });
  });
  afterAll(async () => { await app.close(); });
  beforeEach(() => { jest.clearAllMocks(); });
  const http = () => request(app.getHttpServer());

  it('POST /api/rendez-vous requires auth', async () => {
    await http().post('/api/rendez-vous')
      .send({ praticien_id: praticienId, date_heure: '2026-08-01T14:00:00', mode: 'présentiel' })
      .expect(401);
  });

  it('POST /api/rendez-vous 404s for a missing praticien', async () => {
    const res = await http().post('/api/rendez-vous')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ praticien_id: 999999, date_heure: '2026-08-01T14:00:00', mode: 'présentiel' })
      .expect(404);
    expect(res.body.message).toBe('Praticien introuvable');
  });

  it('POST /api/rendez-vous rejects a date_heure in the past', async () => {
    const res = await http().post('/api/rendez-vous')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ praticien_id: praticienId, date_heure: '2020-01-01T14:00:00', mode: 'présentiel' })
      .expect(400);
    expect(res.body.message).toBe('Le rendez-vous doit être réservé au moins un jour à l\'avance.');
  });

  it('POST /api/rendez-vous rejects a same-day date_heure (must book at least a day ahead)', async () => {
    const now = new Date();
    const todayLater = new Date(Date.UTC(
      now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 0, 0, 0,
    ));
    const res = await http().post('/api/rendez-vous')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ praticien_id: praticienId, date_heure: todayLater.toISOString(), mode: 'présentiel' })
      .expect(400);
    expect(res.body.message).toBe('Le rendez-vous doit être réservé au moins un jour à l\'avance.');
  });

  it('POST /api/rendez-vous creates an en_attente rendez_vous and a PaymentIntent', async () => {
    const res = await http().post('/api/rendez-vous')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ praticien_id: praticienId, date_heure: '2026-08-01T14:00:00', mode: 'présentiel' })
      .expect(201);
    expect(res.body.data.rendez_vous).toMatchObject({
      praticien_id: praticienId, mode: 'présentiel', statut: 'en_attente', tarif: 80,
    });
    expect(res.body.data.client_secret).toBe('pi_test_123_secret_abc');
    expect(stripeServiceMock.createPaymentIntent).toHaveBeenCalledWith(
      8000, { rendez_vous_id: String(res.body.data.rendez_vous.id) },
    );
  });

  it('POST /api/rendez-vous applies a valid promotion_code and discounts the tarif', async () => {
    const res = await http().post('/api/rendez-vous')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ praticien_id: praticienId, date_heure: '2026-08-01T15:00:00', mode: 'visio', promotion_code: 'PROMO10' })
      .expect(201);
    expect(res.body.data.rendez_vous.tarif).toBe(72); // 80 - 10%
    expect(stripeServiceMock.createPaymentIntent).toHaveBeenCalledWith(7200, expect.any(Object));
  });

  it('POST /api/rendez-vous 404s for an invalid promotion_code', async () => {
    const res = await http().post('/api/rendez-vous')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ praticien_id: praticienId, date_heure: '2026-08-01T16:00:00', mode: 'visio', promotion_code: 'NOPE' })
      .expect(404);
    expect(res.body.message).toBe('Code promo invalide ou expiré');
  });

  it("GET /api/rendez-vous/client lists only the client's own rows, filterable by statut", async () => {
    const created = await http().post('/api/rendez-vous').set('Authorization', `Bearer ${clientToken}`)
      .send({ praticien_id: praticienId, date_heure: '2026-08-03T10:00:00', mode: 'visio' }).expect(201);
    const newId = created.body.data.rendez_vous.id;

    const other = await seedClientUser(app, 'rdv-other@aura.io');
    await http().post('/api/rendez-vous').set('Authorization', `Bearer ${other.token}`)
      .send({ praticien_id: praticienId, date_heure: '2026-08-03T11:00:00', mode: 'visio' }).expect(201);

    const res = await http().get('/api/rendez-vous/client')
      .set('Authorization', `Bearer ${clientToken}`).expect(200);
    const ids = res.body.data.map((r: any) => r.id);
    expect(ids).toContain(newId);
    expect(res.body.data.every((r: any) => r.client_id !== other.client.id)).toBe(true);

    const filtered = await http().get('/api/rendez-vous/client?statut=en_attente')
      .set('Authorization', `Bearer ${clientToken}`).expect(200);
    expect(filtered.body.data.every((r: any) => r.statut === 'en_attente')).toBe(true);
  });

  it("GET /api/rendez-vous/client/:id returns the owner's rendez-vous with the praticien relation, 404s otherwise", async () => {
    const created = await http().post('/api/rendez-vous').set('Authorization', `Bearer ${clientToken}`)
      .send({ praticien_id: praticienId, date_heure: '2026-08-04T10:00:00', mode: 'présentiel' }).expect(201);
    const id = created.body.data.rendez_vous.id;

    const shown = await http().get(`/api/rendez-vous/client/${id}`)
      .set('Authorization', `Bearer ${clientToken}`).expect(200);
    expect(shown.body.data.praticien).toMatchObject({ id: praticienId, firstname: 'Elodie' });

    const other = await seedClientUser(app, 'rdv-show-other@aura.io');
    await http().get(`/api/rendez-vous/client/${id}`)
      .set('Authorization', `Bearer ${other.token}`).expect(404);
    await http().get('/api/rendez-vous/client/999999')
      .set('Authorization', `Bearer ${clientToken}`).expect(404);
  });

  it('POST /api/rendez-vous/client/:id/cancel cancels an en_attente row; repeat cancel 404s', async () => {
    const created = await http().post('/api/rendez-vous').set('Authorization', `Bearer ${clientToken}`)
      .send({ praticien_id: praticienId, date_heure: '2026-08-05T10:00:00', mode: 'visio' }).expect(201);
    const id = created.body.data.rendez_vous.id;

    const cancelled = await http().post(`/api/rendez-vous/client/${id}/cancel`)
      .set('Authorization', `Bearer ${clientToken}`).expect(200);
    expect(cancelled.body.data.statut).toBe('annule');
    expect(cancelled.body.message).toBe('Rendez-vous annulé avec succès');

    const again = await http().post(`/api/rendez-vous/client/${id}/cancel`)
      .set('Authorization', `Bearer ${clientToken}`).expect(404);
    expect(again.body.message).toBe('Rendez-vous non trouvé ou ne peut pas être annulé');
  });

  it('POST /api/webhooks/stripe returns 400 when the signature cannot be verified', async () => {
    stripeServiceMock.constructWebhookEvent.mockImplementationOnce(() => {
      throw new Error('invalid signature');
    });
    const res = await http().post('/api/webhooks/stripe')
      .set('stripe-signature', 'bad-sig')
      .send({ id: 'evt_bad', type: 'payment_intent.succeeded' })
      .expect(400);
    expect(res.body.message).toBe('Signature Stripe invalide');
  });

  it('POST /api/webhooks/stripe confirms the rendez_vous and creates a paiements row exactly once, even on retry', async () => {
    const created = await http().post('/api/rendez-vous').set('Authorization', `Bearer ${clientToken}`)
      .send({ praticien_id: praticienId, date_heure: '2026-08-06T10:00:00', mode: 'présentiel' }).expect(201);
    const rdv = created.body.data.rendez_vous;

    const fakeEvent = {
      id: 'evt_succeeded',
      type: 'payment_intent.succeeded',
      data: { object: { id: 'pi_test_123', metadata: { rendez_vous_id: String(rdv.id) } } },
    };
    stripeServiceMock.constructWebhookEvent.mockImplementation((rawBody: unknown) => {
      // Proves the raw-body plumbing actually works, not just that the mock returns something.
      expect(Buffer.isBuffer(rawBody)).toBe(true);
      expect((rawBody as Buffer).length).toBeGreaterThan(0);
      return fakeEvent;
    });

    await http().post('/api/webhooks/stripe').set('stripe-signature', 'sig').send(fakeEvent).expect(200);

    const shown = await http().get(`/api/rendez-vous/client/${rdv.id}`)
      .set('Authorization', `Bearer ${clientToken}`).expect(200);
    expect(shown.body.data.statut).toBe('confirme');

    const paiementRows = await ds.getRepository(Paiement).findBy({ rendez_vous_id: rdv.id });
    expect(paiementRows).toHaveLength(1);
    expect(paiementRows[0]).toMatchObject({ statut: 'paid', moyen_paiement: 'card' });
    expect(paiementRows[0].montant_brut).toBe(rdv.tarif);

    // Stripe retries undelivered/unacknowledged events — must not double-create the paiements row.
    await http().post('/api/webhooks/stripe').set('stripe-signature', 'sig').send(fakeEvent).expect(200);
    const afterRetry = await ds.getRepository(Paiement).findBy({ rendez_vous_id: rdv.id });
    expect(afterRetry).toHaveLength(1);
  });

  it('POST /api/webhooks/stripe cancels the rendez_vous on payment_intent.payment_failed', async () => {
    const created = await http().post('/api/rendez-vous').set('Authorization', `Bearer ${clientToken}`)
      .send({ praticien_id: praticienId, date_heure: '2026-08-07T10:00:00', mode: 'visio' }).expect(201);
    const rdv = created.body.data.rendez_vous;

    const fakeEvent = {
      id: 'evt_failed',
      type: 'payment_intent.payment_failed',
      data: { object: { id: 'pi_test_456', metadata: { rendez_vous_id: String(rdv.id) } } },
    };
    stripeServiceMock.constructWebhookEvent.mockImplementation(() => fakeEvent);

    await http().post('/api/webhooks/stripe').set('stripe-signature', 'sig').send(fakeEvent).expect(200);

    const shown = await http().get(`/api/rendez-vous/client/${rdv.id}`)
      .set('Authorization', `Bearer ${clientToken}`).expect(200);
    expect(shown.body.data.statut).toBe('annule');
  });

  it('Paiement.rendezVous relation loads the linked rendez_vous', async () => {
    const created = await http().post('/api/rendez-vous').set('Authorization', `Bearer ${clientToken}`)
      .send({ praticien_id: praticienId, date_heure: '2026-08-08T10:00:00', mode: 'présentiel' }).expect(201);
    const rdv = created.body.data.rendez_vous;

    const fakeEvent = {
      id: 'evt_relation_check',
      type: 'payment_intent.succeeded',
      data: { object: { id: 'pi_relation', metadata: { rendez_vous_id: String(rdv.id) } } },
    };
    stripeServiceMock.constructWebhookEvent.mockImplementation(() => fakeEvent);
    await http().post('/api/webhooks/stripe').set('stripe-signature', 'sig').send(fakeEvent).expect(200);

    const paiement = await ds.getRepository(Paiement).findOne({
      where: { rendez_vous_id: rdv.id }, relations: { rendezVous: true },
    });
    expect(paiement?.rendezVous?.id).toBe(rdv.id);
    expect(paiement?.rendezVous?.statut).toBe('confirme');
  });

  it('POST /api/webhooks/stripe stays idempotent under concurrent delivery of the same event', async () => {
    const created = await http().post('/api/rendez-vous').set('Authorization', `Bearer ${clientToken}`)
      .send({ praticien_id: praticienId, date_heure: '2026-08-09T10:00:00', mode: 'présentiel' }).expect(201);
    const rdv = created.body.data.rendez_vous;

    const fakeEvent = {
      id: 'evt_concurrent',
      type: 'payment_intent.succeeded',
      data: { object: { id: 'pi_concurrent', metadata: { rendez_vous_id: String(rdv.id) } } },
    };
    stripeServiceMock.constructWebhookEvent.mockImplementation(() => fakeEvent);

    // Fired together (not awaited sequentially) to actually exercise the race the
    // findOneBy-then-save check alone can't close — the UNIQUE constraint on
    // rendez_vous_id is the real backstop here.
    await Promise.all([
      http().post('/api/webhooks/stripe').set('stripe-signature', 'sig').send(fakeEvent),
      http().post('/api/webhooks/stripe').set('stripe-signature', 'sig').send(fakeEvent),
    ]);

    const paiementRows = await ds.getRepository(Paiement).findBy({ rendez_vous_id: rdv.id });
    expect(paiementRows).toHaveLength(1);
  });

  it('POST /api/webhooks/stripe does not resurrect an already-cancelled rendez_vous', async () => {
    const created = await http().post('/api/rendez-vous').set('Authorization', `Bearer ${clientToken}`)
      .send({ praticien_id: praticienId, date_heure: '2026-08-10T10:00:00', mode: 'visio' }).expect(201);
    const rdv = created.body.data.rendez_vous;

    await http().post(`/api/rendez-vous/client/${rdv.id}/cancel`)
      .set('Authorization', `Bearer ${clientToken}`).expect(200);

    const fakeEvent = {
      id: 'evt_late_success',
      type: 'payment_intent.succeeded',
      data: { object: { id: 'pi_late', metadata: { rendez_vous_id: String(rdv.id) } } },
    };
    stripeServiceMock.constructWebhookEvent.mockImplementation(() => fakeEvent);
    await http().post('/api/webhooks/stripe').set('stripe-signature', 'sig').send(fakeEvent).expect(200);

    const shown = await http().get(`/api/rendez-vous/client/${rdv.id}`)
      .set('Authorization', `Bearer ${clientToken}`).expect(200);
    expect(shown.body.data.statut).toBe('annule');

    const paiementRows = await ds.getRepository(Paiement).findBy({ rendez_vous_id: rdv.id });
    expect(paiementRows).toHaveLength(0);
  });

  it('POST /api/webhooks/stripe does not un-confirm an already-confirmed rendez_vous on a stale payment_intent.payment_failed', async () => {
    const created = await http().post('/api/rendez-vous').set('Authorization', `Bearer ${clientToken}`)
      .send({ praticien_id: praticienId, date_heure: '2026-08-11T10:00:00', mode: 'présentiel' }).expect(201);
    const rdv = created.body.data.rendez_vous;

    const succeeded = {
      id: 'evt_confirmed_first',
      type: 'payment_intent.succeeded',
      data: { object: { id: 'pi_first', metadata: { rendez_vous_id: String(rdv.id) } } },
    };
    stripeServiceMock.constructWebhookEvent.mockImplementation(() => succeeded);
    await http().post('/api/webhooks/stripe').set('stripe-signature', 'sig').send(succeeded).expect(200);

    const stale = {
      id: 'evt_stale_failed',
      type: 'payment_intent.payment_failed',
      data: { object: { id: 'pi_stale', metadata: { rendez_vous_id: String(rdv.id) } } },
    };
    stripeServiceMock.constructWebhookEvent.mockImplementation(() => stale);
    await http().post('/api/webhooks/stripe').set('stripe-signature', 'sig').send(stale).expect(200);

    const shown = await http().get(`/api/rendez-vous/client/${rdv.id}`)
      .set('Authorization', `Bearer ${clientToken}`).expect(200);
    expect(shown.body.data.statut).toBe('confirme');
  });

  // ---- admin ----

  const asAdmin = (r: request.Test) => r.set('Authorization', `Bearer ${adminToken}`);

  it('GET /api/admin/rendez-vous requires AdminGuard (401 without a token, 403 for a non-admin user)', async () => {
    await http().get('/api/admin/rendez-vous').expect(401);
    await http().get('/api/admin/rendez-vous').set('Authorization', `Bearer ${clientToken}`).expect(403);
  });

  it('GET /api/admin/rendez-vous lists rendez-vous with client+praticien joined and a statistiques block', async () => {
    const client = await ds.getRepository(Client).save({
      firstname: 'Nadia', lastname: 'Chevalier', email: 'nadia.chevalier@example.com', city: 'Lyon',
    });
    const rdv = await ds.getRepository(RendezVous).save({
      client_id: client.id, praticien_id: praticienId, date_heure: new Date('2031-01-01T10:00:00'),
      duree_minutes: 60, mode: 'présentiel', statut: 'en_attente', tarif: 80,
    });

    const res = await asAdmin(http().get('/api/admin/rendez-vous?per_page=100')).expect(200);
    const row = res.body.data.find((r: any) => r.id === rdv.id);
    expect(row).toBeTruthy();
    expect(row.client).toMatchObject({ id: client.id, firstname: 'Nadia', lastname: 'Chevalier' });
    expect(row.praticien).toMatchObject({ id: praticienId, firstname: 'Elodie', lastname: 'Marceau' });
    expect(res.body.pagination).toMatchObject({ current_page: 1, per_page: 100 });
    expect(res.body.statistiques).toMatchObject({
      total: expect.any(Number),
      en_attente: expect.any(Number),
      confirme: expect.any(Number),
      termine: expect.any(Number),
      annule: expect.any(Number),
    });
    expect(res.body.statistiques.total).toBeGreaterThanOrEqual(1);
  });

  it('?statut=confirme filters the admin list', async () => {
    const client = await ds.getRepository(Client).save({
      firstname: 'Oscar', lastname: 'Fontaine', email: 'oscar.fontaine@example.com', city: 'Nice',
    });
    const confirme = await ds.getRepository(RendezVous).save({
      client_id: client.id, praticien_id: praticienId, date_heure: new Date('2031-02-01T10:00:00'),
      duree_minutes: 60, mode: 'visio', statut: 'confirme', tarif: 80,
    });
    const enAttente = await ds.getRepository(RendezVous).save({
      client_id: client.id, praticien_id: praticienId, date_heure: new Date('2031-02-02T10:00:00'),
      duree_minutes: 60, mode: 'visio', statut: 'en_attente', tarif: 80,
    });

    const res = await asAdmin(http().get('/api/admin/rendez-vous?statut=confirme&per_page=100')).expect(200);
    const ids = res.body.data.map((r: any) => r.id);
    expect(ids).toContain(confirme.id);
    expect(ids).not.toContain(enAttente.id);
    expect(res.body.data.every((r: any) => r.statut === 'confirme')).toBe(true);
  });

  it('?praticien_id filters the admin list', async () => {
    const client = await ds.getRepository(Client).save({
      firstname: 'Pauline', lastname: 'Girard', email: 'pauline.girard@example.com', city: 'Marseille',
    });
    const otherPraticien = await ds.getRepository(Praticien).save({
      firstname: 'Marc', lastname: 'Lemoine', email: 'marc.lemoine@aura.io', telephone: '07',
      ville: 'Nantes', niveau: 'Confirmé', specialite: 'Reiki', mode: 'présentiel',
      status: 'actif', tarif: 55, experience: 4, bio: 'Praticien confirmé.',
    });
    const forMain = await ds.getRepository(RendezVous).save({
      client_id: client.id, praticien_id: praticienId, date_heure: new Date('2031-03-01T10:00:00'),
      duree_minutes: 60, mode: 'présentiel', statut: 'en_attente', tarif: 80,
    });
    const forOther = await ds.getRepository(RendezVous).save({
      client_id: client.id, praticien_id: otherPraticien.id, date_heure: new Date('2031-03-02T10:00:00'),
      duree_minutes: 60, mode: 'présentiel', statut: 'en_attente', tarif: 55,
    });

    const res = await asAdmin(
      http().get(`/api/admin/rendez-vous?praticien_id=${otherPraticien.id}&per_page=100`),
    ).expect(200);
    const ids = res.body.data.map((r: any) => r.id);
    expect(ids).toContain(forOther.id);
    expect(ids).not.toContain(forMain.id);
    expect(res.body.data.every((r: any) => r.praticien_id === otherPraticien.id)).toBe(true);
  });

  it('?search matches client or praticien firstname/lastname/email, case-insensitively', async () => {
    const client = await ds.getRepository(Client).save({
      firstname: 'Zoe', lastname: 'Dupuis', email: 'zoe.dupuis@example.com', city: 'Lille',
    });
    const rdv = await ds.getRepository(RendezVous).save({
      client_id: client.id, praticien_id: praticienId, date_heure: new Date('2031-04-01T10:00:00'),
      duree_minutes: 60, mode: 'visio', statut: 'en_attente', tarif: 80,
    });

    const byClientFirstname = await asAdmin(http().get('/api/admin/rendez-vous?search=zoe&per_page=100')).expect(200);
    expect(byClientFirstname.body.data.map((r: any) => r.id)).toContain(rdv.id);

    const byPraticienFirstnameUpper = await asAdmin(
      http().get('/api/admin/rendez-vous?search=ELODIE&per_page=100'),
    ).expect(200);
    expect(byPraticienFirstnameUpper.body.data.map((r: any) => r.id)).toContain(rdv.id);

    const noMatch = await asAdmin(http().get('/api/admin/rendez-vous?search=zzz-no-match-zzz&per_page=100')).expect(200);
    expect(noMatch.body.data.map((r: any) => r.id)).not.toContain(rdv.id);
  });

  it('GET /api/admin/rendez-vous/:id returns one rendez-vous with client+praticien joined and its linked paiement', async () => {
    const client = await ds.getRepository(Client).save({
      firstname: 'Hugo', lastname: 'Roussel', email: 'hugo.roussel@example.com', city: 'Rennes',
    });
    const rdv = await ds.getRepository(RendezVous).save({
      client_id: client.id, praticien_id: praticienId, date_heure: new Date('2031-05-01T10:00:00'),
      duree_minutes: 60, mode: 'présentiel', statut: 'termine', tarif: 80,
    });
    await ds.getRepository(Paiement).save({
      reference: `RDV-ADMIN-DETAIL-${rdv.id}`, client_id: client.id, praticien_id: praticienId,
      rendez_vous_id: rdv.id, montant_brut: 80, commission: 8, montant_net_praticien: 72,
      moyen_paiement: 'card', statut: 'paid', date_paiement: new Date('2031-05-01T11:00:00'),
    });

    const res = await asAdmin(http().get(`/api/admin/rendez-vous/${rdv.id}`)).expect(200);
    expect(res.body.data.id).toBe(rdv.id);
    expect(res.body.data.client).toMatchObject({ id: client.id, firstname: 'Hugo', lastname: 'Roussel' });
    expect(res.body.data.praticien).toMatchObject({ id: praticienId, firstname: 'Elodie' });
    expect(res.body.data.paiement).toMatchObject({ montant_brut: 80, statut: 'paid' });
  });

  it('GET /api/admin/rendez-vous/:id returns paiement: null when no paiement is linked', async () => {
    const client = await ds.getRepository(Client).save({
      firstname: 'Ines', lastname: 'Moreau', email: 'ines.moreau@example.com', city: 'Toulouse',
    });
    const rdv = await ds.getRepository(RendezVous).save({
      client_id: client.id, praticien_id: praticienId, date_heure: new Date('2031-06-01T10:00:00'),
      duree_minutes: 60, mode: 'visio', statut: 'en_attente', tarif: 80,
    });

    const res = await asAdmin(http().get(`/api/admin/rendez-vous/${rdv.id}`)).expect(200);
    expect(res.body.data.paiement).toBeNull();
  });

  it('GET /api/admin/rendez-vous/:id 404s for an unknown id', async () => {
    const res = await asAdmin(http().get('/api/admin/rendez-vous/999999')).expect(404);
    expect(res.body.message).toBe('Rendez-vous non trouvé');
  });
});
