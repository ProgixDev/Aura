import { Controller, Get, HttpCode, Post, UseGuards } from '@nestjs/common';
import { StripeConnectService } from './stripe-connect.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PraticienGuard } from '../auth/guards/praticien.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { CurrentPraticien } from '../auth/decorators';
import { Praticien } from '../database/entities/praticien.entity';

@Controller()
export class StripeConnectController {
  constructor(private readonly service: StripeConnectService) {}

  @UseGuards(JwtAuthGuard, PraticienGuard)
  @HttpCode(200)
  @Post('praticien/stripe/connect/onboard')
  onboard(@CurrentPraticien() praticien: Praticien) {
    return this.service.onboard(praticien);
  }

  @UseGuards(JwtAuthGuard, PraticienGuard)
  @Get('praticien/stripe/connect/status')
  status(@CurrentPraticien() praticien: Praticien) {
    return this.service.status(praticien);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('admin/integrations/stripe/status')
  adminStatus() {
    return this.service.adminStatus();
  }
}
