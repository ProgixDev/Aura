import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Dispute } from '../database/entities/dispute.entity';
import { Client } from '../database/entities/client.entity';
import { Praticien } from '../database/entities/praticien.entity';
import { Paiement } from '../database/entities/paiement.entity';
import { success } from '../common/envelope';
import { parsePagination, paginateQb } from '../common/pagination';
import { CreateDisputeDto } from './dto/create-dispute.dto';
import { ResolveDisputeDto } from './dto/resolve-dispute.dto';

@Injectable()
export class DisputesService {
  constructor(
    @InjectRepository(Dispute) private readonly disputes: Repository<Dispute>,
    @InjectRepository(Client) private readonly clients: Repository<Client>,
    @InjectRepository(Praticien) private readonly praticiens: Repository<Praticien>,
    @InjectRepository(Paiement) private readonly paiements: Repository<Paiement>,
  ) {}

  private notFound(message: string): never {
    throw new NotFoundException({ status: 'error', message });
  }

  private validationError(errors: Record<string, string[]>): never {
    throw new UnprocessableEntityException({
      status: 'error', message: 'Erreur de validation', errors,
    });
  }

  private withRelations() {
    return this.disputes.createQueryBuilder('d')
      .leftJoinAndSelect('d.client', 'client')
      .leftJoinAndSelect('d.praticien', 'praticien')
      .leftJoinAndSelect('d.paiement', 'paiement');
  }

  private async loaded(id: number) {
    return this.withRelations().where('d.id = :id', { id }).getOne();
  }

  async index(query: Record<string, any>) {
    const { page, perPage } = parsePagination(query, 15);
    const qb = this.withRelations();
    if (query.statut !== undefined) qb.andWhere('d.statut = :st', { st: query.statut });
    if (query.priorite !== undefined) qb.andWhere('d.priorite = :pr', { pr: query.priorite });
    qb.orderBy('d.created_at', 'DESC').addOrderBy('d.id', 'DESC');
    const { data, pagination } = await paginateQb(qb, page, perPage);
    return success(data, undefined, { pagination });
  }

  async store(dto: CreateDisputeDto) {
    const client = await this.clients.findOneBy({ id: dto.client_id });
    if (!client) this.validationError({ client_id: ["Ce client n'existe pas."] });
    const praticien = await this.praticiens.findOneBy({ id: dto.praticien_id });
    if (!praticien) this.validationError({ praticien_id: ["Ce praticien n'existe pas."] });
    if (dto.paiement_id !== undefined) {
      const paiement = await this.paiements.findOneBy({ id: dto.paiement_id });
      if (!paiement) this.validationError({ paiement_id: ["Ce paiement n'existe pas."] });
    }

    const saved = await this.disputes.save({
      client_id: dto.client_id,
      praticien_id: dto.praticien_id,
      paiement_id: dto.paiement_id ?? null,
      montant: dto.montant ?? null,
      motif: dto.motif,
      priorite: dto.priorite ?? 'normale',
      statut: 'ouvert',
    });
    return success(await this.loaded(saved.id), 'Litige ouvert avec succès');
  }

  async show(id: number) {
    const d = await this.loaded(id);
    if (!d) this.notFound('Litige non trouvé');
    return success(d);
  }

  async resolve(id: number, dto: ResolveDisputeDto) {
    const d = await this.disputes.findOneBy({ id, statut: 'ouvert' });
    if (!d) this.notFound('Litige non trouvé ou déjà résolu');
    await this.disputes.update(id, { statut: 'resolu', resolution_notes: dto.resolution_notes });
    return success(await this.loaded(id), 'Litige résolu avec succès');
  }
}
