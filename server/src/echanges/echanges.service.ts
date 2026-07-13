import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Echange, PieceJointe } from '../database/entities/echange.entity';
import { Client } from '../database/entities/client.entity';
import { User } from '../database/entities/user.entity';
import { success } from '../common/envelope';
import { parsePagination, paginateQb } from '../common/pagination';
import { StorageService } from '../common/storage.service';
import { assertUpload } from '../common/upload.util';
import { isStrictlyAfterToday } from '../common/format';
import { CreateEchangeDto } from './dto/create-echange.dto';
import { UpdateEchangeDto } from './dto/update-echange.dto';
import { AdminUpdateEchangeDto } from './dto/admin-update-echange.dto';
import { ReportEchangeDto } from './dto/report-echange.dto';

const PIECE_JOINTE_EXTS = ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'doc', 'docx'];

@Injectable()
export class EchangesService {
  constructor(
    @InjectRepository(Echange) private readonly echanges: Repository<Echange>,
    private readonly storage: StorageService,
  ) {}

  private notFound(message: string): never {
    throw new NotFoundException({ status: 'error', message });
  }

  private assertDelaiValid(delaiSouhaite: string | undefined) {
    if (delaiSouhaite !== undefined && !isStrictlyAfterToday(delaiSouhaite)) {
      throw new UnprocessableEntityException({
        status: 'error', message: 'Erreur de validation',
        errors: { delai_souhaite: ["Cette date doit être postérieure à aujourd'hui."] },
      });
    }
  }

  private withRelations() {
    return this.echanges.createQueryBuilder('e')
      .leftJoinAndSelect('e.client', 'client')
      .leftJoinAndSelect('e.traitePar', 'traitePar')
      .leftJoinAndSelect('e.signalePar', 'signalePar');
  }

  // ---- client-facing ----

  async index(client: Client, query: Record<string, any>) {
    const { page, perPage } = parsePagination(query, 10);
    const qb = this.echanges.createQueryBuilder('e')
      .leftJoinAndSelect('e.client', 'client')
      .where('e.client_id = :cid', { cid: client.id });
    if (query.statut !== undefined) qb.andWhere('e.statut = :st', { st: query.statut });
    if (query.type !== undefined) qb.andWhere('e.type = :ty', { ty: query.type });
    if (query.search !== undefined) {
      qb.andWhere('(e.sujet LIKE :q OR e.message LIKE :q)', { q: `%${query.search}%` });
    }
    qb.orderBy('e.created_at', 'DESC');
    const { data, pagination } = await paginateQb(qb, page, perPage);
    return success(data, undefined, { pagination });
  }

  async store(client: Client, dto: CreateEchangeDto, files: Express.Multer.File[]) {
    this.assertDelaiValid(dto.delai_souhaite);
    const pieces: PieceJointe[] = [];
    for (const file of files ?? []) {
      assertUpload(file, 'pieces_jointes', PIECE_JOINTE_EXTS);
      const chemin = await this.storage.save(file, `echanges/${client.id}`);
      pieces.push({ nom: file.originalname, chemin, taille: file.size, type: file.mimetype });
    }
    const saved = await this.echanges.save({
      client_id: client.id,
      sujet: dto.sujet, type: dto.type, message: dto.message,
      ce_que_je_propose: dto.ce_que_je_propose ?? null,
      ce_que_je_recherche: dto.ce_que_je_recherche ?? null,
      format: dto.format ?? null,
      delai_souhaite: dto.delai_souhaite ?? null,
      pieces_jointes: pieces.length ? pieces : null,
      statut: 'en_attente', priorite: 'moyenne',
    });
    const fresh = await this.echanges.findOne({ where: { id: saved.id }, relations: { client: true } });
    return success(fresh, 'Votre message a été envoyé avec succès');
  }

  async show(client: Client, id: number) {
    const echange = await this.echanges.findOne({
      where: { id, client_id: client.id }, relations: { client: true },
    });
    if (!echange) this.notFound('Échange non trouvé');
    return success(echange);
  }

  async update(client: Client, id: number, dto: UpdateEchangeDto) {
    this.assertDelaiValid(dto.delai_souhaite);
    const echange = await this.echanges.findOneBy({
      id, client_id: client.id, statut: In(['en_attente', 'lu']),
    });
    if (!echange) this.notFound('Échange non trouvé ou ne peut pas être modifié');
    await this.echanges.update(id, { ...dto });
    const fresh = await this.echanges.findOne({ where: { id }, relations: { client: true } });
    return success(fresh, 'Échange mis à jour avec succès');
  }

