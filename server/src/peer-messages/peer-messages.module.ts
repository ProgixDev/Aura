import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PeerConversation } from '../database/entities/peer-conversation.entity';
import { PeerMessage } from '../database/entities/peer-message.entity';
import { Praticien } from '../database/entities/praticien.entity';
import { PeerMessagesController } from './peer-messages.controller';
import { PeerMessagesService } from './peer-messages.service';

@Module({
  imports: [TypeOrmModule.forFeature([PeerConversation, PeerMessage, Praticien])],
  controllers: [PeerMessagesController],
  providers: [PeerMessagesService],
})
export class PeerMessagesModule {}
