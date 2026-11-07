import { useDeferredValue, useState, type ReactElement } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchOrders } from '@/api/admin-api-client';
import { describeAdminError } from '@/api/admin-api-error';
import type { OrderRecord, OrderStatus } from '@/api/api-types';
import { Pagination, ServerSearch } from '@/catalog/list-controls';
import { PageBanner, useLoad } from '@/catalog/page-state';
import { Badge } from '@/components/badge';
import { Icon } from '@/components/icon';
import { formatDateTime } from '@/format/format-value';
import { categoryLabel } from '@/catalog/catalog-labels';
import { formatMoney, invoiceStatusLabel, orderStatusLabel } from '@/orders/order-labels';
import { localDayRange } from '@/reports/report-period';
import { CatalogPage } from '@/shell/catalog-page';

const STATUS_OPTIONS: readonly (readonly [string, string])[] = [
  ['ALL', 'كل الحالات'],
  ['PENDING', 'قيد المراجعة'],
  ['PARTIALLY_APPROVED', 'موافقة جزئية'],
  ['APPROVED', 'موافق عليها'],
  ['PARTIALLY_DELIVERED', 'تسليم جزئي'],
  ['COMPLETED', 'مكتمل'],
];

/**
 * Submitted pharmacy orders, searched and paged by the server.
 */
export function OrderListPage(): ReactElement {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('ALL');
  const [orderDate, setOrderDate] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const search = useDeferredValue(query).trim();
  const day = localDayRange(orderDate);
  const offset = (page - 1) * pageSize;
  const { data, errorMessage, isLoading, reload } = useLoad(
    `orders-${search}-${status}-${day?.from ?? ''}-${day?.to ?? ''}-${offset}-${pageSize}`,
    () => searchOrders({
      search,
      status: status === 'ALL' ? undefined : status as OrderStatus,
      createdFrom: day?.from,
      createdTo: day?.to,
      limit: pageSize,
      offset,
    }),
    describeAdminError,
  );
  const orders = data?.items ?? [];
  const total = data?.total ?? 0;
  const hasFilter = search.length > 0 || status !== 'ALL' || orderDate.length > 0;
  return (
    <CatalogPage crumb="الطلبات" title="الطلبات" description="كل طلب صيدلية وفواتيره. الحالة محسوبة من الفواتير وليست مخزّنة.">
      <PageBanner message={errorMessage} onRetry={reload} />
      <div className="catalog-tools order-tools">
        <ServerSearch
          label="بحث الطلبات"
          placeholder="رقم الطلب أو اسم الصيدلية"
          value={query}
          onChange={(value) => {
            setQuery(value);
            setPage(1);
          }}
        />
        <Filter
          label="حالة الطلب"
          value={status}
          options={STATUS_OPTIONS}
          onChange={(value) => {
            setStatus(value);
            setPage(1);
          }}
        />
        <label className="ds-filter">
          <small>تاريخ الطلب</small>
          <input
            type="date"
            value={orderDate}
            onChange={(event) => {
              setOrderDate(event.target.value);
              setPage(1);
            }}
          />
        </label>
      </div>
      <div className="catalog-table-card">
        <div className="catalog-table-meta">
          <span>{total} طلباً</span>
          <small>الأحدث أولاً</small>
        </div>
        <table className="orders-table">
          <thead>
            <tr>
              <th className="cell-center">الطلب</th>
              <th>الصيدلية</th>
              <th>التاريخ</th>
              <th className="cell-center">الفواتير</th>
              <th>الإجمالي</th>
              <th className="cell-center">الحالة</th>
              <th>حالة كل فاتورة</th>
              <th className="cell-center" />
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <OrderRow key={order.id} order={order} onOpen={() => navigate(`/orders/${order.id}`)} />
            ))}
          </tbody>
        </table>
        {!isLoading && total === 0 && (
          <div className="ds-empty">
            <span>
              <Icon name={hasFilter ? 'search' : 'orders'} />
            </span>
            <b>{hasFilter ? 'لا توجد طلبات مطابقة' : 'لا توجد طلبات'}</b>
            <p>{hasFilter ? 'لا توجد نتائج لهذا البحث.' : 'تظهر الطلبات هنا بعد إرسالها من تطبيق الصيدلية.'}</p>
          </div>
        )}
        <Pagination
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={setPage}
          onPageSizeChange={(next) => {
            setPageSize(next);
            setPage(1);
          }}
        />
      </div>
    </CatalogPage>
  );
}

function OrderRow({ order, onOpen }: { readonly order: OrderRecord; readonly onOpen: () => void }): ReactElement {
  const [label, tone] = orderStatusLabel(order.status);
  return (
    <tr>
      <td className="cell-center">
        <strong>#{order.id}</strong>
      </td>
      <td>
        <b>{order.pharmacyName}</b>
        <small>معرّف {order.pharmacyId}</small>
      </td>
      <td>{formatDateTime(order.createdAt)}</td>
      <td className="numeric-cell cell-center">{order.invoiceCount}</td>
      <td className="separate-totals">
        {order.totals.length === 0 ? '—' : order.totals.map((total) => <b key={total.currency}>{formatMoney(total.amount, total.currency)}</b>)}
      </td>
      <td className="cell-center">
        <Badge tone={tone}>{label}</Badge>
      </td>
      <td>
        <div className="invoice-states">
          {order.invoices.map((invoice) => {
            const [invoiceLabel] = invoiceStatusLabel(invoice.status);
            return (
              <span key={invoice.id}>
                {categoryLabel(invoice.category)} · {invoiceLabel}
              </span>
            );
          })}
        </div>
      </td>
      <td className="cell-center">
        <button type="button" className="icon-action" aria-label="فتح الطلب" onClick={onOpen}>
          <Icon name="arrow" />
        </button>
      </td>
    </tr>
  );
}

function Filter({
  label,
  value,
  options,
  onChange,
}: {
  readonly label: string;
  readonly value: string;
  readonly options: readonly (readonly [string, string])[];
  readonly onChange: (value: string) => void;
}): ReactElement {
  return (
    <label className="ds-filter">
      <small>{label}</small>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
      <Icon name="chevron" size={14} />
    </label>
  );
}
