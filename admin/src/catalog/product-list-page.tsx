import { useMemo, useState, type ReactElement } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { listProducts } from '@/api/admin-api-client';
import { describeAdminError } from '@/api/admin-api-error';
import type { ProductAvailability, ProductCategory, ProductRecord, ProductStatus } from '@/api/api-types';
import { saleUnitLabel } from '@/catalog/catalog-labels';
import { Pagination, ServerSearch, slicePage } from '@/catalog/list-controls';
import { PageBanner, useLoad } from '@/catalog/page-state';
import { Badge } from '@/components/badge';
import { CategoryLabel } from '@/components/category-label';
import { Icon } from '@/components/icon';
import { CatalogPage } from '@/shell/catalog-page';

/**
 * Product list with search and category, availability, and status filters.
 */
export function ProductListPage(): ReactElement {
  const navigate = useNavigate();
  const { data, errorMessage, isLoading, reload } = useLoad('products', listProducts, describeAdminError);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('ALL');
  const [availability, setAvailability] = useState('ALL');
  const [status, setStatus] = useState('ALL');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const filtered = useMemo(() => {
    const needle = query.trim();
    return (data ?? [])
      .filter((product) => category === 'ALL' || product.category === category)
      .filter((product) => availability === 'ALL' || product.availability === availability)
      .filter((product) => status === 'ALL' || product.status === status)
      .filter((product) => needle.length === 0 || product.name.includes(needle) || product.barcode.includes(needle) || product.activeIngredient.includes(needle))
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }, [availability, category, data, query, status]);
  const visible = slicePage(filtered, page, pageSize);
  return (
    <CatalogPage crumb="الكتالوج / المنتجات" title="المنتجات" description="إدارة المنتجات والأسعار والمخزون في المستودعات." actionLabel="إضافة منتج" actionTo="/products/new">
      <PageBanner message={errorMessage} onRetry={reload} />
      <div className="catalog-tools">
        <ServerSearch
          label="بحث المنتجات"
          placeholder="الاسم أو الباركود أو المادة الفعالة"
          value={query}
          onChange={(value) => {
            setQuery(value);
            setPage(1);
          }}
        />
        <Filter label="الفئة" value={category} onChange={(value) => { setCategory(value); setPage(1); }} options={[['ALL', 'كل الفئات'], ['NATIONAL_MEDICINE', 'أدوية وطنية'], ['FOREIGN_MEDICINE', 'أدوية أجنبية'], ['ACCESSORY', 'إكسسوارات']]} />
        <Filter label="التوفر" value={availability} onChange={(value) => { setAvailability(value); setPage(1); }} options={[['ALL', 'الكل'], ['AVAILABLE', 'متوفر'], ['UNAVAILABLE', 'غير متوفر']]} />
        <Filter label="الحالة" value={status} onChange={(value) => { setStatus(value); setPage(1); }} options={[['ALL', 'الكل'], ['ACTIVE', 'فعّال'], ['DISABLED', 'متوقف']]} />
      </div>
      <div className="catalog-table-card">
        <div className="catalog-table-meta">
          <span>{filtered.length} منتجاً</span>
          <small>النتائج مرتبة بحسب آخر تعديل</small>
        </div>
        <table className="orders-table product-list-table">
          <thead>
            <tr>
              <th>الصورة</th>
              <th>المنتج</th>
              <th>الباركود</th>
              <th>الشركة المصنعة</th>
              <th>الفئة</th>
              <th>الوحدة</th>
              <th>التوفر</th>
              <th>الحالة</th>
              <th>عملة الفاتورة</th>
              <th>المستودع الأساسي</th>
              <th>المتاح</th>
              <th>العرض</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {visible.map((product) => (
              <ProductRow key={product.id} product={product} onOpen={() => navigate(`/products/${product.id}`)} />
            ))}
          </tbody>
        </table>
        {!isLoading && filtered.length === 0 && (
          <div className="ds-empty">
            <span>
              <Icon name={data && data.length > 0 ? 'search' : 'products'} />
            </span>
            <b>{data && data.length > 0 ? 'لا توجد منتجات مطابقة' : 'لا توجد منتجات'}</b>
            <p>{data && data.length > 0 ? 'لم تُطابق القائمة المحمّلة هذا البحث.' : 'أضف أول منتج بعد إنشاء شركة مصنّعة ومستودع.'}</p>
            {data && data.length === 0 && (
              <Link className="ds-btn ds-secondary" to="/products/new">
                إضافة منتج
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

function ProductRow({ product, onOpen }: { readonly product: ProductRecord; readonly onOpen: () => void }): ReactElement {
  const primary = product.stocks.find((stock) => stock.isPrimary);
  return (
    <tr>
      <td>
        <div className="table-thumbnail">{product.imageUrl ? <img src={product.imageUrl} alt="" /> : product.name.slice(0, 1)}</div>
      </td>
      <td>
        <b>{product.name}</b>
        <small>{product.activeIngredient}</small>
      </td>
      <td>
        <span className="barcode">{product.barcode}</span>
      </td>
      <td>{product.manufacturerName}</td>
      <td>
        <CategoryLabel kind={product.category as ProductCategory} compact />
      </td>
      <td>{saleUnitLabel(product.saleUnit)}</td>
      <td>
        <Badge tone={product.availability === 'AVAILABLE' ? 'green' : 'red'}>{availabilityLabel(product.availability)}</Badge>
      </td>
      <td>
        <Badge tone={product.status === 'ACTIVE' ? 'green' : 'neutral'}>{statusLabel(product.status)}</Badge>
      </td>
      <td>
        <b>{product.invoiceCurrency === 'SYP' ? 'ل.س' : 'USD'}</b>
      </td>
      <td>{primary?.warehouseName ?? '—'}</td>
      <td className="numeric-cell">
        <b>{primary?.availableQuantity ?? 0}</b>
      </td>
      <td>{product.offerActive ? <Badge tone="amber">عرض فعّال</Badge> : <span className="muted-dash">—</span>}</td>
      <td>
        <button type="button" className="icon-action" aria-label="فتح المنتج" onClick={onOpen}>
          <Icon name="arrow" />
        </button>
      </td>
    </tr>
  );
}

function Filter({ label, value, options, onChange }: { readonly label: string; readonly value: string; readonly options: readonly (readonly [string, string])[]; readonly onChange: (value: string) => void }): ReactElement {
  return (
    <label className="ds-filter">
      <small>{label}</small>
      <select
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
        }}
      >
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

function availabilityLabel(availability: ProductAvailability): string {
  return availability === 'AVAILABLE' ? 'متوفر' : 'غير متوفر';
}

function statusLabel(status: ProductStatus): string {
  return status === 'ACTIVE' ? 'فعّال' : 'متوقف';
}
