import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Avis } from '../database/entities/avis.entity';
import { AvisController } from './avis.controller';
import { AvisService } from './avis.service';

@Module({
  imports: [TypeOrmModule.forFeature([Avis])],
  controllers: [AvisController],
  providers: [AvisService],
})
export class AvisModule {}
