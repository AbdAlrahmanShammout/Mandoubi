import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { LoggedInUser } from '@/common/decorators/requests/logged-in-user.decorator';
import { Roles } from '@/common/decorators/route/roles.decorator';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Principal } from '@/common/auth/principal.interface';
import { UnauthenticatedException } from '@/common/exceptions/unauthenticated.exception';
import { RecordDeliveryResultRequestDto } from '@/modules/delivery/dto/request/record-delivery-result-request.dto';
import { DeliveryEventResponse } from '@/modules/delivery/dto/response/model/delivery-event.response';
import { DeliveryTaskResponse } from '@/modules/delivery/dto/response/model/delivery-task.response';
import { DeliveryService } from '@/modules/delivery/delivery.service';
import { AccountRole } from '@/modules/user/enum/account-role.enum';
import { UserEntity } from '@/modules/user/entity/user.entity';
import { JwtAuthGuard } from '@/modules/user/guards/jwt-auth.guard';
import { UserService } from '@/modules/user/user.service';

/**
 * Assigned invoices and the single result the driver records for each one.
 */
@ApiTags('Driver deliveries')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(AccountRole.DRIVER)
@Controller('driver/deliveries')
export class DeliveryDriverController {
  constructor(
    private readonly deliveryService: DeliveryService,
    private readonly userService: UserService,
  ) {}
  /**
   * Lists the invoices still assigned to the signed-in driver.
   */
  @Get()
  @ApiOperation({ summary: 'List assigned deliveries' })
  async list(@LoggedInUser() currentUser: Principal): Promise<DeliveryTaskResponse[]> {
    const driverId = await this.readDriverId(currentUser.id);
    const assignments = await this.deliveryService.listOpenForDriver(driverId);
    return assignments.map((assignment) => new DeliveryTaskResponse(assignment));
  }
  /**
   * Records the result of one assigned invoice.
   */
  @Post(':invoiceId/result')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Record a delivery result' })
  async record(@LoggedInUser() currentUser: Principal, @Param('invoiceId', ParseIntPipe) invoiceId: number, @Body() body: RecordDeliveryResultRequestDto): Promise<DeliveryEventResponse> {
    const driverId = await this.readDriverId(currentUser.id);
    const recorded = await this.deliveryService.recordResult({ invoiceId, driverId, actorUserId: currentUser.id, ...body });
    return new DeliveryEventResponse(recorded);
  }
  private async readDriverId(userId: number): Promise<number> {
    const user = await this.userService.getUserById(userId);
    return requireDriverId(user);
  }
}

function requireDriverId(user: UserEntity): number {
  if (user.driverId === null) {
    throw new UnauthenticatedException();
  }
  return user.driverId;
}
