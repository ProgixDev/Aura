import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { createTestApp, seedClientUser, signToken } from './utils/create-test-app';
import { ClientAuthModule } from '../src/auth/client-auth/client-auth.module';
import { StorageService } from '../src/common/storage.service';
import { User } from '../src/database/entities/user.entity';
import { Client } from '../src/database/entities/client.entity';

const fakeStorage = {
  savePublic: jest.fn((_file, subdir) => Promise.resolve(`https://test.supabase.co/storage/v1/object/public/aura-public/${subdir}/fake.png`)),
};

describe('client auth', () => {
  let app: INestApplication;
  beforeAll(async () => {
    app = await createTestApp(
      { imports: [ClientAuthModule] },
      [{ provide: StorageService, useValue: fakeStorage }],
    );
  });
  afterAll(async () => { await app.close(); });
  const http = () => request(app.getHttpServer());

  it('POST /api/client/register creates a users row + a linked clients row and returns a token', async () => {
    const res = await http().post('/api/client/register').send({
      firstname: 'Camille', lastname: 'Rossi', email: 'camille@aura.io',
      password: 'secret123', password_confirmation: 'secret123', city: 'Lyon',
    }).expect(201);
    expect(res.body.status).toBe('success');
    expect(res.body.message).toBe('Compte créé avec succès');
    expect(res.body.data.user).toMatchObject({ name: 'Camille Rossi', email: 'camille@aura.io', is_admin: false });
    expect(res.body.data.user.password).toBeUndefined();
    expect(res.body.data.client).toMatchObject({
      firstname: 'Camille', lastname: 'Rossi', email: 'camille@aura.io', city: 'Lyon',
    });
    expect(res.body.data.token_type).toBe('bearer');
    expect(res.body.data.expires_in).toBe(3600);

    const ds = app.get(DataSource);
    const user = await ds.getRepository(User).findOneByOrFail({ email: 'camille@aura.io' });
    const client = await ds.getRepository(Client).findOneByOrFail({ email: 'camille@aura.io' });
    expect(user.is_admin).toBe(false);
    expect(client.city).toBe('Lyon');
  });

  it('register rejects a duplicate email with a 422 envelope', async () => {
    const res = await http().post('/api/client/register').send({
      firstname: 'Camille', lastname: 'Autre', email: 'camille@aura.io',
      password: 'secret123', password_confirmation: 'secret123', city: 'Paris',
    }).expect(422);
    expect(res.body).toMatchObject({ status: 'error', message: 'Erreur de validation' });
    expect(res.body.errors.email).toEqual(['Cette adresse email est déjà utilisée.']);
  });

  it('register rejects mismatched password confirmation', async () => {
    const res = await http().post('/api/client/register').send({
      firstname: 'X', lastname: 'Y', email: 'x@aura.io',
      password: 'secret123', password_confirmation: 'nope', city: 'Nice',
    }).expect(422);
    expect(res.body.errors.password_confirmation).toBeDefined();
  });

  it('login: wrong password 401, non-client user 403, valid client 200', async () => {
    const bad = await http().post('/api/client/login')
      .send({ email: 'camille@aura.io', password: 'wrong' }).expect(401);
    expect(bad.body.message).toBe('Les identifiants sont incorrects.');

    const ds = app.get(DataSource);
    await ds.getRepository(User).save({
      name: 'No Client', email: 'noclient@aura.io',
      password: await bcrypt.hash('password123', 10), is_admin: false,
    });
    const forb = await http().post('/api/client/login')
      .send({ email: 'noclient@aura.io', password: 'password123' }).expect(403);
    expect(forb.body.message).toBe("Vous n'êtes pas autorisé à vous connecter en tant que client.");

    const ok = await http().post('/api/client/login')
      .send({ email: 'camille@aura.io', password: 'secret123' }).expect(200);
    expect(ok.body.message).toBe('Connexion réussie');
    expect(ok.body.data.client.firstname).toBe('Camille');
    expect(ok.body.data.user.last_login_at).toBeTruthy();
  });

  it('protected routes: profile, check-token, refresh, logout', async () => {
    const { client, token } = await seedClientUser(app, 'proto@aura.io');
    await http().get('/api/client/profile').expect(401);

    const prof = await http().get('/api/client/profile')
      .set('Authorization', `Bearer ${token}`).expect(200);
    expect(prof.body.data.user.email).toBe('proto@aura.io');
    expect(prof.body.data.client).toMatchObject({ id: client.id, email: 'proto@aura.io' });

    const chk = await http().get('/api/client/check-token')
      .set('Authorization', `Bearer ${token}`).expect(200);
    expect(chk.body.message).toBe('Token client valide');

    const ref = await http().post('/api/client/refresh')
      .set('Authorization', `Bearer ${token}`).expect(200);
    expect(ref.body.data.token).toBeTruthy();

    const out = await http().post('/api/client/logout')
      .set('Authorization', `Bearer ${token}`).expect(200);
    expect(out.body.message).toBe('Déconnexion réussie');
  });

  it('profile/check-token reject a non-client user with 403', async () => {
    const ds = app.get(DataSource);
    const lone = await ds.getRepository(User).save({
      name: 'Lone User', email: 'lone@aura.io',
      password: await bcrypt.hash('password123', 10), is_admin: false,
    });
    const token = signToken(app, lone);
    await http().get('/api/client/profile').set('Authorization', `Bearer ${token}`).expect(403);
    await http().get('/api/client/check-token').set('Authorization', `Bearer ${token}`).expect(403);
  });

  it('forgot-password always returns the same generic message (no user enumeration)', async () => {
    const known = await http().post('/api/client/forgot-password')
      .send({ email: 'camille@aura.io' }).expect(200);
    const unknown = await http().post('/api/client/forgot-password')
      .send({ email: 'nobody@aura.io' }).expect(200);
    expect(known.body.message).toBe(unknown.body.message);
    expect(known.body.message).toBe(
      'Si un compte existe avec cette adresse email, vous recevrez un lien de réinitialisation.',
    );

    const bad = await http().post('/api/client/forgot-password').send({ email: 'not-an-email' }).expect(422);
    expect(bad.body.errors.email).toBeDefined();
  });

  it('PUT /api/client/profile updates firstname/city and reflects in GET /profile, keeping users.name in sync', async () => {
    const { token } = await seedClientUser(app, 'update-me@aura.io');

    const res = await http().put('/api/client/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ firstname: 'Updated', city: 'Marseille' })
      .expect(200);
    expect(res.body.message).toBe('Profil mis à jour');
    expect(res.body.data.client).toMatchObject({ firstname: 'Updated', lastname: 'Test', city: 'Marseille' });
    expect(res.body.data.user.name).toBe('Updated Test');

    const prof = await http().get('/api/client/profile')
      .set('Authorization', `Bearer ${token}`).expect(200);
    expect(prof.body.data.client.firstname).toBe('Updated');
    expect(prof.body.data.client.city).toBe('Marseille');
  });

  it('PUT /api/client/profile updates the phone number', async () => {
    const { token } = await seedClientUser(app, 'phone-update@aura.io');
    const res = await http().put('/api/client/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ phone: '0600000000' })
      .expect(200);
    expect(res.body.data.client.phone).toBe('0600000000');
  });

  it('PUT /api/client/profile: changing email updates the login email and keeps user+client in sync', async () => {
    const { token } = await seedClientUser(app, 'email-change@aura.io');

    const res = await http().put('/api/client/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ email: 'email-changed@aura.io' })
      .expect(200);
    expect(res.body.data.user.email).toBe('email-changed@aura.io');
    expect(res.body.data.client.email).toBe('email-changed@aura.io');

    await http().post('/api/client/login')
      .send({ email: 'email-change@aura.io', password: 'password123' }).expect(401);
    const login = await http().post('/api/client/login')
      .send({ email: 'email-changed@aura.io', password: 'password123' }).expect(200);
    expect(login.body.data.client.email).toBe('email-changed@aura.io');
  });

  it('PUT /api/client/profile: rejects an email already used by another user with a 422 envelope', async () => {
    await seedClientUser(app, 'taken@aura.io');
    const { token } = await seedClientUser(app, 'conflict-source@aura.io');

    const res = await http().put('/api/client/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ email: 'taken@aura.io' })
      .expect(422);
    expect(res.body).toMatchObject({ status: 'error', message: 'Erreur de validation' });
    expect(res.body.errors.email).toEqual(['Cette adresse email est déjà utilisée.']);
  });

  it('PUT /api/client/profile requires client auth (401 anonymous, 403 non-client)', async () => {
    await http().put('/api/client/profile').send({ city: 'Nice' }).expect(401);

    const ds = app.get(DataSource);
    const nonClient = await ds.getRepository(User).save({
      name: 'No Client Profile', email: 'noclient-profile@aura.io',
      password: await bcrypt.hash('password123', 10), is_admin: false,
    });
    const token = signToken(app, nonClient);
    await http().put('/api/client/profile')
      .set('Authorization', `Bearer ${token}`).send({ city: 'Nice' }).expect(403);
  });

  it('POST /api/client/change-password: wrong current password returns 400', async () => {
    const { token } = await seedClientUser(app, 'pwchange-bad@aura.io');
    const res = await http().post('/api/client/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ current_password: 'wrong', new_password: 'newsecret1', new_password_confirmation: 'newsecret1' })
      .expect(400);
    expect(res.body.message).toBe('Le mot de passe actuel est incorrect');
  });

  it('POST /api/client/change-password: correct current password updates it and the new password logs in', async () => {
    const { token } = await seedClientUser(app, 'pwchange-ok@aura.io');
    const res = await http().post('/api/client/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ current_password: 'password123', new_password: 'newsecret1', new_password_confirmation: 'newsecret1' })
      .expect(200);
    expect(res.body.message).toBe('Mot de passe mis à jour avec succès');

    await http().post('/api/client/login')
      .send({ email: 'pwchange-ok@aura.io', password: 'password123' }).expect(401);
    await http().post('/api/client/login')
      .send({ email: 'pwchange-ok@aura.io', password: 'newsecret1' }).expect(200);
  });

  it('POST /api/client/change-password rejects a mismatched confirmation with a 422 envelope', async () => {
    const { token } = await seedClientUser(app, 'pwchange-mismatch@aura.io');
    const res = await http().post('/api/client/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ current_password: 'password123', new_password: 'newsecret1', new_password_confirmation: 'nope' })
      .expect(422);
    expect(res.body.errors.new_password_confirmation).toBeDefined();
  });

  it('POST /api/client/change-password requires client auth', async () => {
    await http().post('/api/client/change-password')
      .send({ current_password: 'x', new_password: 'newsecret1', new_password_confirmation: 'newsecret1' })
      .expect(401);
  });

  it('DELETE /api/client/account deletes the client and user rows; the user can no longer log in', async () => {
    const { token } = await seedClientUser(app, 'deleteme@aura.io');

    const res = await http().delete('/api/client/account')
      .set('Authorization', `Bearer ${token}`).expect(200);
    expect(res.body).toMatchObject({ status: 'success', message: 'Compte supprimé' });

    await http().post('/api/client/login')
      .send({ email: 'deleteme@aura.io', password: 'password123' }).expect(401);

    const ds = app.get(DataSource);
    expect(await ds.getRepository(Client).findOneBy({ email: 'deleteme@aura.io' })).toBeNull();
    expect(await ds.getRepository(User).findOneBy({ email: 'deleteme@aura.io' })).toBeNull();
  });

  it('DELETE /api/client/account requires client auth', async () => {
    await http().delete('/api/client/account').expect(401);
  });

  it('POST /api/client/profile/photo uploads and persists a public URL, reflected in GET /profile', async () => {
    const { token } = await seedClientUser(app, 'avatar@aura.io');
    const res = await http().post('/api/client/profile/photo')
      .set('Authorization', `Bearer ${token}`)
      .attach('photo', Buffer.from('fake-png-bytes'), { filename: 'me.png', contentType: 'image/png' })
      .expect(200);
    expect(res.body.data.photo).toMatch(/^https:\/\//);

    const prof = await http().get('/api/client/profile')
      .set('Authorization', `Bearer ${token}`).expect(200);
    expect(prof.body.data.client.photo).toBe(res.body.data.photo);
  });

  it('POST /api/client/profile/photo rejects a non-image file and requires client auth', async () => {
    const { token } = await seedClientUser(app, 'avatar-bad@aura.io');
    await http().post('/api/client/profile/photo')
      .set('Authorization', `Bearer ${token}`)
      .attach('photo', Buffer.from('%PDF-1.4'), { filename: 'not-an-image.pdf', contentType: 'application/pdf' })
      .expect(422);

    await http().post('/api/client/profile/photo')
      .attach('photo', Buffer.from('x'), { filename: 'me.png', contentType: 'image/png' })
      .expect(401);
  });
});
