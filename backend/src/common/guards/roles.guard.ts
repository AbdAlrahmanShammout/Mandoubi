import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthenticatedRequest } from '@/common/auth/authenticated-request';
import { IS_PUBLIC_KEY } from '@/common/decorators/route/public-route.decorator';
import { ROLES_KEY } from '@/common/decorators/route/roles.decorator';
import { AccessDeniedException } from '@/common/exceptions/access-denied.exception';
import { UnauthenticatedException } from '@/common/exceptions/unauthenticated.exception';

/**
 * Allows a route when no roles are declared, or when the caller has one of them.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}
  /**
   * Reads role metadata. Identity failures stay with the access-token guard.
   */
  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }
    const roles = this.reflector.getAllAndOverride<readonly string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!roles || roles.length === 0) {
      return true;
    }
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!request.user) {
      throw new UnauthenticatedException();
    }
    if (!roles.includes(request.user.role)) {
      throw new AccessDeniedException();
    }
    return true;
  }
}
