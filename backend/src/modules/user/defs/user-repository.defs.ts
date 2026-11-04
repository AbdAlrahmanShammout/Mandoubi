import { AccountRole } from '@/modules/user/enum/account-role.enum';
import { AccountStatus } from '@/modules/user/enum/account-status.enum';

/**
 * Row written when a credential is created.
 */
export interface CreateUserRepoInput {
  readonly role: AccountRole;
  readonly mobileNumber: string;
  readonly passwordHash: string;
  readonly status: AccountStatus;
  readonly pharmacyId: number | null;
  readonly driverId: number | null;
}

/**
 * Status change addressed by the linked pharmacy.
 */
export interface UpdateUserStatusByPharmacyRepoInput {
  readonly pharmacyId: number;
  readonly status: AccountStatus;
}

/**
 * Status change addressed by the linked driver.
 */
export interface UpdateUserStatusByDriverRepoInput {
  readonly driverId: number;
  readonly status: AccountStatus;
}
