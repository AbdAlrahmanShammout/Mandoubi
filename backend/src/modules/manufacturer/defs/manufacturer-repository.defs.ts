import { ManufacturerStatus } from '@/modules/manufacturer/enum/manufacturer-status.enum';

/**
 * Fields used to open a manufacturer.
 */
export interface CreateManufacturerRepoInput {
  readonly name: string;
  readonly status: ManufacturerStatus;
}

/**
 * Editable manufacturer fields. Omitted fields stay unchanged.
 */
export interface UpdateManufacturerRepoInput {
  readonly id: number;
  readonly name?: string;
}

/**
 * Status change addressed by manufacturer id.
 */
export interface UpdateManufacturerStatusRepoInput {
  readonly id: number;
  readonly status: ManufacturerStatus;
}
