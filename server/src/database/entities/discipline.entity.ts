import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('disciplines')
export class Discipline {
  @PrimaryGeneratedColumn() id: number;
  @Column() nom: string;
  @Column() slug: string;
  @Column() tonalite: string;
  @Column() glyphe: string;
  @Column() accroche: string;
  @CreateDateColumn({ name: 'created_at' }) created_at: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updated_at: Date;
}
