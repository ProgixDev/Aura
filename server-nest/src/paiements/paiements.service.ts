import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository, SelectQueryBuilder } from 'typeorm';
import { Paiement } from '../database/entities/paiement.entity';
import { Client } from '../database/entities/client.entity';
import { Praticien } from '../database/entities/praticien.entity';
import { success } from '../common/envelope';
import { parsePagination, paginateQb } from '../common/pagination';
import { euro, exportTimestamp, formatDateFr, formatDateTimeFr, numberFormat } from '../common/format';

const MONTH_EXPR = "SUBSTR(CAST(p.date_paiement AS CHAR), 1, 7)";

@Injectable()
export class PaiementsService {
  constructor(
    @InjectRepository(Paiement) private readonly paiements: Repository<Paiement>,
    @InjectRepository(Client) private readonly clients: Repository<Client>,
    @InjectRepository(Praticien) private readonly praticiens: Repository<Praticien>,
  ) {}

  private baseQb(): SelectQueryBuilder<Paiement> {
    return this.paiements.createQueryBuilder('p')
      .leftJoinAndSelect('p.client', 'client')
      .leftJoinAndSelect('p.praticien', 'praticien');
  }

  private applyCommonFilters(qb: SelectQueryBuilder<Paiement>, query: Record<string, any>) {
    if (query.statut !== undefined) qb.andWhere('p.statut = :st', { st: query.statut });
    if (query.moyen_paiement !== undefined) {
      qb.andWhere('p.moyen_paiement LIKE :mp', { mp: `%${query.moyen_paiement}%` });
    }
    if (query.date_debut !== undefined) {
      qb.andWhere('DATE(p.date_paiement) >= :dd', { dd: query.date_debut });
    }
    if (query.date_fin !== undefined) {
      qb.andWhere('DATE(p.date_paiement) <= :df', { df: query.date_fin });
    }
    return qb;
  }

  private applySort(qb: SelectQueryBuilder<Paiement>, query: Record<string, any>) {
    const sortBy = ['date_paiement', 'montant_brut', 'created_at', 'statut', 'reference']
      .includes(query.sort_by) ? query.sort_by : 'date_paiement';
    const sortOrder = String(query.sort_order).toLowerCase() === 'asc' ? 'ASC' : 'DESC';
    return qb.orderBy(`p.${sortBy}`, sortOrder);
  }

  async index(client: Client, query: Record<string, any>) {
    const { page, perPage } = parsePagination(query, 15);
    const filtered = () => {
      const qb = this.applyCommonFilters(
        this.baseQb().where('p.client_id = :cid', { cid: client.id }), query,
      );
      if (query.search !== undefined) {
        qb.andWhere(
          '(p.reference LIKE :q OR client.firstname LIKE :q OR client.lastname LIKE :q OR praticien.firstname LIKE :q OR praticien.lastname LIKE :q)',
          { q: `%${query.search}%` },
        );
      }
      return qb;
    };
    const { data, pagination } = await paginateQb(this.applySort(filtered(), query), page, perPage);

    const agg = await filtered()
      .select('COUNT(p.id)', 'count')
      .addSelect('COALESCE(SUM(p.montant_brut),0)', 'brut')
      .addSelect('COALESCE(SUM(p.commission),0)', 'com')
      .addSelect('COALESCE(SUM(p.montant_net_praticien),0)', 'net')
      .getRawOne();
    const parMoyen = await filtered()
      .select('p.moyen_paiement', 'moyen_paiement')
      .addSelect('COUNT(p.id)', 'count')
      .addSelect('COALESCE(SUM(p.montant_brut),0)', 'total')
      .groupBy('p.moyen_paiement').getRawMany();

    return success(data, undefined, {
      pagination,
      statistiques: {
        total_paiements: Number(agg.count),
        total_montant: Number(agg.brut),
        total_commission: Number(agg.com),
        total_net: Number(agg.net),
        par_moyen: parMoyen.map((r) => ({
          moyen_paiement: r.moyen_paiement, count: Number(r.count), total: Number(r.total),
        })),
      },
    });
  }

  async show(client: Client, id: number) {
    const paiement = await this.baseQb()
      .where('p.client_id = :cid AND p.id = :id', { cid: client.id, id }).getOne();
    if (!paiement) throw new NotFoundException({ status: 'error', message: 'Paiement non trouvé' });
    return success(paiement);
  }

