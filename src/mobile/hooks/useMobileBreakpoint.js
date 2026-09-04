import { useEffect, useState } from 'react';

const MOBILE_MAX = 1024;
const MODE_KEY = 'comex-view-mode'; // 'mobile' | 'desktop' | ausente (auto)
const LEGACY_FORCE_KEY = 'comex-force-desktop';
// Ancho de layout que el teléfono simula cuando el usuario pide la versión
// desktop: alcanza para pasar los breakpoints de 1024px del CSS de escritorio.
const DESKTOP_VIEWPORT_WIDTH = 1180;

function readMode() {
  if (typeof window === 'undefined') return null;
  try {
    if (localStorage.getItem(LEGACY_FORCE_KEY) === '1') {
      localStorage.removeItem(LEGACY_FORCE_KEY);
      localStorage.setItem(MODE_KEY, 'desktop');
    }
    const mode = localStorage.getItem(MODE_KEY);
    return mode === 'mobile' || mode === 'desktop' ? mode : null;
  } catch {
    return null;
  }
}

// El ancho del dispositivo, no el del viewport: al forzar desktop el meta
// viewport cambia innerWidth, así que sólo screen.width sigue siendo estable.
function deviceIsNarrow() {
  const w = window.screen?.width || window.innerWidth;
  return w <= MOBILE_MAX;
}

export function shouldRenderMobile() {
  if (typeof window === 'undefined') return false;
  const mode = readMode();
  if (mode) return mode === 'mobile';
  return window.matchMedia(`(max-width: ${MOBILE_MAX}px)`).matches;
}

// Aplica el meta viewport y la marca en <html> según el modo elegido.
// Debe correr antes del primer render.
export function applyViewMode() {
  if (typeof document === 'undefined') return;
  const desktop = readMode() === 'desktop';
  const meta = document.querySelector('meta[name="viewport"]');
  if (meta) {
    meta.setAttribute(
      'content',
      desktop && deviceIsNarrow()
        ? `width=${DESKTOP_VIEWPORT_WIDTH}`
        : 'width=device-width, initial-scale=1.0'
    );
  }
  if (desktop) document.documentElement.setAttribute('data-view-mode', 'desktop');
  else document.documentElement.removeAttribute('data-view-mode');
}

// mode: 'mobile' | 'desktop' | null (volver a automático). Recarga la página.
export function setViewMode(mode) {
  try {
    if (mode === 'mobile' || mode === 'desktop') localStorage.setItem(MODE_KEY, mode);
    else localStorage.removeItem(MODE_KEY);
    localStorage.removeItem(LEGACY_FORCE_KEY);
  } catch {}
  applyViewMode();
  window.location.reload();
}

export function useMobileBreakpoint() {
  const [isMobile, setIsMobile] = useState(shouldRenderMobile);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${MOBILE_MAX}px)`);
    const onChange = () => setIsMobile(shouldRenderMobile());
    mq.addEventListener('change', onChange);
    window.addEventListener('storage', onChange);
    return () => {
      mq.removeEventListener('change', onChange);
      window.removeEventListener('storage', onChange);
    };
  }, []);
  return isMobile;
}
