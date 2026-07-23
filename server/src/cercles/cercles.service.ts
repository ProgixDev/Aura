import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { Request } from 'express';
import { Cercle } from '../database/entities/cercle.entity';
import { CercleInscription } from '../database/entities/cercle-inscription.entity';
import { Praticien } from '../database/entities/praticien.entity';
import { Client } from '../database/entities/client.entity';
import { success } from '../common/envelope';
import { parsePagination, paginateQb, paginationUrls } from '../common/pagination';
import { CreateCercleDto } from './dto/create-cercle.dto';
import { UpdateCercleDto } from './dto/update-cercle.dto';
import { CreatePraticienCercleDto } from './dto/create-praticien-cercle.dto';

@Injectable()
export class CerclesService {
  constructor(
    @InjectRepository(Cercle) private readonly cercles: Repository<Cercle>,
    @InjectRepository(CercleInscription) private readonly inscriptions: Repository<CercleInscription>,
  ) {}

  private async assertUniqueNom(nom: string, ignoreId?: number) {
    const clash = await this.cercles.findOneBy(
      ignoreId ? { nom, id: Not(ignoreId) } : { nom },
    );
    if (clash) {
      throw new UnprocessableEntityException({
        status: 'error',
        message: 'Erreur de validation',
        errors: { nom: ['Ce nom est déjà utilisé.'] },
      });
    }
  }

  private async findOr404(id: number): Promise<Cercle> {
    const cercle = await this.cercles.findOneBy({ id });
    if (!cercle)
      throw new NotFoundException({
        status: 'error',
        message: 'Cercle non trouvé',
      });
    return cercle;
  }

  async index(query: Record<string, any>, req: Request) {
    const { page, perPage } = parsePagination(query, 10);
    const { data, pagination, lastPage } = await paginateQb(
      this.cercles.createQueryBuilder('c').leftJoinAndSelect('c.praticien', 'praticien'),
      page,
      perPage,
    );
    return success(data, undefined, {
      pagination: { ...pagination, ...paginationUrls(req, page, lastPage) },
    });
  }

  async store(dto: CreateCercleDto) {
    await this.assertUniqueNom(dto.nom);
    const cercle = await this.cercles.save({ ...dto });
    return success(cercle, 'Cercle créé avec succès');
  }

  async show(id: number) {
    const cercle = await this.cercles.findOne({ where: { id }, relations: { praticien: true } });
    if (!cercle) throw new NotFoundException({ status: 'error', message: 'Cercle non trouvé' });
    return success(cercle);
  }

  async update(id: number, dto: UpdateCercleDto) {
    await this.findOr404(id);
    if (dto.nom !== undefined) await this.assertUniqueNom(dto.nom, id);
    await this.cercles.update(id, { ...dto });
    return success(await this.findOr404(id), 'Cercle mis à jour avec succès');
  }

  async destroy(id: number) {
    await this.findOr404(id);
    await this.cercles.delete(id);
    return success(undefined, 'Cercle supprimé avec succès');
  }

  // ---- praticien-created cercles ----

  async indexPraticien(praticien: Praticien) {
    const rows = await this.cercles.find({
      where: { praticien_id: praticien.id },
      order: { created_at: 'DESC' },
    });
    return success(rows);
  }

  async storePraticien(praticien: Praticien, dto: CreatePraticienCercleDto) {
    await this.assertUniqueNom(dto.nom);
    const cercle = await this.cercles.save({ ...dto, praticien_id: praticien.id });
    return success(cercle, 'Cercle créé avec succès');
  }

  // ---- client subscription ----

  private validationError(errors: Record<string, string[]>): never {
    throw new UnprocessableEntityException({ status: 'error', message: 'Erreur de validation', errors });
  }

  async register(client: Client, cercleId: number) {
    await this.findOr404(cercleId);
    const existing = await this.inscriptions.findOneBy({ cercle_id: cercleId, client_id: client.id });
    if (existing) {
      this.validationError({ cercle: ['Vous êtes déjà inscrit·e à ce cercle.'] });
    }
    const saved = await this.inscriptions.save({ cercle_id: cercleId, client_id: client.id, statut: 'inscrit' });
    return success(saved, 'Votre inscription a bien été enregistrée.');
  }

  async myInscription(client: Client, cercleId: number) {
    const row = await this.inscriptions.findOneBy({ cercle_id: cercleId, client_id: client.id });
    return success(row ?? null);
  }
}
