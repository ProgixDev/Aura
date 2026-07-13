import {
  Column, CreateDateColumn, DeleteDateColumn, Entity, JoinColumn, ManyToOne,
  PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm';
import { jsonTransformer } from '../../common/transformers';
import { User } from './user.entity';

@Entity('email_templates')
export class EmailTemplate {
  @PrimaryGeneratedColumn() id: number;
  @Column() nom: string;
  @Column() objet: string;
  @Column({ type: 'text' }) corps: string;
  @Column({ type: 'varchar', length: 50, default: 'actif' }) statut: string;
  @Column({ type: 'text', nullable: true, transformer: jsonTransformer }) variables: string[] | null;
  @Column({ type: 'int', nullable: true }) created_by: number | null;
  @CreateDateColumn({ name: 'created_at' }) created_at: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updated_at: Date;
  @DeleteDateColumn({ name: 'deleted_at' }) deleted_at: Date | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by' })
  createdBy: User | null;
}
