import { TransactionContext } from '@/common/base/transaction-context';
import { CreateDeliveryAssignmentRepoInput, CreateDeliveryEventRepoInput } from '@/modules/delivery/defs/delivery-repository.defs';
import { DeliveryAssignmentEntity } from '@/modules/delivery/entity/delivery-assignment.entity';
import { DeliveryEventEntity } from '@/modules/delivery/entity/delivery-event.entity';

/**
 * Persistence contract for assignments and append-only delivery events.
 */
export abstract class DeliveryRepository {
  /** Inserts the assignment for one invoice. */
  abstract createAssignment(input: CreateDeliveryAssignmentRepoInput, context?: TransactionContext): Promise<DeliveryAssignmentEntity>;
  /** Loads the assignment of one invoice, or null when it has not been assigned. */
  abstract findByInvoiceId(invoiceId: number, context?: TransactionContext): Promise<DeliveryAssignmentEntity | null>;
  /** Lists invoices still assigned to one driver. */
  abstract listOpenByDriverId(driverId: number): Promise<DeliveryAssignmentEntity[]>;
  /** Lists every assignment given to one driver. */
  abstract listByDriverId(driverId: number): Promise<DeliveryAssignmentEntity[]>;
  /** Inserts one delivery result. Existing rows stay unchanged. */
  abstract appendEvent(input: CreateDeliveryEventRepoInput, context?: TransactionContext): Promise<DeliveryEventEntity>;
}
