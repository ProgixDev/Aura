import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CAPABILITY_KEY } from '../decorators';
import { Capability, hasCapability } from '../capabilities';

/**
 * Reads the @RequireCapability(...) metadata (if any) off the route handler
 * and checks it against the requesting admin's role. Routes with no
 * @RequireCapability decorator pass through unchanged — this guard is opt-in,
 * layered on top of AdminGuard rather than replacing its binary is_admin
 * check. Must be listed after AdminGuard in @UseGuards(...) so req.user is
 * already confirmed to be an admin by the time this runs.
 */
@Injectable()
export class CapabilityGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Capability | undefined>(CAPABILITY_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (!required) return true;
    const user = ctx.switchToHttp().getRequest().user;
    if (!hasCapability(user?.role, required)) {
      throw new ForbiddenException({
        status: 'error',
        message: "Vous n'avez pas la permission d'effectuer cette action.",
      });
    }
    return true;
  }
}
