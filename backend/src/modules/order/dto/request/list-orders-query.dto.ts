import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional } from 'class-validator';
import { PageQueryDto } from '@/common/paging/page-query.dto';
import { OrderStatus } from '@/modules/order/enum/order-status.enum';

/**
 * Order search. Text, derived status, and the creation day are applied before paging.
 */
export class ListOrdersQueryDto extends PageQueryDto {
  @ApiPropertyOptional({ enum: OrderStatus })
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;
  @ApiPropertyOptional({ description: 'Inclusive start of the order day', example: '2026-11-07T21:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  createdFrom?: string;
  @ApiPropertyOptional({ description: 'Inclusive end of the order day', example: '2026-11-08T20:59:59.999Z' })
  @IsOptional()
  @IsDateString()
  createdTo?: string;
}
