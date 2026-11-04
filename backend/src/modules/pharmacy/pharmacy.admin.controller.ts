import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '@/common/decorators/route/roles.decorator';
import { RolesGuard } from '@/common/guards/roles.guard';
import { CreatePharmacyAccountRequestDto } from '@/modules/pharmacy/dto/request/create-pharmacy-account-request.dto';
import { UpdatePharmacyStatusRequestDto } from '@/modules/pharmacy/dto/request/update-pharmacy-status-request.dto';
import { PharmacyResponse } from '@/modules/pharmacy/dto/response/model/pharmacy.response';
import { PharmacyService } from '@/modules/pharmacy/pharmacy.service';
import { AccountRole } from '@/modules/user/enum/account-role.enum';
import { JwtAuthGuard } from '@/modules/user/guards/jwt-auth.guard';

/**
 * Pharmacy accounts managed from the admin dashboard.
 */
@ApiTags('Admin pharmacies')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(AccountRole.ADMIN)
@Controller('admin/pharmacies')
export class PharmacyAdminController {
  constructor(private readonly pharmacyService: PharmacyService) {}
  /**
   * Creates a pharmacy profile and its sign-in password.
   */
  @Post()
  @ApiOperation({ summary: 'Create a pharmacy account' })
  async createAccount(@Body() body: CreatePharmacyAccountRequestDto): Promise<PharmacyResponse> {
    const pharmacy = await this.pharmacyService.createAccount(body);
    return new PharmacyResponse(pharmacy);
  }
  /**
   * Reads one pharmacy profile.
   */
  @Get(':id')
  @ApiOperation({ summary: 'Read a pharmacy account' })
  async getPharmacy(@Param('id', ParseIntPipe) id: number): Promise<PharmacyResponse> {
    const pharmacy = await this.pharmacyService.getPharmacyById(id);
    return new PharmacyResponse(pharmacy);
  }
  /**
   * Enables or disables a pharmacy and its credential.
   */
  @Patch(':id/status')
  @ApiOperation({ summary: 'Change a pharmacy account status' })
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdatePharmacyStatusRequestDto,
  ): Promise<PharmacyResponse> {
    const pharmacy = await this.pharmacyService.updateAccountStatus({ pharmacyId: id, status: body.status });
    return new PharmacyResponse(pharmacy);
  }
}
