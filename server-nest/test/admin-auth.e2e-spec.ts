import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, seedAdmin, seedClientUser } from './utils/create-test-app';
import { AdminAuthModule } from '../src/auth/admin-auth/admin-auth.module';

describe('admin auth', () => {
  let app: INestApplication;
  beforeAll(async () => { app = await createTestApp({ imports: [AdminAuthModule] }); });
  afterAll(async () => { await app.close(); });
  const http = () => request(app.getHttpServer());

  it('POST /api/admin/register creates admin and returns token', async () => {
    const res = await http().post('/api/admin/register').send({
      name: 'Boss', email: 'boss@aura.io',
      password: 'secret123', password_confirmation: 'secret123',
    }).expect(201);
    expect(res.body.status).toBe('success');
    expect(res.body.message).toBe('Compte administrateur créé avec succès');
    expect(res.body.data.user).toMatchObject({ name: 'Boss', email: 'boss@aura.io', is_admin: true });
    expect(res.body.data.token_type).toBe('bearer');
    expect(res.body.data.expires_in).toBe(3600);
    expect(res.body.data.user.password).toBeUndefined();
  });

  it('register rejects duplicate email with 422 envelope', async () => {
    const res = await http().post('/api/admin/register').send({
      name: 'Boss2', email: 'boss@aura.io',
      password: 'secret123', password_confirmation: 'secret123',
    }).expect(422);
    expect(res.body).toMatchObject({ status: 'error', message: 'Erreur de validation' });
    expect(res.body.errors.email).toBeDefined();
  });

  it('register rejects mismatched confirmation', async () => {
    const res = await http().post('/api/admin/register').send({
      name: 'X', email: 'x@aura.io', password: 'secret123', password_confirmation: 'nope',
    }).expect(422);
    expect(res.body.errors.password_confirmation).toBeDefined();
  });

  it('POST /api/admin/login: wrong creds 401, non-admin 403, admin 200', async () => {
    const bad = await http().post('/api/admin/login')
      .send({ email: 'boss@aura.io', password: 'wrong' }).expect(401);
    expect(bad.body.message).toBe('Les identifiants sont incorrects.');

    await seedClientUser(app, 'plain@aura.io');
    const forb = await http().post('/api/admin/login')
      .send({ email: 'plain@aura.io', password: 'password123' }).expect(403);
    expect(forb.body.message).toBe("Vous n'êtes pas autorisé à vous connecter en tant qu'administrateur.");

    const ok = await http().post('/api/admin/login')
      .send({ email: 'boss@aura.io', password: 'secret123' }).expect(200);
    expect(ok.body.message).toBe('Connexion administrateur réussie');
    expect(ok.body.data.user.last_login_at).toBeTruthy();
  });

  it('protected routes: profile, check-token, change-password, logout, refresh', async () => {
    const { token } = await seedAdmin(app, 'admin2@aura.io');
    await http().get('/api/admin/profile').expect(401);
    const prof = await http().get('/api/admin/profile')
      .set('Authorization', `Bearer ${token}`).expect(200);
    expect(prof.body.data.user.email).toBe('admin2@aura.io');

    const chk = await http().get('/api/admin/check-token')
      .set('Authorization', `Bearer ${token}`).expect(200);
    expect(chk.body.message).toBe('Token admin valide');

    const badPw = await http().post('/api/admin/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ current_password: 'wrong', new_password: 'newsecret1', new_password_confirmation: 'newsecret1' })
      .expect(400);
    expect(badPw.body.message).toBe('Le mot de passe actuel est incorrect');

    await http().post('/api/admin/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ current_password: 'password123', new_password: 'newsecret1', new_password_confirmation: 'newsecret1' })
      .expect(200);

    const ref = await http().post('/api/admin/refresh')
      .set('Authorization', `Bearer ${token}`).expect(200);
    expect(ref.body.data.token).toBeTruthy();

    const out = await http().post('/api/admin/logout')
      .set('Authorization', `Bearer ${token}`).expect(200);
    expect(out.body.message).toBe('Déconnexion réussie');
  });

  it('check-token: non-admin valid token gets 403 "Token invalide ou non admin"', async () => {
    const { token: clientToken } = await seedClientUser(app, 'nonadmin@aura.io');
    const res = await http().get('/api/admin/check-token')
      .set('Authorization', `Bearer ${clientToken}`).expect(403);
    expect(res.body.message).toBe('Token invalide ou non admin');
    expect(res.body.message).not.toBe('Accès non autorisé');
  });

  it('admin management: list, deactivate (not self), activate, destroy', async () => {
    const { user: me, token } = await seedAdmin(app, 'root@aura.io');
    const { user: other } = await seedAdmin(app, 'other@aura.io');

    const list = await http().get('/api/admin/list')
      .set('Authorization', `Bearer ${token}`).expect(200);
    expect(list.body.pagination.total).toBeGreaterThanOrEqual(2);

    const self = await http().post(`/api/admin/${me.id}/deactivate`)
      .set('Authorization', `Bearer ${token}`).expect(400);
    expect(self.body.message).toBe('Vous ne pouvez pas désactiver votre propre compte');

    await http().post(`/api/admin/${other.id}/deactivate`)
      .set('Authorization', `Bearer ${token}`).expect(200);
    await http().post(`/api/admin/${other.id}/activate`)
      .set('Authorization', `Bearer ${token}`).expect(200);
    await http().delete(`/api/admin/${other.id}`)
      .set('Authorization', `Bearer ${token}`).expect(200);
    await http().delete(`/api/admin/${other.id}`)
      .set('Authorization', `Bearer ${token}`).expect(404);
  });
});
