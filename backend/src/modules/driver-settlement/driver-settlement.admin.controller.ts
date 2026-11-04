import { Body, Controller, Get, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '@/common/decorators/route/roles.decorator';
import { RolesGuard } from '@/common/guards/roles.guard';
import { SettleDriverRequestDto } from '@/modules/driver-settlement/dto/request/settle-driver-request.dto';
import { DriverPositionResponse, DriverSettlementResponse } from '@/modules/driver-settlement/dto/response/model/driver-position.response';
import { DriverSettlementService } from '@/modules/driver-settlement/driver-settlement.service';
import { AccountRole } from '@/modules/user/enum/account-role.enum';
import { JwtAuthGuard } from '@/modules/user/guards/jwt-auth.guard';

/**
 * Driver collections and handovers for the admin dashboard.
 */
@ApiTags('Admin driver settlements')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(AccountRole.ADMIN)
@Controller('admin')
export class DriverSettlementAdminController {
  constructor(private readonly driverSettlementService: DriverSettlementService) {}
  /**
   * Shows invoices assigned to a driver and the amounts still held.
   */
  @Get('drivers/:driverId/settlement')
  @ApiOperation({ summary: 'Read a driver settlement position' })
  async getPosition(@Param('driverId', ParseIntPipe) driverId: number): Promise<DriverPositionResponse> {
    const position = await this.driverSettlementService.getPosition(driverId);
    return new DriverPositionResponse(position);
  }
  /**
   * Records the handover of whole collections.
   */
  @Post('driver-settlements')
  @ApiOperation({ summary: 'Record a driver handover' })
  async settle(@Body() body: SettleDriverRequestDto): Promise<DriverSettlementResponse> {
    const settlement = await this.driverSettlementService.settle(body);
    return new DriverSettlementResponse(settlement);
  }
}
