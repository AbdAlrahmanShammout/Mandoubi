import { InternalException } from '@/common/exceptions/internal.exception';
import { InvoiceEntity } from '@/modules/invoice/entity/invoice.entity';
import { InvoiceStatus } from '@/modules/invoice/enum/invoice-status.enum';
import { InvoiceItemMapper } from '@/modules/invoice/mapper/invoice-item.mapper';
import { InvoiceType } from '@/modules/invoice/types/invoice-details-schema.type';
import { ProductCategory } from '@/modules/product/enum/product-category.enum';

/**
 * Maps an invoice row to the domain entity.
 */
export class InvoiceMapper {
  /**
   * Copies the invoice and its snapshotted lines.
   */
  static toEntity(payload: InvoiceType): InvoiceEntity {
    if (!payload.items) {
      throw new InternalException('The invoice lines were not loaded');
    }
    const invoice = new InvoiceEntity({
      id: payload.id,
      orderId: payload.orderId,
      category: payload.category as ProductCategory,
      status: payload.status as InvoiceStatus,
      createdAt: payload.createdAt,
      updatedAt: payload.updatedAt,
      deletedAt: null,
    });
    invoice.items = payload.items.map((item) => InvoiceItemMapper.toEntity(item));
    return invoice;
  }
}
