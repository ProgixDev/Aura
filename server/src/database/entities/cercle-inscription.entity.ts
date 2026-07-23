import {
  Column, CreateDateColumn, Entity, JoinColumn, ManyToOne,
  PrimaryGeneratedColumn, Unique, UpdateDateColumn,
} from 'typeorm';
import { Cercle } from './cercle.entity';
import { Client } from './client.entity';

// A client's subscription to a cercle. Cercles have no real payment flow (same as
// events), so subscribing is a free confirmed membership regardless of `prix` — one
// row per (cercle, client); the unique constraint prevents double-subscription.
@Entity('cercle_inscriptions')
@Unique(['cercle_id', 'client_id'])
export class CercleInscription {
  @PrimaryGeneratedColumn() id: number;
  @Column() cercle_id: number;
  @Column() client_id: number;
  @Column({ type: 'varchar', length: 20, default: 'inscrit' }) statut: string;
  @CreateDateColumn({ name: 'created_at' }) created_at: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updated_at: Date;

  @ManyToOne(() => Cercle, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'cercle_id' })
  cercle: Cercle;

  @ManyToOne(() => Client, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'client_id' })
  client: Client;
}
