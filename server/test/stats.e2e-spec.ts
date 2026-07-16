import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { createTestApp } from './utils/create-test-app';
import { StatsModule } from '../src/stats/stats.module';
import { Praticien } from '../src/database/entities/praticien.entity';
import { RendezVous } from '../src/database/entities/rendez-vous.entity';
import { Avis } from '../src/database/entities/avis.entity';
import { Client } from '../src/database/entities/client.entity';

describe('stats', () => {
  let app: INestApplication;
  let ds: DataSource;

  beforeAll(async () => {
    app = await createTestApp({ imports: [StatsModule] });
    ds = app.get(DataSource);

    const base = {
      telephone: '06', niveau: 'n', specialite: 's', mode: 'm', status: 'actif',
      tarif: 10, experience: 1, bio: 'b'.repeat(60),
    };
    const [p1, p2, p3] = await ds.getRepository(Praticien).save([
      { ...base, firstname: 'A', lastname: 'V', email: 'stats-a@x.io', ville: 'Paris', statut_verification: 'valide' },
      { ...base, firstname: 'B', lastname: 'V', email: 'stats-b@x.io', ville: 'Lyon', statut_verification: 'valide' },
      { ...base, firstname: 'C', lastname: 'A', email: 'stats-c@x.io', ville: 'Paris', statut_verification: 'en_attente' },
    ]);

    const client = await ds.getRepository(Client).save({
      firstname: 'Stat', lastname: 'Client', email: 'stats-client@x.io', city: 'Paris',
    });

    await ds.getRepository(RendezVous).save([
      {
        client_id: client.id, praticien_id: p1.id, date_heure: new Date('2026-01-01T10:00:00'),
        duree_minutes: 60, mode: 'présentiel', statut: 'termine', tarif: 50,
      },
      {
        client_id: client.id, praticien_id: p1.id, date_heure: new Date('2026-01-02T10:00:00'),
        duree_minutes: 60, mode: 'présentiel', statut: 'termine', tarif: 50,
      },
      {
        client_id: client.id, praticien_id: p2.id, date_heure: new Date('2026-01-03T10:00:00'),
        duree_minutes: 60, mode: 'visio', statut: 'en_attente', tarif: 50,
      },
      {
        client_id: client.id, praticien_id: p3.id, date_heure: new Date('2026-01-04T10:00:00'),
        duree_minutes: 60, mode: 'visio', statut: 'annule', tarif: 50,
      },
    ]);

    // publié notes: 5, 4, 4 -> avg 4.333... -> rounds to 4.3. The en_attente avis must be excluded.
    await ds.getRepository(Avis).save([
      {
        full_name_author: 'X Y', praticien_id: p1.id, note: 5, avis: 'a'.repeat(10),
        date_ajout: new Date('2026-01-01'), statut: 'publié',
      },
      {
        full_name_author: 'X Y', praticien_id: p1.id, note: 4, avis: 'a'.repeat(10),
        date_ajout: new Date('2026-01-02'), statut: 'publié',
      },
      {
        full_name_author: 'X Y', praticien_id: p2.id, note: 4, avis: 'a'.repeat(10),
        date_ajout: new Date('2026-01-03'), statut: 'publié',
      },
      {
        full_name_author: 'X Y', praticien_id: p2.id, note: 1, avis: 'a'.repeat(10),
        date_ajout: new Date('2026-01-04'), statut: 'en_attente',
      },
    ]);
  });
  afterAll(async () => { await app.close(); });
  const http = () => request(app.getHttpServer());

  it('GET /api/stats is public (200 without a token)', async () => {
    await http().get('/api/stats').expect(200);
  });

  it('returns exact computed aggregates: praticiens_verifies, seances, satisfaction, villes', async () => {
    const res = await http().get('/api/stats').expect(200);
    expect(res.body.status).toBe('success');
    expect(res.body.data).toEqual({
      praticiens_verifies: 2, // p1, p2 are 'valide'; p3 is 'en_attente'
      seances: 2, // only the two 'termine' rendez-vous
      satisfaction: 4.3, // avg(5,4,4) over 'publié' avis only, rounded to 1 decimal
      villes: 2, // distinct 'ville' across ALL praticiens: Paris, Lyon
    });
  });
});
