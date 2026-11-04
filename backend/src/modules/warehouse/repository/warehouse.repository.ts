import { TransactionContext } from '@/common/base/transaction-context';
import { CreateWarehouseRepoInput, UpdateWarehouseRepoInput } from '@/modules/warehouse/defs/warehouse-repository.defs';
import { WarehouseEntity } from '@/modules/warehouse/entity/warehouse.entity';

/**
 * Persistence contract for warehouses.
 */
export abstract class WarehouseRepository {
  /** Inserts one warehouse. */
  abstract create(input: CreateWarehouseRepoInput, context?: TransactionContext): Promise<WarehouseEntity>;
  /** Loads one warehouse by id, or null when it is missing. */
  abstract findById(id: number): Promise<WarehouseEntity | null>;
  /** Lists warehouses that have not been removed. */
  abstract list(): Promise<WarehouseEntity[]>;
  /** Updates name or address and returns the warehouse, or null when it is missing. */
  abstract update(input: UpdateWarehouseRepoInput, context?: TransactionContext): Promise<WarehouseEntity | null>;
}
