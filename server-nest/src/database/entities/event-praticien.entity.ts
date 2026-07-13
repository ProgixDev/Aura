import {
  Column, CreateDateColumn, Entity, JoinColumn, ManyToOne,
  PrimaryGeneratedColumn, Unique, UpdateDateColumn,
} from 'typeorm';
import { Event } from './event.entity';
import { Praticien } from './praticien.entity';

@Entity('event_praticien')
@Unique(['event_id', 'praticien_id'])
export class EventPraticien {
  @PrimaryGeneratedColumn() id: number;
  @Column() event_id: number;
  @Column() praticien_id: number;
  @Column({ default: 'animateur' }) role: string;
  @CreateDateColumn({ name: 'created_at' }) created_at: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updated_at: Date;

  @ManyToOne(() => Event, (e) => e.animateurLinks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'event_id' })
  event: Event;
  @ManyToOne(() => Praticien, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'praticien_id' })
  praticien: Praticien;
}
