import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SupportTicket, TicketReply } from '../database/entities/support-ticket.entity';
import { success } from '../common/envelope';
import { parsePagination, paginateQb } from '../common/pagination';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { ReplyTicketDto } from './dto/reply-ticket.dto';

@Injectable()
export class SupportService {
  constructor(
    @InjectRepository(SupportTicket) private readonly tickets: Repository<SupportTicket>,
  ) {}

  private notFound(message: string): never {
    throw new NotFoundException({ status: 'error', message });
  }

  private loaded(id: number) {
    return this.tickets.findOneBy({ id });
  }

  async index(query: Record<string, any>) {
    const { page, perPage } = parsePagination(query, 15);
    const qb = this.tickets.createQueryBuilder('t');
    if (query.statut !== undefined) qb.andWhere('t.statut = :st', { st: query.statut });
    if (query.priorite !== undefined) qb.andWhere('t.priorite = :pr', { pr: query.priorite });
    if (query.search !== undefined) {
      qb.andWhere(
        '(LOWER(t.requester_name) LIKE LOWER(:q) OR LOWER(t.requester_email) LIKE LOWER(:q) OR LOWER(t.sujet) LIKE LOWER(:q))',
        { q: `%${query.search}%` },
      );
    }
    qb.orderBy('t.created_at', 'DESC');
    const { data, pagination } = await paginateQb(qb, page, perPage);

    const count = (statut?: string) =>
      statut ? this.tickets.countBy({ statut }) : this.tickets.count();
    const statistiques = {
      total: await count(),
      ouvert: await count('ouvert'),
      en_cours: await count('en_cours'),
      resolu: await count('resolu'),
    };

    return success(data, undefined, { pagination, statistiques });
  }

  async show(id: number) {
    const ticket = await this.loaded(id);
    if (!ticket) this.notFound('Ticket non trouvé');
    return success(ticket);
  }

  async store(dto: CreateTicketDto) {
    const saved = await this.tickets.save({
      requester_name: dto.requester_name,
      requester_email: dto.requester_email,
      sujet: dto.sujet,
      categorie: dto.categorie ?? 'autre',
      priorite: dto.priorite ?? 'normale',
      message: dto.message,
      statut: 'ouvert',
    });
    return success(await this.loaded(saved.id), 'Ticket créé avec succès');
  }

  async update(id: number, dto: UpdateTicketDto) {
    const ticket = await this.loaded(id);
    if (!ticket) this.notFound('Ticket non trouvé');
    await this.tickets.update(id, { ...dto });
    return success(await this.loaded(id), 'Ticket mis à jour avec succès');
  }

  async reply(id: number, dto: ReplyTicketDto) {
    const ticket = await this.loaded(id);
    if (!ticket) this.notFound('Ticket non trouvé');
    const messages: TicketReply[] = ticket.messages ?? [];
    messages.push({ author: 'support', text: dto.text, at: new Date().toISOString() });
    const patch: Record<string, unknown> = { messages };
    if (dto.statut !== undefined) patch.statut = dto.statut;
    await this.tickets.update(id, patch);
    return success(await this.loaded(id), 'Réponse envoyée avec succès');
  }

  async resolve(id: number) {
    const ticket = await this.loaded(id);
    if (!ticket) this.notFound('Ticket non trouvé');
    await this.tickets.update(id, { statut: 'resolu' });
    return success(await this.loaded(id), 'Ticket résolu avec succès');
  }
}
