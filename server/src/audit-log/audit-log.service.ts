import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { AuditCategory, AuditLog } from '../database/entities/audit-log.entity';
import { User } from '../database/entities/user.entity';
import { success } from '../common/envelope';
import { parsePagination, paginateQb } from '../common/pagination';
import { csvField, exportTimestamp, formatDateTimeFr } from '../common/format';
import { sanitizeUser } from '../auth/user.util';

export interface AuditTarget {
  type: string;
  id: number | null;
  label: string;
}

@Injectable()
export class AuditLogService {
  constructor(@InjectRepository(AuditLog) private readonly logs: Repository<AuditLog>) {}

  async record(
    actor: User | null,
    action: string,
    target: AuditTarget,
    category: AuditCategory,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    await this.logs.save({
      actor_id: actor?.id ?? null,
      action,
      target_type: target.type,
      target_id: target.id,
      category,
      metadata: {
        target_label: target.label,
        actor_role: (actor as any)?.role ?? null,
        ...(metadata ?? {}),
      },
    });
  }

  private baseQb(): SelectQueryBuilder<AuditLog> {
    return this.logs.createQueryBuilder('a').leftJoinAndSelect('a.actor', 'actor');
  }

  private applyFilters(qb: SelectQueryBuilder<AuditLog>, query: Record<string, any>) {
    if (query.category !== undefined) qb.andWhere('a.category = :cat', { cat: query.category });
    if (query.actor_id !== undefined) qb.andWhere('a.actor_id = :aid', { aid: query.actor_id });
    if (query.date_debut !== undefined) qb.andWhere('DATE(a.created_at) >= :dd', { dd: query.date_debut });
    if (query.date_fin !== undefined) qb.andWhere('DATE(a.created_at) <= :df', { df: query.date_fin });
  }

  private async computeStatistics(query: Record<string, any>) {
    const countCategory = async (category?: string) => {
      const qb = this.logs.createQueryBuilder('a');
      this.applyFilters(qb, query);
      if (category) qb.andWhere('a.category = :c', { c: category });
      return qb.getCount();
    };
    return {
      total: await countCategory(),
      security: await countCategory('security'),
      moderation: await countCategory('moderation'),
      finance: await countCategory('finance'),
    };
  }

  async index(query: Record<string, any>) {
    const { page, perPage } = parsePagination(query, 20);
    const qb = this.baseQb();
    this.applyFilters(qb, query);
    qb.orderBy('a.created_at', 'DESC').addOrderBy('a.id', 'DESC');
    const { data, pagination } = await paginateQb(qb, page, perPage);
    const sanitized = data.map((row) => ({
      ...row,
      actor: row.actor ? sanitizeUser(row.actor) : null,
    }));
    return success(sanitized, undefined, {
      pagination,
      statistiques: await this.computeStatistics(query),
    });
  }

  async exportCsv(query: Record<string, any>) {
    const qb = this.baseQb();
    this.applyFilters(qb, query);
    const rows = await qb.orderBy('a.created_at', 'DESC').addOrderBy('a.id', 'DESC').getMany();
    const header = 'Date;Auteur;Action;Cible;Type';
    const lines = rows.map((r) => [
      formatDateTimeFr(r.created_at),
      csvField(r.actor?.name ?? 'Système'),
      csvField(r.action),
      csvField(
        ((r.metadata as Record<string, unknown> | null)?.target_label as string | undefined)
          ?? `${r.target_type} #${r.target_id ?? ''}`,
      ),
      csvField(r.category),
    ].join(';'));
    return success({
      filename: `export_audit_${exportTimestamp()}.csv`,
      csv: [header, ...lines].join('\n'),
      total: rows.length,
    });
  }
}
