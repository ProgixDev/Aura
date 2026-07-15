import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import { Capability } from './capabilities';

export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext) => ctx.switchToHttp().getRequest().user,
);
export const CurrentClient = createParamDecorator(
  (_: unknown, ctx: ExecutionContext) => ctx.switchToHttp().getRequest().client,
);
export const CurrentPraticien = createParamDecorator(
  (_: unknown, ctx: ExecutionContext) => ctx.switchToHttp().getRequest().praticien,
);

// Attaches the capability a route requires as route metadata; read by
// CapabilityGuard via Reflector. Must be listed after AdminGuard in the
// route's @UseGuards(...) chain — it assumes req.user.is_admin is already true.
export const CAPABILITY_KEY = 'capability';
export const RequireCapability = (capability: Capability) => SetMetadata(CAPABILITY_KEY, capability);
