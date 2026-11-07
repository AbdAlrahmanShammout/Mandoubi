import { useState, type ReactElement } from 'react';
import { Link } from 'react-router-dom';
import { getProductReport } from '@/api/admin-api-client';
import { describeAdminError } from '@/api/admin-api-error';
import type { SellerTotal, WarehouseQuantity } from '@/api/api-types';
import { PageBanner, useLoad } from '@/catalog/page-state';
import { defaultPeriodDates, readReportPeriod, type ReportPeriodInput } from '@/reports/report-period';
import { ReportPeriodForm, ReportSection } from '@/reports/report-section';
import { CatalogPage } from '@/shell/catalog-page';

/**
 * Seller ranks for a period and the current stock in every warehouse.
 * Calls the admin reports controller.
 */
export function ProductReportPage(): ReactElement {
  const defaults = defaultPeriodDates();
  const [from, setFrom] = useState(defaults.from);
  const [to, setTo] = useState(defaults.to);
  const [formError, setFormError] = useState('');
  const [period, setPeriod] = useState<ReportPeriodInput | null>(() => readReportPeriod(defaults.from, defaults.to));
  const { data, errorMessage, isLoading, reload } = useLoad(period ? `products-${period.from}-${period.to}` : 'products-invalid', () => (period ? getProductReport(period.from, period.to) : Promise.reject(new Error('invalid'))), describeAdminError);
  const apply = (): void => {
    const next = readReportPeriod(from, to);
    if (!next) {
      setFormError('تاريخ البداية يجب أن يكون قبل تاريخ النهاية أو مساوياً له.');
      return;
    }
    setFormError('');
    setPeriod(next);
  };
  return (
    <CatalogPage crumb="التقارير / المنتجات" title="المنتجات والمخزون" description="ترتيب البيع من الفترة. الكميات هي المتاح الآن في كل مستودع." actionLabel="كل التقارير" actionTo="/reports">
      <ReportPeriodForm from={from} to={to} errorMessage={formError} onFromChange={setFrom} onToChange={setTo} onSubmit={apply} />
      <PageBanner message={period ? errorMessage : ''} onRetry={reload} />
      {isLoading && !data && (
        <div className="ds-empty">
          <b>جارٍ التحميل</b>
        </div>
      )}
      {data && (
        <>
          <SellerTable title="الأكثر مبيعاً" sellers={data.bestSellers} />
          <SellerTable title="الأقل مبيعاً" sellers={data.slowestSellers} />
          <StockTable title="كمية منخفضة" rows={data.lowQuantity} emptyLabel="لا يوجد منتج بكمية منخفضة." />
          <StockTable title="غير متاح" rows={data.unavailable} emptyLabel="لا يوجد منتج غير متاح." />
          <StockTable title="الكميات حسب المستودع" rows={data.quantitiesByWarehouse} emptyLabel="لا توجد كميات مربوطة بمستودع." />
        </>
      )}
    </CatalogPage>
  );
}

function SellerTable({ title, sellers }: { readonly title: string; readonly sellers: readonly SellerTotal[] }): ReactElement {
  return (
    <ReportSection title={title} isEmpty={sellers.length === 0} emptyLabel="لا مبيعات مدفوعة في هذه الفترة.">
      <thead>
        <tr>
          <th>المنتج</th>
          <th>العملة</th>
          <th>الكمية المدفوعة</th>
        </tr>
      </thead>
      <tbody>
        {sellers.map((seller) => (
          <tr key={`${seller.productId}-${seller.currency}`}>
            <td>
              <Link to={`/products/${seller.productId}`}>{seller.productName}</Link>
            </td>
            <td>{currencyLabel(seller.currency)}</td>
            <td>{seller.paidQuantity}</td>
          </tr>
        ))}
      </tbody>
    </ReportSection>
  );
}

function currencyLabel(currency: SellerTotal['currency']): string {
  return currency === 'USD' ? 'USD' : 'ل.س';
}

function StockTable({ title, rows, emptyLabel }: { readonly title: string; readonly rows: readonly WarehouseQuantity[]; readonly emptyLabel: string }): ReactElement {
  return (
    <ReportSection title={title} isEmpty={rows.length === 0} emptyLabel={emptyLabel}>
      <thead>
        <tr>
          <th>المستودع</th>
          <th>المنتج</th>
          <th>الكمية</th>
          <th>المحجوز</th>
          <th>المتاح</th>
          <th>حد الانخفاض</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={`${row.warehouseId}-${row.productId}`}>
            <td>{row.warehouseName}</td>
            <td>
              <Link to={`/products/${row.productId}`}>{row.productName}</Link>
            </td>
            <td>{row.quantity}</td>
            <td>{row.reservedQuantity}</td>
            <td>{row.availableQuantity}</td>
            <td>{row.lowQuantityThreshold}</td>
          </tr>
        ))}
      </tbody>
    </ReportSection>
  );
}
