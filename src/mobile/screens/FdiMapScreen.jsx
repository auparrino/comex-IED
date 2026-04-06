import { useMemo, useState } from 'react';
import { useFdiData } from '../../hooks/useFdiData';
import { useReporter, resolveYearRange } from '../context/ReporterContext';
import MobileFdiMap from '../components/MobileFdiMap';
import YearRangePill from '../components/YearRangePill';
import { fmtUsdShort } from '../../utils/format';

export default function FdiMapScreen() {
  const { reporter, yearFrom, yearTo } = useReporter();
  const data = useFdiData(reporter);
  const [metric, setMetric] = useState('stock');

  const availableYears = useMemo(() => {
    if (!data.flows) return [];
    const ys = new Set(data.flows.map(d => String(d.year)).filter(y => y && y !== 'undefined' && y !== 'null'));
    return [...ys].sort();
  }, [data.flows]);

  const { from, to, list: selectedYears } = useMemo(
    () => resolveYearRange(yearFrom, yearTo, availableYears),
    [yearFrom, yearTo, availableYears]
  );
  const yearSet = useMemo(() => new Set(selectedYears.map(y => parseInt(y, 10))), [selectedYears]);

  const { valuesByIso3, total, countriesCount } = useMemo(() => {
    if (!data.flows || data.flows.length === 0) {
      return { valuesByIso3: {}, total: 0, countriesCount: 0 };
    }
    const byIso = {};
    const useFilter = yearSet.size > 0;
    for (const d of data.flows) {
      if (useFilter && !yearSet.has(d.year)) continue;
      const iso3 = d.country_iso3;
      if (!iso3) continue;
      if (!byIso[iso3]) byIso[iso3] = { stock: 0, stockYear: 0, flow: 0 };
      const sv = d.stock_usd_millions ?? d.stock ?? 0;
      const yr = d.year || 0;
      if (yr >= byIso[iso3].stockYear && sv > 0) {
        byIso[iso3].stock = sv;
        byIso[iso3].stockYear = yr;
      }
      byIso[iso3].flow += d.flow_usd_millions ?? d.flow ?? 0;
    }
    const out = {};
    let t = 0, n = 0;
    for (const [iso3, v] of Object.entries(byIso)) {
      const val = metric === 'stock' ? v.stock : v.flow;
      if (val !== 0) {
        out[iso3] = val;
        t += val;
        n++;
      }
    }
    return { valuesByIso3: out, total: t, countriesCount: n };
  }, [data.flows, metric, yearSet]);

  if (data.loading) {
    return (
      <div style={{ padding: 16 }}>
        <div className="m-skeleton" style={{ height: 360, borderRadius: 12 }} />
      </div>
    );
  }

  return (
    <>
      <div style={{ padding: '12px 16px 6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
        <div className="m-muted" style={{ fontSize: 12, lineHeight: 1.3 }}>
          {from && to ? (from === to ? from : `${from} – ${to}`) : '—'}<br />
          Color = magnitud de inversión
        </div>
        {availableYears.length > 0 && <YearRangePill years={availableYears} />}
      </div>

      <div style={{ padding: '0 16px 8px', display: 'flex', justifyContent: 'center' }}>
        <div className="m-seg">
          <button className="m-seg__btn" aria-pressed={metric === 'stock'} onClick={() => setMetric('stock')}>Stock</button>
          <button className="m-seg__btn" aria-pressed={metric === 'flow'} onClick={() => setMetric('flow')}>Flujo</button>
        </div>
      </div>

      <div style={{ padding: '0 12px' }}>
        <div className="m-card" style={{ padding: 4, overflow: 'hidden' }}>
          <MobileFdiMap
            key={`${metric}-${selectedYears.join(',')}`}
            valuesByIso3={valuesByIso3}
            height={Math.round(window.innerHeight * 0.55)}
          />
        </div>
      </div>

      <div className="m-section-title">{metric === 'stock' ? 'Stock total' : 'Flujo acumulado'}</div>
      <div className="m-kpi-row">
        <div className="m-kpi">
          <span className="m-kpi__label">Total</span>
          <span className="m-kpi__value" style={{ color: 'var(--m-fdi)' }}>{fmtUsdShort(total)}</span>
        </div>
        <div className="m-kpi">
          <span className="m-kpi__label">Países</span>
          <span className="m-kpi__value">{countriesCount}</span>
        </div>
        <div className="m-kpi">
          <span className="m-kpi__label">Métrica</span>
          <span className="m-kpi__value m-kpi__value--sm">{metric === 'stock' ? 'Stock' : 'Flujo'}</span>
        </div>
      </div>

      <div style={{ padding: '20px 16px', fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
        Pinch para hacer zoom en el mapa. Detalle de inversores en la pestaña "IED".
      </div>
    </>
  );
}
