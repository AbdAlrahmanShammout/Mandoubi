import { Fragment, useMemo, type ReactElement } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getOrder, listProducts, listRejectionReasons, listWarehouses } from '@/api/admin-api-client';
import { describeAdminError } from '@/api/admin-api-error';
import type { OrderRecord, ProductRecord, RejectionReasonRecord, WarehouseRecord } from '@/api/api-types';
import { PageBanner, useLoad } from '@/catalog/page-state';
import { Badge } from '@/components/badge';
import { CategoryLabel } from '@/components/category-label';
import { Icon } from '@/components/icon';
import { formatDateTime } from '@/format/format-value';
import { InvoiceReview } from '@/orders/invoice-review';
import { formatMoney, invoiceStatusLabel, orderStatusLabel, rejectionSummary } from '@/orders/order-labels';
import { CatalogPage } from '@/shell/catalog-page';

interface OrderReviewData {
  readonly order: OrderRecord;
  readonly warehouses: readonly WarehouseRecord[];
  readonly products: readonly ProductRecord[];
  readonly reasons: readonly RejectionReasonRecord[];
}

/**
 * One order and the invoice currently under review.
 */
export function OrderDetailPage(): ReactElement {
  const params = useParams();
  const navigate = useNavigate();
  const orderId = Number(params.orderId);
  const invoiceId = params.invoiceId ? Number(params.invoiceId) : null;
  const isValidOrder = Number.isInteger(orderId) && orderId > 0;
  const { data, errorMessage, isLoading, reload } = useLoad(isValidOrder ? `order-${orderId}` : 'order-invalid', () => (isValidOrder ? loadOrderReview(orderId) : Promise.reject(new Error('invalid-order'))), (error) => (isValidOrder ? describeAdminError(error) : ''));
  const selected = useMemo(() => selectInvoice(data?.order ?? null, invoiceId), [data, invoiceId]);
  if (!isValidOrder) {
    return (
      <CatalogPage crumb="الطلبات" title="طلب غير صالح" description="رقم الطلب غير مقبول." actionLabel="كل الطلبات" actionTo="/orders">
        <PageBanner message="رقم الطلب غير صالح." />
      </CatalogPage>
    );
  }
  return (
    <CatalogPage crumb={`الطلبات / #${orderId}`} title={data ? data.order.pharmacyName : `طلب #${orderId}`} description="راجع كل فاتورة على حدة. موافقة فاتورة لا توافق الفواتير الأخرى." actionLabel="كل الطلبات" actionTo="/orders">
      <PageBanner message={errorMessage} onRetry={reload} />
      {isLoading && !data && (
        <div className="ds-empty">
          <b>جارٍ التحميل</b>
        </div>
      )}
      {data && (
        <div className="detail-page order-phase-page">
          <OrderSummary order={data.order} />
          <div className="phase-invoice-layout">
            <aside className="invoice-list phase-invoice-list">
              <div className="aside-title">
                الفواتير <b>{data.order.invoiceCount}</b>
              </div>
              {data.order.invoices.map((invoice) => {
                const [invoiceLabel, invoiceTone] = invoiceStatusLabel(invoice.status);
                return (
                  <button key={invoice.id} type="button" className={selected?.id === invoice.id ? 'active' : ''} onClick={() => navigate(`/orders/${orderId}/invoices/${invoice.id}`)}>
                    <span>
                      <b>#{invoice.id}</b>
                      <small>{invoice.items.length} أسطر</small>
                      <CategoryLabel kind={invoice.category} compact />
                    </span>
                    <Badge tone={invoiceTone}>{invoiceLabel}</Badge>
                    <strong>{invoice.totals.map((total) => formatMoney(total.amount, total.currency)).join(' · ') || '—'}</strong>
                    {rejectionSummary(invoice) && <em>{rejectionSummary(invoice)}</em>}
                  </button>
                );
              })}
              {data.order.invoices.length === 0 && <p className="invoice-status-note">هذا الطلب بلا فواتير.</p>}
            </aside>
            {selected ? (
              <InvoiceReview key={selected.id} invoice={selected} products={data.products} warehouses={data.warehouses} reasons={data.reasons} onChanged={reload} />
            ) : (
              <div className="ds-empty">
                <b>اختر فاتورة</b>
                <p>لا توجد فاتورة مطابقة في هذا الطلب.</p>
                <Link className="ds-btn ds-secondary" to={`/orders/${orderId}`}>
                  أول فاتورة
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </CatalogPage>
  );
}

function OrderSummary({ order }: { readonly order: OrderRecord }): ReactElement {
  const [label, tone] = orderStatusLabel(order.status);
  const initial = order.pharmacyName.trim().slice(0, 1) || 'ص';
  return (
    <section className="order-summary phase-order-summary">
      <div>
        <div className="order-title">
          <span className="pharmacy-icon">{initial}</span>
          <div>
            <small>طلب #{order.id}</small>
            <h5>{order.pharmacyName}</h5>
            <p>
              <Icon name="user" size={14} /> معرّف الصيدلية {order.pharmacyId} · {formatDateTime(order.createdAt)} · <Link to={`/accounts/pharmacies/${order.pharmacyId}`}>كشف الحساب</Link>
            </p>
          </div>
        </div>
      </div>
      <div className="summary-stat">
        <small>الحالة المحسوبة</small>
        <Badge tone={tone}>{label}</Badge>
        <em>لا تُعدَّل يدوياً</em>
      </div>
      <div className="summary-stat">
        <small>عدد الفواتير</small>
        <strong>{order.invoiceCount}</strong>
      </div>
      <div className="money-pair">
        {order.totals.length === 0 && (
          <span>
            <small>الإجمالي</small>
            <b>—</b>
          </span>
        )}
        {order.totals.map((total, index) => (
          <Fragment key={total.currency}>
            {index > 0 && <i />}
            <span>
              <small>{total.currency === 'USD' ? 'USD' : 'ل.س'}</small>
              <b>{total.amount}</b>
            </span>
          </Fragment>
        ))}
      </div>
    </section>
  );
}

function selectInvoice(order: OrderRecord | null, invoiceId: number | null): OrderRecord['invoices'][number] | null {
  if (!order || order.invoices.length === 0) {
    return null;
  }
  if (invoiceId === null) {
    return order.invoices[0];
  }
  return order.invoices.find((invoice) => invoice.id === invoiceId) ?? null;
}

async function loadOrderReview(orderId: number): Promise<OrderReviewData> {
  const order = await getOrder(orderId);
  const [warehouses, products, reasons] = await Promise.all([
    listWarehouses().catch(() => [] as WarehouseRecord[]),
    listProducts().catch(() => [] as ProductRecord[]),
    listRejectionReasons().catch(() => [] as RejectionReasonRecord[]),
  ]);
  return { order, warehouses, products, reasons };
}
