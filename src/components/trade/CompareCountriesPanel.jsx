import { useMemo, useEffect, useState } from 'react';
import {
  getCountryYearData,
  getDetailProducts,
  getDetailSelectionTotals,
} from '../../hooks/useTradeData';
import { fmt } from '../../utils/format';
import CompareTimeline from './CompareTimeline';
import './CountryPanel.css';
import './CompareCountriesPanel.css';

function useCountryData(country, data, selectedYears, selectedProduct, productMapData) {
  const [detailData, setDetailData] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    if (!country) { setDetailData(null); return; }
    let cancelled = false;
    setDetailLoading(true);
    data.loadCountryDetail(country).then(d => {
      if (cancelled) return;
      setDetailData(d);
      setDetailLoading(false);
    });
    return () => { cancelled = true; };
  }, [country, data.loadCountryDetail]);

  const yearlyData = useMemo(
    () => getCountryYearData(data.summary, country, data.years),
    [data.summary, country, data.years]
  );

  const selectedProductTotals = useMemo(() => {
    if (!selectedProduct || !detailData) return null;
    return getDetailSelectionTotals(detailData, selectedProduct, selectedYears, data.rubros);
  }, [detailData, selectedProduct, selectedYears, data.rubros]);

  const totals = useMemo(() => {
    if (selectedProduct) {
      if (selectedProductTotals) {
        const exp = selectedProductTotals.exp || 0;
        const imp = selectedProductTotals.imp || 0;
        return { exp, imp, balance: exp - imp };
      }
      const exp = productMapData?.[country]?.exp || 0;
      const imp = productMapData?.[country]?.imp || 0;
      return { exp, imp, balance: exp - imp };
    }
    let exp = 0, imp = 0;
    for (const y of yearlyData) {
      if (selectedYears.includes(y.year)) { exp += y.exp; imp += y.imp; }
    }
    return { exp, imp, balance: exp - imp };
  }, [yearlyData, selectedYears, selectedProduct, selectedProductTotals, productMapData, country]);

  const topChapters = useMemo(() => {
    if (!detailData) return { exp: [], imp: [] };
    const yearArg = selectedYears.length === 1 ? selectedYears[0] : 'all';
    const result = getDetailProducts(detailData, data.ncmDescriptions, yearArg, 2, selectedYears);
    return {
      exp: result.exp.slice(0, 5),
      imp: result.imp.slice(0, 5),
    };
  }, [detailData, data.ncmDescriptions, selectedYears]);

  return { yearlyData, totals, topChapters, detailLoading };
}

function ProductMini({ items, total, flow }) {
  if (!items || items.length === 0) {
    return <div className="compare-mini-empty">Sin datos</div>;
  }
  const max = items[0]?.value || 1;
  return (
    <div className="compare-mini-list">
      {items.map(p => {
        const pct = total > 0 ? (p.value / total) * 100 : 0;
        return (
          <div key={p.chapter} className="compare-mini-row">
            <span className="compare-mini-code">{p.chapter}</span>
            <span className="compare-mini-name" title={p.name}>{p.name}</span>
            <span className="compare-mini-bar-track">
              <span
                className={`compare-mini-bar ${flow}`}
                style={{ width: `${(p.value / max) * 100}%` }}
              />
            </span>
            <span className="compare-mini-pct">{pct.toFixed(0)}%</span>
          </div>
        );
      })}
    </div>
  );
}

function deltaPercent(a, b, labelA, labelB) {
  // Used for flows that are always non-negative (Exp / Imp).
  // Shows how much A differs vs B as a directional arrow + percentage.
  if (a === b && a === 0) return { text: '—', cls: 'neutral', title: 'Sin datos' };
  if (b === 0) return { text: `↑ ∞`, cls: 'neutral', title: `${labelB} no tiene operaciones registradas` };
  if (a === 0) return { text: `↓ 100%`, cls: 'neutral', title: `${labelA} no tiene operaciones registradas` };
  const diff = a - b;
  const pct = (diff / Math.abs(b)) * 100;
  const arrow = diff >= 0 ? '↑' : '↓';
  const verb = diff >= 0 ? 'mayor' : 'menor';
  return {
    text: `${arrow} ${Math.abs(pct).toFixed(0)}%`,
    cls: 'neutral',
    title: `${labelA} es ${Math.abs(pct).toFixed(0)}% ${verb} que ${labelB}`,
  };
}

function deltaAbsolute(a, b, labelA, labelB) {
  // Used for Balance, where signs can flip and a % ratio is misleading.
  const diff = a - b;
  if (diff === 0) return { text: '—', cls: 'neutral', title: 'Iguales' };
  const sign = diff >= 0 ? '+' : '−';
  const cls = diff >= 0 ? 'pos' : 'neg';
  const verb = diff >= 0 ? 'mayor' : 'menor';
  return {
    text: `${sign}${fmt(Math.abs(diff))}`,
    cls,
    title: `Balance de ${labelA} es ${sign}${fmt(Math.abs(diff))} ${verb} que el de ${labelB}`,
  };
}

