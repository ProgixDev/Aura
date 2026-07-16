import { Controller, Get, UseGuards } from '@nestjs/common';
import { ClientActivityService } from './client-activity.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ClientGuard } from '../auth/guards/client.guard';
import { CurrentClient } from '../auth/decorators';
import { Client } from '../database/entities/client.entity';

@Controller()
export class ClientActivityController {
  constructor(private readonly service: ClientActivityService) {}

  @UseGuards(JwtAuthGuard, ClientGuard)
  @Get('client/activity')
  index(@CurrentClient() client: Client) {
    return this.service.list(client);
  }
}
