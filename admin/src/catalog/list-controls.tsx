import type { ReactElement } from 'react';
import { Icon } from '@/components/icon';

interface ServerSearchProps {
  readonly label: string;
  readonly placeholder: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
}

/**
 * Search field. The current API returns the full list, so the page filters that response.
 */
export function ServerSearch({ label, placeholder, value, onChange }: ServerSearchProps): ReactElement {
  return (
    <label className="orders-search catalog-search">
      <Icon name="search" />
      <span>
        <small>{label}</small>
        <input value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
      </span>
      <em>بحث من القائمة المحمّلة</em>
    </label>
  );
}

interface PaginationProps {
  readonly page: number;
  readonly pageSize: number;
  readonly total: number;
  readonly onPageChange: (page: number) => void;
  readonly onPageSizeChange: (pageSize: number) => void;
}

/**
 * Page controls for a loaded admin list. The server does not page these lists yet.
 */
export function Pagination({ page, pageSize, total, onPageChange, onPageSizeChange }: PaginationProps): ReactElement {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(total, page * pageSize);
  return (
    <div className="ds-pagination">
      <span>
        عرض {start}–{end} من {total} سجلاً
      </span>
      <label>
        حجم الصفحة
        <select value={String(pageSize)} onChange={(event) => onPageSizeChange(Number(event.target.value))}>
          <option value="20">20</option>
          <option value="40">40</option>
          <option value="100">100</option>
        </select>
      </label>
      <div>
        <button type="button" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          السابق
        </button>
        <b>{page}</b>
        <button type="button" disabled={page >= pageCount} onClick={() => onPageChange(page + 1)}>
          التالي
        </button>
      </div>
    </div>
  );
}

/**
 * Slices a filtered list for the current page.
 */
export function slicePage<T>(items: readonly T[], page: number, pageSize: number): readonly T[] {
  const start = (page - 1) * pageSize;
  return items.slice(start, start + pageSize);
}
