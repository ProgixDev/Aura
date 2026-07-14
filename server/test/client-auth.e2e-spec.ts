import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { createTestApp, seedClientUser, signToken } from './utils/create-test-app';
import { ClientAuthModule } from '../src/auth/client-auth/client-auth.module';
import { User } from '../src/database/entities/user.entity';
import { Client } from '../src/database/entities/client.entity';

describe('client auth', () => {
  let app: INestApplication;
  beforeAll(async () => { app = await createTestApp({ imports: [ClientAuthModule] }); });
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
});
