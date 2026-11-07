import { ApiProperty } from '@nestjs/swagger';

/**
 * Paged list returned by an admin search.
 */
export class PageResponse<T> {
  @ApiProperty({ isArray: true })
  readonly items: T[];
  @ApiProperty({ example: 0 })
  readonly total: number;
  @ApiProperty({ example: 20 })
  readonly limit: number;
  @ApiProperty({ example: 0 })
  readonly offset: number;
  constructor(items: readonly T[], total: number, limit: number, offset: number) {
    this.items = [...items];
    this.total = total;
    this.limit = limit;
    this.offset = offset;
  }
}
