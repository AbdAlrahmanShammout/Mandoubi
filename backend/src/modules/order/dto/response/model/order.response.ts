import { ApiProperty } from '@nestjs/swagger';
import { BaseModelResponse } from '@/common/base/base-model.response';
import { InternalException } from '@/common/exceptions/internal.exception';
import { InvoiceResponse } from '@/modules/invoice/dto/response/model/invoice.response';
import { MoneyTotalResponse } from '@/modules/invoice/dto/response/model/money-total.response';
import { invoiceTotals } from '@/modules/invoice/helpers/invoice-totals.helper';
import { OrderEntity } from '@/modules/order/entity/order.entity';
import { OrderStatus } from '@/modules/order/enum/order-status.enum';
import { deriveOrderStatus } from '@/modules/order/helpers/derive-order-status.helper';

/**
 * Parent order with the category invoices created from it.
 */
export class OrderResponse extends BaseModelResponse {
  @ApiProperty({ example: 1 })
  readonly pharmacyId: number;
  @ApiProperty({ example: 'Al Shifa Pharmacy' })
  readonly pharmacyName: string;
  @ApiProperty({ enum: OrderStatus, example: OrderStatus.PENDING })
  readonly status: OrderStatus;
  @ApiProperty({ example: 2 })
  readonly invoiceCount: number;
  @ApiProperty({ type: MoneyTotalResponse, isArray: true })
  readonly totals: MoneyTotalResponse[];
  @ApiProperty({ type: InvoiceResponse, isArray: true })
  readonly invoices: InvoiceResponse[];
  constructor(order: OrderEntity) {
    super(order);
    const pharmacy = requirePharmacy(order);
    const invoices = requireInvoices(order);
    this.pharmacyId = order.pharmacyId;
    this.pharmacyName = pharmacy.name;
    this.invoices = invoices.map((invoice) => new InvoiceResponse(invoice));
    this.invoiceCount = invoices.length;
    this.status = deriveOrderStatus(invoices.map((invoice) => invoice.status));
    this.totals = invoiceTotals(invoices.flatMap((invoice) => invoice.items ?? [])).map((total) => new MoneyTotalResponse(total));
  }
}

function requirePharmacy(order: OrderEntity): NonNullable<OrderEntity['pharmacy']> {
  if (!order.pharmacy) {
    throw new InternalException('The ordering pharmacy was not loaded');
  }
  return order.pharmacy;
}

function requireInvoices(order: OrderEntity): NonNullable<OrderEntity['invoices']> {
  if (!order.invoices) {
    throw new InternalException('The order invoices were not loaded');
  }
  return order.invoices;
}
