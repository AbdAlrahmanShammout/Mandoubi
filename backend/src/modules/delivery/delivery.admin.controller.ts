import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { LoggedInUser } from '@/common/decorators/requests/logged-in-user.decorator';
import { Roles } from '@/common/decorators/route/roles.decorator';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Principal } from '@/common/auth/principal.interface';
import { AssignDeliveryRequestDto } from '@/modules/delivery/dto/request/assign-delivery-request.dto';
import { DeliveryTaskResponse } from '@/modules/delivery/dto/response/model/delivery-task.response';
import { DeliveryService } from '@/modules/delivery/delivery.service';
import { AccountRole } from '@/modules/user/enum/account-role.enum';
import { JwtAuthGuard } from '@/modules/user/guards/jwt-auth.guard';

/**
 * Assigns approved invoices to drivers.
 */
@ApiTags('Admin deliveries')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(AccountRole.ADMIN)
@Controller('admin/deliveries')
export class DeliveryAdminController {
  constructor(private readonly deliveryService: DeliveryService) {}
  /**
   * Gives one approved invoice to a driver. The driver cannot refuse or reassign it.
   */
  @Post()
  @ApiOperation({ summary: 'Assign an invoice to a driver' })
  async assign(@LoggedInUser() currentUser: Principal, @Body() body: AssignDeliveryRequestDto): Promise<DeliveryTaskResponse> {
    const assignment = await this.deliveryService.assignInvoice({
      invoiceId: body.invoiceId,
      driverId: body.driverId,
      assignedByUserId: currentUser.id,
    });
    return new DeliveryTaskResponse(assignment);
  }
}
