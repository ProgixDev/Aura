import {
  Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Post, Put, Query, Req, UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { PromotionsService } from './promotions.service';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';
import { ValidatePromotionDto } from './dto/validate-promotion.dto';
import { success } from '../common/envelope';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

@Controller('promotions')
export class PromotionsController {
  constructor(private readonly service: PromotionsService) {}

  // ---- public promo-code check (used by the booking flow before payment) ----

  @HttpCode(200)
  @Post('validate')
  async validate(@Body() dto: ValidatePromotionDto) {
    const promo = await this.service.validate(dto.code);
    return success({ id: promo.id, code: promo.code, type: promo.type, valeur: promo.valeur });
  }

  // ---- admin CRUD ----

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get()
  index(@Query() query: Record<string, any>, @Req() req: Request) {
    return this.service.index(query, req);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post()
  store(@Body() dto: CreatePromotionDto) { return this.service.store(dto); }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get(':id')
  show(@Param('id', ParseIntPipe) id: number) { return this.service.show(id); }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdatePromotionDto) {
    return this.service.update(id, dto);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Delete(':id')
  destroy(@Param('id', ParseIntPipe) id: number) { return this.service.destroy(id); }
}
