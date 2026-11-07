import { TransactionContext } from '@/common/base/transaction-context';
import { CreateOrderRepoInput } from '@/modules/order/defs/order-repository.defs';
import { OrderEntity } from '@/modules/order/entity/order.entity';
import { OrderStatus } from '@/modules/order/enum/order-status.enum';

/**
 * Order search applied before the page is cut.
 */
export interface OrderSearchInput {
  readonly search?: string;
  readonly status?: OrderStatus;
  readonly createdFrom?: Date;
  readonly createdTo?: Date;
  readonly limit: number;
  readonly offset: number;
}

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
  /** Returns one page of orders matching the search, derived status, and day, plus the full match count. */
  abstract search(input: OrderSearchInput): Promise<{ readonly items: readonly OrderEntity[]; readonly total: number }>;
  /** Lists the orders submitted by one pharmacy, oldest first. */
  abstract listByPharmacyId(pharmacyId: number): Promise<OrderEntity[]>;
}
