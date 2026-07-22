import {
  Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Patch, Post, Put,
  Query, UploadedFiles, UseGuards, UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { EchangesService } from './echanges.service';
import { CreateEchangeDto } from './dto/create-echange.dto';
import { UpdateEchangeDto } from './dto/update-echange.dto';
import { AdminUpdateEchangeDto } from './dto/admin-update-echange.dto';
import { ReportEchangeDto } from './dto/report-echange.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ClientGuard } from '../auth/guards/client.guard';
import { PraticienGuard } from '../auth/guards/praticien.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { CurrentClient, CurrentPraticien, CurrentUser } from '../auth/decorators';
import { Client } from '../database/entities/client.entity';
import { Praticien } from '../database/entities/praticien.entity';
import { User } from '../database/entities/user.entity';

@Controller('echanges')
export class EchangesController {
  constructor(private readonly service: EchangesService) {}

  // ---- client (path parity with the real Laravel app: /api/echanges/client/echanges) ----

  @UseGuards(JwtAuthGuard, ClientGuard)
  @Get('client/echanges')
  index(@CurrentClient() client: Client, @Query() query: Record<string, any>) {
    return this.service.index(client, query);
  }

  @UseGuards(JwtAuthGuard, ClientGuard)
  @Post('client/echanges')
  @UseInterceptors(FilesInterceptor('pieces_jointes'))
  store(
    @CurrentClient() client: Client,
    @Body() dto: CreateEchangeDto,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.service.store(client, dto, files);
  }

  @UseGuards(JwtAuthGuard, ClientGuard)
  @Get('client/echanges/:id')
  show(@CurrentClient() client: Client, @Param('id', ParseIntPipe) id: number) {
    return this.service.show(client, id);
  }

  @UseGuards(JwtAuthGuard, ClientGuard)
  @Put('client/echanges/:id')
  update(
    @CurrentClient() client: Client,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEchangeDto,
  ) {
    return this.service.update(client, id, dto);
  }

  @UseGuards(JwtAuthGuard, ClientGuard)
  @Patch('client/echanges/:id')
  patch(
    @CurrentClient() client: Client,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEchangeDto,
  ) {
    return this.service.update(client, id, dto);
  }

  @UseGuards(JwtAuthGuard, ClientGuard)
  @Delete('client/echanges/:id')
  destroy(@CurrentClient() client: Client, @Param('id', ParseIntPipe) id: number) {
    return this.service.destroy(client, id);
  }

  // ---- praticien (mirrors the client block above, keyed on praticien_id) ----

  @UseGuards(JwtAuthGuard, PraticienGuard)
  @Get('praticien/echanges')
  indexPraticien(@CurrentPraticien() praticien: Praticien, @Query() query: Record<string, any>) {
    return this.service.indexPraticien(praticien, query);
  }

  @UseGuards(JwtAuthGuard, PraticienGuard)
  @Post('praticien/echanges')
  @UseInterceptors(FilesInterceptor('pieces_jointes'))
  storePraticien(
    @CurrentPraticien() praticien: Praticien,
    @Body() dto: CreateEchangeDto,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.service.storePraticien(praticien, dto, files);
  }

  @UseGuards(JwtAuthGuard, PraticienGuard)
  @Get('praticien/echanges/:id')
  showPraticien(@CurrentPraticien() praticien: Praticien, @Param('id', ParseIntPipe) id: number) {
    return this.service.showPraticien(praticien, id);
  }

  @UseGuards(JwtAuthGuard, PraticienGuard)
  @Put('praticien/echanges/:id')
  updatePraticien(
    @CurrentPraticien() praticien: Praticien,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEchangeDto,
  ) {
    return this.service.updatePraticien(praticien, id, dto);
  }

  @UseGuards(JwtAuthGuard, PraticienGuard)
  @Patch('praticien/echanges/:id')
  patchPraticien(
    @CurrentPraticien() praticien: Praticien,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEchangeDto,
  ) {
    return this.service.updatePraticien(praticien, id, dto);
  }

  @UseGuards(JwtAuthGuard, PraticienGuard)
  @Delete('praticien/echanges/:id')
  destroyPraticien(@CurrentPraticien() praticien: Praticien, @Param('id', ParseIntPipe) id: number) {
    return this.service.destroyPraticien(praticien, id);
  }

  // ---- community (public board — any authenticated client or praticien) ----

  @UseGuards(JwtAuthGuard)
  @Get('community')
  community(@CurrentUser() user: User, @Query() query: Record<string, any>) {
    return this.service.community(query, user);
  }

  @UseGuards(JwtAuthGuard)
  @Get('community/:id')
  communityShow(@CurrentUser() user: User, @Param('id', ParseIntPipe) id: number) {
    return this.service.communityShow(id, user);
  }

  // ---- admin ----

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('statistics')
  adminStatistics() { return this.service.adminStatistics(); }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get()
  adminIndex(@Query() query: Record<string, any>) { return this.service.adminIndex(query); }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get(':id')
  adminShow(@Param('id', ParseIntPipe) id: number) { return this.service.adminShow(id); }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Put(':id')
  adminUpdate(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AdminUpdateEchangeDto,
    @CurrentUser() user: User | null,
  ) {
    return this.service.adminUpdate(id, dto, user);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Patch(':id')
  adminPatch(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AdminUpdateEchangeDto,
    @CurrentUser() user: User | null,
  ) {
    return this.service.adminUpdate(id, dto, user);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @HttpCode(200)
  @Post(':id/hide')
  adminHide(@Param('id', ParseIntPipe) id: number) { return this.service.adminHide(id); }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @HttpCode(200)
  @Post(':id/report')
  adminReport(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReportEchangeDto,
    @CurrentUser() user: User | null,
  ) {
    return this.service.adminReport(id, dto, user);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Delete(':id')
  adminDestroy(@Param('id', ParseIntPipe) id: number) { return this.service.adminDestroy(id); }
}
