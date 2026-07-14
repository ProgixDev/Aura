import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFavoritesAndNotificationPreferences1700000000002
  implements MigrationInterface
{
  public async up(q: QueryRunner): Promise<void> {
    await q.query(`CREATE TABLE favorites (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      client_id BIGINT UNSIGNED NOT NULL,
      praticien_id BIGINT UNSIGNED NOT NULL,
      created_at TIMESTAMP NULL,
      UNIQUE KEY uq_favorites_client_praticien (client_id, praticien_id),
      CONSTRAINT fk_fav_client FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
      CONSTRAINT fk_fav_praticien FOREIGN KEY (praticien_id) REFERENCES praticiens(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await q.query(`CREATE TABLE notification_preferences (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      client_id BIGINT UNSIGNED NOT NULL UNIQUE,
      rappels_seance TINYINT(1) NOT NULL DEFAULT 1,
      nouveaux_messages TINYINT(1) NOT NULL DEFAULT 1,
      reponses_avis TINYINT(1) NOT NULL DEFAULT 0,
      newsletter TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP NULL,
      updated_at TIMESTAMP NULL,
      CONSTRAINT fk_np_client FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  }

  public async down(q: QueryRunner): Promise<void> {
    for (const t of ['notification_preferences', 'favorites']) {
      await q.query(`DROP TABLE IF EXISTS ${t}`);
    }
  }
}
