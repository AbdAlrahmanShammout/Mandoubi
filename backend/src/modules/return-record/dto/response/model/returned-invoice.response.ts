import { ApiProperty } from '@nestjs/swagger';
import { InvoiceEntity } from '@/modules/invoice/entity/invoice.entity';
import { InvoiceStatus } from '@/modules/invoice/enum/invoice-status.enum';

/**
 * Invoice after it has been returned to the warehouse.
 */
export class ReturnedInvoiceResponse {
  @ApiProperty({ example: 1 })
  readonly invoiceId: number;
  @ApiProperty({ enum: InvoiceStatus, example: InvoiceStatus.RETURNED_TO_WAREHOUSE })
  readonly status: InvoiceStatus;
  constructor(invoice: InvoiceEntity) {
    this.invoiceId = invoice.id;
    this.status = invoice.status;
  }
}
