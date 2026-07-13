import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Cercle } from '../database/entities/cercle.entity';
import { CerclesController } from './cercles.controller';
import { CerclesService } from './cercles.service';

@Module({
  imports: [TypeOrmModule.forFeature([Cercle])],
  controllers: [CerclesController],
  providers: [CerclesService],
})
export class CerclesModule {}
