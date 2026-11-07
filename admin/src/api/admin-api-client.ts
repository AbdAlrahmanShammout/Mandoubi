import type {
  AdminUser,
  ExchangeRateRecord,
  ManufacturerRecord,
  NotificationRecord,
  DebtReport,
  DriverPosition,
  DriverRecord,
  DriverReportRow,
  DriverSettlementInput,
  DriverSettlementRecord,
  InvoiceRecord,
  OrderRecord,
  PaymentRecord,
  PharmacyStatement,
  ReceiptInput,
  SalesReport,
  SalesReportQuery,
  ProductRecord,
  ProductReport,
  RejectInvoiceInput,
  RejectionReasonRecord,
  ProductStockInput,
  ProductWriteInput,
  SignInResponse,
  WarehouseProductRecord,
  WarehouseRecord,
} from '@/api/api-types';
import { AdminApiError } from '@/api/admin-api-error';
import type { FieldError } from '@/api/api-types';
import { clearSession, readAccessToken } from '@/api/session-store';

const API_BASE_URL = import.meta.env.VITE_ADMIN_API_BASE_URL ?? '';

type UnauthorizedHandler = () => void;

let onUnauthorized: UnauthorizedHandler = () => undefined;

/**
 * Registers the handler that returns the administrator to sign-in.
 */
export function setUnauthorizedHandler(handler: UnauthorizedHandler): void {
  onUnauthorized = handler;
}

/**
 * Exchanges the administrator mobile number and password for an access token.
 */
export function signInAdmin(mobileNumber: string, password: string): Promise<SignInResponse> {
  return request<SignInResponse>('/admin/auth/sign-in', {
    method: 'POST',
    body: { mobileNumber, password },
    authenticated: false,
  });
}

/**
 * Reads the signed-in administrator. The response has no name and no password.
 */
export function getCurrentAdmin(): Promise<AdminUser> {
  return request<AdminUser>('/admin/auth/me');
}

/**
 * Asks the server to end the session, then drops the token locally.
 * The sign-out route is required and is not implemented on the server yet.
 */
export async function signOutAdmin(): Promise<void> {
  try {
    await request<unknown>('/admin/auth/sign-out', { method: 'POST' });
  } catch (error) {
    if (error instanceof AdminApiError && error.statusCode !== 404 && error.statusCode !== 401) {
      clearSession();
      throw error;
    }
  }
  clearSession();
}

export function listManufacturers(): Promise<ManufacturerRecord[]> {
  return request<ManufacturerRecord[]>('/admin/manufacturers');
}

export function getManufacturer(id: number): Promise<ManufacturerRecord> {
  return request<ManufacturerRecord>(`/admin/manufacturers/${id}`);
}

export function createManufacturer(name: string): Promise<ManufacturerRecord> {
  return request<ManufacturerRecord>('/admin/manufacturers', { method: 'POST', body: { name } });
}

export function renameManufacturer(id: number, name: string): Promise<ManufacturerRecord> {
  return request<ManufacturerRecord>(`/admin/manufacturers/${id}`, { method: 'PATCH', body: { name } });
}

export function updateManufacturerStatus(id: number, status: 'ACTIVE' | 'DISABLED'): Promise<ManufacturerRecord> {
  return request<ManufacturerRecord>(`/admin/manufacturers/${id}/status`, { method: 'PATCH', body: { status } });
}

export function listWarehouses(): Promise<WarehouseRecord[]> {
  return request<WarehouseRecord[]>('/admin/warehouses');
}

export function getWarehouse(id: number): Promise<WarehouseRecord> {
  return request<WarehouseRecord>(`/admin/warehouses/${id}`);
}

export function listWarehouseProducts(id: number): Promise<WarehouseProductRecord[]> {
  return request<WarehouseProductRecord[]>(`/admin/warehouses/${id}/products`);
}

export function createWarehouse(input: { readonly name: string; readonly address: string }): Promise<WarehouseRecord> {
  return request<WarehouseRecord>('/admin/warehouses', { method: 'POST', body: input });
}

