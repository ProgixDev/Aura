import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { randomUUID } from 'crypto';
import { createTestApp, seedAdmin, seedClientUser, seedPraticienUser } from './utils/create-test-app';
import { EchangesModule } from '../src/echanges/echanges.module';
import { StorageService } from '../src/common/storage.service';

const fakeStorage = { save: jest.fn((_file, subdir) => Promise.resolve(`${subdir}/${randomUUID()}.pdf`)) };

describe('echanges', () => {
  let app: INestApplication;
  let clientToken: string;
  let adminToken: string;
  let praticienToken: string;
  beforeAll(async () => {
    app = await createTestApp(
      { imports: [EchangesModule] },
      [{ provide: StorageService, useValue: fakeStorage }],
    );
    clientToken = (await seedClientUser(app, 'ech-client@aura.io')).token;
    adminToken = (await seedAdmin(app, 'ech-admin@aura.io')).token;
    praticienToken = (await seedPraticienUser(app, 'ech-praticien@aura.io')).token;
  });
  afterAll(async () => { await app.close(); });
  const http = () => request(app.getHttpServer());
  const asAdmin = (r: request.Test) => r.set('Authorization', `Bearer ${adminToken}`);
  const asClient = (r: request.Test) => r.set('Authorization', `Bearer ${clientToken}`);
  const asPraticien = (r: request.Test) => r.set('Authorization', `Bearer ${praticienToken}`);

  it('admin routes require admin auth; client routes keep their own guard', async () => {
    await http().get('/api/echanges').expect(401);
    await http().get('/api/echanges/statistics').expect(401);
    await http().put('/api/echanges/1').send({ statut: 'traite' }).expect(401);
    await http().patch('/api/echanges/1').send({ statut: 'traite' }).expect(401);
    await http().post('/api/echanges/1/hide').expect(401);
    await http().post('/api/echanges/1/report').send({ motif_signalement: 'x' }).expect(401);
    await http().delete('/api/echanges/1').expect(401);
    await asClient(http().get('/api/echanges')).expect(403);
  });

  it('client store requires auth + client row; creates with defaults', async () => {
    await http().post('/api/echanges/client/echanges').expect(401);
    const res = await asClient(http().post('/api/echanges/client/echanges'))
      .field('sujet', 'Proposition de partenariat')
      .field('type', 'proposition')
      .field('message', 'Un message de plus de dix caractères.')
      .field('ce_que_je_propose', 'Ateliers')
      .attach('pieces_jointes', Buffer.from('%PDF-1.4'), {
        filename: 'doc.pdf', contentType: 'application/pdf',
      })
      .expect(201);
    expect(res.body.message).toBe('Votre message a été envoyé avec succès');
    expect(res.body.data.statut).toBe('en_attente');
    expect(res.body.data.priorite).toBe('moyenne');
    expect(res.body.data.ce_que_je_propose).toBe('Ateliers');
    expect(res.body.data.pieces_jointes).toHaveLength(1);
  });

  it('store rejects delai_souhaite set to today (must be strictly after today)', async () => {
    const today = new Date().toISOString().slice(0, 10);
    const res = await asClient(http().post('/api/echanges/client/echanges'))
      .field('sujet', 's').field('type', 'demande').field('message', 'assez long message ici')
      .field('delai_souhaite', today)
      .expect(422);
    expect(res.body.errors.delai_souhaite).toBeDefined();
  });

  it('client index/show scoped to own rows; type must be in list', async () => {
    const bad = await asClient(http().post('/api/echanges/client/echanges'))
      .field('sujet', 's').field('type', 'invalide').field('message', 'assez long message')
      .expect(422);
    expect(bad.body.errors.type).toBeDefined();

    const list = await asClient(http().get('/api/echanges/client/echanges')).expect(200);
    expect(list.body.data).toHaveLength(1);
    const id = list.body.data[0].id;
    await asClient(http().get(`/api/echanges/client/echanges/${id}`)).expect(200);
    const nf = await asClient(http().get('/api/echanges/client/echanges/99999')).expect(404);
    expect(nf.body.message).toBe('Échange non trouvé');
  });

  it('adminShow marks en_attente as lu; adminUpdate traite sets traite_par from token', async () => {
    const list = await asAdmin(http().get('/api/echanges')).expect(200);
    const id = list.body.data[0].id;

    const shown = await asAdmin(http().get(`/api/echanges/${id}`)).expect(200);
    expect(shown.body.data.statut).toBe('lu');
    expect(shown.body.data.lu_a).toBeTruthy();

    const upd = await asAdmin(http().put(`/api/echanges/${id}`))
      .send({ statut: 'traite', reponse_admin: 'Réponse admin' }).expect(200);
    expect(upd.body.data.statut).toBe('traite');
    expect(upd.body.data.traite_a).toBeTruthy();
    expect(upd.body.data.repondu_a).toBeTruthy();
    expect(upd.body.data.traite_par).toBeTruthy();
  });

  it('client update/destroy blocked once statut not en_attente/lu', async () => {
    const list = await asClient(http().get('/api/echanges/client/echanges')).expect(200);
    const id = list.body.data[0].id; // statut is now 'traite'
    const upd = await asClient(http().put(`/api/echanges/client/echanges/${id}`))
      .send({ sujet: 'Nouveau' }).expect(404);
    expect(upd.body.message).toBe('Échange non trouvé ou ne peut pas être modifié');
    const del = await asClient(http().delete(`/api/echanges/client/echanges/${id}`)).expect(404);
    expect(del.body.message).toBe('Échange non trouvé ou ne peut pas être supprimé');
  });

  it('adminHide toggles, adminReport flags, statistics reachable', async () => {
    const list = await asAdmin(http().get('/api/echanges')).expect(200);
    const id = list.body.data[0].id;

    const hide = await asAdmin(http().post(`/api/echanges/${id}/hide`)).expect(200);
    expect(hide.body.message).toBe('Échange masqué');
    const unhide = await asAdmin(http().post(`/api/echanges/${id}/hide`)).expect(200);
    expect(unhide.body.message).toBe('Échange démasqué');

    const rep = await asAdmin(http().post(`/api/echanges/${id}/report`))
      .send({ motif_signalement: 'contenu inapproprié' }).expect(200);
    expect(rep.body.data.statut).toBe('signale');
    expect(rep.body.data.signale_par).toBeTruthy();

    const stats = await asAdmin(http().get('/api/echanges/statistics')).expect(200);
    expect(stats.body.data).toHaveProperty('par_type');
    expect(stats.body.data.total).toBeGreaterThanOrEqual(1);

    const del = await asAdmin(http().delete(`/api/echanges/${id}`)).expect(200);
    expect(del.body.message).toBe('Échange supprimé avec succès');
    await asAdmin(http().get(`/api/echanges/${id}`)).expect(404);
  });

  it('praticien routes require praticien auth; create/list/show/update/delete own rows', async () => {
    await http().get('/api/echanges/praticien/echanges').expect(401);
    await asClient(http().get('/api/echanges/praticien/echanges')).expect(403);

    const created = await asPraticien(http().post('/api/echanges/praticien/echanges'))
      .field('sujet', 'Troc atelier reiki')
      .field('type', 'proposition')
      .field('message', 'Je propose un atelier reiki contre un coup de main design.')
      .expect(201);
    const id = created.body.data.id;
    expect(created.body.data.statut).toBe('en_attente');

    const list = await asPraticien(http().get('/api/echanges/praticien/echanges')).expect(200);
    expect(list.body.data.some((e: any) => e.id === id)).toBe(true);

    await asPraticien(http().get(`/api/echanges/praticien/echanges/${id}`)).expect(200);

    const upd = await asPraticien(http().put(`/api/echanges/praticien/echanges/${id}`))
      .send({ sujet: 'Troc atelier reiki (modifié)' }).expect(200);
    expect(upd.body.data.sujet).toBe('Troc atelier reiki (modifié)');

    // A different praticien cannot see or touch someone else's row (scoped by praticien_id).
    const otherToken = (await seedPraticienUser(app, 'ech-praticien-2@aura.io')).token;
    const asOther = (r: request.Test) => r.set('Authorization', `Bearer ${otherToken}`);
    await asOther(http().get(`/api/echanges/praticien/echanges/${id}`)).expect(404);

    await asPraticien(http().delete(`/api/echanges/praticien/echanges/${id}`)).expect(200);
    await asPraticien(http().get(`/api/echanges/praticien/echanges/${id}`)).expect(404);
  });

  it('community shows visible echanges from both clients and praticiens, with auteur/est_a_moi, excludes hidden/signale', async () => {
    const clientPost = await asClient(http().post('/api/echanges/client/echanges'))
      .field('sujet', 'Échange communauté client').field('type', 'demande')
      .field('message', 'Un message de plus de dix caractères pour ce test.').expect(201);
    const clientId = clientPost.body.data.id;

    const pratPost = await asPraticien(http().post('/api/echanges/praticien/echanges'))
      .field('sujet', 'Échange communauté praticien').field('type', 'information')
      .field('message', 'Un message praticien de plus de dix caractères.').expect(201);
    const pratId = pratPost.body.data.id;

    const hiddenPost = await asClient(http().post('/api/echanges/client/echanges'))
      .field('sujet', 'Échange masqué').field('type', 'autre')
      .field('message', 'Ce message ne doit pas apparaître dans le flux.').expect(201);
    const hiddenId = hiddenPost.body.data.id;
    await asAdmin(http().post(`/api/echanges/${hiddenId}/hide`)).expect(200);

    const asClientCommunity = await asClient(http().get('/api/echanges/community?per_page=100')).expect(200);
    const rows = asClientCommunity.body.data;
    const seenClient = rows.find((e: any) => e.id === clientId);
    const seenPrat = rows.find((e: any) => e.id === pratId);
    expect(seenClient).toBeTruthy();
    expect(seenClient.est_a_moi).toBe(true);
    expect(seenClient.auteur_type).toBe('client');
    expect(seenPrat).toBeTruthy();
    expect(seenPrat.est_a_moi).toBe(false);
    expect(seenPrat.auteur_type).toBe('praticien');
    expect(seenPrat.auteur_nom).toBe('Praticien Test');
    expect(rows.some((e: any) => e.id === hiddenId)).toBe(false);

    const asPraticienCommunity = await asPraticien(http().get('/api/echanges/community?per_page=100')).expect(200);
    const seenByPrat = asPraticienCommunity.body.data.find((e: any) => e.id === pratId);
    expect(seenByPrat.est_a_moi).toBe(true);

    const show = await asClient(http().get(`/api/echanges/community/${pratId}`)).expect(200);
    expect(show.body.data.auteur_type).toBe('praticien');
    await asClient(http().get(`/api/echanges/community/${hiddenId}`)).expect(404);
  });
});
