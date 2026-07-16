import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { decimalTransformer, jsonTransformer } from '../../common/transformers';
import { EventPraticien } from './event-praticien.entity';

@Entity('events')
export class Event {
  @PrimaryGeneratedColumn() id: number;
  @Column() titre: string;
  @Column() type: string;
  @Column({ type: 'text', transformer: jsonTransformer }) dates: string[];
  @Column() lieu: string;
  @Column({ type: 'decimal', precision: 10, scale: 2, transformer: decimalTransformer }) prix: number;
  @Column({ type: 'int' }) nombre_places: number;
  @Column({ type: 'text' }) description: string;
  @Column({ type: 'varchar', length: 20, default: 'brouillon' }) status: string;
  @Column({ type: 'varchar', length: 500, nullable: true }) image: string | null;
  @CreateDateColumn({ name: 'created_at' }) created_at: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updated_at: Date;

  @OneToMany(() => EventPraticien, (ep) => ep.event) animateurLinks: EventPraticien[];
}