export function updateWarehouse(id: number, input: { readonly name: string; readonly address: string }): Promise<WarehouseRecord> {
  return request<WarehouseRecord>(`/admin/warehouses/${id}`, { method: 'PATCH', body: input });
}

export function listProducts(): Promise<ProductRecord[]> {
  return request<ProductRecord[]>('/admin/products');
}

export function getProduct(id: number): Promise<ProductRecord> {
  return request<ProductRecord>(`/admin/products/${id}`);
}

export function createProduct(input: ProductWriteInput): Promise<ProductRecord> {
  return request<ProductRecord>('/admin/products', { method: 'POST', body: input });
}

export function updateProduct(id: number, input: ProductWriteInput): Promise<ProductRecord> {
  return request<ProductRecord>(`/admin/products/${id}`, { method: 'PATCH', body: input });
}

export function replaceProductStocks(id: number, stocks: readonly ProductStockInput[]): Promise<ProductRecord> {
  return request<ProductRecord>(`/admin/products/${id}/stocks`, { method: 'PUT', body: { stocks } });
}

export function getExchangeRate(): Promise<ExchangeRateRecord> {
  return request<ExchangeRateRecord>('/admin/exchange-rate');
}

export function replaceExchangeRate(usdToSyp: string): Promise<ExchangeRateRecord> {
  return request<ExchangeRateRecord>('/admin/exchange-rate', { method: 'PUT', body: { usdToSyp } });
}

export function listNotifications(): Promise<NotificationRecord[]> {
  return request<NotificationRecord[]>('/admin/notifications');
}

export function listOrders(): Promise<OrderRecord[]> {
  return request<OrderRecord[]>('/admin/orders');
}

/**
 * Opens one submitted order and the invoices created from it.
 */
export function getOrder(id: number): Promise<OrderRecord> {
  return request<OrderRecord>(`/admin/orders/${id}`);
}

/**
 * Opens one invoice and the prices captured when the pharmacy submitted it.
 */
export function getInvoice(id: number): Promise<InvoiceRecord> {
  return request<InvoiceRecord>(`/admin/invoices/${id}`);
}

/**
 * Approves one pending invoice and reserves stock at the warehouses stored on its lines.
 */
export function approveInvoice(id: number): Promise<InvoiceRecord> {
  return request<InvoiceRecord>(`/admin/invoices/${id}/approve`, { method: 'POST' });
}

/**
 * Rejects one pending invoice. A managed reason and a note are both optional.
 */
export function rejectInvoice(id: number, input: RejectInvoiceInput): Promise<InvoiceRecord> {
  return request<InvoiceRecord>(`/admin/invoices/${id}/reject`, { method: 'POST', body: input });
}

/**
 * Lists managed rejection reasons, including inactive ones.
 */
export function listRejectionReasons(): Promise<RejectionReasonRecord[]> {
  return request<RejectionReasonRecord[]>('/admin/rejection-reasons');
}

/**
 * Assigns an approved invoice, or sends a returned invoice out again.
 * Calls the admin deliveries controller.
 */
export function assignDelivery(invoiceId: number, driverId: number): Promise<unknown> {
  return request<unknown>('/admin/deliveries', { method: 'POST', body: { invoiceId, driverId } });
}

/**
 * Returns one unpaid or undelivered invoice to the warehouse stored on it.
 * Calls the admin returns controller.
 */
export function returnInvoice(invoiceId: number): Promise<{ readonly invoiceId: number; readonly status: string }> {
  return request<{ readonly invoiceId: number; readonly status: string }>('/admin/returns', { method: 'POST', body: { invoiceId } });
}

/**
 * Reads one driver profile. There is no driver list endpoint.
 */
export function getDriver(id: number): Promise<DriverRecord> {
  return request<DriverRecord>(`/admin/drivers/${id}`);
}

/**
 * Reads a pharmacy statement and the invoices a receipt can cover.
 * Calls the admin pharmacy statement controller.
 */
export function getPharmacyStatement(pharmacyId: number): Promise<PharmacyStatement> {
  return request<PharmacyStatement>(`/admin/pharmacies/${pharmacyId}/statement`);
}

