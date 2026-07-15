import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Client } from '../database/entities/client.entity';
import { Praticien } from '../database/entities/praticien.entity';
import { RendezVous } from '../database/entities/rendez-vous.entity';
import { Paiement } from '../database/entities/paiement.entity';
import { PaiementsService } from '../paiements/paiements.service';
import { RemboursementsService } from '../remboursements/remboursements.service';
import { success } from '../common/envelope';
import { round1, monthBounds, pctChange, toDateStr } from './analytics.utils';

const PAIEMENT_MONTH_EXPR = "SUBSTR(CAST(p.date_paiement AS CHAR), 1, 7)";

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(Client) private readonly clients: Repository<Client>,
    @InjectRepository(Praticien) private readonly praticiens: Repository<Praticien>,
    @InjectRepository(RendezVous) private readonly rendezVous: Repository<RendezVous>,
    @InjectRepository(Paiement) private readonly paiements: Repository<Paiement>,
    private readonly paiementsService: PaiementsService,
    private readonly remboursementsService: RemboursementsService,
  ) {}

  async dashboard() {
    const now = new Date();
    const cur = monthBounds(now.getUTCFullYear(), now.getUTCMonth());
    const prevRef = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
    const prev = monthBounds(prevRef.getUTCFullYear(), prevRef.getUTCMonth());

    const curPaiements = (await this.paiementsService.adminStatistics({
      date_debut: toDateStr(cur.start), date_fin: toDateStr(now),
    })).data as { general: { montant_total: number } };
    const prevPaiements = (await this.paiementsService.adminStatistics({
      date_debut: toDateStr(prev.start), date_fin: toDateStr(prev.endInclusive),
    })).data as { general: { montant_total: number } };

    const bookingsThisMonth = await this.rendezVous.createQueryBuilder('rv')
      .where('rv.date_heure >= :s AND rv.date_heure <= :e', { s: cur.start, e: now })
      .andWhere("rv.statut != 'annule'")
      .getCount();
    const bookingsPrevMonth = await this.rendezVous.createQueryBuilder('rv')
      .where('rv.date_heure >= :s AND rv.date_heure <= :e', { s: prev.start, e: prev.endInclusive })
      .andWhere("rv.statut != 'annule'")
      .getCount();

    const newPraticiensThisMonth = await this.praticiens.createQueryBuilder('pr')
      .where('pr.created_at >= :s AND pr.created_at <= :e', { s: cur.start, e: now })
      .getCount();
    const newPraticiensPrevMonth = await this.praticiens.createQueryBuilder('pr')
      .where('pr.created_at >= :s AND pr.created_at <= :e', { s: prev.start, e: prev.endInclusive })
      .getCount();

    const remboursementsStats = (await this.remboursementsService.adminStatistics({
      date_debut: toDateStr(cur.start), date_fin: toDateStr(now),
    })).data as { taux_remboursement: string };

    return success({
      revenue_this_month: curPaiements.general.montant_total,
      revenue_delta_pct: pctChange(curPaiements.general.montant_total, prevPaiements.general.montant_total),
      bookings_this_month: bookingsThisMonth,
      bookings_delta_pct: pctChange(bookingsThisMonth, bookingsPrevMonth),
      new_praticiens_this_month: newPraticiensThisMonth,
      new_praticiens_delta: newPraticiensThisMonth - newPraticiensPrevMonth,
      refund_rate: remboursementsStats.taux_remboursement,
    });
  }

  async revenue() {
    const now = new Date();
    const windowStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11, 1));

    const base = (await this.paiementsService.adminStatistics({
      date_debut: toDateStr(windowStart),
    })).data as { general: unknown };

    const monthDetail = await this.paiements.createQueryBuilder('p')
      .select(PAIEMENT_MONTH_EXPR, 'mois')
      .addSelect('COALESCE(SUM(p.montant_brut),0)', 'total')
      .addSelect('COALESCE(SUM(p.commission),0)', 'commission')
      .addSelect('COALESCE(SUM(p.montant_net_praticien),0)', 'net')
      .where('p.date_paiement >= :ws', { ws: windowStart })
      .groupBy('mois')
      .orderBy('mois', 'ASC')
      .getRawMany();

    const disciplineRows = await this.paiements.createQueryBuilder('p')
      .innerJoin('p.praticien', 'praticien')
      .select('praticien.specialite', 'specialite')
      .addSelect('COALESCE(SUM(p.montant_brut),0)', 'total')
      .where('p.date_paiement >= :ws', { ws: windowStart })
      .groupBy('praticien.specialite')
      .orderBy('total', 'DESC')
      .getRawMany();
    const disciplineTotal = disciplineRows.reduce((s, r) => s + Number(r.total), 0);

    return success({
      general: base.general,
      par_mois: monthDetail.map((r) => ({
        mois: r.mois, total: Number(r.total), commission: Number(r.commission), net: Number(r.net),
      })),
      par_discipline: disciplineRows.map((r) => ({
        specialite: r.specialite,
        total: Number(r.total),
        pct: disciplineTotal > 0 ? round1((Number(r.total) / disciplineTotal) * 100) : 0,
      })),
    });
  }

  async growth() { return success({}); }

  async retention() { return success({}); }
}
