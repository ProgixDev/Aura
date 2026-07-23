import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Praticien } from '../database/entities/praticien.entity';
import { RendezVous } from '../database/entities/rendez-vous.entity';
import { Avis } from '../database/entities/avis.entity';
import { PraticiensController } from './praticiens.controller';
import { AdminPraticiensController } from './admin-praticiens.controller';
import { PraticiensService } from './praticiens.service';

@Module({
  imports: [TypeOrmModule.forFeature([Praticien, RendezVous, Avis])],
  controllers: [PraticiensController, AdminPraticiensController],
  providers: [PraticiensService],
})
export class PraticiensModule {}
