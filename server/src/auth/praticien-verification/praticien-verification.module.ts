import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Praticien } from '../../database/entities/praticien.entity';
import { PraticienDocument } from '../../database/entities/praticien-document.entity';
import { PraticienVerificationController } from './praticien-verification.controller';
import { PraticienVerificationService } from './praticien-verification.service';

@Module({
  imports: [TypeOrmModule.forFeature([Praticien, PraticienDocument])],
  controllers: [PraticienVerificationController],
  providers: [PraticienVerificationService],
})
export class PraticienVerificationModule {}
