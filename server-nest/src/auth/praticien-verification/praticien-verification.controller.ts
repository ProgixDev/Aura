import {
  Body, Controller, Get, HttpCode, Param, ParseIntPipe, Post, Query, UseGuards,
} from '@nestjs/common';
import { PraticienVerificationService } from './praticien-verification.service';
import { VerifyDocumentsDto } from './dto/verify-documents.dto';
import { RejectPraticienDto } from './dto/reject-praticien.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { AdminGuard } from '../guards/admin.guard';
import { CurrentUser } from '../decorators';
import { User } from '../../database/entities/user.entity';

@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('v1/admin/praticiens/verification')
export class PraticienVerificationController {
  constructor(private readonly service: PraticienVerificationService) {}

  // NOTE: `statistics` MUST stay declared before `:id`. This deliberately fixes
  // a real Laravel bug (D7) where `GET .../statistics` was declared AFTER
  // `GET .../{id}` in the routes file, so Laravel's router matched `{id}` first
  // and treated the literal string "statistics" as an id — the endpoint was
  // unreachable in production. NestJS controllers match routes in declaration
  // order the same way, so this ordering matters here too.
  @Get('statistics')
  statistics() { return this.service.statistics(); }

  @Get()
  index(@Query() query: Record<string, any>) { return this.service.index(query); }

  @Get(':id')
  show(@Param('id', ParseIntPipe) id: number) { return this.service.show(id); }

  @HttpCode(200)
  @Post(':id/verify')
  verify(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: VerifyDocumentsDto,
    @CurrentUser() admin: User,
  ) { return this.service.verify(id, dto, admin); }

  @HttpCode(200)
  @Post(':id/reject')
  reject(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RejectPraticienDto,
    @CurrentUser() admin: User,
  ) { return this.service.reject(id, dto, admin); }

  @HttpCode(200)
  @Post(':id/relance')
  relance(@Param('id', ParseIntPipe) id: number) { return this.service.relance(id); }
}
