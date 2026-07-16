import {
  Column, CreateDateColumn, Entity, JoinColumn, ManyToOne,
  PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm';
import { decimalTransformer } from '../../common/transformers';
import { Client } from './client.entity';
import { Praticien } from './praticien.entity';

@Entity('rendez_vous')
export class RendezVous {
  @PrimaryGeneratedColumn() id: number;
  @Column() client_id: number;
  @Column() praticien_id: number;
  @Column({ type: Date }) date_heure: Date;
  @Column({ type: 'int' }) duree_minutes: number;
  @Column({ length: 20 }) mode: string; // 'présentiel' | 'visio'
  @Column({ type: 'varchar', length: 20, default: 'en_attente' }) statut: string; // en_attente|confirme|annule|termine
  @Column({ type: 'decimal', precision: 10, scale: 2, transformer: decimalTransformer }) tarif: number;
  @Column({ type: 'int', nullable: true }) promotion_id: number | null;
  @Column({ type: 'varchar', nullable: true }) stripe_payment_intent_id: string | null;
  @CreateDateColumn({ name: 'created_at' }) created_at: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updated_at: Date;

  @ManyToOne(() => Client, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'client_id' })
  client: Client;
  @ManyToOne(() => Praticien, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'praticien_id' })
  praticien: Praticien;
}
