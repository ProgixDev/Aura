import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationPreference } from '../database/entities/notification-preference.entity';
import { success } from '../common/envelope';
import { UpdateNotificationPreferencesDto } from './dto/update-notification-preferences.dto';

const DEFAULTS = {
  rappels_seance: true,
  nouveaux_messages: true,
  reponses_avis: false,
  newsletter: true,
};

// Polymorphic like `signalements` — exactly one of client_id/praticien_id is
// ever set, matching which role owns the row.
type Actor = { client_id: number } | { praticien_id: number };

@Injectable()
export class NotificationPreferencesService {
  constructor(
    @InjectRepository(NotificationPreference)
    private readonly prefs: Repository<NotificationPreference>,
  ) {}

  async get(actor: Actor) {
    const row = await this.prefs.findOneBy(actor);
    if (!row) return success({ ...DEFAULTS });
    const { rappels_seance, nouveaux_messages, reponses_avis, newsletter } = row;
    return success({ rappels_seance, nouveaux_messages, reponses_avis, newsletter });
  }

  async update(actor: Actor, dto: UpdateNotificationPreferencesDto) {
    const row = await this.prefs.findOneBy(actor);
    const merged = {
      rappels_seance: dto.rappels_seance ?? row?.rappels_seance ?? DEFAULTS.rappels_seance,
      nouveaux_messages: dto.nouveaux_messages ?? row?.nouveaux_messages ?? DEFAULTS.nouveaux_messages,
      reponses_avis: dto.reponses_avis ?? row?.reponses_avis ?? DEFAULTS.reponses_avis,
      newsletter: dto.newsletter ?? row?.newsletter ?? DEFAULTS.newsletter,
    };
    if (row) {
      await this.prefs.update(row.id, merged);
    } else {
      await this.prefs.save({ ...actor, ...merged });
    }
    return success(merged, 'Préférences de notification mises à jour');
  }
}
