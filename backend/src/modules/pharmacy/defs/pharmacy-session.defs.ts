/**
 * Row written when a pharmacy signs in.
 */
export interface CreatePharmacySessionRepoInput {
  readonly pharmacyId: number;
}

/**
 * Session the pharmacy app must still own.
 */
export interface AssertActivePharmacySessionInput {
  readonly sessionId: number;
  readonly pharmacyId: number;
}
