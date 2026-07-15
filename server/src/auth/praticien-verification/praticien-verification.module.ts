import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Praticien } from '../../database/entities/praticien.entity';
import { PraticienDocument } from '../../database/entities/praticien-document.entity';
import { PraticienVerificationController } from './praticien-verification.controller';
import { PraticienVerificationService } from './praticien-verification.service';
import { StorageService } from '../../common/storage.service';
import { AuditLogModule } from '../../audit-log/audit-log.module';

@Module({
  imports: [TypeOrmModule.forFeature([Praticien, PraticienDocument]), AuditLogModule],
  controllers: [PraticienVerificationController],
  providers: [PraticienVerificationService, StorageService],
})
export class PraticienVerificationModule {}
