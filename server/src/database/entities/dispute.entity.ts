import {
  Column, CreateDateColumn, Entity, JoinColumn, ManyToOne,
  PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm';
import { decimalTransformer } from '../../common/transformers';
import { Client } from './client.entity';
import { Praticien } from './praticien.entity';
import { Paiement } from './paiement.entity';

export const DISPUTE_STATUT_LABELS: Record<string, string> = {
  ouvert: 'Ouvert',
  resolu: 'Résolu',
};

@Entity('disputes')
export class Dispute {
  @PrimaryGeneratedColumn() id: number;
  @Column() client_id: number;
  @Column() praticien_id: number;
  @Column({ type: 'int', nullable: true }) paiement_id: number | null;
  @Column({
    type: 'decimal', precision: 10, scale: 2, nullable: true, transformer: decimalTransformer,
  }) montant: number | null;
  @Column({ type: 'text' }) motif: string;
  @Column({ type: 'varchar', length: 20, default: 'ouvert' }) statut: string;
  @Column({ type: 'varchar', length: 20, default: 'normale' }) priorite: string;
  @Column({ type: 'text', nullable: true }) resolution_notes: string | null;
  @CreateDateColumn({ name: 'created_at' }) created_at: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updated_at: Date;

  @ManyToOne(() => Client, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'client_id' })
  client: Client;

  @ManyToOne(() => Praticien, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'praticien_id' })
  praticien: Praticien;

  @ManyToOne(() => Paiement, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'paiement_id' })
  paiement: Paiement | null;
}
