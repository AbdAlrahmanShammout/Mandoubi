import { ApiProperty } from '@nestjs/swagger';
import { BaseEntity } from '@/common/base/base.entity';

/**
 * Identifier and timestamps shared by entity projections.
 */
export class BaseModelResponse {
  @ApiProperty({ example: 1 })
  readonly id: number;
  @ApiProperty({ example: '2026-11-05T00:00:00.000Z' })
  readonly createdAt: Date;
  @ApiProperty({ example: '2026-11-05T00:00:00.000Z' })
  readonly updatedAt: Date;
  constructor(entity: BaseEntity) {
    this.id = entity.id;
    this.createdAt = entity.createdAt;
    this.updatedAt = entity.updatedAt;
  }
}
