import { Controller, Get, INestApplication, Module, UseGuards } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, seedAdmin, seedClientUser, signToken } from './utils/create-test-app';
import { JwtAuthGuard } from '../src/auth/guards/jwt-auth.guard';
import { AdminGuard } from '../src/auth/guards/admin.guard';
import { ClientGuard } from '../src/auth/guards/client.guard';
import { CurrentUser, CurrentClient } from '../src/auth/decorators';
import { DataSource } from 'typeorm';
import { User } from '../src/database/entities/user.entity';
import * as bcrypt from 'bcryptjs';

@Controller('probe')
class ProbeController {
  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user: any) { return { id: user.id, email: user.email }; }

  @UseGuards(JwtAuthGuard)
  @Get('me-raw')
  meRaw(@CurrentUser() user: any) { return user; }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('admin')
  admin() { return { ok: true }; }

  @UseGuards(JwtAuthGuard, ClientGuard)
  @Get('client')
  client(@CurrentClient() client: any) { return { client_id: client.id }; }
}
@Module({ controllers: [ProbeController] })
class ProbeModule {}

describe('auth core', () => {
  let app: INestApplication;
  beforeAll(async () => { app = await createTestApp({ imports: [ProbeModule] }); });
  afterAll(async () => { await app.close(); });

  it('rejects missing/invalid token with Laravel-style 401', async () => {
    const res = await request(app.getHttpServer()).get('/api/probe/me').expect(401);
    expect(res.body.status).toBe('error');
  });

  it('accepts a valid token and loads a fresh user', async () => {
    const { user, token } = await seedAdmin(app);
    const res = await request(app.getHttpServer())
      .get('/api/probe/me').set('Authorization', `Bearer ${token}`).expect(200);
    expect(res.body).toEqual({ id: user.id, email: user.email });
  });

  it('strips password/remember_token from the @CurrentUser() object before it reaches a handler', async () => {
    const { user, token } = await seedAdmin(app, 'admin-raw@test.io');
    const res = await request(app.getHttpServer())
      .get('/api/probe/me-raw').set('Authorization', `Bearer ${token}`).expect(200);
    expect(res.body.id).toBe(user.id);
    expect(res.body.email).toBe(user.email);
    expect(res.body.is_admin).toBe(true);
    expect(res.body).not.toHaveProperty('password');
    expect(res.body).not.toHaveProperty('remember_token');
  });

  it('AdminGuard blocks non-admin with 403 envelope', async () => {
    const { token } = await seedClientUser(app, 'nonadmin@test.io');
    const res = await request(app.getHttpServer())
      .get('/api/probe/admin').set('Authorization', `Bearer ${token}`).expect(403);
    expect(res.body).toEqual({ status: 'error', message: 'Accès non autorisé' });
  });

  it('ClientGuard resolves the clients row by email, 403 when none', async () => {
    const { client, token } = await seedClientUser(app, 'withrow@test.io');
    const ok = await request(app.getHttpServer())
      .get('/api/probe/client').set('Authorization', `Bearer ${token}`).expect(200);
    expect(ok.body).toEqual({ client_id: client.id });

    const ds = app.get(DataSource);
    const lone = await ds.getRepository(User).save({
      name: 'No Client', email: 'noclient@test.io',
      password: await bcrypt.hash('x', 4), is_admin: false,
    });
    await request(app.getHttpServer())
      .get('/api/probe/client').set('Authorization', `Bearer ${signToken(app, lone)}`).expect(403);
  });
});
