import { Module } from '@nestjs/common';
import { AuthModule } from '@/authentication/auth.module';
import { PharmacyAuthController } from '@/authentication/pharmacy-auth.controller';
import { RolesGuard } from '@/common/guards/roles.guard';
import { InvoicePharmacyController } from '@/modules/invoice/invoice.pharmacy.controller';
import { InvoiceModule } from '@/modules/invoice/invoice.module';
import { NotificationPharmacyController } from '@/modules/notification/notification.pharmacy.controller';
import { NotificationModule } from '@/modules/notification/notification.module';
import { OrderPharmacyController } from '@/modules/order/order.pharmacy.controller';
import { OrderModule } from '@/modules/order/order.module';
import { PharmacyLedgerPharmacyController } from '@/modules/pharmacy-ledger/pharmacy-ledger.pharmacy.controller';
import { PharmacyLedgerModule } from '@/modules/pharmacy-ledger/pharmacy-ledger.module';
import { PharmacySessionGuard } from '@/modules/pharmacy/guards/pharmacy-session.guard';
import { PharmacyModule } from '@/modules/pharmacy/pharmacy.module';
import { ProductPharmacyController } from '@/modules/product/product.pharmacy.controller';
import { ProductModule } from '@/modules/product/product.module';
import { JwtAuthGuard } from '@/modules/user/guards/jwt-auth.guard';
import { UserModule } from '@/modules/user/user.module';
import { JwtProviderModule } from '@/providers/jwt/jwt-provider.module';

/**
 * Registers every controller exposed to the pharmacy app.
 */
@Module({
  imports: [AuthModule, InvoiceModule, JwtProviderModule, NotificationModule, OrderModule, PharmacyLedgerModule, PharmacyModule, ProductModule, UserModule],
  controllers: [
    InvoicePharmacyController,
    NotificationPharmacyController,
    OrderPharmacyController,
    PharmacyAuthController,
    PharmacyLedgerPharmacyController,
    ProductPharmacyController,
  ],
  providers: [JwtAuthGuard, PharmacySessionGuard, RolesGuard],
})
export class PharmacyApiModule {}
