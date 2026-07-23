import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { NotificationPreferencesService } from './notification-preferences.service';
import { UpdateNotificationPreferencesDto } from './dto/update-notification-preferences.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ClientGuard } from '../auth/guards/client.guard';
import { PraticienGuard } from '../auth/guards/praticien.guard';
import { CurrentClient, CurrentPraticien } from '../auth/decorators';
import { Client } from '../database/entities/client.entity';
import { Praticien } from '../database/entities/praticien.entity';

@Controller()
export class NotificationPreferencesController {
  constructor(private readonly service: NotificationPreferencesService) {}

  @UseGuards(JwtAuthGuard, ClientGuard)
  @Get('client/notification-preferences')
  show(@CurrentClient() client: Client) {
    return this.service.get({ client_id: client.id });
  }

  @UseGuards(JwtAuthGuard, ClientGuard)
  @Put('client/notification-preferences')
  update(@CurrentClient() client: Client, @Body() dto: UpdateNotificationPreferencesDto) {
    return this.service.update({ client_id: client.id }, dto);
  }

  @UseGuards(JwtAuthGuard, PraticienGuard)
  @Get('praticien/notification-preferences')
  showPraticien(@CurrentPraticien() praticien: Praticien) {
    return this.service.get({ praticien_id: praticien.id });
  }

  @UseGuards(JwtAuthGuard, PraticienGuard)
  @Put('praticien/notification-preferences')
  updatePraticien(@CurrentPraticien() praticien: Praticien, @Body() dto: UpdateNotificationPreferencesDto) {
    return this.service.update({ praticien_id: praticien.id }, dto);
  }
}
