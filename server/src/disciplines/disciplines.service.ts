import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { Discipline } from '../database/entities/discipline.entity';
import { success } from '../common/envelope';
import { slugify } from '../common/slug';
import { CreateDisciplineDto } from './dto/create-discipline.dto';
import { UpdateDisciplineDto } from './dto/update-discipline.dto';

@Injectable()
export class DisciplinesService {
  constructor(@InjectRepository(Discipline) private readonly disciplines: Repository<Discipline>) {}

  private async findOr404(id: number): Promise<Discipline> {
    const d = await this.disciplines.findOneBy({ id });
    if (!d) throw new NotFoundException({ status: 'error', message: 'Discipline non trouvée' });
    return d;
  }

  private async assertUniqueNom(nom: string, ignoreId?: number) {
    const clash = await this.disciplines.findOneBy(
      ignoreId ? { nom, id: Not(ignoreId) } : { nom },
    );
    if (clash) {
      throw new UnprocessableEntityException({
        status: 'error', message: 'Erreur de validation',
        errors: { nom: ['Ce nom est déjà utilisé.'] },
      });
    }
  }

  async index() {
    return success(await this.disciplines.find(), 'Disciplines récupérées avec succès');
  }

  async store(dto: CreateDisciplineDto) {
    await this.assertUniqueNom(dto.nom);
    const d = await this.disciplines.save({ ...dto, slug: slugify(dto.nom) });
    return success(d, 'Discipline créée avec succès');
  }

  async show(id: number) {
    return success(await this.findOr404(id), 'Discipline récupérée avec succès');
  }

  async update(id: number, dto: UpdateDisciplineDto) {
    await this.findOr404(id);
    if (dto.nom !== undefined) await this.assertUniqueNom(dto.nom, id);
    const patch: Record<string, unknown> = { ...dto };
    if (dto.nom !== undefined) patch.slug = slugify(dto.nom);
    await this.disciplines.update(id, patch);
    return success(await this.findOr404(id), 'Discipline mise à jour avec succès');
  }

  async destroy(id: number) {
    await this.findOr404(id);
    await this.disciplines.delete(id);
    return success(undefined, 'Discipline supprimée avec succès');
  }
}
