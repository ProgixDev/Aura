import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlatformSetting } from '../database/entities/platform-setting.entity';
import { success } from '../common/envelope';
import { DEFAULT_COMMISSION_RATE, setCommissionRate } from '../common/commission';

const SETTINGS_ROW_ID = 1;

@Injectable()
export class PlatformSettingsService implements OnModuleInit {
  constructor(
    @InjectRepository(PlatformSetting) private readonly settings: Repository<PlatformSetting>,
  ) {}

  async onModuleInit() {
    const row = await this.getOrCreate();
    setCommissionRate(row.commission_rate);
  }

  private async getOrCreate(): Promise<PlatformSetting> {
    let row = await this.settings.findOneBy({ id: SETTINGS_ROW_ID });
    if (!row) {
      row = await this.settings.save({ id: SETTINGS_ROW_ID, commission_rate: DEFAULT_COMMISSION_RATE });
    }
    return row;
  }

  async getCommission() {
    const row = await this.getOrCreate();
    return success({ commission_rate: row.commission_rate });
  }

  async updateCommission(rate: number) {
    await this.getOrCreate();
    await this.settings.update(SETTINGS_ROW_ID, { commission_rate: rate });
    setCommissionRate(rate);
    return success({ commission_rate: rate }, 'Taux de commission mis à jour');
  }
}
