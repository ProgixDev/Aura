import {
  Column, CreateDateColumn, Entity, JoinColumn, ManyToOne,
  PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm';
import { Praticien } from './praticien.entity';

@Entity('subscriptions')
export class Subscription {
  @PrimaryGeneratedColumn() id: number;
  @Column({ unique: true }) praticien_id: number;
  @Column({ type: 'varchar', length: 20, default: 'essentiel' }) plan: string; // 'essentiel'|'pro'|'premium'
  @Column({ type: 'varchar', length: 20, default: 'active' }) statut: string; // 'active'|'past_due'|'canceled'|'trialing'
  @Column({ type: 'varchar', nullable: true }) stripe_subscription_id: string | null;
  @Column({ type: 'varchar', nullable: true }) stripe_customer_id: string | null;
  @Column({ type: 'datetime', nullable: true }) current_period_end: Date | null;
  @CreateDateColumn({ name: 'created_at' }) created_at: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updated_at: Date;

  @ManyToOne(() => Praticien, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'praticien_id' })
  praticien: Praticien;
}
