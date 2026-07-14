import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Signalement } from '../database/entities/signalement.entity';
import { SignalementsController } from './signalements.controller';
import { SignalementsService } from './signalements.service';

@Module({
  imports: [TypeOrmModule.forFeature([Signalement])],
  controllers: [SignalementsController],
  providers: [SignalementsService],
})
export class SignalementsModule {}
