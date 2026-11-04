import { ApiProperty } from '@nestjs/swagger';
import { InvoiceCurrency } from '@/modules/product/enum/invoice-currency.enum';
import { CurrencyTotal, DebtInvoice, DebtReport, DriverHolding, DriverReportRow, PharmacyBalance, ProductReport, SalesReport, SellerTotal, WarehouseQuantity } from '@/modules/report/report.types';

/**
 * One money total in the currency stored on the invoice.
 */
export class CurrencyTotalResponse {
  @ApiProperty({ enum: InvoiceCurrency, example: InvoiceCurrency.SYP })
  readonly currency: InvoiceCurrency;
  @ApiProperty({ example: '60000.00' })
  readonly amount: string;
  constructor(total: CurrencyTotal) {
    this.currency = total.currency;
    this.amount = total.amount;
  }
}

/**
 * Sales for a period, grouped by invoice currency.
 */
export class SalesReportResponse {
  @ApiProperty({ type: CurrencyTotalResponse, isArray: true })
  readonly totals: CurrencyTotalResponse[];
  constructor(report: SalesReport) {
    this.totals = report.totals.map((total) => new CurrencyTotalResponse(total));
  }
}

/**
 * Quantity sold for one product and currency.
 */
export class SellerTotalResponse {
  @ApiProperty({ example: 1 })
  readonly productId: number;
  @ApiProperty({ example: 'Paracetamol' })
  readonly productName: string;
  @ApiProperty({ enum: InvoiceCurrency, example: InvoiceCurrency.SYP })
  readonly currency: InvoiceCurrency;
  @ApiProperty({ example: 4 })
  readonly paidQuantity: number;
  constructor(seller: SellerTotal) {
    this.productId = seller.productId;
    this.productName = seller.productName;
    this.currency = seller.currency;
    this.paidQuantity = seller.paidQuantity;
  }
}

/**
 * Current quantity of one product in one warehouse.
 */
export class WarehouseQuantityResponse {
  @ApiProperty({ example: 1 })
  readonly warehouseId: number;
  @ApiProperty({ example: 'Main warehouse' })
  readonly warehouseName: string;
  @ApiProperty({ example: 1 })
  readonly productId: number;
  @ApiProperty({ example: 'Paracetamol' })
  readonly productName: string;
  @ApiProperty({ example: 10 })
  readonly quantity: number;
  @ApiProperty({ example: 0 })
  readonly reservedQuantity: number;
  @ApiProperty({ example: 10 })
  readonly availableQuantity: number;
  @ApiProperty({ example: 2 })
  readonly lowQuantityThreshold: number;
  constructor(stock: WarehouseQuantity) {
    this.warehouseId = stock.warehouseId;
    this.warehouseName = stock.warehouseName;
    this.productId = stock.productId;
    this.productName = stock.productName;
    this.quantity = stock.quantity;
    this.reservedQuantity = stock.reservedQuantity;
    this.availableQuantity = stock.availableQuantity;
    this.lowQuantityThreshold = stock.lowQuantityThreshold;
  }
}

/**
 * Product and stock report.
 */
export class ProductReportResponse {
  @ApiProperty({ type: SellerTotalResponse, isArray: true })
  readonly bestSellers: SellerTotalResponse[];
  @ApiProperty({ type: SellerTotalResponse, isArray: true })
  readonly slowestSellers: SellerTotalResponse[];
  @ApiProperty({ type: WarehouseQuantityResponse, isArray: true })
  readonly lowQuantity: WarehouseQuantityResponse[];
  @ApiProperty({ type: WarehouseQuantityResponse, isArray: true })
  readonly unavailable: WarehouseQuantityResponse[];
  @ApiProperty({ type: WarehouseQuantityResponse, isArray: true })
  readonly quantitiesByWarehouse: WarehouseQuantityResponse[];
  constructor(report: ProductReport) {
    this.bestSellers = report.bestSellers.map((seller) => new SellerTotalResponse(seller));
    this.slowestSellers = report.slowestSellers.map((seller) => new SellerTotalResponse(seller));
    this.lowQuantity = report.lowQuantity.map((stock) => new WarehouseQuantityResponse(stock));
    this.unavailable = report.unavailable.map((stock) => new WarehouseQuantityResponse(stock));
    this.quantitiesByWarehouse = report.quantitiesByWarehouse.map((stock) => new WarehouseQuantityResponse(stock));
  }
}

/**
 * Outstanding balance of one pharmacy.
 */
