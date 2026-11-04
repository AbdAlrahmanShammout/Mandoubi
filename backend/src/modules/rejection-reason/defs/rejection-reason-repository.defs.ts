import { RejectionReasonStatus } from '@/modules/rejection-reason/enum/rejection-reason-status.enum';

/**
 * New managed rejection reason.
 */
export interface CreateRejectionReasonRepoInput {
  readonly label: string;
  readonly status: RejectionReasonStatus;
}

/**
 * New label for an existing reason.
 */
export interface UpdateRejectionReasonRepoInput {
  readonly id: number;
  readonly label: string;
}

/**
 * Next status for an existing reason.
 */
export interface UpdateRejectionReasonStatusRepoInput {
  readonly id: number;
  readonly status: RejectionReasonStatus;
}
