import { useState, useMemo, useCallback, useEffect } from 'react';
import { useFdiData, loadFdiReporters } from '../../hooks/useFdiData';
import ReporterSelector from '../trade/ReporterSelector';
import FdiWorldMap from './FdiWorldMap';
import CountryRanking from './CountryRanking';
import ProjectList from './ProjectList';
import TreemapChart from './TreemapChart';
import ErrorBoundary from './ErrorBoundary';
import { SkeletonChart } from './Skeleton';
import YearRangeSelector from '../trade/YearRangeSelector';
import { fmtUsd } from '../../utils/format';
import './FdiSection.css';

const COUNTRY_COORDS = {
  USA: [39.8, -98.5], BRA: [-14.2, -51.9], ESP: [40.5, -3.7],
  NLD: [52.1, 5.3], CHL: [-35.7, -71.5], GBR: [55.4, -3.4],
  DEU: [51.2, 10.5], FRA: [46.2, 2.2], CHE: [46.8, 8.2],
  ITA: [41.9, 12.6], CAN: [56.1, -106.3], MEX: [23.6, -102.6],
  URY: [-32.5, -55.8], CHN: [35.9, 104.2], JPN: [36.2, 138.3],
  AUS: [-25.3, 133.8], COL: [4.6, -74.3], LUX: [49.8, 6.1],
  KOR: [35.9, 127.8], IND: [20.6, 78.9], NOR: [60.5, 8.5],
  SWE: [60.1, 18.6], IRL: [53.1, -8.2], ZAF: [-30.6, 22.9],
  SGP: [1.4, 103.8], PAN: [8.5, -80.8], BEL: [50.5, 4.5],
  AUT: [47.5, 14.6], PER: [-9.2, -75.0], BOL: [-16.3, -63.6],
  PRY: [-23.4, -58.4], VEN: [6.4, -66.6], RUS: [61.5, 105.3],
  ISR: [31.0, 34.9], ARE: [23.4, 53.8], CYM: [19.5, -80.6],
  BMU: [32.3, -64.8], VGB: [18.4, -64.6],
};

const PANEL_TABS_ARG = ['Inversores', 'Proyectos RIGI', 'Sectores'];
const PANEL_TABS_OTHER = ['Inversores'];

