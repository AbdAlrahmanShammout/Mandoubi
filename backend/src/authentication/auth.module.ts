import { Module } from '@nestjs/common';
import { AuthService } from '@/authentication/auth.service';
import { UserModule } from '@/modules/user/user.module';
import { JwtProviderModule } from '@/providers/jwt/jwt-provider.module';

/**
 * Credential checks. Audience modules register the controllers.
 */
@Module({
  imports: [JwtProviderModule, UserModule],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
