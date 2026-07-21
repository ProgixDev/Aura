import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Praticien } from '../database/entities/praticien.entity';
import { RendezVous } from '../database/entities/rendez-vous.entity';
import { Avis } from '../database/entities/avis.entity';
import { success } from '../common/envelope';

// Fixed daily slot grid offered by the booking UI on every non-Sunday day.
const SLOT_TIMES = ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00'];
const AVAILABILITY_WINDOW_DAYS = 14;
// Only these statuses actually hold a slot; 'annule' (or any other status) leaves it free.
const BLOCKING_STATUSES = ['en_attente', 'confirme'];

interface Slot { time: string; available: boolean }
interface DayAvailability { date: string; slots: Slot[] }

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

@Injectable()
export class PraticiensService {
  constructor(
    @InjectRepository(Praticien) private readonly praticiens: Repository<Praticien>,
    @InjectRepository(RendezVous) private readonly rendezVous: Repository<RendezVous>,
    @InjectRepository(Avis) private readonly avis: Repository<Avis>,
  ) {}

  // One grouped query for however many praticien ids are passed in (list or single-id detail
  // alike) — never one query per praticien. Only 'publié' avis count toward the aggregate;
  // en_attente/rejeté are excluded. Praticiens with no published avis default to rating 0 /
  // reviews_count 0. Returns plain objects (entity fields spread out) so callers can pass the
  // result straight into `success()` — additive only, every original field is preserved.
  async attachRatings<T extends Praticien>(
    list: T[],
  ): Promise<(T & { rating: number; reviews_count: number })[]> {
    if (list.length === 0) return [];

    const ids = list.map((p) => p.id);
    const rows = await this.avis.createQueryBuilder('a')
      .select('a.praticien_id', 'praticien_id')
      .addSelect('AVG(a.note)', 'avg_note')
      .addSelect('COUNT(*)', 'cnt')
      .where('a.praticien_id IN (:...ids)', { ids })
      .andWhere('a.statut = :st', { st: 'publié' })
      .groupBy('a.praticien_id')
      .getRawMany();

    const byId = new Map<number, { rating: number; reviews_count: number }>();
    for (const row of rows) {
      byId.set(Number(row.praticien_id), {
        rating: Math.round(Number(row.avg_note) * 10) / 10,
        reviews_count: Number(row.cnt),
      });
    }

    return list.map((p) => ({
      ...p,
      rating: byId.get(p.id)?.rating ?? 0,
      reviews_count: byId.get(p.id)?.reviews_count ?? 0,
    }));
  }

  async availability(id: number) {
    const praticien = await this.praticiens.findOne({ where: { id } });
    if (!praticien) {
      throw new NotFoundException({ status: 'error', message: 'Praticien introuvable' });
    }

    // Half-open [tomorrow 00:00 UTC, tomorrow+14 00:00 UTC) window. Booking requires at
    // least one day's lead time, so today is never offered — the earliest bookable day is
    // tomorrow. This repo buckets dates in UTC everywhere (see the driver note atop
    // analytics/analytics.utils.ts) so the grid stays deterministic and consistent across
    // the sqlite (test) and pg (prod, TZ=UTC) drivers alike — both the window boundaries
    // and the taken-slot keys below use UTC getters exclusively.
    const now = new Date();
    const windowStart = new Date(Date.UTC(
      now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0, 0,
    ));
    const windowEnd = new Date(windowStart.getTime() + AVAILABILITY_WINDOW_DAYS * 24 * 60 * 60 * 1000);

    const booked = await this.rendezVous.createQueryBuilder('rdv')
      .where('rdv.praticien_id = :id', { id })
      .andWhere('rdv.date_heure >= :start', { start: windowStart })
      .andWhere('rdv.date_heure < :end', { end: windowEnd })
      .andWhere('rdv.statut IN (:...statuts)', { statuts: BLOCKING_STATUSES })
      .getMany();

    // Entity hydration (getMany) already converts date_heure to a correct-instant Date for
    // both drivers, so plain UTC getters are enough here — no parseRawDatetime needed (that
    // helper is only for raw/aggregate query results that bypass hydration).
    const taken = new Set<string>();
    for (const rdv of booked) {
      const d = rdv.date_heure;
      const dateKey = `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
      const timeKey = `${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}`;
      taken.add(`${dateKey} ${timeKey}`);
    }

    const days: DayAvailability[] = [];
    for (let i = 0; i < AVAILABILITY_WINDOW_DAYS; i++) {
      const day = new Date(windowStart.getTime() + i * 24 * 60 * 60 * 1000);
      if (day.getUTCDay() === 0) continue; // Sunday: no slots offered at all
      const date = `${day.getUTCFullYear()}-${pad2(day.getUTCMonth() + 1)}-${pad2(day.getUTCDate())}`;
      const slots = SLOT_TIMES.map((time) => ({ time, available: !taken.has(`${date} ${time}`) }));
      days.push({ date, slots });
    }

    return success(days);
  }
}
