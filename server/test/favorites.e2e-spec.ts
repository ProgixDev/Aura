import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { createTestApp, seedClientUser } from './utils/create-test-app';
import { FavoritesModule } from '../src/favorites/favorites.module';
import { Praticien } from '../src/database/entities/praticien.entity';

describe('favorites', () => {
  let app: INestApplication;
  let clientToken: string;
  let praticienId: number;

  beforeAll(async () => {
    app = await createTestApp({ imports: [FavoritesModule] });
    clientToken = (await seedClientUser(app, 'fav-client@aura.io')).token;
    const ds = app.get(DataSource);
    const p = await ds.getRepository(Praticien).save({
      firstname: 'P', lastname: 'L', email: 'fav-prat@x.io', telephone: '06',
      ville: 'Nice', niveau: 'n', specialite: 's', mode: 'm', status: 'actif',
      tarif: 10, experience: 1, bio: 'b'.repeat(60),
    });
    praticienId = p.id;
  });
  afterAll(async () => { await app.close(); });
  const http = () => request(app.getHttpServer());

  it('GET /api/client/favorites requires auth and starts empty', async () => {
    await http().get('/api/client/favorites').expect(401);
    const res = await http().get('/api/client/favorites')
      .set('Authorization', `Bearer ${clientToken}`).expect(200);
    expect(res.body.data).toEqual([]);
  });

  it('validates praticien_id on add', async () => {
    const res = await http().post('/api/client/favorites')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({}).expect(422);
    expect(res.body.errors.praticien_id).toBeDefined();
  });

  it('adds a favorite and lists it with the full joined praticien object', async () => {
    await http().post('/api/client/favorites')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ praticien_id: praticienId }).expect(200);

    const res = await http().get('/api/client/favorites')
      .set('Authorization', `Bearer ${clientToken}`).expect(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].praticien_id).toBe(praticienId);
    expect(res.body.data[0].praticien).toMatchObject({ id: praticienId, firstname: 'P' });
  });

  it('adding the same praticien again is idempotent (no duplicate row)', async () => {
    await http().post('/api/client/favorites')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ praticien_id: praticienId }).expect(200);

    const res = await http().get('/api/client/favorites')
      .set('Authorization', `Bearer ${clientToken}`).expect(200);
    expect(res.body.data).toHaveLength(1);
  });

  it('removes a favorite by praticien_id', async () => {
    await http().delete(`/api/client/favorites/${praticienId}`)
      .set('Authorization', `Bearer ${clientToken}`).expect(200);

    const res = await http().get('/api/client/favorites')
      .set('Authorization', `Bearer ${clientToken}`).expect(200);
    expect(res.body.data).toEqual([]);
  });

  it('removing a favorite that does not exist 404s', async () => {
    const res = await http().delete(`/api/client/favorites/${praticienId}`)
      .set('Authorization', `Bearer ${clientToken}`).expect(404);
    expect(res.body.message).toBe('Favori non trouvé');
  });
});