/**
 * Records a receipt that must equal the full total of the selected invoices.
 * Calls the admin receipts controller.
 */
export function recordReceipt(input: ReceiptInput): Promise<PaymentRecord> {
  return request<PaymentRecord>('/admin/receipts', { method: 'POST', body: input });
}

/**
 * Reads assignment counts and the collections a driver still holds.
 * Calls the admin driver settlement controller.
 */
export function getDriverPosition(driverId: number): Promise<DriverPosition> {
  return request<DriverPosition>(`/admin/drivers/${driverId}/settlement`);
}

/**
 * Records a handover of whole driver collections.
 * Calls the admin driver settlement controller.
 */
export function recordDriverSettlement(input: DriverSettlementInput): Promise<DriverSettlementRecord> {
  return request<DriverSettlementRecord>('/admin/driver-settlements', { method: 'POST', body: input });
}

/**
 * Reads delivered sales for a period, grouped by the currency stored on the invoice.
 * Calls the admin reports controller.
 */
export function getSalesReport(query: SalesReportQuery): Promise<SalesReport> {
  return request<SalesReport>(`/admin/reports/sales${toQuery(query)}`);
}

/**
 * Reads seller ranks for a period and the current warehouse quantities.
 * Calls the admin reports controller.
 */
export function getProductReport(from: string, to: string): Promise<ProductReport> {
  return request<ProductReport>(`/admin/reports/products${toQuery({ from, to })}`);
}

/**
 * Reads current pharmacy balances and the payments recorded in a period.
 * Calls the admin reports controller.
 */
export function getDebtReport(from: string, to: string): Promise<DebtReport> {
  return request<DebtReport>(`/admin/reports/debts${toQuery({ from, to })}`);
}

/**
 * Reads delivery counts and held money for every driver.
 * Calls the admin reports controller.
 */
export function getDriverReport(): Promise<DriverReportRow[]> {
  return request<DriverReportRow[]>('/admin/reports/drivers');
}

interface RequestOptions {
  readonly method?: string;
  readonly body?: unknown;
  readonly authenticated?: boolean;
}

async function request<TResponse>(path: string, options: RequestOptions = {}): Promise<TResponse> {
  const headers = new Headers({ Accept: 'application/json' });
  if (options.body !== undefined) {
    headers.set('Content-Type', 'application/json');
  }
  const authenticated = options.authenticated !== false;
  if (authenticated) {
    const accessToken = readAccessToken();
    if (!accessToken) {
      onUnauthorized();
      throw new AdminApiError(401, 'UNAUTHORIZED', 'The session has ended');
    }
    headers.set('Authorization', `Bearer ${accessToken}`);
  }
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  } catch {
    throw new AdminApiError(0, 'NETWORK', 'The admin API could not be reached');
  }
  if (response.status === 401 && authenticated) {
    clearSession();
    onUnauthorized();
  }
  if (!response.ok) {
    throw await readError(response);
  }
  if (response.status === 204) {
    return undefined as TResponse;
  }
  return (await response.json()) as TResponse;
}

async function readError(response: Response): Promise<AdminApiError> {
  try {
    const body: unknown = await response.json();
    if (isErrorBody(body)) {
      return new AdminApiError(body.statusCode ?? response.status, body.code ?? 'REQUEST_FAILED', body.message ?? '', body.validationErrorObjects ?? []);
    }
  } catch {
    return new AdminApiError(response.status, 'REQUEST_FAILED', '');
  }
  return new AdminApiError(response.status, 'REQUEST_FAILED', '');
}

function toQuery(params: object): string {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (typeof value === 'string' && value.length > 0) {
      search.set(key, value);
    }
    if (typeof value === 'number') {
      search.set(key, String(value));
    }
  });
  const query = search.toString();
  return query.length === 0 ? '' : `?${query}`;
}

function isErrorBody(value: unknown): value is { message?: string; code?: string; statusCode?: number; validationErrorObjects?: FieldError[] } {
  return typeof value === 'object' && value !== null;
}
