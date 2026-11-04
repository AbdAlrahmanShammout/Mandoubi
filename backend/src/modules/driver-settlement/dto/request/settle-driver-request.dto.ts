import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { ArrayMinSize, IsEnum, IsInt, IsString, Matches, MaxLength, Min, MinLength } from 'class-validator';
import { RECEIVED_BY_NAME_MAX_LENGTH } from '@/modules/payment/constants/receipt.constant';
import { MONEY_PATTERN } from '@/modules/product/constants/money.constant';
import { InvoiceCurrency } from '@/modules/product/enum/invoice-currency.enum';

/**
 * Whole driver collections handed to the administration.
 */
export class SettleDriverRequestDto {
  @ApiProperty({ description: 'Driver handing over the money', example: 1 })
  @IsInt()
  @Min(1)
  driverId!: number;
  @ApiProperty({ description: 'Currency handed over', enum: InvoiceCurrency, example: InvoiceCurrency.SYP })
  @IsEnum(InvoiceCurrency)
  currency!: InvoiceCurrency;
  @ApiProperty({ description: 'Amount handed over. It must equal the selected collections', example: '30000.00' })
  @IsString()
  @Matches(MONEY_PATTERN)
  amount!: string;
  @ApiProperty({ description: 'Person who received the handover', example: 'Ahmad Cashier' })
  @IsString()
  @MinLength(2)
  @MaxLength(RECEIVED_BY_NAME_MAX_LENGTH)
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  receivedByName!: string;
  @ApiProperty({ description: 'Driver collections covered in full', type: Number, isArray: true, example: [1] })
  @ArrayMinSize(1)
  @IsInt({ each: true })
  @Min(1, { each: true })
  paymentIds!: number[];
}
