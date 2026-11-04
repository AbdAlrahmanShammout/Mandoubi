import { Module } from '@nestjs/common';
import { AuthModule } from '@/authentication/auth.module';
import { RolesGuard } from '@/common/guards/roles.guard';
import { PharmacyModule } from '@/modules/pharmacy/pharmacy.module';
import { JwtAuthGuard } from '@/modules/user/guards/jwt-auth.guard';
import { UserModule } from '@/modules/user/user.module';
import { JwtProviderModule } from '@/providers/jwt/jwt-provider.module';

/**
 * Registers every controller exposed to the pharmacy app.
 */
@Module({
  imports: [AuthModule, JwtProviderModule, PharmacyModule, UserModule],
  providers: [JwtAuthGuard, RolesGuard],
})
export class PharmacyApiModule {}
