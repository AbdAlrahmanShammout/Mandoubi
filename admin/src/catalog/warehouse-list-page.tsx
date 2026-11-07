import { useMemo, useState, type ReactElement } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { listWarehouses } from '@/api/admin-api-client';
import { describeAdminError } from '@/api/admin-api-error';
import { Pagination, ServerSearch, slicePage } from '@/catalog/list-controls';
import { PageBanner, useLoad } from '@/catalog/page-state';
import { Icon } from '@/components/icon';
import { CatalogPage } from '@/shell/catalog-page';

/**
 * Warehouse list with name search.
 */
export function WarehouseListPage(): ReactElement {
  const navigate = useNavigate();
  const { data, errorMessage, isLoading, reload } = useLoad('warehouses', listWarehouses, describeAdminError);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const filtered = useMemo(() => {
    const needle = query.trim();
    return (data ?? []).filter((warehouse) => needle.length === 0 || warehouse.name.includes(needle)).sort((left, right) => left.name.localeCompare(right.name, 'ar'));
  }, [data, query]);
  const visible = slicePage(filtered, page, pageSize);
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
              <th />
            </tr>
          </thead>
          <tbody>
            {visible.map((warehouse) => (
              <tr key={warehouse.id}>
                <td>
                  <b>{warehouse.name}</b>
                </td>
                <td>{warehouse.address}</td>
                <td>
                  <button type="button" className="icon-action" aria-label="فتح المستودع" onClick={() => navigate(`/warehouses/${warehouse.id}`)}>
                    <Icon name="arrow" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!isLoading && filtered.length === 0 && (
          <div className="ds-empty">
            <span>
              <Icon name="warehouse" />
            </span>
            <b>{data && data.length > 0 ? 'لا توجد مستودعات مطابقة' : 'لا توجد مستودعات'}</b>
            <p>{data && data.length > 0 ? 'جرّب اسماً مختلفاً.' : 'أضف أول مستودع قبل إنشاء المنتجات.'}</p>
            {data && data.length === 0 && (
              <Link className="ds-btn ds-secondary" to="/warehouses/new">
                إضافة مستودع
              </Link>
            )}
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
