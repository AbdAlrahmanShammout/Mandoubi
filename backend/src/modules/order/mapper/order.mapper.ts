import { InternalException } from '@/common/exceptions/internal.exception';
import { InvoiceMapper } from '@/modules/invoice/mapper/invoice.mapper';
import { OrderEntity } from '@/modules/order/entity/order.entity';
import { OrderType } from '@/modules/order/types/order-details-schema.type';
import { PharmacyMapper } from '@/modules/pharmacy/mapper/pharmacy.mapper';

/**
 * Maps an order row to the domain entity.
 */
export class OrderMapper {
  /**
   * Copies the order, the ordering pharmacy, and the category invoices.
   */
  static toEntity(payload: OrderType): OrderEntity {
    if (!payload.pharmacy || !payload.invoices) {
      throw new InternalException('The order relations were not loaded');
    }
    const order = new OrderEntity({
      id: payload.id,
      pharmacyId: payload.pharmacyId,
      createdAt: payload.createdAt,
      updatedAt: payload.updatedAt,
      deletedAt: null,
    });
    order.pharmacy = PharmacyMapper.toEntity(payload.pharmacy);
    order.invoices = payload.invoices.map((invoice) => InvoiceMapper.toEntity(invoice));
    return order;
  }
}
