import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '@/common/decorators/route/roles.decorator';
import { RolesGuard } from '@/common/guards/roles.guard';
import { AuditService } from '@/modules/audit/audit.service';
import { ListAuditQueryDto } from '@/modules/audit/dto/request/list-audit-query.dto';
import { AuditEntryResponse } from '@/modules/audit/dto/response/model/audit-entry.response';
import { AccountRole } from '@/modules/user/enum/account-role.enum';
import { JwtAuthGuard } from '@/modules/user/guards/jwt-auth.guard';

/**
 * Audit trail for the admin dashboard.
 */
@ApiTags('Admin audit')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(AccountRole.ADMIN)
@Controller('admin/audit')
export class AuditAdminController {
  constructor(private readonly auditService: AuditService) {}
  /**
   * Lists the changes recorded for one resource.
   */
  @Get()
  @ApiOperation({ summary: 'Read audit entries for one resource' })
  async list(@Query() query: ListAuditQueryDto): Promise<AuditEntryResponse[]> {
    const entries = await this.auditService.listByResource(query.resourceType, query.resourceId);
    return entries.map((entry) => new AuditEntryResponse(entry));
  }
}
