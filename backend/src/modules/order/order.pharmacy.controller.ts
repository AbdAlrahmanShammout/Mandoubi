import { Body, Controller, Get, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { LoggedInUser } from '@/common/decorators/requests/logged-in-user.decorator';
import { Roles } from '@/common/decorators/route/roles.decorator';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Principal } from '@/common/auth/principal.interface';
import { UnauthenticatedException } from '@/common/exceptions/unauthenticated.exception';
import { PharmacySessionGuard } from '@/modules/pharmacy/guards/pharmacy-session.guard';
import { SubmitOrderRequestDto } from '@/modules/order/dto/request/submit-order-request.dto';
import { OrderResponse } from '@/modules/order/dto/response/model/order.response';
import { OrderService } from '@/modules/order/order.service';
import { AccountRole } from '@/modules/user/enum/account-role.enum';
import { JwtAuthGuard } from '@/modules/user/guards/jwt-auth.guard';
import { UserEntity } from '@/modules/user/entity/user.entity';
import { UserService } from '@/modules/user/user.service';

/**
 * Order submission and history for the signed-in pharmacy.
 */
@ApiTags('Pharmacy orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PharmacySessionGuard, RolesGuard)
@Roles(AccountRole.PHARMACY)
@Controller('pharmacy/orders')
export class OrderPharmacyController {
  constructor(
    private readonly orderService: OrderService,
    private readonly userService: UserService,
  ) {}
  /**
   * Submits one order. The server splits it into one invoice per category.
   */
  @Post()
  @ApiOperation({ summary: 'Submit an order' })
  async submit(@LoggedInUser() currentUser: Principal, @Body() body: SubmitOrderRequestDto): Promise<OrderResponse> {
    const pharmacyId = await this.readPharmacyId(currentUser.id);
    const order = await this.orderService.submitOrder({ pharmacyId, items: body.items });
    return new OrderResponse(order);
  }
  /**
   * Lists the orders submitted by the signed-in pharmacy.
   */
  @Get()
  @ApiOperation({ summary: 'List pharmacy orders' })
  async list(@LoggedInUser() currentUser: Principal): Promise<OrderResponse[]> {
    const pharmacyId = await this.readPharmacyId(currentUser.id);
    const orders = await this.orderService.listOrdersForPharmacy(pharmacyId);
    return orders.map((order) => new OrderResponse(order));
  }
  /**
   * Opens one order and its invoices for the signed-in pharmacy.
   */
  @Get(':id')
  @ApiOperation({ summary: 'Read a pharmacy order' })
  async getOrder(@LoggedInUser() currentUser: Principal, @Param('id', ParseIntPipe) id: number): Promise<OrderResponse> {
    const pharmacyId = await this.readPharmacyId(currentUser.id);
    const order = await this.orderService.getOrderForPharmacy(id, pharmacyId);
    return new OrderResponse(order);
  }
  private async readPharmacyId(userId: number): Promise<number> {
    const user = await this.userService.getUserById(userId);
    return requirePharmacyId(user);
  }
}

function requirePharmacyId(user: UserEntity): number {
  if (user.pharmacyId === null) {
    throw new UnauthenticatedException();
  }
  return user.pharmacyId;
}
