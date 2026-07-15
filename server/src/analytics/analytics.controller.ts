import { Controller, Get, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin/analytics')
export class AnalyticsController {
  constructor(private readonly service: AnalyticsService) {}

  @Get('dashboard')
  dashboard() { return this.service.dashboard(); }

  @Get('revenue')
  revenue() { return this.service.revenue(); }

  @Get('growth')
  growth() { return this.service.growth(); }

  @Get('retention')
  retention() { return this.service.retention(); }
}
