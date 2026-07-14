import {
  Body, Controller, Get, HttpCode, Param, ParseIntPipe, Post, Query, UseGuards,
} from '@nestjs/common';
import { RendezVousService } from './rendez-vous.service';
import { CreateRendezVousDto } from './dto/create-rendez-vous.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ClientGuard } from '../auth/guards/client.guard';
import { CurrentClient } from '../auth/decorators';
import { Client } from '../database/entities/client.entity';

@Controller('rendez-vous')
export class RendezVousController {
  constructor(private readonly service: RendezVousService) {}

  @UseGuards(JwtAuthGuard, ClientGuard)
  @Post()
  create(@CurrentClient() client: Client, @Body() dto: CreateRendezVousDto) {
    return this.service.create(client, dto);
  }

  @UseGuards(JwtAuthGuard, ClientGuard)
  @Get('client')
  index(@CurrentClient() client: Client, @Query() query: Record<string, any>) {
    return this.service.indexForClient(client, query);
  }

  @UseGuards(JwtAuthGuard, ClientGuard)
  @Get('client/:id')
  show(@CurrentClient() client: Client, @Param('id', ParseIntPipe) id: number) {
    return this.service.showForClient(client, id);
  }

  @UseGuards(JwtAuthGuard, ClientGuard)
  @HttpCode(200)
  @Post('client/:id/cancel')
  cancel(@CurrentClient() client: Client, @Param('id', ParseIntPipe) id: number) {
    return this.service.cancelForClient(client, id);
  }
}
