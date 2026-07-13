import {
  Column, CreateDateColumn, DeleteDateColumn, Entity, JoinColumn, ManyToOne,
  PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm';
import { jsonTransformer } from '../../common/transformers';
import { Client } from './client.entity';
import { User } from './user.entity';

export interface PieceJointe { nom: string; chemin: string; taille: number; type: string }

@Entity('echanges')
export class Echange {
  @PrimaryGeneratedColumn() id: number;
  @Column() client_id: number;
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
  @Column({ type: 'datetime', nullable: true }) traite_a: Date | null;
  @Column({ type: 'datetime', nullable: true }) repondu_a: Date | null;
  @Column({ type: 'datetime', nullable: true }) lu_a: Date | null;
  @Column({ default: false }) est_masque: boolean;
  @Column({ type: 'int', nullable: true }) signale_par: number | null;
  @Column({ type: 'varchar', length: 500, nullable: true }) motif_signalement: string | null;
  @Column({ type: 'datetime', nullable: true }) signale_a: Date | null;
  @CreateDateColumn({ name: 'created_at' }) created_at: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updated_at: Date;
  @DeleteDateColumn({ name: 'deleted_at' }) deleted_at: Date | null;

  @ManyToOne(() => Client, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'client_id' })
  client: Client;
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'traite_par' })
  traitePar: User | null;
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'signale_par' })
  signalePar: User | null;
}
