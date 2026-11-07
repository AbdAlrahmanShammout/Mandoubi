import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AppRoutes } from '@/app';
import { AuthProvider } from '@/auth/auth-provider';
import { ConfirmProvider } from '@/components/confirm-dialog';
import '@/styles/design.css';
import '@/styles/app.css';

const root = document.getElementById('root');
if (!root) {
  throw new Error('The application root is missing');
}
createRoot(root).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ConfirmProvider>
          <AppRoutes />
        </ConfirmProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
