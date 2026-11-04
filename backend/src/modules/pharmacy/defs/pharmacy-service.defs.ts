import { AccountStatus } from '@/modules/user/enum/account-status.enum';

/**
 * Profile and password used when an administrator opens a pharmacy account.
 */
export interface CreatePharmacyAccountServiceInput {
  readonly name: string;
  readonly mobileNumber: string;
  readonly address: string;
  readonly password: string;
}

/**
 * Status change for one pharmacy and its credential.
 */
export interface UpdatePharmacyStatusServiceInput {
  readonly pharmacyId: number;
  readonly status: AccountStatus;
}
