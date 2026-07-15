import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddConversationsAndMessages1700000000003
  implements MigrationInterface
{
  public async up(q: QueryRunner): Promise<void> {
    await q.query(`CREATE TABLE conversations (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      client_id BIGINT UNSIGNED NOT NULL,
      praticien_id BIGINT UNSIGNED NOT NULL,
      created_at TIMESTAMP NULL,
      updated_at TIMESTAMP NULL,
      UNIQUE KEY uq_conversations_client_praticien (client_id, praticien_id),
      CONSTRAINT fk_conv_client FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
      CONSTRAINT fk_conv_praticien FOREIGN KEY (praticien_id) REFERENCES praticiens(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await q.query(`CREATE TABLE messages (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      conversation_id BIGINT UNSIGNED NOT NULL,
      sender_role VARCHAR(20) NOT NULL,
      text TEXT NOT NULL,
      read_at TIMESTAMP NULL,
      flagged TINYINT(1) NOT NULL DEFAULT 0,
      created_at TIMESTAMP NULL,
      CONSTRAINT fk_msg_conversation FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  }

  public async down(q: QueryRunner): Promise<void> {
    for (const t of ['messages', 'conversations']) {
      await q.query(`DROP TABLE IF EXISTS ${t}`);
    }
  }
}
