import {
  Controller, Delete, Get, Param, ParseIntPipe, Query, UseGuards,
} from '@nestjs/common';
import { PaiementsService } from './paiements.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ClientGuard } from '../auth/guards/client.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { CurrentClient } from '../auth/decorators';
import { Client } from '../database/entities/client.entity';

@Controller('paiements')
export class PaiementsController {
  constructor(private readonly service: PaiementsService) {}

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('statistics')
  adminStatistics(@Query() query: Record<string, any>) {
    return this.service.adminStatistics(query);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('export/csv')
  adminExportCsv(@Query() query: Record<string, any>) {
    return this.service.adminExportCsv(query);
  }

  @UseGuards(JwtAuthGuard, ClientGuard)
  @Get('export/comptable')
  exportComptable(@CurrentClient() client: Client, @Query() query: Record<string, any>) {
    return this.service.exportComptable(client, query);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('export')
  adminExport(@Query() query: Record<string, any>) {
    return this.service.adminExport(query);
  }

  @UseGuards(JwtAuthGuard, ClientGuard)
  @Get('clients')
  index(@CurrentClient() client: Client, @Query() query: Record<string, any>) {
    return this.service.index(client, query);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get()
  adminIndex(@Query() query: Record<string, any>) {
    return this.service.adminIndex(query);
  }

  @UseGuards(JwtAuthGuard, ClientGuard)
  @Get(':id')
  show(@CurrentClient() client: Client, @Param('id', ParseIntPipe) id: number) {
    return this.service.show(client, id);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Delete(':id')
  destroy(@Param('id', ParseIntPipe) id: number) {
    return this.service.destroy(id);
  }
}
