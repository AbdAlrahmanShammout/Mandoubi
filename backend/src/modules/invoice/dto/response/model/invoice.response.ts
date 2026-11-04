import { ApiProperty } from '@nestjs/swagger';
import { BaseModelResponse } from '@/common/base/base-model.response';
import { InternalException } from '@/common/exceptions/internal.exception';
import { InvoiceEntity } from '@/modules/invoice/entity/invoice.entity';
import { InvoiceStatus } from '@/modules/invoice/enum/invoice-status.enum';
import { InvoiceItemResponse } from '@/modules/invoice/dto/response/model/invoice-item.response';
import { MoneyTotalResponse } from '@/modules/invoice/dto/response/model/money-total.response';
import { invoiceTotals } from '@/modules/invoice/helpers/invoice-totals.helper';
import { ProductCategory } from '@/modules/product/enum/product-category.enum';

/**
 * One category invoice and the lines captured at submission.
 */
export class InvoiceResponse extends BaseModelResponse {
  @ApiProperty({ example: 1 })
  readonly orderId: number;
  @ApiProperty({ enum: ProductCategory, example: ProductCategory.NATIONAL_MEDICINE })
  readonly category: ProductCategory;
  @ApiProperty({ enum: InvoiceStatus, example: InvoiceStatus.PENDING })
  readonly status: InvoiceStatus;
  @ApiProperty({ type: MoneyTotalResponse, isArray: true })
  readonly totals: MoneyTotalResponse[];
  @ApiProperty({ type: InvoiceItemResponse, isArray: true })
  readonly items: InvoiceItemResponse[];
  constructor(invoice: InvoiceEntity) {
    super(invoice);
    const items = requireItems(invoice);
    this.orderId = invoice.orderId;
    this.category = invoice.category;
    this.status = invoice.status;
    this.items = items.map((item) => new InvoiceItemResponse(item));
    this.totals = invoiceTotals(items).map((total) => new MoneyTotalResponse(total));
  }
}

function requireItems(invoice: InvoiceEntity): NonNullable<InvoiceEntity['items']> {
  if (!invoice.items) {
    throw new InternalException('The invoice lines were not loaded');
  }
  return invoice.items;
}
