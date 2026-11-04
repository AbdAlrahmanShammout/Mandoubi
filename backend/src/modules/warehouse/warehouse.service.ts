import { Injectable } from '@nestjs/common';
import { ResourceNotFoundException } from '@/common/exceptions/resource-not-found.exception';
import { CreateWarehouseRepoInput, UpdateWarehouseRepoInput } from '@/modules/warehouse/defs/warehouse-repository.defs';
import { WarehouseEntity } from '@/modules/warehouse/entity/warehouse.entity';
import { WarehouseRepository } from '@/modules/warehouse/repository/warehouse.repository';

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
