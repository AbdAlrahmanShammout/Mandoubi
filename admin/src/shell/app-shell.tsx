import { useEffect, useState, type ReactElement, type ReactNode } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { listNotifications } from '@/api/admin-api-client';
import { useAdmin } from '@/auth/auth-provider';
import { Brand } from '@/components/brand';
import { useConfirm } from '@/components/confirm-dialog';
import { Icon } from '@/components/icon';

interface NavItem {
  readonly icon: string;
  readonly label: string;
  readonly to: string;
}

const NAV_ITEMS: readonly NavItem[] = [
  { icon: 'home', label: 'الرئيسية', to: '/' },
  { icon: 'orders', label: 'الطلبات', to: '/orders' },
  { icon: 'products', label: 'المنتجات', to: '/products' },
  { icon: 'warehouse', label: 'المستودعات', to: '/warehouses' },
  { icon: 'factory', label: 'الشركات المصنعة', to: '/manufacturers' },
  { icon: 'accounts', label: 'الحسابات', to: '/accounts' },
  { icon: 'reports', label: 'التقارير', to: '/reports' },
  { icon: 'bell', label: 'الإشعارات', to: '/notifications' },
  { icon: 'settings', label: 'الإعدادات', to: '/settings/exchange-rate' },
];

/**
 * Persistent operations-direction frame: navigation, current administrator, and sign-out.
 */
export function AppShell({ children }: { readonly children: ReactNode }): ReactElement {
  const { admin, signOut } = useAdmin();
  const confirm = useConfirm();
  const navigate = useNavigate();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);
  useEffect(() => {
    void listNotifications()
      .then((notifications) => setUnreadCount(notifications.filter((notification) => notification.readAt === null).length))
      .catch(() => setUnreadCount(0));
  }, []);
  const signOutAdmin = (): void => {
    void confirm({
      title: 'تسجيل الخروج من لوحة الإدارة؟',
      body: 'ستنتهي الجلسة الحالية، ولن يعيد زر الرجوع فتح لوحة الإدارة.',
      confirmLabel: 'تأكيد تسجيل الخروج',
      danger: true,
    }).then(async (accepted) => {
      if (!accepted) {
        return;
      }
      await signOut();
      window.history.replaceState(null, '', '/sign-in');
      navigate('/sign-in', { replace: true });
    });
  };
  return (
    <div className="admin-app" dir="rtl">
      <div className="shell shell-ops">
        <aside className="side-nav side-ops">
          <Brand />
          <nav>
            {NAV_ITEMS.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.to === '/'} className={({ isActive }) => (isActive || isNavActive(item.to, location.pathname) ? 'active' : '')}>
                <Icon name={item.icon} />
                <em>{item.label}</em>
                {item.to === '/notifications' && unreadCount > 0 && <b>{unreadCount}</b>}
              </NavLink>
            ))}
          </nav>
          <div className="admin-chip">
            <span className="avatar">
              <Icon name="user" />
            </span>
            <span>
              <b>{admin?.mobileNumber}</b>
              <small>مدير</small>
            </span>
            <Icon name="chevron" size={14} />
          </div>
          <button type="button" className="signout" onClick={signOutAdmin}>
            تسجيل الخروج
          </button>
        </aside>
        <main className="shell-main catalog-page">{children}</main>
      </div>
    </div>
  );
}

function isNavActive(path: string, pathname: string): boolean {
  return path.startsWith('/settings') && pathname.startsWith('/settings');
}
