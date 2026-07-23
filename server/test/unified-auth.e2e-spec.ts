import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, seedAdmin, seedClientUser, seedPraticienUser } from './utils/create-test-app';
import { UnifiedAuthModule } from '../src/auth/unified-auth/unified-auth.module';
import { AdminAuthModule } from '../src/auth/admin-auth/admin-auth.module';
import { ClientAuthModule } from '../src/auth/client-auth/client-auth.module';

describe('unified login (web)', () => {
  let app: INestApplication;
  beforeAll(async () => {
    app = await createTestApp({ imports: [UnifiedAuthModule, AdminAuthModule, ClientAuthModule] });
  });
  afterAll(async () => { await app.close(); });
  const http = () => request(app.getHttpServer());

  it('401 on unknown email or wrong password', async () => {
    await http().post('/api/login').send({ email: 'nobody@aura.io', password: 'password123' }).expect(401);
    await seedAdmin(app, 'wrong-pw@aura.io');
    await http().post('/api/login').send({ email: 'wrong-pw@aura.io', password: 'nope' }).expect(401);
  });

  it('logs an admin account in, role: admin, token works against an AdminGuard route', async () => {
    await seedAdmin(app, 'boss@aura.io');
    const res = await http().post('/api/login')
      .send({ email: 'boss@aura.io', password: 'password123' }).expect(200);
    expect(res.body.data.role).toBe('admin');
    expect(res.body.data.user.is_admin).toBe(true);
    expect(res.body.data.token).toBeTruthy();

    await http().get('/api/admin/profile')
      .set('Authorization', `Bearer ${res.body.data.token}`).expect(200);
  });

  it('logs a client account in, role: client, token works against a ClientGuard route', async () => {
    await seedClientUser(app, 'sarah@aura.io');
    const res = await http().post('/api/login')
      .send({ email: 'sarah@aura.io', password: 'password123' }).expect(200);
    expect(res.body.data.role).toBe('client');
    expect(res.body.data.client).toBeTruthy();
    expect(res.body.data.user.password).toBeUndefined();

    await http().get('/api/client/profile')
      .set('Authorization', `Bearer ${res.body.data.token}`).expect(200);
  });

  it('an admin account always resolves as admin, never client, even if somehow both exist', async () => {
    const { user } = await seedAdmin(app, 'dual@aura.io');
    const res = await http().post('/api/login')
      .send({ email: user.email, password: 'password123' }).expect(200);
    expect(res.body.data.role).toBe('admin');
  });

  it('a praticien-only account gets a specific redirect-to-mobile message, not a generic error', async () => {
    await seedPraticienUser(app, 'prat@aura.io');
    const res = await http().post('/api/login')
      .send({ email: 'prat@aura.io', password: 'password123' }).expect(403);
    expect(res.body.message).toContain('application mobile');
  });
});
