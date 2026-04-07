import { useMemo, useState, useEffect, lazy, Suspense } from 'react';
import { useFdiData } from '../../hooks/useFdiData';
import { useReporter, REPORTER_META, resolveYearRange } from '../context/ReporterContext';
import { fmtUsd, fmtUsdShort } from '../../utils/format';
import { getSectorColor } from '../../utils/colors';
import YearRangePill from '../components/YearRangePill';

const FdiMapScreen = lazy(() => import('./FdiMapScreen'));

const STATUS_LABEL = {
  approved: 'Aprobado',
  under_review: 'En revisión',
  rejected: 'Rechazado',
  pending: 'Pendiente',
};
const STATUS_COLOR = {
  approved: 'var(--accent-green)',
  under_review: 'var(--accent-amber)',
  rejected: 'var(--imports)',
  pending: 'var(--text-muted)',
};

export default function FdiHomeScreen({ initialTab = 'mapa' }) {
  const { reporter, yearFrom, yearTo } = useReporter();
  const data = useFdiData(reporter);
  const [tab, setTab] = useState(initialTab);

  // Available years from flows
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

  // When prop changes (deep-link from another route), respect it
  useEffect(() => { setTab(initialTab); }, [initialTab]);

  // RIGI only available for Argentina
  const showRigi = reporter === 'arg' && data.projects && data.projects.length > 0;

  // If user lands on a tab not allowed (e.g. RIGI on URY), bounce to Inversores.
  // Only bounce AFTER data has finished loading — otherwise we kick the user off
  // the RIGI tab on first paint just because data.projects is still null.
  useEffect(() => {
    if (data.loading) return;
    if (tab === 'rigi' && !showRigi) setTab('inversores');
  }, [tab, showRigi, data.loading]);

  const reporterName = REPORTER_META[reporter].name;

  if (data.loading) {
    return (
      <>
        <h1 className="m-screen-title">Inversión extranjera</h1>
        <p className="m-screen-sub">Cargando datos…</p>
        <div className="m-kpi-row">
          {[0,1,2].map(i => <div key={i} className="m-skeleton" style={{ height: 74, borderRadius: 12 }} />)}
        </div>
      </>
    );
  }

  return (
    <>
      <div style={{ padding: '12px 16px 8px' }}>
        <div className="m-seg" style={{ width: '100%', display: 'flex' }}>
          <button className="m-seg__btn" aria-pressed={tab === 'mapa'} onClick={() => setTab('mapa')} style={{ flex: 1 }}>Mapa</button>
          <button className="m-seg__btn" aria-pressed={tab === 'inversores'} onClick={() => setTab('inversores')} style={{ flex: 1 }}>Inversores</button>
          {showRigi && (
            <button className="m-seg__btn" aria-pressed={tab === 'rigi'} onClick={() => setTab('rigi')} style={{ flex: 1 }}>RIGI</button>
          )}
          <button className="m-seg__btn" aria-pressed={tab === 'sectors'} onClick={() => setTab('sectors')} style={{ flex: 1 }}>Sectores</button>
        </div>
      </div>

      {tab !== 'mapa' && (
        <>
          <h1 className="m-screen-title" style={{ paddingTop: 4 }}>{reporterName}</h1>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '0 16px 14px' }}>
            <div className="m-muted" style={{ fontSize: 13 }}>
              IED · {from && to ? (from === to ? from : `${from} – ${to}`) : '—'}
            </div>
            {availableYears.length > 0 && <YearRangePill years={availableYears} />}
          </div>
        </>
      )}

      <Suspense fallback={<div className="m-loading">Cargando…</div>}>
        {tab === 'mapa' && <FdiMapScreen />}
        {tab === 'inversores' && <InversoresTab data={data} yearSet={yearSet} />}
        {tab === 'rigi' && showRigi && <RigiTab data={data} />}
        {tab === 'sectors' && <SectoresTab data={data} yearSet={yearSet} />}
      </Suspense>

      <div style={{ height: 24 }} />
    </>
  );
}

