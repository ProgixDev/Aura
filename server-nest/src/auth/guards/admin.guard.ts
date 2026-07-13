import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const user = ctx.switchToHttp().getRequest().user;
    if (!user?.is_admin) {
      throw new ForbiddenException({ status: 'error', message: 'Accès non autorisé' });
    }
    return true;
  }
}
