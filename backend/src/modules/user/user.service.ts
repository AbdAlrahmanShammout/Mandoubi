import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { hashPassword } from '@/common/helpers/password.helper';
import { ConflictException } from '@/common/exceptions/conflict.exception';
import { InvalidStateException } from '@/common/exceptions/invalid-state.exception';
import { ResourceNotFoundException } from '@/common/exceptions/resource-not-found.exception';
import { TransactionContext } from '@/common/base/transaction-context';
import { AdminConfigService } from '@/config/admin/admin-config.service';
import { CreateUserCredentialServiceInput, UpdateUserStatusByDriverServiceInput, UpdateUserStatusByPharmacyServiceInput } from '@/modules/user/defs/user-service.defs';
import { UserEntity } from '@/modules/user/entity/user.entity';
import { AccountRole } from '@/modules/user/enum/account-role.enum';
import { AccountStatus } from '@/modules/user/enum/account-status.enum';
import { UserRepository } from '@/modules/user/repository/user.repository';

/**
 * Credential accounts: hashing, lookup, and the bootstrap administrator.
 */
@Injectable()
export class UserService implements OnModuleInit {
  private readonly logger = new Logger(UserService.name);
  constructor(
    private readonly userRepository: UserRepository,
    private readonly adminConfig: AdminConfigService,
  ) {}
  /**
   * Creates the bootstrap administrator when the database is reachable.
   */
  async onModuleInit(): Promise<void> {
    try {
      await this.ensureBootstrapAdmin();
    } catch {
      this.logger.error('The bootstrap admin account could not be created');
    }
  }
  /**
   * Hashes a password. Callers persist only the returned hash.
   */
  async createPasswordHash(password: string): Promise<string> {
    return hashPassword(password);
  }
  /**
   * Inserts the bootstrap administrator when that mobile number is unused.
   */
  async ensureBootstrapAdmin(): Promise<void> {
    const existing = await this.findUserByMobileNumber(this.adminConfig.mobileNumber);
    if (existing) {
      return;
    }
    try {
      await this.userRepository.create({
        role: AccountRole.ADMIN,
        mobileNumber: this.adminConfig.mobileNumber,
        passwordHash: await this.createPasswordHash(this.adminConfig.password),
        status: AccountStatus.ACTIVE,
        pharmacyId: null,
        driverId: null,
      });
    } catch (error) {
      if (error instanceof ConflictException) {
        return;
      }
      throw error;
    }
  }
  /**
   * Stores a credential. The password hash must already be computed.
   */
  async createCredential(input: CreateUserCredentialServiceInput, context?: TransactionContext): Promise<UserEntity> {
    this.assertRoleLink(input);
    return this.userRepository.create({
      role: input.role,
      mobileNumber: input.mobileNumber,
      passwordHash: input.passwordHash,
      status: AccountStatus.ACTIVE,
      pharmacyId: input.pharmacyId ?? null,
      driverId: input.driverId ?? null,
    }, context);
  }
  /**
   * Loads one account or fails when it does not exist.
   */
  async getUserById(id: number): Promise<UserEntity> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new ResourceNotFoundException('User', id);
    }
    return user;
  }
  /**
   * Loads one account by id, or null when it is missing.
   */
  async findUserById(id: number): Promise<UserEntity | null> {
    return this.userRepository.findById(id);
  }
  /**
   * Loads one account by mobile number, or null when it is missing.
   */
  async findUserByMobileNumber(mobileNumber: string): Promise<UserEntity | null> {
    return this.userRepository.findByMobileNumber(mobileNumber);
  }
  /**
   * Keeps the pharmacy credential status aligned with the pharmacy profile.
   */
  async updateStatusByPharmacyId(input: UpdateUserStatusByPharmacyServiceInput, context?: TransactionContext): Promise<void> {
    const updated = await this.userRepository.updateStatusByPharmacyId(input, context);
    if (!updated) {
      throw new InvalidStateException({
        message: 'The pharmacy account has no credential',
        code: 'PHARMACY_CREDENTIAL_MISSING',
        userFriendly: false,
      });
    }
  }
  /**
   * Keeps the driver credential status aligned with the driver profile.
   */
  async updateStatusByDriverId(input: UpdateUserStatusByDriverServiceInput, context?: TransactionContext): Promise<void> {
    const updated = await this.userRepository.updateStatusByDriverId(input, context);
    if (!updated) {
      throw new InvalidStateException({
        message: 'The driver account has no credential',
        code: 'DRIVER_CREDENTIAL_MISSING',
        userFriendly: false,
      });
    }
  }
  private assertRoleLink(input: CreateUserCredentialServiceInput): void {
    const linkedToPharmacy = input.pharmacyId !== undefined;
    const linkedToDriver = input.driverId !== undefined;
    if (input.role === AccountRole.ADMIN && (linkedToPharmacy || linkedToDriver)) {
      throw new InvalidStateException({
        message: 'An admin account cannot be linked to a pharmacy or a driver',
        code: 'ADMIN_LINK_NOT_ALLOWED',
        userFriendly: false,
      });
    }
    if (input.role === AccountRole.PHARMACY && (!linkedToPharmacy || linkedToDriver)) {
      throw new InvalidStateException({
        message: 'A pharmacy account must be linked to one pharmacy',
        code: 'PHARMACY_LINK_REQUIRED',
        userFriendly: false,
      });
    }
    if (input.role === AccountRole.DRIVER && (!linkedToDriver || linkedToPharmacy)) {
      throw new InvalidStateException({
        message: 'A driver account must be linked to one driver',
        code: 'DRIVER_LINK_REQUIRED',
        userFriendly: false,
      });
    }
  }
}
