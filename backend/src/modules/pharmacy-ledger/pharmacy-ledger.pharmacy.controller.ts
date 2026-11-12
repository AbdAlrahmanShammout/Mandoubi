import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { LoggedInUser } from '@/common/decorators/requests/logged-in-user.decorator';
import { Roles } from '@/common/decorators/route/roles.decorator';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Principal } from '@/common/auth/principal.interface';
import { UnauthenticatedException } from '@/common/exceptions/unauthenticated.exception';
import { PharmacyStatementResponse } from '@/modules/pharmacy-ledger/dto/response/model/pharmacy-statement.response';
import { PharmacyLedgerService } from '@/modules/pharmacy-ledger/pharmacy-ledger.service';
import { PharmacySessionGuard } from '@/modules/pharmacy/guards/pharmacy-session.guard';
import { AccountRole } from '@/modules/user/enum/account-role.enum';
import { UserEntity } from '@/modules/user/entity/user.entity';
import { JwtAuthGuard } from '@/modules/user/guards/jwt-auth.guard';
import { UserService } from '@/modules/user/user.service';

/**
 * Account statement for the signed-in pharmacy.
 */
@ApiTags('Pharmacy statement')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PharmacySessionGuard, RolesGuard)
@Roles(AccountRole.PHARMACY)
@Controller('pharmacy/statement')
export class PharmacyLedgerPharmacyController {
  constructor(
    private readonly pharmacyLedgerService: PharmacyLedgerService,
    private readonly userService: UserService,
  ) {}
  /**
   * Shows this pharmacy's charges, payments, and outstanding balance.
   */
  @Get()
  @ApiOperation({ summary: 'Read the signed-in pharmacy statement' })
  async getStatement(@LoggedInUser() currentUser: Principal): Promise<PharmacyStatementResponse> {
    const pharmacyId = await this.readPharmacyId(currentUser.id);
    const statement = await this.pharmacyLedgerService.getStatement(pharmacyId);
    return new PharmacyStatementResponse(statement);
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