  async exportComptable(client: Client, query: Record<string, any>) {
    const qb = this.baseQb()
      .where('p.client_id = :cid', { cid: client.id })
      .andWhere("p.statut = 'paid'");
    if (query.date_debut !== undefined) qb.andWhere('DATE(p.date_paiement) >= :dd', { dd: query.date_debut });
    if (query.date_fin !== undefined) qb.andWhere('DATE(p.date_paiement) <= :df', { df: query.date_fin });
    if (query.mois !== undefined && query.annee !== undefined) {
      qb.andWhere(`${MONTH_EXPR} = :ym`, {
        ym: `${query.annee}-${String(query.mois).padStart(2, '0')}`,
      });
    }
    const rows = await qb.orderBy('p.date_paiement', 'DESC').getMany();
    const sum = (f: (p: Paiement) => number) => rows.reduce((a, p) => a + f(p), 0);
    return success({
      periode: { debut: query.date_debut ?? null, fin: query.date_fin ?? null },
      total_transactions: rows.length,
      total_brut: sum((p) => p.montant_brut),
      total_commission: sum((p) => p.commission),
      total_net: sum((p) => p.montant_net_praticien),
      transactions: rows.map((p) => ({
        reference: p.reference,
        date: formatDateFr(p.date_paiement),
        client: `${p.client.firstname} ${p.client.lastname}`,
        praticien: p.praticien ? `${p.praticien.firstname} ${p.praticien.lastname}` : 'N/A',
        brut: euro(p.montant_brut),
        commission: euro(p.commission),
        net_praticien: euro(p.montant_net_praticien),
        moyen: p.moyen_paiement,
        statut: p.statut,
      })),
    });
  }

  async adminIndex(query: Record<string, any>) {
    const { page, perPage } = parsePagination(query, 15);
    const qb = this.applyCommonFilters(this.baseQb(), query);
    if (query.client_id !== undefined) qb.andWhere('p.client_id = :cid', { cid: query.client_id });
    if (query.praticien_id !== undefined) qb.andWhere('p.praticien_id = :pid', { pid: query.praticien_id });
    if (query.search !== undefined) {
      qb.andWhere(
        '(p.reference LIKE :q OR client.firstname LIKE :q OR client.lastname LIKE :q OR client.email LIKE :q OR praticien.firstname LIKE :q OR praticien.lastname LIKE :q)',
        { q: `%${query.search}%` },
      );
    }
    const { data, pagination } = await paginateQb(this.applySort(qb, query), page, perPage);
    return success(data, undefined, { pagination });
  }

  async adminStatistics(query: Record<string, any>) {
    const filtered = () => this.applyCommonFilters(
      this.paiements.createQueryBuilder('p'),
      { date_debut: query.date_debut, date_fin: query.date_fin },
    );
    const agg = await filtered()
      .select('COUNT(p.id)', 'count')
      .addSelect('COALESCE(SUM(p.montant_brut),0)', 'brut')
      .addSelect('COALESCE(SUM(p.commission),0)', 'com')
      .addSelect('COALESCE(SUM(p.montant_net_praticien),0)', 'net')
      .getRawOne();
    const grouped = async (col: string, key: string) =>
      (await filtered()
        .select(`p.${col}`, key).addSelect('COUNT(p.id)', 'count')
        .addSelect('COALESCE(SUM(p.montant_brut),0)', 'total')
        .groupBy(`p.${col}`).getRawMany())
        .map((r) => ({ [key]: r[key], count: Number(r.count), total: Number(r.total) }));
    const parMois = (await filtered()
      .select(MONTH_EXPR, 'mois').addSelect('COUNT(p.id)', 'count')
      .addSelect('COALESCE(SUM(p.montant_brut),0)', 'total')
      .groupBy('mois').orderBy('mois', 'DESC').limit(12).getRawMany())
      .map((r) => ({ mois: r.mois, count: Number(r.count), total: Number(r.total) }));

    const topBy = async (col: 'client_id' | 'praticien_id') =>
      filtered()
        .select(`p.${col}`, col).addSelect('COUNT(p.id)', 'count')
        .addSelect('COALESCE(SUM(p.montant_brut),0)', 'total')
        .groupBy(`p.${col}`).orderBy('total', 'DESC').limit(5).getRawMany();
    const topClientsRaw = await topBy('client_id');
    const topPraticiensRaw = await topBy('praticien_id');
    const clientById = new Map(
      (await this.clients.findBy({ id: In(topClientsRaw.map((r) => r.client_id).filter(Boolean)) }))
        .map((c) => [c.id, c]),
    );
    const praticienById = new Map(
      (await this.praticiens.findBy({ id: In(topPraticiensRaw.map((r) => r.praticien_id).filter(Boolean)) }))
        .map((p) => [p.id, p]),
    );

    return success({
      general: {
        total_transactions: Number(agg.count),
        montant_total: Number(agg.brut),
        commission_totale: Number(agg.com),
        net_total: Number(agg.net),
      },
      par_statut: await grouped('statut', 'statut'),
      par_moyen: await grouped('moyen_paiement', 'moyen_paiement'),
      par_mois: parMois,
      top_clients: topClientsRaw.map((r) => ({
        client_id: r.client_id, count: Number(r.count), total: Number(r.total),
        client: clientById.get(r.client_id) ?? null,
      })),
      top_praticiens: topPraticiensRaw.map((r) => ({
        praticien_id: r.praticien_id, count: Number(r.count), total: Number(r.total),
        praticien: praticienById.get(r.praticien_id) ?? null,
      })),
    });
  }

