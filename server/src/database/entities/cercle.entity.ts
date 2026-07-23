import {
  Column, CreateDateColumn, Entity, JoinColumn, ManyToOne,
  PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm';
import { decimalTransformer } from '../../common/transformers';
import { Praticien } from './praticien.entity';

@Entity('cercles')
export class Cercle {
  @PrimaryGeneratedColumn() id: number;
  @Column({ unique: true }) nom: string;
  @Column({ type: 'text', nullable: true }) description: string | null;
  @Column({ type: 'varchar', length: 50, nullable: true }) color: string | null;
  // Free-text animateur name, used by admin-curated cercles with no real praticien
  // account behind them. Praticien-created cercles (praticien_id set) derive the
  // display name from the joined praticien instead.
  @Column({ type: 'varchar', nullable: true }) animateur: string | null;
  @Column({ type: 'int', nullable: true }) praticien_id: number | null;
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, transformer: decimalTransformer }) prix: number;
  @Column({ type: 'varchar', length: 500, nullable: true }) image: string | null;
  @CreateDateColumn({ name: 'created_at' }) created_at: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updated_at: Date;

  @ManyToOne(() => Praticien, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'praticien_id' })
  praticien: Praticien | null;
}
