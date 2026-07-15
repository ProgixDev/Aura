import {
  Body, Controller, Get, HttpCode, Param, ParseIntPipe, Post, Query, UseGuards,
} from '@nestjs/common';
import { DisputesService } from './disputes.service';
import { CreateDisputeDto } from './dto/create-dispute.dto';
import { ResolveDisputeDto } from './dto/resolve-dispute.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { CapabilityGuard } from '../auth/guards/capability.guard';
import { RequireCapability } from '../auth/decorators';

@Controller()
export class DisputesController {
  constructor(private readonly service: DisputesService) {}

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('admin/disputes')
  index(@Query() query: Record<string, any>) {
    return this.service.index(query);
  }

  @UseGuards(JwtAuthGuard, AdminGuard, CapabilityGuard)
  @RequireCapability('signalements_litiges')
  @Post('admin/disputes')
  store(@Body() dto: CreateDisputeDto) {
    return this.service.store(dto);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('admin/disputes/:id')
  show(@Param('id', ParseIntPipe) id: number) {
    return this.service.show(id);
  }

  @UseGuards(JwtAuthGuard, AdminGuard, CapabilityGuard)
  @RequireCapability('signalements_litiges')
  @HttpCode(200)
  @Post('admin/disputes/:id/resolve')
  resolve(@Param('id', ParseIntPipe) id: number, @Body() dto: ResolveDisputeDto) {
    return this.service.resolve(id, dto);
  }
}
