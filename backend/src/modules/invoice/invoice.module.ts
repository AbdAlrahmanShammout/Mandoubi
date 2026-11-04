import { Module } from '@nestjs/common';
import { InvoicePrismaRepository } from '@/modules/invoice/repository/invoice-prisma.repository';
import { InvoiceRepository } from '@/modules/invoice/repository/invoice.repository';
import { InvoiceService } from '@/modules/invoice/invoice.service';
import { DatabaseProviderModule } from '@/providers/database/database-provider.module';

/**
 * Category invoices. Controllers are registered by audience modules.
 */
@Module({
  imports: [DatabaseProviderModule],
  providers: [InvoiceService, { provide: InvoiceRepository, useClass: InvoicePrismaRepository }],
  exports: [InvoiceService],
})
export class InvoiceModule {}
