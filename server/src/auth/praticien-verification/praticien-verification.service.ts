import { Injectable, NotFoundException, StreamableFile } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import type { Response } from 'express';
import { Praticien } from '../../database/entities/praticien.entity';
import { PraticienDocument } from '../../database/entities/praticien-document.entity';
import { User } from '../../database/entities/user.entity';
import { StorageService } from '../../common/storage.service';
import { AuditLogService } from '../../audit-log/audit-log.service';
import { success } from '../../common/envelope';
import { parsePagination, paginateQb } from '../../common/pagination';
import { VerifyDocumentsDto } from './dto/verify-documents.dto';
import { RejectPraticienDto } from './dto/reject-praticien.dto';
import { DOC_TYPES } from '../praticien-auth/praticien-auth.service';

const DOC_LABELS: Record<string, string> = {
  piece_identite: "Pièce d'identité", certification: 'Certification',
  assurance: 'Assurance', domicile: 'Justificatif de domicile', charte: 'Charte signée',
};

// The only content types a verification document is ever legitimately submitted as.
// See file() below — doc.mime_type is attacker-controlled at upload time.
const SAFE_DOCUMENT_MIME_TYPES = new Set([
  'application/pdf', 'image/jpeg', 'image/png', 'image/webp',
]);

@Injectable()
export class PraticienVerificationService {
  constructor(
    @InjectRepository(Praticien) private readonly praticiens: Repository<Praticien>,
    @InjectRepository(PraticienDocument) private readonly documents: Repository<PraticienDocument>,
    private readonly storage: StorageService,
    private readonly auditLog: AuditLogService,
  ) {}

  private notFound(message: string): never {
    throw new NotFoundException({ status: 'error', message });
  }

  private async findPending(id: number): Promise<Praticien | null> {
    return this.praticiens.findOneBy({
      id, statut_verification: In(['en_attente', 'en_cours']),
    });
  }

  async index(query: Record<string, any>) {
    const { page, perPage } = parsePagination(query, 15);
    const qb = this.praticiens.createQueryBuilder('p')
      .leftJoinAndSelect('p.documents', 'documents')
      .leftJoinAndSelect('p.verifiePar', 'verifiePar')
      .where('p.statut_verification IN (:...sts)', { sts: ['en_attente', 'en_cours'] });
    if (query.statut !== undefined) {
      qb.andWhere('p.statut_verification = :statut', { statut: query.statut });
    }
    if (query.search !== undefined) {
      qb.andWhere(
        '(p.firstname LIKE :s OR p.lastname LIKE :s OR p.email LIKE :s OR p.ville LIKE :s OR p.specialite LIKE :s)',
        { s: `%${query.search}%` },
      );
    }
    qb.orderBy('p.created_at', 'ASC');
    const { data, pagination } = await paginateQb(qb, page, perPage);
    const count = (st: string) => this.praticiens.countBy({ statut_verification: st });
    return success(data, undefined, {
      pagination,
      statistiques: {
        total_attente: await count('en_attente'),
        total_en_cours: await count('en_cours'),
        total_valide: await count('valide'),
        total_rejete: await count('rejete'),
      },
    });
  }

  async show(id: number) {
    const praticien = await this.praticiens.findOne({
      where: { id }, relations: { documents: true, verifiePar: true },
    });
    if (!praticien) this.notFound('Praticien non trouvé');
    const docs = praticien.documents ?? [];
    const documents: Record<string, unknown> = {};
    for (const type of DOC_TYPES) {
      const doc = docs.find((d) => d.type === type);
      documents[type] = {
        label: DOC_LABELS[type],
        soumis: !!doc,
        statut: doc?.statut ?? 'manquant',
        nom_fichier: doc?.nom_fichier ?? null,
        chemin: doc?.chemin ?? null,
        id: doc?.id ?? null,
      };
    }
    return success({
      praticien,
      documents,
      resume_documents: {
        soumis: docs.length,
        en_attente: docs.filter((d) => d.statut === 'en_attente').length,
        valides: docs.filter((d) => d.statut === 'valide').length,
        rejetes: docs.filter((d) => d.statut === 'rejete').length,
        manquants: 5 - docs.length,
      },
    });
  }

