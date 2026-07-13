import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { Request } from 'express';
import { Promotion } from '../database/entities/promotion.entity';
import { success } from '../common/envelope';
import { parsePagination, paginateQb, paginationUrls } from '../common/pagination';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';

@Injectable()
export class PromotionsService {
  constructor(@InjectRepository(Promotion) private readonly promotions: Repository<Promotion>) {}

  private validationError(errors: Record<string, string[]>): never {
    throw new UnprocessableEntityException({
      status: 'error', message: 'Erreur de validation', errors,
    });
  }

  private async findOr404(id: number): Promise<Promotion> {
    const promo = await this.promotions.findOneBy({ id });
    if (!promo) throw new NotFoundException({ status: 'error', message: 'Promotion non trouvée' });
    return promo;
  }

  private assertFuture(dateExpiration: string) {
    // Laravel 'after:today'
    const today = new Date(); today.setHours(0, 0, 0, 0);
    if (new Date(dateExpiration) <= today) {
      this.validationError({ date_expiration: ["La date d'expiration doit être postérieure à aujourd'hui."] });
    }
  }

  private async assertUniqueCode(code: string, ignoreId?: number) {
    const clash = await this.promotions.findOneBy(
      ignoreId ? { code, id: Not(ignoreId) } : { code },
    );
    if (clash) this.validationError({ code: ['Ce code est déjà utilisé.'] });
  }

  async index(query: Record<string, any>, req: Request) {
    const { page, perPage } = parsePagination(query, 10);
    const { data, pagination, lastPage } = await paginateQb(
      this.promotions.createQueryBuilder('p'), page, perPage,
    );
    return success(data, undefined, {
      pagination: { ...pagination, ...paginationUrls(req, page, lastPage) },
    });
  }

  async store(dto: CreatePromotionDto) {
    await this.assertUniqueCode(dto.code);
    this.assertFuture(dto.date_expiration);
    const promo = await this.promotions.save({ ...dto });
    return success(promo, 'Promotion créée avec succès');
  }

  async show(id: number) {
    return success(await this.findOr404(id));
  }

  async update(id: number, dto: UpdatePromotionDto) {
    await this.findOr404(id);
    if (dto.code !== undefined) await this.assertUniqueCode(dto.code, id);
    if (dto.date_expiration !== undefined) this.assertFuture(dto.date_expiration);
    await this.promotions.update(id, { ...dto });
    return success(await this.findOr404(id), 'Promotion mise à jour avec succès');
  }

  async destroy(id: number) {
    await this.findOr404(id);
    await this.promotions.delete(id);
    return success(undefined, 'Promotion supprimée avec succès');
  }
}
