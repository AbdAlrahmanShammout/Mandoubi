import { Module } from '@nestjs/common';
import { AuthModule } from '@/authentication/auth.module';
import { DriverAuthController } from '@/authentication/driver-auth.controller';
import { RolesGuard } from '@/common/guards/roles.guard';
import { DeliveryDriverController } from '@/modules/delivery/delivery.driver.controller';
import { DeliveryModule } from '@/modules/delivery/delivery.module';
import { JwtAuthGuard } from '@/modules/user/guards/jwt-auth.guard';
import { UserModule } from '@/modules/user/user.module';
import { JwtProviderModule } from '@/providers/jwt/jwt-provider.module';

/**
 * Registers every controller exposed to the driver app.
 */
@Module({
  imports: [AuthModule, DeliveryModule, JwtProviderModule, UserModule],
  controllers: [DeliveryDriverController, DriverAuthController],
  providers: [JwtAuthGuard, RolesGuard],
})
export class DriverApiModule {}
