import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Event } from '../database/entities/event.entity';
import { EventPraticien } from '../database/entities/event-praticien.entity';
import { EventInscription } from '../database/entities/event-inscription.entity';
import { Praticien } from '../database/entities/praticien.entity';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';

@Module({
  imports: [TypeOrmModule.forFeature([Event, EventPraticien, EventInscription, Praticien])],
  controllers: [EventsController],
  providers: [EventsService],
})
export class EventsModule {}
