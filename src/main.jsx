import { StrictMode, Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { shouldRenderMobile } from './mobile/hooks/useMobileBreakpoint';
import './index.css';

const MobileApp = lazy(() => import('./mobile/MobileApp'));

const isMobile = shouldRenderMobile();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {isMobile ? (
      <Suspense fallback={<div style={{ padding: 24, fontFamily: 'Inter, sans-serif' }}>Cargando…</div>}>
        <MobileApp />
      </Suspense>
    ) : (
      <App />
    )}
  </StrictMode>
);
