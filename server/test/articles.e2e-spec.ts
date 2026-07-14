import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './utils/create-test-app';
import { ArticlesModule } from '../src/articles/articles.module';

const base = {
  titre: 'Mon Article Zen', categorie: 'bien-etre', tonalite: 'calme',
  extrait: 'extrait', corps: 'corps long', status: 'brouillon',
  auteur: 'Alice', temps_lecture: 4,
};

describe('articles', () => {
  let app: INestApplication;
  beforeAll(async () => { app = await createTestApp({ imports: [ArticlesModule] }); });
  afterAll(async () => { await app.close(); });
  const http = () => request(app.getHttpServer());

  it('store slugifies titre and suffixes duplicates', async () => {
    const a = await http().post('/api/articles/create-article').send(base).expect(201);
    expect(a.body.data.slug).toBe('mon-article-zen');
    const b = await http().post('/api/articles/create-article').send(base).expect(201);
    expect(b.body.data.slug).toMatch(/^mon-article-zen-/);
    const bad = await http().post('/api/articles/create-article')
      .send({ ...base, status: 'invalide' }).expect(422);
    expect(bad.body.errors.status).toBeDefined();
  });

  it('index filters by status and categorie', async () => {
    await http().post('/api/articles/create-article')
      .send({ ...base, titre: 'Autre', status: 'en_revue', categorie: 'sante' }).expect(201);
    const res = await http().get('/api/articles?status=en_revue&categorie=sante').expect(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.pagination).toHaveProperty('next_page_url');
  });

  it('index filters by slug', async () => {
    const first = await http().post('/api/articles/create-article')
      .send({ ...base, titre: 'Cible Slug' }).expect(201);
    const targetSlug = first.body.data.slug;
    await http().post('/api/articles/create-article')
      .send({ ...base, titre: 'Un Autre Article Plus Recent' }).expect(201);

    const res = await http().get(`/api/articles?slug=${targetSlug}&per_page=1`).expect(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].slug).toBe(targetSlug);
  });

  it('update regenerates slug on titre change; publish/archive transitions', async () => {
    const created = await http().post('/api/articles/create-article')
      .send({ ...base, titre: 'Titre Original' }).expect(201);
    const id = created.body.data.id;

    const upd = await http().put(`/api/articles/${id}`).send({ titre: 'Titre Modifié' }).expect(200);
    expect(upd.body.data.slug).toBe('titre-modifie');

    const pub = await http().put(`/api/articles/${id}/publish`).expect(200);
    expect(pub.body.message).toBe('Article publié avec succès');
    expect(pub.body.data.status).toBe('publié');
    expect(pub.body.data.date_publication).toBeTruthy();

    const arc = await http().put(`/api/articles/${id}/archive`).expect(200);
    expect(arc.body.data.status).toBe('archivé');

    await http().delete(`/api/articles/${id}`).expect(200);
    const nf = await http().get(`/api/articles/${id}`).expect(404);
    expect(nf.body.message).toBe('Article non trouvé');
  });
});
