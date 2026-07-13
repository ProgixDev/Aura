import {
  Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany,
  PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm';
import { decimalTransformer } from '../../common/transformers';
import { User } from './user.entity';
import { PraticienDocument } from './praticien-document.entity';

@Entity('praticiens')
export class Praticien {
  @PrimaryGeneratedColumn() id: number;
  @Column() firstname: string;
  @Column() lastname: string;
  @Column({ unique: true }) email: string;
  @Column() telephone: string;
  @Column() ville: string;
  @Column() niveau: string;
  @Column() specialite: string;
  @Column() mode: string;
  @Column() status: string;
  @Column({ type: 'decimal', precision: 10, scale: 2, transformer: decimalTransformer }) tarif: number;
  @Column({ type: 'int' }) experience: number;
  @Column({ type: 'text' }) bio: string;
  @Column({ type: 'varchar', length: 20, default: 'en_attente' }) statut_verification: string;
  @Column({ type: 'datetime', nullable: true }) date_inscription: Date | null;
  @Column({ type: 'datetime', nullable: true }) verifie_a: Date | null;
  @Column({ type: 'int', nullable: true }) verifie_par: number | null;
  @Column({ type: 'text', nullable: true }) motif_rejet: string | null;
  @CreateDateColumn({ name: 'created_at' }) created_at: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updated_at: Date;

  @OneToMany(() => PraticienDocument, (d) => d.praticien) documents: PraticienDocument[];
  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'verifie_par' })
  verifiePar: User | null;
}
