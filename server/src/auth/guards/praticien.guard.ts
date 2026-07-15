import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Praticien } from '../../database/entities/praticien.entity';

@Injectable()
export class PraticienGuard implements CanActivate {
  constructor(@InjectRepository(Praticien) private readonly praticiens: Repository<Praticien>) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const praticien = req.user?.email
      ? await this.praticiens.findOneBy({ email: req.user.email })
      : null;
    if (!praticien) {
      throw new ForbiddenException({
        status: 'error',
        message: "Vous n'êtes pas autorisé à accéder à cette ressource.",
      });
    }
    req.praticien = praticien;
    return true;
  }
}
