import { Injectable } from '@nestjs/common';
import { TransactionContext } from '@/common/base/transaction-context';
import { TransactionRunner } from '@/common/base/transaction-runner';
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
    return this.transactionRunner.run(async (context) => {
      await this.invoiceService.markAssigned(input.invoiceId, context);
      return this.deliveryRepository.createAssignment(input, context);
    });
  }
  /**
   * Lists the invoices still waiting for this driver's result.
   */
  async listOpenForDriver(driverId: number): Promise<DeliveryAssignmentEntity[]> {
    return this.deliveryRepository.listOpenByDriverId(driverId);
  }
  /**
   * Records one result. A delivered invoice issues its reserved quantity without reducing available stock again.
   */
  async recordResult(input: RecordDeliveryInput): Promise<RecordedDelivery> {
    const resolved = resolveDeliveryResult(input);
    return this.transactionRunner.run(async (context) => {
      const assignment = await this.deliveryRepository.findByInvoiceId(input.invoiceId, context);
      if (!assignment || assignment.driverId !== input.driverId) {
        throw new ResourceNotFoundException('Delivery assignment', input.invoiceId);
      }
      const invoice = await this.invoiceService.markDelivered(input.invoiceId, invoiceStatusFor(resolved.result), context);
      const event = await this.deliveryRepository.appendEvent({
        assignmentId: assignment.id,
        invoiceId: input.invoiceId,
        driverId: input.driverId,
        occurredAt: new Date(),
        ...resolved,
      }, context);
      await this.issueDeliveredStock(invoice, resolved, context);
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
