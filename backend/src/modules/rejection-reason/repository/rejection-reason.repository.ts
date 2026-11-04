import { CreateRejectionReasonRepoInput, UpdateRejectionReasonRepoInput, UpdateRejectionReasonStatusRepoInput } from '@/modules/rejection-reason/defs/rejection-reason-repository.defs';
import { RejectionReasonEntity } from '@/modules/rejection-reason/entity/rejection-reason.entity';

/**
 * Persistence contract for managed rejection reasons.
 */
export abstract class RejectionReasonRepository {
  /** Inserts one reason. */
  abstract create(input: CreateRejectionReasonRepoInput): Promise<RejectionReasonEntity>;
  /** Loads one reason, or null when it is missing. */
  abstract findById(id: number): Promise<RejectionReasonEntity | null>;
  /** Lists every reason, oldest first. */
  abstract list(): Promise<RejectionReasonEntity[]>;
  /** Changes the label. Returns null when the reason is missing. */
  abstract update(input: UpdateRejectionReasonRepoInput): Promise<RejectionReasonEntity | null>;
  /** Activates or deactivates a reason. Returns null when it is missing. */
  abstract updateStatus(input: UpdateRejectionReasonStatusRepoInput): Promise<RejectionReasonEntity | null>;
}
