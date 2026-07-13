import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Not, Repository, SelectQueryBuilder } from 'typeorm';
import {
  Remboursement, REMBOURSEMENT_STATUT_LABELS,
} from '../database/entities/remboursement.entity';
import { Paiement } from '../database/entities/paiement.entity';
import { Client } from '../database/entities/client.entity';
import { success } from '../common/envelope';
import { parsePagination, paginateQb } from '../common/pagination';
import { StorageService } from '../common/storage.service';
import { assertUpload } from '../common/upload.util';
import { euro, formatDateFr, formatDateTimeFr, isOnOrAfterToday, numberFormat } from '../common/format';
import { CreateRemboursementDto } from './dto/create-remboursement.dto';
import { ApproveRemboursementDto } from './dto/approve-remboursement.dto';
import { RefuseRemboursementDto } from './dto/refuse-remboursement.dto';

const DOC_EXTS = ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'doc', 'docx'];
const MONTH_EXPR = "SUBSTR(CAST(r.created_at AS CHAR), 1, 7)";

@Injectable()
export class RemboursementsService {
  constructor(
    @InjectRepository(Remboursement) private readonly remboursements: Repository<Remboursement>,
    @InjectRepository(Paiement) private readonly paiements: Repository<Paiement>,
    private readonly storage: StorageService,
  ) {}

  private notFound(message: string): never {
    throw new NotFoundException({ status: 'error', message });
  }

  private validationError(errors: Record<string, string[]>): never {
    throw new UnprocessableEntityException({
      status: 'error', message: 'Erreur de validation', errors,
    });
  }

  private baseQb(): SelectQueryBuilder<Remboursement> {
    return this.remboursements.createQueryBuilder('r')
      .leftJoinAndSelect('r.client', 'client')
      .leftJoinAndSelect('r.paiement', 'paiement')
      .leftJoinAndSelect('r.praticien', 'praticien');
  }

  private async loaded(id: number): Promise<Remboursement | null> {
    return this.baseQb().where('r.id = :id', { id }).getOne();
  }

  private generateReference(): string {
    return `RMB-${Math.floor(10000 + Math.random() * 90000)}`;
  }

  // ---- client ----

  async index(client: Client, query: Record<string, any>) {
    const { page, perPage } = parsePagination(query, 15);
    const qb = this.baseQb().where('r.client_id = :cid', { cid: client.id });
    if (query.statut !== undefined) qb.andWhere('r.statut = :st', { st: query.statut });
    if (query.search !== undefined) {
      qb.andWhere('(r.reference LIKE :q OR r.motif LIKE :q OR paiement.reference LIKE :q)',
        { q: `%${query.search}%` });
    }
    qb.orderBy('r.created_at', 'DESC').addOrderBy('r.id', 'DESC');
    const { data, pagination } = await paginateQb(qb, page, perPage);
    return success(data, undefined, { pagination });
  }

  async store(client: Client, dto: CreateRemboursementDto, files: Express.Multer.File[]) {
    const paiement = await this.paiements.findOneBy({
      id: dto.paiement_id, client_id: client.id, statut: 'paid',
    });
    if (!paiement) {
      this.validationError({
        paiement_id: ["Ce paiement n'existe pas ou n'est pas éligible au remboursement."],
      });
    }
    const existing = await this.remboursements.existsBy({
      paiement_id: dto.paiement_id, client_id: client.id,
      statut: Not(In(['refuse', 'completed'])),
    });
    if (existing) {
      this.validationError({
        paiement_id: ['Une demande de remboursement existe déjà pour ce paiement.'],
      });
    }

    const documents: { nom: string; chemin: string; taille: number; type: string }[] = [];
    for (const file of files ?? []) {
      assertUpload(file, 'documents', DOC_EXTS);
      const chemin = await this.storage.save(file, `remboursements/${client.id}`);
      documents.push({ nom: file.originalname, chemin, taille: file.size, type: file.mimetype });
    }

    const saved = await this.remboursements.save({
      reference: this.generateReference(),
      client_id: client.id,
      paiement_id: dto.paiement_id,
      praticien_id: paiement.praticien_id,
      montant: paiement.montant_brut,
      motif: dto.motif,
      description: dto.description ?? null,
      documents: documents.length ? documents : null,
      statut: 'en_attente',
    });
    return success(
      await this.loaded(saved.id),
      'Votre demande de remboursement a été envoyée avec succès.',
    );
  }

