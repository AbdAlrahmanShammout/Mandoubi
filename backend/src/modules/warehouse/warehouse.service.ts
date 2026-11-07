import { Injectable } from '@nestjs/common';
import { ResourceNotFoundException } from '@/common/exceptions/resource-not-found.exception';
import { Page, normalizePage } from '@/common/paging/page';
import { CreateWarehouseRepoInput, UpdateWarehouseRepoInput } from '@/modules/warehouse/defs/warehouse-repository.defs';
import { WarehouseEntity } from '@/modules/warehouse/entity/warehouse.entity';
import { WarehouseRepository, WarehouseSearchInput } from '@/modules/warehouse/repository/warehouse.repository';

/**
 * Warehouses where product quantities are recorded.
 */
@Injectable()
export class WarehouseService {
  constructor(private readonly warehouseRepository: WarehouseRepository) {}
  /**
   * Opens a warehouse.
   */
  async createWarehouse(input: CreateWarehouseRepoInput): Promise<WarehouseEntity> {
    return this.warehouseRepository.create(input);
  }
  /**
   * Loads one warehouse or fails when it does not exist.
   */
  async getWarehouseById(id: number): Promise<WarehouseEntity> {
    const warehouse = await this.warehouseRepository.findById(id);
    if (!warehouse) {
      throw new ResourceNotFoundException('Warehouse', id);
    }
    return warehouse;
  }
  /**
   * Lists warehouses that have not been removed.
   */
  async listWarehouses(): Promise<WarehouseEntity[]> {
    return this.warehouseRepository.list();
  }
  /**
   * Searches warehouses on the server and returns one page plus the match count.
   */
  async searchWarehouses(input: Omit<WarehouseSearchInput, 'limit' | 'offset'> & { readonly limit?: number; readonly offset?: number }): Promise<Page<WarehouseEntity>> {
    const page = normalizePage(input.limit, input.offset);
    const result = await this.warehouseRepository.search({ ...input, ...page });
    return { ...result, ...page };
  }
  /**
   * Changes the warehouse name or address.
   */
  async updateWarehouse(input: UpdateWarehouseRepoInput): Promise<WarehouseEntity> {
    const warehouse = await this.warehouseRepository.update(input);
    if (!warehouse) {
      throw new ResourceNotFoundException('Warehouse', input.id);
    }
    return warehouse;
  }
}
