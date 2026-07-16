import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Praticien } from '../database/entities/praticien.entity';
import { RendezVous } from '../database/entities/rendez-vous.entity';
import { Avis } from '../database/entities/avis.entity';
import { StatsController } from './stats.controller';
import { StatsService } from './stats.service';

@Module({
  imports: [TypeOrmModule.forFeature([Praticien, RendezVous, Avis])],
  controllers: [StatsController],
  providers: [StatsService],
})
export class StatsModule {}
