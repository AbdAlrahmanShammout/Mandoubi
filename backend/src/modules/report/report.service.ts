import { Injectable } from '@nestjs/common';
import { InvalidStateException } from '@/common/exceptions/invalid-state.exception';
import { ReportRepository } from '@/modules/report/repository/report.repository';
import { DebtReport, DriverReportRow, ProductReport, SalesReport, SalesReportQuery } from '@/modules/report/report.types';

/**
 * Reads sales, product, debt, and driver reports grouped by invoice currency.
 */
@Injectable()
export class ReportService {
  constructor(private readonly reportRepository: ReportRepository) {}
  /**
   * Sums delivered sales in a period. A pharmacy or category filter is optional.
   */
  async sales(query: SalesReportQuery): Promise<SalesReport> {
    assertPeriod(query.from, query.to);
    return this.reportRepository.sales(query);
  }
  /**
   * Lists best and slowest sellers in the period, plus the current stock.
   */
  async products(from: Date, to: Date): Promise<ProductReport> {
    assertPeriod(from, to);
    return this.reportRepository.products({ from, to });
  }
  /**
   * Lists balances, unpaid invoices, and the payments received in the period.
   */
  async debts(from: Date, to: Date): Promise<DebtReport> {
    assertPeriod(from, to);
    return this.reportRepository.debts({ from, to }, new Date());
  }
  /**
   * Lists delivery counts and the money each driver still holds.
   */
  async drivers(): Promise<DriverReportRow[]> {
    return this.reportRepository.drivers();
  }
}

function assertPeriod(from: Date, to: Date): void {
  if (from > to) {
    throw new InvalidStateException({ message: 'The report period starts after it ends', code: 'REPORT_PERIOD_INVALID' });
  }
}
