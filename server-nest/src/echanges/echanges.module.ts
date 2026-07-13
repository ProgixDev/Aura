import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Echange } from '../database/entities/echange.entity';
import { EchangesController } from './echanges.controller';
import { EchangesService } from './echanges.service';
import { StorageService } from '../common/storage.service';

@Module({
  imports: [TypeOrmModule.forFeature([Echange])],
  controllers: [EchangesController],
  providers: [EchangesService, StorageService],
})
export class EchangesModule {}
