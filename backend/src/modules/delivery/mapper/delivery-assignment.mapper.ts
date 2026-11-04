import { InternalException } from '@/common/exceptions/internal.exception';
import { DeliveryAssignmentEntity } from '@/modules/delivery/entity/delivery-assignment.entity';
import { DeliveryAssignmentType } from '@/modules/delivery/types/delivery-assignment-schema.type';
import { InvoiceMapper } from '@/modules/invoice/mapper/invoice.mapper';
import { InvoiceType } from '@/modules/invoice/types/invoice-details-schema.type';
import { PharmacyMapper } from '@/modules/pharmacy/mapper/pharmacy.mapper';

/**
 * Maps an assignment row to the domain entity.
 */
export class DeliveryAssignmentMapper {
  /**
   * Copies the assignment, the invoice, and the pharmacy to visit.
   */
  static toEntity(payload: DeliveryAssignmentType): DeliveryAssignmentEntity {
    const invoice = payload.invoice;
    const pharmacy = invoice?.order?.pharmacy;
    if (!invoice || !invoice.order || !pharmacy) {
      throw new InternalException('The delivery assignment relations were not loaded');
    }
    const assignment = new DeliveryAssignmentEntity({
      id: payload.id,
      invoiceId: payload.invoiceId,
      driverId: payload.driverId,
      assignedByUserId: payload.assignedByUserId,
      createdAt: payload.createdAt,
      updatedAt: payload.updatedAt,
    });
    assignment.orderId = invoice.order.id;
    assignment.invoice = InvoiceMapper.toEntity(invoice as InvoiceType);
    assignment.pharmacy = PharmacyMapper.toEntity(pharmacy);
    return assignment;
  }
}
