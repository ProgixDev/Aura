import {
  Column, CreateDateColumn, Entity, JoinColumn, ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { jsonTransformer } from '../../common/transformers';
import { User } from './user.entity';

// Matches the 6 categories the `admin/audit` mock table has always used
// (web/lib/data/admin.js `auditLog[].kind`, web/app/admin/audit/page.jsx `KIND_LABEL`).
export const AUDIT_CATEGORIES = [
  'moderation', 'verification', 'finance', 'security', 'support', 'system',
] as const;
export type AuditCategory = (typeof AUDIT_CATEGORIES)[number];

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn() id: number;
  @Column({ type: 'int', nullable: true }) actor_id: number | null;
  @Column() action: string;
  @Column() target_type: string;
  @Column({ type: 'int', nullable: true }) target_id: number | null;
  @Column({ type: 'varchar', length: 20 }) category: AuditCategory;
  // No `target_label` column exists in the locked P8-7 schema — the mock's "Cible"
  // column needs a free-text display string that doesn't derive mechanically from
  // target_type+target_id, so AuditLogService.record() stores it inside this JSON
  // column instead of inventing a new one. See audit-log.service.ts.
  @Column({ type: 'text', nullable: true, transformer: jsonTransformer })
  metadata: Record<string, unknown> | null;
  @CreateDateColumn({ name: 'created_at' }) created_at: Date;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'actor_id' })
  actor: User | null;
}
