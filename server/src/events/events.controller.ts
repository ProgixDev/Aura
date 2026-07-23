import {
  Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Post, Put, Query, Req, UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { CreateInscriptionDto } from './dto/create-inscription.dto';
import { CreatePraticienEventDto } from './dto/create-praticien-event.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { ClientGuard } from '../auth/guards/client.guard';
import { PraticienGuard } from '../auth/guards/praticien.guard';
import { CurrentClient, CurrentPraticien } from '../auth/decorators';
import { Client } from '../database/entities/client.entity';
import { Praticien } from '../database/entities/praticien.entity';

@Controller('events')
export class EventsController {
  constructor(private readonly service: EventsService) {}

  @Get()
  index(@Query() query: Record<string, any>, @Req() req: Request) {
    return this.service.index(query, req);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post('create-event')
  store(@Body() dto: CreateEventDto) { return this.service.store(dto); }

  // ---- praticien-created events ----

  @UseGuards(JwtAuthGuard, PraticienGuard)
  @Post('praticien/mine')
  storePraticien(@CurrentPraticien() praticien: Praticien, @Body() dto: CreatePraticienEventDto) {
    return this.service.storePraticien(praticien, dto);
  }

  // ---- client pre-registration ----

  @UseGuards(JwtAuthGuard, ClientGuard)
  @Post(':id/inscription')
  @HttpCode(201)
  register(
    @CurrentClient() client: Client,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateInscriptionDto,
  ) {
    return this.service.register(client, id, dto);
  }

  @UseGuards(JwtAuthGuard, ClientGuard)
  @Get(':id/inscription/me')
  myInscription(@CurrentClient() client: Client, @Param('id', ParseIntPipe) id: number) {
    return this.service.myInscription(client, id);
  }

  @Get(':id')
  show(@Param('id', ParseIntPipe) id: number) { return this.service.show(id); }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateEventDto) {
    return this.service.update(id, dto);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Delete(':id')
  destroy(@Param('id', ParseIntPipe) id: number) { return this.service.destroy(id); }
}
