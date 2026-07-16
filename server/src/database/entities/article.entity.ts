import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('articles')
export class Article {
  @PrimaryGeneratedColumn() id: number;
  @Column() titre: string;
  @Column({ unique: true }) slug: string;
  @Column() categorie: string;
  @Column() tonalite: string;
  @Column({ type: 'text' }) extrait: string;
  @Column({ type: 'text' }) corps: string;
  @Column() status: string;
  @Column() auteur: string;
  @Column({ type: 'int' }) temps_lecture: number;
  @Column({ type: 'varchar', nullable: true }) image_couverture: string | null;
  @Column({ type: 'varchar', nullable: true }) meta_description: string | null;
  @Column({ type: 'varchar', nullable: true }) mot_clef: string | null;
  @Column({ type: Date, nullable: true }) date_publication: Date | null;
  @CreateDateColumn({ name: 'created_at' }) created_at: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updated_at: Date;
}
