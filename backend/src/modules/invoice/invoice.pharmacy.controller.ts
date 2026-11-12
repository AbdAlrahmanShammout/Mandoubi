import { Controller, Get, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { LoggedInUser } from '@/common/decorators/requests/logged-in-user.decorator';
import { Roles } from '@/common/decorators/route/roles.decorator';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Principal } from '@/common/auth/principal.interface';
import { UnauthenticatedException } from '@/common/exceptions/unauthenticated.exception';
import { InvoiceResponse } from '@/modules/invoice/dto/response/model/invoice.response';
import { InvoiceService } from '@/modules/invoice/invoice.service';
import { PharmacySessionGuard } from '@/modules/pharmacy/guards/pharmacy-session.guard';
import { AccountRole } from '@/modules/user/enum/account-role.enum';
import { UserEntity } from '@/modules/user/entity/user.entity';
import { JwtAuthGuard } from '@/modules/user/guards/jwt-auth.guard';
import { UserService } from '@/modules/user/user.service';

/**
 * Invoice read for the signed-in pharmacy.
 */
@ApiTags('Pharmacy invoices')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PharmacySessionGuard, RolesGuard)
@Roles(AccountRole.PHARMACY)
@Controller('pharmacy/invoices')
export class InvoicePharmacyController {
  constructor(
    private readonly invoiceService: InvoiceService,
    private readonly userService: UserService,
  ) {}
  /**
   * Opens one invoice when it belongs to the signed-in pharmacy.
   */
  @Get(':id')
  @ApiOperation({ summary: 'Read a pharmacy invoice' })
  async getInvoice(@LoggedInUser() currentUser: Principal, @Param('id', ParseIntPipe) id: number): Promise<InvoiceResponse> {
    const pharmacyId = await this.readPharmacyId(currentUser.id);
    const invoice = await this.invoiceService.getInvoiceForPharmacy(id, pharmacyId);
    return new InvoiceResponse(invoice);
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
