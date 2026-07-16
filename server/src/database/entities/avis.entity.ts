import {
  Column, CreateDateColumn, Entity, JoinColumn, ManyToOne,
  PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm';
import { Praticien } from './praticien.entity';

@Entity('avis')
export class Avis {
  @PrimaryGeneratedColumn() id: number;
  @Column() full_name_author: string;
  @Column() praticien_id: number;
  @Column({ type: 'int' }) note: number;
  @Column({ type: 'text' }) avis: string;
  @Column({ type: Date }) date_ajout: Date;
  @Column() statut: string;
  @CreateDateColumn({ name: 'created_at' }) created_at: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updated_at: Date;

  @ManyToOne(() => Praticien, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'praticien_id' })
  praticien: Praticien;
}
