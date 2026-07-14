import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { RendezVousService } from './rendez-vous.service';
import { CreateRendezVousDto } from './dto/create-rendez-vous.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ClientGuard } from '../auth/guards/client.guard';
import { CurrentClient } from '../auth/decorators';
import { Client } from '../database/entities/client.entity';

@Controller('rendez-vous')
export class RendezVousController {
  constructor(private readonly service: RendezVousService) {}

  @UseGuards(JwtAuthGuard, ClientGuard)
  @Post()
  create(@CurrentClient() client: Client, @Body() dto: CreateRendezVousDto) {
    return this.service.create(client, dto);
  }
}
