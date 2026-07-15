import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { PlatformSettingsService } from './platform-settings.service';
import { UpdateCommissionDto } from './dto/update-commission.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { CapabilityGuard } from '../auth/guards/capability.guard';
import { RequireCapability } from '../auth/decorators';

@Controller('admin/settings')
export class PlatformSettingsController {
  constructor(private readonly service: PlatformSettingsService) {}

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('commission')
  get() {
    return this.service.getCommission();
  }

  @UseGuards(JwtAuthGuard, AdminGuard, CapabilityGuard)
  @RequireCapability('abonnements_promos')
  @Put('commission')
  update(@Body() dto: UpdateCommissionDto) {
    return this.service.updateCommission(dto.commission_rate);
  }
}
