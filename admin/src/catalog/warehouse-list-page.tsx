import { useDeferredValue, useState, type ReactElement } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { searchWarehouses } from '@/api/admin-api-client';
import { describeAdminError } from '@/api/admin-api-error';
import { Pagination, ServerSearch } from '@/catalog/list-controls';
import { PageBanner, useLoad } from '@/catalog/page-state';
import { Icon } from '@/components/icon';
import { CatalogPage } from '@/shell/catalog-page';

/**
 * Warehouse list searched and paged by the server.
 */
export function WarehouseListPage(): ReactElement {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const search = useDeferredValue(query).trim();
  const offset = (page - 1) * pageSize;
  const { data, errorMessage, isLoading, reload } = useLoad(
    `warehouses-${search}-${offset}-${pageSize}`,
    () => searchWarehouses({ search, limit: pageSize, offset }),
    describeAdminError,
  );
  const warehouses = data?.items ?? [];
  const total = data?.total ?? 0;
  const hasFilter = search.length > 0;
  return (
    <CatalogPage crumb="الكتالوج / المستودعات" title="المستودعات" description="إدارة مواقع التخزين وعناوينها." actionLabel="إضافة مستودع" actionTo="/warehouses/new">
      <PageBanner message={errorMessage} onRetry={reload} />
      <div className="catalog-tools single-search">
        <ServerSearch
          label="بحث المستودعات"
          placeholder="اسم المستودع"
          value={query}
          onChange={(value) => {
            setQuery(value);
            setPage(1);
          }}
        />
      </div>
      <div className="catalog-table-card simple-list-card">
        <table className="orders-table">
          <thead>
            <tr>
              <th>اسم المستودع</th>
              <th>العنوان</th>
              <th className="cell-center" />
            </tr>
          </thead>
          <tbody>
            {warehouses.map((warehouse) => (
              <tr key={warehouse.id}>
                <td>
                  <b>{warehouse.name}</b>
                </td>
                <td>{warehouse.address}</td>
                <td className="cell-center">
                  <button type="button" className="icon-action" aria-label="فتح المستودع" onClick={() => navigate(`/warehouses/${warehouse.id}`)}>
                    <Icon name="arrow" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!isLoading && total === 0 && (
          <div className="ds-empty">
            <span>
              <Icon name="warehouse" />
            </span>
            <b>{hasFilter ? 'لا توجد مستودعات مطابقة' : 'لا توجد مستودعات'}</b>
            <p>{hasFilter ? 'لا توجد نتائج لهذا البحث.' : 'أضف أول مستودع قبل إنشاء المنتجات.'}</p>
            {!hasFilter && (
              <Link className="ds-btn ds-secondary" to="/warehouses/new">
                إضافة مستودع
              </Link>
            )}
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
