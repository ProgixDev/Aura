import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './utils/create-test-app';
import { NotificationsModule } from '../src/notifications/notifications.module';

describe('notifications', () => {
  let app: INestApplication;
  beforeAll(async () => { app = await createTestApp({ imports: [NotificationsModule] }); });
  afterAll(async () => { await app.close(); });
  const http = () => request(app.getHttpServer());

  it('CRUD lifecycle with filters and search', async () => {
    const created = await http().post('/api/notifications').send({
      audience: 'clients', canal: 'email', titre: 'Promo été', message: 'Contenu promo',
    }).expect(201);
    expect(created.body.message).toBe('Notification créée avec succès');
    const id = created.body.data.id;

    await http().post('/api/notifications').send({
      audience: 'praticiens', canal: 'sms', titre: 'Rappel', message: 'Autre contenu',
    }).expect(201);

    const filtered = await http().get('/api/notifications?audience=clients').expect(200);
    expect(filtered.body.data).toHaveLength(1);
    const searched = await http().get('/api/notifications?search=promo').expect(200);
    expect(searched.body.data).toHaveLength(1);

    const upd = await http().put(`/api/notifications/${id}`).send({ titre: 'Promo hiver' }).expect(200);
    expect(upd.body.message).toBe('Notification mise à jour avec succès');
    await http().delete(`/api/notifications/${id}`).expect(200);
    const nf = await http().get(`/api/notifications/${id}`).expect(404);
    expect(nf.body.message).toBe('Notification non trouvée');
  });

  it('store validates required fields', async () => {
    const res = await http().post('/api/notifications').send({ audience: 'x' }).expect(422);
    expect(res.body.errors.canal).toBeDefined();
    expect(res.body.errors.titre).toBeDefined();
    expect(res.body.errors.message).toBeDefined();
  });
});
