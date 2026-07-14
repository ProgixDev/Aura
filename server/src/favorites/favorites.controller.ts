import {
  Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Post, UseGuards,
} from '@nestjs/common';
import { FavoritesService } from './favorites.service';
import { CreateFavoriteDto } from './dto/create-favorite.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ClientGuard } from '../auth/guards/client.guard';
import { CurrentClient } from '../auth/decorators';
import { Client } from '../database/entities/client.entity';

@Controller()
export class FavoritesController {
  constructor(private readonly service: FavoritesService) {}

  @UseGuards(JwtAuthGuard, ClientGuard)
  @Get('client/favorites')
  index(@CurrentClient() client: Client) {
    return this.service.list(client);
  }

  @UseGuards(JwtAuthGuard, ClientGuard)
  @HttpCode(200)
  @Post('client/favorites')
  store(@CurrentClient() client: Client, @Body() dto: CreateFavoriteDto) {
    return this.service.add(client, dto);
  }

  @UseGuards(JwtAuthGuard, ClientGuard)
  @Delete('client/favorites/:praticienId')
  destroy(
    @CurrentClient() client: Client,
    @Param('praticienId', ParseIntPipe) praticienId: number,
  ) {
    return this.service.remove(client, praticienId);
  }
}
