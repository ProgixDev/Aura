import { Body, Controller, Get, HttpCode, Post, Query, UseGuards } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PraticienGuard } from '../auth/guards/praticien.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { CurrentPraticien } from '../auth/decorators';
import { Praticien } from '../database/entities/praticien.entity';

@Controller()
export class SubscriptionsController {
  constructor(private readonly service: SubscriptionsService) {}

  @UseGuards(JwtAuthGuard, PraticienGuard)
  @Get('praticien/subscription')
  current(@CurrentPraticien() praticien: Praticien) {
    return this.service.current(praticien);
  }

  @UseGuards(JwtAuthGuard, PraticienGuard)
  @HttpCode(200)
  @Post('praticien/subscription/checkout')
  checkout(@CurrentPraticien() praticien: Praticien, @Body() dto: CreateCheckoutDto) {
    return this.service.checkout(praticien, dto);
  }

  @UseGuards(JwtAuthGuard, PraticienGuard)
  @HttpCode(200)
  @Post('praticien/subscription/cancel')
  cancel(@CurrentPraticien() praticien: Praticien) {
    return this.service.cancel(praticien);
  }

  // ---- admin ----

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('admin/subscriptions')
  adminIndex(@Query() query: Record<string, any>) {
    return this.service.adminIndex(query);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('admin/subscriptions/statistics')
  adminStatistics() {
    return this.service.adminStatistics();
  }
}
