import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { createTestApp, seedClientUser, seedPraticienUser } from './utils/create-test-app';
import { PraticiensModule } from '../src/praticiens/praticiens.module';
import { RendezVous } from '../src/database/entities/rendez-vous.entity';
import { Praticien } from '../src/database/entities/praticien.entity';
import { Avis } from '../src/database/entities/avis.entity';

const SLOT_TIMES = ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00'];

describe('praticiens availability', () => {
  let app: INestApplication;
  let ds: DataSource;
  let praticienId: number;
  let clientId: number;

  beforeAll(async () => {
    app = await createTestApp({ imports: [PraticiensModule] });
    ds = app.get(DataSource);
    const { praticien } = await seedPraticienUser(app, 'availability-praticien@aura.io');
    praticienId = praticien.id;
    const { client } = await seedClientUser(app, 'availability-client@aura.io');
    clientId = client.id;
  });
  afterAll(async () => { await app.close(); });
  const http = () => request(app.getHttpServer());

  // Today + n days at 00:00 UTC — matches the service's UTC-bucketed window exactly.
  function dayPlus(n: number): Date {
    const d = new Date();
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + n, 0, 0, 0, 0));
  }

  // Smallest offset >= startOffset that doesn't land on a Sunday, so seeded rendez-vous
  // always fall on a date the grid actually returns, regardless of what "today" is.
  function nextNonSundayOffset(startOffset: number): number {
    let offset = startOffset;
    while (dayPlus(offset).getUTCDay() === 0) offset += 1;
    return offset;
  }

  function dateStrOf(d: Date): string {
    return d.toISOString().slice(0, 10);
  }

  it('GET /api/praticiens/:id/availability returns a 14-day (minus Sundays) grid, all available by default', async () => {
    const res = await http().get(`/api/praticiens/${praticienId}/availability`).expect(200);
    expect(res.body.status).toBe('success');
    const days = res.body.data;
    expect(Array.isArray(days)).toBe(true);
    // 14 days always contain exactly 2 Sundays, so 12 is exact — but keep a small margin
    // in case of an implementation that windows slightly differently at the boundary.
    expect(days.length).toBeGreaterThanOrEqual(11);
    expect(days.length).toBeLessThanOrEqual(13);

    for (const day of days) {
      const [y, m, d] = day.date.split('-').map(Number);
      const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
      expect(weekday).not.toBe(0); // never a Sunday
      expect(day.slots.map((s: any) => s.time)).toEqual(SLOT_TIMES);
      expect(day.slots.every((s: any) => s.available === true)).toBe(true);
    }
  });

  it('marks the exact slot unavailable when a confirme rendez-vous exists at that date/time', async () => {
    const offset = nextNonSundayOffset(1);
    const target = dayPlus(offset);
    target.setUTCHours(10, 0, 0, 0);
    await ds.getRepository(RendezVous).save({
      client_id: clientId, praticien_id: praticienId, date_heure: target,
      duree_minutes: 60, mode: 'visio', statut: 'confirme', tarif: 50,
    });

    const res = await http().get(`/api/praticiens/${praticienId}/availability`).expect(200);
    const day = res.body.data.find((d: any) => d.date === dateStrOf(target));
    expect(day).toBeTruthy();
    const slot10 = day.slots.find((s: any) => s.time === '10:00');
    expect(slot10.available).toBe(false);
    const otherSlots = day.slots.filter((s: any) => s.time !== '10:00');
    expect(otherSlots.every((s: any) => s.available === true)).toBe(true);
  });

  it('an annule rendez-vous does not block its slot', async () => {
    const offset = nextNonSundayOffset(3);
    const target = dayPlus(offset);
    target.setUTCHours(11, 0, 0, 0);
    await ds.getRepository(RendezVous).save({
      client_id: clientId, praticien_id: praticienId, date_heure: target,
      duree_minutes: 60, mode: 'visio', statut: 'annule', tarif: 50,
    });

    const res = await http().get(`/api/praticiens/${praticienId}/availability`).expect(200);
    const day = res.body.data.find((d: any) => d.date === dateStrOf(target));
    expect(day).toBeTruthy();
    const slot11 = day.slots.find((s: any) => s.time === '11:00');
    expect(slot11.available).toBe(true);
  });

  it('GET /api/praticiens/:id/availability 404s for a nonexistent praticien', async () => {
    const res = await http().get('/api/praticiens/999999/availability').expect(404);
    expect(res.body.status).toBe('error');
  });

  it('GET /api/praticiens/:id still works alongside the new availability route', async () => {
    const res = await http().get(`/api/praticiens/${praticienId}`).expect(200);
    expect(res.body.data.id).toBe(praticienId);
  });
});

