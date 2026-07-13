import {
  Body, Controller, Get, HttpCode, Param, ParseIntPipe, Post, Query,
  UploadedFiles, UseGuards, UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { RemboursementsService } from './remboursements.service';
import { CreateRemboursementDto } from './dto/create-remboursement.dto';
import { ApproveRemboursementDto } from './dto/approve-remboursement.dto';
import { RefuseRemboursementDto } from './dto/refuse-remboursement.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ClientGuard } from '../auth/guards/client.guard';
import { CurrentClient } from '../auth/decorators';
import { Client } from '../database/entities/client.entity';

@Controller('remboursements')
export class RemboursementsController {
  constructor(private readonly service: RemboursementsService) {}

  // ---- client ----

  @UseGuards(JwtAuthGuard, ClientGuard)
  @Get('client')
  index(@CurrentClient() client: Client, @Query() query: Record<string, any>) {
    return this.service.index(client, query);
  }

  @UseGuards(JwtAuthGuard, ClientGuard)
  @Post('client')
  @UseInterceptors(FilesInterceptor('documents'))
  store(
    @CurrentClient() client: Client,
    @Body() dto: CreateRemboursementDto,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.service.store(client, dto, files);
  }

  @UseGuards(JwtAuthGuard, ClientGuard)
  @Get('client/:id')
  show(@CurrentClient() client: Client, @Param('id', ParseIntPipe) id: number) {
    return this.service.show(client, id);
  }

  @UseGuards(JwtAuthGuard, ClientGuard)
  @HttpCode(200)
  @Post('client/:id/cancel')
  cancel(@CurrentClient() client: Client, @Param('id', ParseIntPipe) id: number) {
    return this.service.cancel(client, id);
  }

  // ---- admin (public in the real PHP app) ----

  @Get('admin/statistics')
  adminStatistics(@Query() query: Record<string, any>) {
    return this.service.adminStatistics(query);
  }

  @Get('admin/export')
  adminExport(@Query() query: Record<string, any>) {
    return this.service.adminExport(query);
  }

  @Get('admin')
  adminIndex(@Query() query: Record<string, any>) {
    return this.service.adminIndex(query);
  }

  @Get('admin/:id')
  adminShow(@Param('id', ParseIntPipe) id: number) {
    return this.service.adminShow(id);
  }

  @HttpCode(200)
  @Post('admin/:id/approve')
  adminApprove(@Param('id', ParseIntPipe) id: number, @Body() dto: ApproveRemboursementDto) {
    return this.service.adminApprove(id, dto);
  }

  @HttpCode(200)
  @Post('admin/:id/refuse')
  adminRefuse(@Param('id', ParseIntPipe) id: number, @Body() dto: RefuseRemboursementDto) {
    return this.service.adminRefuse(id, dto);
  }

  @HttpCode(200)
  @Post('admin/:id/complete') // fixes real PHP route typo 'admi/{id}/complete'
  adminComplete(@Param('id', ParseIntPipe) id: number) {
    return this.service.adminComplete(id);
  }
}
