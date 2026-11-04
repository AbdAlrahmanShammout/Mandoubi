import { Injectable } from '@nestjs/common';
import { TransactionContext } from '@/common/base/transaction-context';
import { TransactionRunner } from '@/common/base/transaction-runner';
import { InternalException } from '@/common/exceptions/internal.exception';
import { InvalidStateException } from '@/common/exceptions/invalid-state.exception';
import { ResourceNotFoundException } from '@/common/exceptions/resource-not-found.exception';
import { DeliveryResultSelection, ResolvedDeliveryResult, resolveDeliveryResult } from '@/modules/delivery/helpers/resolve-delivery-result.helper';
import { DeliveryAssignmentEntity } from '@/modules/delivery/entity/delivery-assignment.entity';
import { DeliveryEventEntity } from '@/modules/delivery/entity/delivery-event.entity';
import { DeliveryResult } from '@/modules/delivery/enum/delivery-result.enum';
import { DeliveryRepository } from '@/modules/delivery/repository/delivery.repository';
import { DriverService } from '@/modules/driver/driver.service';
import { InvoiceEntity } from '@/modules/invoice/entity/invoice.entity';
import { InvoiceItemEntity } from '@/modules/invoice/entity/invoice-item.entity';
import { InvoiceStatus } from '@/modules/invoice/enum/invoice-status.enum';
import { InvoiceService } from '@/modules/invoice/invoice.service';
import { AuditAction } from '@/modules/audit/enum/audit-action.enum';
import { AuditService } from '@/modules/audit/audit.service';
import { NotificationAudience } from '@/modules/notification/enum/notification-audience.enum';
import { NotificationKind } from '@/modules/notification/enum/notification-kind.enum';
import { NotificationService } from '@/modules/notification/notification.service';
import { PaymentService } from '@/modules/payment/payment.service';
import { ProductService } from '@/modules/product/product.service';
import { AccountStatus } from '@/modules/user/enum/account-status.enum';

/**
 * Invoice an administrator gives to one driver.
 */
interface AssignDeliveryInput {
  readonly invoiceId: number;
  readonly driverId: number;
  readonly assignedByUserId: number;
}

/**
 * Result recorded by the assigned driver.
 */
interface RecordDeliveryInput extends DeliveryResultSelection {
  readonly invoiceId: number;
  readonly driverId: number;
  readonly actorUserId: number;
}

/**
 * Stored event plus the invoice status it produced.
 */
export interface RecordedDelivery {
  readonly event: DeliveryEventEntity;
  readonly invoiceStatus: InvoiceStatus;
}

/**
 * Assigns approved invoices and stores one delivery result per assignment.
 */
