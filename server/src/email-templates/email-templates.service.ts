import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { EmailTemplate } from '../database/entities/email-template.entity';
import { success } from '../common/envelope';
import { parsePagination, paginateQb } from '../common/pagination';
import { CreateEmailTemplateDto } from './dto/create-email-template.dto';
import { UpdateEmailTemplateDto } from './dto/update-email-template.dto';

@Injectable()
export class EmailTemplatesService {
  constructor(
    @InjectRepository(EmailTemplate) private readonly templates: Repository<EmailTemplate>,
  ) {}

  // PHP: preg_match_all('/{{(.*?)}}/'), trimmed, unique
  private extractVariables(corps: string): string[] {
    const found = [...corps.matchAll(/{{(.*?)}}/g)].map((m) => m[1].trim());
    return [...new Set(found)];
  }

  private async findOr404(id: number): Promise<EmailTemplate> {
    const t = await this.templates.findOne({ where: { id }, relations: { createdBy: true } });
    if (!t) throw new NotFoundException({ status: 'error', message: 'Modèle non trouvé' });
    return t;
  }

  private async assertUniqueNom(nom: string, ignoreId?: number) {
    const clash = await this.templates.findOne({
      where: ignoreId ? { nom, id: Not(ignoreId) } : { nom },
      withDeleted: true,
    });
    if (clash) {
      throw new UnprocessableEntityException({
        status: 'error', message: 'Erreur de validation',
        errors: { nom: ['Ce nom est déjà utilisé.'] },
      });
    }
  }

  async index(query: Record<string, any>) {
    const { page, perPage } = parsePagination(query, 15);
    const qb = this.templates.createQueryBuilder('t').leftJoinAndSelect('t.createdBy', 'createdBy');
    if (query.statut !== undefined) qb.andWhere('t.statut = :st', { st: query.statut });
    if (query.search !== undefined) {
      qb.andWhere('(t.nom LIKE :q OR t.objet LIKE :q OR t.corps LIKE :q)', { q: `%${query.search}%` });
    }
    const sortBy = ['nom', 'objet', 'statut', 'created_at', 'updated_at'].includes(query.sort_by)
      ? query.sort_by : 'created_at';
    const sortOrder = String(query.sort_order).toLowerCase() === 'asc' ? 'ASC' : 'DESC';
    qb.orderBy(`t.${sortBy}`, sortOrder);
    const { data, pagination } = await paginateQb(qb, page, perPage);
    return success(data, undefined, { pagination });
  }

  async store(dto: CreateEmailTemplateDto) {
    await this.assertUniqueNom(dto.nom);
    const t = await this.templates.save({
      nom: dto.nom, objet: dto.objet, corps: dto.corps,
      statut: dto.statut ?? 'actif',
      variables: dto.variables ?? this.extractVariables(dto.corps),
      created_by: null, // public route, no auth context — matches PHP's always-null auth()->id() here
    });
    return success(await this.findOr404(t.id), 'Modèle créé avec succès');
  }

  async show(id: number) {
    return success(await this.findOr404(id));
  }

  async update(id: number, dto: UpdateEmailTemplateDto) {
    await this.findOr404(id);
    if (dto.nom !== undefined) await this.assertUniqueNom(dto.nom, id);
    const patch: Record<string, unknown> = { ...dto };
    if (dto.corps !== undefined) patch.variables = this.extractVariables(dto.corps);
    await this.templates.update(id, patch);
    return success(await this.findOr404(id), 'Modèle mis à jour avec succès');
  }

  async destroy(id: number) {
    await this.findOr404(id);
    await this.templates.softDelete(id);
    return success(undefined, 'Modèle supprimé avec succès');
  }
}
