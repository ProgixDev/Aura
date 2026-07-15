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
import { AdminGuard } from '../auth/guards/admin.guard';
import { CapabilityGuard } from '../auth/guards/capability.guard';
import { CurrentClient, CurrentUser, RequireCapability } from '../auth/decorators';
import { Client } from '../database/entities/client.entity';
import { User } from '../database/entities/user.entity';

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

  // ---- admin ----

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('admin/statistics')
  adminStatistics(@Query() query: Record<string, any>) {
    return this.service.adminStatistics(query);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('admin/export')
  adminExport(@Query() query: Record<string, any>) {
    return this.service.adminExport(query);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('admin')
  adminIndex(@Query() query: Record<string, any>) {
    return this.service.adminIndex(query);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('admin/:id')
  adminShow(@Param('id', ParseIntPipe) id: number) {
    return this.service.adminShow(id);
  }

  @UseGuards(JwtAuthGuard, AdminGuard, CapabilityGuard)
  @RequireCapability('paiements_remboursements')
  @HttpCode(200)
  @Post('admin/:id/approve')
  adminApprove(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ApproveRemboursementDto,
  ) {
    return this.service.adminApprove(user, id, dto);
  }

  @UseGuards(JwtAuthGuard, AdminGuard, CapabilityGuard)
  @RequireCapability('paiements_remboursements')
  @HttpCode(200)
  @Post('admin/:id/refuse')
  adminRefuse(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RefuseRemboursementDto,
  ) {
    return this.service.adminRefuse(user, id, dto);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @HttpCode(200)
  @Post('admin/:id/complete') // fixes real PHP route typo 'admi/{id}/complete'
  adminComplete(@CurrentUser() user: User, @Param('id', ParseIntPipe) id: number) {
    return this.service.adminComplete(user, id);
  }
}
