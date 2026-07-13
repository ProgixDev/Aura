import { Controller, Get, Query, Req } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { Request } from 'express';
import { Client } from '../database/entities/client.entity';
import { success } from '../common/envelope';
import { parsePagination, paginateQb, paginationUrls } from '../common/pagination';

@Controller('clients')
export class ClientsController {
  constructor(@InjectRepository(Client) private readonly clients: Repository<Client>) {}

  @Get()
  async index(@Query() query: Record<string, any>, @Req() req: Request) {
    const { page, perPage } = parsePagination(query, 10);
    const { data, pagination, lastPage } = await paginateQb(
      this.clients.createQueryBuilder('c'), page, perPage,
    );
    return success(data, undefined, {
      pagination: { ...pagination, ...paginationUrls(req, page, lastPage) },
    });
  }
}
