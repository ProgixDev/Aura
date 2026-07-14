import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { NotificationPreferencesService } from './notification-preferences.service';
import { UpdateNotificationPreferencesDto } from './dto/update-notification-preferences.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ClientGuard } from '../auth/guards/client.guard';
import { CurrentClient } from '../auth/decorators';
import { Client } from '../database/entities/client.entity';

@Controller()
export class NotificationPreferencesController {
  constructor(private readonly service: NotificationPreferencesService) {}

  @UseGuards(JwtAuthGuard, ClientGuard)
  @Get('client/notification-preferences')
  show(@CurrentClient() client: Client) {
    return this.service.get(client);
  }

  @UseGuards(JwtAuthGuard, ClientGuard)
  @Put('client/notification-preferences')
  update(@CurrentClient() client: Client, @Body() dto: UpdateNotificationPreferencesDto) {
    return this.service.update(client, dto);
  }
}