@Injectable()
export class DeliveryService {
  constructor(
    private readonly deliveryRepository: DeliveryRepository,
    private readonly invoiceService: InvoiceService,
    private readonly driverService: DriverService,
    private readonly productService: ProductService,
    private readonly paymentService: PaymentService,
    private readonly auditService: AuditService,
    private readonly notificationService: NotificationService,
    private readonly transactionRunner: TransactionRunner,
  ) {}
  /**
   * Assigns one approved invoice to an active driver. The driver cannot reassign it.
   */
  async assignInvoice(input: AssignDeliveryInput): Promise<DeliveryAssignmentEntity> {
    const driver = await this.driverService.getDriverById(input.driverId);
    if (driver.status !== AccountStatus.ACTIVE) {
      throw new InvalidStateException({ message: 'The driver account is not active', code: 'DRIVER_INACTIVE' });
    }
    const invoice = await this.invoiceService.getInvoiceById(input.invoiceId);
    if (invoice.status === InvoiceStatus.RETURNED_TO_WAREHOUSE) {
      return this.sendOutAgain(input, invoice);
    }
    return this.transactionRunner.run(async (context) => {
      await this.invoiceService.markAssigned(input.invoiceId, context);
      const assignment = await this.deliveryRepository.createAssignment(input, context);
      await this.recordStatus(input.assignedByUserId, input.invoiceId, InvoiceStatus.APPROVED, InvoiceStatus.ASSIGNED, context);
      await this.notifyAssigned(input.invoiceId, input.driverId, assignment.pharmacy?.id, context);
      return assignment;
    });
  }
  /**
   * Lists the invoices still waiting for this driver's result.
   */
  async listOpenForDriver(driverId: number): Promise<DeliveryAssignmentEntity[]> {
    return this.deliveryRepository.listOpenByDriverId(driverId);
  }
  /**
   * Lists every invoice assigned to one driver, including finished ones.
   */
  async listForDriver(driverId: number): Promise<DeliveryAssignmentEntity[]> {
    return this.deliveryRepository.listByDriverId(driverId);
  }
  /**
   * Records one result. A delivered invoice issues its reserved quantity without reducing available stock again.
   */
  async recordResult(input: RecordDeliveryInput): Promise<RecordedDelivery> {
    const resolved = resolveDeliveryResult(input);
    const driver = await this.driverService.getDriverById(input.driverId);
    return this.transactionRunner.run(async (context) => {
      const assignment = await this.deliveryRepository.findByInvoiceId(input.invoiceId, context);
      if (!assignment || assignment.driverId !== input.driverId) {
        throw new ResourceNotFoundException('Delivery assignment', input.invoiceId);
      }
      const previousStatus = assignment.invoice?.status ?? InvoiceStatus.ASSIGNED;
      const invoice = await this.invoiceService.markDelivered(input.invoiceId, invoiceStatusFor(resolved.result), context);
      const event = await this.deliveryRepository.appendEvent({
        assignmentId: assignment.id,
        invoiceId: input.invoiceId,
        driverId: input.driverId,
        occurredAt: new Date(),
        ...resolved,
      }, context);
      await this.issueDeliveredStock(invoice, resolved, context);
      await this.recordCollection(assignment, driver.name, invoice, resolved, event.occurredAt, input.actorUserId, context);
      await this.recordStatus(input.actorUserId, input.invoiceId, previousStatus, invoice.status, context);
      await this.notifyDelivery(input.invoiceId, assignment.pharmacy?.id, invoice.status, context);
      return { event, invoiceStatus: invoice.status };
    });
  }
  private async issueDeliveredStock(invoice: InvoiceEntity, resolved: ResolvedDeliveryResult, context: TransactionContext): Promise<void> {
    if (resolved.result === DeliveryResult.NOT_DELIVERED) {
      return;
    }
    for (const item of requireItems(invoice)) {
      await this.productService.issueRecordedStock({ productId: item.productId, warehouseId: item.primaryWarehouseId, quantity: item.totalQuantity }, context);
    }
  }
  private async sendOutAgain(input: AssignDeliveryInput, invoice: InvoiceEntity): Promise<DeliveryAssignmentEntity> {
    return this.transactionRunner.run(async (context) => {
      const sent = await this.invoiceService.markOutForDelivery(input.invoiceId, context);
      await this.reserveItems(requireItems(sent), context);
      const reassigned = await this.deliveryRepository.reassign(input, context);
      if (!reassigned) {
        throw new ResourceNotFoundException('Delivery assignment', input.invoiceId);
      }
      await this.recordStatus(input.assignedByUserId, input.invoiceId, invoice.status, InvoiceStatus.OUT_FOR_DELIVERY, context);
      const assignment = await this.deliveryRepository.findByInvoiceId(input.invoiceId, context);
      if (!assignment) {
        throw new ResourceNotFoundException('Delivery assignment', input.invoiceId);
      }
      await this.notifyAssigned(input.invoiceId, input.driverId, assignment.pharmacy?.id, context);
      return assignment;
    });
  }
  private async reserveItems(items: readonly InvoiceItemEntity[], context: TransactionContext): Promise<void> {
    for (const item of items) {
      await this.productService.reserveRecordedStock({ productId: item.productId, warehouseId: item.primaryWarehouseId, quantity: item.totalQuantity }, context);
    }
  }
  private async recordCollection(assignment: DeliveryAssignmentEntity, driverName: string, invoice: InvoiceEntity, resolved: ResolvedDeliveryResult, occurredAt: Date, actorUserId: number, context: TransactionContext): Promise<void> {
    if (resolved.result !== DeliveryResult.DELIVERED_PAID) {
      return;
    }
    if (!assignment.pharmacy) {
      throw new InternalException('The pharmacy to visit was not loaded');
    }
    await this.paymentService.recordDriverCollection({
      pharmacyId: assignment.pharmacy.id,
      driverId: assignment.driverId,
      driverName,
      invoice,
      occurredAt,
      actorUserId,
    }, context);
  }
  private async recordStatus(actorUserId: number, invoiceId: number, from: InvoiceStatus, to: InvoiceStatus, context: TransactionContext): Promise<void> {
    await this.auditService.record({
      actorUserId,
      action: AuditAction.INVOICE_STATUS_CHANGED,
      resourceType: 'invoice',
      resourceId: String(invoiceId),
      detail: { from, to },
    }, context);
  }
  private async notifyAssigned(invoiceId: number, driverId: number, pharmacyId: number | undefined, context: TransactionContext): Promise<void> {
    const message = { kind: NotificationKind.INVOICE_ASSIGNED, title: 'Invoice assigned', body: `Invoice ${invoiceId} was assigned`, resourceType: 'invoice', resourceId: invoiceId };
    await this.notificationService.notify({ ...message, audience: NotificationAudience.DRIVER, audienceId: driverId }, context);
    if (pharmacyId !== undefined) {
      await this.notificationService.notify({ ...message, audience: NotificationAudience.PHARMACY, audienceId: pharmacyId }, context);
    }
  }
  private async notifyDelivery(invoiceId: number, pharmacyId: number | undefined, status: InvoiceStatus, context: TransactionContext): Promise<void> {
    const message = { title: 'Delivery updated', body: `Invoice ${invoiceId} is ${status}`, resourceType: 'invoice', resourceId: invoiceId };
    await this.notificationService.notify({ ...message, audience: NotificationAudience.ADMIN, audienceId: null, kind: NotificationKind.DELIVERY_UPDATED }, context);
    if (pharmacyId === undefined) {
      return;
    }
    await this.notificationService.notify({ ...message, audience: NotificationAudience.PHARMACY, audienceId: pharmacyId, kind: NotificationKind.DELIVERY_UPDATED }, context);
    if (status === InvoiceStatus.DELIVERED_UNPAID) {
      await this.notificationService.notify({ ...message, audience: NotificationAudience.PHARMACY, audienceId: pharmacyId, kind: NotificationKind.AMOUNT_DUE, title: 'Amount due', body: `Invoice ${invoiceId} remains due` }, context);
    }
  }
}

function invoiceStatusFor(result: DeliveryResult): InvoiceStatus {
  if (result === DeliveryResult.DELIVERED_PAID) {
    return InvoiceStatus.DELIVERED_PAID;
  }
  if (result === DeliveryResult.DELIVERED_UNPAID) {
    return InvoiceStatus.DELIVERED_UNPAID;
  }
  return InvoiceStatus.NOT_DELIVERED;
}

function requireItems(invoice: InvoiceEntity): readonly InvoiceItemEntity[] {
  if (!invoice.items) {
    throw new InvalidStateException({ message: 'The invoice lines were not loaded', code: 'INVOICE_LINES_MISSING' });
  }
  return invoice.items;
}
