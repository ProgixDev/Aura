import {
  ForbiddenException, Injectable, UnauthorizedException, UnprocessableEntityException,
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
import { RegisterClientDto } from './dto/register-client.dto';
import { LoginDto } from '../admin-auth/dto/login.dto';

@Injectable()
export class ClientAuthService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Client) private readonly clients: Repository<Client>,
    private readonly dataSource: DataSource,
    private readonly hash: HashService,
    private readonly tokens: TokenService,
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
}
