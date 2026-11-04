import { Controller, Get, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '@/common/decorators/route/roles.decorator';
import { RolesGuard } from '@/common/guards/roles.guard';
import { PharmacyStatementResponse } from '@/modules/pharmacy-ledger/dto/response/model/pharmacy-statement.response';
import { PharmacyLedgerService } from '@/modules/pharmacy-ledger/pharmacy-ledger.service';
import { AccountRole } from '@/modules/user/enum/account-role.enum';
import { JwtAuthGuard } from '@/modules/user/guards/jwt-auth.guard';

/**
 * Pharmacy account statements for the admin dashboard.
 */
@ApiTags('Admin pharmacy statements')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(AccountRole.ADMIN)
@Controller('admin/pharmacies')
export class PharmacyLedgerAdminController {
  constructor(private readonly pharmacyLedgerService: PharmacyLedgerService) {}
  /**
   * Shows charges, payments, and the amount still due.
   */
  @Get(':pharmacyId/statement')
  @ApiOperation({ summary: 'Read a pharmacy account statement' })
  async getStatement(@Param('pharmacyId', ParseIntPipe) pharmacyId: number): Promise<PharmacyStatementResponse> {
    const statement = await this.pharmacyLedgerService.getStatement(pharmacyId);
    return new PharmacyStatementResponse(statement);
  }
}
