import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RendezVous } from '../database/entities/rendez-vous.entity';
import { Avis } from '../database/entities/avis.entity';
import { Remboursement } from '../database/entities/remboursement.entity';
import { ClientActivityController } from './client-activity.controller';
import { ClientActivityService } from './client-activity.service';

@Module({
  imports: [TypeOrmModule.forFeature([RendezVous, Avis, Remboursement])],
  controllers: [ClientActivityController],
  providers: [ClientActivityService],
})
export class ClientActivityModule {}
