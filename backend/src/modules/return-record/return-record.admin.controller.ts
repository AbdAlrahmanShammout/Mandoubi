import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { LoggedInUser } from '@/common/decorators/requests/logged-in-user.decorator';
import { Roles } from '@/common/decorators/route/roles.decorator';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Principal } from '@/common/auth/principal.interface';
import { ReturnInvoiceRequestDto } from '@/modules/return-record/dto/request/return-invoice-request.dto';
import { ReturnedInvoiceResponse } from '@/modules/return-record/dto/response/model/returned-invoice.response';
import { ReturnRecordService } from '@/modules/return-record/return-record.service';
import { AccountRole } from '@/modules/user/enum/account-role.enum';
import { JwtAuthGuard } from '@/modules/user/guards/jwt-auth.guard';

/**
 * Warehouse returns for the admin dashboard.
 */
@ApiTags('Admin returns')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(AccountRole.ADMIN)
@Controller('admin/returns')
export class ReturnRecordAdminController {
  constructor(private readonly returnRecordService: ReturnRecordService) {}
  /**
   * Returns an invoice to the warehouse stored on it. Stock changes once.
   */
  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Return an invoice to its warehouse' })
  async returnToWarehouse(@LoggedInUser() currentUser: Principal, @Body() body: ReturnInvoiceRequestDto): Promise<ReturnedInvoiceResponse> {
    const invoice = await this.returnRecordService.returnToWarehouse(body.invoiceId, currentUser.id);
    return new ReturnedInvoiceResponse(invoice);
  }
}
