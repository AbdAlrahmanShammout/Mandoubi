import type { ReactElement } from 'react';
import { Link } from 'react-router-dom';
import { getDriverReport } from '@/api/admin-api-client';
import { describeAdminError } from '@/api/admin-api-error';
import type { DriverReportHolding } from '@/api/api-types';
import { PageBanner, useLoad } from '@/catalog/page-state';
import { formatMoney } from '@/orders/order-labels';
import { ReportSection } from '@/reports/report-section';
import { CatalogPage } from '@/shell/catalog-page';

/**
 * Delivery counts and the money each driver still holds.
 * Calls the admin reports controller. This report has no period.
 */
export function DriverReportPage(): ReactElement {
  const { data, errorMessage, isLoading, reload } = useLoad('driver-report', getDriverReport, describeAdminError);
  return (
    <CatalogPage crumb="التقارير / السائقون" title="السائقون" description="نفس أعداد التسليم والمبالغ المحفوظة في تسوية السائق، لكل سائق يعيده التقرير." actionLabel="كل التقارير" actionTo="/reports">
      <PageBanner message={errorMessage} onRetry={reload} />
      {isLoading && !data && (
        <div className="ds-empty">
          <b>جارٍ التحميل</b>
        </div>
      )}
      {data && (
        <ReportSection title="موقف السائقين" isEmpty={data.length === 0} emptyLabel="لا سائقين في التقرير.">
          <thead>
            <tr>
              <th>السائق</th>
              <th>مسندة</th>
              <th>سُلّمت ومدفوعة</th>
              <th>سُلّمت وغير مدفوعة</th>
              <th>لم تُسلّم</th>
              <th>المبالغ</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.driverId}>
                <td>
                  <Link to={`/accounts/drivers/${row.driverId}`}>{row.driverName}</Link>
                </td>
                <td>{row.assignedCount}</td>
                <td>{row.deliveredPaidCount}</td>
                <td>{row.deliveredUnpaidCount}</td>
                <td>{row.notDeliveredCount}</td>
                <td>
                  <Holdings holdings={row.holdings} />
                </td>
              </tr>
            ))}
          </tbody>
        </ReportSection>
      )}
    </CatalogPage>
  );
}

function Holdings({ holdings }: { readonly holdings: readonly DriverReportHolding[] }): ReactElement {
  if (holdings.length === 0) {
    return <span>—</span>;
  }
  return (
    <div className="holding-cell">
      {holdings.map((holding) => (
        <span key={holding.currency}>
          <small>{holding.currency === 'USD' ? 'USD' : 'ل.س'}</small>
          <b>متبقٍ {formatMoney(holding.held, holding.currency)}</b>
          <small>
            حُصّل {holding.collected} · سُلّم {holding.handedOver}
          </small>
        </span>
      ))}
    </div>
  );
}
