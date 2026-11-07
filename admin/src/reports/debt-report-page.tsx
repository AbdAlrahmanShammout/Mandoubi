import { useState, type ReactElement } from 'react';
import { getDebtReport } from '@/api/admin-api-client';
import { describeAdminError } from '@/api/admin-api-error';
import { PageBanner, useLoad } from '@/catalog/page-state';
import { Badge } from '@/components/badge';
import { DetailParts } from '@/components/detail-parts';
import { formatDateTime } from '@/format/format-value';
import { formatMoney } from '@/orders/order-labels';
import { defaultPeriodDates, readReportPeriod, type ReportPeriodInput } from '@/reports/report-period';
import { MoneyTotals, PharmacyLink, ReportPeriodForm, ReportSection } from '@/reports/report-section';
import { CatalogPage } from '@/shell/catalog-page';

/**
 * Current pharmacy debt and the payments recorded inside the chosen period.
 * Calls the admin reports controller.
 */
export function DebtReportPage(): ReactElement {
  const defaults = defaultPeriodDates();
  const [from, setFrom] = useState(defaults.from);
  const [to, setTo] = useState(defaults.to);
  const [formError, setFormError] = useState('');
  const [period, setPeriod] = useState<ReportPeriodInput | null>(() => readReportPeriod(defaults.from, defaults.to));
  const { data, errorMessage, isLoading, reload } = useLoad(period ? `debts-${period.from}-${period.to}` : 'debts-invalid', () => (period ? getDebtReport(period.from, period.to) : Promise.reject(new Error('invalid'))), describeAdminError);
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
    <CatalogPage crumb="التقارير / الديون" title="الديون" description="الأرصدة والفواتير غير المحصّلة هي الوضع الحالي. الدفعات هي ما سُجّل داخل الفترة. تاريخ الاستحقاق هو وقت التسليم." actionLabel="كل التقارير" actionTo="/reports">
      <ReportPeriodForm from={from} to={to} errorMessage={formError} onFromChange={setFrom} onToChange={setTo} onSubmit={apply} />
      <PageBanner message={period ? errorMessage : ''} onRetry={reload} />
      {isLoading && !data && (
        <div className="ds-empty">
          <b>جارٍ التحميل</b>
        </div>
      )}
      {data && (
        <>
          <h5 className="report-group-title">إجمالي المستحق</h5>
          <MoneyTotals totals={data.totalDue} emptyLabel="لا يوجد مبلغ مستحق." />
          <h5 className="report-group-title">دفعات الفترة</h5>
          <MoneyTotals totals={data.paymentsInPeriod} emptyLabel="لا دفعات في هذه الفترة." />
          <ReportSection title="أرصدة الصيدليات" isEmpty={data.balances.length === 0} emptyLabel="لا أرصدة مفتوحة.">
            <thead>
              <tr>
                <th>الصيدلية</th>
                <th className="cell-center">العملة</th>
                <th>المتبقي</th>
              </tr>
            </thead>
            <tbody>
              {data.balances.map((balance) => (
                <tr key={`${balance.pharmacyId}-${balance.currency}`}>
                  <td>
                    <PharmacyLink pharmacyId={balance.pharmacyId} pharmacyName={balance.pharmacyName} />
                  </td>
                  <td className="cell-center">{balance.currency === 'USD' ? 'USD' : 'ل.س'}</td>
                  <td>{formatMoney(balance.outstanding, balance.currency)}</td>
                </tr>
              ))}
            </tbody>
          </ReportSection>
          <ReportSection title="فواتير سُلّمت ولم تُحصَّل" isEmpty={data.unpaidInvoices.length === 0} emptyLabel="لا فواتير مستحقة.">
            <thead>
              <tr>
                <th className="cell-center">الفاتورة</th>
                <th>الصيدلية</th>
                <th>المبلغ</th>
                <th>الاستحقاق</th>
              </tr>
            </thead>
            <tbody>
              {data.unpaidInvoices.map((invoice) => (
                <tr key={`${invoice.invoiceId}-${invoice.currency}`}>
                  <td className="cell-center">#{invoice.invoiceId}</td>
                  <td>
                    <PharmacyLink pharmacyId={invoice.pharmacyId} pharmacyName={invoice.pharmacyName} />
                  </td>
                  <td>{formatMoney(invoice.amount, invoice.currency)}</td>
                  <td>
                    <span>
                      <DetailParts>
                        <span>{formatDateTime(invoice.dueDate)}</span>
                        {invoice.overdue ? <Badge tone="red">متأخر</Badge> : null}
                      </DetailParts>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </ReportSection>
        </>
      )}
    </CatalogPage>
  );
}
