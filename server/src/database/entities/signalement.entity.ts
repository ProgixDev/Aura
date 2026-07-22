import {
  Column, CreateDateColumn, Entity, JoinColumn, ManyToOne,
  PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm';
import { Client } from './client.entity';
import { Praticien } from './praticien.entity';
import { User } from './user.entity';

// Target is polymorphic: a client reports a praticien (praticien_id set) or a praticien
// reports a client (client_id set) — exactly one is ever set, enforced in
// SignalementsService.store() and by the chk_sig_target DB constraint.
@Entity('signalements')
export class Signalement {
  @PrimaryGeneratedColumn() id: number;
  @Column({ type: Date }) date_signalement: Date;
  @Column() type: string;
  @Column() sujet: string;
  @Column({ type: 'text' }) motif: string;
  @Column() signale_par_id: number;
  @Column({ type: 'int', nullable: true }) praticien_id: number | null;
  @Column({ type: 'int', nullable: true }) client_id: number | null;
  @Column({ type: 'varchar', length: 50 }) priorite: string;
  @Column({ type: 'varchar', length: 50 }) statut: string;
  @CreateDateColumn({ name: 'created_at' }) created_at: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updated_at: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'signale_par_id' })
  signalePar: User;

  @ManyToOne(() => Praticien, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'praticien_id' })
  praticien: Praticien | null;

  @ManyToOne(() => Client, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'client_id' })
  client: Client | null;
}
