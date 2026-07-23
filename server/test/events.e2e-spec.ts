import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { createTestApp, seedAdmin, seedClientUser, seedPraticienUser } from './utils/create-test-app';
import { EventsModule } from '../src/events/events.module';
import { Praticien } from '../src/database/entities/praticien.entity';
import { Event } from '../src/database/entities/event.entity';

describe('events', () => {
  let app: INestApplication;
  let praticienId: number;
  let adminToken: string;
  beforeAll(async () => {
    app = await createTestApp({ imports: [EventsModule] });
    const ds = app.get(DataSource);
    praticienId = (await ds.getRepository(Praticien).save({
      firstname: 'A', lastname: 'B', email: 'anim@aura.io', siret: '11111111111111', telephone: '06', ville: 'Paris',
      niveau: 'expert', specialite: 'yoga', mode: 'presentiel', status: 'actif',
      tarif: 50, experience: 3, bio: 'b'.repeat(60),
    })).id;
    adminToken = (await seedAdmin(app, 'events-admin@aura.io')).token;
  });
  afterAll(async () => { await app.close(); });
  const http = () => request(app.getHttpServer());
  const asAdmin = (r: request.Test) => r.set('Authorization', `Bearer ${adminToken}`);

  const payload = () => ({
    titre: 'Retraite', type: 'atelier', dates: ['2026-08-01', '2026-08-02'],
    lieu: 'Lyon', prix: 120, nombre_places: 20, description: 'desc',
    animateurs: [{ id: praticienId, role: 'chef' }],
  });

  it('write routes require admin auth; reads stay public', async () => {
    await http().post('/api/events/create-event').send(payload()).expect(401);
    const client = await seedClientUser(app, 'events-reader@aura.io');
    await http().post('/api/events/create-event')
      .set('Authorization', `Bearer ${client.token}`).send(payload()).expect(403);
    await http().get('/api/events').expect(200);
  });

  it('POST /create-event stores event, attaches animateurs with pivot', async () => {
    const res = await asAdmin(http().post('/api/events/create-event')).send(payload()).expect(201);
    expect(res.body.data.status).toBe('brouillon');
    expect(res.body.data.dates).toEqual(['2026-08-01', '2026-08-02']);
    expect(res.body.data.animateurs).toHaveLength(1);
    expect(res.body.data.animateurs[0].pivot).toMatchObject({ role: 'chef' });
  });

  it('store 422 on unknown animateur id', async () => {
    const res = await asAdmin(http().post('/api/events/create-event'))
      .send({ ...payload(), animateurs: [{ id: 99999 }] }).expect(422);
    expect(res.body.errors['animateurs.0.id']).toBeDefined();
  });

  it('PUT /:id re-syncs animateurs; DELETE detaches then deletes', async () => {
    const created = await asAdmin(http().post('/api/events/create-event')).send(payload()).expect(201);
    const id = created.body.data.id;
    const upd = await asAdmin(http().put(`/api/events/${id}`))
      .send({ titre: 'Retraite 2', animateurs: [{ id: praticienId }] }).expect(200);
    expect(upd.body.message).toBe('Événement mis à jour avec succès');
    expect(upd.body.data.animateurs[0].pivot.role).toBe('animateur');
    await asAdmin(http().delete(`/api/events/${id}`)).expect(200);
    const nf = await http().get(`/api/events/${id}`).expect(404);
    expect(nf.body.message).toBe('Événement non trouvé');
  });

  it('GET / paginates (public, no auth required)', async () => {
    const res = await http().get('/api/events').expect(200);
    expect(res.body.pagination).toHaveProperty('total');
  });

  it('index filters by status (public, no auth required)', async () => {
    const created = await asAdmin(http().post('/api/events/create-event')).send(payload()).expect(201);
    // newly created events default to status 'brouillon' (Event entity default)

    const published = await http().get('/api/events?status=publié').expect(200);
    expect(published.body.data.find((e: any) => e.id === created.body.data.id)).toBeUndefined();

    const drafts = await http().get('/api/events?status=brouillon').expect(200);
    expect(drafts.body.data.some((e: any) => e.id === created.body.data.id)).toBe(true);
  });

  describe('praticien-created events', () => {
    it('requires praticien auth; creates as brouillon, self-attached as animateur', async () => {
      await http().post('/api/events/praticien/mine').send({
        titre: 'Atelier du praticien', type: 'atelier', dates: ['2026-09-01'],
        lieu: 'Nantes', prix: 30, nombre_places: 12, description: 'Un atelier maison.',
      }).expect(401);

      const client = await seedClientUser(app, 'events-prat-reader@aura.io');
      await http().post('/api/events/praticien/mine')
        .set('Authorization', `Bearer ${client.token}`)
        .send({
          titre: 'Atelier du praticien', type: 'atelier', dates: ['2026-09-01'],
          lieu: 'Nantes', prix: 30, nombre_places: 12, description: 'Un atelier maison.',
        }).expect(403);

      const praticien = await seedPraticienUser(app, 'events-prat-creator@aura.io');
      const res = await http().post('/api/events/praticien/mine')
        .set('Authorization', `Bearer ${praticien.token}`)
        .send({
          titre: 'Atelier du praticien', type: 'atelier', dates: ['2026-09-01'],
          lieu: 'Nantes', prix: 30, nombre_places: 12, description: 'Un atelier maison.',
        }).expect(201);
      expect(res.body.data.status).toBe('brouillon');
      expect(res.body.data.animateurs).toHaveLength(1);
      expect(res.body.data.animateurs[0].id).toBe(praticien.praticien.id);
      expect(res.body.message).toContain('en attente de validation');

      // Not visible to clients until an admin publishes it.
      const published = await http().get('/api/events?status=publié').expect(200);
      expect(published.body.data.find((e: any) => e.id === res.body.data.id)).toBeUndefined();
    });
  });

  describe('client pre-registration', () => {
    // Directly seed a published event with a known small capacity so capacity
    // math is deterministic and independent of the admin-create default status.
    async function seedPublishedEvent(places: number): Promise<number> {
      const ds = app.get(DataSource);
      const ev = await ds.getRepository(Event).save({
        titre: 'Atelier', type: 'atelier', dates: ['2026-08-01'], lieu: 'Lyon',
        prix: 40, nombre_places: places, description: 'd', status: 'publié',
      });
      return ev.id;
    }

    it('requires client auth', async () => {
      const eventId = await seedPublishedEvent(10);
      await http().post(`/api/events/${eventId}/inscription`).send({}).expect(401);
    });

    it('registers a client, is idempotent-guarded against a second inscription', async () => {
      const eventId = await seedPublishedEvent(10);
      const { token } = await seedClientUser(app, 'ev-reg-1@aura.io');

      const res = await http().post(`/api/events/${eventId}/inscription`)
        .set('Authorization', `Bearer ${token}`).send({ nombre_places: 2 }).expect(201);
      expect(res.body.data.nombre_places).toBe(2);
      expect(res.body.data.statut).toBe('inscrit');
      expect(res.body.message).toBe('Votre inscription a bien été enregistrée.');

      const me = await http().get(`/api/events/${eventId}/inscription/me`)
        .set('Authorization', `Bearer ${token}`).expect(200);
      expect(me.body.data.nombre_places).toBe(2);

      const dup = await http().post(`/api/events/${eventId}/inscription`)
        .set('Authorization', `Bearer ${token}`).send({}).expect(422);
      expect(dup.body.errors.event[0]).toBe('Vous êtes déjà inscrit à cet événement.');
    });

    it('rejects when not enough places remain', async () => {
      const eventId = await seedPublishedEvent(2);
      const { token } = await seedClientUser(app, 'ev-reg-2@aura.io');
      const res = await http().post(`/api/events/${eventId}/inscription`)
        .set('Authorization', `Bearer ${token}`).send({ nombre_places: 5 }).expect(422);
      expect(res.body.errors.nombre_places[0]).toContain('2 place');
    });

    it('rejects registration on a non-published event', async () => {
      const created = await asAdmin(http().post('/api/events/create-event')).send(payload()).expect(201);
      const { token } = await seedClientUser(app, 'ev-reg-3@aura.io');
      const res = await http().post(`/api/events/${created.body.data.id}/inscription`)
        .set('Authorization', `Bearer ${token}`).send({}).expect(422);
      expect(res.body.errors.event[0]).toContain("n'est pas ouvert");
    });

    it('me returns null when the client is not registered', async () => {
      const eventId = await seedPublishedEvent(10);
      const { token } = await seedClientUser(app, 'ev-reg-4@aura.io');
      const res = await http().get(`/api/events/${eventId}/inscription/me`)
        .set('Authorization', `Bearer ${token}`).expect(200);
      expect(res.body.data).toBeNull();
    });
  });
});
