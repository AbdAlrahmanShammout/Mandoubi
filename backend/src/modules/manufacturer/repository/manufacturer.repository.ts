import { TransactionContext } from '@/common/base/transaction-context';
import { CreateManufacturerRepoInput, UpdateManufacturerRepoInput, UpdateManufacturerStatusRepoInput } from '@/modules/manufacturer/defs/manufacturer-repository.defs';
import { ManufacturerEntity } from '@/modules/manufacturer/entity/manufacturer.entity';

/**
 * Persistence contract for manufacturers.
 */
export abstract class ManufacturerRepository {
  /** Inserts one manufacturer. */
  abstract create(input: CreateManufacturerRepoInput, context?: TransactionContext): Promise<ManufacturerEntity>;
  /** Loads one manufacturer by id, or null when it is missing. */
  abstract findById(id: number): Promise<ManufacturerEntity | null>;
  /** Lists manufacturers that have not been removed. */
  abstract list(): Promise<ManufacturerEntity[]>;
  /** Updates the name and returns the manufacturer, or null when it is missing. */
  abstract update(input: UpdateManufacturerRepoInput, context?: TransactionContext): Promise<ManufacturerEntity | null>;
  /** Updates status and returns the manufacturer, or null when it is missing. */
  abstract updateStatus(input: UpdateManufacturerStatusRepoInput, context?: TransactionContext): Promise<ManufacturerEntity | null>;
}
