import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDisputes1700000000006 implements MigrationInterface {
  public async up(q: QueryRunner): Promise<void> {
    await q.query(`CREATE TABLE disputes (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      client_id BIGINT UNSIGNED NOT NULL,
      praticien_id BIGINT UNSIGNED NOT NULL,
      paiement_id BIGINT UNSIGNED NULL,
      montant DECIMAL(10,2) NULL,
      motif TEXT NOT NULL,
      statut VARCHAR(20) NOT NULL DEFAULT 'ouvert',
      priorite VARCHAR(20) NOT NULL DEFAULT 'normale',
      resolution_notes TEXT NULL,
      created_at TIMESTAMP NULL,
      updated_at TIMESTAMP NULL,
      KEY idx_disputes_statut_priorite (statut, priorite),
      CONSTRAINT fk_disp_client FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
      CONSTRAINT fk_disp_praticien FOREIGN KEY (praticien_id) REFERENCES praticiens(id) ON DELETE CASCADE,
      CONSTRAINT fk_disp_paiement FOREIGN KEY (paiement_id) REFERENCES paiements(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE IF EXISTS disputes`);
  }
}
