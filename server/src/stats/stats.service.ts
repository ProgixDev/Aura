import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Praticien } from '../database/entities/praticien.entity';
import { RendezVous } from '../database/entities/rendez-vous.entity';
import { Avis } from '../database/entities/avis.entity';
import { success } from '../common/envelope';

@Injectable()
export class StatsService {
  constructor(
    @InjectRepository(Praticien) private readonly praticiens: Repository<Praticien>,
    @InjectRepository(RendezVous) private readonly rendezVous: Repository<RendezVous>,
    @InjectRepository(Avis) private readonly avis: Repository<Avis>,
  ) {}

  // Public home-page stats. Every metric is a single aggregate query — no rows are loaded
  // into memory — so this stays cheap regardless of table size.
  async publicStats() {
    const [praticiensVerifies, seances, satisfactionRow, villesRow] = await Promise.all([
      this.praticiens.count({ where: { statut_verification: 'valide' } }),
      this.rendezVous.count({ where: { statut: 'termine' } }),
      this.avis.createQueryBuilder('a')
        .select('AVG(a.note)', 'avg_note')
        .where('a.statut = :st', { st: 'publié' })
        .getRawOne<{ avg_note: string | number | null }>(),
      this.praticiens.createQueryBuilder('p')
        .select('COUNT(DISTINCT p.ville)', 'cnt')
        .getRawOne<{ cnt: string | number }>(),
    ]);

    const satisfaction = satisfactionRow?.avg_note != null
      ? Math.round(Number(satisfactionRow.avg_note) * 10) / 10
      : 0;
    const villes = Number(villesRow?.cnt ?? 0);

    return success({
      praticiens_verifies: praticiensVerifies,
      seances,
      satisfaction,
      villes,
    });
  }
}