// ───────────────────────────────────────────────────────────────────
// INVERSORES
// ───────────────────────────────────────────────────────────────────
function InversoresTab({ data, yearSet }) {
  const [metric, setMetric] = useState('stock');

  const { aggregated, totalStock, totalFlow, latestYear } = useMemo(() => {
    if (!data.flows || data.flows.length === 0) {
      return { aggregated: [], totalStock: 0, totalFlow: 0, latestYear: null };
    }
    const byCountry = {};
    let maxYear = 0;
    const useFilter = yearSet && yearSet.size > 0;
    for (const d of data.flows) {
      if (useFilter && !yearSet.has(d.year)) continue;
      const key = d.country_iso3 || d.country;
      if (!key) continue;
      if (!byCountry[key]) {
        byCountry[key] = { country: d.country, iso3: d.country_iso3 || key, stock: 0, stockYear: 0, flow: 0 };
      }
      const sv = d.stock_usd_millions ?? d.stock ?? 0;
      const yr = d.year || 0;
      if (yr >= byCountry[key].stockYear && sv > 0) {
        byCountry[key].stock = sv;
        byCountry[key].stockYear = yr;
      }
      byCountry[key].flow += d.flow_usd_millions ?? d.flow ?? 0;
      if (yr > maxYear) maxYear = yr;
    }
    const list = Object.values(byCountry)
      .filter(c => (metric === 'stock' ? c.stock : c.flow) > 0)
      .sort((a, b) => (metric === 'stock' ? b.stock - a.stock : b.flow - a.flow));
    const ts = list.reduce((s, c) => s + c.stock, 0);
    const tf = list.reduce((s, c) => s + c.flow, 0);
    return { aggregated: list, totalStock: ts, totalFlow: tf, latestYear: maxYear };
  }, [data.flows, metric, yearSet]);

  if (!data.flows || data.flows.length === 0) {
    return <div className="m-loading">Sin datos de IED</div>;
  }

  const top = aggregated.slice(0, 15);
  const maxVal = Math.max(1, ...top.map(c => metric === 'stock' ? c.stock : c.flow));

  return (
    <>
      <div className="m-kpi-row" style={{ marginTop: 12 }}>
        <div className="m-kpi">
          <span className="m-kpi__label">Stock</span>
          <span className="m-kpi__value" style={{ color: 'var(--m-fdi)' }}>{fmtUsdShort(totalStock)}</span>
        </div>
        <div className="m-kpi">
          <span className="m-kpi__label">Flujo acum.</span>
          <span className="m-kpi__value" style={{ color: 'var(--m-fdi)' }}>{fmtUsdShort(totalFlow)}</span>
        </div>
        <div className="m-kpi">
          <span className="m-kpi__label">Países</span>
          <span className="m-kpi__value">{aggregated.length}</span>
        </div>
      </div>

      <div style={{ padding: '14px 16px 0', display: 'flex', justifyContent: 'center' }}>
        <div className="m-seg">
          <button className="m-seg__btn" aria-pressed={metric === 'stock'} onClick={() => setMetric('stock')}>Stock</button>
          <button className="m-seg__btn" aria-pressed={metric === 'flow'} onClick={() => setMetric('flow')}>Flujo</button>
        </div>
      </div>
      <div style={{ padding: '6px 16px 0', textAlign: 'center', fontSize: 11, color: 'var(--text-muted)' }}>
        {metric === 'stock' ? 'Posición acumulada al cierre del periodo' : 'Transacciones netas en el periodo'}
        {latestYear ? ` · al ${latestYear}` : ''}
      </div>

      <div className="m-section-title">Top {top.length} inversores</div>
      <div className="m-list">
        {top.map((c, i) => {
          const v = metric === 'stock' ? c.stock : c.flow;
          const pct = (Math.abs(v) / maxVal) * 100;
          return (
            <div key={c.iso3} className="m-card" style={{ padding: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10, marginBottom: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', minWidth: 22 }}>{String(i + 1).padStart(2, '0')}</span>
                <span style={{ flex: 1, fontSize: 14, fontWeight: 600, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {c.country}
                </span>
                <span style={{ fontSize: 13, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: v < 0 ? 'var(--imports)' : 'var(--text)' }}>
                  {fmtUsdShort(v)}
                </span>
              </div>
              <div style={{ position: 'relative', height: 6, background: 'var(--bg)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${pct}%`, background: v < 0 ? 'var(--imports)' : 'var(--m-fdi)' }} />
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

// ───────────────────────────────────────────────────────────────────
// RIGI
// ───────────────────────────────────────────────────────────────────
function RigiTab({ data }) {
  const projects = data.projects || [];
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const stats = useMemo(() => {
    const approved = projects.filter(p => p.status === 'approved').length;
    const underReview = projects.filter(p => p.status === 'under_review').length;
    const totalUsd = projects.reduce((s, p) => s + (p.estimated_usd_millions || 0), 0);
    return { approved, underReview, totalUsd };
  }, [projects]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return projects.filter(p => {
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;
      if (!q) return true;
      const hay = [p.name, p.company, p.investor, p.sector, p.province].filter(Boolean).join(' ').toLowerCase();
      return hay.includes(q);
    });
  }, [projects, search, statusFilter]);

  return (
    <>
      <div style={{ padding: '12px 16px 8px' }}>
        <div className="m-muted" style={{ fontSize: 12 }}>
          Régimen de Incentivo a Grandes Inversiones · {projects.length} proyectos
        </div>
      </div>

      <div className="m-kpi-row">
        <div className="m-kpi">
          <span className="m-kpi__label">Aprobados</span>
          <span className="m-kpi__value">{stats.approved}</span>
        </div>
        <div className="m-kpi">
          <span className="m-kpi__label">En revisión</span>
          <span className="m-kpi__value">{stats.underReview}</span>
        </div>
        <div className="m-kpi">
          <span className="m-kpi__label">Total USD</span>
          <span className="m-kpi__value m-kpi__value--sm">{fmtUsd(stats.totalUsd)}</span>
        </div>
      </div>

      <div style={{ padding: '14px 16px 8px' }}>
        <input
          type="search"
          placeholder="Buscar proyecto, empresa, sector…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: '100%', minHeight: 40, padding: '0 14px',
            border: '1px solid var(--border)', borderRadius: 999,
            background: 'var(--bg-card)', color: 'var(--text)',
            fontSize: 16, outline: 'none', fontFamily: 'inherit',
          }}
        />
      </div>

      <div style={{ padding: '0 16px 12px', display: 'flex', justifyContent: 'center' }}>
        <div className="m-seg">
          <button className="m-seg__btn" aria-pressed={statusFilter === 'all'} onClick={() => setStatusFilter('all')}>Todos</button>
          <button className="m-seg__btn" aria-pressed={statusFilter === 'approved'} onClick={() => setStatusFilter('approved')}>Aprobados</button>
          <button className="m-seg__btn" aria-pressed={statusFilter === 'under_review'} onClick={() => setStatusFilter('under_review')}>Revisión</button>
        </div>
      </div>

      {filtered.length === 0 && <div className="m-loading">Sin resultados</div>}

      <div className="m-list">
        {filtered.map((p, i) => {
          const status = p.status || 'pending';
          return (
            <div key={p.id || (p.name || 'p') + i} className="m-card" style={{ padding: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 6 }}>
                <span style={{ flex: 1, fontSize: 14, fontWeight: 600, lineHeight: 1.3, minWidth: 0 }}>
                  {p.project_name || p.name || p.project || 'Sin nombre'}
                </span>
                <span style={{
                  fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
                  color: STATUS_COLOR[status] || 'var(--text-muted)',
                  whiteSpace: 'nowrap', alignSelf: 'flex-start', marginTop: 2,
                }}>
                  {STATUS_LABEL[status] || status}
                </span>
              </div>
              {(p.company || p.investor) && (
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
                  {p.company || p.investor}
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {[p.sector, p.province].filter(Boolean).join(' · ') || '—'}
                </span>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--m-fdi)', fontVariantNumeric: 'tabular-nums' }}>
                  {p.estimated_usd_millions ? fmtUsd(p.estimated_usd_millions) : '—'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

// ───────────────────────────────────────────────────────────────────
// SECTORES IED
// ───────────────────────────────────────────────────────────────────
function SectoresTab({ data, yearSet }) {
  const aggregated = useMemo(() => {
    if (!data.sectors || !Array.isArray(data.sectors) || data.sectors.length === 0) return [];
    const bySector = {};
    const useFilter = yearSet && yearSet.size > 0;
    for (const row of data.sectors) {
      if (useFilter && !yearSet.has(row.year)) continue;
      const sector = row.sector || row.activity || 'Otros';
      const yr = row.year || 0;
      if (!bySector[sector]) bySector[sector] = { sector, value: 0, latestStock: 0, latestYear: 0 };
      const stock = row.stock_usd_millions ?? row.stock ?? row.value ?? 0;
      bySector[sector].value += stock;
      if (yr >= bySector[sector].latestYear && stock > 0) {
        bySector[sector].latestStock = stock;
        bySector[sector].latestYear = yr;
      }
    }
    return Object.values(bySector)
      .map(s => ({ ...s, displayValue: s.latestStock || s.value }))
      .filter(s => s.displayValue > 0)
      .sort((a, b) => b.displayValue - a.displayValue);
  }, [data.sectors, yearSet]);

  if (aggregated.length === 0) {
    return <div className="m-loading" style={{ paddingTop: 30 }}>Sin datos sectoriales</div>;
  }

  const total = aggregated.reduce((s, x) => s + x.displayValue, 0);
  const maxVal = aggregated[0].displayValue;

  return (
    <>
      <div style={{ padding: '12px 16px 6px' }}>
        <div className="m-muted" style={{ fontSize: 12 }}>
          IED por actividad económica · {aggregated.length} sectores
        </div>
      </div>

      <div className="m-kpi-row">
        <div className="m-kpi">
          <span className="m-kpi__label">Stock total</span>
          <span className="m-kpi__value" style={{ color: 'var(--m-fdi)' }}>{fmtUsdShort(total)}</span>
        </div>
        <div className="m-kpi">
          <span className="m-kpi__label">Top sector</span>
          <span className="m-kpi__value m-kpi__value--sm">{((aggregated[0].displayValue / total) * 100).toFixed(0)}%</span>
        </div>
        <div className="m-kpi">
          <span className="m-kpi__label">Sectores</span>
          <span className="m-kpi__value">{aggregated.length}</span>
        </div>
      </div>

      <div className="m-section-title">Composición</div>
      <div className="m-list">
        {aggregated.map((s, i) => {
          const pct = (s.displayValue / total) * 100;
          const barPct = (s.displayValue / maxVal) * 100;
          const color = getSectorColor(s.sector);
          return (
            <div key={s.sector} className="m-card" style={{ padding: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10, marginBottom: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', minWidth: 22 }}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span style={{ flex: 1, fontSize: 13, fontWeight: 600, lineHeight: 1.3, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {s.sector}
                </span>
                <span style={{ fontSize: 13, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                  {fmtUsdShort(s.displayValue)}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ flex: 1, position: 'relative', height: 8, background: 'var(--bg)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${barPct}%`, background: color }} />
                </div>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums', minWidth: 36, textAlign: 'right' }}>
                  {pct.toFixed(1)}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
