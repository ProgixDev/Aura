import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { createTestApp, seedClientUser } from './utils/create-test-app';
import { RendezVousModule } from '../src/rendez-vous/rendez-vous.module';
import { StripeService } from '../src/common/stripe.service';
import { Praticien } from '../src/database/entities/praticien.entity';
import { Promotion } from '../src/database/entities/promotion.entity';
import { Paiement } from '../src/database/entities/paiement.entity';

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
  let praticienId: number;

  beforeAll(async () => {
    app = await createTestApp(
      { imports: [RendezVousModule] },
      [{ provide: StripeService, useValue: stripeServiceMock }],
    );
    clientToken = (await seedClientUser(app, 'rdv-client@aura.io')).token;
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
});
