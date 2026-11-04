import { Module } from '@nestjs/common';
import { AdminAuthController } from '@/authentication/admin-auth.controller';
import { AuthModule } from '@/authentication/auth.module';
import { RolesGuard } from '@/common/guards/roles.guard';
import { DriverAdminController } from '@/modules/driver/driver.admin.controller';
import { DriverModule } from '@/modules/driver/driver.module';
import { ExchangeRateAdminController } from '@/modules/exchange-rate/exchange-rate.admin.controller';
import { ExchangeRateModule } from '@/modules/exchange-rate/exchange-rate.module';
import { InvoiceAdminController } from '@/modules/invoice/invoice.admin.controller';
import { InvoiceModule } from '@/modules/invoice/invoice.module';
import { ManufacturerAdminController } from '@/modules/manufacturer/manufacturer.admin.controller';
import { ManufacturerModule } from '@/modules/manufacturer/manufacturer.module';
import { OrderAdminController } from '@/modules/order/order.admin.controller';
import { OrderModule } from '@/modules/order/order.module';
import { PharmacyAdminController } from '@/modules/pharmacy/pharmacy.admin.controller';
import { PharmacyModule } from '@/modules/pharmacy/pharmacy.module';
import { ProductAdminController } from '@/modules/product/product.admin.controller';
import { RejectionReasonAdminController } from '@/modules/rejection-reason/rejection-reason.admin.controller';
import { RejectionReasonModule } from '@/modules/rejection-reason/rejection-reason.module';
import { ProductModule } from '@/modules/product/product.module';
import { JwtAuthGuard } from '@/modules/user/guards/jwt-auth.guard';
import { UserModule } from '@/modules/user/user.module';
import { WarehouseAdminController } from '@/modules/warehouse/warehouse.admin.controller';
import { WarehouseModule } from '@/modules/warehouse/warehouse.module';
import { JwtProviderModule } from '@/providers/jwt/jwt-provider.module';

/**
 * Registers every controller exposed to the admin dashboard.
 */
@Module({
  imports: [AuthModule, DriverModule, ExchangeRateModule, InvoiceModule, JwtProviderModule, ManufacturerModule, OrderModule, PharmacyModule, ProductModule, RejectionReasonModule, UserModule, WarehouseModule],
  controllers: [AdminAuthController, DriverAdminController, ExchangeRateAdminController, InvoiceAdminController, ManufacturerAdminController, OrderAdminController, PharmacyAdminController, ProductAdminController, RejectionReasonAdminController, WarehouseAdminController],
  providers: [JwtAuthGuard, RolesGuard],
})
export class AdminApiModule {}
