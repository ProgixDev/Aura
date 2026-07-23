import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { randomUUID } from 'crypto';
import { createTestApp, seedPraticienUser } from './utils/create-test-app';
import { PraticienAuthModule } from '../src/auth/praticien-auth/praticien-auth.module';
import { DataSource } from 'typeorm';
import { Praticien } from '../src/database/entities/praticien.entity';
import { PraticienDocument } from '../src/database/entities/praticien-document.entity';
import { StorageService } from '../src/common/storage.service';

const fakeStorage = {
  save: jest.fn((_file, subdir) => Promise.resolve(`${subdir}/${randomUUID()}.pdf`)),
  savePublic: jest.fn((_file, subdir) => Promise.resolve(`https://test.supabase.co/storage/v1/object/public/aura-public/${subdir}/${randomUUID()}.png`)),
};

const DOC_FIELDS = ['piece_identite', 'diplome', 'charte', 'justificatif_siret'];

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
  siret: '12345678901237',
  telephone: '0600000000', ville: 'Lyon', niveau: 'expert',
  specialite: 'yoga', mode: 'presentiel', tarif: '50', experience: '5',
  bio: 'Une biographie suffisamment longue pour dépasser la limite des cinquante caractères.',
};

describe('praticien auth', () => {
  let app: INestApplication;
  beforeAll(async () => {
    app = await createTestApp(
      { imports: [PraticienAuthModule] },
      [{ provide: StorageService, useValue: fakeStorage }],
    );
  });
  afterAll(async () => { await app.close(); });
  const http = () => request(app.getHttpServer());

  it('register creates user + praticien + 4 documents in one transaction', async () => {
    let req = http().post('/api/praticien/register');
    for (const [k, v] of Object.entries(FIELDS)) req = req.field(k, v);
    const res = await attachDocs(req).expect(201);
    expect(res.body.message).toContain('En attente de vérification');
    expect(res.body.data.praticien.statut_verification).toBe('en_attente');
    expect(res.body.data.documents_soumis).toBe(4);
    expect(res.body.data.documents_requis).toBe(4);
    expect(res.body.data.user.password).toBeUndefined();

    const ds = app.get(DataSource);
    const prat = await ds.getRepository(Praticien).findOneOrFail({
      where: { email: 'jean@aura.io' }, relations: { documents: true },
    });
    expect(prat.documents).toHaveLength(4);
  });

  it('register 422 when a document is missing', async () => {
    let req = http().post('/api/praticien/register');
    for (const [k, v] of Object.entries({ ...FIELDS, email: 'other@aura.io' })) req = req.field(k, v);
    for (const f of DOC_FIELDS.slice(0, 2)) {
      req = req.attach(`documents[${f}]`, Buffer.from('x'), { filename: `${f}.pdf`, contentType: 'application/pdf' });
    }
    const res = await req.expect(422);
    expect(res.body.errors['documents.charte']).toBeDefined();
  });

  it('register 422 when siret fails the Luhn checksum', async () => {
    let req = http().post('/api/praticien/register');
    for (const [k, v] of Object.entries({ ...FIELDS, email: 'bad-siret@aura.io', siret: '12345678901234' })) {
      req = req.field(k, v);
    }
    const res = await attachDocs(req).expect(422);
    expect(res.body.errors.siret).toBeDefined();
  });

  it('login returns praticien payload; rejected praticien gets 403 with motif', async () => {
    const ok = await http().post('/api/praticien/login')
      .send({ email: 'jean@aura.io', password: 'secret123' }).expect(200);
    expect(ok.body.data.verification_status).toBe('en_attente');
    expect(ok.body.data.is_verified).toBe(false);

    const ds = app.get(DataSource);
    await ds.getRepository(Praticien).update(
      { email: 'jean@aura.io' },
      { statut_verification: 'rejete', motif_rejet: 'Documents illisibles' },
    );
    const rej = await http().post('/api/praticien/login')
      .send({ email: 'jean@aura.io', password: 'secret123' }).expect(403);
    expect(rej.body.message).toContain('Documents illisibles');
    expect(rej.body.motif_rejet).toBe('Documents illisibles');
    await ds.getRepository(Praticien).update(
      { email: 'jean@aura.io' }, { statut_verification: 'en_attente', motif_rejet: null },
    );
  });

  it('profile returns praticien + documents_stats; check-token works', async () => {
    const login = await http().post('/api/praticien/login')
      .send({ email: 'jean@aura.io', password: 'secret123' }).expect(200);
    const token = login.body.data.token;

    const prof = await http().get('/api/praticien/profile')
      .set('Authorization', `Bearer ${token}`).expect(200);
    expect(prof.body.data.documents_stats).toEqual({ total: 4, en_attente: 4, valide: 0, rejete: 0 });

    const chk = await http().get('/api/praticien/check-token')
      .set('Authorization', `Bearer ${token}`).expect(200);
    expect(chk.body.message).toBe('Token valide');

    await http().post('/api/praticien/refresh')
      .set('Authorization', `Bearer ${token}`).expect(200);
    await http().post('/api/praticien/logout')
      .set('Authorization', `Bearer ${token}`).expect(200);
  });

  it('PUT /api/praticien/profile updates editable fields but never siret, reflected in GET /profile', async () => {
    const { token } = await seedPraticienUser(app, 'update-me@aura.io');
    const res = await http().put('/api/praticien/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ ville: 'Marseille', tarif: 75, bio: 'b'.repeat(60) })
      .expect(200);
    expect(res.body.data.praticien).toMatchObject({ ville: 'Marseille', tarif: 75 });
    // siret isn't part of UpdatePraticienProfileDto — sending it is simply ignored, not an error.
    await http().put('/api/praticien/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ siret: '00000000000000' })
      .expect(200);

    const prof = await http().get('/api/praticien/profile')
      .set('Authorization', `Bearer ${token}`).expect(200);
    expect(prof.body.data.praticien.ville).toBe('Marseille');
    expect(prof.body.data.praticien.siret).toBe('11111111111111');
  });

  it('PUT /api/praticien/profile: changing email keeps user+praticien in sync, rejects a taken email, requires auth', async () => {
    await seedPraticienUser(app, 'prat-taken@aura.io');
    const { token } = await seedPraticienUser(app, 'prat-email-src@aura.io');

    const conflict = await http().put('/api/praticien/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ email: 'prat-taken@aura.io' })
      .expect(422);
    expect(conflict.body.errors.email).toEqual(['Cette adresse email est déjà utilisée.']);

    const ok = await http().put('/api/praticien/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ email: 'prat-email-changed@aura.io' })
      .expect(200);
    expect(ok.body.data.praticien.email).toBe('prat-email-changed@aura.io');

    await http().post('/api/praticien/login')
      .send({ email: 'prat-email-src@aura.io', password: 'password123' }).expect(401);
    await http().post('/api/praticien/login')
      .send({ email: 'prat-email-changed@aura.io', password: 'password123' }).expect(200);

    await http().put('/api/praticien/profile').send({ ville: 'Nice' }).expect(401);
  });

  it('POST /api/praticien/profile/photo uploads a public URL and persists it', async () => {
    const { token } = await seedPraticienUser(app, 'prat-avatar@aura.io');
    const res = await http().post('/api/praticien/profile/photo')
      .set('Authorization', `Bearer ${token}`)
      .attach('photo', Buffer.from('fake-png-bytes'), { filename: 'me.png', contentType: 'image/png' })
      .expect(200);
    expect(res.body.data.photo).toMatch(/^https:\/\//);

    const prof = await http().get('/api/praticien/profile')
      .set('Authorization', `Bearer ${token}`).expect(200);
    expect(prof.body.data.praticien.photo).toBe(res.body.data.photo);
  });

  describe('POST /api/praticien/documents/:type (resubmission)', () => {
    it('unknown document type is rejected with 400', async () => {
      const { token } = await seedPraticienUser(app, 'doc-badtype@aura.io');
      await http().post('/api/praticien/documents/not_a_real_type')
        .set('Authorization', `Bearer ${token}`)
        .attach('document', Buffer.from('x'), { filename: 'x.pdf', contentType: 'application/pdf' })
        .expect(400);
    });

    it('missing file is a 422', async () => {
      const { token } = await seedPraticienUser(app, 'doc-nofile@aura.io');
      await http().post('/api/praticien/documents/diplome')
        .set('Authorization', `Bearer ${token}`)
        .expect(422);
    });

    it('requires auth', async () => {
      await http().post('/api/praticien/documents/diplome')
        .attach('document', Buffer.from('x'), { filename: 'x.pdf', contentType: 'application/pdf' })
        .expect(401);
    });

    it('re-uploading a rejected document clears its rejection and reopens the whole account for review', async () => {
      const { praticien, token } = await seedPraticienUser(app, 'doc-reject@aura.io');
      const ds = app.get(DataSource);
      await ds.getRepository(Praticien).update(praticien.id, {
        statut_verification: 'rejete', motif_rejet: 'Document illisible',
      });
      const rejectedDoc = await ds.getRepository(PraticienDocument).save({
        praticien_id: praticien.id, type: 'diplome', nom_fichier: 'old.pdf', chemin: 'old/old.pdf',
        mime_type: 'application/pdf', taille: 10, statut: 'rejete', commentaire_rejet: 'Illisible',
      });

      const res = await http().post('/api/praticien/documents/diplome')
        .set('Authorization', `Bearer ${token}`)
        .attach('document', Buffer.from('%PDF-1.4 fresh'), { filename: 'new.pdf', contentType: 'application/pdf' })
        .expect(200);
      expect(res.body.data.statut_verification).toBe('en_attente');
      expect(res.body.data.motif_rejet).toBeNull();

      const freshDoc = await ds.getRepository(PraticienDocument).findOneByOrFail({ id: rejectedDoc.id });
      expect(freshDoc.statut).toBe('en_attente');
      expect(freshDoc.commentaire_rejet).toBeNull();
      expect(freshDoc.nom_fichier).toBe('new.pdf');
    });

    it('re-uploading a document type that was never submitted creates it', async () => {
      const { praticien, token } = await seedPraticienUser(app, 'doc-missing@aura.io');
      const ds = app.get(DataSource);
      expect(await ds.getRepository(PraticienDocument).countBy({ praticien_id: praticien.id })).toBe(0);

      await http().post('/api/praticien/documents/justificatif_siret')
        .set('Authorization', `Bearer ${token}`)
        .attach('document', Buffer.from('%PDF-1.4'), { filename: 'siret.pdf', contentType: 'application/pdf' })
        .expect(200);

      const doc = await ds.getRepository(PraticienDocument).findOneByOrFail({
        praticien_id: praticien.id, type: 'justificatif_siret',
      });
      expect(doc.statut).toBe('en_attente');
    });
  });
});
