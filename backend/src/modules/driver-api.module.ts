import { Module } from '@nestjs/common';
import { AuthModule } from '@/authentication/auth.module';
import { DriverAuthController } from '@/authentication/driver-auth.controller';
import { RolesGuard } from '@/common/guards/roles.guard';
import { NotificationDriverController } from '@/modules/notification/notification.driver.controller';
import { NotificationModule } from '@/modules/notification/notification.module';
import { DeliveryDriverController } from '@/modules/delivery/delivery.driver.controller';
import { DeliveryModule } from '@/modules/delivery/delivery.module';
import { JwtAuthGuard } from '@/modules/user/guards/jwt-auth.guard';
import { UserModule } from '@/modules/user/user.module';
import { JwtProviderModule } from '@/providers/jwt/jwt-provider.module';

/**
 * Registers every controller exposed to the driver app.
 */
@Module({
  imports: [AuthModule, DeliveryModule, JwtProviderModule, NotificationModule, UserModule],
  controllers: [DeliveryDriverController, DriverAuthController, NotificationDriverController],
  providers: [JwtAuthGuard, RolesGuard],
})
export class DriverApiModule {}