function FdiSection() {
  const [activeReporter, setActiveReporter] = useState('arg');
  const [reporters, setReporters] = useState(null);
  const data = useFdiData(activeReporter);
  const [panelTab, setPanelTab] = useState('Inversores');

  useEffect(() => {
    loadFdiReporters().then(setReporters);
  }, []);

  // Reset to Inversores tab when switching reporters
  useEffect(() => {
    setPanelTab('Inversores');
  }, [activeReporter]);
  const [metric, setMetric] = useState('stock');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProject, setSelectedProject] = useState(null);
  const [yearFrom, setYearFrom] = useState('2017');
  const [yearTo, setYearTo] = useState('2025');

  const availableYears = useMemo(() => {
    if (!data.flows) return [];
    const ys = new Set(data.flows.map(d => String(d.year)).filter(y => y !== 'undefined' && y !== 'null'));
    return [...ys].sort();
  }, [data.flows]);

  const handleYearChange = (from, to) => {
    setYearFrom(from);
    setYearTo(to);
  };

  const numFrom = parseInt(yearFrom, 10);
  const numTo = parseInt(yearTo, 10);

  const aggregated = useMemo(() => {
    if (!data.flows || data.flows.length === 0) return [];
    let filtered = data.flows.filter(
      d => d.year >= numFrom && d.year <= numTo
    );
    const byCountry = {};
    filtered.forEach(d => {
      const key = d.country_iso3 || d.country;
      if (!byCountry[key]) {
        byCountry[key] = { country: d.country, country_iso3: d.country_iso3 || key, stockYear: 0, stock: 0, flow: 0 };
      }
      const stockVal = d.stock_usd_millions || d.stock || 0;
      const year = d.year || 0;
      if (year >= byCountry[key].stockYear && stockVal > 0) {
        byCountry[key].stock = stockVal;
        byCountry[key].stockYear = year;
      }
      byCountry[key].flow += d.flow_usd_millions || d.flow || 0;
    });
    return Object.values(byCountry)
      .map(c => {
        const coords = COUNTRY_COORDS[c.country_iso3];
        if (!coords) return null;
        return { country: c.country, country_iso3: c.country_iso3, lat: coords[0], lng: coords[1], value: metric === 'stock' ? c.stock : c.flow };
      })
      .filter(c => c && c.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [data.flows, numFrom, numTo, metric]);

  const totalStock = useMemo(() => {
    return aggregated.reduce((s, c) => s + (metric === 'stock' ? c.value : 0), 0);
  }, [aggregated, metric]);

  const totalFlow = useMemo(() => {
    return aggregated.reduce((s, c) => s + (metric === 'flow' ? c.value : 0), 0);
  }, [aggregated, metric]);

  if (data.loading) {
    return <div className="fdi-section"><div className="fdi-loading"><SkeletonChart /></div></div>;
  }

  const renderPanel = () => {
    switch (panelTab) {
      case 'Inversores':
        return (
          <div className="fdi-panel-content">
            <div className="fdi-metric-bar">
              <div className="fdi-metric-toggle">
                <button className={metric === 'stock' ? 'active' : ''} onClick={() => setMetric('stock')}>Stock</button>
                <button className={metric === 'flow' ? 'active' : ''} onClick={() => setMetric('flow')}>Flujo</button>
              </div>
              <span className="fdi-metric-hint">
                {metric === 'stock'
                  ? 'Posicion acumulada de inversion al cierre del periodo'
                  : 'Transacciones netas de inversion en el periodo'}
              </span>
            </div>
            <CountryRanking countries={aggregated.slice(0, 20)} metric={metric} />
          </div>
        );
      case 'Proyectos RIGI': {
        if (!data.projects || data.projects.length === 0) return <div className="fdi-empty">Sin datos de proyectos</div>;
        const approved = data.projects.filter(p => p.status === 'approved');
        const underReview = data.projects.filter(p => p.status === 'under_review');
        const totalUsd = data.projects.reduce((s, p) => s + (p.estimated_usd_millions || 0), 0);
        const sectors = [...new Set(data.projects.map(p => p.sector).filter(Boolean))];
        return (
          <div className="fdi-panel-content">
            <div className="rigi-kpis">
              <div className="rigi-kpi"><span className="rigi-kpi-val">{approved.length}</span><span className="rigi-kpi-lbl">Aprobados</span></div>
              <div className="rigi-kpi"><span className="rigi-kpi-val">{underReview.length}</span><span className="rigi-kpi-lbl">En revision</span></div>
              <div className="rigi-kpi"><span className="rigi-kpi-val">{fmtUsd(totalUsd)}</span><span className="rigi-kpi-lbl">Inversion total</span></div>
              <div className="rigi-kpi"><span className="rigi-kpi-val">{sectors.length}</span><span className="rigi-kpi-lbl">Sectores</span></div>
            </div>
            <ProjectList
              projects={data.projects}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              selectedProject={selectedProject}
              onSelectProject={setSelectedProject}
            />
          </div>
        );
      }
      case 'Sectores':
        return (
          <div className="fdi-panel-content fdi-panel-scroll">
            <ErrorBoundary fallbackMessage="Error en grafico">
              <TreemapChart data={data.sectors} yearRange={[numFrom, numTo]} />
            </ErrorBoundary>
          </div>
        );
      case 'Resumen': {
        const reporterName = reporters?.find(r => r.key === activeReporter)?.name || activeReporter;
        const totalVal = aggregated.reduce((s, c) => s + c.value, 0);
        const top3 = aggregated.slice(0, 3);
        return (
          <div className="fdi-panel-content fdi-panel-scroll">
            <div className="fdi-resumen">
              <h3 className="fdi-resumen-title">Resumen IED - {reporterName}</h3>
              <div className="fdi-resumen-grid">
                <div className="fdi-resumen-item">
                  <span className="fdi-resumen-label">Stock total</span>
                  <span className="fdi-resumen-value">{fmtUsd(totalVal)}</span>
                </div>
                <div className="fdi-resumen-item">
                  <span className="fdi-resumen-label">Paises inversores</span>
                  <span className="fdi-resumen-value">{aggregated.length}</span>
                </div>
                <div className="fdi-resumen-item">
                  <span className="fdi-resumen-label">Periodo</span>
                  <span className="fdi-resumen-value">{yearFrom} - {yearTo}</span>
                </div>
                <div className="fdi-resumen-item">
                  <span className="fdi-resumen-label">Metrica</span>
                  <span className="fdi-resumen-value">{metric === 'stock' ? 'Posicion' : 'Flujos'}</span>
                </div>
              </div>
              {top3.length > 0 && (
                <div className="fdi-resumen-top">
                  <span className="fdi-resumen-label">Top 3 inversores</span>
                  {top3.map((c, i) => (
                    <div key={c.country_iso3} className="fdi-resumen-row">
                      <span className="fdi-resumen-rank">{i + 1}.</span>
                      <span className="fdi-resumen-country">{c.country}</span>
                      <span className="fdi-resumen-amount">{fmtUsd(c.value)}</span>
                    </div>
                  ))}
                </div>
              )}
              {data.projects && data.projects.length > 0 && (
                <div className="fdi-resumen-top">
                  <span className="fdi-resumen-label">Proyectos de inversion</span>
                  <span className="fdi-resumen-value">{data.projects.length} proyectos</span>
                </div>
              )}
            </div>
          </div>
        );
      }
      default:
        return null;
    }
  };

  return (
    <div className="fdi-section">
      <div className="fdi-controls">
        <ReporterSelector
          reporters={reporters}
          active={activeReporter}
          onChange={setActiveReporter}
        />
        <div className="fdi-kpis">
          <span className="fdi-kpi">
            <span className="fdi-kpi-label">Stock IED</span>
            <span className="fdi-kpi-value">{fmtUsd(totalStock || aggregated.reduce((s, c) => s + c.value, 0))}</span>
          </span>
          <span className="fdi-kpi">
            <span className="fdi-kpi-label">Paises</span>
            <span className="fdi-kpi-value">{aggregated.length}</span>
          </span>
          {activeReporter === 'arg' && data.projects && data.projects.length > 0 && (
            <span className="fdi-kpi">
              <span className="fdi-kpi-label">RIGI</span>
              <span className="fdi-kpi-value">{data.projects.length}</span>
            </span>
          )}
        </div>
        <button
          className={`analysis-toggle ${panelTab === 'Resumen' ? 'active' : ''}`}
          onClick={() => setPanelTab(panelTab === 'Resumen' ? 'Inversores' : 'Resumen')}
        >
          Resumen
        </button>
        <YearRangeSelector
          years={availableYears}
          from={yearFrom}
          to={yearTo}
          onChange={handleYearChange}
        />
      </div>
      <div className="fdi-main">
        <div className="fdi-map-section">
          <ErrorBoundary fallbackMessage="Error cargando mapa">
            <FdiWorldMap countries={aggregated} metric={metric} reporterIso3={activeReporter?.toUpperCase()} />
          </ErrorBoundary>
        </div>
        <div className="fdi-panel">
          <div className="fdi-panel-tabs">
            {(activeReporter === 'arg' ? PANEL_TABS_ARG : PANEL_TABS_OTHER).map(tab => (
              <button
                key={tab}
                className={panelTab === tab ? 'active' : ''}
                onClick={() => setPanelTab(tab)}
              >
                {tab}
              </button>
            ))}
          </div>
          {renderPanel()}
        </div>
      </div>
    </div>
  );
}

export default FdiSection;
