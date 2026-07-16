import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { createTestApp, seedAdmin, seedClientUser } from './utils/create-test-app';
import { SupportModule } from '../src/support/support.module';
import { SupportTicket } from '../src/database/entities/support-ticket.entity';

describe('support tickets (admin)', () => {
  let app: INestApplication;
  let adminToken: string;
  let clientToken: string;
  let ticketOuvertId: number;
  let ticketEnCoursId: number;
  let ticketResoluId: number;

  beforeAll(async () => {
    app = await createTestApp({ imports: [SupportModule] });
    adminToken = (await seedAdmin(app, 'sup-admin@aura.io')).token;
    clientToken = (await seedClientUser(app, 'sup-client@aura.io')).token;

    const ds = app.get(DataSource);
    const repo = ds.getRepository(SupportTicket);
    const now = Date.now();
    const a = await repo.save({
      requester_name: 'Alice Martin', requester_email: 'Alice.Martin@Example.com',
      sujet: 'Problème de paiement', categorie: 'facturation', priorite: 'haute',
      statut: 'ouvert', message: 'Mon paiement a échoué deux fois.',
      created_at: new Date(now - 3000),
    });
    const b = await repo.save({
      requester_name: 'Bob Dupont', requester_email: 'bob@example.com',
      sujet: 'Question sur mon compte', categorie: 'compte', priorite: 'normale',
      statut: 'en_cours', message: "Je n'arrive pas à me connecter.",
      created_at: new Date(now - 2000),
    });
    const c = await repo.save({
      requester_name: 'Carla Petit', requester_email: 'carla@example.com',
      sujet: 'Suggestion', categorie: 'autre', priorite: 'basse',
      statut: 'resolu', message: 'Idée pour améliorer le site.',
      created_at: new Date(now - 1000),
    });
    ticketOuvertId = a.id;
    ticketEnCoursId = b.id;
    ticketResoluId = c.id;
  });
  afterAll(async () => { await app.close(); });

  const http = () => request(app.getHttpServer());
  const asAdmin = (r: request.Test) => r.set('Authorization', `Bearer ${adminToken}`);
  const asClient = (r: request.Test) => r.set('Authorization', `Bearer ${clientToken}`);

  it('GET /api/admin/support requires AdminGuard (401 without a token, 403 for a non-admin user)', async () => {
    await http().get('/api/admin/support').expect(401);
    await asClient(http().get('/api/admin/support')).expect(403);
  });

  it('lists seeded tickets ordered by created_at DESC with pagination and statistiques', async () => {
    const res = await asAdmin(http().get('/api/admin/support')).expect(200);
    expect(res.body.data).toHaveLength(3);
    expect(res.body.data.map((t: any) => t.id)).toEqual([ticketResoluId, ticketEnCoursId, ticketOuvertId]);
    expect(res.body.pagination).toMatchObject({ current_page: 1, per_page: 15, total: 3 });
    expect(res.body.statistiques).toMatchObject({ total: 3, ouvert: 1, en_cours: 1, resolu: 1 });
  });

  it('?statut=ouvert filters the list', async () => {
    const res = await asAdmin(http().get('/api/admin/support?statut=ouvert')).expect(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].id).toBe(ticketOuvertId);
  });

  it('?priorite=haute filters the list', async () => {
    const res = await asAdmin(http().get('/api/admin/support?priorite=haute')).expect(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].id).toBe(ticketOuvertId);
  });

  it('?search matches requester_name/requester_email/sujet case-insensitively', async () => {
    const byName = await asAdmin(http().get('/api/admin/support?search=alice')).expect(200);
    expect(byName.body.data.map((t: any) => t.id)).toEqual([ticketOuvertId]);

    const byEmail = await asAdmin(http().get('/api/admin/support?search=BOB@EXAMPLE')).expect(200);
    expect(byEmail.body.data.map((t: any) => t.id)).toEqual([ticketEnCoursId]);

    const bySujet = await asAdmin(http().get('/api/admin/support?search=PAIEMENT')).expect(200);
    expect(bySujet.body.data.map((t: any) => t.id)).toEqual([ticketOuvertId]);
  });

  it('GET /api/admin/support/:id returns a single ticket', async () => {
    const res = await asAdmin(http().get(`/api/admin/support/${ticketOuvertId}`)).expect(200);
    expect(res.body.data.id).toBe(ticketOuvertId);
    expect(res.body.data.requester_name).toBe('Alice Martin');
    expect(res.body.data.sujet).toBe('Problème de paiement');
  });

  it('GET /api/admin/support/:id 404s for an unknown id', async () => {
    const res = await asAdmin(http().get('/api/admin/support/999999')).expect(404);
    expect(res.body.message).toBe('Ticket non trouvé');
  });

  it('POST /api/admin/support validates required fields', async () => {
    const res = await asAdmin(http().post('/api/admin/support')).send({}).expect(422);
    expect(res.body.errors.requester_name).toBeDefined();
    expect(res.body.errors.requester_email).toBeDefined();
    expect(res.body.errors.sujet).toBeDefined();
    expect(res.body.errors.message).toBeDefined();
  });

  it('POST /api/admin/support rejects an invalid email and an invalid priorite', async () => {
    const res = await asAdmin(http().post('/api/admin/support')).send({
      requester_name: 'Test', requester_email: 'not-an-email', sujet: 'Sujet',
      message: 'Un message.', priorite: 'urgentissime',
    }).expect(422);
    expect(res.body.errors.requester_email).toBeDefined();
    expect(res.body.errors.priorite).toBeDefined();
  });

  it('POST /api/admin/support creates a ticket with defaults', async () => {
    const res = await asAdmin(http().post('/api/admin/support')).send({
      requester_name: 'Diane Leroy', requester_email: 'diane@example.com',
      sujet: 'Nouveau ticket', message: 'Un message de test suffisant.',
    }).expect(201);
    expect(res.body.data.categorie).toBe('autre');
    expect(res.body.data.priorite).toBe('normale');
    expect(res.body.data.statut).toBe('ouvert');
    expect(res.body.data.requester_name).toBe('Diane Leroy');
  });

  it('POST /api/admin/support accepts an explicit categorie/priorite', async () => {
    const res = await asAdmin(http().post('/api/admin/support')).send({
      requester_name: 'Eve Blanc', requester_email: 'eve@example.com',
      sujet: 'Ticket prioritaire', categorie: 'technique', priorite: 'haute',
      message: 'Un message de test suffisant.',
    }).expect(201);
    expect(res.body.data.categorie).toBe('technique');
    expect(res.body.data.priorite).toBe('haute');
  });

  it('PATCH /api/admin/support/:id updates statut/priorite/assigned_to', async () => {
    const admin = await seedAdmin(app, 'sup-assignee@aura.io');
    const res = await asAdmin(http().patch(`/api/admin/support/${ticketEnCoursId}`)).send({
      priorite: 'haute', assigned_to: admin.user.id,
    }).expect(200);
    expect(res.body.data.priorite).toBe('haute');
    expect(res.body.data.assigned_to).toBe(admin.user.id);
    expect(res.body.data.statut).toBe('en_cours');
  });

  it('PATCH /api/admin/support/:id validates statut/priorite vocab', async () => {
    const res = await asAdmin(http().patch(`/api/admin/support/${ticketEnCoursId}`))
      .send({ statut: 'archive_invalide' }).expect(422);
    expect(res.body.errors.statut).toBeDefined();
  });

  it('POST /api/admin/support/:id/reply appends to messages and updates statut', async () => {
    const res = await asAdmin(http().post(`/api/admin/support/${ticketOuvertId}/reply`))
      .send({ text: 'Nous regardons votre demande.', statut: 'en_cours' }).expect(200);
    expect(res.body.data.statut).toBe('en_cours');
    expect(res.body.data.messages).toHaveLength(1);
    expect(res.body.data.messages[0]).toMatchObject({
      author: 'support', text: 'Nous regardons votre demande.',
    });
    expect(res.body.data.messages[0].at).toBeTruthy();
  });

  it('reply without statut appends another message and leaves statut unchanged', async () => {
    const res = await asAdmin(http().post(`/api/admin/support/${ticketOuvertId}/reply`))
      .send({ text: 'Deuxième message.' }).expect(200);
    expect(res.body.data.statut).toBe('en_cours');
    expect(res.body.data.messages).toHaveLength(2);
    expect(res.body.data.messages[1]).toMatchObject({ author: 'support', text: 'Deuxième message.' });
  });

  it('reply validates that text is required', async () => {
    const res = await asAdmin(http().post(`/api/admin/support/${ticketOuvertId}/reply`))
      .send({}).expect(422);
    expect(res.body.errors.text).toBeDefined();
  });

  it('reply 404s for an unknown id', async () => {
    const res = await asAdmin(http().post('/api/admin/support/999999/reply'))
      .send({ text: 'x' }).expect(404);
    expect(res.body.message).toBe('Ticket non trouvé');
  });

  it('POST /api/admin/support/:id/resolve sets statut to resolu', async () => {
    const res = await asAdmin(http().post(`/api/admin/support/${ticketOuvertId}/resolve`)).expect(200);
    expect(res.body.data.statut).toBe('resolu');
    // messages accumulated by the earlier reply calls must survive the resolve.
    expect(res.body.data.messages).toHaveLength(2);
  });

  it('resolve 404s for an unknown id', async () => {
    const res = await asAdmin(http().post('/api/admin/support/999999/resolve')).expect(404);
    expect(res.body.message).toBe('Ticket non trouvé');
  });
});
