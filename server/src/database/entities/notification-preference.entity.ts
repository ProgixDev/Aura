import {
  Column, CreateDateColumn, Entity, JoinColumn, ManyToOne,
  PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm';
import { Client } from './client.entity';
import { Praticien } from './praticien.entity';

@Entity('notification_preferences')
export class NotificationPreference {
  @PrimaryGeneratedColumn() id: number;
  @Column({ unique: true, nullable: true }) client_id: number | null;
  @Column({ unique: true, nullable: true }) praticien_id: number | null;
  @Column({ default: true }) rappels_seance: boolean;
  @Column({ default: true }) nouveaux_messages: boolean;
  @Column({ default: false }) reponses_avis: boolean;
  @Column({ default: true }) newsletter: boolean;
  @CreateDateColumn({ name: 'created_at' }) created_at: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updated_at: Date;

  @ManyToOne(() => Client, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'client_id' })
  client: Client | null;

  @ManyToOne(() => Praticien, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'praticien_id' })
  praticien: Praticien | null;
}
