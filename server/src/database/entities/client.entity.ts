import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('clients')
export class Client {
  @PrimaryGeneratedColumn() id: number;
  @Column() firstname: string;
  @Column() lastname: string;
  @Column() email: string;
  @Column() city: string;
  @Column({ type: 'varchar', nullable: true }) phone: string | null;
  @CreateDateColumn({ name: 'created_at' }) created_at: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updated_at: Date;
}
