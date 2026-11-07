export interface SignInResponse {
  readonly accessToken: string;
  readonly tokenType: string;
  readonly expiresIn: string;
}

export interface AdminUser {
  readonly id: number;
  readonly role: string;
  readonly mobileNumber: string;
  readonly status: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ManufacturerRecord {
  readonly id: number;
  readonly name: string;
  readonly status: 'ACTIVE' | 'DISABLED';
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface WarehouseRecord {
  readonly id: number;
  readonly name: string;
  readonly address: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface WarehouseProductRecord {
  readonly productId: number;
  readonly productName: string;
  readonly barcode: string;
  readonly quantity: number;
  readonly isPrimary: boolean;
}

export interface ProductStockRecord {
  readonly id: number;
  readonly warehouseId: number;
  readonly warehouseName: string;
  readonly quantity: number;
  readonly reservedQuantity: number;
  readonly availableQuantity: number;
  readonly isPrimary: boolean;
}

export type ProductCategory = 'NATIONAL_MEDICINE' | 'FOREIGN_MEDICINE' | 'ACCESSORY';
export type SaleUnit = 'PACK' | 'BOX' | 'SACHET';
export type InvoiceCurrency = 'USD' | 'SYP';
export type ProductAvailability = 'AVAILABLE' | 'UNAVAILABLE';
export type ProductStatus = 'ACTIVE' | 'DISABLED';

export interface ProductRecord {
  readonly id: number;
  readonly name: string;
  readonly barcode: string;
  readonly manufacturerId: number;
  readonly manufacturerName: string;
  readonly activeIngredient: string;
  readonly imageUrl: string | null;
  readonly minimumOrderQuantity: number;
  readonly maximumOrderQuantity: number;
  readonly lowQuantityThreshold: number;
  readonly pharmacyPriceUsd: string;
  readonly pharmacyPriceSyp: string;
  readonly consumerPriceUsd: string;
  readonly consumerPriceSyp: string;
  readonly calculateSypFromRate: boolean;
  readonly invoiceCurrency: InvoiceCurrency;
  readonly category: ProductCategory;
  readonly saleUnit: SaleUnit;
  readonly offerActive: boolean;
  readonly offerPaidUnits: number | null;
  readonly offerFreeUnits: number | null;
  readonly offerStartsAt: string | null;
  readonly offerEndsAt: string | null;
  readonly availability: ProductAvailability;
  readonly status: ProductStatus;
  readonly stocks: readonly ProductStockRecord[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ProductStockInput {
  readonly warehouseId: number;
  readonly quantity: number;
  readonly isPrimary?: boolean;
}

export interface ProductWriteInput {
  readonly name: string;
  readonly barcode: string;
  readonly manufacturerId: number;
  readonly activeIngredient: string;
  readonly minimumOrderQuantity: number;
  readonly maximumOrderQuantity: number;
  readonly lowQuantityThreshold: number;
  readonly pharmacyPriceUsd: string;
  readonly pharmacyPriceSyp?: string;
  readonly consumerPriceUsd: string;
  readonly consumerPriceSyp?: string;
  readonly calculateSypFromRate: boolean;
  readonly invoiceCurrency: InvoiceCurrency;
  readonly category: ProductCategory;
  readonly saleUnit: SaleUnit;
  readonly availability?: ProductAvailability;
  readonly status?: ProductStatus;
  readonly offerActive: boolean;
  readonly offerPaidUnits?: number;
  readonly offerFreeUnits?: number;
  readonly offerStartsAt?: string;
  readonly offerEndsAt?: string;
  readonly stocks?: readonly ProductStockInput[];
}

export interface ExchangeRateRecord {
  readonly id: number;
  readonly usdToSyp: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface NotificationRecord {
  readonly id: number;
  readonly title: string;
  readonly body: string;
  readonly readAt: string | null;
  readonly createdAt: string;
}

export type OrderStatus = 'PENDING' | 'PARTIALLY_APPROVED' | 'APPROVED' | 'PARTIALLY_DELIVERED' | 'COMPLETED';

export type InvoiceStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'ASSIGNED'
  | 'DELIVERED_PAID'
  | 'DELIVERED_UNPAID'
  | 'NOT_DELIVERED'
  | 'RETURNED_TO_WAREHOUSE'
  | 'OUT_FOR_DELIVERY';

export interface MoneyTotal {
  readonly currency: InvoiceCurrency;
  readonly amount: string;
}

export interface InvoiceItemRecord {
  readonly id: number;
  readonly productId: number;
  readonly productName: string;
  readonly barcode: string;
  readonly saleUnit: SaleUnit;
  readonly paidQuantity: number;
  readonly freeQuantity: number;
  readonly totalQuantity: number;
  readonly unitPrice: string;
  readonly consumerUnitPrice: string;
  readonly currency: InvoiceCurrency;
  readonly lineAmount: string;
  readonly primaryWarehouseId: number;
  readonly offerPaidUnits: number | null;
  readonly offerFreeUnits: number | null;
}

export interface InvoiceRecord {
  readonly id: number;
  readonly orderId: number;
  readonly category: ProductCategory;
  readonly status: InvoiceStatus;
  readonly rejectionReasonId: number | null;
  readonly rejectionReasonLabel: string | null;
  readonly customReason: string | null;
  readonly totals: readonly MoneyTotal[];
  readonly items: readonly InvoiceItemRecord[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface OrderRecord {
  readonly id: number;
  readonly pharmacyId: number;
  readonly pharmacyName: string;
  readonly status: OrderStatus;
  readonly invoiceCount: number;
  readonly totals: readonly MoneyTotal[];
  readonly invoices: readonly InvoiceRecord[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface RejectionReasonRecord {
  readonly id: number;
  readonly label: string;
  readonly status: 'ACTIVE' | 'DISABLED';
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface RejectInvoiceInput {
  readonly rejectionReasonId?: number;
  readonly customReason?: string;
}

export interface DriverRecord {
  readonly id: number;
  readonly name: string;
  readonly mobileNumber: string;
  readonly status: 'ACTIVE' | 'DISABLED';
  readonly createdAt: string;
  readonly updatedAt: string;
}

export type PaymentMethod = 'CASH' | 'BANK_TRANSFER';
export type StatementEntryKind = 'CHARGE' | 'RECEIPT' | 'DRIVER_COLLECTION';

export interface StatementEntry {
  readonly kind: StatementEntryKind;
  readonly currency: InvoiceCurrency;
  readonly amount: string;
  readonly occurredAt: string;
  readonly invoiceId: number | null;
  readonly paymentId: number | null;
}

export interface CurrencyStatement {
  readonly currency: InvoiceCurrency;
  readonly openingBalance: string;
  readonly charges: string;
  readonly payments: string;
  readonly outstanding: string;
  readonly entries: readonly StatementEntry[];
}

export interface UnpaidInvoice {
  readonly invoiceId: number;
  readonly orderId: number;
  readonly currency: InvoiceCurrency;
  readonly amount: string;
  readonly deliveredAt: string;
  readonly dueDate: string;
  readonly overdue: boolean;
}

export interface PharmacyStatement {
  readonly pharmacyId: number;
  readonly pharmacyName: string;
  readonly currencies: readonly CurrencyStatement[];
  readonly unpaidInvoices: readonly UnpaidInvoice[];
}

export interface ReceiptInput {
  readonly pharmacyId: number;
  readonly currency: InvoiceCurrency;
  readonly amount: string;
  readonly receivedByName: string;
  readonly paymentMethod: PaymentMethod;
  readonly invoiceIds: readonly number[];
}

export interface PaymentRecord {
  readonly id: number;
  readonly pharmacyId: number;
  readonly kind: 'RECEIPT' | 'DRIVER_COLLECTION';
  readonly currency: InvoiceCurrency;
  readonly amount: string;
  readonly receivedByName: string;
  readonly paymentMethod: PaymentMethod;
  readonly driverId: number | null;
  readonly occurredAt: string;
  readonly invoiceIds: readonly number[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CurrencyHolding {
  readonly currency: InvoiceCurrency;
  readonly collected: string;
  readonly handedOver: string;
  readonly held: string;
}

export interface DriverCollection {
  readonly paymentId: number;
  readonly currency: InvoiceCurrency;
  readonly amount: string;
  readonly settled: boolean;
  readonly invoiceIds: readonly number[];
}

export interface DriverPosition {
  readonly driverId: number;
  readonly driverName: string;
  readonly assignedCount: number;
  readonly deliveredPaidCount: number;
  readonly deliveredUnpaidCount: number;
  readonly notDeliveredCount: number;
  readonly holdings: readonly CurrencyHolding[];
  readonly collections: readonly DriverCollection[];
}

export interface DriverSettlementInput {
  readonly driverId: number;
  readonly currency: InvoiceCurrency;
  readonly amount: string;
  readonly receivedByName: string;
  readonly paymentIds: readonly number[];
}

export interface DriverSettlementRecord {
  readonly id: number;
  readonly driverId: number;
  readonly currency: InvoiceCurrency;
  readonly amount: string;
  readonly receivedByName: string;
  readonly occurredAt: string;
  readonly paymentIds: readonly number[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CurrencyTotal {
  readonly currency: InvoiceCurrency;
  readonly amount: string;
}

export interface SalesReportQuery {
  readonly from: string;
  readonly to: string;
  readonly pharmacyId?: number;
  readonly category?: ProductCategory;
}

export interface SalesReport {
  readonly totals: readonly CurrencyTotal[];
}

export interface SellerTotal {
  readonly productId: number;
  readonly productName: string;
  readonly currency: InvoiceCurrency;
  readonly paidQuantity: number;
}

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

export interface ProductReport {
  readonly bestSellers: readonly SellerTotal[];
  readonly slowestSellers: readonly SellerTotal[];
  readonly lowQuantity: readonly WarehouseQuantity[];
  readonly unavailable: readonly WarehouseQuantity[];
  readonly quantitiesByWarehouse: readonly WarehouseQuantity[];
}

export interface PharmacyBalance {
  readonly pharmacyId: number;
  readonly pharmacyName: string;
  readonly currency: InvoiceCurrency;
  readonly outstanding: string;
}

export interface DebtInvoice {
  readonly invoiceId: number;
  readonly pharmacyId: number;
  readonly pharmacyName: string;
  readonly currency: InvoiceCurrency;
  readonly amount: string;
  readonly dueDate: string;
  readonly overdue: boolean;
}

export interface DebtReport {
  readonly balances: readonly PharmacyBalance[];
  readonly unpaidInvoices: readonly DebtInvoice[];
  readonly paymentsInPeriod: readonly CurrencyTotal[];
  readonly totalDue: readonly CurrencyTotal[];
}

export interface DriverReportHolding {
  readonly currency: InvoiceCurrency;
  readonly collected: string;
  readonly handedOver: string;
  readonly held: string;
}

export interface DriverReportRow {
  readonly driverId: number;
  readonly driverName: string;
  readonly assignedCount: number;
  readonly deliveredPaidCount: number;
  readonly deliveredUnpaidCount: number;
  readonly notDeliveredCount: number;
  readonly holdings: readonly DriverReportHolding[];
}

export interface FieldError {
  readonly field: string;
  readonly messages: readonly string[];
}
