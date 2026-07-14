import {
  Column, CreateDateColumn, Entity, JoinColumn, ManyToOne,
  PrimaryGeneratedColumn, Unique,
} from 'typeorm';
import { Client } from './client.entity';
import { Praticien } from './praticien.entity';

@Entity('favorites')
@Unique(['client_id', 'praticien_id'])
export class Favorite {
  @PrimaryGeneratedColumn() id: number;
  @Column() client_id: number;
  @Column() praticien_id: number;
  @CreateDateColumn({ name: 'created_at' }) created_at: Date;

  @ManyToOne(() => Client, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'client_id' })
  client: Client;

  @ManyToOne(() => Praticien, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'praticien_id' })
  praticien: Praticien;
}
