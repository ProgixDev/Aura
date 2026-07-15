import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStripeConnectToPraticiens1700000000008 implements MigrationInterface {
  public async up(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE praticiens
      ADD COLUMN stripe_account_id VARCHAR(255) NULL,
      ADD COLUMN stripe_payouts_enabled TINYINT(1) NOT NULL DEFAULT 0`);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE praticiens DROP COLUMN stripe_payouts_enabled`);
    await q.query(`ALTER TABLE praticiens DROP COLUMN stripe_account_id`);
  }
}
