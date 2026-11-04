import { Module } from '@nestjs/common';
import { JwtTokenService } from '@/providers/jwt/jwt-token.service';

/**
 * Token signing. Imported by the modules that issue or verify access tokens.
 */
@Module({
  providers: [JwtTokenService],
  exports: [JwtTokenService],
})
export class JwtProviderModule {}
