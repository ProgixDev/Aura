import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './utils/create-test-app';
import { PraticienAuthModule } from '../src/auth/praticien-auth/praticien-auth.module';
import { DataSource } from 'typeorm';
import { Praticien } from '../src/database/entities/praticien.entity';

const DOC_FIELDS = ['piece_identite', 'certification', 'assurance', 'domicile', 'charte'];

function attachDocs(req: request.Test) {
  for (const f of DOC_FIELDS) {
    req = req.attach(`documents[${f}]`, Buffer.from('%PDF-1.4 fake'), {
      filename: `${f}.pdf`, contentType: 'application/pdf',
    });
  }
  return req;
}

const FIELDS = {
  firstname: 'Jean', lastname: 'Dupont', email: 'jean@aura.io',
  password: 'secret123', password_confirmation: 'secret123',
  telephone: '0600000000', ville: 'Lyon', niveau: 'expert',
  specialite: 'yoga', mode: 'presentiel', tarif: '50', experience: '5',
  bio: 'Une biographie suffisamment longue pour dépasser la limite des cinquante caractères.',
};

describe('praticien auth', () => {
  let app: INestApplication;
  beforeAll(async () => { app = await createTestApp({ imports: [PraticienAuthModule] }); });
  afterAll(async () => { await app.close(); });
  const http = () => request(app.getHttpServer());

  it('register creates user + praticien + 5 documents in one transaction', async () => {
    let req = http().post('/api/v1/praticien/register');
    for (const [k, v] of Object.entries(FIELDS)) req = req.field(k, v);
    const res = await attachDocs(req).expect(201);
    expect(res.body.message).toContain('En attente de vérification');
    expect(res.body.data.praticien.statut_verification).toBe('en_attente');
    expect(res.body.data.documents_soumis).toBe(5);
    expect(res.body.data.documents_requis).toBe(5);
    expect(res.body.data.user.password).toBeUndefined();

    const ds = app.get(DataSource);
    const prat = await ds.getRepository(Praticien).findOneOrFail({
      where: { email: 'jean@aura.io' }, relations: { documents: true },
    });
    expect(prat.documents).toHaveLength(5);
  });

  it('register 422 when a document is missing', async () => {
    let req = http().post('/api/v1/praticien/register');
    for (const [k, v] of Object.entries({ ...FIELDS, email: 'other@aura.io' })) req = req.field(k, v);
    for (const f of DOC_FIELDS.slice(0, 4)) {
      req = req.attach(`documents[${f}]`, Buffer.from('x'), { filename: `${f}.pdf`, contentType: 'application/pdf' });
    }
    const res = await req.expect(422);
    expect(res.body.errors['documents.charte']).toBeDefined();
  });

  it('login returns praticien payload; rejected praticien gets 403 with motif', async () => {
    const ok = await http().post('/api/v1/praticien/login')
      .send({ email: 'jean@aura.io', password: 'secret123' }).expect(200);
    expect(ok.body.data.verification_status).toBe('en_attente');
    expect(ok.body.data.is_verified).toBe(false);

    const ds = app.get(DataSource);
    await ds.getRepository(Praticien).update(
      { email: 'jean@aura.io' },
      { statut_verification: 'rejete', motif_rejet: 'Documents illisibles' },
    );
    const rej = await http().post('/api/v1/praticien/login')
      .send({ email: 'jean@aura.io', password: 'secret123' }).expect(403);
    expect(rej.body.message).toContain('Documents illisibles');
    expect(rej.body.motif_rejet).toBe('Documents illisibles');
    await ds.getRepository(Praticien).update(
      { email: 'jean@aura.io' }, { statut_verification: 'en_attente', motif_rejet: null },
    );
  });

  it('profile returns praticien + documents_stats; check-token works', async () => {
    const login = await http().post('/api/v1/praticien/login')
      .send({ email: 'jean@aura.io', password: 'secret123' }).expect(200);
    const token = login.body.data.token;

    const prof = await http().get('/api/v1/praticien/profile')
      .set('Authorization', `Bearer ${token}`).expect(200);
    expect(prof.body.data.documents_stats).toEqual({ total: 5, en_attente: 5, valide: 0, rejete: 0 });

    const chk = await http().get('/api/v1/praticien/check-token')
      .set('Authorization', `Bearer ${token}`).expect(200);
    expect(chk.body.message).toBe('Token valide');

    await http().post('/api/v1/praticien/refresh')
      .set('Authorization', `Bearer ${token}`).expect(200);
    await http().post('/api/v1/praticien/logout')
      .set('Authorization', `Bearer ${token}`).expect(200);
  });
});
