import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthenticatedRequest } from '@/common/auth/authenticated-request';
import { IS_PUBLIC_KEY } from '@/common/decorators/route/public-route.decorator';
import { UnauthenticatedException } from '@/common/exceptions/unauthenticated.exception';
import { PharmacySessionService } from '@/modules/pharmacy/pharmacy-session.service';
import { UserService } from '@/modules/user/user.service';

/**
 * Rejects a pharmacy token whose server session was revoked.
 */
@Injectable()
export class PharmacySessionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly userService: UserService,
    private readonly pharmacySessionService: PharmacySessionService,
  ) {}
  /**
   * Allows a public route, or a token whose session is still the active one.
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (this.isPublic(context)) {
      return true;
    }
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const sessionId = request.accessToken?.sessionId;
    if (!request.user || sessionId === undefined) {
      throw new UnauthenticatedException();
    }
    const user = await this.userService.findUserById(request.user.id);
    if (!user || user.pharmacyId === null) {
      throw new UnauthenticatedException();
    }
    await this.pharmacySessionService.assertActiveSession({ sessionId, pharmacyId: user.pharmacyId });
    return true;
  }
  private isPublic(context: ExecutionContext): boolean {
    return this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [context.getHandler(), context.getClass()]) === true;
  }
}