  private async paidRows(query: Record<string, any>): Promise<Paiement[]> {
    const qb = this.baseQb().where("p.statut = 'paid'");
    if (query.date_debut !== undefined) qb.andWhere('DATE(p.date_paiement) >= :dd', { dd: query.date_debut });
    if (query.date_fin !== undefined) qb.andWhere('DATE(p.date_paiement) <= :df', { df: query.date_fin });
    return qb.orderBy('p.date_paiement', 'DESC').getMany();
  }

  async adminExport(query: Record<string, any>) {
    const rows = await this.paidRows(query);
    const sum = (f: (p: Paiement) => number) => rows.reduce((a, p) => a + f(p), 0);
    return success({
      periode: { debut: query.date_debut ?? 'Toutes', fin: query.date_fin ?? 'Toutes' },
      date_export: formatDateTimeFr(new Date()),
      total_transactions: rows.length,
      montant_total_brut: euro(sum((p) => p.montant_brut)),
      commission_totale: euro(sum((p) => p.commission)),
      net_total: euro(sum((p) => p.montant_net_praticien)),
      transactions: rows.map((p) => ({
        reference: p.reference,
        date: formatDateFr(p.date_paiement),
        client: `${p.client.firstname} ${p.client.lastname}`,
        praticien: p.praticien ? `${p.praticien.firstname} ${p.praticien.lastname}` : 'N/A',
        brut: euro(p.montant_brut),
        commission: euro(p.commission),
        net_praticien: euro(p.montant_net_praticien),
        moyen: p.moyen_paiement,
      })),
    });
  }

  async adminExportCsv(query: Record<string, any>) {
    const rows = await this.paidRows(query);
    const header = 'Référence;Date;Client;Email Client;Praticien;Brut (€);Commission (€);Net Praticien (€);Moyen de paiement;Statut';
    const lines = rows.map((p) => [
      p.reference,
      formatDateFr(p.date_paiement),
      `${p.client.firstname} ${p.client.lastname}`,
      p.client.email,
      p.praticien ? `${p.praticien.firstname} ${p.praticien.lastname}` : 'N/A',
      numberFormat(p.montant_brut),
      numberFormat(p.commission),
      numberFormat(p.montant_net_praticien),
      p.moyen_paiement,
      p.statut,
    ].join(';'));
    return success({
      filename: `export_paiements_${exportTimestamp()}.csv`,
      csv: [header, ...lines].join('\n'),
      total: rows.length,
    });
  }

  async destroy(id: number) {
    const paiement = await this.paiements.findOneBy({ id });
    if (!paiement) throw new NotFoundException({ status: 'error', message: 'Paiement non trouvé' });
    await this.paiements.softDelete(id);
    return success(undefined, 'Paiement supprimé avec succès');
  }
}
