import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { LoggedInUser } from '@/common/decorators/requests/logged-in-user.decorator';
import { Roles } from '@/common/decorators/route/roles.decorator';
import { Principal } from '@/common/auth/principal.interface';
import { RolesGuard } from '@/common/guards/roles.guard';
import { RecordReceiptRequestDto } from '@/modules/payment/dto/request/record-receipt-request.dto';
import { PaymentResponse } from '@/modules/payment/dto/response/model/payment.response';
import { PaymentMethod } from '@/modules/payment/enum/payment-method.enum';
import { PaymentService } from '@/modules/payment/payment.service';
import { AccountRole } from '@/modules/user/enum/account-role.enum';
import { JwtAuthGuard } from '@/modules/user/guards/jwt-auth.guard';

/**
 * Receipt vouchers recorded from the admin dashboard.
 */
@ApiTags('Admin receipts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(AccountRole.ADMIN)
@Controller('admin/receipts')
export class PaymentAdminController {
  constructor(private readonly paymentService: PaymentService) {}
  /**
   * Records a receipt that covers whole invoices only.
   */
  @Post()
  @ApiOperation({ summary: 'Record a receipt voucher' })
  async record(@LoggedInUser() currentUser: Principal, @Body() body: RecordReceiptRequestDto): Promise<PaymentResponse> {
    const payment = await this.paymentService.recordReceipt({ ...body, actorUserId: currentUser.id, paymentMethod: body.paymentMethod ?? PaymentMethod.CASH });
    return new PaymentResponse(payment);
  }
}
