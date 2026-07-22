import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { PeerConversation } from '../database/entities/peer-conversation.entity';
import { PeerMessage } from '../database/entities/peer-message.entity';
import { Praticien } from '../database/entities/praticien.entity';
import { success } from '../common/envelope';
import { parsePagination, paginateQb } from '../common/pagination';
import { StartConversationDto } from './dto/start-conversation.dto';
import { SendPeerMessageDto } from './dto/send-peer-message.dto';

@Injectable()
export class PeerMessagesService {
  constructor(
    @InjectRepository(PeerConversation) private readonly conversations: Repository<PeerConversation>,
    @InjectRepository(PeerMessage) private readonly messages: Repository<PeerMessage>,
    @InjectRepository(Praticien) private readonly praticiens: Repository<Praticien>,
  ) {}

  private notFound(message: string): never {
    throw new NotFoundException({ status: 'error', message });
  }

  private otherIdFor(conversation: PeerConversation, viewerId: number): number {
    return conversation.praticien_a_id === viewerId ? conversation.praticien_b_id : conversation.praticien_a_id;
  }

  private async lastMessageFor(conversationId: number): Promise<PeerMessage | null> {
    return this.messages.createQueryBuilder('m')
      .where('m.conversation_id = :id', { id: conversationId })
      .orderBy('m.created_at', 'DESC')
      .getOne();
  }

  private async unreadCountFor(conversationId: number, viewerId: number): Promise<number> {
    return this.messages.createQueryBuilder('m')
      .where('m.conversation_id = :id', { id: conversationId })
      .andWhere('m.sender_praticien_id != :vid', { vid: viewerId })
      .andWhere('m.read_at IS NULL')
      .getCount();
  }

  private async withViewerMeta(conversation: PeerConversation, viewerId: number) {
    const otherId = this.otherIdFor(conversation, viewerId);
    const [other, last_message, unread_count] = await Promise.all([
      this.praticiens.findOne({ where: { id: otherId } }),
      this.lastMessageFor(conversation.id),
      this.unreadCountFor(conversation.id, viewerId),
    ]);
    return { ...conversation, other, last_message, unread_count };
  }

  private async markRead(conversationId: number, viewerId: number) {
    const unread = await this.messages.find({
      where: { conversation_id: conversationId, read_at: IsNull() },
    });
    const incoming = unread.filter((m) => m.sender_praticien_id !== viewerId);
    if (incoming.length === 0) return;
    const now = new Date();
    await this.messages.save(incoming.map((m) => ({ ...m, read_at: now })));
  }

  private async touch(conversationId: number) {
    await this.conversations.save({ id: conversationId, updated_at: new Date() });
  }

  private async findOwned(id: number, viewerId: number): Promise<PeerConversation | null> {
    const conversation = await this.conversations.findOneBy({ id });
    if (!conversation) return null;
    if (conversation.praticien_a_id !== viewerId && conversation.praticien_b_id !== viewerId) return null;
    return conversation;
  }

  async index(praticien: Praticien) {
    const rows = await this.conversations.createQueryBuilder('c')
      .where('c.praticien_a_id = :pid OR c.praticien_b_id = :pid', { pid: praticien.id })
      .orderBy('c.updated_at', 'DESC')
      .getMany();
    const withMeta = await Promise.all(rows.map((c) => this.withViewerMeta(c, praticien.id)));
    return success(withMeta);
  }

  async startConversation(praticien: Praticien, dto: StartConversationDto) {
    if (dto.peer_id === praticien.id) {
      throw new UnprocessableEntityException({
        status: 'error', message: 'Erreur de validation',
        errors: { peer_id: ['Vous ne pouvez pas démarrer une conversation avec vous-même.'] },
      });
    }
    const peer = await this.praticiens.findOneBy({ id: dto.peer_id });
    if (!peer) this.notFound('Praticien introuvable');

    const [a, b] = praticien.id < dto.peer_id ? [praticien.id, dto.peer_id] : [dto.peer_id, praticien.id];
    let conversation = await this.conversations.findOneBy({ praticien_a_id: a, praticien_b_id: b });
    if (!conversation) {
      conversation = await this.conversations.save({ praticien_a_id: a, praticien_b_id: b });
    }

    let message: (PeerMessage & { from_me: boolean }) | null = null;
    if (dto.text?.trim()) {
      const saved = await this.messages.save({
        conversation_id: conversation.id,
        sender_praticien_id: praticien.id,
        text: dto.text.trim(),
        flagged: false,
      });
      message = { ...saved, from_me: true };
      await this.touch(conversation.id);
    }

    const fresh = await this.conversations.findOneByOrFail({ id: conversation.id });
    return success(
      { conversation: await this.withViewerMeta(fresh, praticien.id), message },
      'Conversation prête',
    );
  }

  async show(praticien: Praticien, id: number) {
    const conversation = await this.findOwned(id, praticien.id);
    if (!conversation) this.notFound('Conversation non trouvée');
    return success(await this.withViewerMeta(conversation, praticien.id));
  }

  async listMessages(praticien: Praticien, id: number) {
    const conversation = await this.findOwned(id, praticien.id);
    if (!conversation) this.notFound('Conversation non trouvée');
    await this.markRead(id, praticien.id);
    const rows = await this.messages.find({
      where: { conversation_id: id },
      order: { created_at: 'ASC' },
    });
    return success(rows.map((m) => ({ ...m, from_me: m.sender_praticien_id === praticien.id })));
  }

  async sendMessage(praticien: Praticien, id: number, dto: SendPeerMessageDto) {
    const conversation = await this.findOwned(id, praticien.id);
    if (!conversation) this.notFound('Conversation non trouvée');
    const message = await this.messages.save({
      conversation_id: id, sender_praticien_id: praticien.id, text: dto.text.trim(), flagged: false,
    });
    await this.touch(id);
    return success({ ...message, from_me: true }, 'Message envoyé');
  }

  // ---- admin (moderation parity with the client/praticien conversations module) ----

  async adminIndex(query: Record<string, any>) {
    const { page, perPage } = parsePagination(query, 15);
    const qb = this.conversations.createQueryBuilder('c')
      .leftJoinAndSelect('c.praticienA', 'praticienA')
      .leftJoinAndSelect('c.praticienB', 'praticienB')
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
    const conversation = await this.conversations.createQueryBuilder('c')
      .leftJoinAndSelect('c.praticienA', 'praticienA')
      .leftJoinAndSelect('c.praticienB', 'praticienB')
      .where('c.id = :id', { id })
      .getOne();
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