  async show(client: Client, id: number) {
    const r = await this.baseQb()
      .where('r.id = :id AND r.client_id = :cid', { id, cid: client.id }).getOne();
    if (!r) this.notFound('Remboursement non trouvé');
    return success(r);
  }

  async cancel(client: Client, id: number) {
    const r = await this.remboursements.findOneBy({
      id, client_id: client.id, statut: In(['en_attente', 'en_cours']),
    });
    if (!r) this.notFound('Remboursement non trouvé ou ne peut pas être annulé');
    await this.remboursements.update(id, { statut: 'refuse' });
    return success(
      await this.remboursements.findOneBy({ id }),
      'Demande de remboursement annulée avec succès',
    );
  }

  // ---- admin ----

  async adminIndex(query: Record<string, any>) {
    const { page, perPage } = parsePagination(query, 15);
    const qb = this.baseQb();
    if (query.statut !== undefined) qb.andWhere('r.statut = :st', { st: query.statut });
    if (query.client_id !== undefined) qb.andWhere('r.client_id = :cid', { cid: query.client_id });
    if (query.praticien_id !== undefined) qb.andWhere('r.praticien_id = :pid', { pid: query.praticien_id });
    if (query.date_debut !== undefined) qb.andWhere('DATE(r.created_at) >= :dd', { dd: query.date_debut });
    if (query.date_fin !== undefined) qb.andWhere('DATE(r.created_at) <= :df', { df: query.date_fin });
    if (query.search !== undefined) {
      qb.andWhere(
        '(r.reference LIKE :q OR r.motif LIKE :q OR client.firstname LIKE :q OR client.lastname LIKE :q OR client.email LIKE :q OR paiement.reference LIKE :q)',
        { q: `%${query.search}%` },
      );
    }
    const sortBy = ['created_at', 'montant', 'statut', 'reference'].includes(query.sort_by)
      ? query.sort_by : 'created_at';
    const sortOrder = String(query.sort_order).toLowerCase() === 'asc' ? 'ASC' : 'DESC';
    qb.orderBy(`r.${sortBy}`, sortOrder).addOrderBy('r.id', sortOrder);
    const { data, pagination } = await paginateQb(qb, page, perPage);
    return success(data, undefined, {
      pagination,
      statistiques: await this.computeStatistics(query),
    });
  }

  async adminShow(id: number) {
    const r = await this.loaded(id);
    if (!r) this.notFound('Remboursement non trouvé');
    return success(r);
  }

  async adminApprove(id: number, dto: ApproveRemboursementDto) {
    const r = await this.remboursements.findOneBy({
      id, statut: In(['en_attente', 'en_cours']),
    });
    if (!r) this.notFound('Remboursement non trouvé ou ne peut pas être approuvé');
    if (dto.date_remboursement !== undefined && !isOnOrAfterToday(dto.date_remboursement)) {
      this.validationError({
        date_remboursement: ["Cette date doit être aujourd'hui ou postérieure."],
      });
    }
    await this.remboursements.update(id, {
      statut: 'approuve',
      commentaire_admin: dto.commentaire_admin ?? null,
      date_traitement: new Date(),
      date_remboursement: dto.date_remboursement ? new Date(dto.date_remboursement) : new Date(),
    });
    await this.paiements.update(r.paiement_id, { statut: 'rembourse' });
    return success(await this.loaded(id), 'Demande de remboursement approuvée avec succès');
  }

  async adminRefuse(id: number, dto: RefuseRemboursementDto) {
    const r = await this.remboursements.findOneBy({
      id, statut: In(['en_attente', 'en_cours']),
    });
    if (!r) this.notFound('Remboursement non trouvé ou ne peut pas être refusé');
    await this.remboursements.update(id, {
      statut: 'refuse', commentaire_admin: dto.commentaire_admin, date_traitement: new Date(),
    });
    return success(await this.loaded(id), 'Demande de remboursement refusée');
  }

