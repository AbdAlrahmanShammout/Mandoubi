import { InvoiceCurrency } from '@/modules/product/enum/invoice-currency.enum';
import { ProductCategory } from '@/modules/product/enum/product-category.enum';

/**
 * Money grouped by the currency stored on the invoice.
 */
export interface CurrencyTotal {
  readonly currency: InvoiceCurrency;
  readonly amount: string;
}

/**
 * Product quantity sold in one currency.
 */
export interface SellerTotal {
  readonly productId: number;
  readonly productName: string;
  readonly currency: InvoiceCurrency;
  readonly paidQuantity: number;
}

/**
 * Quantity of one product in one warehouse.
 */
export interface WarehouseQuantity {
  readonly warehouseId: number;
  readonly warehouseName: string;
  readonly productId: number;
  readonly productName: string;
  readonly quantity: number;
  readonly reservedQuantity: number;
  readonly availableQuantity: number;
  readonly lowQuantityThreshold: number;
}

/**
 * Delivered invoice that is still unpaid.
 */
export interface DebtInvoice {
  readonly invoiceId: number;
  readonly pharmacyId: number;
  readonly pharmacyName: string;
  readonly currency: InvoiceCurrency;
  readonly amount: string;
  readonly dueDate: Date;
  readonly overdue: boolean;
}

/**
 * Outstanding balance of one pharmacy in one currency.
 */
export interface PharmacyBalance {
  readonly pharmacyId: number;
  readonly pharmacyName: string;
  readonly currency: InvoiceCurrency;
  readonly outstanding: string;
}

/**
 * Amount a driver collected and still holds in one currency.
 */
export interface DriverHolding {
  readonly currency: InvoiceCurrency;
  readonly collected: string;
  readonly handedOver: string;
  readonly held: string;
}

/**
 * Delivery counts and held money for one driver.
 */
export interface DriverReportRow {
  readonly driverId: number;
  readonly driverName: string;
  readonly assignedCount: number;
  readonly deliveredPaidCount: number;
  readonly deliveredUnpaidCount: number;
  readonly notDeliveredCount: number;
  readonly holdings: readonly DriverHolding[];
}

/**
 * Sales totals grouped by invoice currency.
 */
export interface SalesReport {
  readonly totals: readonly CurrencyTotal[];
}

/**
 * Product movement and current stock.
 */
export interface ProductReport {
  readonly bestSellers: readonly SellerTotal[];
  readonly slowestSellers: readonly SellerTotal[];
  readonly lowQuantity: readonly WarehouseQuantity[];
  readonly unavailable: readonly WarehouseQuantity[];
  readonly quantitiesByWarehouse: readonly WarehouseQuantity[];
}

/**
 * Pharmacy debt and the payments received in the period.
 */
export interface DebtReport {
  readonly balances: readonly PharmacyBalance[];
  readonly unpaidInvoices: readonly DebtInvoice[];
  readonly paymentsInPeriod: readonly CurrencyTotal[];
  readonly totalDue: readonly CurrencyTotal[];
}

/**
 * Optional filters for a sales period.
 */
export interface SalesReportQuery {
  readonly from: Date;
  readonly to: Date;
  readonly pharmacyId?: number;
  readonly category?: ProductCategory;
}

/**
 * Period shared by the report queries.
 */
export interface ReportPeriod {
  readonly from: Date;
  readonly to: Date;
}
