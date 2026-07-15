import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Remboursement } from '../database/entities/remboursement.entity';
import { Paiement } from '../database/entities/paiement.entity';
import { RemboursementsController } from './remboursements.controller';
import { RemboursementsService } from './remboursements.service';
import { StorageService } from '../common/storage.service';
import { AuditLogModule } from '../audit-log/audit-log.module';

@Module({
  imports: [TypeOrmModule.forFeature([Remboursement, Paiement]), AuditLogModule],
  controllers: [RemboursementsController],
  providers: [RemboursementsService, StorageService],
})
export class RemboursementsModule {}
