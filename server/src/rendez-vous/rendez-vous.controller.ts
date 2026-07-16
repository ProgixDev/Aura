import {
  Body, Controller, Get, HttpCode, Param, ParseIntPipe, Post, Query, UseGuards,
} from '@nestjs/common';
import { RendezVousService } from './rendez-vous.service';
import { CreateRendezVousDto } from './dto/create-rendez-vous.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ClientGuard } from '../auth/guards/client.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { CurrentClient } from '../auth/decorators';
import { Client } from '../database/entities/client.entity';

@Controller()
export class RendezVousController {
  constructor(private readonly service: RendezVousService) {}

  // ---- client ----

  @UseGuards(JwtAuthGuard, ClientGuard)
  @Post('rendez-vous')
  create(@CurrentClient() client: Client, @Body() dto: CreateRendezVousDto) {
    return this.service.create(client, dto);
  }

  @UseGuards(JwtAuthGuard, ClientGuard)
  @Get('rendez-vous/client')
  index(@CurrentClient() client: Client, @Query() query: Record<string, any>) {
    return this.service.indexForClient(client, query);
  }

  @UseGuards(JwtAuthGuard, ClientGuard)
  @Get('rendez-vous/client/:id')
  show(@CurrentClient() client: Client, @Param('id', ParseIntPipe) id: number) {
    return this.service.showForClient(client, id);
  }

  @UseGuards(JwtAuthGuard, ClientGuard)
  @HttpCode(200)
  @Post('rendez-vous/client/:id/cancel')
  cancel(@CurrentClient() client: Client, @Param('id', ParseIntPipe) id: number) {
    return this.service.cancelForClient(client, id);
  }

  // ---- admin ----

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('admin/rendez-vous')
  adminIndex(@Query() query: Record<string, any>) {
    return this.service.adminIndex(query);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('admin/rendez-vous/:id')
  adminShow(@Param('id', ParseIntPipe) id: number) {
    return this.service.adminShow(id);
  }
}
