import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn() id: number;
  @Column() audience: string;
  @Column() canal: string;
  @Column() titre: string;
  @Column({ type: 'varchar', nullable: true }) status: string | null;
  @Column({ type: 'text' }) message: string;
  @CreateDateColumn({ name: 'created_at' }) created_at: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updated_at: Date;
}
