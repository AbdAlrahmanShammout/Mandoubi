import { Injectable } from '@nestjs/common';
import { TransactionRunner } from '@/common/base/transaction-runner';
import { ConflictException } from '@/common/exceptions/conflict.exception';
import { ResourceNotFoundException } from '@/common/exceptions/resource-not-found.exception';
import { CreateDriverAccountServiceInput, UpdateDriverStatusServiceInput } from '@/modules/driver/defs/driver-service.defs';
import { DriverEntity } from '@/modules/driver/entity/driver.entity';
import { DriverRepository } from '@/modules/driver/repository/driver.repository';
import { AccountRole } from '@/modules/user/enum/account-role.enum';
import { AccountStatus } from '@/modules/user/enum/account-status.enum';
import { UserService } from '@/modules/user/user.service';

/**
 * Driver profiles and the credential created with each one.
 */
@Injectable()
export class DriverService {
  constructor(
    private readonly driverRepository: DriverRepository,
    private readonly userService: UserService,
    private readonly transactionRunner: TransactionRunner,
  ) {}
  /**
   * Opens a driver profile and its sign-in credential together.
   */
  async createAccount(input: CreateDriverAccountServiceInput): Promise<DriverEntity> {
    await this.assertMobileAvailable(input.mobileNumber);
    const passwordHash = await this.userService.createPasswordHash(input.password);
    return this.transactionRunner.run(async (context) => {
      const driver = await this.driverRepository.create({
        name: input.name,
        mobileNumber: input.mobileNumber,
        status: AccountStatus.ACTIVE,
      }, context);
      await this.userService.createCredential({
        role: AccountRole.DRIVER,
        mobileNumber: input.mobileNumber,
        passwordHash,
        driverId: driver.id,
      }, context);
      return driver;
    });
  }
  /**
   * Loads one driver or fails when it does not exist.
   */
  async getDriverById(id: number): Promise<DriverEntity> {
    const driver = await this.driverRepository.findById(id);
    if (!driver) {
      throw new ResourceNotFoundException('Driver', id);
    }
    return driver;
  }
  /**
   * Changes the driver profile status and the linked credential together.
   */
  async updateAccountStatus(input: UpdateDriverStatusServiceInput): Promise<DriverEntity> {
    return this.transactionRunner.run(async (context) => {
      const driver = await this.driverRepository.updateStatus({ id: input.driverId, status: input.status }, context);
      if (!driver) {
        throw new ResourceNotFoundException('Driver', input.driverId);
      }
      await this.userService.updateStatusByDriverId({ driverId: input.driverId, status: input.status }, context);
      return driver;
    });
  }
  private async assertMobileAvailable(mobileNumber: string): Promise<void> {
    const driver = await this.driverRepository.findByMobileNumber(mobileNumber);
    const user = await this.userService.findUserByMobileNumber(mobileNumber);
    if (driver || user) {
      throw new ConflictException({
        message: 'An account with this mobile number already exists',
        code: 'MOBILE_NUMBER_IN_USE',
      });
    }
  }
}
