import type { ReactElement } from 'react';
import { Link } from 'react-router-dom';
import { CatalogPage } from '@/shell/catalog-page';

/**
 * Entry to the four read-only admin reports.
 */
export function ReportsPage(): ReactElement {
  return (
    <CatalogPage crumb="التقارير" title="التقارير" description="المبالغ تبقى بعملة الفاتورة ولا تُحوَّل بسعر الصرف الحالي.">
      <div className="report-hub">
        <ReportCard to="/reports/sales" title="المبيعات" hint="مجاميع الفترة، مع تصفية اختيارية للصيدلية والفئة." />
        <ReportCard to="/reports/products" title="المنتجات والمخزون" hint="الأكثر والأقل مبيعاً في الفترة، وكميات المستودعات الحالية." />
        <ReportCard to="/reports/debts" title="الديون" hint="الأرصدة والفواتير غير المحصّلة الآن، ودفعات الفترة." />
        <ReportCard to="/reports/drivers" title="السائقون" hint="عدد التسليمات والمبلغ الذي ما زال كل سائق يحتفظ به." />
      </div>
    </CatalogPage>
  );
}

function ReportCard({ to, title, hint }: { readonly to: string; readonly title: string; readonly hint: string }): ReactElement {
  return (
    <Link className="catalog-form-section" to={to}>
      <h5>{title}</h5>
      <p className="image-note">{hint}</p>
    </Link>
  );
}
