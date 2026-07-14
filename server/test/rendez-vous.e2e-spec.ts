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
});
