import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Conversation } from '../database/entities/conversation.entity';
import { Message } from '../database/entities/message.entity';
import { Client } from '../database/entities/client.entity';
import { Praticien } from '../database/entities/praticien.entity';
import { success } from '../common/envelope';
import { parsePagination, paginateQb } from '../common/pagination';
import { CreateConversationClientDto } from './dto/create-conversation-client.dto';
import { CreateConversationPraticienDto } from './dto/create-conversation-praticien.dto';
import { SendMessageDto } from './dto/send-message.dto';

type Role = 'client' | 'praticien';

@Injectable()
export class ConversationsService {
  constructor(
    @InjectRepository(Conversation) private readonly conversations: Repository<Conversation>,
    @InjectRepository(Message) private readonly messages: Repository<Message>,
    @InjectRepository(Client) private readonly clients: Repository<Client>,
    @InjectRepository(Praticien) private readonly praticiens: Repository<Praticien>,
  ) {}

  private notFound(message: string): never {
    throw new NotFoundException({ status: 'error', message });
  }

  private async lastMessageFor(conversationId: number): Promise<Message | null> {
    return this.messages.createQueryBuilder('m')
      .where('m.conversation_id = :id', { id: conversationId })
      .orderBy('m.created_at', 'DESC')
      .getOne();
  }

  private async unreadCountFor(conversationId: number, incomingRole: Role): Promise<number> {
    return this.messages.count({
      where: { conversation_id: conversationId, sender_role: incomingRole, read_at: IsNull() },
    });
  }

  private async withViewerMeta(conversation: Conversation, viewerRole: Role) {
    const otherRole: Role = viewerRole === 'client' ? 'praticien' : 'client';
    const [last_message, unread_count] = await Promise.all([
      this.lastMessageFor(conversation.id),
      this.unreadCountFor(conversation.id, otherRole),
    ]);
    return { ...conversation, last_message, unread_count };
  }

  private async markRead(conversationId: number, incomingRole: Role) {
    const unread = await this.messages.find({
      where: { conversation_id: conversationId, sender_role: incomingRole, read_at: IsNull() },
    });
    if (unread.length === 0) return;
    const now = new Date();
    await this.messages.save(unread.map((m) => ({ ...m, read_at: now })));
  }

  private async touch(conversationId: number) {
    await this.conversations.save({ id: conversationId, updated_at: new Date() });
  }

  // ---- shared upsert-or-create, parameterised by role ----

  private async storeFor(
    viewerRole: Role,
    ownerId: number,
    otherId: number,
    text: string | undefined,
  ) {
    const where = viewerRole === 'client'
      ? { client_id: ownerId, praticien_id: otherId }
      : { client_id: otherId, praticien_id: ownerId };

    let conversation = await this.conversations.findOneBy(where);
    if (!conversation) {
      conversation = await this.conversations.save(where);
    }

    let message: Message | null = null;
    if (text?.trim()) {
      message = await this.messages.save({
        conversation_id: conversation.id,
        sender_role: viewerRole,
        text: text.trim(),
        flagged: false,
      });
      await this.touch(conversation.id);
    }

    const fresh = await this.conversations.findOne({
      where: { id: conversation.id },
      relations: viewerRole === 'client' ? { praticien: true } : { client: true },
    });
    return success({ conversation: fresh, message }, 'Conversation prête');
  }

  // ---- client ----

  async clientIndex(client: Client) {
    const rows = await this.conversations.createQueryBuilder('c')
      .leftJoinAndSelect('c.praticien', 'praticien')
      .where('c.client_id = :cid', { cid: client.id })
      .orderBy('c.updated_at', 'DESC')
      .getMany();
    const withMeta = await Promise.all(rows.map((c) => this.withViewerMeta(c, 'client')));
    return success(withMeta);
  }

  async clientStore(client: Client, dto: CreateConversationClientDto) {
    const praticien = await this.praticiens.findOneBy({ id: dto.praticien_id });
    if (!praticien) this.notFound('Praticien introuvable');
    return this.storeFor('client', client.id, dto.praticien_id, dto.text);
  }

  async clientShow(client: Client, id: number) {
    const conversation = await this.conversations.findOne({
      where: { id, client_id: client.id },
      relations: { praticien: true },
    });
    if (!conversation) this.notFound('Conversation non trouvée');
    return success(await this.withViewerMeta(conversation, 'client'));
  }

