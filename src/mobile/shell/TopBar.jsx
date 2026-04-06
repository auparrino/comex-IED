import { useState } from 'react';
import { useReporter, REPORTER_META } from '../context/ReporterContext';
import { forceDesktop } from '../hooks/useMobileBreakpoint';
import BottomSheet from './BottomSheet';

export default function TopBar({ title, onBack }) {
  const { reporter, setReporter } = useReporter();
  const [open, setOpen] = useState(false);
  const meta = REPORTER_META[reporter];

  return (
    <>
      <header className="m-topbar">
        {onBack && (
          <button className="m-topbar__back" onClick={onBack} aria-label="Atrás">‹</button>
        )}
        <div className="m-topbar__title">{title}</div>
        <button className="m-reporter-pill" onClick={() => setOpen(true)} aria-label="Cambiar país">
          <span className="m-reporter-pill__flag">{meta.flag}</span>
          <span>{meta.iso3}</span>
          <span className="m-reporter-pill__chev">▾</span>
        </button>
      </header>
      <BottomSheet open={open} title="Seleccionar país" onClose={() => setOpen(false)}>
        <div className="m-list" style={{ padding: 0 }}>
          {Object.entries(REPORTER_META).map(([key, m]) => (
            <button
              key={key}
              className="m-row"
              onClick={() => { setReporter(key); setOpen(false); }}
              aria-pressed={key === reporter}
              style={key === reporter ? { borderColor: 'var(--dark-blue)' } : undefined}
            >
              <span style={{ fontSize: 26, lineHeight: 1 }}>{m.flag}</span>
              <div className="m-row__main">
                <div className="m-row__title">{m.name}</div>
                <div className="m-row__sub">{m.iso3}</div>
              </div>
              {key === reporter && <span style={{ color: 'var(--red)', fontSize: 18 }}>●</span>}
            </button>
          ))}
        </div>
        <div style={{ marginTop: 18, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
          <button
            className="m-row"
            style={{ justifyContent: 'space-between', background: 'transparent' }}
            onClick={() => forceDesktop(true)}
          >
            <div className="m-row__main">
              <div className="m-row__title">Ver versión desktop</div>
              <div className="m-row__sub">La página recarga</div>
            </div>
            <span className="m-muted">›</span>
          </button>
        </div>
      </BottomSheet>
    </>
  );
}
