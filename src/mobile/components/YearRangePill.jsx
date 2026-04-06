import { useState } from 'react';
import { useReporter, resolveYearRange } from '../context/ReporterContext';
import BottomSheet from '../shell/BottomSheet';

export default function YearRangePill({ years }) {
  const { yearFrom, yearTo, setYearRange } = useReporter();
  const [open, setOpen] = useState(false);

  if (!years || years.length === 0) return null;
  const { from, to } = resolveYearRange(yearFrom, yearTo, years);
  const isFull = from === years[0] && to === years[years.length - 1];

  return (
    <>
      <button
        className="m-reporter-pill"
        style={{ height: 32, padding: '0 12px' }}
        onClick={() => setOpen(true)}
      >
        <span style={{ fontSize: 13 }}>📅</span>
        <span>{from === to ? from : `${from} – ${to}`}</span>
        <span className="m-reporter-pill__chev">▾</span>
      </button>

      <BottomSheet open={open} title="Periodo" onClose={() => setOpen(false)}>
        <div style={{ display: 'flex', gap: 12 }}>
          <YearColumn label="Desde" years={years} value={from} onPick={(y) => setYearRange(y, to)} />
          <YearColumn label="Hasta" years={years} value={to}   onPick={(y) => setYearRange(from, y)} />
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <button
            className="m-row"
            style={{ justifyContent: 'center', flex: 1 }}
            onClick={() => { setYearRange(years[0], years[years.length - 1]); }}
            disabled={isFull}
          >
            Todos los años
          </button>
          <button
            className="m-row"
            style={{ justifyContent: 'center', flex: 1, background: 'var(--dark-blue)', color: 'var(--bg)', borderColor: 'var(--dark-blue)' }}
            onClick={() => setOpen(false)}
          >
            Aplicar
          </button>
        </div>
      </BottomSheet>
    </>
  );
}

function YearColumn({ label, years, value, onPick }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <div className="m-section-title" style={{ padding: '0 0 6px' }}>{label}</div>
      <div
        style={{
          maxHeight: 280,
          overflowY: 'auto',
          border: '1px solid var(--border)',
          borderRadius: 8,
          background: 'var(--bg-card)',
        }}
      >
        {years.map((y) => (
          <button
            key={y}
            onClick={() => onPick(y)}
            style={{
              display: 'block',
              width: '100%',
              padding: '12px 14px',
              border: 'none',
              background: y === value ? 'var(--dark-blue)' : 'transparent',
              color: y === value ? 'var(--bg)' : 'var(--text)',
              fontSize: 15,
              fontWeight: y === value ? 700 : 500,
              textAlign: 'left',
              cursor: 'pointer',
              borderBottom: '1px solid var(--border)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {y}
          </button>
        ))}
      </div>
    </div>
  );
}
