import { AccountStatus } from '@/modules/user/enum/account-status.enum';

/**
 * Profile and password used when an administrator opens a driver account.
 */
export interface CreateDriverAccountServiceInput {
  readonly name: string;
  readonly mobileNumber: string;
  readonly password: string;
}

/**
 * Status change for one driver and its credential.
 */
export interface UpdateDriverStatusServiceInput {
  readonly driverId: number;
  readonly status: AccountStatus;
}
