import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { createTestApp } from './utils/create-test-app';
import { User } from '../src/database/entities/user.entity';
import { Echange } from '../src/database/entities/echange.entity';
import { Client } from '../src/database/entities/client.entity';
import { Praticien } from '../src/database/entities/praticien.entity';
import { PraticienDocument } from '../src/database/entities/praticien-document.entity';

describe('database entities', () => {
  let app: INestApplication;
  beforeAll(async () => { app = await createTestApp(); });
  afterAll(async () => { await app.close(); });

  it('creates schema for all entities and round-trips an Echange with JSON + soft delete', async () => {
    const ds = app.get(DataSource);
    const client = await ds.getRepository(Client).save({
      firstname: 'A', lastname: 'B', email: 'a@b.c', city: 'Paris',
    });
    const repo = ds.getRepository(Echange);
    const saved = await repo.save({
      client_id: client.id, sujet: 'Test', type: 'demande', statut: 'en_attente',
      priorite: 'moyenne', message: 'Bonjour, message assez long.',
      pieces_jointes: [{ nom: 'x.pdf', chemin: 'echanges/1/x.pdf', taille: 10, type: 'application/pdf' }],
    });
    const found = await repo.findOneByOrFail({ id: saved.id });
    expect(found.pieces_jointes?.[0].nom).toBe('x.pdf');
    await repo.softDelete(saved.id);
    expect(await repo.findOneBy({ id: saved.id })).toBeNull();
    expect(await ds.getRepository(User).count()).toBe(0);
  });

  it('cascades PraticienDocument deletion when its Praticien is deleted (onDelete: CASCADE)', async () => {
    const ds = app.get(DataSource);
    const praticien = await ds.getRepository(Praticien).save({
      firstname: 'P', lastname: 'Q', email: 'p@q.io', telephone: '0600000000',
      ville: 'Paris', niveau: 'expert', specialite: 'yoga', mode: 'presentiel',
      status: 'actif', tarif: 50, experience: 5, bio: 'Bio.',
    });
    const docRepo = ds.getRepository(PraticienDocument);
    const doc = await docRepo.save({
      praticien_id: praticien.id, type: 'diplome', nom_fichier: 'd.pdf', chemin: 'docs/d.pdf',
    });
    await ds.getRepository(Praticien).delete(praticien.id);
    expect(await docRepo.findOneBy({ id: doc.id })).toBeNull();
  });
});
