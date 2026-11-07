import { useEffect, useState, type ReactElement } from 'react';
import { Link } from 'react-router-dom';
import type { OrderRecord } from '@/api/api-types';
import { listNotifications, listOrders } from '@/api/admin-api-client';
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
    void Promise.all([listOrders().catch(() => [] as OrderRecord[]), listNotifications().catch(() => [])]).then(([orders, notifications]) => {
      const reviewOrders = orders.filter((order) => order.status === 'PENDING' || order.status === 'PARTIALLY_APPROVED');
      const newest = [...orders].sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0] ?? null;
      setSnapshot({
        reviewCount: reviewOrders.length,
        unreadCount: notifications.filter((notification) => notification.readAt === null).length,
        nextOrder: newest,
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
                {snapshot.nextOrder.pharmacyName} · {invoiceCountLabel(snapshot.nextOrder.invoiceCount)}
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
        <p>راجع الطلبات من القائمة. الحسابات والتقارير تُفتح عند اكتمالها.</p>
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
