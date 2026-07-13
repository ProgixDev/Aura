import {
  Column, CreateDateColumn, DeleteDateColumn, Entity, JoinColumn, ManyToOne,
  PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm';
import { decimalTransformer, jsonTransformer } from '../../common/transformers';
import { Client } from './client.entity';
import { Paiement } from './paiement.entity';
import { Praticien } from './praticien.entity';

export const REMBOURSEMENT_STATUT_LABELS: Record<string, string> = {
  en_attente: 'En attente',
  en_cours: 'En cours',
  approuve: 'Approuvé',
  refuse: 'Refusé',
  completed: 'Complété',
};

@Entity('remboursements')
export class Remboursement {
  @PrimaryGeneratedColumn() id: number;
  @Column({ unique: true }) reference: string;
  @Column() client_id: number;
  @Column() paiement_id: number;
  @Column({ type: 'int', nullable: true }) praticien_id: number | null;
  @Column({ type: 'decimal', precision: 10, scale: 2, transformer: decimalTransformer }) montant: number;
  @Column() motif: string;
  @Column({ type: 'text', nullable: true }) description: string | null;
  @Column({ type: 'varchar', length: 50, default: 'en_attente' }) statut: string;
  @Column({ type: 'text', nullable: true }) commentaire_admin: string | null;
  @Column({ type: 'datetime', nullable: true }) date_traitement: Date | null;
  @Column({ type: 'datetime', nullable: true }) date_remboursement: Date | null;
  @Column({ type: 'text', nullable: true, transformer: jsonTransformer }) documents: unknown[] | null;
  @Column({ type: 'text', nullable: true, transformer: jsonTransformer }) metadata: unknown | null;
  @CreateDateColumn({ name: 'created_at' }) created_at: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updated_at: Date;
  @DeleteDateColumn({ name: 'deleted_at' }) deleted_at: Date | null;

  @ManyToOne(() => Client, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'client_id' })
  client: Client;
  @ManyToOne(() => Paiement, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'paiement_id' })
  paiement: Paiement;
  @ManyToOne(() => Praticien, { nullable: true })
  @JoinColumn({ name: 'praticien_id' })
  praticien: Praticien | null;
}
