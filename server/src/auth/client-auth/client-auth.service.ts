import {
  BadRequestException, ForbiddenException, Injectable, UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import type { Request } from 'express';
import { User } from '../../database/entities/user.entity';
import { Client } from '../../database/entities/client.entity';
import { HashService } from '../hash.service';
import { TokenService } from '../token.service';
import { sanitizeUser } from '../user.util';
import { success } from '../../common/envelope';
import { StorageService } from '../../common/storage.service';
import { assertUpload } from '../../common/upload.util';
import { RegisterClientDto } from './dto/register-client.dto';
import { LoginDto } from '../admin-auth/dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { UpdateClientProfileDto } from './dto/update-client-profile.dto';
import { ChangeClientPasswordDto } from './dto/change-client-password.dto';

@Injectable()
export class ClientAuthService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Client) private readonly clients: Repository<Client>,
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

  async register(dto: RegisterClientDto) {
    if (await this.users.findOneBy({ email: dto.email })) {
      this.validationError({ email: ['Cette adresse email est déjà utilisée.'] });
    }
    if (await this.clients.findOneBy({ email: dto.email })) {
      this.validationError({ email: ['Cette adresse email est déjà utilisée.'] });
    }

    // One transaction so a mid-way failure never leaves an orphaned User or
    // Client row behind — same fix praticien-auth.service.ts applies to its
    // User+Praticien dual-write.
    const { user, client } = await this.dataSource.transaction(async (em) => {
      const user = await em.getRepository(User).save({
        name: `${dto.firstname} ${dto.lastname}`,
        email: dto.email,
        password: await this.hash.hash(dto.password),
        is_admin: false,
      });
      const client = await em.getRepository(Client).save({
        firstname: dto.firstname,
        lastname: dto.lastname,
        email: dto.email,
        city: dto.city,
      });
      return { user, client };
    });

    return success(
      { user: sanitizeUser(user), client, ...this.tokens.tokenPayload(user) },
      'Compte créé avec succès',
    );
  }

  async login(dto: LoginDto, req: Request) {
    const user = await this.users.findOneBy({ email: dto.email });
    if (!user || !(await this.hash.compare(dto.password, user.password))) {
      throw new UnauthorizedException({ status: 'error', message: 'Les identifiants sont incorrects.' });
    }
    const client = await this.clients.findOneBy({ email: user.email });
    if (!client) {
      throw new ForbiddenException({
        status: 'error',
        message: "Vous n'êtes pas autorisé à vous connecter en tant que client.",
      });
    }
    await this.users.update(user.id, { last_login_at: new Date(), ip_address: req.ip });
    const fresh = await this.users.findOneByOrFail({ id: user.id });
    return success(
      { user: sanitizeUser(fresh), client, ...this.tokens.tokenPayload(fresh) },
      'Connexion réussie',
    );
  }

  logout() { return success(undefined, 'Déconnexion réussie'); }
  refresh(user: User) { return success(this.tokens.tokenPayload(user)); }

  profile(user: User, client: Client) {
    return success({ user: sanitizeUser(user), client });
  }

  checkToken(user: User, client: Client) {
    return success({ user: sanitizeUser(user), client }, 'Token client valide');
  }

  // Deliberately does not check whether the email exists, and does not send
  // anything yet (no email infrastructure decision has been made) — always
  // returns the same generic message so this endpoint cannot be used to
  // enumerate registered accounts.
  forgotPassword(_dto: ForgotPasswordDto) {
    return success(
      undefined,
      'Si un compte existe avec cette adresse email, vous recevrez un lien de réinitialisation.',
    );
  }

  async updateProfile(user: User, client: Client, dto: UpdateClientProfileDto) {
    if (dto.email !== undefined && dto.email !== user.email) {
      if (await this.users.findOneBy({ email: dto.email })) {
        this.validationError({ email: ['Cette adresse email est déjà utilisée.'] });
      }
    }

    // Same fix as register()'s dual-write: one transaction so a mid-way
    // failure never leaves the users/clients rows out of sync with each other.
    await this.dataSource.transaction(async (em) => {
      const clientUpdate: Partial<Client> = {};
      if (dto.firstname !== undefined) clientUpdate.firstname = dto.firstname;
      if (dto.lastname !== undefined) clientUpdate.lastname = dto.lastname;
      if (dto.email !== undefined) clientUpdate.email = dto.email;
      if (dto.phone !== undefined) clientUpdate.phone = dto.phone;
      if (dto.city !== undefined) clientUpdate.city = dto.city;
      if (Object.keys(clientUpdate).length) {
        await em.getRepository(Client).update(client.id, clientUpdate);
      }

      const userUpdate: Partial<User> = {};
      if (dto.email !== undefined) userUpdate.email = dto.email;
      if (dto.firstname !== undefined || dto.lastname !== undefined) {
        userUpdate.name = `${dto.firstname ?? client.firstname} ${dto.lastname ?? client.lastname}`;
      }
      if (Object.keys(userUpdate).length) {
        await em.getRepository(User).update(user.id, userUpdate);
      }
    });

    const freshUser = await this.users.findOneByOrFail({ id: user.id });
    const freshClient = await this.clients.findOneByOrFail({ id: client.id });
    return success({ user: sanitizeUser(freshUser), client: freshClient }, 'Profil mis à jour');
  }

  async uploadPhoto(user: User, client: Client, file?: Express.Multer.File) {
    if (!file) {
      throw new UnprocessableEntityException({
        status: 'error', message: 'Erreur de validation', errors: { photo: ['Une photo est requise.'] },
      });
    }
    assertUpload(file, 'photo', ['jpg', 'jpeg', 'png'], 2048);
    const photo = await this.storage.savePublic(file, `clients/${client.id}/avatar`);
    await this.clients.update(client.id, { photo });
    return success({ photo }, 'Photo de profil mise à jour');
  }

  async changePassword(user: User, dto: ChangeClientPasswordDto) {
    const fresh = await this.users.findOneByOrFail({ id: user.id });
    if (!(await this.hash.compare(dto.current_password, fresh.password))) {
      throw new BadRequestException({ status: 'error', message: 'Le mot de passe actuel est incorrect' });
    }
    await this.users.update(user.id, { password: await this.hash.hash(dto.new_password) });
    return success(undefined, 'Mot de passe mis à jour avec succès');
  }

  async deleteAccount(user: User, client: Client) {
    await this.dataSource.transaction(async (em) => {
      await em.getRepository(Client).delete(client.id);
      await em.getRepository(User).delete(user.id);
    });
    return success(undefined, 'Compte supprimé');
  }
}
