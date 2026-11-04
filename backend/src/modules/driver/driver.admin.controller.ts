import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '@/common/decorators/route/roles.decorator';
import { RolesGuard } from '@/common/guards/roles.guard';
import { CreateDriverAccountRequestDto } from '@/modules/driver/dto/request/create-driver-account-request.dto';
import { UpdateDriverStatusRequestDto } from '@/modules/driver/dto/request/update-driver-status-request.dto';
import { DriverResponse } from '@/modules/driver/dto/response/model/driver.response';
import { DriverService } from '@/modules/driver/driver.service';
import { AccountRole } from '@/modules/user/enum/account-role.enum';
import { JwtAuthGuard } from '@/modules/user/guards/jwt-auth.guard';

/**
 * Driver accounts managed from the admin dashboard.
 */
@ApiTags('Admin drivers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(AccountRole.ADMIN)
@Controller('admin/drivers')
export class DriverAdminController {
  constructor(private readonly driverService: DriverService) {}
  /**
   * Creates a driver profile and its sign-in password.
   */
  @Post()
  @ApiOperation({ summary: 'Create a driver account' })
  async createAccount(@Body() body: CreateDriverAccountRequestDto): Promise<DriverResponse> {
    const driver = await this.driverService.createAccount(body);
    return new DriverResponse(driver);
  }
  /**
   * Reads one driver profile.
   */
  @Get(':id')
  @ApiOperation({ summary: 'Read a driver account' })
  async getDriver(@Param('id', ParseIntPipe) id: number): Promise<DriverResponse> {
    const driver = await this.driverService.getDriverById(id);
    return new DriverResponse(driver);
  }
  /**
   * Enables or disables a driver and its credential.
   */
  @Patch(':id/status')
  @ApiOperation({ summary: 'Change a driver account status' })
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateDriverStatusRequestDto,
  ): Promise<DriverResponse> {
    const driver = await this.driverService.updateAccountStatus({ driverId: id, status: body.status });
    return new DriverResponse(driver);
  }
}
