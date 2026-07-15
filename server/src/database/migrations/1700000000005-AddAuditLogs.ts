import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAuditLogs1700000000005 implements MigrationInterface {
  public async up(q: QueryRunner): Promise<void> {
    await q.query(`CREATE TABLE audit_logs (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      actor_id BIGINT UNSIGNED NULL,
      action VARCHAR(255) NOT NULL,
      target_type VARCHAR(100) NOT NULL,
      target_id BIGINT UNSIGNED NULL,
      category VARCHAR(20) NOT NULL,
      metadata JSON NULL,
      created_at TIMESTAMP NULL,
      INDEX idx_audit_logs_category (category),
      INDEX idx_audit_logs_created_at (created_at),
      CONSTRAINT fk_audit_logs_actor FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE IF EXISTS audit_logs`);
  }
}
