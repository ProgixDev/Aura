import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Exclude } from 'class-transformer';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn() id: number;
  @Column() name: string;
  @Column({ unique: true }) email: string;
  @Exclude() @Column() password: string;
  @Exclude() @Column({ type: 'varchar', nullable: true }) remember_token: string | null;
  @Column({ default: false }) is_admin: boolean;
  @Column({ type: 'datetime', nullable: true }) last_login_at: Date | null;
  @Column({ type: 'varchar', nullable: true }) ip_address: string | null;
  @CreateDateColumn({ name: 'created_at' }) created_at: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updated_at: Date;
}
