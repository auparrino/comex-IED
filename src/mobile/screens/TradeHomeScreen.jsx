import { useMemo, useEffect, useState, lazy, Suspense } from 'react';
import { useTradeData } from '../../hooks/useTradeData';
import { useReporter, REPORTER_META, resolveYearRange } from '../context/ReporterContext';
import { useNavigate } from '../router';
import { fmt } from '../../utils/format';
import Sparkline from '../components/Sparkline';
import YearRangePill from '../components/YearRangePill';

const TradeMapScreen      = lazy(() => import('./TradeMapScreen'));
const TradeProductsScreen = lazy(() => import('./TradeProductsScreen'));

export default function TradeHomeScreen({ initialTab = 'mapa' }) {
  const { reporter } = useReporter();
  const data = useTradeData();
  const [tab, setTab] = useState(initialTab);

  useEffect(() => { setTab(initialTab); }, [initialTab]);

  // Sync mobile reporter context → useTradeData internal state
  useEffect(() => {
    if (data.activeReporter !== reporter) {
      data.setActiveReporter(reporter);
    }
  }, [reporter, data]);

  return (
    <>
      <div style={{ padding: '12px 16px 8px' }}>
        <div className="m-seg" style={{ width: '100%', display: 'flex' }}>
          <button className="m-seg__btn" aria-pressed={tab === 'mapa'} onClick={() => setTab('mapa')} style={{ flex: 1 }}>Mapa</button>
          <button className="m-seg__btn" aria-pressed={tab === 'resumen'} onClick={() => setTab('resumen')} style={{ flex: 1 }}>Resumen</button>
          <button className="m-seg__btn" aria-pressed={tab === 'productos'} onClick={() => setTab('productos')} style={{ flex: 1 }}>Productos</button>
        </div>
      </div>

      <Suspense fallback={<div className="m-loading">Cargando…</div>}>
        {tab === 'mapa' && <TradeMapScreen />}
        {tab === 'resumen' && <TradeResumenTab data={data} />}
        {tab === 'productos' && <TradeProductsScreen />}
      </Suspense>
    </>
  );
}

