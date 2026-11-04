import { ApiProperty } from '@nestjs/swagger';
import { CurrencyHolding, DriverCollectionLine, DriverPosition } from '@/modules/driver-settlement/driver-settlement.service';
import { DriverSettlementEntity } from '@/modules/driver-settlement/entity/driver-settlement.entity';
import { InvoiceCurrency } from '@/modules/product/enum/invoice-currency.enum';
import { BaseModelResponse } from '@/common/base/base-model.response';

/**
 * Money still held by a driver in one currency.
 */
export class CurrencyHoldingResponse {
  @ApiProperty({ enum: InvoiceCurrency, example: InvoiceCurrency.SYP })
  readonly currency: InvoiceCurrency;
  @ApiProperty({ example: '30000.00' })
  readonly collected: string;
  @ApiProperty({ example: '0.00' })
  readonly handedOver: string;
  @ApiProperty({ example: '30000.00' })
  readonly held: string;
  constructor(holding: CurrencyHolding) {
    this.currency = holding.currency;
    this.collected = holding.collected;
    this.handedOver = holding.handedOver;
    this.held = holding.held;
  }
}

/**
 * One collection the driver can hand over.
 */
export class DriverCollectionLineResponse {
  @ApiProperty({ example: 1 })
  readonly paymentId: number;
  @ApiProperty({ enum: InvoiceCurrency, example: InvoiceCurrency.SYP })
  readonly currency: InvoiceCurrency;
  @ApiProperty({ example: '30000.00' })
  readonly amount: string;
  @ApiProperty({ example: false })
  readonly settled: boolean;
  @ApiProperty({ type: Number, isArray: true, example: [1] })
  readonly invoiceIds: number[];
  constructor(collection: DriverCollectionLine) {
    this.paymentId = collection.paymentId;
    this.currency = collection.currency;
    this.amount = collection.amount;
    this.settled = collection.settled;
    this.invoiceIds = [...collection.invoiceIds];
  }
}

/**
 * Driver assignment counts and held amounts.
 */
export class DriverPositionResponse {
  @ApiProperty({ example: 1 })
  readonly driverId: number;
  @ApiProperty({ example: 'Ahmad Ali' })
  readonly driverName: string;
  @ApiProperty({ example: 2 })
  readonly assignedCount: number;
  @ApiProperty({ example: 1 })
  readonly deliveredPaidCount: number;
  @ApiProperty({ example: 1 })
  readonly deliveredUnpaidCount: number;
  @ApiProperty({ example: 0 })
  readonly notDeliveredCount: number;
  @ApiProperty({ type: CurrencyHoldingResponse, isArray: true })
  readonly holdings: CurrencyHoldingResponse[];
  @ApiProperty({ type: DriverCollectionLineResponse, isArray: true })
  readonly collections: DriverCollectionLineResponse[];
  constructor(position: DriverPosition) {
    this.driverId = position.driverId;
    this.driverName = position.driverName;
    this.assignedCount = position.assignedCount;
    this.deliveredPaidCount = position.deliveredPaidCount;
    this.deliveredUnpaidCount = position.deliveredUnpaidCount;
    this.notDeliveredCount = position.notDeliveredCount;
    this.holdings = position.holdings.map((holding) => new CurrencyHoldingResponse(holding));
    this.collections = position.collections.map((collection) => new DriverCollectionLineResponse(collection));
  }
}

/**
 * Recorded handover.
 */
export class DriverSettlementResponse extends BaseModelResponse {
  @ApiProperty({ example: 1 })
  readonly driverId: number;
  @ApiProperty({ enum: InvoiceCurrency, example: InvoiceCurrency.SYP })
  readonly currency: InvoiceCurrency;
  @ApiProperty({ example: '30000.00' })
  readonly amount: string;
  @ApiProperty({ example: 'Ahmad Cashier' })
  readonly receivedByName: string;
  @ApiProperty({ example: '2026-11-05T00:00:00.000Z' })
  readonly occurredAt: Date;
  @ApiProperty({ type: Number, isArray: true, example: [1] })
  readonly paymentIds: number[];
  constructor(settlement: DriverSettlementEntity) {
    super(settlement);
    this.driverId = settlement.driverId;
    this.currency = settlement.currency;
    this.amount = settlement.amount;
    this.receivedByName = settlement.receivedByName;
    this.occurredAt = settlement.occurredAt;
    this.paymentIds = settlement.paymentIds;
  }
}
