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
import { JwtConfigService } from '@/config/jwt/jwt-config.service';
import { UserResponse } from '@/modules/user/dto/response/model/user.response';
import { AccountRole } from '@/modules/user/enum/account-role.enum';
import { JwtAuthGuard } from '@/modules/user/guards/jwt-auth.guard';
import { UserService } from '@/modules/user/user.service';

/**
 * Administrator sign-in and the signed-in account.
 */
@ApiTags('Admin auth')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(AccountRole.ADMIN)
@Controller('admin/auth')
export class AdminAuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService,
    private readonly jwtConfig: JwtConfigService,
  ) {}
  /**
   * Exchanges the administrator mobile number and password for an access token.
   */
  @Post('sign-in')
  @PublicRoute()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sign in as an administrator' })
  async signIn(@Body() body: SignInRequestDto): Promise<SignInResponseDto> {
    const accessToken = await this.authService.signInAdmin(body);
    return new SignInResponseDto(accessToken, this.jwtConfig.accessExpiresIn);
  }
  /**
   * Returns the administrator named by the access token.
   */
  @Get('me')
  @ApiOperation({ summary: 'Read the signed-in administrator' })
  async getMe(@LoggedInUser() currentUser: Principal): Promise<UserResponse> {
    const user = await this.userService.getUserById(currentUser.id);
    return new UserResponse(user);
  }
}
