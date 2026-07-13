import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { createTestApp } from './utils/create-test-app';
import { EmailTemplatesModule } from '../src/email-templates/email-templates.module';
import { EmailTemplate } from '../src/database/entities/email-template.entity';

describe('email templates', () => {
  let app: INestApplication;
  beforeAll(async () => { app = await createTestApp({ imports: [EmailTemplatesModule] }); });
  afterAll(async () => { await app.close(); });
  const http = () => request(app.getHttpServer());

  it('store extracts variables from corps; unique nom enforced', async () => {
    const res = await http().post('/api/emails').send({
      nom: 'Bienvenue', objet: 'Salut {{prenom}}',
      corps: 'Bonjour {{prenom}} {{nom}}, bienvenue. {{prenom}}',
    }).expect(201);
    expect(res.body.data.statut).toBe('actif');
    expect(res.body.data.variables).toEqual(['prenom', 'nom']);
    const dup = await http().post('/api/emails')
      .send({ nom: 'Bienvenue', objet: 'x', corps: 'y' }).expect(422);
    expect(dup.body.errors.nom).toBeDefined();
  });

  it('update re-extracts variables when corps changes', async () => {
    const created = await http().post('/api/emails')
      .send({ nom: 'Relance', objet: 'o', corps: '{{a}}' }).expect(201);
    const id = created.body.data.id;
    const upd = await http().put(`/api/emails/${id}`).send({ corps: '{{x}} et {{y}}' }).expect(200);
    expect(upd.body.data.variables).toEqual(['x', 'y']);
  });

  it('index filters statut + search; destroy soft-deletes', async () => {
    const list = await http().get('/api/emails?search=Bienvenue').expect(200);
    expect(list.body.data).toHaveLength(1);

    const id = list.body.data[0].id;
    await http().delete(`/api/emails/${id}`).expect(200);
    await http().get(`/api/emails/${id}`).expect(404);
    // row still exists, soft-deleted
    const ds = app.get(DataSource);
    const raw = await ds.getRepository(EmailTemplate).findOne({ where: { id }, withDeleted: true });
    expect(raw?.deleted_at).toBeTruthy();
  });
});