export class PharmacyBalanceResponse {
  @ApiProperty({ example: 1 })
  readonly pharmacyId: number;
  @ApiProperty({ example: 'Al Shifa Pharmacy' })
  readonly pharmacyName: string;
  @ApiProperty({ enum: InvoiceCurrency, example: InvoiceCurrency.SYP })
  readonly currency: InvoiceCurrency;
  @ApiProperty({ example: '60000.00' })
  readonly outstanding: string;
  constructor(balance: PharmacyBalance) {
    this.pharmacyId = balance.pharmacyId;
    this.pharmacyName = balance.pharmacyName;
    this.currency = balance.currency;
    this.outstanding = balance.outstanding;
  }
}

/**
 * Unpaid delivered invoice.
 */
export class DebtInvoiceResponse {
  @ApiProperty({ example: 1 })
  readonly invoiceId: number;
  @ApiProperty({ example: 1 })
  readonly pharmacyId: number;
  @ApiProperty({ example: 'Al Shifa Pharmacy' })
  readonly pharmacyName: string;
  @ApiProperty({ enum: InvoiceCurrency, example: InvoiceCurrency.SYP })
  readonly currency: InvoiceCurrency;
  @ApiProperty({ example: '60000.00' })
  readonly amount: string;
  @ApiProperty({ example: '2026-11-05T00:00:00.000Z' })
  readonly dueDate: Date;
  @ApiProperty({ example: true })
  readonly overdue: boolean;
  constructor(invoice: DebtInvoice) {
    this.invoiceId = invoice.invoiceId;
    this.pharmacyId = invoice.pharmacyId;
    this.pharmacyName = invoice.pharmacyName;
    this.currency = invoice.currency;
    this.amount = invoice.amount;
    this.dueDate = invoice.dueDate;
    this.overdue = invoice.overdue;
  }
}

/**
 * Debt report.
 */
export class DebtReportResponse {
  @ApiProperty({ type: PharmacyBalanceResponse, isArray: true })
  readonly balances: PharmacyBalanceResponse[];
  @ApiProperty({ type: DebtInvoiceResponse, isArray: true })
  readonly unpaidInvoices: DebtInvoiceResponse[];
  @ApiProperty({ type: CurrencyTotalResponse, isArray: true })
  readonly paymentsInPeriod: CurrencyTotalResponse[];
  @ApiProperty({ type: CurrencyTotalResponse, isArray: true })
  readonly totalDue: CurrencyTotalResponse[];
  constructor(report: DebtReport) {
    this.balances = report.balances.map((balance) => new PharmacyBalanceResponse(balance));
    this.unpaidInvoices = report.unpaidInvoices.map((invoice) => new DebtInvoiceResponse(invoice));
    this.paymentsInPeriod = report.paymentsInPeriod.map((payment) => new CurrencyTotalResponse(payment));
    this.totalDue = report.totalDue.map((total) => new CurrencyTotalResponse(total));
  }
}

/**
 * Money a driver still holds.
 */
export class DriverHoldingResponse {
  @ApiProperty({ enum: InvoiceCurrency, example: InvoiceCurrency.SYP })
  readonly currency: InvoiceCurrency;
  @ApiProperty({ example: '30000.00' })
  readonly collected: string;
  @ApiProperty({ example: '0.00' })
  readonly handedOver: string;
  @ApiProperty({ example: '30000.00' })
  readonly held: string;
  constructor(holding: DriverHolding) {
    this.currency = holding.currency;
    this.collected = holding.collected;
    this.handedOver = holding.handedOver;
    this.held = holding.held;
  }
}

/**
 * One driver in the driver report.
 */
export class DriverReportRowResponse {
  @ApiProperty({ example: 1 })
  readonly driverId: number;
  @ApiProperty({ example: 'Ahmad Ali' })
  readonly driverName: string;
  @ApiProperty({ example: 2 })
  readonly assignedCount: number;
  @ApiProperty({ example: 1 })
  readonly deliveredPaidCount: number;
  @ApiProperty({ example: 1 })
  readonly deliveredUnpaidCount: number;
  @ApiProperty({ example: 0 })
  readonly notDeliveredCount: number;
  @ApiProperty({ type: DriverHoldingResponse, isArray: true })
  readonly holdings: DriverHoldingResponse[];
  constructor(row: DriverReportRow) {
    this.driverId = row.driverId;
    this.driverName = row.driverName;
    this.assignedCount = row.assignedCount;
    this.deliveredPaidCount = row.deliveredPaidCount;
    this.deliveredUnpaidCount = row.deliveredUnpaidCount;
    this.notDeliveredCount = row.notDeliveredCount;
    this.holdings = row.holdings.map((holding) => new DriverHoldingResponse(holding));
  }
}
