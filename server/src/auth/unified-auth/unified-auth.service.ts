import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { Request } from 'express';
import { User } from '../../database/entities/user.entity';
import { Client } from '../../database/entities/client.entity';
import { Praticien } from '../../database/entities/praticien.entity';
import { HashService } from '../hash.service';
import { TokenService } from '../token.service';
import { sanitizeUser, pickUser } from '../user.util';
import { success } from '../../common/envelope';
import { LoginDto } from '../admin-auth/dto/login.dto';

@Injectable()
export class UnifiedAuthService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Client) private readonly clients: Repository<Client>,
    @InjectRepository(Praticien) private readonly praticiens: Repository<Praticien>,
    private readonly hash: HashService,
    private readonly tokens: TokenService,
  ) {}

  // The web app's single login form doesn't ask "client or admin?" up front — it
  // checks the same credentials against both account types and reports back
  // whichever one matched, same JWT shape either way (it's the same `users` row
  // regardless of role, see ClientGuard/AdminGuard). Mobile keeps its own
  // role-specific /client/login and /praticien/login — this endpoint doesn't
  // replace those, it only backs the web app's unified page.
  async login(dto: LoginDto, req: Request) {
    const user = await this.users.findOneBy({ email: dto.email });
    if (!user || !(await this.hash.compare(dto.password, user.password))) {
      throw new UnauthorizedException({ status: 'error', message: 'Les identifiants sont incorrects.' });
    }

    if (user.is_admin) {
      await this.users.update(user.id, { last_login_at: new Date(), ip_address: req.ip });
      const fresh = await this.users.findOneByOrFail({ id: user.id });
      return success(
        {
          role: 'admin' as const,
          user: pickUser(fresh, ['id', 'name', 'email', 'is_admin', 'role', 'last_login_at']),
          ...this.tokens.tokenPayload(fresh),
        },
        'Connexion réussie',
      );
    }

    const client = await this.clients.findOneBy({ email: user.email });
    if (client) {
      await this.users.update(user.id, { last_login_at: new Date(), ip_address: req.ip });
      const fresh = await this.users.findOneByOrFail({ id: user.id });
      return success(
        { role: 'client' as const, user: sanitizeUser(fresh), client, ...this.tokens.tokenPayload(fresh) },
        'Connexion réussie',
      );
    }

    const praticien = await this.praticiens.findOneBy({ email: user.email });
    if (praticien) {
      throw new ForbiddenException({
        status: 'error',
        message: 'Les comptes praticien se connectent depuis l’application mobile.',
      });
    }

    throw new ForbiddenException({
      status: 'error',
      message: 'Aucun compte client ou administrateur associé à cette adresse email.',
    });
  }
}