  async clientMessages(client: Client, id: number) {
    const conversation = await this.conversations.findOneBy({ id, client_id: client.id });
    if (!conversation) this.notFound('Conversation non trouvée');
    await this.markRead(id, 'praticien');
    const messages = await this.messages.find({
      where: { conversation_id: id },
      order: { created_at: 'ASC' },
    });
    return success(messages);
  }

  async clientSendMessage(client: Client, id: number, dto: SendMessageDto) {
    const conversation = await this.conversations.findOneBy({ id, client_id: client.id });
    if (!conversation) this.notFound('Conversation non trouvée');
    const message = await this.messages.save({
      conversation_id: id, sender_role: 'client', text: dto.text.trim(), flagged: false,
    });
    await this.touch(id);
    return success(message, 'Message envoyé');
  }

  // ---- praticien ----

  async praticienIndex(praticien: Praticien) {
    const rows = await this.conversations.createQueryBuilder('c')
      .leftJoinAndSelect('c.client', 'client')
      .where('c.praticien_id = :pid', { pid: praticien.id })
      .orderBy('c.updated_at', 'DESC')
      .getMany();
    const withMeta = await Promise.all(rows.map((c) => this.withViewerMeta(c, 'praticien')));
    return success(withMeta);
  }

  async praticienStore(praticien: Praticien, dto: CreateConversationPraticienDto) {
    const client = await this.clients.findOneBy({ id: dto.client_id });
    if (!client) this.notFound('Client introuvable');
    return this.storeFor('praticien', praticien.id, dto.client_id, dto.text);
  }

  async praticienShow(praticien: Praticien, id: number) {
    const conversation = await this.conversations.findOne({
      where: { id, praticien_id: praticien.id },
      relations: { client: true },
    });
    if (!conversation) this.notFound('Conversation non trouvée');
    return success(await this.withViewerMeta(conversation, 'praticien'));
  }

  async praticienMessages(praticien: Praticien, id: number) {
    const conversation = await this.conversations.findOneBy({ id, praticien_id: praticien.id });
    if (!conversation) this.notFound('Conversation non trouvée');
    await this.markRead(id, 'client');
    const messages = await this.messages.find({
      where: { conversation_id: id },
      order: { created_at: 'ASC' },
    });
    return success(messages);
  }

  async praticienSendMessage(praticien: Praticien, id: number, dto: SendMessageDto) {
    const conversation = await this.conversations.findOneBy({ id, praticien_id: praticien.id });
    if (!conversation) this.notFound('Conversation non trouvée');
    const message = await this.messages.save({
      conversation_id: id, sender_role: 'praticien', text: dto.text.trim(), flagged: false,
    });
    await this.touch(id);
    return success(message, 'Message envoyé');
  }

  // ---- admin ----

  async adminIndex(query: Record<string, any>) {
    const { page, perPage } = parsePagination(query, 15);
    const qb = this.conversations.createQueryBuilder('c')
      .leftJoinAndSelect('c.client', 'client')
      .leftJoinAndSelect('c.praticien', 'praticien')
      .orderBy('c.updated_at', 'DESC');
    const { data, pagination } = await paginateQb(qb, page, perPage);
    const withMeta = await Promise.all(data.map(async (c) => {
      const [last_message, message_count, flagged_count] = await Promise.all([
        this.lastMessageFor(c.id),
        this.messages.count({ where: { conversation_id: c.id } }),
        this.messages.count({ where: { conversation_id: c.id, flagged: true } }),
      ]);
      return { ...c, last_message, message_count, flagged_count };
    }));
    return success(withMeta, undefined, { pagination });
  }

  async adminShow(id: number) {
    const conversation = await this.conversations.findOne({
      where: { id },
      relations: { client: true, praticien: true },
    });
    if (!conversation) this.notFound('Conversation non trouvée');
    const messages = await this.messages.find({
      where: { conversation_id: id },
      order: { created_at: 'ASC' },
    });
    return success({ ...conversation, messages });
  }

  async flagMessage(id: number) {
    const message = await this.messages.findOneBy({ id });
    if (!message) this.notFound('Message non trouvé');
    await this.messages.update(id, { flagged: true });
    return success(await this.messages.findOneBy({ id }), 'Message signalé');
  }

  async unflagMessage(id: number) {
    const message = await this.messages.findOneBy({ id });
    if (!message) this.notFound('Message non trouvé');
    await this.messages.update(id, { flagged: false });
    return success(await this.messages.findOneBy({ id }), 'Signalement retiré');
  }
}
