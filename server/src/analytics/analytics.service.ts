import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, MoreThanOrEqual, Repository } from 'typeorm';
import { Client } from '../database/entities/client.entity';
import { Praticien } from '../database/entities/praticien.entity';
import { RendezVous } from '../database/entities/rendez-vous.entity';
import { Paiement } from '../database/entities/paiement.entity';
import { PaiementsService } from '../paiements/paiements.service';
import { RemboursementsService } from '../remboursements/remboursements.service';
import { success } from '../common/envelope';
import {
  round1, monthBounds, pctChange, toDateStr, currentWeekRange, bucketByWeekday, parseRawDatetime,
  currentYearMonth, addMonthsToYearMonth,
} from './analytics.utils';

const PAIEMENT_MONTH_EXPR = "SUBSTR(CAST(p.date_paiement AS CHAR), 1, 7)";
const CLIENT_MONTH_EXPR = "SUBSTR(CAST(c.created_at AS CHAR), 1, 7)";
const RDV_MONTH_EXPR = "SUBSTR(CAST(rv.date_heure AS CHAR), 1, 7)";

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

  private readonly MONTH_OFFSETS = [1, 2, 3, 6, 12];
  private readonly COHORT_COUNT = 6;

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

    // leftJoin (not innerJoin): Paiement.praticien is onDelete SET NULL, so a paiement can
    // outlive its praticien — an inner join would silently drop that revenue from every
    // discipline bucket (and from disciplineTotal) while `general` (no join at all) still
    // counts it, overstating every remaining discipline's true share. Orphaned rows are bucketed
    // under an explicit label instead of being dropped.
    const disciplineRows = await this.paiements.createQueryBuilder('p')
      .leftJoin('p.praticien', 'praticien')
      .select("COALESCE(praticien.specialite, 'Non attribué')", 'specialite')
      .addSelect('COALESCE(SUM(p.montant_brut),0)', 'total')
      .where('p.date_paiement >= :ws', { ws: windowStart })
      .groupBy('specialite')
      .orderBy('total', 'DESC')
      .getRawMany();
    // Percentages are computed against the real grand total (`general.montant_total`, unjoined),
    // not a locally re-summed disciplineTotal — keeps this consistent with `general` even if a
    // future edge case (e.g. a null date_paiement) excludes a row from one query but not the
    // other.
    const generalTotal = Number((base.general as { montant_total: number }).montant_total);

    return success({
      general: base.general,
      par_mois: monthDetail.map((r) => ({
        mois: r.mois, total: Number(r.total), commission: Number(r.commission), net: Number(r.net),
      })),
      par_discipline: disciplineRows.map((r) => ({
        specialite: r.specialite,
        total: Number(r.total),
        pct: generalTotal > 0 ? round1((Number(r.total) / generalTotal) * 100) : 0,
      })),
    });
  }

  async growth() {
    const now = new Date();
    const windowStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11, 1));

    const signupRows = await this.clients.createQueryBuilder('c')
      .select(CLIENT_MONTH_EXPR, 'mois')
      .addSelect('COUNT(c.id)', 'count')
      .where('c.created_at >= :ws', { ws: windowStart })
      .groupBy('mois')
      .orderBy('mois', 'ASC')
      .getRawMany();
    const signups = signupRows.map((r) => ({ mois: r.mois, count: Number(r.count) }));

    const { start: weekStart, end: weekEnd } = currentWeekRange(now);
    const weekRows = await this.rendezVous.createQueryBuilder('rv')
      .select('rv.date_heure', 'date_heure')
      .where('rv.date_heure >= :s AND rv.date_heure < :e', { s: weekStart, e: weekEnd })
      .andWhere("rv.statut != 'annule'")
      .getRawMany();
    const bookingsThisWeek = bucketByWeekday(weekRows.map((r) => parseRawDatetime(r.date_heure)), weekStart);

    const totalClients = await this.clients.count();
    const bookedAgg = await this.rendezVous.createQueryBuilder('rv')
      .select('COUNT(DISTINCT rv.client_id)', 'c')
      .andWhere("rv.statut != 'annule'")
      .getRawOne();
    const bookedClientsCount = Number(bookedAgg.c);
    const conversionRatePct = totalClients > 0 ? round1((bookedClientsCount / totalClients) * 100) : 0;

    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const recentClients = await this.clients.find({ where: { created_at: MoreThanOrEqual(thirtyDaysAgo) } });
    let activationRatePct = 0;
    if (recentClients.length > 0) {
      const recentIds = recentClients.map((c) => c.id);
      const activatedAgg = await this.rendezVous.createQueryBuilder('rv')
        .select('COUNT(DISTINCT rv.client_id)', 'c')
        .where('rv.client_id IN (:...ids)', { ids: recentIds })
        .andWhere("rv.statut != 'annule'")
        .getRawOne();
      activationRatePct = round1((Number(activatedAgg.c) / recentClients.length) * 100);
    }

    const firstBookingRows = await this.rendezVous.createQueryBuilder('rv')
      .select('rv.client_id', 'client_id')
      .addSelect('MIN(rv.date_heure)', 'first_booking')
      .andWhere("rv.statut != 'annule'")
      .groupBy('rv.client_id')
      .getRawMany();
    let avgDaysToFirstBooking: number | null = null;
    if (firstBookingRows.length > 0) {
      const ids = firstBookingRows.map((r) => Number(r.client_id));
      const clientsById = new Map((await this.clients.findBy({ id: In(ids) })).map((c) => [c.id, c]));
      const diffs: number[] = [];
      for (const row of firstBookingRows) {
        const client = clientsById.get(Number(row.client_id));
        if (!client) continue;
        const days = (parseRawDatetime(row.first_booking).getTime() - new Date(client.created_at).getTime())
          / (1000 * 60 * 60 * 24);
        diffs.push(Math.max(0, days));
      }
      if (diffs.length > 0) {
        avgDaysToFirstBooking = round1(diffs.reduce((a, b) => a + b, 0) / diffs.length);
      }
    }

    return success({
      signups,
      bookings_this_week: bookingsThisWeek,
      conversion_rate_pct: conversionRatePct,
      activation_rate_pct: activationRatePct,
      avg_days_to_first_booking: avgDaysToFirstBooking,
      funnel: { visiteurs: null, inscrits: totalClients, a_reserve: bookedClientsCount },
    });
  }

  async retention() {
    const clientRows = await this.clients.createQueryBuilder('c')
      .select('c.id', 'id')
      .addSelect(CLIENT_MONTH_EXPR, 'cohort_month')
      .getRawMany();

    const cohortMap = new Map<string, number[]>();
    for (const row of clientRows) {
      const key = String(row.cohort_month);
      if (!cohortMap.has(key)) cohortMap.set(key, []);
      cohortMap.get(key)!.push(Number(row.id));
    }
    const cohortMonths = [...cohortMap.keys()].sort().slice(-this.COHORT_COUNT);

    const allIds = cohortMonths.flatMap((month) => cohortMap.get(month)!);
    const bookingMonthsByClient = new Map<number, Set<string>>();
    if (allIds.length > 0) {
      const bookingRows = await this.rendezVous.createQueryBuilder('rv')
        .select('rv.client_id', 'client_id')
        .addSelect(RDV_MONTH_EXPR, 'booking_month')
        .where('rv.client_id IN (:...ids)', { ids: allIds })
        .andWhere("rv.statut != 'annule'")
        .groupBy('rv.client_id')
        .addGroupBy('booking_month')
        .getRawMany();
      for (const row of bookingRows) {
        const cid = Number(row.client_id);
        if (!bookingMonthsByClient.has(cid)) bookingMonthsByClient.set(cid, new Set());
        bookingMonthsByClient.get(cid)!.add(String(row.booking_month));
      }
    }

    const nowYm = currentYearMonth();
    const retainedCountAt = (cohortMonth: string, offset: number): number | null => {
      const targetMonth = addMonthsToYearMonth(cohortMonth, offset);
      if (targetMonth > nowYm) return null;
      const ids = cohortMap.get(cohortMonth)!;
      return ids.filter((id) => bookingMonthsByClient.get(id)?.has(targetMonth)).length;
    };

    const cohorts = cohortMonths.map((cohortMonth) => {
      const ids = cohortMap.get(cohortMonth)!;
      const size = ids.length;
      const row: { cohort: string; size: number; [key: string]: number | string | null } = {
        cohort: cohortMonth, size,
      };
      for (const offset of this.MONTH_OFFSETS) {
        const retained = retainedCountAt(cohortMonth, offset);
        row[`m${offset}`] = retained === null ? null : (size > 0 ? round1((retained / size) * 100) : 0);
      }
      return row;
    });

    const overallByOffset: Record<number, number | null> = {};
    for (const offset of this.MONTH_OFFSETS) {
      let retainedSum = 0;
      let sizeSum = 0;
      for (const cohortMonth of cohortMonths) {
        const retained = retainedCountAt(cohortMonth, offset);
        if (retained === null) continue;
        retainedSum += retained;
        sizeSum += cohortMap.get(cohortMonth)!.length;
      }
      overallByOffset[offset] = sizeSum > 0 ? round1((retainedSum / sizeSum) * 100) : null;
    }
    const curve = [
      { offset: 'M0', pct: 100 },
      ...this.MONTH_OFFSETS.map((o) => ({ offset: `M${o}`, pct: overallByOffset[o] })),
    ];

    const bookingCountRows = await this.rendezVous.createQueryBuilder('rv')
      .select('rv.client_id', 'client_id')
      .addSelect('COUNT(rv.id)', 'count')
      .andWhere("rv.statut != 'annule'")
      .groupBy('rv.client_id')
      .getRawMany();
    const buckets = [
      { label: '1 séance', min: 1, max: 1, count: 0 },
      { label: '2 à 3 séances', min: 2, max: 3, count: 0 },
      { label: '4 à 6 séances', min: 4, max: 6, count: 0 },
      { label: '7 séances et +', min: 7, max: Infinity, count: 0 },
    ];
    let bookedClientsTotal = 0;
    let repeatClientsCount = 0;
    for (const row of bookingCountRows) {
      const c = Number(row.count);
      bookedClientsTotal += 1;
      if (c > 1) repeatClientsCount += 1;
      const bucket = buckets.find((b) => c >= b.min && c <= b.max);
      if (bucket) bucket.count += 1;
    }
    const repeatBookings = buckets.map((b) => ({
      label: b.label,
      count: b.count,
      pct: bookedClientsTotal > 0 ? round1((b.count / bookedClientsTotal) * 100) : 0,
    }));
    const repeatRatePct = bookedClientsTotal > 0 ? round1((repeatClientsCount / bookedClientsTotal) * 100) : 0;

    const clvRows = await this.paiements.createQueryBuilder('p')
      .select('p.client_id', 'client_id')
      .addSelect('SUM(p.montant_brut)', 'total')
      .where("p.statut = 'paid'")
      .groupBy('p.client_id')
      .getRawMany();
    const avgLifetimeValue = clvRows.length > 0
      ? Math.round((clvRows.reduce((s, r) => s + Number(r.total), 0) / clvRows.length) * 100) / 100
      : 0;

    const retention90 = overallByOffset[3];
    const churnRatePct = retention90 != null ? round1(100 - retention90) : null;

    return success({
      cohorts,
      overall: {
        retention_30j_pct: overallByOffset[1],
        retention_90j_pct: overallByOffset[3],
        retention_12m_pct: overallByOffset[12],
        curve,
      },
      repeat_bookings: repeatBookings,
      repeat_rate_pct: repeatRatePct,
      avg_lifetime_value: avgLifetimeValue,
      churn_rate_pct: churnRatePct,
      churn_reasons: null,
    });
  }
}
