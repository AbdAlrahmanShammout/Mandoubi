import { RejectionReason } from '@prisma/client';
import { RejectionReasonEntity } from '@/modules/rejection-reason/entity/rejection-reason.entity';
import { RejectionReasonStatus } from '@/modules/rejection-reason/enum/rejection-reason-status.enum';

/**
 * Maps a rejection reason row to the domain entity.
 */
export class RejectionReasonMapper {
  /**
   * Copies the stored label and status.
   */
  static toEntity(payload: RejectionReason): RejectionReasonEntity {
    return new RejectionReasonEntity({
      id: payload.id,
      label: payload.label,
      status: payload.status as RejectionReasonStatus,
      createdAt: payload.createdAt,
      updatedAt: payload.updatedAt,
    });
  }
}
