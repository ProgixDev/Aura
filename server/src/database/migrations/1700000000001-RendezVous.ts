import { MigrationInterface, QueryRunner } from 'typeorm';

export class RendezVous1700000000001 implements MigrationInterface {
  public async up(q: QueryRunner): Promise<void> {
    await q.query(`CREATE TABLE rendez_vous (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      client_id BIGINT UNSIGNED NOT NULL,
      praticien_id BIGINT UNSIGNED NOT NULL,
      date_heure TIMESTAMP NOT NULL,
      duree_minutes INT NOT NULL,
      mode VARCHAR(20) NOT NULL,
      statut VARCHAR(20) NOT NULL DEFAULT 'en_attente',
      tarif DECIMAL(10,2) NOT NULL,
      promotion_id BIGINT UNSIGNED NULL,
      stripe_payment_intent_id VARCHAR(255) NULL,
      created_at TIMESTAMP NULL,
      updated_at TIMESTAMP NULL,
      CONSTRAINT fk_rdv_client FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
      CONSTRAINT fk_rdv_praticien FOREIGN KEY (praticien_id) REFERENCES praticiens(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    // paiements.rendez_vous_id has existed since the initial schema (BIGINT UNSIGNED NULL,
    // no FK) but was dangling until this table existed. No ON DELETE clause here, matching
    // the Paiement.rendezVous relation added in this plan (Task 8), which also omits an
    // explicit onDelete — unlike the sibling nullable praticien_id FK on the same table,
    // which uses SET NULL. MySQL's implicit default for an unspecified FK action is RESTRICT.
    // The UNIQUE constraint enforces at most one paiements row per rendez_vous at the DB level
    // — the webhook's own findOneBy-then-save idempotency check is a TOCTOU race under
    // concurrent/duplicate Stripe webhook delivery, so this is the actual backstop. MySQL
    // (like SQLite/Postgres) treats multiple NULLs as distinct under a UNIQUE constraint, so
    // this doesn't affect the many other paiements rows with no rendez_vous_id.
    await q.query(`ALTER TABLE paiements
      ADD CONSTRAINT fk_pai_rendez_vous FOREIGN KEY (rendez_vous_id) REFERENCES rendez_vous(id),
      ADD CONSTRAINT uq_pai_rendez_vous UNIQUE (rendez_vous_id)`);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE paiements DROP INDEX uq_pai_rendez_vous`);
    await q.query(`ALTER TABLE paiements DROP FOREIGN KEY fk_pai_rendez_vous`);
    await q.query(`DROP TABLE IF EXISTS rendez_vous`);
  }
}
