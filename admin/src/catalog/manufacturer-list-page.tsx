import { useMemo, useState, type ReactElement } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { listManufacturers, updateManufacturerStatus } from '@/api/admin-api-client';
import { describeAdminError } from '@/api/admin-api-error';
import type { ManufacturerRecord } from '@/api/api-types';
import { Pagination, ServerSearch, slicePage } from '@/catalog/list-controls';
import { PageBanner, useLoad } from '@/catalog/page-state';
import { Badge } from '@/components/badge';
import { useConfirm } from '@/components/confirm-dialog';
import { Icon } from '@/components/icon';
import { CatalogPage } from '@/shell/catalog-page';

/**
 * Manufacturer list with name search and status changes.
 */
export function ManufacturerListPage(): ReactElement {
  const navigate = useNavigate();
  const confirm = useConfirm();
  const { data, errorMessage, isLoading, reload } = useLoad('manufacturers', listManufacturers, describeAdminError);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('ALL');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [actionError, setActionError] = useState('');
  const filtered = useMemo(() => {
    const needle = query.trim();
    return (data ?? [])
      .filter((manufacturer) => status === 'ALL' || manufacturer.status === status)
      .filter((manufacturer) => needle.length === 0 || manufacturer.name.includes(needle))
      .sort((left, right) => left.name.localeCompare(right.name, 'ar'));
  }, [data, query, status]);
  const visible = slicePage(filtered, page, pageSize);
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
              <th>الحالة</th>
              <th>إجراء الحالة</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {visible.map((manufacturer) => (
              <tr key={manufacturer.id}>
                <td>
                  <b>{manufacturer.name}</b>
                </td>
                <td>
                  <Badge tone={manufacturer.status === 'ACTIVE' ? 'green' : 'neutral'}>{manufacturer.status === 'ACTIVE' ? 'فعّال' : 'متوقف'}</Badge>
                </td>
                <td>
                  <button type="button" className={`status-switch ${manufacturer.status === 'ACTIVE' ? '' : 'enable'}`} onClick={() => changeStatus(manufacturer)}>
                    {manufacturer.status === 'ACTIVE' ? 'إيقاف' : 'تفعيل'}
                  </button>
                </td>
                <td>
                  <button type="button" className="icon-action" aria-label="فتح الشركة" onClick={() => navigate(`/manufacturers/${manufacturer.id}`)}>
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
              <Icon name="search" />
            </span>
            <b>{data && data.length > 0 ? 'لا توجد شركات مطابقة' : 'لا توجد شركات مصنعة'}</b>
            <p>{data && data.length > 0 ? 'جرّب اسماً مختلفاً.' : 'أضف أول شركة ليصبح بالإمكان اختيارها في المنتج.'}</p>
            {data && data.length === 0 && (
              <Link className="ds-btn ds-secondary" to="/manufacturers/new">
                إضافة شركة
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
