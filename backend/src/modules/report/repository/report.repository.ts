import { DebtReport, DriverReportRow, ProductReport, ReportPeriod, SalesReport, SalesReportQuery } from '@/modules/report/report.types';

/**
 * Read model for admin reports. Amounts stay grouped by the currency stored on each invoice.
 */
export abstract class ReportRepository {
  /** Sums delivered invoice lines in the period. */
  abstract sales(query: SalesReportQuery): Promise<SalesReport>;
  /** Ranks sellers and lists current warehouse quantities. */
  abstract products(period: ReportPeriod): Promise<ProductReport>;
  /** Lists balances, unpaid invoices, and payments in the period. */
  abstract debts(period: ReportPeriod, now: Date): Promise<DebtReport>;
  /** Lists every driver's delivery counts and held amounts. */
  abstract drivers(): Promise<DriverReportRow[]>;
}
