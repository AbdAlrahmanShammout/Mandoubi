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

export interface FieldError {
  readonly field: string;
  readonly messages: readonly string[];
}
