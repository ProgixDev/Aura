import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Signalement } from '../database/entities/signalement.entity';
import { User } from '../database/entities/user.entity';
import { success } from '../common/envelope';
import { parsePagination, paginateQb } from '../common/pagination';
import { sanitizeUser } from '../auth/user.util';
import { AuditLogService } from '../audit-log/audit-log.service';
import { CreateSignalementDto } from './dto/create-signalement.dto';

@Injectable()
export class SignalementsService {
  constructor(
    @InjectRepository(Signalement) private readonly signalements: Repository<Signalement>,
    private readonly auditLog: AuditLogService,
  ) {}

  private notFound(message: string): never {
    throw new NotFoundException({ status: 'error', message });
  }

  private withRelations() {
    return this.signalements.createQueryBuilder('s')
      .leftJoinAndSelect('s.signalePar', 'signalePar')
      .leftJoinAndSelect('s.praticien', 'praticien');
  }

  // ---- client (JwtAuthGuard only — signale_par_id points at users, not clients) ----

  async store(user: User, dto: CreateSignalementDto) {
    const saved = await this.signalements.save({
      date_signalement: new Date(),
      type: dto.type,
      sujet: dto.sujet,
      motif: dto.motif,
      signale_par_id: user.id,
      praticien_id: dto.praticien_id,
      priorite: dto.priorite ?? 'normale',
      statut: 'pending',
    });
    return success(saved, 'Votre signalement a été transmis à la modération');
  }

  // ---- admin ----

  async adminIndex(query: Record<string, any>) {
    const { page, perPage } = parsePagination(query, 15);
    const qb = this.withRelations();
    if (query.statut !== undefined) qb.andWhere('s.statut = :st', { st: query.statut });
    if (query.type !== undefined) qb.andWhere('s.type = :ty', { ty: query.type });
    qb.orderBy('s.date_signalement', 'DESC');
    const { data, pagination } = await paginateQb(qb, page, perPage);
    const sanitized = data.map((s: any) => ({
      ...s,
      signalePar: s.signalePar ? sanitizeUser(s.signalePar) : s.signalePar,
    }));
    return success(sanitized, undefined, { pagination });
  }

  async resolve(actor: User, id: number) {
    const s = await this.signalements.findOneBy({ id });
    if (!s) this.notFound('Signalement non trouvé');
    await this.signalements.update(id, { statut: 'resolved' });
    await this.auditLog.record(
      actor,
      'a résolu un signalement',
      { type: 'signalement', id: s.id, label: `Signalement — ${s.sujet}` },
      'moderation',
      { praticien_id: s.praticien_id, priorite: s.priorite },
    );
    return success(await this.signalements.findOneBy({ id }), 'Signalement résolu');
  }

  async reject(actor: User, id: number) {
    const s = await this.signalements.findOneBy({ id });
    if (!s) this.notFound('Signalement non trouvé');
    await this.signalements.update(id, { statut: 'rejected' });
    await this.auditLog.record(
      actor,
      'a rejeté un signalement',
      { type: 'signalement', id: s.id, label: `Signalement — ${s.sujet}` },
      'moderation',
      { praticien_id: s.praticien_id, priorite: s.priorite },
    );
    return success(await this.signalements.findOneBy({ id }), 'Signalement rejeté');
  }
}
