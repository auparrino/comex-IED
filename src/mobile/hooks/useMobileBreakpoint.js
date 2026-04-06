import { useEffect, useState } from 'react';

const MOBILE_MAX = 1024;
const FORCE_KEY = 'comex-force-desktop';

export function shouldRenderMobile() {
  try {
    if (localStorage.getItem(FORCE_KEY) === '1') return false;
  } catch {}
  if (typeof window === 'undefined') return false;
  return window.matchMedia(`(max-width: ${MOBILE_MAX}px)`).matches;
}

export function forceDesktop(on) {
  try {
    if (on) localStorage.setItem(FORCE_KEY, '1');
    else localStorage.removeItem(FORCE_KEY);
  } catch {}
  window.location.reload();
}

export function useMobileBreakpoint() {
  const [isMobile, setIsMobile] = useState(shouldRenderMobile);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${MOBILE_MAX}px)`);
    const onChange = () => setIsMobile(shouldRenderMobile());
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return isMobile;
}
