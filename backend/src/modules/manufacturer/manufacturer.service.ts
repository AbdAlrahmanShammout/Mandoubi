import { Injectable } from '@nestjs/common';
import { ResourceNotFoundException } from '@/common/exceptions/resource-not-found.exception';
import { UpdateManufacturerRepoInput, UpdateManufacturerStatusRepoInput } from '@/modules/manufacturer/defs/manufacturer-repository.defs';
import { ManufacturerEntity } from '@/modules/manufacturer/entity/manufacturer.entity';
import { ManufacturerStatus } from '@/modules/manufacturer/enum/manufacturer-status.enum';
import { ManufacturerRepository } from '@/modules/manufacturer/repository/manufacturer.repository';

/**
 * Manufacturer records selected when a product is created.
 */
@Injectable()
export class ManufacturerService {
  constructor(private readonly manufacturerRepository: ManufacturerRepository) {}
  /**
   * Opens an active manufacturer.
   */
  async createManufacturer(name: string): Promise<ManufacturerEntity> {
    return this.manufacturerRepository.create({ name, status: ManufacturerStatus.ACTIVE });
  }
  /**
   * Loads one manufacturer or fails when it does not exist.
   */
  async getManufacturerById(id: number): Promise<ManufacturerEntity> {
    const manufacturer = await this.manufacturerRepository.findById(id);
    if (!manufacturer) {
      throw new ResourceNotFoundException('Manufacturer', id);
    }
    return manufacturer;
  }
  /**
   * Lists manufacturers that have not been removed.
   */
  async listManufacturers(): Promise<ManufacturerEntity[]> {
    return this.manufacturerRepository.list();
  }
  /**
   * Changes the manufacturer name.
   */
  async updateManufacturer(input: UpdateManufacturerRepoInput): Promise<ManufacturerEntity> {
    const manufacturer = await this.manufacturerRepository.update(input);
    if (!manufacturer) {
      throw new ResourceNotFoundException('Manufacturer', input.id);
    }
    return manufacturer;
  }
  /**
   * Activates or deactivates a manufacturer.
   */
  async updateStatus(input: UpdateManufacturerStatusRepoInput): Promise<ManufacturerEntity> {
    const manufacturer = await this.manufacturerRepository.updateStatus(input);
    if (!manufacturer) {
      throw new ResourceNotFoundException('Manufacturer', input.id);
    }
    return manufacturer;
  }
}
