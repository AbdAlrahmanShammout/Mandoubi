import { useMemo, useState, type ReactElement } from 'react';
import { useNavigate } from 'react-router-dom';
import { listOrders } from '@/api/admin-api-client';
import { describeAdminError } from '@/api/admin-api-error';
import type { OrderRecord } from '@/api/api-types';
import { Pagination, ServerSearch, slicePage } from '@/catalog/list-controls';
import { PageBanner, useLoad } from '@/catalog/page-state';
import { Badge } from '@/components/badge';
import { Icon } from '@/components/icon';
import { formatDateTime } from '@/format/format-value';
import { categoryLabel } from '@/catalog/catalog-labels';
import { formatMoney, invoiceStatusLabel, orderStatusLabel } from '@/orders/order-labels';
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
 * Submitted pharmacy orders, filtered from the loaded list and opened one at a time.
 */
export function OrderListPage(): ReactElement {
  const navigate = useNavigate();
  const { data, errorMessage, isLoading, reload } = useLoad('orders', listOrders, describeAdminError);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('ALL');
  const [orderDate, setOrderDate] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const filtered = useMemo(() => {
    const needle = query.trim();
    return [...(data ?? [])]
      .filter((order) => status === 'ALL' || order.status === status)
      .filter((order) => orderDate.length === 0 || toLocalDateKey(order.createdAt) === orderDate)
      .filter((order) => needle.length === 0 || String(order.id).includes(needle) || order.pharmacyName.includes(needle))
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }, [data, orderDate, query, status]);
  const visible = slicePage(filtered, page, pageSize);
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
          <span>{filtered.length} طلباً</span>
          <small>الأحدث أولاً من القائمة المحمّلة</small>
        </div>
        <table className="orders-table">
          <thead>
            <tr>
              <th>الطلب</th>
              <th>الصيدلية</th>
              <th>التاريخ</th>
              <th>الفواتير</th>
              <th>الإجمالي</th>
              <th>الحالة</th>
              <th>حالة كل فاتورة</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {visible.map((order) => (
              <OrderRow key={order.id} order={order} onOpen={() => navigate(`/orders/${order.id}`)} />
            ))}
          </tbody>
        </table>
        {!isLoading && filtered.length === 0 && (
          <div className="ds-empty">
            <span>
              <Icon name={data && data.length > 0 ? 'search' : 'orders'} />
            </span>
            <b>{data && data.length > 0 ? 'لا توجد طلبات مطابقة' : 'لا توجد طلبات'}</b>
            <p>{data && data.length > 0 ? 'لم تُطابق القائمة المحمّلة هذا البحث.' : 'تظهر الطلبات هنا بعد إرسالها من تطبيق الصيدلية.'}</p>
          </div>
        )}
        <Pagination
          page={page}
          pageSize={pageSize}
          total={filtered.length}
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
      <td>
        <strong>#{order.id}</strong>
      </td>
      <td>
        <b>{order.pharmacyName}</b>
        <small>معرّف {order.pharmacyId}</small>
      </td>
      <td>{formatDateTime(order.createdAt)}</td>
      <td className="numeric-cell">{order.invoiceCount}</td>
      <td className="separate-totals">
        {order.totals.length === 0 ? '—' : order.totals.map((total) => <b key={total.currency}>{formatMoney(total.amount, total.currency)}</b>)}
      </td>
      <td>
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
      <td>
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

function toLocalDateKey(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  const pad = (part: number): string => String(part).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
