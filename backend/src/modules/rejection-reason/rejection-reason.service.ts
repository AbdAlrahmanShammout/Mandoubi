import { Injectable } from '@nestjs/common';
import { InvalidStateException } from '@/common/exceptions/invalid-state.exception';
import { ResourceNotFoundException } from '@/common/exceptions/resource-not-found.exception';
import { UpdateRejectionReasonRepoInput, UpdateRejectionReasonStatusRepoInput } from '@/modules/rejection-reason/defs/rejection-reason-repository.defs';
import { RejectionReasonEntity } from '@/modules/rejection-reason/entity/rejection-reason.entity';
import { RejectionReasonStatus } from '@/modules/rejection-reason/enum/rejection-reason-status.enum';
import { RejectionReasonRepository } from '@/modules/rejection-reason/repository/rejection-reason.repository';

/**
 * Managed reasons used when an invoice is rejected.
 */
@Injectable()
export class RejectionReasonService {
  constructor(private readonly rejectionReasonRepository: RejectionReasonRepository) {}
  /**
   * Opens an active rejection reason.
   */
  async createReason(label: string): Promise<RejectionReasonEntity> {
    return this.rejectionReasonRepository.create({ label, status: RejectionReasonStatus.ACTIVE });
  }
  /**
   * Lists every managed reason.
   */
  async listReasons(): Promise<RejectionReasonEntity[]> {
    return this.rejectionReasonRepository.list();
  }
  /**
   * Changes the label shown to the pharmacy.
   */
  async updateReason(input: UpdateRejectionReasonRepoInput): Promise<RejectionReasonEntity> {
    const reason = await this.rejectionReasonRepository.update(input);
    if (!reason) {
      throw new ResourceNotFoundException('Rejection reason', input.id);
    }
    return reason;
  }
  /**
   * Activates or deactivates a reason.
   */
  async updateStatus(input: UpdateRejectionReasonStatusRepoInput): Promise<RejectionReasonEntity> {
    const reason = await this.rejectionReasonRepository.updateStatus(input);
    if (!reason) {
      throw new ResourceNotFoundException('Rejection reason', input.id);
    }
    return reason;
  }
  /**
   * Loads an active reason that can be stored on a rejected invoice.
   */
  async requireActive(id: number): Promise<RejectionReasonEntity> {
    const reason = await this.rejectionReasonRepository.findById(id);
    if (!reason) {
      throw new ResourceNotFoundException('Rejection reason', id);
    }
    if (reason.status !== RejectionReasonStatus.ACTIVE) {
      throw new InvalidStateException({ message: 'This rejection reason is not active', code: 'REJECTION_REASON_INACTIVE' });
    }
    return reason;
  }
}
