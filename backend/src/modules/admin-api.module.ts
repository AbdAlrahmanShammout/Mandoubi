import { Module } from '@nestjs/common';
import { AdminAuthController } from '@/authentication/admin-auth.controller';
import { AuthModule } from '@/authentication/auth.module';
import { RolesGuard } from '@/common/guards/roles.guard';
import { AuditAdminController } from '@/modules/audit/audit.admin.controller';
import { AuditModule } from '@/modules/audit/audit.module';
import { DeliveryAdminController } from '@/modules/delivery/delivery.admin.controller';
import { DeliveryModule } from '@/modules/delivery/delivery.module';
import { DriverSettlementAdminController } from '@/modules/driver-settlement/driver-settlement.admin.controller';
import { DriverSettlementModule } from '@/modules/driver-settlement/driver-settlement.module';
import { DriverAdminController } from '@/modules/driver/driver.admin.controller';
import { DriverModule } from '@/modules/driver/driver.module';
import { ExchangeRateAdminController } from '@/modules/exchange-rate/exchange-rate.admin.controller';
import { ExchangeRateModule } from '@/modules/exchange-rate/exchange-rate.module';
import { InvoiceAdminController } from '@/modules/invoice/invoice.admin.controller';
import { InvoiceModule } from '@/modules/invoice/invoice.module';
import { NotificationAdminController } from '@/modules/notification/notification.admin.controller';
import { NotificationModule } from '@/modules/notification/notification.module';
import { ManufacturerAdminController } from '@/modules/manufacturer/manufacturer.admin.controller';
import { ManufacturerModule } from '@/modules/manufacturer/manufacturer.module';
import { OrderAdminController } from '@/modules/order/order.admin.controller';
import { OrderModule } from '@/modules/order/order.module';
import { PaymentAdminController } from '@/modules/payment/payment.admin.controller';
import { PaymentModule } from '@/modules/payment/payment.module';
import { PharmacyLedgerAdminController } from '@/modules/pharmacy-ledger/pharmacy-ledger.admin.controller';
import { PharmacyLedgerModule } from '@/modules/pharmacy-ledger/pharmacy-ledger.module';
import { PharmacyAdminController } from '@/modules/pharmacy/pharmacy.admin.controller';
import { PharmacyModule } from '@/modules/pharmacy/pharmacy.module';
import { ProductAdminController } from '@/modules/product/product.admin.controller';
import { ReportAdminController } from '@/modules/report/report.admin.controller';
import { ReportModule } from '@/modules/report/report.module';
import { ReturnRecordAdminController } from '@/modules/return-record/return-record.admin.controller';
import { ReturnRecordModule } from '@/modules/return-record/return-record.module';
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
  imports: [AuditModule, AuthModule, DeliveryModule, DriverModule, DriverSettlementModule, ExchangeRateModule, InvoiceModule, JwtProviderModule, ManufacturerModule, NotificationModule, OrderModule, PaymentModule, PharmacyLedgerModule, PharmacyModule, ProductModule, RejectionReasonModule, ReportModule, ReturnRecordModule, UserModule, WarehouseModule],
  controllers: [AdminAuthController, AuditAdminController, DeliveryAdminController, DriverAdminController, DriverSettlementAdminController, ExchangeRateAdminController, InvoiceAdminController, ManufacturerAdminController, NotificationAdminController, OrderAdminController, PaymentAdminController, PharmacyAdminController, PharmacyLedgerAdminController, ProductAdminController, RejectionReasonAdminController, ReportAdminController, ReturnRecordAdminController, WarehouseAdminController],
  providers: [JwtAuthGuard, RolesGuard],
})
export class AdminApiModule {}
