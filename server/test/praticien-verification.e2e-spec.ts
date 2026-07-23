import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { createTestApp, seedAdmin } from './utils/create-test-app';
import { PraticienVerificationModule } from '../src/auth/praticien-verification/praticien-verification.module';
import { Praticien } from '../src/database/entities/praticien.entity';
import { PraticienDocument } from '../src/database/entities/praticien-document.entity';
import { StorageService } from '../src/common/storage.service';

const FAKE_FILE_BYTES = Buffer.from('%PDF-1.4 fake content');
const fakeStorage = { save: jest.fn(), download: jest.fn().mockResolvedValue(FAKE_FILE_BYTES) };

const DOC_TYPES = ['piece_identite', 'diplome', 'charte', 'justificatif_siret'];

async function seedPraticien(ds: DataSource, email: string, nDocs = DOC_TYPES.length) {
  const praticien = await ds.getRepository(Praticien).save({
    firstname: 'P', lastname: 'T', email, siret: '11111111111111', telephone: '06', ville: 'Paris',
    niveau: 'expert', specialite: 'yoga', mode: 'presentiel', status: 'actif',
    tarif: 50, experience: 3, bio: 'b'.repeat(60), statut_verification: 'en_attente',
  });
  const types = DOC_TYPES;
  const docs: PraticienDocument[] = [];
  for (const type of types.slice(0, nDocs)) {
    docs.push(await ds.getRepository(PraticienDocument).save({
      praticien_id: praticien.id, type, nom_fichier: `${type}.pdf`,
      chemin: `praticiens/${praticien.id}/documents/${type}.pdf`,
      mime_type: 'application/pdf', taille: 100, statut: 'en_attente',
    }));
  }
  return { praticien, docs };
}

describe('praticien verification (admin)', () => {
  let app: INestApplication;
  let token: string;
  beforeAll(async () => {
    app = await createTestApp(
      { imports: [PraticienVerificationModule] },
      [{ provide: StorageService, useValue: fakeStorage }],
    );
    token = (await seedAdmin(app, 'verif@aura.io')).token;
  });
  afterAll(async () => { await app.close(); });
  const http = () => request(app.getHttpServer());
  const auth = (r: request.Test) => r.set('Authorization', `Bearer ${token}`);

  it('requires admin', async () => {
    await http().get('/api/v1/admin/praticiens/verification').expect(401);
  });

  it('index lists pending praticiens with statistiques', async () => {
    const ds = app.get(DataSource);
    await seedPraticien(ds, 'p1@aura.io');
    const res = await auth(http().get('/api/v1/admin/praticiens/verification')).expect(200);
    expect(res.body.statistiques).toHaveProperty('total_attente');
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });

  it('statistics route is reachable (not shadowed by :id)', async () => {
    const res = await auth(http().get('/api/v1/admin/praticiens/verification/statistics')).expect(200);
    expect(res.body.data).toHaveProperty('par_specialite');
    expect(res.body.data.documents).toHaveProperty('total');
  });

  it('show returns per-type document map with resume', async () => {
    const ds = app.get(DataSource);
    const { praticien } = await seedPraticien(ds, 'p2@aura.io', 2);
    const res = await auth(http().get(`/api/v1/admin/praticiens/verification/${praticien.id}`)).expect(200);
    expect(res.body.data.documents.charte.soumis).toBe(false);
    expect(res.body.data.resume_documents).toEqual({
      soumis: 2, en_attente: 2, valides: 0, rejetes: 0, manquants: 2,
    });
  });

  it('verify: all 4 valide → praticien valide; any rejete → praticien rejete', async () => {
    const ds = app.get(DataSource);
    const { praticien, docs } = await seedPraticien(ds, 'p3@aura.io');
    const ok = await auth(http().post(`/api/v1/admin/praticiens/verification/${praticien.id}/verify`))
      .send({ documents: docs.map((d) => ({ id: d.id, statut: 'valide' })) }).expect(200);
    expect(ok.body.message).toBe('Praticien validé avec succès');

    const { praticien: p2, docs: docs2 } = await seedPraticien(ds, 'p4@aura.io');
    const rej = await auth(http().post(`/api/v1/admin/praticiens/verification/${p2.id}/verify`))
      .send({
        documents: [
          { id: docs2[0].id, statut: 'rejete', commentaire_rejet: 'flou' },
          ...docs2.slice(1).map((d) => ({ id: d.id, statut: 'valide' })),
        ],
        commentaire_global: 'Pièce illisible',
      }).expect(200);
    expect(rej.body.message).toBe('Praticien rejeté');
    expect(rej.body.data.motif_rejet).toBe('Pièce illisible');
  });

  it('reject sets praticien + all documents rejete; relance returns counts', async () => {
    const ds = app.get(DataSource);
    const { praticien } = await seedPraticien(ds, 'p5@aura.io');
    const rej = await auth(http().post(`/api/v1/admin/praticiens/verification/${praticien.id}/reject`))
      .send({ motif_rejet: 'Dossier incomplet et invalide' }).expect(200);
    expect(rej.body.message).toBe('Praticien rejeté avec succès');
    // already-rejected → 404
    await auth(http().post(`/api/v1/admin/praticiens/verification/${praticien.id}/reject`))
      .send({ motif_rejet: 'Dossier incomplet et invalide' }).expect(404);

    const { praticien: p6 } = await seedPraticien(ds, 'p6@aura.io', 1);
    const rel = await auth(http().post(`/api/v1/admin/praticiens/verification/${p6.id}/relance`)).expect(200);
    expect(rel.body.data.documents_manquants).toBe(3);
    expect(rel.body.data.documents_en_attente).toBe(1);
  });

  it('GET documents/:docId/file streams the stored file, guarded, 404 when missing', async () => {
    const ds = app.get(DataSource);
    const { docs } = await seedPraticien(ds, 'p7@aura.io', 1);
    const doc = docs[0];
    // The document row exists (as it would after a real upload via praticien-auth's
    // StorageService.save()) — the fake StorageService override returns matching bytes
    // for any key, so the streaming route has content to serve without a real Supabase
    // Storage round-trip.

    await http().get(`/api/v1/admin/praticiens/verification/documents/${doc.id}/file`).expect(401);

    const res = await auth(
      http().get(`/api/v1/admin/praticiens/verification/documents/${doc.id}/file`),
    ).expect(200);
    expect(res.headers['content-type']).toContain('application/pdf');
    expect(res.headers['content-disposition']).toContain('piece_identite.pdf');

    await auth(http().get('/api/v1/admin/praticiens/verification/documents/999999/file')).expect(404);
  });
});
