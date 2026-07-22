import {
  Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn,
} from 'typeorm';
import { PeerConversation } from './peer-conversation.entity';

@Entity('peer_messages')
export class PeerMessage {
  @PrimaryGeneratedColumn() id: number;
  @Column() conversation_id: number;
  @Column() sender_praticien_id: number;
  @Column({ type: 'text' }) text: string;
  @Column({ type: Date, nullable: true }) read_at: Date | null;
  @Column({ default: false }) flagged: boolean;
  @CreateDateColumn({ name: 'created_at' }) created_at: Date;

  @ManyToOne(() => PeerConversation, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'conversation_id' })
  conversation: PeerConversation;
}
