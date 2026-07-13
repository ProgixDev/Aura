import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Praticien } from '../database/entities/praticien.entity';
import { PraticiensController } from './praticiens.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Praticien])],
  controllers: [PraticiensController],
})
export class PraticiensModule {}
