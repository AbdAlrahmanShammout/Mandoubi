import { Controller, Get, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '@/common/decorators/route/roles.decorator';
import { RolesGuard } from '@/common/guards/roles.guard';
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
   * Lists every submitted order and the status of each invoice.
   */
  @Get()
  @ApiOperation({ summary: 'List orders for review' })
  async list(): Promise<OrderResponse[]> {
    const orders = await this.orderService.listOrders();
    return orders.map((order) => new OrderResponse(order));
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
