import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsString, MaxLength, MinLength, ValidateIf } from 'class-validator';
import { DELIVERY_NOTE_MAX_LENGTH, RECIPIENT_NAME_MAX_LENGTH, RECIPIENT_NAME_MIN_LENGTH } from '@/modules/delivery/constants/delivery-text.constant';
import { DeliveryResult } from '@/modules/delivery/enum/delivery-result.enum';
import { NonDeliveryReason } from '@/modules/delivery/enum/non-delivery-reason.enum';

/**
 * One delivery result for an invoice already assigned to the signed-in driver.
 */
export class RecordDeliveryResultRequestDto {
  @ApiProperty({ description: 'Delivery result', enum: DeliveryResult, example: DeliveryResult.DELIVERED_PAID })
  @IsEnum(DeliveryResult)
  result!: DeliveryResult;
  @ApiPropertyOptional({ description: 'Required when the invoice was not delivered', enum: NonDeliveryReason, example: NonDeliveryReason.PHARMACY_CLOSED })
  @ValidateIf((body: RecordDeliveryResultRequestDto) => body.result === DeliveryResult.NOT_DELIVERED)
  @IsEnum(NonDeliveryReason)
  nonDeliveryReason?: NonDeliveryReason;
  @ApiPropertyOptional({ description: 'Person who received the goods. Required when the invoice was delivered', example: 'Lina Hassan' })
  @ValidateIf((body: RecordDeliveryResultRequestDto) => body.result !== DeliveryResult.NOT_DELIVERED)
  @IsString()
  @MinLength(RECIPIENT_NAME_MIN_LENGTH)
  @MaxLength(RECIPIENT_NAME_MAX_LENGTH)
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  recipientName?: string;
  @ApiPropertyOptional({ description: 'Optional note', example: 'Paid in cash' })
  @IsOptional()
  @IsString()
  @MaxLength(DELIVERY_NOTE_MAX_LENGTH)
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  note?: string;
}
