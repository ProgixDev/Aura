import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from '../database/entities/notification.entity';
import { success } from '../common/envelope';
import { parsePagination, paginateQb } from '../common/pagination';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification) private readonly notifications: Repository<Notification>,
  ) {}

  private async findOr404(id: number): Promise<Notification> {
    const n = await this.notifications.findOneBy({ id });
    if (!n) throw new NotFoundException({ status: 'error', message: 'Notification non trouvée' });
    return n;
  }

  async index(query: Record<string, any>) {
    const { page, perPage } = parsePagination(query, 15);
    const qb = this.notifications.createQueryBuilder('n');
    if (query.audience !== undefined) qb.andWhere('n.audience = :a', { a: query.audience });
    if (query.canal !== undefined) qb.andWhere('n.canal = :c', { c: query.canal });
    if (query.status !== undefined) qb.andWhere('n.status = :s', { s: query.status });
    if (query.search !== undefined) {
      qb.andWhere('(n.titre LIKE :q OR n.message LIKE :q)', { q: `%${query.search}%` });
    }
    qb.orderBy('n.created_at', 'DESC');
    const { data, pagination } = await paginateQb(qb, page, perPage);
    return success(data, undefined, { pagination });
  }

  async store(dto: CreateNotificationDto) {
    const n = await this.notifications.save({ ...dto });
    return success(n, 'Notification créée avec succès');
  }

  async show(id: number) {
    return success(await this.findOr404(id));
  }

  async update(id: number, dto: UpdateNotificationDto) {
    await this.findOr404(id);
    await this.notifications.update(id, { ...dto });
    return success(await this.findOr404(id), 'Notification mise à jour avec succès');
  }

  async destroy(id: number) {
    await this.findOr404(id);
    await this.notifications.delete(id);
    return success(undefined, 'Notification supprimée avec succès');
  }
}
