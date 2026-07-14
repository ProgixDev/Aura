import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { Request } from 'express';
import { Article } from '../database/entities/article.entity';
import { success } from '../common/envelope';
import { parsePagination, paginateQb, paginationUrls } from '../common/pagination';
import { slugify } from '../common/slug';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';

@Injectable()
export class ArticlesService {
  constructor(@InjectRepository(Article) private readonly articles: Repository<Article>) {}

  private async findOr404(id: number): Promise<Article> {
    const article = await this.articles.findOneBy({ id });
    if (!article) throw new NotFoundException({ status: 'error', message: 'Article non trouvé' });
    return article;
  }

  // PHP: Str::slug + '-' . uniqid() on collision
  private async uniqueSlug(titre: string, ignoreId?: number): Promise<string> {
    const slug = slugify(titre);
    const clash = await this.articles.findOneBy(
      ignoreId ? { slug, id: Not(ignoreId) } : { slug },
    );
    return clash ? `${slug}-${Date.now().toString(36)}` : slug;
  }

  async index(query: Record<string, any>, req: Request) {
    const { page, perPage } = parsePagination(query, 10);
    const qb = this.articles.createQueryBuilder('a');
    if (query.status !== undefined) qb.andWhere('a.status = :status', { status: query.status });
    if (query.categorie !== undefined) qb.andWhere('a.categorie = :cat', { cat: query.categorie });
    if (query.slug !== undefined) qb.andWhere('a.slug = :slug', { slug: query.slug });
    qb.orderBy('a.created_at', 'DESC');
    const { data, pagination, lastPage } = await paginateQb(qb, page, perPage);
    return success(data, undefined, {
      pagination: { ...pagination, ...paginationUrls(req, page, lastPage) },
    });
  }

  async store(dto: CreateArticleDto) {
    const article = await this.articles.save({
      ...dto,
      date_publication: dto.date_publication ? new Date(dto.date_publication) : null,
      slug: await this.uniqueSlug(dto.titre),
    });
    return success(article, 'Article créé avec succès');
  }

  async show(id: number) {
    return success(await this.findOr404(id));
  }

  async update(id: number, dto: UpdateArticleDto) {
    const article = await this.findOr404(id);
    const patch: Record<string, unknown> = { ...dto };
    if (dto.date_publication !== undefined) {
      patch.date_publication = dto.date_publication ? new Date(dto.date_publication) : null;
    }
    if (dto.titre !== undefined && dto.titre !== article.titre) {
      patch.slug = await this.uniqueSlug(dto.titre, id);
    }
    await this.articles.update(id, patch);
    return success(await this.findOr404(id), 'Article mis à jour avec succès');
  }

  async publish(id: number) {
    await this.findOr404(id);
    await this.articles.update(id, { status: 'publié', date_publication: new Date() });
    return success(await this.findOr404(id), 'Article publié avec succès');
  }

  async archive(id: number) {
    await this.findOr404(id);
    await this.articles.update(id, { status: 'archivé' });
    return success(await this.findOr404(id), 'Article archivé avec succès');
  }

  async destroy(id: number) {
    await this.findOr404(id);
    await this.articles.delete(id);
    return success(undefined, 'Article supprimé avec succès');
  }
}
