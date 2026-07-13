import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Praticien } from '../../database/entities/praticien.entity';
import { PraticienDocument } from '../../database/entities/praticien-document.entity';
import { PraticienAuthController } from './praticien-auth.controller';
import { PraticienAuthService } from './praticien-auth.service';
import { StorageService } from '../../common/storage.service';

@Module({
  imports: [TypeOrmModule.forFeature([Praticien, PraticienDocument])],
  controllers: [PraticienAuthController],
  providers: [PraticienAuthService, StorageService],
})
export class PraticienAuthModule {}
