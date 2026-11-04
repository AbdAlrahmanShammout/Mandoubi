import { Controller, Get, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '@/common/decorators/route/roles.decorator';
import { RolesGuard } from '@/common/guards/roles.guard';
import { InvoiceResponse } from '@/modules/invoice/dto/response/model/invoice.response';
import { InvoiceService } from '@/modules/invoice/invoice.service';
import { AccountRole } from '@/modules/user/enum/account-role.enum';
import { JwtAuthGuard } from '@/modules/user/guards/jwt-auth.guard';

/**
 * Invoice review for the admin dashboard. Approval is a separate action.
 */
@ApiTags('Admin invoices')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(AccountRole.ADMIN)
@Controller('admin/invoices')
export class InvoiceAdminController {
  constructor(private readonly invoiceService: InvoiceService) {}
  /**
   * Opens one invoice and the prices captured when it was submitted.
   */
  @Get(':id')
  @ApiOperation({ summary: 'Read an invoice for review' })
  async getInvoice(@Param('id', ParseIntPipe) id: number): Promise<InvoiceResponse> {
    const invoice = await this.invoiceService.getInvoiceById(id);
    return new InvoiceResponse(invoice);
  }
}
