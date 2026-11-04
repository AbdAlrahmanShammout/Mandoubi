import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthenticatedRequest } from '@/common/auth/authenticated-request';
import { IS_PUBLIC_KEY } from '@/common/decorators/route/public-route.decorator';
import { AppException } from '@/common/exceptions/app.exception';
import { UnauthenticatedException } from '@/common/exceptions/unauthenticated.exception';
import { AccountStatus } from '@/modules/user/enum/account-status.enum';
import { UserService } from '@/modules/user/user.service';
import { JwtTokenService } from '@/providers/jwt/jwt-token.service';

const BEARER_PREFIX = 'Bearer ';

/**
 * Accepts a route when it is public or the bearer token names an active account.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtTokenService: JwtTokenService,
    private readonly userService: UserService,
  ) {}
  /**
   * Verifies the bearer token and attaches the account to the request.
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (this.isPublic(context)) {
      return true;
    }
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const payload = this.readPayload(this.readBearerToken(request));
    const user = await this.userService.findUserById(payload.sub);
    if (!user || user.status !== AccountStatus.ACTIVE || user.role !== payload.role) {
      throw new UnauthenticatedException();
    }
    request.user = user;
    request.accessToken = { userId: payload.sub, role: payload.role, sessionId: payload.sessionId };
    return true;
  }
  private isPublic(context: ExecutionContext): boolean {
    return this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [context.getHandler(), context.getClass()]) === true;
  }
  private readBearerToken(request: AuthenticatedRequest): string {
    const header = request.header('authorization');
    if (!header || !header.startsWith(BEARER_PREFIX)) {
      throw new UnauthenticatedException();
    }
    return header.slice(BEARER_PREFIX.length).trim();
  }
  private readPayload(token: string): ReturnType<JwtTokenService['verifyAccessToken']> {
    try {
      return this.jwtTokenService.verifyAccessToken(token);
    } catch (error) {
      if (error instanceof AppException) {
        throw error;
      }
      throw new UnauthenticatedException();
    }
  }
}
