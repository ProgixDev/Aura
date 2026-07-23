import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { createTestApp, seedAdmin } from './utils/create-test-app';
import { ClientsModule } from '../src/clients/clients.module';
import { PraticiensModule } from '../src/praticiens/praticiens.module';
import { Client } from '../src/database/entities/client.entity';
import { Praticien } from '../src/database/entities/praticien.entity';

describe('clients + praticiens listing', () => {
  let app: INestApplication;
  let praticienId: number;
  let unverifiedPraticienId: number;
  let adminToken: string;
  beforeAll(async () => {
    app = await createTestApp({ imports: [ClientsModule, PraticiensModule] });
    adminToken = (await seedAdmin(app, 'listing-admin@aura.io')).token;
    const ds = app.get(DataSource);
    await ds.getRepository(Client).save([
      { firstname: 'C1', lastname: 'L', email: 'c1@x.io', city: 'Paris' },
      { firstname: 'C2', lastname: 'L', email: 'c2@x.io', city: 'Lyon' },
    ]);
    const p = await ds.getRepository(Praticien).save({
      firstname: 'P', lastname: 'L', email: 'p@x.io', siret: '11111111111111', telephone: '06', ville: 'Nice',
      niveau: 'n', specialite: 's', mode: 'm', status: 'actif',
      tarif: 10, experience: 1, bio: 'b'.repeat(60), statut_verification: 'valide',
    });
    praticienId = p.id;
    // Never publicly listed/reachable — see praticiens.controller.ts's statut_verification
    // filter — an en_attente account has no legitimate public-facing presence.
    const unverified = await ds.getRepository(Praticien).save({
      firstname: 'Unverified', lastname: 'L', email: 'unverified@x.io', siret: '22222222222222',
      telephone: '06', ville: 'Nice', niveau: 'n', specialite: 's', mode: 'm', status: 'actif',
      tarif: 10, experience: 1, bio: 'b'.repeat(60), statut_verification: 'en_attente',
    });
    unverifiedPraticienId = unverified.id;
  });
  afterAll(async () => { await app.close(); });
  const http = () => request(app.getHttpServer());

  it('GET /api/clients paginates with default per_page 10', async () => {
    const res = await http()
      .get('/api/clients?per_page=1&page=2')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(res.body.pagination).toMatchObject({ current_page: 2, per_page: 1, total: 2 });
    expect(res.body.data).toHaveLength(1);
  });

  it('GET /api/praticiens paginates, only counting verified praticiens', async () => {
    const res = await http().get('/api/praticiens').expect(200);
    expect(res.body.pagination.total).toBe(1);
    expect(res.body.data.map((p) => p.firstname)).toEqual(['P']);
  });

  it('GET /api/praticiens/:id returns the praticien', async () => {
    const res = await http().get(`/api/praticiens/${praticienId}`).expect(200);
    expect(res.body.status).toBe('success');
    expect(res.body.data).toMatchObject({ id: praticienId, firstname: 'P', ville: 'Nice' });
  });

  it('GET /api/praticiens/:id returns 404 for a missing praticien', async () => {
    await http().get('/api/praticiens/999999').expect(404);
  });

  it('GET /api/praticiens/:id returns 404 for a not-yet-verified praticien (no public presence)', async () => {
    await http().get(`/api/praticiens/${unverifiedPraticienId}`).expect(404);
  });

  describe('admin/praticiens (unfiltered mirror, for the back-office)', () => {
    it('requires an admin token', async () => {
      await http().get('/api/admin/praticiens').expect(401);
    });

    it('lists every praticien regardless of verification status', async () => {
      const res = await http().get('/api/admin/praticiens')
        .set('Authorization', `Bearer ${adminToken}`).expect(200);
      expect(res.body.pagination.total).toBe(2);
      expect(res.body.data.map((p) => p.firstname).sort()).toEqual(['P', 'Unverified']);
    });

    it('shows a not-yet-verified praticien by id', async () => {
      const res = await http().get(`/api/admin/praticiens/${unverifiedPraticienId}`)
        .set('Authorization', `Bearer ${adminToken}`).expect(200);
      expect(res.body.data.statut_verification).toBe('en_attente');
    });
  });
});
