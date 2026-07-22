import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import {
  createTestApp, seedAdmin, seedClientUser, seedPraticienUser,
} from './utils/create-test-app';
import { PeerMessagesModule } from '../src/peer-messages/peer-messages.module';

describe('peer-messages (praticien-to-praticien)', () => {
  let app: INestApplication;
  let praticienAToken: string;
  let praticienAId: number;
  let praticienBToken: string;
  let praticienBId: number;
  let clientToken: string;
  let adminToken: string;
  let conversationId: number;

  beforeAll(async () => {
    app = await createTestApp({ imports: [PeerMessagesModule] });
    const a = await seedPraticienUser(app, 'peer-a@aura.io');
    praticienAToken = a.token;
    praticienAId = a.praticien.id;
    const b = await seedPraticienUser(app, 'peer-b@aura.io');
    praticienBToken = b.token;
    praticienBId = b.praticien.id;
    clientToken = (await seedClientUser(app, 'peer-client@aura.io')).token;
    adminToken = (await seedAdmin(app, 'peer-admin@aura.io')).token;
  });
  afterAll(async () => { await app.close(); });
  const http = () => request(app.getHttpServer());
  const asA = (r: request.Test) => r.set('Authorization', `Bearer ${praticienAToken}`);
  const asB = (r: request.Test) => r.set('Authorization', `Bearer ${praticienBToken}`);
  const asClient = (r: request.Test) => r.set('Authorization', `Bearer ${clientToken}`);
  const asAdmin = (r: request.Test) => r.set('Authorization', `Bearer ${adminToken}`);

  it('requires auth; a client token is rejected by PraticienGuard', async () => {
    await http().get('/api/praticien/peer-conversations').expect(401);
    await asClient(http().get('/api/praticien/peer-conversations')).expect(403);
  });

  it('rejects starting a conversation with yourself', async () => {
    const res = await asA(http().post('/api/praticien/peer-conversations'))
      .send({ peer_id: praticienAId }).expect(422);
    expect(res.body.errors.peer_id).toBeDefined();
  });

  it('404s on an unknown peer', async () => {
    const res = await asA(http().post('/api/praticien/peer-conversations'))
      .send({ peer_id: 999999 }).expect(404);
    expect(res.body.message).toBe('Praticien introuvable');
  });

  it('creates the conversation with an optional first message, from_me true for the sender', async () => {
    const res = await asA(http().post('/api/praticien/peer-conversations'))
      .send({ peer_id: praticienBId, text: 'Salut, envie de troquer une séance ?' }).expect(200);
    expect(res.body.data.conversation.other).toMatchObject({ id: praticienBId });
    expect(res.body.data.message.text).toBe('Salut, envie de troquer une séance ?');
    expect(res.body.data.message.from_me).toBe(true);
    conversationId = res.body.data.conversation.id;
  });

  it('starting from either side of an existing pair reuses the same conversation, canonical ordering', async () => {
    const fromA = await asA(http().post('/api/praticien/peer-conversations'))
      .send({ peer_id: praticienBId }).expect(200);
    expect(fromA.body.data.conversation.id).toBe(conversationId);
    expect(fromA.body.data.message).toBeNull();

    const fromB = await asB(http().post('/api/praticien/peer-conversations'))
      .send({ peer_id: praticienAId }).expect(200);
    expect(fromB.body.data.conversation.id).toBe(conversationId);

    const listA = await asA(http().get('/api/praticien/peer-conversations')).expect(200);
    expect(listA.body.data).toHaveLength(1);
  });

  it('index shows the other praticien, last_message, and unread_count (0 for your own message)', async () => {
    const res = await asA(http().get('/api/praticien/peer-conversations')).expect(200);
    const row = res.body.data[0];
    expect(row.other).toMatchObject({ id: praticienBId });
    expect(row.last_message.text).toBe('Salut, envie de troquer une séance ?');
    expect(row.unread_count).toBe(0);
  });

  it('B sees the conversation with 1 unread (A\'s opening message)', async () => {
    const list = await asB(http().get('/api/praticien/peer-conversations')).expect(200);
    expect(list.body.data[0].id).toBe(conversationId);
    expect(list.body.data[0].other).toMatchObject({ id: praticienAId });
    expect(list.body.data[0].unread_count).toBe(1);
  });

  it('show/messages 404 for a praticien not part of the conversation', async () => {
    const outsider = await seedPraticienUser(app, 'peer-outsider@aura.io');
    const asOutsider = (r: request.Test) => r.set('Authorization', `Bearer ${outsider.token}`);
    await asOutsider(http().get(`/api/praticien/peer-conversations/${conversationId}`)).expect(404);
    await asOutsider(http().get(`/api/praticien/peer-conversations/${conversationId}/messages`)).expect(404);
  });

  it('SendPeerMessageDto rejects an empty message', async () => {
    const res = await asB(http().post(`/api/praticien/peer-conversations/${conversationId}/messages`))
      .send({ text: '' }).expect(422);
    expect(res.body.errors.text).toBeDefined();
  });

  it('B can reply; reading marks the other party\'s messages read for each side independently', async () => {
    const reply = await asB(http().post(`/api/praticien/peer-conversations/${conversationId}/messages`))
      .send({ text: 'Avec plaisir, dis-moi tes dispos.' }).expect(201);
    expect(reply.body.data.from_me).toBe(true);

    // B reading the thread marks A's opening message read.
    await asB(http().get(`/api/praticien/peer-conversations/${conversationId}/messages`)).expect(200);
    const bList = await asB(http().get('/api/praticien/peer-conversations')).expect(200);
    expect(bList.body.data[0].unread_count).toBe(0);

    // A has not yet read B's reply.
    const aList = await asA(http().get('/api/praticien/peer-conversations')).expect(200);
    expect(aList.body.data[0].unread_count).toBe(1);

    // A reads the thread — marks B's reply read, and messages come back oldest-first
    // with from_me correct per side.
    const aMessages = await asA(http().get(`/api/praticien/peer-conversations/${conversationId}/messages`)).expect(200);
    expect(aMessages.body.data.map((m: any) => m.from_me)).toEqual([true, false]);
    const aListAfter = await asA(http().get('/api/praticien/peer-conversations')).expect(200);
    expect(aListAfter.body.data[0].unread_count).toBe(0);
  });

  it('admin routes require AdminGuard, paginate, and count messages/flags per conversation', async () => {
    await http().get('/api/admin/peer-conversations').expect(401);
    await asA(http().get('/api/admin/peer-conversations')).expect(403);

    const list = await asAdmin(http().get('/api/admin/peer-conversations')).expect(200);
    expect(list.body.data).toHaveLength(1);
    expect(list.body.data[0].message_count).toBe(2);
    expect(list.body.data[0].flagged_count).toBe(0);

    const show = await asAdmin(http().get(`/api/admin/peer-conversations/${conversationId}`)).expect(200);
    expect(show.body.data.messages).toHaveLength(2);
    expect(show.body.data.praticienA).toBeDefined();
    expect(show.body.data.praticienB).toBeDefined();
  });

  it('admin can flag and unflag an individual message', async () => {
    const show = await asAdmin(http().get(`/api/admin/peer-conversations/${conversationId}`)).expect(200);
    const messageId = show.body.data.messages[0].id;

    const flagged = await asAdmin(http().post(`/api/admin/peer-messages/${messageId}/flag`)).expect(200);
    expect(flagged.body.data.flagged).toBe(true);

    const list = await asAdmin(http().get('/api/admin/peer-conversations')).expect(200);
    expect(list.body.data[0].flagged_count).toBe(1);

    const unflagged = await asAdmin(http().post(`/api/admin/peer-messages/${messageId}/unflag`)).expect(200);
    expect(unflagged.body.data.flagged).toBe(false);
  });
});
