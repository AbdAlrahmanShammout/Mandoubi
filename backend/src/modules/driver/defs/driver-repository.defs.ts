import { AccountStatus } from '@/modules/user/enum/account-status.enum';

/**
 * Row written for a driver profile.
 */
export interface CreateDriverRepoInput {
  readonly name: string;
  readonly mobileNumber: string;
  readonly status: AccountStatus;
}

/**
 * Status change addressed by driver id.
 */
export interface UpdateDriverStatusRepoInput {
  readonly id: number;
  readonly status: AccountStatus;
}
