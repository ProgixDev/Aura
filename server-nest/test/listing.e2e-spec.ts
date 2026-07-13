import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { createTestApp } from './utils/create-test-app';
import { ClientsModule } from '../src/clients/clients.module';
import { PraticiensModule } from '../src/praticiens/praticiens.module';
import { Client } from '../src/database/entities/client.entity';
import { Praticien } from '../src/database/entities/praticien.entity';

describe('clients + praticiens listing', () => {
  let app: INestApplication;
  beforeAll(async () => {
    app = await createTestApp({ imports: [ClientsModule, PraticiensModule] });
    const ds = app.get(DataSource);
    await ds.getRepository(Client).save([
      { firstname: 'C1', lastname: 'L', email: 'c1@x.io', city: 'Paris' },
      { firstname: 'C2', lastname: 'L', email: 'c2@x.io', city: 'Lyon' },
    ]);
    await ds.getRepository(Praticien).save({
      firstname: 'P', lastname: 'L', email: 'p@x.io', telephone: '06', ville: 'Nice',
      niveau: 'n', specialite: 's', mode: 'm', status: 'actif',
      tarif: 10, experience: 1, bio: 'b'.repeat(60),
    });
  });
  afterAll(async () => { await app.close(); });
  const http = () => request(app.getHttpServer());

  it('GET /api/clients paginates with default per_page 10', async () => {
    const res = await http().get('/api/clients?per_page=1&page=2').expect(200);
    expect(res.body.pagination).toMatchObject({ current_page: 2, per_page: 1, total: 2 });
    expect(res.body.data).toHaveLength(1);
  });

  it('GET /api/praticiens paginates', async () => {
    const res = await http().get('/api/praticiens').expect(200);
    expect(res.body.pagination.total).toBe(1);
  });
});
