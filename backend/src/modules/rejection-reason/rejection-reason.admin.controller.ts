import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '@/common/decorators/route/roles.decorator';
import { RolesGuard } from '@/common/guards/roles.guard';
import { CreateRejectionReasonRequestDto } from '@/modules/rejection-reason/dto/request/create-rejection-reason-request.dto';
import { UpdateRejectionReasonRequestDto } from '@/modules/rejection-reason/dto/request/update-rejection-reason-request.dto';
import { UpdateRejectionReasonStatusRequestDto } from '@/modules/rejection-reason/dto/request/update-rejection-reason-status-request.dto';
import { RejectionReasonResponse } from '@/modules/rejection-reason/dto/response/model/rejection-reason.response';
import { RejectionReasonService } from '@/modules/rejection-reason/rejection-reason.service';
import { AccountRole } from '@/modules/user/enum/account-role.enum';
import { JwtAuthGuard } from '@/modules/user/guards/jwt-auth.guard';

/**
 * Rejection reasons managed from the admin dashboard.
 */
@ApiTags('Admin rejection reasons')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(AccountRole.ADMIN)
@Controller('admin/rejection-reasons')
export class RejectionReasonAdminController {
  constructor(private readonly rejectionReasonService: RejectionReasonService) {}
  /**
   * Adds a reason that can be chosen when an invoice is rejected.
   */
  @Post()
  @ApiOperation({ summary: 'Create a rejection reason' })
  async create(@Body() body: CreateRejectionReasonRequestDto): Promise<RejectionReasonResponse> {
    const reason = await this.rejectionReasonService.createReason(body.label);
    return new RejectionReasonResponse(reason);
  }
  /**
   * Lists the managed rejection reasons.
   */
  @Get()
  @ApiOperation({ summary: 'List rejection reasons' })
  async list(): Promise<RejectionReasonResponse[]> {
    const reasons = await this.rejectionReasonService.listReasons();
    return reasons.map((reason) => new RejectionReasonResponse(reason));
  }
  /**
   * Changes the label of a rejection reason.
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Rename a rejection reason' })
  async update(@Param('id', ParseIntPipe) id: number, @Body() body: UpdateRejectionReasonRequestDto): Promise<RejectionReasonResponse> {
    const reason = await this.rejectionReasonService.updateReason({ id, label: body.label });
    return new RejectionReasonResponse(reason);
  }
  /**
   * Activates or deactivates a rejection reason.
   */
  @Patch(':id/status')
  @ApiOperation({ summary: 'Change a rejection reason status' })
  async updateStatus(@Param('id', ParseIntPipe) id: number, @Body() body: UpdateRejectionReasonStatusRequestDto): Promise<RejectionReasonResponse> {
    const reason = await this.rejectionReasonService.updateStatus({ id, status: body.status });
    return new RejectionReasonResponse(reason);
  }
}
