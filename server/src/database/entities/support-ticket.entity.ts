import {
  Column, CreateDateColumn, Entity, JoinColumn, ManyToOne,
  PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm';
import { jsonTransformer } from '../../common/transformers';
import { Client } from './client.entity';
import { User } from './user.entity';

export interface TicketReply { author: 'client' | 'support'; text: string; at: string; }

@Entity('support_tickets')
export class SupportTicket {
  @PrimaryGeneratedColumn() id: number;
  @Column() requester_name: string;
  @Column() requester_email: string;
  @Column({ type: 'int', nullable: true }) client_id: number | null;
  @Column() sujet: string;
  @Column({ type: 'varchar', length: 50, default: 'autre' }) categorie: string;
  @Column({ type: 'varchar', length: 20, default: 'normale' }) priorite: string;
  @Column({ type: 'varchar', length: 20, default: 'ouvert' }) statut: string;
  @Column({ type: 'text' }) message: string;
  @Column({ type: 'text', nullable: true, transformer: jsonTransformer }) messages: TicketReply[] | null;
  @Column({ type: 'int', nullable: true }) assigned_to: number | null;
  @CreateDateColumn({ name: 'created_at' }) created_at: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updated_at: Date;

  @ManyToOne(() => Client, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'client_id' }) client: Client | null;
  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'assigned_to' }) assignedTo: User | null;
}
