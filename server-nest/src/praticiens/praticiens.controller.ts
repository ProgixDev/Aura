import { Controller, Get, Query, Req } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { Request } from 'express';
import { Praticien } from '../database/entities/praticien.entity';
import { success } from '../common/envelope';
import { parsePagination, paginateQb, paginationUrls } from '../common/pagination';

@Controller('praticiens')
export class PraticiensController {
  constructor(@InjectRepository(Praticien) private readonly praticiens: Repository<Praticien>) {}

  @Get()
  async index(@Query() query: Record<string, any>, @Req() req: Request) {
    const { page, perPage } = parsePagination(query, 10);
    const { data, pagination, lastPage } = await paginateQb(
      this.praticiens.createQueryBuilder('p'), page, perPage,
    );
    return success(data, undefined, {
      pagination: { ...pagination, ...paginationUrls(req, page, lastPage) },
    });
  }
}
