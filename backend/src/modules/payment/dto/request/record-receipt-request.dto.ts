import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsEnum, IsInt, IsOptional, IsString, Matches, MaxLength, Min, MinLength } from 'class-validator';
import { MAX_RECEIPT_INVOICES, RECEIVED_BY_NAME_MAX_LENGTH } from '@/modules/payment/constants/receipt.constant';
import { PaymentMethod } from '@/modules/payment/enum/payment-method.enum';
import { MONEY_PATTERN } from '@/modules/product/constants/money.constant';
import { InvoiceCurrency } from '@/modules/product/enum/invoice-currency.enum';

/**
 * Receipt that covers one or more whole invoices.
 */
export class RecordReceiptRequestDto {
  @ApiProperty({ description: 'Pharmacy that paid', example: 1 })
  @IsInt()
  @Min(1)
  pharmacyId!: number;
  @ApiProperty({ description: 'Currency of the amount received', enum: InvoiceCurrency, example: InvoiceCurrency.SYP })
  @IsEnum(InvoiceCurrency)
  currency!: InvoiceCurrency;
  @ApiProperty({ description: 'Amount received. It must equal the selected invoices', example: '60000.00' })
  @IsString()
  @Matches(MONEY_PATTERN)
  amount!: string;
  @ApiProperty({ description: 'Person who received the amount', example: 'Ahmad Cashier' })
  @IsString()
  @MinLength(2)
  @MaxLength(RECEIVED_BY_NAME_MAX_LENGTH)
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  receivedByName!: string;
  @ApiPropertyOptional({ description: 'How the amount was received', enum: PaymentMethod, example: PaymentMethod.CASH })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;
  @ApiProperty({ description: 'Whole invoices covered by this receipt', type: Number, isArray: true, example: [1] })
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_RECEIPT_INVOICES)
  @IsInt({ each: true })
  @Min(1, { each: true })
  invoiceIds!: number[];
}
