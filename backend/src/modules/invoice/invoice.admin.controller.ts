import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '@/common/decorators/route/roles.decorator';
import { RolesGuard } from '@/common/guards/roles.guard';
import { RejectInvoiceRequestDto } from '@/modules/invoice/dto/request/reject-invoice-request.dto';
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
  /**
   * Approves one invoice and reserves its quantity from the warehouses stored on it.
   */
  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve an invoice' })
  async approve(@Param('id', ParseIntPipe) id: number): Promise<InvoiceResponse> {
    const invoice = await this.invoiceService.approveInvoice(id);
    return new InvoiceResponse(invoice);
  }
  /**
   * Rejects one pending invoice without changing stock.
   */
  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject an invoice' })
  async reject(@Param('id', ParseIntPipe) id: number, @Body() body: RejectInvoiceRequestDto): Promise<InvoiceResponse> {
    const invoice = await this.invoiceService.rejectInvoice(id, body);
    return new InvoiceResponse(invoice);
  }
}
