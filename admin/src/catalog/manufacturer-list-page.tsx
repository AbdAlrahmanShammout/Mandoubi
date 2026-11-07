import { useDeferredValue, useState, type ReactElement } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { searchManufacturers, updateManufacturerStatus } from '@/api/admin-api-client';
import { describeAdminError } from '@/api/admin-api-error';
import type { ManufacturerRecord } from '@/api/api-types';
import { Pagination, ServerSearch } from '@/catalog/list-controls';
import { PageBanner, useLoad } from '@/catalog/page-state';
import { Badge } from '@/components/badge';
import { useConfirm } from '@/components/confirm-dialog';
import { Icon } from '@/components/icon';
import { CatalogPage } from '@/shell/catalog-page';

/**
 * Manufacturer list searched and paged by the server.
 */
export function ManufacturerListPage(): ReactElement {
  const navigate = useNavigate();
  const confirm = useConfirm();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('ALL');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [actionError, setActionError] = useState('');
  const search = useDeferredValue(query).trim();
  const offset = (page - 1) * pageSize;
  const { data, errorMessage, isLoading, reload } = useLoad(
    `manufacturers-${search}-${status}-${offset}-${pageSize}`,
    () => searchManufacturers({
      search,
      status: status === 'ALL' ? undefined : status as 'ACTIVE' | 'DISABLED',
      limit: pageSize,
      offset,
    }),
    describeAdminError,
  );
  const manufacturers = data?.items ?? [];
  const total = data?.total ?? 0;
  const hasFilter = search.length > 0 || status !== 'ALL';
  const changeStatus = (manufacturer: ManufacturerRecord): void => {
    const nextStatus = manufacturer.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';
    const isDisable = nextStatus === 'DISABLED';
    void confirm({
      title: isDisable ? 'تأكيد إيقاف الشركة؟' : 'تأكيد تفعيل الشركة؟',
      body: isDisable ? 'لن تعود متاحة عند إنشاء أو تعديل المنتجات. المنتجات الحالية لا تُحذف.' : 'ستعود الشركة متاحة للاختيار في المنتجات.',
      confirmLabel: isDisable ? 'تأكيد الإيقاف' : 'تأكيد التفعيل',
      danger: isDisable,
    }).then(async (accepted) => {
      if (!accepted) {
        return;
      }
      try {
        await updateManufacturerStatus(manufacturer.id, nextStatus);
        setActionError('');
        reload();
      } catch (error) {
        setActionError(describeAdminError(error));
      }
    });
  };
  return (
    <CatalogPage crumb="الكتالوج / الشركات المصنعة" title="الشركات المصنعة" description="الأسماء المتاحة لاختيارها في بيانات المنتجات." actionLabel="إضافة شركة" actionTo="/manufacturers/new">
      <PageBanner message={errorMessage || actionError} onRetry={reload} />
      <div className="catalog-tools manufacturer-tools">
        <ServerSearch
          label="بحث الشركات"
          placeholder="اسم الشركة المصنعة"
          value={query}
          onChange={(value) => {
            setQuery(value);
            setPage(1);
          }}
        />
        <label className="ds-filter">
          <small>الحالة</small>
          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
          >
            <option value="ALL">كل الحالات</option>
            <option value="ACTIVE">فعّال</option>
            <option value="DISABLED">متوقف</option>
          </select>
          <Icon name="chevron" size={14} />
        </label>
      </div>
      <div className="catalog-table-card simple-list-card">
        <table className="orders-table">
          <thead>
            <tr>
              <th>اسم الشركة المصنعة</th>
              <th className="cell-center">الحالة</th>
              <th className="cell-center">إجراء الحالة</th>
              <th className="cell-center" />
            </tr>
          </thead>
          <tbody>
            {manufacturers.map((manufacturer) => (
              <tr key={manufacturer.id}>
                <td>
                  <b>{manufacturer.name}</b>
                </td>
                <td className="cell-center">
                  <Badge tone={manufacturer.status === 'ACTIVE' ? 'green' : 'neutral'}>{manufacturer.status === 'ACTIVE' ? 'فعّال' : 'متوقف'}</Badge>
                </td>
                <td className="cell-center">
                  <button type="button" className={`status-switch ${manufacturer.status === 'ACTIVE' ? '' : 'enable'}`} onClick={() => changeStatus(manufacturer)}>
                    {manufacturer.status === 'ACTIVE' ? 'إيقاف' : 'تفعيل'}
                  </button>
                </td>
                <td className="cell-center">
                  <button type="button" className="icon-action" aria-label="فتح الشركة" onClick={() => navigate(`/manufacturers/${manufacturer.id}`)}>
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
              <Icon name="search" />
            </span>
            <b>{hasFilter ? 'لا توجد شركات مطابقة' : 'لا توجد شركات مصنعة'}</b>
            <p>{hasFilter ? 'لا توجد نتائج لهذا البحث.' : 'أضف أول شركة ليصبح بالإمكان اختيارها في المنتج.'}</p>
            {!hasFilter && (
              <Link className="ds-btn ds-secondary" to="/manufacturers/new">
                إضافة شركة
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
