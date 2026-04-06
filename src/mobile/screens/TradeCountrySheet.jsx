import { useEffect, useMemo, useState } from 'react';
import { useTradeData, getCountryYearData, getDetailProducts } from '../../hooks/useTradeData';
import { useReporter, resolveYearRange } from '../context/ReporterContext';
import BottomSheet from '../shell/BottomSheet';
import Sparkline from '../components/Sparkline';
import { fmt } from '../../utils/format';

export default function TradeCountrySheet({ countryName, onClose }) {
  const { reporter, yearFrom, yearTo } = useReporter();
  const data = useTradeData();
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [flow, setFlow] = useState('both');

  useEffect(() => {
    if (data.activeReporter !== reporter) data.setActiveReporter(reporter);
  }, [reporter, data]);

  // Load country detail file
  useEffect(() => {
    if (!countryName || !data.summary) return;
    setDetailLoading(true);
    setDetail(null);
    data.loadCountryDetail(countryName).then(d => {
      setDetail(d);
      setDetailLoading(false);
    });
  }, [countryName, data.loadCountryDetail, data.summary]);

  const { from, to, list: selectedYears } = useMemo(
    () => resolveYearRange(yearFrom, yearTo, data.years),
    [yearFrom, yearTo, data.years]
  );

  const yearly = useMemo(() => {
    if (!data.summary || !selectedYears.length) return [];
    return getCountryYearData(data.summary, countryName, selectedYears);
  }, [data.summary, countryName, selectedYears]);

  const totalExp = useMemo(() => yearly.reduce((s, y) => s + y.exp, 0), [yearly]);
  const totalImp = useMemo(() => yearly.reduce((s, y) => s + y.imp, 0), [yearly]);
  const balance = totalExp - totalImp;

  // Top 10 chapters at digit level 2
  const products = useMemo(() => {
    if (!detail || !selectedYears.length) return { exp: [], imp: [] };
    const yearArg = selectedYears.length === 1 ? selectedYears[0] : 'all';
    const p = getDetailProducts(detail, data.ncmDescriptions, yearArg, 2, selectedYears);
    return {
      exp: p.exp.slice(0, 10),
      imp: p.imp.slice(0, 10),
    };
  }, [detail, data.ncmDescriptions, selectedYears]);

  const visibleProducts = useMemo(() => {
    if (flow === 'exp') return products.exp;
    if (flow === 'imp') return products.imp;
    // both: merge by chapter, sum exp+imp
    const merged = {};
    for (const p of products.exp) {
      merged[p.chapter] = { ...p, value: p.value, exp: p.value, imp: 0 };
    }
    for (const p of products.imp) {
      if (merged[p.chapter]) {
        merged[p.chapter].imp = p.value;
        merged[p.chapter].value += p.value;
      } else {
        merged[p.chapter] = { ...p, value: p.value, exp: 0, imp: p.value };
      }
    }
    return Object.values(merged).sort((a, b) => b.value - a.value).slice(0, 10);
  }, [products, flow]);

  const maxVal = Math.max(1, ...visibleProducts.map(p => p.value));
  const summaryInfo = data.summary?.[countryName];

  return (
    <BottomSheet open={true} title={countryName} onClose={onClose} full>
      {!summaryInfo ? (
        <div className="m-loading">País sin datos</div>
      ) : (
        <>
          <div className="m-muted" style={{ fontSize: 12, marginBottom: 12 }}>
            {summaryInfo.iso2 || ''} · {from === to ? from : `${from} – ${to}`}
          </div>

          <div className="m-kpi-row" style={{ padding: 0, marginBottom: 18 }}>
            <div className="m-kpi">
              <span className="m-kpi__label">Exp FOB</span>
              <span className="m-kpi__value" style={{ color: 'var(--exports)' }}>{fmt(totalExp)}</span>
            </div>
            <div className="m-kpi">
              <span className="m-kpi__label">Imp CIF</span>
              <span className="m-kpi__value" style={{ color: 'var(--imports)' }}>{fmt(totalImp)}</span>
            </div>
            <div className="m-kpi">
              <span className="m-kpi__label">Balance</span>
              <span
                className="m-kpi__value m-kpi__value--sm"
                style={{ color: balance >= 0 ? 'var(--exports)' : 'var(--imports)' }}
              >
                {balance >= 0 ? '+' : ''}{fmt(balance)}
              </span>
            </div>
          </div>

          <div className="m-section-title" style={{ padding: '0 0 8px' }}>Evolución anual</div>
          <div className="m-card" style={{ padding: 12, marginBottom: 18 }}>
            <div style={{ display: 'flex', gap: 12, marginBottom: 8, fontSize: 12 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 10, height: 2, background: 'var(--exports)' }} /> Exporta
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 10, height: 2, background: 'var(--imports)' }} /> Importa
              </span>
            </div>
            <Sparkline data={yearly} height={120} />
          </div>

          <div className="m-section-title" style={{ padding: '0 0 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Top productos (capítulo HS)</span>
            <div className="m-seg" style={{ padding: 2 }}>
              <button className="m-seg__btn" aria-pressed={flow === 'both'} onClick={() => setFlow('both')} style={{ minHeight: 28, padding: '0 10px', fontSize: 11 }}>Ambos</button>
              <button className="m-seg__btn" aria-pressed={flow === 'exp'} onClick={() => setFlow('exp')} style={{ minHeight: 28, padding: '0 10px', fontSize: 11 }}>Exp</button>
              <button className="m-seg__btn" aria-pressed={flow === 'imp'} onClick={() => setFlow('imp')} style={{ minHeight: 28, padding: '0 10px', fontSize: 11 }}>Imp</button>
            </div>
          </div>

          {detailLoading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="m-skeleton" style={{ height: 40 }} />
              ))}
            </div>
          )}

          {!detailLoading && visibleProducts.length === 0 && (
            <div className="m-loading">Sin datos de productos</div>
          )}

          {!detailLoading && visibleProducts.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {visibleProducts.map((p) => {
                const pct = (p.value / maxVal) * 100;
                return (
                  <div key={p.chapter} className="m-card" style={{ padding: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.3, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.chapter} · {p.name}
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{fmt(p.value)}</span>
                    </div>
                    <div style={{ position: 'relative', height: 6, background: 'var(--bg)', borderRadius: 3, overflow: 'hidden' }}>
                      {flow === 'both' ? (
                        <>
                          <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${(p.exp / maxVal) * 100}%`, background: 'var(--exports)' }} />
                          <div style={{ position: 'absolute', left: `${(p.exp / maxVal) * 100}%`, top: 0, height: '100%', width: `${(p.imp / maxVal) * 100}%`, background: 'var(--imports)' }} />
                        </>
                      ) : (
                        <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${pct}%`, background: flow === 'exp' ? 'var(--exports)' : 'var(--imports)' }} />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div style={{ height: 24 }} />
        </>
      )}
    </BottomSheet>
  );
}