  async destroy(client: Client, id: number) {
    const echange = await this.echanges.findOneBy({
      id, client_id: client.id, statut: In(['en_attente', 'lu']),
    });
    if (!echange) this.notFound('Échange non trouvé ou ne peut pas être supprimé');
    await this.echanges.softDelete(id);
    return success(undefined, 'Échange supprimé avec succès');
  }

  // ---- admin-facing ----

  async adminIndex(query: Record<string, any>) {
    const { page, perPage } = parsePagination(query, 15);
    const qb = this.withRelations();
    if (query.statut !== undefined) qb.andWhere('e.statut = :st', { st: query.statut });
    if (query.priorite !== undefined) qb.andWhere('e.priorite = :pr', { pr: query.priorite });
    if (query.type !== undefined) qb.andWhere('e.type = :ty', { ty: query.type });
    if (query.client_id !== undefined) qb.andWhere('e.client_id = :cid', { cid: query.client_id });
    if (query.search !== undefined) {
      qb.andWhere(
        '(e.sujet LIKE :q OR e.message LIKE :q OR client.firstname LIKE :q OR client.lastname LIKE :q OR client.email LIKE :q)',
        { q: `%${query.search}%` },
      );
    }
    const sortBy = ['created_at', 'updated_at', 'statut', 'priorite', 'type'].includes(query.sort_by)
      ? query.sort_by : 'created_at';
    const sortOrder = String(query.sort_order).toLowerCase() === 'asc' ? 'ASC' : 'DESC';
    qb.orderBy(`e.${sortBy}`, sortOrder);
    const { data, pagination } = await paginateQb(qb, page, perPage);
    return success(data, undefined, { pagination });
  }

  async adminShow(id: number) {
    const echange = await this.withRelations().where('e.id = :id', { id }).getOne();
    if (!echange) this.notFound('Échange non trouvé');
    if (echange.statut === 'en_attente') {
      await this.echanges.update(id, { statut: 'lu', lu_a: new Date() });
      echange.statut = 'lu';
      echange.lu_a = new Date();
    }
    return success(echange);
  }

  async adminUpdate(id: number, dto: AdminUpdateEchangeDto, user: User | null) {
    const echange = await this.echanges.findOneBy({ id });
    if (!echange) this.notFound('Échange non trouvé');
    const patch: Record<string, unknown> = { ...dto };
    if (dto.statut === 'traite') {
      patch.traite_a = new Date();
      if (user) patch.traite_par = user.id;
    }
    if (dto.reponse_admin) patch.repondu_a = new Date();
    await this.echanges.update(id, patch);
    const fresh = await this.withRelations().where('e.id = :id', { id }).getOne();
    return success(fresh, 'Échange mis à jour avec succès');
  }

  async adminHide(id: number) {
    const echange = await this.echanges.findOneBy({ id });
    if (!echange) this.notFound('Échange non trouvé');
    const masque = !echange.est_masque;
    await this.echanges.update(id, { est_masque: masque });
    const fresh = await this.echanges.findOneBy({ id });
    return success(fresh, masque ? 'Échange masqué' : 'Échange démasqué');
  }

  async adminReport(id: number, dto: ReportEchangeDto, user: User | null) {
    const echange = await this.echanges.findOneBy({ id });
    if (!echange) this.notFound('Échange non trouvé');
    await this.echanges.update(id, {
      statut: 'signale',
      signale_par: user?.id ?? null,
      motif_signalement: dto.motif_signalement,
      signale_a: new Date(),
    });
    return success(await this.echanges.findOneBy({ id }), 'Échange signalé avec succès');
  }

  async adminDestroy(id: number) {
    const echange = await this.echanges.findOneBy({ id });
    if (!echange) this.notFound('Échange non trouvé');
    await this.echanges.softDelete(id);
    return success(undefined, 'Échange supprimé avec succès');
  }

  async adminStatistics() {
    const count = (statut?: string) =>
      statut ? this.echanges.countBy({ statut }) : this.echanges.count();
    const grouped = (col: 'type' | 'priorite') =>
      this.echanges.createQueryBuilder('e')
        .select(`e.${col}`, col).addSelect('COUNT(*)', 'count')
        .groupBy(`e.${col}`).getRawMany()
        .then((rows) => rows.map((r) => ({ ...r, count: Number(r.count) })));
    const derniers = await this.echanges.find({
      relations: { client: true }, order: { created_at: 'DESC' }, take: 10,
    });
    return success({
      total: await count(),
      en_attente: await count('en_attente'),
      en_cours: await count('en_cours'),
      traites: await count('traite'),
      signales: await count('signale'),
      archives: await count('archive'),
      par_type: await grouped('type'),
      par_priorite: await grouped('priorite'),
      derniers_echanges: derniers,
    });
  }
}