export default function CompareCountriesPanel({
  countryA, countryB, data, selectedYears, onCloseSide,
  selectedProduct, productMapData,
}) {
  const a = useCountryData(countryA, data, selectedYears, selectedProduct, productMapData);
  const b = useCountryData(countryB, data, selectedYears, selectedProduct, productMapData);

  const yearRange = selectedYears.length > 1
    ? `${selectedYears[0]}-${selectedYears[selectedYears.length - 1]}`
    : selectedYears[0];

  const timelineData = useMemo(() => {
    return data.years.map(yr => {
      const ay = a.yearlyData.find(d => d.year === yr) || { exp: 0, imp: 0 };
      const by = b.yearlyData.find(d => d.year === yr) || { exp: 0, imp: 0 };
      return {
        year: yr,
        aTotal: (ay.exp || 0) + (ay.imp || 0),
        bTotal: (by.exp || 0) + (by.imp || 0),
        aBalance: (ay.exp || 0) - (ay.imp || 0),
        bBalance: (by.exp || 0) - (by.imp || 0),
      };
    });
  }, [a.yearlyData, b.yearlyData, data.years]);

  const dExp = deltaPercent(a.totals.exp, b.totals.exp, countryA, countryB);
  const dImp = deltaPercent(a.totals.imp, b.totals.imp, countryA, countryB);
  const dBal = deltaAbsolute(a.totals.balance, b.totals.balance, countryA, countryB);

  return (
    <div className="country-panel compare-panel">
      <div className="compare-panel-header">
        <div className="compare-title-row">
          <h2>Comparación</h2>
          <p className="panel-subtitle">{yearRange}</p>
        </div>
        <p className="compare-help">
          Tocá un país para cerrar esa columna y dejar solo el otro.
          {' '}Las flechas (↑/↓) muestran cuánto difiere <strong>{countryA}</strong> respecto a <strong>{countryB}</strong>.
        </p>
        <div className="compare-headers">
          <button
            className="compare-country-header side-a"
            onClick={() => onCloseSide('primary')}
            title={`Cerrar ${countryA}`}
          >
            <span className="compare-country-name">{countryA}</span>
            <span className="compare-close-hint" aria-hidden="true">×</span>
          </button>
          <span className="compare-vs">vs</span>
          <button
            className="compare-country-header side-b"
            onClick={() => onCloseSide('secondary')}
            title={`Cerrar ${countryB}`}
          >
            <span className="compare-country-name">{countryB}</span>
            <span className="compare-close-hint" aria-hidden="true">×</span>
          </button>
        </div>
      </div>

      <div className="compare-kpis">
        <div className="compare-kpi-row">
          <div className="compare-kpi-cell side-a">
            <span className="compare-kpi-value exports">{fmt(a.totals.exp)}</span>
          </div>
          <div className="compare-kpi-label" title={dExp.title}>
            <span>Exp FOB</span>
            <span className={`compare-delta ${dExp.cls}`}>{dExp.text}</span>
          </div>
          <div className="compare-kpi-cell side-b">
            <span className="compare-kpi-value exports">{fmt(b.totals.exp)}</span>
          </div>
        </div>
        <div className="compare-kpi-row">
          <div className="compare-kpi-cell side-a">
            <span className="compare-kpi-value imports">{fmt(a.totals.imp)}</span>
          </div>
          <div className="compare-kpi-label" title={dImp.title}>
            <span>Imp CIF</span>
            <span className={`compare-delta ${dImp.cls}`}>{dImp.text}</span>
          </div>
          <div className="compare-kpi-cell side-b">
            <span className="compare-kpi-value imports">{fmt(b.totals.imp)}</span>
          </div>
        </div>
        <div className="compare-kpi-row">
          <div className="compare-kpi-cell side-a">
            <span className={`compare-kpi-value ${a.totals.balance >= 0 ? 'surplus' : 'deficit'}`}>
              {a.totals.balance >= 0 ? '+' : ''}{fmt(a.totals.balance)}
            </span>
          </div>
          <div className="compare-kpi-label" title={dBal.title}>
            <span>Δ Balance</span>
            <span className={`compare-delta ${dBal.cls}`}>{dBal.text}</span>
          </div>
          <div className="compare-kpi-cell side-b">
            <span className={`compare-kpi-value ${b.totals.balance >= 0 ? 'surplus' : 'deficit'}`}>
              {b.totals.balance >= 0 ? '+' : ''}{fmt(b.totals.balance)}
            </span>
          </div>
        </div>
      </div>

      {!selectedProduct && (
        <div className="panel-section">
          <h4 className="compare-section-title">Comercio total por año</h4>
          <CompareTimeline
            data={timelineData}
            selectedYears={selectedYears}
            labelA={countryA}
            labelB={countryB}
          />
        </div>
      )}

      <div className="compare-products">
        <h4 className="compare-section-title">Top capítulos · Exportaciones</h4>
        <div className="compare-products-grid">
          <div className="compare-side">
            <div className="compare-side-name side-a">{countryA}</div>
            {a.detailLoading
              ? <div className="loading-detail">Cargando...</div>
              : <ProductMini items={a.topChapters.exp} total={a.totals.exp} flow="exp" />}
          </div>
          <div className="compare-side">
            <div className="compare-side-name side-b">{countryB}</div>
            {b.detailLoading
              ? <div className="loading-detail">Cargando...</div>
              : <ProductMini items={b.topChapters.exp} total={b.totals.exp} flow="exp" />}
          </div>
        </div>

        <h4 className="compare-section-title">Top capítulos · Importaciones</h4>
        <div className="compare-products-grid">
          <div className="compare-side">
            <div className="compare-side-name side-a">{countryA}</div>
            {a.detailLoading
              ? <div className="loading-detail">Cargando...</div>
              : <ProductMini items={a.topChapters.imp} total={a.totals.imp} flow="imp" />}
          </div>
          <div className="compare-side">
            <div className="compare-side-name side-b">{countryB}</div>
            {b.detailLoading
              ? <div className="loading-detail">Cargando...</div>
              : <ProductMini items={b.topChapters.imp} total={b.totals.imp} flow="imp" />}
          </div>
        </div>
      </div>
    </div>
  );
}