  async adminComplete(id: number) {
    const r = await this.remboursements.findOneBy({ id, statut: 'approuve' });
    if (!r) this.notFound('Remboursement non trouvé ou ne peut pas être complété');
    await this.remboursements.update(id, {
      statut: 'completed', date_remboursement: new Date(),
    });
    return success(await this.loaded(id), 'Remboursement marqué comme complété');
  }

  private async computeStatistics(query: Record<string, any>) {
    const filtered = () => {
      const qb = this.remboursements.createQueryBuilder('r');
      if (query.date_debut !== undefined) qb.andWhere('DATE(r.created_at) >= :dd', { dd: query.date_debut });
      if (query.date_fin !== undefined) qb.andWhere('DATE(r.created_at) <= :df', { df: query.date_fin });
      return qb;
    };
    const sumWhere = async (statuts: string[]) => Number(
      (await filtered().andWhere('r.statut IN (:...s)', { s: statuts })
        .select('COALESCE(SUM(r.montant),0)', 'sum').getRawOne()).sum,
    );
    const countWhere = (statuts: string[]) =>
      filtered().andWhere('r.statut IN (:...s)', { s: statuts }).getCount();

    const totalCompleted = await sumWhere(['completed']);
    const totalRemboursements = await filtered().getCount();
    const totalPaiements = await this.paiements.countBy({ statut: 'paid' });
    const taux = totalPaiements > 0 ? (totalRemboursements / totalPaiements) * 100 : 0;

    const parMotif = (await filtered()
      .select('r.motif', 'motif').addSelect('COUNT(r.id)', 'count')
      .addSelect('COALESCE(SUM(r.montant),0)', 'total')
      .groupBy('r.motif').getRawMany())
      .map((x) => ({ motif: x.motif, count: Number(x.count), total: Number(x.total) }));
    const parMois = (await filtered()
      .select(MONTH_EXPR, 'mois').addSelect('COUNT(r.id)', 'count')
      .addSelect('COALESCE(SUM(r.montant),0)', 'total')
      .groupBy('mois').orderBy('mois', 'DESC').limit(6).getRawMany())
      .map((x) => ({ mois: x.mois, count: Number(x.count), total: Number(x.total) }));

    return {
      total_rembourse: numberFormat(totalCompleted),
      total_rembourse_formatted: euro(totalCompleted),
      en_attente: await countWhere(['en_attente', 'en_cours']),
      approuves: await countWhere(['approuve']),
      refuses: await countWhere(['refuse']),
      completed: totalCompleted,
      taux_remboursement: `${taux.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`,
      taux_evolution: '+0.3',
      par_motif: parMotif,
      par_mois: parMois,
    };
  }

  async adminStatistics(query: Record<string, any>) {
    return success(await this.computeStatistics(query));
  }

  async adminExport(query: Record<string, any>) {
    const qb = this.baseQb();
    if (query.date_debut !== undefined) qb.andWhere('DATE(r.created_at) >= :dd', { dd: query.date_debut });
    if (query.date_fin !== undefined) qb.andWhere('DATE(r.created_at) <= :df', { df: query.date_fin });
    if (query.statut !== undefined) qb.andWhere('r.statut = :st', { st: query.statut });
    const rows = await qb.orderBy('r.created_at', 'DESC').addOrderBy('r.id', 'DESC').getMany();
    const total = rows.reduce((a, r) => a + r.montant, 0);
    return success({
      periode: { debut: query.date_debut ?? 'Toutes', fin: query.date_fin ?? 'Toutes' },
      date_export: formatDateTimeFr(new Date()),
      total_remboursements: rows.length,
      montant_total: euro(total),
      remboursements: rows.map((r) => ({
        reference: r.reference,
        date: formatDateFr(r.created_at),
        transaction: r.paiement?.reference ?? 'N/A',
        client: `${r.client.firstname} ${r.client.lastname}`,
        montant: euro(r.montant),
        motif: r.motif,
        statut: REMBOURSEMENT_STATUT_LABELS[r.statut] ?? r.statut,
      })),
    });
  }
}
