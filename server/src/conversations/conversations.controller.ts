import {
  Body, Controller, Get, HttpCode, Param, ParseIntPipe, Post, Query, UseGuards,
} from '@nestjs/common';
import { ConversationsService } from './conversations.service';
import { CreateConversationClientDto } from './dto/create-conversation-client.dto';
import { CreateConversationPraticienDto } from './dto/create-conversation-praticien.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ClientGuard } from '../auth/guards/client.guard';
import { PraticienGuard } from '../auth/guards/praticien.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { CurrentClient, CurrentPraticien } from '../auth/decorators';
import { Client } from '../database/entities/client.entity';
import { Praticien } from '../database/entities/praticien.entity';

@Controller()
export class ConversationsController {
  constructor(private readonly service: ConversationsService) {}

  // ---- client ----

  @UseGuards(JwtAuthGuard, ClientGuard)
  @Get('client/conversations')
  clientIndex(@CurrentClient() client: Client) {
    return this.service.clientIndex(client);
  }

  @UseGuards(JwtAuthGuard, ClientGuard)
  @HttpCode(200)
  @Post('client/conversations')
  clientStore(@CurrentClient() client: Client, @Body() dto: CreateConversationClientDto) {
    return this.service.clientStore(client, dto);
  }

  @UseGuards(JwtAuthGuard, ClientGuard)
  @Get('client/conversations/:id')
  clientShow(@CurrentClient() client: Client, @Param('id', ParseIntPipe) id: number) {
    return this.service.clientShow(client, id);
  }

  @UseGuards(JwtAuthGuard, ClientGuard)
  @Get('client/conversations/:id/messages')
  clientMessages(@CurrentClient() client: Client, @Param('id', ParseIntPipe) id: number) {
    return this.service.clientMessages(client, id);
  }

  @UseGuards(JwtAuthGuard, ClientGuard)
  @Post('client/conversations/:id/messages')
  clientSendMessage(
    @CurrentClient() client: Client,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SendMessageDto,
  ) {
    return this.service.clientSendMessage(client, id, dto);
  }

  // ---- praticien ----

  @UseGuards(JwtAuthGuard, PraticienGuard)
  @Get('praticien/conversations')
  praticienIndex(@CurrentPraticien() praticien: Praticien) {
    return this.service.praticienIndex(praticien);
  }

  @UseGuards(JwtAuthGuard, PraticienGuard)
  @HttpCode(200)
  @Post('praticien/conversations')
  praticienStore(@CurrentPraticien() praticien: Praticien, @Body() dto: CreateConversationPraticienDto) {
    return this.service.praticienStore(praticien, dto);
  }

  @UseGuards(JwtAuthGuard, PraticienGuard)
  @Get('praticien/conversations/:id')
  praticienShow(@CurrentPraticien() praticien: Praticien, @Param('id', ParseIntPipe) id: number) {
    return this.service.praticienShow(praticien, id);
  }

  @UseGuards(JwtAuthGuard, PraticienGuard)
  @Get('praticien/conversations/:id/messages')
  praticienMessages(@CurrentPraticien() praticien: Praticien, @Param('id', ParseIntPipe) id: number) {
    return this.service.praticienMessages(praticien, id);
  }

  @UseGuards(JwtAuthGuard, PraticienGuard)
  @Post('praticien/conversations/:id/messages')
  praticienSendMessage(
    @CurrentPraticien() praticien: Praticien,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SendMessageDto,
  ) {
    return this.service.praticienSendMessage(praticien, id, dto);
  }

  // ---- admin ----

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('admin/conversations')
  adminIndex(@Query() query: Record<string, any>) {
    return this.service.adminIndex(query);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('admin/conversations/:id')
  adminShow(@Param('id', ParseIntPipe) id: number) {
    return this.service.adminShow(id);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @HttpCode(200)
  @Post('admin/messages/:id/flag')
  flagMessage(@Param('id', ParseIntPipe) id: number) {
    return this.service.flagMessage(id);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @HttpCode(200)
  @Post('admin/messages/:id/unflag')
  unflagMessage(@Param('id', ParseIntPipe) id: number) {
    return this.service.unflagMessage(id);
  }
}
