import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthService } from '@/authentication/auth.service';
import { SignInRequestDto } from '@/authentication/dto/request/sign-in-request.dto';
import { SignInResponseDto } from '@/authentication/dto/response/sign-in-response.dto';
import { LoggedInUser } from '@/common/decorators/requests/logged-in-user.decorator';
import { PublicRoute } from '@/common/decorators/route/public-route.decorator';
import { Roles } from '@/common/decorators/route/roles.decorator';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Principal } from '@/common/auth/principal.interface';
import { UnauthenticatedException } from '@/common/exceptions/unauthenticated.exception';
import { JwtConfigService } from '@/config/jwt/jwt-config.service';
import { PharmacySessionGuard } from '@/modules/pharmacy/guards/pharmacy-session.guard';
import { PharmacyResponse } from '@/modules/pharmacy/dto/response/model/pharmacy.response';
import { PharmacyService } from '@/modules/pharmacy/pharmacy.service';
import { PharmacySessionService } from '@/modules/pharmacy/pharmacy-session.service';
import { AccountRole } from '@/modules/user/enum/account-role.enum';
import { JwtAuthGuard } from '@/modules/user/guards/jwt-auth.guard';
import { UserService } from '@/modules/user/user.service';

/**
 * Pharmacy sign-in and the signed-in pharmacy profile.
 */
@ApiTags('Pharmacy auth')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PharmacySessionGuard, RolesGuard)
@Roles(AccountRole.PHARMACY)
@Controller('pharmacy/auth')
export class PharmacyAuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService,
    private readonly pharmacyService: PharmacyService,
    private readonly pharmacySessionService: PharmacySessionService,
    private readonly jwtConfig: JwtConfigService,
  ) {}
  /**
   * Exchanges the pharmacy mobile number and password for an access token.
   * A new sign-in revokes the previous server session.
   */
  @Post('sign-in')
  @PublicRoute()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sign in as a pharmacy' })
  async signIn(@Body() body: SignInRequestDto): Promise<SignInResponseDto> {
    const accessToken = await this.authService.signInPharmacy(body);
    return new SignInResponseDto(accessToken, this.jwtConfig.accessExpiresIn);
  }
  /**
   * Returns the pharmacy named by the active session.
   */
  @Get('me')
  @ApiOperation({ summary: 'Read the signed-in pharmacy' })
  async getMe(@LoggedInUser() currentUser: Principal): Promise<PharmacyResponse> {
    const user = await this.userService.getUserById(currentUser.id);
    if (user.pharmacyId === null) {
      throw new UnauthenticatedException();
    }
    const pharmacy = await this.pharmacyService.getPharmacyById(user.pharmacyId);
    return new PharmacyResponse(pharmacy);
  }
  /**
   * Revokes the active server session. The same access token is rejected afterward.
   */
  @Post('sign-out')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Sign out the pharmacy and revoke its session' })
  async signOut(@LoggedInUser() currentUser: Principal): Promise<void> {
    const user = await this.userService.getUserById(currentUser.id);
    if (user.pharmacyId === null) {
      throw new UnauthenticatedException();
    }
    await this.pharmacySessionService.closeSession(user.pharmacyId);
  }
}
