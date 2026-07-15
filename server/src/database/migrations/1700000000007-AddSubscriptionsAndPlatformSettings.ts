import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSubscriptionsAndPlatformSettings1700000000007 implements MigrationInterface {
  public async up(q: QueryRunner): Promise<void> {
    await q.query(`CREATE TABLE subscriptions (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      praticien_id BIGINT UNSIGNED NOT NULL,
      plan VARCHAR(20) NOT NULL DEFAULT 'essentiel',
      statut VARCHAR(20) NOT NULL DEFAULT 'active',
      stripe_subscription_id VARCHAR(255) NULL,
      stripe_customer_id VARCHAR(255) NULL,
      current_period_end TIMESTAMP NULL,
      created_at TIMESTAMP NULL,
      updated_at TIMESTAMP NULL,
      UNIQUE KEY uq_subscriptions_praticien (praticien_id),
      CONSTRAINT fk_sub_praticien FOREIGN KEY (praticien_id) REFERENCES praticiens(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await q.query(`CREATE TABLE platform_settings (
      id BIGINT UNSIGNED PRIMARY KEY,
      commission_rate DECIMAL(5,4) NOT NULL DEFAULT 0.1500,
      created_at TIMESTAMP NULL,
      updated_at TIMESTAMP NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE IF EXISTS platform_settings`);
    await q.query(`DROP TABLE IF EXISTS subscriptions`);
  }
}
