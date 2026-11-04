import { Injectable } from '@nestjs/common';
import { ConflictException } from '@/common/exceptions/conflict.exception';
import { TransactionContext } from '@/common/base/transaction-context';
import { rethrowConflict, resolvePrismaClient } from '@/providers/database/prisma/prisma-client.resolver';
import { PrismaProviderService } from '@/providers/database/prisma/prisma-provider.service';
import { CreateDeliveryAssignmentRepoInput, CreateDeliveryEventRepoInput } from '@/modules/delivery/defs/delivery-repository.defs';
import { DeliveryAssignmentEntity } from '@/modules/delivery/entity/delivery-assignment.entity';
import { DeliveryEventEntity } from '@/modules/delivery/entity/delivery-event.entity';
import { DeliveryAssignmentMapper } from '@/modules/delivery/mapper/delivery-assignment.mapper';
import { DeliveryEventMapper } from '@/modules/delivery/mapper/delivery-event.mapper';
import { DeliveryRepository } from '@/modules/delivery/repository/delivery.repository';
import { deliveryAssignmentInclude } from '@/modules/delivery/types/delivery-assignment.include';

/**
 * Prisma storage for assignments and append-only delivery events.
 */
@Injectable()
export class DeliveryPrismaRepository extends DeliveryRepository {
  constructor(private readonly prisma: PrismaProviderService) {
    super();
  }
  /** Inserts one assignment on the given transaction when one is open. */
  async createAssignment(input: CreateDeliveryAssignmentRepoInput, context?: TransactionContext): Promise<DeliveryAssignmentEntity> {
    const client = resolvePrismaClient(this.prisma, context);
    try {
      const result = await client.deliveryAssignment.create({ data: input, include: deliveryAssignmentInclude });
      return DeliveryAssignmentMapper.toEntity(result);
    } catch (error) {
      rethrowConflict(error, alreadyAssigned());
    }
  }
  /** Loads one assignment with the pharmacy and invoice. */
  async findByInvoiceId(invoiceId: number, context?: TransactionContext): Promise<DeliveryAssignmentEntity | null> {
    const client = resolvePrismaClient(this.prisma, context);
    const result = await client.deliveryAssignment.findUnique({ where: { invoiceId }, include: deliveryAssignmentInclude });
    return result ? DeliveryAssignmentMapper.toEntity(result) : null;
  }
  /** Lists assignments whose invoice is still waiting for a result. */
  async listOpenByDriverId(driverId: number): Promise<DeliveryAssignmentEntity[]> {
    const results = await this.prisma.deliveryAssignment.findMany({
      where: { driverId, invoice: { status: { in: ['ASSIGNED', 'OUT_FOR_DELIVERY'] } } },
      include: deliveryAssignmentInclude,
      orderBy: { id: 'asc' },
    });
    return results.map((result) => DeliveryAssignmentMapper.toEntity(result));
  }
  /** Lists every assignment given to one driver, oldest first. */
  async listByDriverId(driverId: number): Promise<DeliveryAssignmentEntity[]> {
    const results = await this.prisma.deliveryAssignment.findMany({ where: { driverId }, include: deliveryAssignmentInclude, orderBy: { id: 'asc' } });
    return results.map((result) => DeliveryAssignmentMapper.toEntity(result));
  }
  /** Updates the driver on the assignment that already belongs to the invoice. */
  async reassign(input: { readonly invoiceId: number; readonly driverId: number; readonly assignedByUserId: number }, context: TransactionContext): Promise<boolean> {
    const client = resolvePrismaClient(this.prisma, context);
    const updated = await client.deliveryAssignment.updateMany({ where: { invoiceId: input.invoiceId }, data: { driverId: input.driverId, assignedByUserId: input.assignedByUserId } });
    return updated.count === 1;
  }
  /** Inserts one event and does not update older events. */
  async appendEvent(input: CreateDeliveryEventRepoInput, context?: TransactionContext): Promise<DeliveryEventEntity> {
    const client = resolvePrismaClient(this.prisma, context);
    const result = await client.deliveryEvent.create({ data: input });
    return DeliveryEventMapper.toEntity(result);
  }
}

function alreadyAssigned(): ConflictException {
  return new ConflictException({ message: 'This invoice is already assigned', code: 'INVOICE_ALREADY_ASSIGNED' });
}
