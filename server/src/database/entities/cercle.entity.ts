import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('cercles')
export class Cercle {
  @PrimaryGeneratedColumn() id: number;
  @Column({ unique: true }) nom: string;
  @Column({ type: 'text', nullable: true }) description: string | null;
  @Column({ type: 'varchar', length: 50, nullable: true }) color: string | null;
  @Column({ type: 'varchar', nullable: true }) animateur: string | null;
  @Column({ type: 'varchar', length: 500, nullable: true }) image: string | null;
  @CreateDateColumn({ name: 'created_at' }) created_at: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updated_at: Date;
}
