import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Client } from '../../database/entities/client.entity';

@Injectable()
export class ClientGuard implements CanActivate {
  constructor(@InjectRepository(Client) private readonly clients: Repository<Client>) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const client = req.user?.email
      ? await this.clients.findOneBy({ email: req.user.email })
      : null;
    if (!client) {
      throw new ForbiddenException({
        status: 'error',
        message: "Vous n'êtes pas autorisé à accéder à cette ressource.",
      });
    }
    req.client = client;
    return true;
  }
}
