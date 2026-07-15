import {
  Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany,
  PrimaryGeneratedColumn, Unique, UpdateDateColumn,
} from 'typeorm';
import { Client } from './client.entity';
import { Praticien } from './praticien.entity';
import { Message } from './message.entity';

@Entity('conversations')
@Unique(['client_id', 'praticien_id'])
export class Conversation {
  @PrimaryGeneratedColumn() id: number;
  @Column() client_id: number;
  @Column() praticien_id: number;
  @CreateDateColumn({ name: 'created_at' }) created_at: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updated_at: Date;

  @ManyToOne(() => Client, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'client_id' })
  client: Client;

  @ManyToOne(() => Praticien, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'praticien_id' })
  praticien: Praticien;

  @OneToMany(() => Message, (m) => m.conversation)
  messages: Message[];
}
