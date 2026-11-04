import { ApiProperty } from '@nestjs/swagger';
import { BaseModelResponse } from '@/common/base/base-model.response';
import { InternalException } from '@/common/exceptions/internal.exception';
import { DeliveryAssignmentEntity } from '@/modules/delivery/entity/delivery-assignment.entity';
import { InvoiceResponse } from '@/modules/invoice/dto/response/model/invoice.response';

/**
 * One assigned invoice as the driver needs to see it.
 */
export class DeliveryTaskResponse extends BaseModelResponse {
  @ApiProperty({ example: 1 })
  readonly invoiceId: number;
  @ApiProperty({ example: 4 })
  readonly orderId: number;
  @ApiProperty({ example: 2 })
  readonly driverId: number;
  @ApiProperty({ example: 'Al Shifa Pharmacy' })
  readonly pharmacyName: string;
  @ApiProperty({ example: '0999123456' })
  readonly pharmacyMobile: string;
  @ApiProperty({ example: 'Baghdad Street, Damascus' })
  readonly pharmacyAddress: string;
  @ApiProperty({ type: InvoiceResponse })
  readonly invoice: InvoiceResponse;
  constructor(assignment: DeliveryAssignmentEntity) {
    super(assignment);
    const pharmacy = requirePharmacy(assignment);
    const invoice = requireInvoice(assignment);
    this.invoiceId = assignment.invoiceId;
    this.orderId = assignment.orderId;
    this.driverId = assignment.driverId;
    this.pharmacyName = pharmacy.name;
    this.pharmacyMobile = pharmacy.mobileNumber;
    this.pharmacyAddress = pharmacy.address;
    this.invoice = new InvoiceResponse(invoice);
  }
}

function requirePharmacy(assignment: DeliveryAssignmentEntity): NonNullable<DeliveryAssignmentEntity['pharmacy']> {
  if (!assignment.pharmacy) {
    throw new InternalException('The pharmacy to visit was not loaded');
  }
  return assignment.pharmacy;
}

function requireInvoice(assignment: DeliveryAssignmentEntity): NonNullable<DeliveryAssignmentEntity['invoice']> {
  if (!assignment.invoice) {
    throw new InternalException('The assigned invoice was not loaded');
  }
  return assignment.invoice;
}