describe('praticiens ratings', () => {
  let app: INestApplication;
  let ds: DataSource;

  beforeAll(async () => {
    app = await createTestApp({ imports: [PraticiensModule] });
    ds = app.get(DataSource);
  });
  afterAll(async () => { await app.close(); });
  const http = () => request(app.getHttpServer());

  async function seedPraticien(email: string) {
    return ds.getRepository(Praticien).save({
      firstname: 'P', lastname: 'L', email, telephone: '06',
      ville: 'Nice', niveau: 'n', specialite: 's', mode: 'm', status: 'actif',
      tarif: 10, experience: 1, bio: 'b'.repeat(60),
    });
  }

  async function seedAvis(praticienId: number, note: number, statut: string) {
    return ds.getRepository(Avis).save({
      full_name_author: 'Auteur Test',
      praticien_id: praticienId,
      note,
      avis: 'Commentaire',
      date_ajout: new Date(),
      statut,
    });
  }

  it('GET /api/praticiens/:id averages only publié avis, rounded to 1 decimal, excluding en_attente', async () => {
    const p = await seedPraticien('rated-praticien@aura.io');
    await seedAvis(p.id, 5, 'publié');
    await seedAvis(p.id, 4, 'publié');
    await seedAvis(p.id, 5, 'publié');
    await seedAvis(p.id, 1, 'en_attente');

    const res = await http().get(`/api/praticiens/${p.id}`).expect(200);
    expect(res.body.data.rating).toBe(4.7);
    expect(res.body.data.reviews_count).toBe(3);
    // still additive: existing fields remain untouched
    expect(res.body.data.firstname).toBe('P');
    expect(res.body.data.ville).toBe('Nice');
  });

  it('GET /api/praticiens/:id defaults rating and reviews_count to 0 with no avis', async () => {
    const p = await seedPraticien('unrated-praticien@aura.io');
    const res = await http().get(`/api/praticiens/${p.id}`).expect(200);
    expect(res.body.data.rating).toBe(0);
    expect(res.body.data.reviews_count).toBe(0);
  });

  it('GET /api/praticiens list includes rating and reviews_count per row, matching each praticien', async () => {
    const p1 = await seedPraticien('list-rated@aura.io');
    await seedAvis(p1.id, 5, 'publié');
    await seedAvis(p1.id, 3, 'publié');
    await seedAvis(p1.id, 2, 'rejeté'); // excluded: only publié counts
    const p2 = await seedPraticien('list-unrated@aura.io');

    const res = await http().get('/api/praticiens?per_page=100').expect(200);
    expect(res.body.status).toBe('success');
    expect(res.body.pagination).toBeDefined();

    const row1 = res.body.data.find((r: any) => r.id === p1.id);
    const row2 = res.body.data.find((r: any) => r.id === p2.id);
    expect(row1).toBeTruthy();
    expect(row2).toBeTruthy();
    expect(row1.rating).toBe(4);
    expect(row1.reviews_count).toBe(2);
    expect(row2.rating).toBe(0);
    expect(row2.reviews_count).toBe(0);
  });
});
