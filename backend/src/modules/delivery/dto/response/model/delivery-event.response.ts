import { ApiProperty } from '@nestjs/swagger';
import { BaseModelResponse } from '@/common/base/base-model.response';
import { RecordedDelivery } from '@/modules/delivery/delivery.service';
import { DeliveryResult } from '@/modules/delivery/enum/delivery-result.enum';
import { NonDeliveryReason } from '@/modules/delivery/enum/non-delivery-reason.enum';
import { InvoiceStatus } from '@/modules/invoice/enum/invoice-status.enum';

/**
 * The delivery result that was stored.
 */
export class DeliveryEventResponse extends BaseModelResponse {
  @ApiProperty({ example: 1 })
  readonly assignmentId: number;
  @ApiProperty({ example: 1 })
  readonly invoiceId: number;
  @ApiProperty({ example: 2 })
  readonly driverId: number;
  @ApiProperty({ enum: DeliveryResult, example: DeliveryResult.DELIVERED_PAID })
  readonly result: DeliveryResult;
  @ApiProperty({ enum: NonDeliveryReason, example: NonDeliveryReason.PHARMACY_CLOSED, nullable: true })
  readonly nonDeliveryReason: NonDeliveryReason | null;
  @ApiProperty({ example: 'Paid in cash', nullable: true })
  readonly note: string | null;
  @ApiProperty({ example: 'Lina Hassan', nullable: true })
  readonly recipientName: string | null;
  @ApiProperty({ example: '2026-11-05T00:00:00.000Z' })
  readonly occurredAt: Date;
  @ApiProperty({ enum: InvoiceStatus, example: InvoiceStatus.DELIVERED_PAID })
  readonly invoiceStatus: InvoiceStatus;
  constructor(recorded: RecordedDelivery) {
    super(recorded.event);
    this.assignmentId = recorded.event.assignmentId;
    this.invoiceId = recorded.event.invoiceId;
    this.driverId = recorded.event.driverId;
    this.result = recorded.event.result;
    this.nonDeliveryReason = recorded.event.nonDeliveryReason;
    this.note = recorded.event.note;
    this.recipientName = recorded.event.recipientName;
    this.occurredAt = recorded.event.occurredAt;
    this.invoiceStatus = recorded.invoiceStatus;
  }
}
