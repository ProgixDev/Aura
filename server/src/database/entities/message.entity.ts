import {
  Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn,
} from 'typeorm';
import { Conversation } from './conversation.entity';

@Entity('messages')
export class Message {
  @PrimaryGeneratedColumn() id: number;
  @Column() conversation_id: number;
  @Column({ type: 'varchar', length: 20 }) sender_role: 'client' | 'praticien';
  @Column({ type: 'text' }) text: string;
  @Column({ type: Date, nullable: true }) read_at: Date | null;
  @Column({ default: false }) flagged: boolean;
  @CreateDateColumn({ name: 'created_at' }) created_at: Date;

  @ManyToOne(() => Conversation, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'conversation_id' })
  conversation: Conversation;
}
