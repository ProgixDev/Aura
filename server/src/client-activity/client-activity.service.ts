import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RendezVous } from '../database/entities/rendez-vous.entity';
import { Avis } from '../database/entities/avis.entity';
import { Remboursement } from '../database/entities/remboursement.entity';
import { Client } from '../database/entities/client.entity';
import { success } from '../common/envelope';

const MAX_ITEMS = 15;

interface ActivityItem {
  type: 'rendez_vous' | 'avis' | 'remboursement';
  label: string;
  at: string;
}

@Injectable()
export class ClientActivityService {
  constructor(
    @InjectRepository(RendezVous) private readonly rendezVous: Repository<RendezVous>,
    @InjectRepository(Avis) private readonly avis: Repository<Avis>,
    @InjectRepository(Remboursement) private readonly remboursements: Repository<Remboursement>,
  ) {}

  // Merges three activity sources into one newest-first feed capped at MAX_ITEMS. Each source
  // is queried ordered-desc and limited to MAX_ITEMS: an item ranked below MAX_ITEMS within its
  // own source can never make the global top MAX_ITEMS (that source alone already supplies
  // MAX_ITEMS items with a later or equal `at`), so this stays a correct top-N without loading
  // full tables into memory.
  async list(client: Client) {
    // avis has no client_id column — ownership is approximated by matching full_name_author
    // against the current client's name, the same convention avis.service.ts#mine() uses.
    const fullName = `${client.firstname} ${client.lastname}`;

    const [rdvRows, avisRows, rembRows] = await Promise.all([
      this.rendezVous.createQueryBuilder('rv')
        .leftJoinAndSelect('rv.praticien', 'praticien')
        .where('rv.client_id = :cid', { cid: client.id })
        .orderBy('rv.date_heure', 'DESC')
        .limit(MAX_ITEMS)
        .getMany(),
      this.avis.createQueryBuilder('a')
        .where('a.full_name_author = :name', { name: fullName })
        .orderBy('a.date_ajout', 'DESC')
        .limit(MAX_ITEMS)
        .getMany(),
      this.remboursements.createQueryBuilder('r')
        .where('r.client_id = :cid', { cid: client.id })
        .orderBy('r.created_at', 'DESC')
        .limit(MAX_ITEMS)
        .getMany(),
    ]);

    const items: ActivityItem[] = [
      ...rdvRows.map((rv): ActivityItem => ({
        type: 'rendez_vous',
        label: `Séance avec ${rv.praticien?.firstname ?? 'un praticien'} — ${rv.statut}`,
        at: rv.date_heure.toISOString(),
      })),
      ...avisRows.map((a): ActivityItem => ({
        type: 'avis',
        label: 'Vous avez laissé un avis',
        at: a.date_ajout.toISOString(),
      })),
      ...rembRows.map((r): ActivityItem => ({
        type: 'remboursement',
        label: `Demande de remboursement — ${r.statut}`,
        at: r.created_at.toISOString(),
      })),
    ];

    items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
    return success(items.slice(0, MAX_ITEMS));
  }
}
