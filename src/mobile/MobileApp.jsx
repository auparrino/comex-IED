import { Suspense, lazy, useEffect } from 'react';
import { useRoute, useNavigate } from './router';
import { ReporterProvider } from './context/ReporterContext';
import TopBar from './shell/TopBar';
import BottomNav from './shell/BottomNav';
import './mobile.css';

// 2 lazy section roots — each owns its sub-tabs internally.
const TradeHomeScreen   = lazy(() => import('./screens/TradeHomeScreen'));
const FdiHomeScreen     = lazy(() => import('./screens/FdiHomeScreen'));
const TradeCountrySheet = lazy(() => import('./screens/TradeCountrySheet'));

function Fallback() {
  return <div className="m-loading">Cargando…</div>;
}

// Map URL → { title, node, overlay? }
function renderScreen(segments) {
  const [a, b, c] = segments;

  if (a === 'fdi') {
    if (b === 'inversores') return { title: 'IED', node: <FdiHomeScreen key="fdi-inv"     initialTab="inversores" /> };
    if (b === 'projects')   return { title: 'IED', node: <FdiHomeScreen key="fdi-rigi"    initialTab="rigi" /> };
    if (b === 'sectors')    return { title: 'IED', node: <FdiHomeScreen key="fdi-sectors" initialTab="sectors" /> };
    return { title: 'IED', node: <FdiHomeScreen key="fdi-mapa" initialTab="mapa" /> };
  }

  // Trade
  if (b === 'country' && c) {
    return {
      title: 'Comercio',
      node: <TradeHomeScreen key="trade-mapa" initialTab="mapa" />,
      overlay: { type: 'country', name: decodeURIComponent(c) },
    };
  }
  if (b === 'resumen')  return { title: 'Comercio', node: <TradeHomeScreen key="trade-resumen"   initialTab="resumen" /> };
  if (b === 'products') return { title: 'Comercio', node: <TradeHomeScreen key="trade-products"  initialTab="productos" /> };
  return { title: 'Comercio', node: <TradeHomeScreen key="trade-mapa" initialTab="mapa" /> };
}

export default function MobileApp() {
  const route = useRoute();
  const navigate = useNavigate();

  useEffect(() => {
    document.documentElement.dataset.mobile = '1';
    return () => { delete document.documentElement.dataset.mobile; };
  }, []);

  const { title, node, overlay } = renderScreen(route.segments);

  // Tag <html> with the active section so themed CSS can pick the right accent
  useEffect(() => {
    document.documentElement.dataset.section = route.segments[0] === 'fdi' ? 'fdi' : 'trade';
  }, [route.segments]);

  const closeOverlay = () => navigate('/trade');

  return (
    <ReporterProvider>
      <div className="m-app">
        <TopBar title={title} />
        <div className="m-view">
          <Suspense fallback={<Fallback />}>{node}</Suspense>
        </div>
        <BottomNav segments={route.segments} />
        {overlay?.type === 'country' && (
          <Suspense fallback={null}>
            <TradeCountrySheet countryName={overlay.name} onClose={closeOverlay} />
          </Suspense>
        )}
      </div>
    </ReporterProvider>
  );
}
