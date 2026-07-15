import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import {
  createTestApp, seedAdmin, seedClientUser, seedPraticienUser,
} from './utils/create-test-app';
import { ConversationsModule } from '../src/conversations/conversations.module';

describe('conversations', () => {
  let app: INestApplication;
  let clientToken: string;
  let clientId: number;
  let otherClientToken: string;
  let praticienToken: string;
  let praticienId: number;
  let adminToken: string;
  let conversationId: number;

  beforeAll(async () => {
    app = await createTestApp({ imports: [ConversationsModule] });
    const client = await seedClientUser(app, 'conv-client@aura.io');
    clientToken = client.token;
    clientId = client.client.id;
    otherClientToken = (await seedClientUser(app, 'conv-other-client@aura.io')).token;
    const praticien = await seedPraticienUser(app, 'conv-praticien@aura.io');
    praticienToken = praticien.token;
    praticienId = praticien.praticien.id;
    adminToken = (await seedAdmin(app, 'conv-admin@aura.io')).token;
  });
  afterAll(async () => { await app.close(); });
  const http = () => request(app.getHttpServer());
  const asClient = (r: request.Test) => r.set('Authorization', `Bearer ${clientToken}`);
  const asOtherClient = (r: request.Test) => r.set('Authorization', `Bearer ${otherClientToken}`);
  const asPraticien = (r: request.Test) => r.set('Authorization', `Bearer ${praticienToken}`);
  const asAdmin = (r: request.Test) => r.set('Authorization', `Bearer ${adminToken}`);

  it('requires auth on every role-scoped route', async () => {
    await http().get('/api/client/conversations').expect(401);
    await http().post('/api/client/conversations').send({ praticien_id: praticienId }).expect(401);
    await http().get('/api/praticien/conversations').expect(401);
    await http().get('/api/admin/conversations').expect(401);
  });

  it('PraticienGuard rejects a client token — it is a separate identity from ClientGuard', async () => {
    await asClient(http().get('/api/praticien/conversations')).expect(403);
  });

  it('ClientGuard rejects a praticien token — it is a separate identity from PraticienGuard', async () => {
    await asPraticien(http().get('/api/client/conversations')).expect(403);
  });

  it('client store validates praticien_id, 404s on an unknown praticien, and creates with an optional first message', async () => {
    const bad = await asClient(http().post('/api/client/conversations')).send({}).expect(422);
    expect(bad.body.errors.praticien_id).toBeDefined();

    const missing = await asClient(http().post('/api/client/conversations'))
      .send({ praticien_id: 999999 }).expect(404);
    expect(missing.body.message).toBe('Praticien introuvable');

    const res = await asClient(http().post('/api/client/conversations'))
      .send({ praticien_id: praticienId, text: 'Bonjour, je découvre votre profil.' })
      .expect(200);
    expect(res.body.data.conversation.praticien_id).toBe(praticienId);
    expect(res.body.data.conversation.client_id).toBe(clientId);
    expect(res.body.data.message.sender_role).toBe('client');
    expect(res.body.data.message.text).toBe('Bonjour, je découvre votre profil.');
    conversationId = res.body.data.conversation.id;
  });

  it('re-posting for the same praticien upserts the existing conversation instead of duplicating it', async () => {
    const res = await asClient(http().post('/api/client/conversations'))
      .send({ praticien_id: praticienId }).expect(200);
    expect(res.body.data.conversation.id).toBe(conversationId);
    expect(res.body.data.message).toBeNull();

    const list = await asClient(http().get('/api/client/conversations')).expect(200);
    expect(list.body.data).toHaveLength(1);
  });

  it('client index returns the praticien joined, last_message, and unread_count', async () => {
    const res = await asClient(http().get('/api/client/conversations')).expect(200);
    expect(res.body.data).toHaveLength(1);
    const row = res.body.data[0];
    expect(row.praticien).toMatchObject({ id: praticienId });
    expect(row.last_message.text).toBe('Bonjour, je découvre votre profil.');
    expect(row.unread_count).toBe(0); // a client's own message is never "unread" from their own view
  });

  it('client show 404s for a conversation that belongs to a different client', async () => {
    await asOtherClient(http().get(`/api/client/conversations/${conversationId}`)).expect(404);
  });

  it('SendMessageDto rejects an empty message', async () => {
    const res = await asClient(http().post(`/api/client/conversations/${conversationId}/messages`))
      .send({ text: '' }).expect(422);
    expect(res.body.errors.text).toBeDefined();
  });

  it('praticien sees the conversation the client started, with unread_count for the opening message', async () => {
    const list = await asPraticien(http().get('/api/praticien/conversations')).expect(200);
    expect(list.body.data).toHaveLength(1);
    expect(list.body.data[0].id).toBe(conversationId);
    expect(list.body.data[0].client).toMatchObject({ id: clientId });
    expect(list.body.data[0].unread_count).toBe(1); // client's opening message, unread by the praticien
  });

  it('praticien can reply', async () => {
    const reply = await asPraticien(http().post(`/api/praticien/conversations/${conversationId}/messages`))
      .send({ text: 'Bonjour, avec plaisir !' }).expect(201);
    expect(reply.body.data.sender_role).toBe('praticien');
    expect(reply.body.data.conversation_id).toBe(conversationId);
  });

  it("reading a conversation's messages marks the other party's messages as read", async () => {
    // Praticien reads the thread — marks the client's opening message read.
    await asPraticien(http().get(`/api/praticien/conversations/${conversationId}/messages`)).expect(200);
    const praticienList = await asPraticien(http().get('/api/praticien/conversations')).expect(200);
    expect(praticienList.body.data[0].unread_count).toBe(0);

    // Client has not yet read the praticien's reply.
    const clientList = await asClient(http().get('/api/client/conversations')).expect(200);
    expect(clientList.body.data[0].unread_count).toBe(1);

    // Client reads the thread — marks the praticien's reply read.
    await asClient(http().get(`/api/client/conversations/${conversationId}/messages`)).expect(200);
    const clientListAfter = await asClient(http().get('/api/client/conversations')).expect(200);
    expect(clientListAfter.body.data[0].unread_count).toBe(0);
  });

  it('the thread is ordered oldest-first and includes both senders', async () => {
    const res = await asClient(http().get(`/api/client/conversations/${conversationId}/messages`)).expect(200);
    expect(res.body.data.map((m: any) => m.sender_role)).toEqual(['client', 'praticien']);
  });

  it('praticien store validates client_id, 404s on an unknown client, and reuses an existing conversation', async () => {
    const missing = await asPraticien(http().post('/api/praticien/conversations'))
      .send({ client_id: 999999 }).expect(404);
    expect(missing.body.message).toBe('Client introuvable');

    const res = await asPraticien(http().post('/api/praticien/conversations'))
      .send({ client_id: clientId }).expect(200);
    expect(res.body.data.conversation.id).toBe(conversationId);
    expect(res.body.data.message).toBeNull();
  });

  it('admin routes require AdminGuard, paginate, and count messages/flags per conversation', async () => {
    await http().get('/api/admin/conversations').expect(401);
    await asClient(http().get('/api/admin/conversations')).expect(403);

    const list = await asAdmin(http().get('/api/admin/conversations')).expect(200);
    expect(list.body.data).toHaveLength(1);
    expect(list.body.data[0].message_count).toBe(2);
    expect(list.body.data[0].flagged_count).toBe(0);
    expect(list.body.pagination).toBeDefined();

    const show = await asAdmin(http().get(`/api/admin/conversations/${conversationId}`)).expect(200);
    expect(show.body.data.messages).toHaveLength(2);
    expect(show.body.data.client).toBeDefined();
    expect(show.body.data.praticien).toBeDefined();
  });

  it('admin can flag and unflag an individual message', async () => {
    const show = await asAdmin(http().get(`/api/admin/conversations/${conversationId}`)).expect(200);
    const messageId = show.body.data.messages[0].id;

    const flagged = await asAdmin(http().post(`/api/admin/messages/${messageId}/flag`)).expect(200);
    expect(flagged.body.data.flagged).toBe(true);

    const list = await asAdmin(http().get('/api/admin/conversations')).expect(200);
    expect(list.body.data[0].flagged_count).toBe(1);

    const unflagged = await asAdmin(http().post(`/api/admin/messages/${messageId}/unflag`)).expect(200);
    expect(unflagged.body.data.flagged).toBe(false);

    const listAfter = await asAdmin(http().get('/api/admin/conversations')).expect(200);
    expect(listAfter.body.data[0].flagged_count).toBe(0);
  });
});
