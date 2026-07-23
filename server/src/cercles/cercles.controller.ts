import {
  Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Post, Put, Query, Req, UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { CerclesService } from './cercles.service';
import { CreateCercleDto } from './dto/create-cercle.dto';
import { UpdateCercleDto } from './dto/update-cercle.dto';
import { CreatePraticienCercleDto } from './dto/create-praticien-cercle.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { PraticienGuard } from '../auth/guards/praticien.guard';
import { ClientGuard } from '../auth/guards/client.guard';
import { CurrentClient, CurrentPraticien } from '../auth/decorators';
import { Client } from '../database/entities/client.entity';
import { Praticien } from '../database/entities/praticien.entity';

@Controller('cercles')
export class CerclesController {
  constructor(private readonly service: CerclesService) {}

  @Get()
  index(@Query() query: Record<string, any>, @Req() req: Request) {
    return this.service.index(query, req);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post()
  store(@Body() dto: CreateCercleDto) {
    return this.service.store(dto);
  }

  // ---- praticien-created cercles ----

  @UseGuards(JwtAuthGuard, PraticienGuard)
  @Get('praticien/mine')
  indexPraticien(@CurrentPraticien() praticien: Praticien) {
    return this.service.indexPraticien(praticien);
  }

  @UseGuards(JwtAuthGuard, PraticienGuard)
  @Post('praticien/mine')
  storePraticien(@CurrentPraticien() praticien: Praticien, @Body() dto: CreatePraticienCercleDto) {
    return this.service.storePraticien(praticien, dto);
  }

  // ---- client subscription ----

  @UseGuards(JwtAuthGuard, ClientGuard)
  @HttpCode(201)
  @Post(':id/inscription')
  register(@CurrentClient() client: Client, @Param('id', ParseIntPipe) id: number) {
    return this.service.register(client, id);
  }

  @UseGuards(JwtAuthGuard, ClientGuard)
  @Get(':id/inscription/me')
  myInscription(@CurrentClient() client: Client, @Param('id', ParseIntPipe) id: number) {
    return this.service.myInscription(client, id);
  }

  @Get(':id')
  show(@Param('id', ParseIntPipe) id: number) {
    return this.service.show(id);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCercleDto) {
    return this.service.update(id, dto);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Delete(':id')
  destroy(@Param('id', ParseIntPipe) id: number) {
    return this.service.destroy(id);
  }
}
