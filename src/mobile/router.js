// Mini hash router — 0 deps. Routes:
//   #/trade                  → Comercio (sub-tab: mapa)
//   #/trade/resumen          → Comercio (sub-tab: resumen)
//   #/trade/products         → Comercio (sub-tab: productos)
//   #/trade/country/:slug    → Detalle país (sheet sobre /trade)
//   #/fdi                    → IED (sub-tab: mapa)
//   #/fdi/inversores         → IED (sub-tab: inversores)
//   #/fdi/projects           → IED (sub-tab: rigi, solo arg)
//   #/fdi/sectors            → IED (sub-tab: sectores)
import { useEffect, useState, useCallback } from 'react';

const DEFAULT = '/trade';

function parseHash() {
  const h = window.location.hash.replace(/^#/, '') || DEFAULT;
  const [path, ...rest] = h.split('?');
  const segments = path.replace(/^\//, '').split('/').filter(Boolean);
  return { path, segments, query: rest.join('?') };
}

export function useRoute() {
  const [route, setRoute] = useState(parseHash);
  useEffect(() => {
    const onChange = () => setRoute(parseHash());
    window.addEventListener('hashchange', onChange);
    if (!window.location.hash) window.location.hash = DEFAULT;
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}

export function navigate(to) {
  if (!to.startsWith('/')) to = '/' + to;
  if (window.location.hash === '#' + to) return;
  window.location.hash = to;
}

export function useNavigate() {
  return useCallback(navigate, []);
}

// Top-level section from path, used by BottomNav
export function topSection(segments) {
  if (segments[0] === 'fdi') return 'fdi';
  return 'trade';
}
