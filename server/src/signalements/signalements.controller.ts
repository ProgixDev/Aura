import {
  Body, Controller, Get, HttpCode, Param, ParseIntPipe, Post, Query, UseGuards,
} from '@nestjs/common';
import { SignalementsService } from './signalements.service';
import { CreateSignalementDto } from './dto/create-signalement.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { CurrentUser } from '../auth/decorators';
import { User } from '../database/entities/user.entity';

@Controller()
export class SignalementsController {
  constructor(private readonly service: SignalementsService) {}

  @UseGuards(JwtAuthGuard)
  @Post('signalements')
  store(@CurrentUser() user: User, @Body() dto: CreateSignalementDto) {
    return this.service.store(user, dto);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('admin/signalements')
  adminIndex(@Query() query: Record<string, any>) {
    return this.service.adminIndex(query);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @HttpCode(200)
  @Post('admin/signalements/:id/resolve')
  resolve(@Param('id', ParseIntPipe) id: number) {
    return this.service.resolve(id);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @HttpCode(200)
  @Post('admin/signalements/:id/reject')
  reject(@Param('id', ParseIntPipe) id: number) {
    return this.service.reject(id);
  }
}
