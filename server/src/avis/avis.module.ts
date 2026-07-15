import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Avis } from '../database/entities/avis.entity';
import { AvisController } from './avis.controller';
import { AvisService } from './avis.service';
import { AuditLogModule } from '../audit-log/audit-log.module';

@Module({
  imports: [TypeOrmModule.forFeature([Avis]), AuditLogModule],
  controllers: [AvisController],
  providers: [AvisService],
})
export class AvisModule {}
