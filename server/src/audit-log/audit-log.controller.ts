import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuditLogService } from './audit-log.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

@Controller()
export class AuditLogController {
  constructor(private readonly service: AuditLogService) {}

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('admin/audit-logs')
  index(@Query() query: Record<string, any>) {
    return this.service.index(query);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('admin/audit-logs/export')
  exportCsv(@Query() query: Record<string, any>) {
    return this.service.exportCsv(query);
  }
}
