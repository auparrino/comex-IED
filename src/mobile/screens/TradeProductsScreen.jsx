import { useEffect, useMemo, useState } from 'react';
import { useTradeData, aggregateByRubro } from '../../hooks/useTradeData';
import { useReporter, resolveYearRange } from '../context/ReporterContext';
import YearRangePill from '../components/YearRangePill';
import { fmt } from '../../utils/format';

export default function TradeProductsScreen() {
  const { reporter, yearFrom, yearTo } = useReporter();
  const data = useTradeData();
  const [view, setView] = useState('chapters'); // 'chapters' | 'rubros'
  const [flow, setFlow] = useState('both');     // 'both' | 'exp' | 'imp'
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (data.activeReporter !== reporter) data.setActiveReporter(reporter);
  }, [reporter, data]);

  const { from, to, list: selectedYears } = useMemo(
    () => resolveYearRange(yearFrom, yearTo, data.years),
    [yearFrom, yearTo, data.years]
  );

  // Aggregate chapters across all countries + selected years
  const chapterTotals = useMemo(() => {
    if (!data.products || !data.chapters) return [];
    const exp = {}, imp = {};
    for (const [country, years] of Object.entries(data.products)) {
      if (country === 'Confidencial' || country === 'Indeterminado (continente)') continue;
      for (const yr of selectedYears) {
        const yrData = years?.[yr];
        if (!yrData) continue;
        for (const [ch, val] of Object.entries(yrData.exp || {})) {
          exp[ch] = (exp[ch] || 0) + val;
        }
        for (const [ch, val] of Object.entries(yrData.imp || {})) {
          imp[ch] = (imp[ch] || 0) + val;
        }
      }
    }
    const all = new Set([...Object.keys(exp), ...Object.keys(imp)]);
    return Array.from(all)
      .map(ch => ({
        chapter: ch,
        name: data.chapters[ch] || `Cap. ${ch}`,
        exp: exp[ch] || 0,
        imp: imp[ch] || 0,
        value: (exp[ch] || 0) + (imp[ch] || 0),
      }))
      .filter(c => c.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [data.products, data.chapters, selectedYears]);

  const rubroTotals = useMemo(() => {
    if (!data.rubros) return [];
    const expR = aggregateByRubro(
      chapterTotals.map(c => ({ chapter: c.chapter, value: c.exp, name: c.name })),
      data.rubros.exp || []
    );
    const impR = aggregateByRubro(
      chapterTotals.map(c => ({ chapter: c.chapter, value: c.imp, name: c.name })),
      data.rubros.imp || []
    );
    const merged = {};
    for (const r of expR) merged[r.code] = { code: r.code, name: r.name, exp: r.value, imp: 0 };
    for (const r of impR) {
      if (merged[r.code]) {
        merged[r.code].imp = r.value;
      } else {
        merged[r.code] = { code: r.code, name: r.name, exp: 0, imp: r.value };
      }
    }
    return Object.values(merged)
      .map(r => ({ ...r, value: r.exp + r.imp }))
      .sort((a, b) => b.value - a.value);
  }, [chapterTotals, data.rubros]);

  const items = view === 'chapters' ? chapterTotals : rubroTotals;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = items;
    if (q) {
      list = list.filter(it =>
        (it.name || '').toLowerCase().includes(q) ||
        (it.chapter || it.code || '').toLowerCase().includes(q)
      );
    }
    if (flow === 'exp') return [...list].filter(it => it.exp > 0).sort((a, b) => b.exp - a.exp);
    if (flow === 'imp') return [...list].filter(it => it.imp > 0).sort((a, b) => b.imp - a.imp);
    return list;
  }, [items, search, flow]);

  const maxVal = useMemo(
    () => Math.max(1, ...filtered.map(it => flow === 'exp' ? it.exp : flow === 'imp' ? it.imp : it.value)),
    [filtered, flow]
  );

  if (data.loading || !data.products) {
    return (
      <div style={{ padding: 16 }}>
        <div className="m-skeleton" style={{ height: 50, marginBottom: 12, borderRadius: 12 }} />
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="m-skeleton" style={{ height: 60, marginBottom: 8 }} />
        ))}
      </div>
    );
  }

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '12px 16px 8px' }}>
        <div className="m-muted" style={{ fontSize: 13 }}>
          {from === to ? from : `${from} – ${to}`} · {filtered.length} {view === 'chapters' ? 'capítulos' : 'rubros'}
        </div>
        <YearRangePill years={data.years} />
      </div>

      <div style={{ padding: '0 16px 8px' }}>
        <div className="m-seg" style={{ width: '100%', display: 'flex' }}>
          <button className="m-seg__btn" aria-pressed={view === 'chapters'} onClick={() => setView('chapters')} style={{ flex: 1 }}>Capítulos</button>
          <button className="m-seg__btn" aria-pressed={view === 'rubros'} onClick={() => setView('rubros')} style={{ flex: 1 }}>Rubros</button>
        </div>
      </div>

      <div style={{ padding: '0 16px 8px' }}>
        <input
          type="search"
          placeholder="Buscar capítulo, código…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: '100%',
            minHeight: 40,
            padding: '0 14px',
            border: '1px solid var(--border)',
            borderRadius: 999,
            background: 'var(--bg-card)',
            color: 'var(--text)',
            fontSize: 16,
            outline: 'none',
            fontFamily: 'inherit',
          }}
        />
      </div>

      <div style={{ padding: '0 16px 14px', display: 'flex', justifyContent: 'center' }}>
        <div className="m-seg">
          <button className="m-seg__btn" aria-pressed={flow === 'both'} onClick={() => setFlow('both')}>Ambos</button>
          <button className="m-seg__btn" aria-pressed={flow === 'exp'} onClick={() => setFlow('exp')}>Exp</button>
          <button className="m-seg__btn" aria-pressed={flow === 'imp'} onClick={() => setFlow('imp')}>Imp</button>
        </div>
      </div>

      {filtered.length === 0 && (
        <div className="m-loading">Sin resultados</div>
      )}

      <div className="m-list">
        {filtered.slice(0, 100).map((it, i) => {
          const code = it.chapter || it.code;
          const displayValue = flow === 'exp' ? it.exp : flow === 'imp' ? it.imp : it.value;
          const expPct = (it.exp / maxVal) * 100;
          const impPct = (it.imp / maxVal) * 100;
          return (
            <div key={code} className="m-card" style={{ padding: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10, marginBottom: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', minWidth: 22 }}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span style={{ flex: 1, fontSize: 13, fontWeight: 600, lineHeight: 1.3, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {code} · {it.name}
                </span>
                <span style={{ fontSize: 13, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                  {fmt(displayValue)}
                </span>
              </div>
              <div style={{ position: 'relative', height: 6, background: 'var(--bg)', borderRadius: 3, overflow: 'hidden' }}>
                {flow === 'both' ? (
                  <>
                    <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${expPct}%`, background: 'var(--exports)' }} />
                    <div style={{ position: 'absolute', left: `${expPct}%`, top: 0, height: '100%', width: `${impPct}%`, background: 'var(--imports)' }} />
                  </>
                ) : (
                  <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${(displayValue / maxVal) * 100}%`, background: flow === 'exp' ? 'var(--exports)' : 'var(--imports)' }} />
                )}
              </div>
              {flow === 'both' && (it.exp > 0 || it.imp > 0) && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 11, color: 'var(--text-muted)' }}>
                  <span>Exp {fmt(it.exp)}</span>
                  <span>Imp {fmt(it.imp)}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filtered.length > 100 && (
        <div className="m-loading" style={{ fontSize: 12 }}>
          Mostrando 100 de {filtered.length}. Refiná la búsqueda.
        </div>
      )}
      <div style={{ height: 24 }} />
    </>
  );
}
