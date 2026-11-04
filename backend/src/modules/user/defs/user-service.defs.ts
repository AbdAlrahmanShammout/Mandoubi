import { AccountRole } from '@/modules/user/enum/account-role.enum';
import { AccountStatus } from '@/modules/user/enum/account-status.enum';

/**
 * Fields required to store one credential.
 */
export interface CreateUserCredentialServiceInput {
  readonly role: AccountRole;
  readonly mobileNumber: string;
  readonly passwordHash: string;
  readonly pharmacyId?: number;
  readonly driverId?: number;
}

/**
 * Status change for the credential linked to a pharmacy.
 */
export interface UpdateUserStatusByPharmacyServiceInput {
  readonly pharmacyId: number;
  readonly status: AccountStatus;
}

/**
 * Status change for the credential linked to a driver.
 */
export interface UpdateUserStatusByDriverServiceInput {
  readonly driverId: number;
  readonly status: AccountStatus;
}
