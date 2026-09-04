import { StrictMode, Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { applyViewMode, useMobileBreakpoint } from './mobile/hooks/useMobileBreakpoint';
import './index.css';

const MobileApp = lazy(() => import('./mobile/MobileApp'));

function Root() {
  const isMobile = useMobileBreakpoint();
  return isMobile ? (
    <Suspense fallback={<div style={{ padding: 24, fontFamily: 'Inter, sans-serif' }}>Cargando…</div>}>
      <MobileApp />
    </Suspense>
  ) : (
    <App />
  );
}

applyViewMode();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Root />
  </StrictMode>
);
