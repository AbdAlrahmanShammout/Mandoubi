import { AccountStatus } from '@/modules/user/enum/account-status.enum';

/**
 * Row written for a pharmacy profile.
 */
export interface CreatePharmacyRepoInput {
  readonly name: string;
  readonly mobileNumber: string;
  readonly address: string;
  readonly status: AccountStatus;
}

/**
 * Status change addressed by pharmacy id.
 */
export interface UpdatePharmacyStatusRepoInput {
  readonly id: number;
  readonly status: AccountStatus;
}
