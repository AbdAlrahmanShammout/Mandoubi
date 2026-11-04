import { TransactionContext } from '@/common/base/transaction-context';
import { DriverSettlementEntity } from '@/modules/driver-settlement/entity/driver-settlement.entity';
import { InvoiceCurrency } from '@/modules/product/enum/invoice-currency.enum';

/**
 * Handover written for whole driver collections.
 */
export interface CreateDriverSettlementRepoInput {
  readonly driverId: number;
  readonly currency: InvoiceCurrency;
  readonly amount: string;
  readonly receivedByName: string;
  readonly occurredAt: Date;
  readonly paymentIds: readonly number[];
}

/**
 * Persistence contract for driver handovers.
 */
export abstract class DriverSettlementRepository {
  /** Inserts one handover and the collections it covers. */
  abstract create(input: CreateDriverSettlementRepoInput, context?: TransactionContext): Promise<DriverSettlementEntity>;
  /** Lists handovers recorded for one driver, oldest first. */
  abstract listByDriverId(driverId: number): Promise<DriverSettlementEntity[]>;
}
