import {
  BadRequestException, ForbiddenException, Injectable, NotFoundException,
  UnauthorizedException, UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Request } from 'express';
import { User } from '../../database/entities/user.entity';
import { HashService } from '../hash.service';
import { TokenService } from '../token.service';
import { pickUser, sanitizeUser } from '../user.util';
import { success } from '../../common/envelope';
import { parsePagination, paginateQb } from '../../common/pagination';
import { RegisterAdminDto } from './dto/register-admin.dto';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@Injectable()
export class AdminAuthService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly hash: HashService,
    private readonly tokens: TokenService,
  ) {}

  private validationError(errors: Record<string, string[]>): never {
    throw new UnprocessableEntityException({
      status: 'error', message: 'Erreur de validation', errors,
    });
  }

  async register(dto: RegisterAdminDto) {
    if (await this.users.findOneBy({ email: dto.email })) {
      this.validationError({ email: ['Cette adresse email est déjà utilisée.'] });
    }
    const user = await this.users.save({
      name: dto.name, email: dto.email,
      password: await this.hash.hash(dto.password), is_admin: true,
    });
    return success(
      {
        user: pickUser(user, ['id', 'name', 'email', 'is_admin', 'created_at']),
        ...this.tokens.tokenPayload(user),
      },
      'Compte administrateur créé avec succès',
    );
  }

  async login(dto: LoginDto, req: Request) {
    const user = await this.users.findOneBy({ email: dto.email });
    if (!user || !(await this.hash.compare(dto.password, user.password))) {
      throw new UnauthorizedException({ status: 'error', message: 'Les identifiants sont incorrects.' });
    }
    if (!user.is_admin) {
      throw new ForbiddenException({
        status: 'error',
        message: "Vous n'êtes pas autorisé à vous connecter en tant qu'administrateur.",
      });
    }
    await this.users.update(user.id, { last_login_at: new Date(), ip_address: req.ip });
    const fresh = await this.users.findOneByOrFail({ id: user.id });
    return success(
      {
        user: pickUser(fresh, ['id', 'name', 'email', 'is_admin', 'last_login_at']),
        ...this.tokens.tokenPayload(fresh),
      },
      'Connexion administrateur réussie',
    );
  }

  logout() {
    return success(undefined, 'Déconnexion réussie');
  }

  refresh(user: User) {
    return success(this.tokens.tokenPayload(user));
  }

  profile(user: User) {
    return success({
      user: pickUser(user, [
        'id', 'name', 'email', 'is_admin', 'last_login_at', 'ip_address', 'created_at', 'updated_at',
      ]),
    });
  }

  checkToken(user: User) {
    if (!user.is_admin) {
      throw new ForbiddenException({ status: 'error', message: 'Token invalide ou non admin' });
    }
    return success(
      { user: pickUser(user, ['id', 'name', 'email', 'is_admin']) },
      'Token admin valide',
    );
  }

  async changePassword(user: User, dto: ChangePasswordDto) {
    const fresh = await this.users.findOneByOrFail({ id: user.id });
    if (!(await this.hash.compare(dto.current_password, fresh.password))) {
      throw new BadRequestException({ status: 'error', message: 'Le mot de passe actuel est incorrect' });
    }
    await this.users.update(user.id, { password: await this.hash.hash(dto.new_password) });
    return success(undefined, 'Mot de passe mis à jour avec succès');
  }

  async list(query: Record<string, any>) {
    const { page, perPage } = parsePagination(query, 15);
    const qb = this.users
      .createQueryBuilder('u')
      .where('u.is_admin = :isAdmin', { isAdmin: true })
      .orderBy('u.created_at', 'DESC');
    const { data, pagination } = await paginateQb(qb, page, perPage);
    return success(data.map(sanitizeUser), undefined, { pagination });
  }

  async deactivate(current: User, id: number) {
    if (current.id === id) {
      throw new BadRequestException({
        status: 'error', message: 'Vous ne pouvez pas désactiver votre propre compte',
      });
    }
    const admin = await this.users.findOneBy({ id, is_admin: true });
    if (!admin) throw new NotFoundException({ status: 'error', message: 'Administrateur non trouvé' });
    await this.users.update(id, { is_admin: false });
    return success(undefined, 'Administrateur désactivé avec succès');
  }

  async activate(id: number) {
    const user = await this.users.findOneBy({ id });
    if (!user) throw new NotFoundException({ status: 'error', message: 'Utilisateur non trouvé' });
    await this.users.update(id, { is_admin: true });
    return success(undefined, 'Administrateur réactivé avec succès');
  }

  async destroy(current: User, id: number) {
    if (current.id === id) {
      throw new BadRequestException({
        status: 'error', message: 'Vous ne pouvez pas supprimer votre propre compte',
      });
    }
    const admin = await this.users.findOneBy({ id, is_admin: true });
    if (!admin) throw new NotFoundException({ status: 'error', message: 'Administrateur non trouvé' });
    await this.users.delete(id);
    return success(undefined, 'Administrateur supprimé avec succès');
  }
}
