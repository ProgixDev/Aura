import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Conversation } from '../database/entities/conversation.entity';
import { Message } from '../database/entities/message.entity';
import { Client } from '../database/entities/client.entity';
import { Praticien } from '../database/entities/praticien.entity';
import { ConversationsController } from './conversations.controller';
import { ConversationsService } from './conversations.service';

@Module({
  imports: [TypeOrmModule.forFeature([Conversation, Message, Client, Praticien])],
  controllers: [ConversationsController],
  providers: [ConversationsService],
})
export class ConversationsModule {}
