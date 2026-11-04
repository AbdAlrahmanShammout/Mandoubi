import { Injectable } from '@nestjs/common';
import { TransactionRunner } from '@/common/base/transaction-runner';
import { ConflictException } from '@/common/exceptions/conflict.exception';
import { ResourceNotFoundException } from '@/common/exceptions/resource-not-found.exception';
import { CreatePharmacyAccountServiceInput, UpdatePharmacyStatusServiceInput } from '@/modules/pharmacy/defs/pharmacy-service.defs';
import { PharmacyEntity } from '@/modules/pharmacy/entity/pharmacy.entity';
import { PharmacyRepository } from '@/modules/pharmacy/repository/pharmacy.repository';
import { AccountRole } from '@/modules/user/enum/account-role.enum';
import { AccountStatus } from '@/modules/user/enum/account-status.enum';
import { UserService } from '@/modules/user/user.service';

/**
 * Pharmacy profiles and the credential created with each one.
 */
@Injectable()
export class PharmacyService {
  constructor(
    private readonly pharmacyRepository: PharmacyRepository,
    private readonly userService: UserService,
    private readonly transactionRunner: TransactionRunner,
  ) {}
  /**
   * Opens a pharmacy profile and its sign-in credential together.
   */
  async createAccount(input: CreatePharmacyAccountServiceInput): Promise<PharmacyEntity> {
    await this.assertMobileAvailable(input.mobileNumber);
    const passwordHash = await this.userService.createPasswordHash(input.password);
    return this.transactionRunner.run(async (context) => {
      const pharmacy = await this.pharmacyRepository.create({
        name: input.name,
        mobileNumber: input.mobileNumber,
        address: input.address,
        status: AccountStatus.ACTIVE,
      }, context);
      await this.userService.createCredential({
        role: AccountRole.PHARMACY,
        mobileNumber: input.mobileNumber,
        passwordHash,
        pharmacyId: pharmacy.id,
      }, context);
      return pharmacy;
    });
  }
  /**
   * Loads one pharmacy or fails when it does not exist.
   */
  async getPharmacyById(id: number): Promise<PharmacyEntity> {
    const pharmacy = await this.pharmacyRepository.findById(id);
    if (!pharmacy) {
      throw new ResourceNotFoundException('Pharmacy', id);
    }
    return pharmacy;
  }
  /**
   * Changes the pharmacy profile status and the linked credential together.
   */
  async updateAccountStatus(input: UpdatePharmacyStatusServiceInput): Promise<PharmacyEntity> {
    return this.transactionRunner.run(async (context) => {
      const pharmacy = await this.pharmacyRepository.updateStatus({ id: input.pharmacyId, status: input.status }, context);
      if (!pharmacy) {
        throw new ResourceNotFoundException('Pharmacy', input.pharmacyId);
      }
      await this.userService.updateStatusByPharmacyId({ pharmacyId: input.pharmacyId, status: input.status }, context);
      return pharmacy;
    });
  }
  private async assertMobileAvailable(mobileNumber: string): Promise<void> {
    const pharmacy = await this.pharmacyRepository.findByMobileNumber(mobileNumber);
    const user = await this.userService.findUserByMobileNumber(mobileNumber);
    if (pharmacy || user) {
      throw new ConflictException({
        message: 'An account with this mobile number already exists',
        code: 'MOBILE_NUMBER_IN_USE',
      });
    }
  }
}
