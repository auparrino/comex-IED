import { useEffect, useMemo } from 'react';
import { useTradeData } from '../../hooks/useTradeData';
import { useReporter, resolveYearRange } from '../context/ReporterContext';
import { useNavigate } from '../router';
import MobileWorldMap from '../components/MobileWorldMap';
import YearRangePill from '../components/YearRangePill';
import { fmt } from '../../utils/format';

export default function TradeMapScreen() {
  const { reporter, yearFrom, yearTo } = useReporter();
  const data = useTradeData();
  const navigate = useNavigate();

  useEffect(() => {
    if (data.activeReporter !== reporter) data.setActiveReporter(reporter);
  }, [reporter, data]);

  const { from, to, list: selectedYears } = useMemo(
    () => resolveYearRange(yearFrom, yearTo, data.years),
    [yearFrom, yearTo, data.years]
  );

  const { totalExp, totalImp, partners } = useMemo(() => {
    if (!data.summary || !data.years.length) {
      return { totalExp: 0, totalImp: 0, partners: 0 };
    }
    let exp = 0, imp = 0;
    const seenIso = new Set();
    let p = 0;
    for (const [name, info] of Object.entries(data.summary)) {
      if (name === 'Confidencial' || name === 'Indeterminado (continente)') continue;
      let cExp = 0, cImp = 0;
      for (const yr of selectedYears) {
        const v = info.years?.[yr];
        if (!v) continue;
        cExp += v.exp || 0;
        cImp += v.imp || 0;
      }
      exp += cExp; imp += cImp;
      if (cExp > 0 || cImp > 0) {
        const key = info.iso2 || name;
        if (!seenIso.has(key)) { seenIso.add(key); p++; }
      }
    }
    return { totalExp: exp, totalImp: imp, partners: p };
  }, [data.summary, data.years, selectedYears]);

  if (data.loading || !data.summary) {
    return (
      <div style={{ padding: 16 }}>
        <div className="m-skeleton" style={{ height: 360, borderRadius: 12 }} />
        <div style={{ marginTop: 14 }} className="m-muted">Cargando mapa…</div>
      </div>
    );
  }

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '12px 16px 8px' }}>
        <div className="m-muted" style={{ fontSize: 12, lineHeight: 1.3 }}>
          {from === to ? from : `${from} – ${to}`}<br />
          Azul = superávit · Rojo = déficit
        </div>
        <YearRangePill years={data.years} />
      </div>
      <div style={{ padding: '0 12px' }}>
        <div className="m-card" style={{ padding: 4, overflow: 'hidden' }}>
          <MobileWorldMap
            key={selectedYears.join(',')}
            summary={data.summary}
            selectedYears={selectedYears}
            onSelectCountry={(name) => navigate(`/trade/country/${encodeURIComponent(name)}`)}
            height={Math.round(window.innerHeight * 0.55)}
          />
        </div>
      </div>

      <div className="m-section-title">Totales del periodo</div>
      <div className="m-kpi-row">
        <div className="m-kpi">
          <span className="m-kpi__label">Exporta</span>
          <span className="m-kpi__value" style={{ color: 'var(--exports)' }}>{fmt(totalExp)}</span>
        </div>
        <div className="m-kpi">
          <span className="m-kpi__label">Importa</span>
          <span className="m-kpi__value" style={{ color: 'var(--imports)' }}>{fmt(totalImp)}</span>
        </div>
        <div className="m-kpi">
          <span className="m-kpi__label">Socios</span>
          <span className="m-kpi__value">{partners}</span>
        </div>
      </div>

      <div style={{ padding: '20px 16px' }}>
        <div className="m-muted" style={{ fontSize: 12, lineHeight: 1.5 }}>
          Tap en un país para ver su detalle. Pinch para hacer zoom.
        </div>
      </div>
    </>
  );
}
