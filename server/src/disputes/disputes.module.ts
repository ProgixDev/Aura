import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Dispute } from '../database/entities/dispute.entity';
import { Client } from '../database/entities/client.entity';
import { Praticien } from '../database/entities/praticien.entity';
import { DisputesController } from './disputes.controller';
import { DisputesService } from './disputes.service';

@Module({
  imports: [TypeOrmModule.forFeature([Dispute, Client, Praticien])],
  controllers: [DisputesController],
  providers: [DisputesService],
})
export class DisputesModule {}
