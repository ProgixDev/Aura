import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRoleToUsers1700000000004 implements MigrationInterface {
  public async up(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE users ADD COLUMN role VARCHAR(20) NULL AFTER is_admin`);
    // Existing admin row(s) predate the roles system entirely — default them to
    // the 'admin' role so nothing about their access changes (CapabilityGuard
    // treats 'admin' as having every capability, matching the old
    // is_admin-only behavior exactly).
    await q.query(`UPDATE users SET role = 'admin' WHERE is_admin = 1`);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE users DROP COLUMN role`);
  }
}
