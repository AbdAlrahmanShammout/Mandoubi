import { useState, type ReactElement } from 'react';
import { getSalesReport } from '@/api/admin-api-client';
import { describeAdminError } from '@/api/admin-api-error';
import type { ProductCategory, SalesReportQuery } from '@/api/api-types';
import { CATEGORY_OPTIONS } from '@/catalog/catalog-labels';
import { PageBanner, useLoad } from '@/catalog/page-state';
import { readInteger } from '@/format/format-value';
import { MoneyTotals, ReportPeriodForm } from '@/reports/report-section';
import { defaultPeriodDates, readReportPeriod, type ReportPeriodInput } from '@/reports/report-period';
import { CatalogPage } from '@/shell/catalog-page';

interface SalesFilters extends ReportPeriodInput {
  readonly pharmacyId?: number;
  readonly category?: ProductCategory;
}

/**
 * Delivered sales for a period, grouped by the currency stored on the invoice.
 * Calls the admin reports controller.
 */
export function SalesReportPage(): ReactElement {
  const defaults = defaultPeriodDates();
  const initialPeriod = readReportPeriod(defaults.from, defaults.to);
  const [from, setFrom] = useState(defaults.from);
  const [to, setTo] = useState(defaults.to);
  const [pharmacy, setPharmacy] = useState('');
  const [category, setCategory] = useState('');
  const [formError, setFormError] = useState('');
  const [filters, setFilters] = useState<SalesFilters | null>(initialPeriod);
  const { data, errorMessage, isLoading, reload } = useLoad(salesKey(filters), () => (filters ? getSalesReport(filters) : Promise.reject(new Error('invalid'))), describeAdminError);
  const apply = (): void => {
    const period = readReportPeriod(from, to);
    if (!period) {
      setFormError('تاريخ البداية يجب أن يكون قبل تاريخ النهاية أو مساوياً له.');
      return;
    }
    const pharmacyId = pharmacy.trim().length === 0 ? undefined : readInteger(pharmacy, 1);
    if (pharmacy.trim().length > 0 && pharmacyId === null) {
      setFormError('أدخل رقم صيدلية صحيحاً، أو اترك الحقل فارغاً لكل الصيدليات.');
      return;
    }
    setFormError('');
    setFilters({ ...period, pharmacyId: pharmacyId ?? undefined, ...(category ? { category: category as ProductCategory } : {}) });
  };
  return (
    <CatalogPage crumb="التقارير / المبيعات" title="المبيعات" description="مجاميع الفواتير المسلّمة في الفترة. كل عملة تبقى كما خُزّنت على الفاتورة." actionLabel="كل التقارير" actionTo="/reports">
      <ReportPeriodForm
        from={from}
        to={to}
        errorMessage={formError}
        onFromChange={setFrom}
        onToChange={setTo}
        onSubmit={apply}
        extra={
          <>
            <label className="field">
              معرّف الصيدلية
              <input value={pharmacy} inputMode="numeric" placeholder="اختياري" onChange={(event) => setPharmacy(event.target.value)} />
            </label>
            <label className="field">
              الفئة
              <select value={category} onChange={(event) => setCategory(event.target.value)}>
                <option value="">كل الفئات</option>
                {CATEGORY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </>
        }
      />
      <PageBanner message={filters ? errorMessage : ''} onRetry={reload} />
      {isLoading && !data && (
        <div className="ds-empty">
          <b>جارٍ التحميل</b>
        </div>
      )}
      {data && <MoneyTotals totals={data.totals} emptyLabel="لا مبيعات في هذه الفترة." />}
    </CatalogPage>
  );
}

function salesKey(filters: SalesReportQuery | null): string {
  if (!filters) {
    return 'sales-invalid';
  }
  return `sales-${filters.from}-${filters.to}-${filters.pharmacyId ?? 'all'}-${filters.category ?? 'all'}`;
}
