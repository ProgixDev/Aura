import {
  Body, Controller, Get, HttpCode, Param, ParseIntPipe, Post, Query, UseGuards,
} from '@nestjs/common';
import { PeerMessagesService } from './peer-messages.service';
import { StartConversationDto } from './dto/start-conversation.dto';
import { SendPeerMessageDto } from './dto/send-peer-message.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PraticienGuard } from '../auth/guards/praticien.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { CurrentPraticien } from '../auth/decorators';
import { Praticien } from '../database/entities/praticien.entity';

@Controller()
export class PeerMessagesController {
  constructor(private readonly service: PeerMessagesService) {}

  // ---- praticien (both sides of a peer conversation are practitioners) ----

  @UseGuards(JwtAuthGuard, PraticienGuard)
  @Get('praticien/peer-conversations')
  index(@CurrentPraticien() praticien: Praticien) {
    return this.service.index(praticien);
  }

  @UseGuards(JwtAuthGuard, PraticienGuard)
  @HttpCode(200)
  @Post('praticien/peer-conversations')
  start(@CurrentPraticien() praticien: Praticien, @Body() dto: StartConversationDto) {
    return this.service.startConversation(praticien, dto);
  }

  @UseGuards(JwtAuthGuard, PraticienGuard)
  @Get('praticien/peer-conversations/:id')
  show(@CurrentPraticien() praticien: Praticien, @Param('id', ParseIntPipe) id: number) {
    return this.service.show(praticien, id);
  }

  @UseGuards(JwtAuthGuard, PraticienGuard)
  @Get('praticien/peer-conversations/:id/messages')
  messages(@CurrentPraticien() praticien: Praticien, @Param('id', ParseIntPipe) id: number) {
    return this.service.listMessages(praticien, id);
  }

  @UseGuards(JwtAuthGuard, PraticienGuard)
  @Post('praticien/peer-conversations/:id/messages')
  sendMessage(
    @CurrentPraticien() praticien: Praticien,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SendPeerMessageDto,
  ) {
    return this.service.sendMessage(praticien, id, dto);
  }

  // ---- admin ----

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('admin/peer-conversations')
  adminIndex(@Query() query: Record<string, any>) {
    return this.service.adminIndex(query);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('admin/peer-conversations/:id')
  adminShow(@Param('id', ParseIntPipe) id: number) {
    return this.service.adminShow(id);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @HttpCode(200)
  @Post('admin/peer-messages/:id/flag')
  flagMessage(@Param('id', ParseIntPipe) id: number) {
    return this.service.flagMessage(id);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @HttpCode(200)
  @Post('admin/peer-messages/:id/unflag')
  unflagMessage(@Param('id', ParseIntPipe) id: number) {
    return this.service.unflagMessage(id);
  }
}
