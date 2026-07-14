import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { createTestApp, seedClientUser } from './utils/create-test-app';
import { NotificationPreferencesModule } from '../src/notification-preferences/notification-preferences.module';
import { NotificationPreference } from '../src/database/entities/notification-preference.entity';

describe('notification-preferences', () => {
  let app: INestApplication;
  let clientToken: string;

  beforeAll(async () => {
    app = await createTestApp({ imports: [NotificationPreferencesModule] });
    clientToken = (await seedClientUser(app, 'np-client@aura.io')).token;
  });
  afterAll(async () => { await app.close(); });
  const http = () => request(app.getHttpServer());

  it('GET requires auth', async () => {
    await http().get('/api/client/notification-preferences').expect(401);
  });

  it('GET with no row yet returns the 4 defaults without creating one', async () => {
    const res = await http().get('/api/client/notification-preferences')
      .set('Authorization', `Bearer ${clientToken}`).expect(200);
    expect(res.body.data).toEqual({
      rappels_seance: true, nouveaux_messages: true, reponses_avis: false, newsletter: true,
    });
    const ds = app.get(DataSource);
    expect(await ds.getRepository(NotificationPreference).count()).toBe(0);
  });

  it('PUT validates boolean fields', async () => {
    const res = await http().put('/api/client/notification-preferences')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ newsletter: 'yes' }).expect(422);
    expect(res.body.errors.newsletter).toBeDefined();
  });

  it('PUT with a partial patch merges onto the defaults and materializes a row', async () => {
    const res = await http().put('/api/client/notification-preferences')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ newsletter: false }).expect(200);
    expect(res.body.data).toEqual({
      rappels_seance: true, nouveaux_messages: true, reponses_avis: false, newsletter: false,
    });

    const ds = app.get(DataSource);
    expect(await ds.getRepository(NotificationPreference).count()).toBe(1);
  });

  it('GET now returns the persisted row', async () => {
    const res = await http().get('/api/client/notification-preferences')
      .set('Authorization', `Bearer ${clientToken}`).expect(200);
    expect(res.body.data.newsletter).toBe(false);
  });

  it('a second PUT merges onto the existing row, not back onto the defaults', async () => {
    const res = await http().put('/api/client/notification-preferences')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ rappels_seance: false }).expect(200);
    expect(res.body.data).toEqual({
      rappels_seance: false, nouveaux_messages: true, reponses_avis: false, newsletter: false,
    });

    const ds = app.get(DataSource);
    expect(await ds.getRepository(NotificationPreference).count()).toBe(1);
  });
});