  async verify(id: number, dto: VerifyDocumentsDto, admin: User) {
    const praticien = await this.findPending(id);
    if (!praticien) this.notFound('Praticien non trouvé ou déjà vérifié');

    for (const item of dto.documents) {
      const doc = await this.documents.findOneBy({ id: item.id, praticien_id: id });
      if (doc) {
        await this.documents.update(doc.id, {
          statut: item.statut,
          commentaire_rejet: item.commentaire_rejet ?? null,
          verifie_a: new Date(),
          verifie_par: admin.id,
        });
      }
    }

    const all = await this.documents.findBy({ praticien_id: id });
    const valides = all.filter((d) => d.statut === 'valide').length;
    const anyRejete = all.some((d) => d.statut === 'rejete');
    let statutFinal = 'en_cours';
    let motifRejet: string | null = null;
    if (all.length === 5 && valides === 5) statutFinal = 'valide';
    else if (anyRejete) {
      statutFinal = 'rejete';
      motifRejet = dto.commentaire_global ?? 'Documents rejetés';
    }
    await this.praticiens.update(id, {
      statut_verification: statutFinal,
      verifie_a: statutFinal === 'valide' ? new Date() : null,
      verifie_par: admin.id,
      motif_rejet: motifRejet,
    });
    const fresh = await this.praticiens.findOne({
      where: { id }, relations: { documents: true, verifiePar: true },
    });
    const message =
      statutFinal === 'valide' ? 'Praticien validé avec succès'
      : statutFinal === 'rejete' ? 'Praticien rejeté'
      : 'Vérification en cours';
    await this.auditLog.record(
      admin,
      statutFinal === 'valide' ? 'a vérifié un praticien'
        : statutFinal === 'rejete' ? 'a rejeté un praticien'
        : 'a mis à jour la vérification d’un praticien',
      { type: 'praticien', id, label: `${praticien.firstname} ${praticien.lastname}` },
      'verification',
      { statut_final: statutFinal },
    );
    return success(fresh, message);
  }

  async reject(id: number, dto: RejectPraticienDto, admin: User) {
    const praticien = await this.findPending(id);
    if (!praticien) this.notFound('Praticien non trouvé ou déjà vérifié');
    await this.praticiens.update(id, {
      statut_verification: 'rejete', motif_rejet: dto.motif_rejet, verifie_par: admin.id,
    });
    await this.documents.update({ praticien_id: id }, {
      statut: 'rejete',
      commentaire_rejet: 'Rejeté suite à la décision administrative',
      verifie_a: new Date(),
      verifie_par: admin.id,
    });
    const fresh = await this.praticiens.findOne({
      where: { id }, relations: { documents: true, verifiePar: true },
    });
    await this.auditLog.record(
      admin,
      'a rejeté un praticien',
      { type: 'praticien', id, label: `${praticien.firstname} ${praticien.lastname}` },
      'verification',
      { motif_rejet: dto.motif_rejet },
    );
    return success(fresh, 'Praticien rejeté avec succès');
  }

  async relance(id: number) {
    const praticien = await this.findPending(id);
    if (!praticien) this.notFound('Praticien non trouvé');
    const docs = await this.documents.findBy({ praticien_id: id });
    return success(
      {
        praticien,
        documents_manquants: 5 - docs.length,
        documents_en_attente: docs.filter((d) => d.statut === 'en_attente').length,
      },
      'Relance envoyée avec succès',
    );
  }

  async statistics() {
    const count = (st?: string) =>
      st ? this.praticiens.countBy({ statut_verification: st }) : this.praticiens.count();
    const docCount = (st?: string) =>
      st ? this.documents.countBy({ statut: st }) : this.documents.count();
    const parSpecialite = await this.praticiens.createQueryBuilder('p')
      .select('p.specialite', 'specialite').addSelect('COUNT(*)', 'count')
      .groupBy('p.specialite').getRawMany();
    const derniersInscrits = await this.praticiens.find({
      relations: { verifiePar: true },
      order: { created_at: 'DESC' },
      take: 5,
      select: ['id', 'firstname', 'lastname', 'email', 'statut_verification', 'created_at'],
    });
    return success({
      total: await count(),
      en_attente: await count('en_attente'),
      en_cours: await count('en_cours'),
      valide: await count('valide'),
      rejete: await count('rejete'),
      documents: {
        total: await docCount(),
        en_attente: await docCount('en_attente'),
        valide: await docCount('valide'),
        rejete: await docCount('rejete'),
      },
      par_specialite: parSpecialite.map((r) => ({ ...r, count: Number(r.count) })),
      derniers_inscrits: derniersInscrits,
    });
  }

  async file(docId: number, res: Response): Promise<StreamableFile> {
    const doc = await this.documents.findOneBy({ id: docId });
    if (!doc) this.notFound('Document non trouvé');
    // doc.mime_type is client-supplied at upload time (the unauthenticated praticien
    // registration flow has no fileFilter) — never trust it verbatim for the response
    // Content-Type, or a malicious upload claiming e.g. text/html would execute as a
    // script in this admin origin the moment a reviewer opens it. Only ever serve back
    // a type this route is actually meant to display; anything else degrades to a safe,
    // inert binary type. X-Content-Type-Options blocks browsers from sniffing past that.
    const contentType = SAFE_DOCUMENT_MIME_TYPES.has(doc.mime_type ?? '')
      ? doc.mime_type
      : 'application/octet-stream';
    res.set({
      'Content-Type': contentType,
      'X-Content-Type-Options': 'nosniff',
      'Content-Disposition': `inline; filename="${doc.nom_fichier}"`,
    });
    return new StreamableFile(await this.storage.download(doc.chemin));
  }
}
