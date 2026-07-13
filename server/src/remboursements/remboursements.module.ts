import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Remboursement } from '../database/entities/remboursement.entity';
import { Paiement } from '../database/entities/paiement.entity';
import { RemboursementsController } from './remboursements.controller';
import { RemboursementsService } from './remboursements.service';
import { StorageService } from '../common/storage.service';

@Module({
  imports: [TypeOrmModule.forFeature([Remboursement, Paiement])],
  controllers: [RemboursementsController],
  providers: [RemboursementsService, StorageService],
})
export class RemboursementsModule {}
