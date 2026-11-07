import { useEffect, useState, type ReactElement } from 'react';
import { Link } from 'react-router-dom';
import type { OrderRecord, PageResult } from '@/api/api-types';
import { listNotifications, searchOrders } from '@/api/admin-api-client';
import { DetailParts } from '@/components/detail-parts';
import { Icon } from '@/components/icon';
import { formatDate } from '@/format/format-value';

interface HomeSnapshot {
  readonly reviewCount: number;
  readonly unreadCount: number;
  readonly nextOrder: OrderRecord | null;
}

/**
 * Signed-in landing that uses live notification and order counts, without invented metrics.
 */
export function HomePage(): ReactElement {
  const [snapshot, setSnapshot] = useState<HomeSnapshot>({ reviewCount: 0, unreadCount: 0, nextOrder: null });
  useEffect(() => {
    const emptyPage: PageResult<OrderRecord> = { items: [], total: 0, limit: 1, offset: 0 };
    void Promise.all([
      searchOrders({ status: 'PENDING', limit: 1, offset: 0 }).catch(() => emptyPage),
      searchOrders({ status: 'PARTIALLY_APPROVED', limit: 1, offset: 0 }).catch(() => emptyPage),
      searchOrders({ limit: 1, offset: 0 }).catch(() => emptyPage),
      listNotifications().catch(() => []),
    ]).then(([pending, partial, newest, notifications]) => {
      setSnapshot({
        reviewCount: pending.total + partial.total,
        unreadCount: notifications.filter((notification) => notification.readAt === null).length,
        nextOrder: newest.items[0] ?? null,
      });
    });
  }, []);
  return (
    <>
      <header className="catalog-header">
        <div>
          <small>مساحة العمل / الرئيسية</small>
          <h4>الرئيسية</h4>
          <p>ما يحتاج انتباه المسؤول الآن.</p>
        </div>
      </header>
      <div className="shell-welcome">
        <div>
          <span>{formatDate(new Date())}</span>
          <h5>{readGreeting()}</h5>
          <p>
            لديك <b>{snapshot.reviewCount === 1 ? 'طلب واحد' : `${snapshot.reviewCount} طلبات`}</b> بانتظار المراجعة و
            <b> {snapshot.unreadCount} إشعارات</b> غير مقروءة.
          </p>
        </div>
        <div className="next-task">
          <span>التالي في قائمة العمل</span>
          {snapshot.nextOrder ? (
            <>
              <b>#{snapshot.nextOrder.id}</b>
              <small>
                <DetailParts>
                  <span>{snapshot.nextOrder.pharmacyName}</span>
                  <span>{invoiceCountLabel(snapshot.nextOrder.invoiceCount)}</span>
                </DetailParts>
              </small>
              <Link to={`/orders/${snapshot.nextOrder.id}`}>
                فتح الطلب <Icon name="arrow" size={14} />
              </Link>
            </>
          ) : (
            <>
              <b>المنتجات</b>
              <small>لا توجد طلبات حتى الآن</small>
              <Link to="/products/new">
                إضافة منتج <Icon name="arrow" size={14} />
              </Link>
            </>
          )}
        </div>
      </div>
      <div className="shell-hint">
        <span>
          <Icon name="products" /> الكتالوج
        </span>
        <p>راجع الطلبات والحسابات والتقارير من القائمة.</p>
      </div>
    </>
  );
}

function invoiceCountLabel(count: number): string {
  if (count === 1) {
    return 'فاتورة واحدة';
  }
  return `${count} فواتير`;
}

function readGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) {
    return 'صباح الخير';
  }
  return 'مساء الخير';
}
