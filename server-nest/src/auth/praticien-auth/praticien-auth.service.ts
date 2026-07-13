import {
  ForbiddenException, Injectable, NotFoundException,
  UnauthorizedException, UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import type { Request } from 'express';
import { User } from '../../database/entities/user.entity';
import { Praticien } from '../../database/entities/praticien.entity';
import { PraticienDocument } from '../../database/entities/praticien-document.entity';
import { HashService } from '../hash.service';
import { TokenService } from '../token.service';
import { sanitizeUser } from '../user.util';
import { success } from '../../common/envelope';
import { StorageService } from '../../common/storage.service';
import { assertUpload } from '../../common/upload.util';
import { RegisterPraticienDto } from './dto/register-praticien.dto';
import { LoginDto } from '../admin-auth/dto/login.dto';

export const DOC_TYPES = ['piece_identite', 'certification', 'assurance', 'domicile', 'charte'] as const;

@Injectable()
export class PraticienAuthService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Praticien) private readonly praticiens: Repository<Praticien>,
    private readonly dataSource: DataSource,
    private readonly hash: HashService,
    private readonly tokens: TokenService,
    private readonly storage: StorageService,
  ) {}

  private validationError(errors: Record<string, string[]>): never {
    throw new UnprocessableEntityException({
      status: 'error', message: 'Erreur de validation', errors,
    });
  }

  async register(dto: RegisterPraticienDto, files: Record<string, Express.Multer.File[]>) {
    const docErrors: Record<string, string[]> = {};
    for (const type of DOC_TYPES) {
      const file = files[`documents[${type}]`]?.[0];
      if (!file) {
        docErrors[`documents.${type}`] = [`Le document ${type} est requis.`];
        continue;
      }
      assertUpload(file, `documents.${type}`, ['jpg', 'jpeg', 'png', 'pdf']);
    }
    if (Object.keys(docErrors).length) this.validationError(docErrors);

    if (await this.users.findOneBy({ email: dto.email })) {
      this.validationError({ email: ['Cette adresse email est déjà utilisée.'] });
    }
    if (await this.praticiens.findOneBy({ email: dto.email })) {
      this.validationError({ email: ['Cette adresse email est déjà utilisée.'] });
    }

    // Deliberate fix vs. the Laravel original: this whole block runs in ONE transaction.
    // Laravel's PraticienAuthController::register had no DB transaction, so a mid-way
    // failure (e.g. 3rd file upload throws) left orphaned User/Praticien rows behind.
    const { user, praticien, documentsUploaded } = await this.dataSource.transaction(async (em) => {
      const user = await em.getRepository(User).save({
        name: `${dto.firstname} ${dto.lastname}`,
        email: dto.email,
        password: await this.hash.hash(dto.password),
        is_admin: false,
      });
      const praticien = await em.getRepository(Praticien).save({
        firstname: dto.firstname, lastname: dto.lastname, email: dto.email,
        telephone: dto.telephone, ville: dto.ville, niveau: dto.niveau,
        specialite: dto.specialite, mode: dto.mode, status: 'actif',
        tarif: dto.tarif, experience: dto.experience, bio: dto.bio,
        statut_verification: 'en_attente', date_inscription: new Date(),
      });
      // Note: file writes below happen inside this DB transaction, but
      // `storage.save()` writes to disk, not to the DB — it is NOT rolled
      // back if a later iteration throws. A mid-loop failure rolls back the
      // User/Praticien/PraticienDocument rows but leaves files from earlier
      // iterations orphaned on disk. Accepted tradeoff for now (rare path,
      // cheap to clean up out-of-band) — not a bug to "fix" by moving writes
      // out of the transaction; that's a separate follow-up.
      let documentsUploaded = 0;
      for (const type of DOC_TYPES) {
        const file = files[`documents[${type}]`][0];
        const chemin = await this.storage.save(file, `praticiens/${praticien.id}/documents`);
        await em.getRepository(PraticienDocument).save({
          praticien_id: praticien.id, type,
          nom_fichier: file.originalname, chemin,
          mime_type: file.mimetype, taille: file.size, statut: 'en_attente',
        });
        documentsUploaded++;
      }
      return { user, praticien, documentsUploaded };
    });

    return success(
      {
        user: sanitizeUser(user),
        praticien,
        ...this.tokens.tokenPayload(user),
        documents_soumis: documentsUploaded,
        documents_requis: 5,
      },
      "Votre compte a été créé avec succès. En attente de vérification par l'administrateur.",
    );
  }

  async login(dto: LoginDto, req: Request) {
    const user = await this.users.findOneBy({ email: dto.email });
    if (!user || !(await this.hash.compare(dto.password, user.password))) {
      throw new UnauthorizedException({ status: 'error', message: 'Les identifiants sont incorrects.' });
    }
    const praticien = await this.praticiens.findOneBy({ email: user.email });
    if (!praticien) {
      throw new ForbiddenException({
        status: 'error',
        message: "Vous n'êtes pas autorisé à vous connecter en tant que praticien.",
      });
    }
    if (praticien.statut_verification === 'rejete') {
      throw new ForbiddenException({
        status: 'error',
        message: `Votre compte a été rejeté. Motif : ${praticien.motif_rejet ?? 'Non spécifié'}`,
        motif_rejet: praticien.motif_rejet,
      });
    }
    await this.users.update(user.id, { last_login_at: new Date(), ip_address: req.ip });
    const fresh = await this.users.findOneByOrFail({ id: user.id });
    return success(
      {
        user: sanitizeUser(fresh),
        praticien,
        ...this.tokens.tokenPayload(fresh),
        verification_status: praticien.statut_verification,
        is_verified: praticien.statut_verification === 'valide',
      },
      'Connexion réussie',
    );
  }

  logout() { return success(undefined, 'Déconnexion réussie'); }
  refresh(user: User) { return success(this.tokens.tokenPayload(user)); }

  async profile(user: User) {
    const praticien = await this.praticiens.findOne({
      where: { email: user.email },
      relations: { documents: true, verifiePar: true },
    });
    if (!praticien) {
      throw new NotFoundException({ status: 'error', message: 'Profil praticien non trouvé' });
    }
    const docs = praticien.documents ?? [];
    return success({
      user: sanitizeUser(user),
      praticien,
      documents_stats: {
        total: docs.length,
        en_attente: docs.filter((d) => d.statut === 'en_attente').length,
        valide: docs.filter((d) => d.statut === 'valide').length,
        rejete: docs.filter((d) => d.statut === 'rejete').length,
      },
    });
  }

  checkToken(user: User) {
    return success({ user: sanitizeUser(user), is_admin: user.is_admin }, 'Token valide');
  }
}
