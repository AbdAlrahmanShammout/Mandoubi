import { Injectable } from '@nestjs/common';
import { comparePassword, hashPassword } from '@/common/helpers/password.helper';
import { UnauthenticatedException } from '@/common/exceptions/unauthenticated.exception';
import { SignInInput } from '@/authentication/types/sign-in.input';
import { AccountRole } from '@/modules/user/enum/account-role.enum';
import { AccountStatus } from '@/modules/user/enum/account-status.enum';
import { UserService } from '@/modules/user/user.service';
import { JwtTokenService } from '@/providers/jwt/jwt-token.service';

const INVALID_CREDENTIALS_MESSAGE = 'The mobile number or password is incorrect';

/**
 * Checks a mobile number and password, then issues an access token.
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtTokenService: JwtTokenService,
  ) {}
  /**
   * Signs in an administrator. Creates the bootstrap account on first use.
   */
  async signInAdmin(input: SignInInput): Promise<string> {
    await this.userService.ensureBootstrapAdmin();
    return this.signInForRole(input, AccountRole.ADMIN);
  }
  /**
   * Signs in a driver. A pharmacy session is not involved.
   */
  async signInDriver(input: SignInInput): Promise<string> {
    return this.signInForRole(input, AccountRole.DRIVER);
  }
  private async signInForRole(input: SignInInput, role: AccountRole): Promise<string> {
    const user = await this.userService.findUserByMobileNumber(input.mobileNumber);
    const passwordMatches = user ? await comparePassword(input.password, user.passwordHash) : await this.burnPasswordWork(input.password);
    if (!user || !passwordMatches || user.status !== AccountStatus.ACTIVE || user.role !== role) {
      throw new UnauthenticatedException(INVALID_CREDENTIALS_MESSAGE);
    }
    return this.jwtTokenService.signAccessToken({ userId: user.id, role: user.role });
  }
  private async burnPasswordWork(password: string): Promise<false> {
    await hashPassword(password);
    return false;
  }
}
