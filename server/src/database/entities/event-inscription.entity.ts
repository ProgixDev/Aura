import {
  Column, CreateDateColumn, Entity, JoinColumn, ManyToOne,
  PrimaryGeneratedColumn, Unique, UpdateDateColumn,
} from 'typeorm';
import { Event } from './event.entity';
import { Client } from './client.entity';

// A client's pre-registration (interest) for an event. Events have no payment
// flow, so registering is a free confirmed interest — not a rendez-vous. One
// row per (event, client); the unique constraint prevents double-registration.
@Entity('event_inscriptions')
@Unique(['event_id', 'client_id'])
export class EventInscription {
  @PrimaryGeneratedColumn() id: number;
  @Column() event_id: number;
  @Column() client_id: number;
  @Column({ type: 'int', default: 1 }) nombre_places: number;
  @Column({ type: 'varchar', length: 20, default: 'inscrit' }) statut: string;
  @CreateDateColumn({ name: 'created_at' }) created_at: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updated_at: Date;

  @ManyToOne(() => Event, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'event_id' })
  event: Event;

  @ManyToOne(() => Client, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'client_id' })
  client: Client;
}
