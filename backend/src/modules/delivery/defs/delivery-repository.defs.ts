import { ResolvedDeliveryResult } from '@/modules/delivery/helpers/resolve-delivery-result.helper';

/**
 * Invoice assigned to one driver by an administrator.
 */
export interface CreateDeliveryAssignmentRepoInput {
  readonly invoiceId: number;
  readonly driverId: number;
  readonly assignedByUserId: number;
}

/**
 * Append-only delivery result.
 */
export interface CreateDeliveryEventRepoInput extends ResolvedDeliveryResult {
  readonly assignmentId: number;
  readonly invoiceId: number;
  readonly driverId: number;
  readonly occurredAt: Date;
}
