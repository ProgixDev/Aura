import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { createTestApp } from './utils/create-test-app';
import { EventsModule } from '../src/events/events.module';
import { Praticien } from '../src/database/entities/praticien.entity';

describe('events', () => {
  let app: INestApplication;
  let praticienId: number;
  beforeAll(async () => {
    app = await createTestApp({ imports: [EventsModule] });
    const ds = app.get(DataSource);
    praticienId = (await ds.getRepository(Praticien).save({
      firstname: 'A', lastname: 'B', email: 'anim@aura.io', telephone: '06', ville: 'Paris',
      niveau: 'expert', specialite: 'yoga', mode: 'presentiel', status: 'actif',
      tarif: 50, experience: 3, bio: 'b'.repeat(60),
    })).id;
  });
  afterAll(async () => { await app.close(); });
  const http = () => request(app.getHttpServer());

  const payload = () => ({
    titre: 'Retraite', type: 'atelier', dates: ['2026-08-01', '2026-08-02'],
    lieu: 'Lyon', prix: 120, nombre_places: 20, description: 'desc',
    animateurs: [{ id: praticienId, role: 'chef' }],
  });

  it('POST /create-event stores event, attaches animateurs with pivot', async () => {
    const res = await http().post('/api/events/create-event').send(payload()).expect(201);
    expect(res.body.data.status).toBe('brouillon');
    expect(res.body.data.dates).toEqual(['2026-08-01', '2026-08-02']);
    expect(res.body.data.animateurs).toHaveLength(1);
    expect(res.body.data.animateurs[0].pivot).toMatchObject({ role: 'chef' });
  });

  it('store 422 on unknown animateur id', async () => {
    const res = await http().post('/api/events/create-event')
      .send({ ...payload(), animateurs: [{ id: 99999 }] }).expect(422);
    expect(res.body.errors['animateurs.0.id']).toBeDefined();
  });

  it('PUT /:id re-syncs animateurs; DELETE detaches then deletes', async () => {
    const created = await http().post('/api/events/create-event').send(payload()).expect(201);
    const id = created.body.data.id;
    const upd = await http().put(`/api/events/${id}`)
      .send({ titre: 'Retraite 2', animateurs: [{ id: praticienId }] }).expect(200);
    expect(upd.body.message).toBe('Événement mis à jour avec succès');
    expect(upd.body.data.animateurs[0].pivot.role).toBe('animateur');
    await http().delete(`/api/events/${id}`).expect(200);
    const nf = await http().get(`/api/events/${id}`).expect(404);
    expect(nf.body.message).toBe('Événement non trouvé');
  });

  it('GET / paginates', async () => {
    const res = await http().get('/api/events').expect(200);
    expect(res.body.pagination).toHaveProperty('total');
  });

  it('index filters by status', async () => {
    const created = await http().post('/api/events/create-event').send(payload()).expect(201);
    // newly created events default to status 'brouillon' (Event entity default)

    const published = await http().get('/api/events?status=publié').expect(200);
    expect(published.body.data.find((e: any) => e.id === created.body.data.id)).toBeUndefined();

    const drafts = await http().get('/api/events?status=brouillon').expect(200);
    expect(drafts.body.data.some((e: any) => e.id === created.body.data.id)).toBe(true);
  });
});
