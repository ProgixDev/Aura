import {
  Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Post, Put,
  Query, UseGuards,
} from '@nestjs/common';
import { AvisService } from './avis.service';
import { CreateAvisDto } from './dto/create-avis.dto';
import { UpdateAvisDto } from './dto/update-avis.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ClientGuard } from '../auth/guards/client.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { CapabilityGuard } from '../auth/guards/capability.guard';
import { CurrentClient, CurrentUser, RequireCapability } from '../auth/decorators';
import { Client } from '../database/entities/client.entity';
import { User } from '../database/entities/user.entity';

@Controller()
export class AvisController {
  constructor(private readonly service: AvisService) {}

  @Get('avis')
  index(@Query() query: Record<string, any>) {
    return this.service.publicIndex(query);
  }

  @UseGuards(JwtAuthGuard, ClientGuard)
  @Post('client/avis')
  store(@CurrentClient() client: Client, @Body() dto: CreateAvisDto) {
    return this.service.store(client, dto);
  }

  @UseGuards(JwtAuthGuard, ClientGuard)
  @Get('client/avis')
  mine(@CurrentClient() client: Client) {
    return this.service.mine(client);
  }

  @UseGuards(JwtAuthGuard, ClientGuard)
  @Put('client/avis/:id')
  update(
    @CurrentClient() client: Client,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAvisDto,
  ) {
    return this.service.update(client, id, dto);
  }

  @UseGuards(JwtAuthGuard, ClientGuard)
  @Delete('client/avis/:id')
  destroy(@CurrentClient() client: Client, @Param('id', ParseIntPipe) id: number) {
    return this.service.destroy(client, id);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('admin/avis')
  adminIndex(@Query() query: Record<string, any>) {
    return this.service.adminIndex(query);
  }

  @UseGuards(JwtAuthGuard, AdminGuard, CapabilityGuard)
  @RequireCapability('avis_moderation')
  @HttpCode(200)
  @Post('admin/avis/:id/publish')
  publish(@CurrentUser() user: User, @Param('id', ParseIntPipe) id: number) {
    return this.service.publish(user, id);
  }

  @UseGuards(JwtAuthGuard, AdminGuard, CapabilityGuard)
  @RequireCapability('avis_moderation')
  @HttpCode(200)
  @Post('admin/avis/:id/reject')
  reject(@CurrentUser() user: User, @Param('id', ParseIntPipe) id: number) {
    return this.service.reject(user, id);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Delete('admin/avis/:id')
  adminDestroy(@Param('id', ParseIntPipe) id: number) {
    return this.service.adminDestroy(id);
  }
}
