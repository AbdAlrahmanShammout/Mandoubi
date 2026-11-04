import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

/**
 * Resource whose audit trail is being read.
 */
export class ListAuditQueryDto {
  @ApiProperty({ description: 'Kind of record, such as invoice, product, or payment', example: 'invoice' })
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  resourceType!: string;
  @ApiProperty({ description: 'Identifier of that record', example: '1' })
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  resourceId!: string;
}
