import { Controller, Get, Param, ParseIntPipe, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '@/common/decorators/route/roles.decorator';
import { RolesGuard } from '@/common/guards/roles.guard';
import { PageResponse } from '@/common/paging/page.response';
import { ListOrdersQueryDto } from '@/modules/order/dto/request/list-orders-query.dto';
import { OrderResponse } from '@/modules/order/dto/response/model/order.response';
import { OrderService } from '@/modules/order/order.service';
import { AccountRole } from '@/modules/user/enum/account-role.enum';
import { JwtAuthGuard } from '@/modules/user/guards/jwt-auth.guard';

/**
 * Orders received from pharmacies, shown for review.
 */
@ApiTags('Admin orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(AccountRole.ADMIN)
@Controller('admin/orders')
export class OrderAdminController {
  constructor(private readonly orderService: OrderService) {}
  /**
   * Searches submitted orders and returns one page.
   */
  @Get()
  @ApiOperation({ summary: 'Search orders for review' })
  async list(@Query() query: ListOrdersQueryDto): Promise<PageResponse<OrderResponse>> {
    const page = await this.orderService.searchOrders({
      search: query.search,
      status: query.status,
      createdFrom: query.createdFrom ? new Date(query.createdFrom) : undefined,
      createdTo: query.createdTo ? new Date(query.createdTo) : undefined,
      limit: query.limit,
      offset: query.offset,
    });
    return new PageResponse(page.items.map((order) => new OrderResponse(order)), page.total, page.limit, page.offset);
  }
  /**
   * Opens one order and its category invoices.
   */
  @Get(':id')
  @ApiOperation({ summary: 'Read an order for review' })
  async getOrder(@Param('id', ParseIntPipe) id: number): Promise<OrderResponse> {
    const order = await this.orderService.getOrderById(id);
    return new OrderResponse(order);
  }
}
