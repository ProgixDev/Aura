import {
  Column, CreateDateColumn, Entity, JoinColumn, ManyToOne,
  PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm';
import { Praticien } from './praticien.entity';
import { User } from './user.entity';

@Entity('signalements')
export class Signalement {
  @PrimaryGeneratedColumn() id: number;
  @Column({ type: 'datetime' }) date_signalement: Date;
  @Column() type: string;
  @Column() sujet: string;
  @Column({ type: 'text' }) motif: string;
  @Column() signale_par_id: number;
  @Column() praticien_id: number;
  @Column({ type: 'varchar', length: 50 }) priorite: string;
  @Column({ type: 'varchar', length: 50 }) statut: string;
  @CreateDateColumn({ name: 'created_at' }) created_at: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updated_at: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'signale_par_id' })
  signalePar: User;

  @ManyToOne(() => Praticien, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'praticien_id' })
  praticien: Praticien;
}
