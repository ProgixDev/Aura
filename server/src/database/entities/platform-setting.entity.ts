import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { decimalTransformer } from '../../common/transformers';

// Single-row settings table, always operated on via the fixed id=1 row (see
// PlatformSettingsService.getOrCreate()) — a generic key-value config table was considered
// and rejected: the only real requirement today is one platform-wide number, and a single
// typed row is simpler than key-value plumbing for one value (YAGNI).
@Entity('platform_settings')
export class PlatformSetting {
  @PrimaryColumn() id: number;
  @Column({ type: 'decimal', precision: 5, scale: 4, transformer: decimalTransformer }) commission_rate: number;
  @CreateDateColumn({ name: 'created_at' }) created_at: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updated_at: Date;
}
