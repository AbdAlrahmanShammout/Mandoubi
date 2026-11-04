import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches } from 'class-validator';

const RATE_PATTERN = /^(?:0|[1-9]\d{0,12})(?:\.\d{1,4})?$/;

/**
 * New value of one US dollar in Syrian pounds.
 */
export class ReplaceExchangeRateRequestDto {
  @ApiProperty({ description: 'Syrian pounds for one US dollar', example: '15000' })
  @IsString()
  @Matches(RATE_PATTERN)
  usdToSyp!: string;
}
