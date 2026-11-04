import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '@/common/decorators/route/roles.decorator';
import { RolesGuard } from '@/common/guards/roles.guard';
import { ReportPeriodQueryDto, SalesReportQueryDto } from '@/modules/report/dto/request/report-period-query.dto';
import { DebtReportResponse, DriverReportRowResponse, ProductReportResponse, SalesReportResponse } from '@/modules/report/dto/response/model/report.response';
import { ReportService } from '@/modules/report/report.service';
import { AccountRole } from '@/modules/user/enum/account-role.enum';
import { JwtAuthGuard } from '@/modules/user/guards/jwt-auth.guard';

/**
 * Sales, product, debt, and driver reports for the admin dashboard.
 */
@ApiTags('Admin reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(AccountRole.ADMIN)
@Controller('admin/reports')
export class ReportAdminController {
  constructor(private readonly reportService: ReportService) {}
  /**
   * Sums delivered sales in the period, grouped by invoice currency.
   */
  @Get('sales')
  @ApiOperation({ summary: 'Read the sales report' })
  async sales(@Query() query: SalesReportQueryDto): Promise<SalesReportResponse> {
    const report = await this.reportService.sales({ ...query, from: new Date(query.from), to: new Date(query.to) });
    return new SalesReportResponse(report);
  }
  /**
   * Lists best and slowest sellers and the current stock.
   */
  @Get('products')
  @ApiOperation({ summary: 'Read the product and stock report' })
  async products(@Query() query: ReportPeriodQueryDto): Promise<ProductReportResponse> {
    const report = await this.reportService.products(new Date(query.from), new Date(query.to));
    return new ProductReportResponse(report);
  }
  /**
   * Lists pharmacy balances, unpaid invoices, and payments in the period.
   */
  @Get('debts')
  @ApiOperation({ summary: 'Read the debt report' })
  async debts(@Query() query: ReportPeriodQueryDto): Promise<DebtReportResponse> {
    const report = await this.reportService.debts(new Date(query.from), new Date(query.to));
    return new DebtReportResponse(report);
  }
  /**
   * Lists delivery counts and the money each driver still holds.
   */
  @Get('drivers')
  @ApiOperation({ summary: 'Read the driver report' })
  async drivers(): Promise<DriverReportRowResponse[]> {
    const rows = await this.reportService.drivers();
    return rows.map((row) => new DriverReportRowResponse(row));
  }
}
