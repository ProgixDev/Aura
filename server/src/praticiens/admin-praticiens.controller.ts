import { Controller, Get, NotFoundException, Param, ParseIntPipe, Query, Req, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { Request } from 'express';
import { Praticien } from '../database/entities/praticien.entity';
import { success } from '../common/envelope';
import { parsePagination, paginateQb, paginationUrls } from '../common/pagination';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { PraticiensService } from './praticiens.service';

// Admin-facing mirror of PraticiensController's index()/show() — same shape, but
// deliberately WITHOUT the public `statut_verification = 'valide'` filter, since an
// admin reviewing the community (or a pending/rejected application) needs to see
// every praticien regardless of verification status.
@Controller('admin/praticiens')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminPraticiensController {
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

  @Get(':id')
  async show(@Param('id', ParseIntPipe) id: number) {
    const praticien = await this.praticiens.findOne({ where: { id } });
    if (!praticien) throw new NotFoundException('Praticien introuvable');
    const [withRating] = await this.praticiensService.attachRatings([praticien]);
    return success(withRating);
  }
}
