import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { createTestApp, seedAdmin, seedClientUser } from './utils/create-test-app';
import { ClientsModule } from '../src/clients/clients.module';
import { Client } from '../src/database/entities/client.entity';

describe('clients (admin)', () => {
  let app: INestApplication;
  let adminToken: string;
  beforeAll(async () => {
    app = await createTestApp({ imports: [ClientsModule] });
    adminToken = (await seedAdmin(app, 'clients-admin@aura.io')).token;
    const ds = app.get(DataSource);
    await ds.getRepository(Client).save([
      { firstname: 'Alice', lastname: 'Martin', email: 'alice@aura.io', city: 'Paris' },
      { firstname: 'Bruno', lastname: 'Petit', email: 'bruno@aura.io', city: 'Lyon' },
    ]);
  });
  afterAll(async () => { await app.close(); });
  const http = () => request(app.getHttpServer());
  const asAdmin = (r: request.Test) => r.set('Authorization', `Bearer ${adminToken}`);

  it('requires admin auth', async () => {
    await http().get('/api/clients').expect(401);
    const client = await seedClientUser(app, 'clients-reader@aura.io');
    await http().get('/api/clients').set('Authorization', `Bearer ${client.token}`).expect(403);
  });

  it('lists clients, paginated, with next/prev URLs', async () => {
    const res = await asAdmin(http().get('/api/clients?per_page=1')).expect(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.pagination).toMatchObject({ current_page: 1, per_page: 1 });
    expect(res.body.pagination.total).toBeGreaterThanOrEqual(2);
    expect(res.body.pagination).toHaveProperty('next_page_url');
    expect(res.body.pagination).toHaveProperty('prev_page_url');
  });
});
