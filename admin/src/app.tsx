import type { ReactElement } from 'react';
import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { RequireSession } from '@/auth/require-session';
import { SignInPage } from '@/auth/sign-in-page';
import { ExchangeRatePage } from '@/catalog/exchange-rate-page';
import { ManufacturerFormPage } from '@/catalog/manufacturer-form-page';
import { ManufacturerListPage } from '@/catalog/manufacturer-list-page';
import { ProductFormPage } from '@/catalog/product-form-page';
import { ProductListPage } from '@/catalog/product-list-page';
import { WarehouseFormPage } from '@/catalog/warehouse-form-page';
import { WarehouseListPage } from '@/catalog/warehouse-list-page';
import { AppShell } from '@/shell/app-shell';
import { HomePage } from '@/shell/home-page';
import { AccountsPage } from '@/accounts/accounts-page';
import { DriverSettlementPage } from '@/accounts/driver-settlement-page';
import { PharmacyStatementPage } from '@/accounts/pharmacy-statement-page';
import { OrderDetailPage } from '@/orders/order-detail-page';
import { OrderListPage } from '@/orders/order-list-page';
import { PlaceholderPage } from '@/shell/placeholder-page';

/**
 * Admin dashboard routes. Every authenticated call stays on the admin audience.
 */
export function AppRoutes(): ReactElement {
  return (
    <Routes>
      <Route path="/sign-in" element={<SignInPage />} />
      <Route element={<SignedInShell />}>
        <Route index element={<HomePage />} />
        <Route path="products" element={<ProductListPage />} />
        <Route path="products/new" element={<ProductFormPage />} />
        <Route path="products/:productId" element={<ProductFormPage />} />
        <Route path="warehouses" element={<WarehouseListPage />} />
        <Route path="warehouses/new" element={<WarehouseFormPage />} />
        <Route path="warehouses/:warehouseId" element={<WarehouseFormPage />} />
        <Route path="manufacturers" element={<ManufacturerListPage />} />
        <Route path="manufacturers/new" element={<ManufacturerFormPage />} />
        <Route path="manufacturers/:manufacturerId" element={<ManufacturerFormPage />} />
        <Route path="settings/exchange-rate" element={<ExchangeRatePage />} />
        <Route path="orders" element={<OrderListPage />} />
        <Route path="orders/:orderId" element={<OrderDetailPage />} />
        <Route path="orders/:orderId/invoices/:invoiceId" element={<OrderDetailPage />} />
        <Route path="accounts" element={<AccountsPage />} />
        <Route path="accounts/pharmacies/:pharmacyId" element={<PharmacyStatementPage />} />
        <Route path="accounts/drivers/:driverId" element={<DriverSettlementPage />} />
        <Route path="reports" element={<PlaceholderPage crumb="التقارير" title="التقارير" description="تقارير المبيعات والمخزون والديون والسائقين تُبنى لاحقاً." />} />
        <Route path="notifications" element={<PlaceholderPage crumb="الإشعارات" title="الإشعارات" description="صندوق إشعارات الإدارة يُبنى مع التقارير." />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

function SignedInShell(): ReactElement {
  return (
    <RequireSession>
      <AppShell>
        <Outlet />
      </AppShell>
    </RequireSession>
  );
}
