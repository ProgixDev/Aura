import {
  Column, CreateDateColumn, DeleteDateColumn, Entity, JoinColumn, ManyToOne,
  PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm';
import { jsonTransformer } from '../../common/transformers';
import { Client } from './client.entity';
import { Praticien } from './praticien.entity';
import { User } from './user.entity';

export interface PieceJointe { nom: string; chemin: string; taille: number; type: string }

@Entity('echanges')
export class Echange {
  @PrimaryGeneratedColumn() id: number;
  @Column({ type: 'int', nullable: true }) client_id: number | null;
  @Column({ type: 'int', nullable: true }) praticien_id: number | null;
  @Column() sujet: string;
  @Column() type: string;
  @Column({ type: 'varchar', length: 20, default: 'en_attente' }) statut: string;
  @Column({ type: 'varchar', length: 20, default: 'moyenne' }) priorite: string;
  @Column({ type: 'text' }) message: string;
  @Column({ type: 'varchar', nullable: true }) format: string | null;
  @Column({ type: 'varchar', nullable: true }) delai: string | null;
  @Column({ type: 'varchar', length: 500, nullable: true }) ce_que_je_propose: string | null;
  @Column({ type: 'varchar', length: 500, nullable: true }) ce_que_je_recherche: string | null;
  @Column({ type: 'date', nullable: true }) delai_souhaite: string | null;
  @Column({ type: 'text', nullable: true, transformer: jsonTransformer }) pieces_jointes: PieceJointe[] | null;
  @Column({ type: 'text', nullable: true }) reponse_admin: string | null;
  @Column({ type: 'int', nullable: true }) traite_par: number | null;
  @Column({ type: Date, nullable: true }) traite_a: Date | null;
  @Column({ type: Date, nullable: true }) repondu_a: Date | null;
  @Column({ type: Date, nullable: true }) lu_a: Date | null;
  @Column({ default: false }) est_masque: boolean;
  @Column({ type: 'int', nullable: true }) signale_par: number | null;
  @Column({ type: 'varchar', length: 500, nullable: true }) motif_signalement: string | null;
  @Column({ type: Date, nullable: true }) signale_a: Date | null;
  @CreateDateColumn({ name: 'created_at' }) created_at: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updated_at: Date;
  @DeleteDateColumn({ name: 'deleted_at' }) deleted_at: Date | null;

  @ManyToOne(() => Client, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'client_id' })
  client: Client | null;
  @ManyToOne(() => Praticien, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'praticien_id' })
  praticien: Praticien | null;
  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'traite_par' })
  traitePar: User | null;
  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'signale_par' })
  signalePar: User | null;
}
