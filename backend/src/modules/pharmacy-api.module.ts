import { Module } from '@nestjs/common';
import { AuthModule } from '@/authentication/auth.module';
import { PharmacyAuthController } from '@/authentication/pharmacy-auth.controller';
import { RolesGuard } from '@/common/guards/roles.guard';
import { PharmacySessionGuard } from '@/modules/pharmacy/guards/pharmacy-session.guard';
import { NotificationPharmacyController } from '@/modules/notification/notification.pharmacy.controller';
import { NotificationModule } from '@/modules/notification/notification.module';
import { OrderPharmacyController } from '@/modules/order/order.pharmacy.controller';
import { OrderModule } from '@/modules/order/order.module';
import { PharmacyModule } from '@/modules/pharmacy/pharmacy.module';
import { JwtAuthGuard } from '@/modules/user/guards/jwt-auth.guard';
import { UserModule } from '@/modules/user/user.module';
import { JwtProviderModule } from '@/providers/jwt/jwt-provider.module';

/**
 * Registers every controller exposed to the pharmacy app.
 */
@Module({
  imports: [AuthModule, JwtProviderModule, NotificationModule, OrderModule, PharmacyModule, UserModule],
  controllers: [NotificationPharmacyController, OrderPharmacyController, PharmacyAuthController],
  providers: [JwtAuthGuard, PharmacySessionGuard, RolesGuard],
})
export class PharmacyApiModule {}
