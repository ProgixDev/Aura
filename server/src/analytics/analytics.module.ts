import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Client } from '../database/entities/client.entity';
import { Praticien } from '../database/entities/praticien.entity';
import { RendezVous } from '../database/entities/rendez-vous.entity';
import { Paiement } from '../database/entities/paiement.entity';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { PaiementsModule } from '../paiements/paiements.module';
import { RemboursementsModule } from '../remboursements/remboursements.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Client, Praticien, RendezVous, Paiement]),
    PaiementsModule,
    RemboursementsModule,
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
})
export class AnalyticsModule {}
