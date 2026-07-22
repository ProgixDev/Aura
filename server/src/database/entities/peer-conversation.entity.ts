import {
  Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany,
  PrimaryGeneratedColumn, Unique, UpdateDateColumn,
} from 'typeorm';
import { Praticien } from './praticien.entity';
import { PeerMessage } from './peer-message.entity';

// praticien_a_id is always the lower id, praticien_b_id the higher — enforced in
// PeerMessagesService.startConversation() so the same pair never gets two rows
// depending on who messages whom first.
@Entity('peer_conversations')
@Unique(['praticien_a_id', 'praticien_b_id'])
export class PeerConversation {
  @PrimaryGeneratedColumn() id: number;
  @Column() praticien_a_id: number;
  @Column() praticien_b_id: number;
  @CreateDateColumn({ name: 'created_at' }) created_at: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updated_at: Date;

  @ManyToOne(() => Praticien, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'praticien_a_id' })
  praticienA: Praticien;

  @ManyToOne(() => Praticien, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'praticien_b_id' })
  praticienB: Praticien;

  @OneToMany(() => PeerMessage, (m) => m.conversation)
  messages: PeerMessage[];
}
