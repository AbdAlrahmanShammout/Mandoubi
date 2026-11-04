import { DeliveryEventEntity } from '@/modules/delivery/entity/delivery-event.entity';
import { DeliveryResult } from '@/modules/delivery/enum/delivery-result.enum';
import { NonDeliveryReason } from '@/modules/delivery/enum/non-delivery-reason.enum';
import { DeliveryEventType } from '@/modules/delivery/types/delivery-assignment-schema.type';

/**
 * Maps a delivery event row to the domain entity.
 */
export class DeliveryEventMapper {
  /**
   * Copies the stored result. The row is not edited later.
   */
  static toEntity(payload: DeliveryEventType): DeliveryEventEntity {
    return new DeliveryEventEntity({
      id: payload.id,
      assignmentId: payload.assignmentId,
      invoiceId: payload.invoiceId,
      driverId: payload.driverId,
      result: payload.result as DeliveryResult,
      nonDeliveryReason: payload.nonDeliveryReason as NonDeliveryReason | null,
      note: payload.note,
      recipientName: payload.recipientName,
      occurredAt: payload.occurredAt,
      createdAt: payload.createdAt,
      updatedAt: payload.updatedAt,
    });
  }
}
