/**
 * Fields used to open a warehouse.
 */
export interface CreateWarehouseRepoInput {
  readonly name: string;
  readonly address: string;
}

/**
 * Editable warehouse fields. Omitted fields stay unchanged.
 */
export interface UpdateWarehouseRepoInput {
  readonly id: number;
  readonly name?: string;
  readonly address?: string;
}
