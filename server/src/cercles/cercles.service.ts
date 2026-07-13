import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { Request } from 'express';
import { Cercle } from '../database/entities/cercle.entity';
import { success } from '../common/envelope';
import { parsePagination, paginateQb, paginationUrls } from '../common/pagination';
import { CreateCercleDto } from './dto/create-cercle.dto';
import { UpdateCercleDto } from './dto/update-cercle.dto';

@Injectable()
export class CerclesService {
  constructor(
    @InjectRepository(Cercle) private readonly cercles: Repository<Cercle>,
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
      this.cercles.createQueryBuilder('c'),
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
    return success(await this.findOr404(id));
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
}
