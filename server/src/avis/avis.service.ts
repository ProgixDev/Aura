import {
  Injectable, NotFoundException, UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Avis } from '../database/entities/avis.entity';
import { Client } from '../database/entities/client.entity';
import { User } from '../database/entities/user.entity';
import { success } from '../common/envelope';
import { parsePagination, paginateQb } from '../common/pagination';
import { AuditLogService } from '../audit-log/audit-log.service';
import { CreateAvisDto } from './dto/create-avis.dto';
import { UpdateAvisDto } from './dto/update-avis.dto';

@Injectable()
export class AvisService {
  constructor(
    @InjectRepository(Avis) private readonly avis: Repository<Avis>,
    private readonly auditLog: AuditLogService,
  ) {}

  private notFound(message: string): never {
    throw new NotFoundException({ status: 'error', message });
  }

  private fullName(client: Client): string {
    return `${client.firstname} ${client.lastname}`;
  }

  // ---- public ----

  async publicIndex(query: Record<string, any>) {
    if (query.praticien_id === undefined) {
      throw new UnprocessableEntityException({
        status: 'error',
        message: 'Erreur de validation',
        errors: { praticien_id: ['Le paramètre praticien_id est requis.'] },
      });
    }
    const rows = await this.avis.createQueryBuilder('a')
      .where('a.praticien_id = :pid AND a.statut = :st', {
        pid: Number(query.praticien_id), st: 'publié',
      })
      .orderBy('a.date_ajout', 'DESC')
      .getMany();
    return success(rows);
  }

  // ---- client ----
  // Note: `avis` has no client_id column — ownership is approximated by matching
  // full_name_author against the current client's name. This is a real, acknowledged
  // schema limitation (not a bug): two clients with identical names would collide.

  async store(client: Client, dto: CreateAvisDto) {
    const saved = await this.avis.save({
      full_name_author: this.fullName(client),
      praticien_id: dto.praticien_id,
      note: dto.note,
      avis: dto.avis,
      date_ajout: new Date(),
      statut: 'en_attente',
    });
    return success(saved, 'Votre avis a été envoyé et sera publié après vérification');
  }

  async mine(client: Client) {
    const rows = await this.avis.createQueryBuilder('a')
      .leftJoinAndSelect('a.praticien', 'praticien')
      .where('a.full_name_author = :name', { name: this.fullName(client) })
      .orderBy('a.date_ajout', 'DESC')
      .getMany();
    return success(rows);
  }

  async update(client: Client, id: number, dto: UpdateAvisDto) {
    const avis = await this.avis.findOneBy({
      id, full_name_author: this.fullName(client), statut: 'en_attente',
    });
    if (!avis) this.notFound('Avis non trouvé ou ne peut pas être modifié');
    await this.avis.update(id, { ...dto });
    return success(await this.avis.findOneBy({ id }), 'Avis mis à jour avec succès');
  }

  async destroy(client: Client, id: number) {
    const avis = await this.avis.findOneBy({
      id, full_name_author: this.fullName(client), statut: 'en_attente',
    });
    if (!avis) this.notFound('Avis non trouvé ou ne peut pas être supprimé');
    await this.avis.delete(id);
    return success(undefined, 'Avis supprimé avec succès');
  }

  // ---- admin ----

  async adminIndex(query: Record<string, any>) {
    const { page, perPage } = parsePagination(query, 15);
    const qb = this.avis.createQueryBuilder('a').leftJoinAndSelect('a.praticien', 'praticien');
    if (query.statut !== undefined) qb.andWhere('a.statut = :st', { st: query.statut });
    qb.orderBy('a.date_ajout', 'DESC');
    const { data, pagination } = await paginateQb(qb, page, perPage);
    return success(data, undefined, { pagination });
  }

  async publish(actor: User, id: number) {
    const avis = await this.avis.findOneBy({ id });
    if (!avis) this.notFound('Avis non trouvé');
    await this.avis.update(id, { statut: 'publié' });
    await this.auditLog.record(
      actor,
      'a publié un avis',
      { type: 'avis', id: avis.id, label: `Avis #${avis.id} — ${avis.full_name_author}` },
      'moderation',
      { praticien_id: avis.praticien_id },
    );
    return success(await this.avis.findOneBy({ id }), 'Avis publié avec succès');
  }

  async reject(actor: User, id: number) {
    const avis = await this.avis.findOneBy({ id });
    if (!avis) this.notFound('Avis non trouvé');
    await this.avis.update(id, { statut: 'rejeté' });
    await this.auditLog.record(
      actor,
      'a rejeté un avis',
      { type: 'avis', id: avis.id, label: `Avis #${avis.id} — ${avis.full_name_author}` },
      'moderation',
      { praticien_id: avis.praticien_id },
    );
    return success(await this.avis.findOneBy({ id }), 'Avis rejeté');
  }

  async adminDestroy(id: number) {
    const avis = await this.avis.findOneBy({ id });
    if (!avis) this.notFound('Avis non trouvé');
    await this.avis.delete(id);
    return success(undefined, 'Avis supprimé avec succès');
  }
}
