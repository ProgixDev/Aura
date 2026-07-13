import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { decimalTransformer } from '../../common/transformers';

@Entity('promotions')
export class Promotion {
  @PrimaryGeneratedColumn() id: number;
  @Column({ unique: true, length: 50 }) code: string;
  @Column({ type: 'varchar', length: 20, default: 'pourcentage' }) type: string;
  @Column({ type: 'decimal', precision: 10, scale: 2, transformer: decimalTransformer }) valeur: number;
  @Column({ type: 'date' }) date_expiration: string;
  @Column({ type: 'varchar', nullable: true }) status: string | null;
  @CreateDateColumn({ name: 'created_at' }) created_at: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updated_at: Date;
}
