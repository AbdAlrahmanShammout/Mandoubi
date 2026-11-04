import { TransactionContext } from '@/common/base/transaction-context';
import { CreateOrderRepoInput } from '@/modules/order/defs/order-repository.defs';
import { OrderEntity } from '@/modules/order/entity/order.entity';

/**
 * Persistence contract for parent orders.
 */
export abstract class OrderRepository {
  /** Inserts one order for a pharmacy. */
  abstract create(input: CreateOrderRepoInput, context?: TransactionContext): Promise<OrderEntity>;
  /** Loads one order with its invoices, or null when it is missing. */
  abstract findById(id: number): Promise<OrderEntity | null>;
  /** Lists every order, oldest first. */
  abstract list(): Promise<OrderEntity[]>;
  /** Lists the orders submitted by one pharmacy, oldest first. */
  abstract listByPharmacyId(pharmacyId: number): Promise<OrderEntity[]>;
}
