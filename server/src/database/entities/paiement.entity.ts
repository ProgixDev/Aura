import {
  Column, CreateDateColumn, DeleteDateColumn, Entity, JoinColumn, ManyToOne,
  PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm';
import { decimalTransformer, jsonTransformer } from '../../common/transformers';
import { Client } from './client.entity';
import { Praticien } from './praticien.entity';
import { RendezVous } from './rendez-vous.entity';

@Entity('paiements')
export class Paiement {
  @PrimaryGeneratedColumn() id: number;
  @Column({ unique: true }) reference: string;
  @Column() client_id: number;
  @Column({ type: 'int', nullable: true }) praticien_id: number | null;
  @Column({ type: 'int', nullable: true }) rendez_vous_id: number | null;
  @Column({ type: 'datetime', nullable: true }) date_paiement: Date | null;
  @Column({ type: 'decimal', precision: 10, scale: 2, transformer: decimalTransformer }) montant_brut: number;
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, transformer: decimalTransformer }) commission: number;
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, transformer: decimalTransformer }) montant_net_praticien: number;
  @Column({ length: 50 }) moyen_paiement: string;
  @Column({ type: 'varchar', length: 50, nullable: true }) statut: string | null;
  @Column({ type: 'text', nullable: true, transformer: jsonTransformer }) details_paiement: unknown | null;
  @Column({ type: 'text', nullable: true, transformer: jsonTransformer }) metadata: unknown | null;
  @Column({ type: 'datetime', nullable: true }) date_remboursement: Date | null;
  @CreateDateColumn({ name: 'created_at' }) created_at: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updated_at: Date;
  @DeleteDateColumn({ name: 'deleted_at' }) deleted_at: Date | null;

  @ManyToOne(() => Client, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'client_id' })
  client: Client;
  @ManyToOne(() => Praticien, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'praticien_id' })
  praticien: Praticien | null;
  @ManyToOne(() => RendezVous, { nullable: true })
  @JoinColumn({ name: 'rendez_vous_id' })
  rendezVous: RendezVous | null;
}
