import type {
  AdminUser,
  ExchangeRateRecord,
  ManufacturerRecord,
  NotificationRecord,
  InvoiceRecord,
  OrderRecord,
  ProductRecord,
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

function isErrorBody(value: unknown): value is { message?: string; code?: string; statusCode?: number; validationErrorObjects?: FieldError[] } {
  return typeof value === 'object' && value !== null;
}
