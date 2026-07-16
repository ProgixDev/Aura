import { Controller, Get, NotFoundException, Param, ParseIntPipe, Query, Req } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { Request } from 'express';
import { Praticien } from '../database/entities/praticien.entity';
import { success } from '../common/envelope';
import { parsePagination, paginateQb, paginationUrls } from '../common/pagination';
import { PraticiensService } from './praticiens.service';

@Controller('praticiens')
export class PraticiensController {
  constructor(
    @InjectRepository(Praticien) private readonly praticiens: Repository<Praticien>,
    private readonly praticiensService: PraticiensService,
  ) {}

  @Get()
  async index(@Query() query: Record<string, any>, @Req() req: Request) {
    const { page, perPage } = parsePagination(query, 10);
    const { data, pagination, lastPage } = await paginateQb(
      this.praticiens.createQueryBuilder('p'), page, perPage,
    );
    const withRatings = await this.praticiensService.attachRatings(data);
    return success(withRatings, undefined, {
      pagination: { ...pagination, ...paginationUrls(req, page, lastPage) },
    });
  }

  // Registered before ':id' so the more specific path is never shadowed — though with
  // Nest's Express router this also works in the other order, since ':id' alone (one path
  // segment) can never match a two-segment '/:id/availability' request.
  @Get(':id/availability')
  async availability(@Param('id', ParseIntPipe) id: number) {
    return this.praticiensService.availability(id);
  }

  @Get(':id')
  async show(@Param('id', ParseIntPipe) id: number) {
    const praticien = await this.praticiens.findOne({ where: { id } });
    if (!praticien) throw new NotFoundException('Praticien introuvable');
    const [withRating] = await this.praticiensService.attachRatings([praticien]);
    return success(withRating);
  }
}
