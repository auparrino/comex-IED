import { useNavigate, topSection } from '../router';

// 2 tabs: cada sección es autosuficiente con sub-tabs internas (Mapa / Resumen / Productos | Mapa / Inversores / RIGI / Sectores).
export default function BottomNav({ segments }) {
  const navigate = useNavigate();
  const top = topSection(segments);

  const items = [
    { key: 'trade', label: 'Comercio', icon: '🌐', path: '/trade', active: top === 'trade' },
    { key: 'fdi',   label: 'IED',      icon: '📊', path: '/fdi',   active: top === 'fdi' },
  ];

  return (
    <nav className="m-nav" aria-label="Navegación principal">
      {items.map(it => (
        <button
          key={it.key}
          className="m-nav__item"
          aria-current={it.active ? 'page' : undefined}
          onClick={() => navigate(it.path)}
        >
          <span className="m-nav__icon" aria-hidden>{it.icon}</span>
          <span>{it.label}</span>
        </button>
      ))}
    </nav>
  );
}
