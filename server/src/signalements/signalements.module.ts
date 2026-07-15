import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Signalement } from '../database/entities/signalement.entity';
import { SignalementsController } from './signalements.controller';
import { SignalementsService } from './signalements.service';
import { AuditLogModule } from '../audit-log/audit-log.module';

@Module({
  imports: [TypeOrmModule.forFeature([Signalement]), AuditLogModule],
  controllers: [SignalementsController],
  providers: [SignalementsService],
})
export class SignalementsModule {}
