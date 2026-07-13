import {
  Column, CreateDateColumn, Entity, JoinColumn, ManyToOne,
  PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm';
import { Praticien } from './praticien.entity';
import { User } from './user.entity';

@Entity('praticien_documents')
export class PraticienDocument {
  @PrimaryGeneratedColumn() id: number;
  @Column() praticien_id: number;
  @Column({ length: 50 }) type: string;
  @Column() nom_fichier: string;
  @Column() chemin: string;
  @Column({ type: 'varchar', nullable: true }) mime_type: string | null;
  @Column({ type: 'int', nullable: true }) taille: number | null;
  @Column({ type: 'varchar', length: 20, default: 'en_attente' }) statut: string;
  @Column({ type: 'text', nullable: true }) commentaire_rejet: string | null;
  @Column({ type: 'datetime', nullable: true }) verifie_a: Date | null;
  @Column({ type: 'int', nullable: true }) verifie_par: number | null;
  @CreateDateColumn({ name: 'created_at' }) created_at: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updated_at: Date;

  @ManyToOne(() => Praticien, (p) => p.documents)
  @JoinColumn({ name: 'praticien_id' })
  praticien: Praticien;
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'verifie_par' })
  verifiePar: User | null;
}
