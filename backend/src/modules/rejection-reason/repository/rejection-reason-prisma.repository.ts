import { Injectable } from '@nestjs/common';
import { ConflictException } from '@/common/exceptions/conflict.exception';
import { rethrowConflict } from '@/providers/database/prisma/prisma-client.resolver';
import { PrismaProviderService } from '@/providers/database/prisma/prisma-provider.service';
import { CreateRejectionReasonRepoInput, UpdateRejectionReasonRepoInput, UpdateRejectionReasonStatusRepoInput } from '@/modules/rejection-reason/defs/rejection-reason-repository.defs';
import { RejectionReasonEntity } from '@/modules/rejection-reason/entity/rejection-reason.entity';
import { RejectionReasonMapper } from '@/modules/rejection-reason/mapper/rejection-reason.mapper';
import { RejectionReasonRepository } from '@/modules/rejection-reason/repository/rejection-reason.repository';

/**
 * Prisma storage for managed rejection reasons.
 */
@Injectable()
export class RejectionReasonPrismaRepository extends RejectionReasonRepository {
  constructor(private readonly prisma: PrismaProviderService) {
    super();
  }
  /** Inserts one reason. */
  async create(input: CreateRejectionReasonRepoInput): Promise<RejectionReasonEntity> {
    try {
      const result = await this.prisma.rejectionReason.create({ data: input });
      return RejectionReasonMapper.toEntity(result);
    } catch (error) {
      rethrowConflict(error, labelConflict());
    }
  }
  /** Loads one reason. */
  async findById(id: number): Promise<RejectionReasonEntity | null> {
    const result = await this.prisma.rejectionReason.findUnique({ where: { id } });
    return result ? RejectionReasonMapper.toEntity(result) : null;
  }
  /** Lists every reason, oldest first. */
  async list(): Promise<RejectionReasonEntity[]> {
    const results = await this.prisma.rejectionReason.findMany({ orderBy: { id: 'asc' } });
    return results.map((result) => RejectionReasonMapper.toEntity(result));
  }
  /** Changes the label when the reason still exists. */
  async update(input: UpdateRejectionReasonRepoInput): Promise<RejectionReasonEntity | null> {
    try {
      const updated = await this.prisma.rejectionReason.updateMany({ where: { id: input.id }, data: { label: input.label } });
      if (updated.count === 0) {
        return null;
      }
      return this.findById(input.id);
    } catch (error) {
      rethrowConflict(error, labelConflict());
    }
  }
  /** Activates or deactivates a reason when it still exists. */
  async updateStatus(input: UpdateRejectionReasonStatusRepoInput): Promise<RejectionReasonEntity | null> {
    const updated = await this.prisma.rejectionReason.updateMany({ where: { id: input.id }, data: { status: input.status } });
    if (updated.count === 0) {
      return null;
    }
    return this.findById(input.id);
  }
}

function labelConflict(): ConflictException {
  return new ConflictException({ message: 'A rejection reason with this label already exists', code: 'REJECTION_REASON_IN_USE' });
}