// ───────────────────────────────────────────────────────────────────
// Resumen — KPIs, sparkline anual, top 10 socios
// ───────────────────────────────────────────────────────────────────
function TradeResumenTab({ data }) {
  const { reporter, yearFrom, yearTo } = useReporter();
  const navigate = useNavigate();

  const { from, to, list: selectedYears } = useMemo(
    () => resolveYearRange(yearFrom, yearTo, data.years),
    [yearFrom, yearTo, data.years]
  );

  const { totalExp, totalImp, partnersCount, sparkData, topCountries } = useMemo(() => {
    if (!data.summary || !data.years.length) {
      return { totalExp: 0, totalImp: 0, partnersCount: 0, sparkData: null, topCountries: [] };
    }
    let exp = 0, imp = 0;
    const yearAgg = {};
    for (const y of selectedYears) yearAgg[y] = { year: y, exp: 0, imp: 0 };

    const cleanByIso = {};
    for (const [name, info] of Object.entries(data.summary)) {
      if (name === 'Confidencial' || name === 'Indeterminado (continente)') continue;
      const iso2 = info.iso2;
      let cExp = 0, cImp = 0;
      for (const yr of selectedYears) {
        const v = info.years?.[yr];
        if (!v) continue;
        cExp += v.exp || 0;
        cImp += v.imp || 0;
        if (yearAgg[yr]) {
          yearAgg[yr].exp += v.exp || 0;
          yearAgg[yr].imp += v.imp || 0;
        }
      }
      exp += cExp;
      imp += cImp;
      if (cExp <= 0 && cImp <= 0) continue;

      const isClean = !name.includes('(');
      if (iso2) {
        const ex = cleanByIso[iso2];
        if (!ex) {
          cleanByIso[iso2] = { name, totalExports: cExp, totalImports: cImp };
        } else if (isClean && ex.name.includes('(')) {
          cleanByIso[iso2] = { name, totalExports: cExp, totalImports: cImp };
        }
      } else {
        cleanByIso[name] = { name, totalExports: cExp, totalImports: cImp };
      }
    }

    const ranked = Object.values(cleanByIso)
      .map(c => ({ ...c, totalTrade: c.totalExports + c.totalImports }))
      .sort((a, b) => b.totalTrade - a.totalTrade);

    return {
      totalExp: exp,
      totalImp: imp,
      partnersCount: ranked.length,
      sparkData: selectedYears.map(y => yearAgg[y]),
      topCountries: ranked.slice(0, 10),
    };
  }, [data.summary, data.years, selectedYears]);

  const reporterName = REPORTER_META[reporter].name;
  const yearRange = data.years.length ? (from === to ? from : `${from} – ${to}`) : '';

  if (data.loading || !data.summary) {
    return (
      <>
        <div className="m-kpi-row" style={{ marginTop: 8 }}>
          {[0, 1, 2].map(i => <div key={i} className="m-skeleton" style={{ height: 74, borderRadius: 12 }} />)}
        </div>
        <div style={{ padding: '22px 16px' }}>
          <div className="m-skeleton" style={{ height: 130, borderRadius: 12 }} />
        </div>
        <div className="m-list">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="m-skeleton" style={{ height: 56 }} />
          ))}
        </div>
      </>
    );
  }

  if (data.error) {
    return (
      <div className="m-loading" style={{ flexDirection: 'column', gap: 8, color: 'var(--imports)' }}>
        <div>No se pudieron cargar los datos</div>
        <div className="m-muted">{data.error}</div>
      </div>
    );
  }

  const balance = totalExp - totalImp;
  const balanceColor = balance >= 0 ? 'var(--exports)' : 'var(--imports)';

  return (
    <>
      <h1 className="m-screen-title" style={{ paddingTop: 8 }}>{reporterName}</h1>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '0 16px 14px' }}>
        <div className="m-muted" style={{ fontSize: 13 }}>
          {yearRange} · {partnersCount} socios
        </div>
        <YearRangePill years={data.years} />
      </div>

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
          <span className="m-kpi__label">Balance</span>
          <span className="m-kpi__value m-kpi__value--sm" style={{ color: balanceColor }}>
            {balance >= 0 ? '+' : ''}{fmt(balance)}
          </span>
        </div>
      </div>

      <div className="m-section-title">Evolución anual</div>
      <div style={{ padding: '0 16px' }}>
        <div className="m-card" style={{ padding: 12 }}>
          <div style={{ display: 'flex', gap: 12, marginBottom: 8, fontSize: 12 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 10, height: 2, background: 'var(--exports)', borderRadius: 1 }} /> Exporta
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 10, height: 2, background: 'var(--imports)', borderRadius: 1 }} /> Importa
            </span>
          </div>
          <Sparkline data={sparkData} height={120} />
        </div>
      </div>

      <div className="m-section-title">Top 10 socios</div>
      <div className="m-list">
        {topCountries.length === 0 && <div className="m-loading">Sin datos</div>}
        {topCountries.map((c, i) => {
          const bal = c.totalExports - c.totalImports;
          return (
            <button
              key={c.name}
              className="m-row"
              onClick={() => navigate(`/trade/country/${encodeURIComponent(c.name)}`)}
            >
              <span className="m-row__rank">{i + 1}</span>
              <div className="m-row__main">
                <div className="m-row__title">{c.name}</div>
                <div className="m-row__sub">
                  Exp {fmt(c.totalExports)} · Imp {fmt(c.totalImports)}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                <span className="m-row__value">{fmt(c.totalTrade)}</span>
                <span style={{ fontSize: 11, color: bal >= 0 ? 'var(--exports)' : 'var(--imports)' }}>
                  {bal >= 0 ? '+' : ''}{fmt(bal)}
                </span>
              </div>
            </button>
          );
        })}
      </div>
      <div style={{ height: 24 }} />
    </>
  );
}
