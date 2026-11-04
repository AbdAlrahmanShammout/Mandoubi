import { Injectable } from '@nestjs/common';
import { TransactionRunner } from '@/common/base/transaction-runner';
import { DeliveryService } from '@/modules/delivery/delivery.service';
import { DriverSettlementEntity } from '@/modules/driver-settlement/entity/driver-settlement.entity';
import { planDriverSettlement } from '@/modules/driver-settlement/helpers/plan-driver-settlement.helper';
import { DriverSettlementRepository } from '@/modules/driver-settlement/repository/driver-settlement.repository';
import { DriverService } from '@/modules/driver/driver.service';
import { InvoiceStatus } from '@/modules/invoice/enum/invoice-status.enum';
import { PaymentService } from '@/modules/payment/payment.service';
import { InvoiceCurrency } from '@/modules/product/enum/invoice-currency.enum';
import { subtractMoney, sumMoney } from '@/modules/product/helpers/syp-price.helper';

/**
 * Amount collected, handed over, and still held in one currency.
 */
export interface CurrencyHolding {
  readonly currency: InvoiceCurrency;
  readonly collected: string;
  readonly handedOver: string;
  readonly held: string;
}

/**
 * One amount the driver collected.
 */
export interface DriverCollectionLine {
  readonly paymentId: number;
  readonly currency: InvoiceCurrency;
  readonly amount: string;
  readonly settled: boolean;
  readonly invoiceIds: readonly number[];
}

/**
 * Driver delivery counts and the money still held.
 */
export interface DriverPosition {
  readonly driverId: number;
  readonly driverName: string;
  readonly assignedCount: number;
  readonly deliveredPaidCount: number;
  readonly deliveredUnpaidCount: number;
  readonly notDeliveredCount: number;
  readonly holdings: readonly CurrencyHolding[];
  readonly collections: readonly DriverCollectionLine[];
}

/**
 * Handover requested by an administrator.
 */
interface SettleDriverInput {
  readonly driverId: number;
  readonly currency: InvoiceCurrency;
  readonly amount: string;
  readonly receivedByName: string;
  readonly paymentIds: readonly number[];
}

/**
 * Reviews driver collections and records the handover to the administration.
 */
@Injectable()
export class DriverSettlementService {
  constructor(
    private readonly driverSettlementRepository: DriverSettlementRepository,
    private readonly driverService: DriverService,
    private readonly deliveryService: DeliveryService,
    private readonly paymentService: PaymentService,
    private readonly transactionRunner: TransactionRunner,
  ) {}
  /**
   * Summarises assigned invoices and the amounts the driver still holds.
   */
  async getPosition(driverId: number): Promise<DriverPosition> {
    const driver = await this.driverService.getDriverById(driverId);
    const assignments = await this.deliveryService.listForDriver(driverId);
    const collections = await this.paymentService.listDriverCollections(driverId);
    const settlements = await this.driverSettlementRepository.listByDriverId(driverId);
    const statuses = assignments.map((assignment) => assignment.invoice?.status);
    return {
      driverId: driver.id,
      driverName: driver.name,
      assignedCount: assignments.length,
      deliveredPaidCount: countStatus(statuses, InvoiceStatus.DELIVERED_PAID),
      deliveredUnpaidCount: countStatus(statuses, InvoiceStatus.DELIVERED_UNPAID),
      notDeliveredCount: countStatus(statuses, InvoiceStatus.NOT_DELIVERED),
      holdings: buildHoldings(collections, settlements),
      collections: collections.map((collection) => ({
        paymentId: collection.id,
        currency: collection.currency,
        amount: collection.amount,
        settled: collection.settled,
        invoiceIds: collection.invoiceIds,
      })),
    };
  }
  /**
   * Records the handover of whole collections.
   */
  async settle(input: SettleDriverInput): Promise<DriverSettlementEntity> {
    await this.driverService.getDriverById(input.driverId);
    const payments = await this.paymentService.getCollections(input.paymentIds);
    const paymentIds = planDriverSettlement({ ...input, payments });
    return this.transactionRunner.run(async (context) => this.driverSettlementRepository.create({
      driverId: input.driverId,
      currency: input.currency,
      amount: input.amount,
      receivedByName: input.receivedByName,
      occurredAt: new Date(),
      paymentIds,
    }, context));
  }
}

function countStatus(statuses: readonly (InvoiceStatus | undefined)[], expected: InvoiceStatus): number {
  return statuses.filter((status) => status === expected).length;
}

function buildHoldings(collections: readonly { currency: InvoiceCurrency; amount: string; settled: boolean }[], settlements: readonly { currency: InvoiceCurrency; amount: string }[]): CurrencyHolding[] {
  const currencies = [...new Set([...collections.map((collection) => collection.currency), ...settlements.map((settlement) => settlement.currency)])];
  return currencies.map((currency) => {
    const collected = sumMoney(collections.filter((collection) => collection.currency === currency).map((collection) => collection.amount));
    const handedOver = sumMoney(settlements.filter((settlement) => settlement.currency === currency).map((settlement) => settlement.amount));
    return { currency, collected, handedOver, held: subtractMoney(collected, handedOver) };
  });
}
