import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import * as d3 from 'd3';
import * as topojson from 'topojson-client';
import { getCountryCoords } from '../../utils/countryCoords';
import { COLORS } from '../../utils/colors';
import { fmt } from '../../utils/format';
import './WorldMap.css';

const EMPTY_SET = new Set();
const VIEW_MODES = [
  { key: 'balance', label: 'Balance' },
  { key: 'total', label: 'Total' },
  { key: 'exports', label: 'Exports' },
  { key: 'imports', label: 'Imports' },
];
const GLOBAL_FLOW_LIMIT = 5;
const SMALL_COUNTRY_AREA = 18;
const NO_TRADE_FILL = '#f8ecd2';
const NO_TRADE_STROKE = '#e4d4b2';

// Module-level cache for world topology (survives remounts)
let worldDataCache = null;

function getCountryTotals(summary, selectedYears) {
  const result = {};
  for (const [name, data] of Object.entries(summary || {})) {
    if (name === 'Confidencial' || name === 'Indeterminado (continente)') continue;
    let exp = 0;
    let imp = 0;
    for (const yr of selectedYears) {
      exp += data.years?.[yr]?.exp || 0;
      imp += data.years?.[yr]?.imp || 0;
    }
    if (exp > 0 || imp > 0) {
      result[name] = { exp, imp, total: exp + imp, balance: exp - imp, iso2: data.iso2 };
    }
  }
  return result;
}

function getMetricValue(totals, viewMode) {
  if (!totals) return 0;
  switch (viewMode) {
    case 'exports':
      return totals.exp || 0;
    case 'imports':
      return totals.imp || 0;
    case 'balance':
      return totals.balance || 0;
    default:
      return totals.total || 0;
  }
}

function getMetricLabel(viewMode) {
  switch (viewMode) {
    case 'exports':
      return 'Exports FOB';
    case 'imports':
      return 'Imports CIF';
    case 'balance':
      return 'Trade balance';
    default:
      return 'Total trade';
  }
}

function getMetricGradient(viewMode) {
  if (viewMode === 'balance') {
    return `linear-gradient(90deg, ${COLORS.imports} 0%, #f6e7cf 50%, ${COLORS.exports} 100%)`;
  }

  const targetColor = viewMode === 'imports'
    ? COLORS.imports
    : viewMode === 'exports'
      ? COLORS.exports
      : COLORS.highlight;

  return `linear-gradient(90deg, #f6e7cf 0%, ${targetColor} 100%)`;
}

function getLegendLabels(viewMode, maxValue) {
  if (viewMode === 'balance') {
    return {
      min: `Deficit ${fmt(maxValue)}`,
      mid: 'Break-even',
      max: `Surplus ${fmt(maxValue)}`,
    };
  }

  return {
    min: '$0',
    mid: fmt(maxValue / 2),
    max: fmt(maxValue),
  };
}

function getYearFilterLabel(selectedYears) {
  if (!selectedYears?.length) return 'No data';
  if (selectedYears.length === 1) return String(selectedYears[0]);
  return `${selectedYears[0]}-${selectedYears[selectedYears.length - 1]}`;
}

function getProductFilterLabel(selectedProduct, data) {
  if (!selectedProduct) return null;

  if (selectedProduct.startsWith('rubro:')) {
    const rubroCode = selectedProduct.slice(6);
    const rubro = [...(data.rubros?.exp || []), ...(data.rubros?.imp || [])]
      .find(item => item.code === rubroCode);
    return rubro ? `Category ${rubro.code} - ${rubro.name}` : `Category ${rubroCode}`;
  }

  if (selectedProduct.length === 2) {
    return `Chapter ${selectedProduct} - ${data.chapters?.[selectedProduct] || selectedProduct}`;
  }

  if (selectedProduct.length === 4) {
    return `Heading ${selectedProduct} - ${data.ncmDescriptions?.[selectedProduct] || selectedProduct}`;
  }

  return `HS6 ${selectedProduct} - ${data.ncmDescriptions?.[selectedProduct] || selectedProduct}`;
}

// Escape HTML to prevent XSS
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ISO 3166-1 numeric -> ISO2 mapping (common countries)
const ISO_NUM_MAP = {
  AF: '4', AL: '8', DZ: '12', AS: '16', AD: '20', AO: '24',
  AG: '28', AR: '32', AM: '51', AU: '36', AT: '40', AZ: '31',
  BS: '44', BH: '48', BD: '50', BB: '52', BY: '112', BE: '56',
  BZ: '84', BJ: '204', BT: '64', BO: '68', BA: '70', BW: '72',
  BR: '76', BN: '96', BG: '100', BF: '854', BI: '108',
  KH: '116', CM: '120', CA: '124', CV: '132', CF: '140',
  TD: '148', CL: '152', CN: '156', CO: '170', KM: '174',
  CG: '178', CD: '180', CR: '188', CI: '384', HR: '191',
  CU: '192', CY: '196', CZ: '203', DK: '208', DJ: '262',
  DM: '212', DO: '214', EC: '218', EG: '818', SV: '222',
  GQ: '226', ER: '232', EE: '233', ET: '231', FJ: '242',
  FI: '246', FR: '250', GA: '266', GM: '270', GE: '268',
  DE: '276', GH: '288', GR: '300', GD: '308', GT: '320',
  GN: '324', GW: '624', GY: '328', HT: '332', HN: '340',
  HU: '348', IS: '352', IN: '356', ID: '360', IR: '364',
  IQ: '368', IE: '372', IL: '376', IT: '380', JM: '388',
  JP: '392', JO: '400', KZ: '398', KE: '404', KI: '296',
  KP: '408', KR: '410', KW: '414', KG: '417', LA: '418',
  LV: '428', LB: '422', LS: '426', LR: '430', LY: '434',
  LI: '438', LT: '440', LU: '442', MK: '807', MG: '450',
  MW: '454', MY: '458', MV: '462', ML: '466', MT: '470',
  MR: '478', MU: '480', MX: '484', MD: '498', MC: '492',
  MN: '496', ME: '499', MA: '504', MZ: '508', MM: '104',
  NA: '516', NP: '524', NL: '528', NZ: '554', NI: '558',
  NE: '562', NG: '566', NO: '578', OM: '512', PK: '586',
  PA: '591', PG: '598', PY: '600', PE: '604', PH: '608',
  PL: '616', PT: '620', QA: '634', RO: '642', RU: '643',
  RW: '646', SA: '682', SN: '686', RS: '688', SL: '694',
  SG: '702', SK: '703', SI: '705', SB: '90', SO: '706',
  ZA: '710', SS: '728', ES: '724', LK: '144', SD: '729',
  SR: '740', SZ: '748', SE: '752', CH: '756', SY: '760',
  TW: '158', TJ: '762', TZ: '834', TH: '764', TL: '626',
  TG: '768', TT: '780', TN: '788', TR: '792', TM: '795',
  UG: '800', UA: '804', AE: '784', GB: '826', US: '840',
  UY: '858', UZ: '860', VU: '548', VE: '862', VN: '704',
  YE: '887', ZM: '894', ZW: '716',
  XK: '-99', PS: '275', EH: '732',
};

export default function WorldMap({
  data,
  selectedYear,
  selectedYears,
  selectedCountry,
  onSelectCountry,
  reporterCoords,
  selectedProduct,
  productMapData,
  blocHighlight,
}) {
  void selectedYear;
  blocHighlight = blocHighlight || EMPTY_SET;

  const svgRef = useRef();
  const tooltipRef = useRef();
  const zoomTransformRef = useRef(d3.zoomIdentity);
  const zoomBehaviorRef = useRef(null);
  const [worldData, setWorldData] = useState(worldDataCache);
  const [containerWidth, setContainerWidth] = useState(0);
  const [viewMode, setViewMode] = useState('balance');
  const [showFlows, setShowFlows] = useState(true);

  const countryTotals = useMemo(
    () => getCountryTotals(data.summary, selectedYears),
    [data.summary, selectedYears]
  );

  const effectiveTotals = useMemo(() => {
    if (selectedProduct && productMapData) {
      const result = {};
      for (const [name, vals] of Object.entries(productMapData)) {
        const exp = vals.exp || 0;
        const imp = vals.imp || 0;
        if (exp > 0 || imp > 0) {
          result[name] = {
            exp,
            imp,
            total: exp + imp,
            balance: exp - imp,
            iso2: data.summary?.[name]?.iso2 || '',
          };
        }
      }
      return result;
    }
    return countryTotals;
  }, [countryTotals, selectedProduct, productMapData, data.summary]);

  const isoToName = useMemo(() => {
    const map = {};
    for (const [name, d] of Object.entries(data.summary || {})) {
      if (!d.iso2) continue;
      if (name.includes('(') && map[d.iso2]) continue;
      map[d.iso2] = name;
    }
    return map;
  }, [data.summary]);

  const numIdToName = useMemo(() => {
    const map = {};
    for (const [iso2, name] of Object.entries(isoToName)) {
      const numId = parseInt(ISO_NUM_MAP[iso2], 10);
      if (!Number.isNaN(numId)) map[numId] = name;
    }
    return map;
  }, [isoToName]);

  const selectedProductLabel = useMemo(
    () => getProductFilterLabel(selectedProduct, data),
    [selectedProduct, data]
  );

  const filterChips = useMemo(() => {
    const chips = [{ label: 'Years', value: getYearFilterLabel(selectedYears) }];
    if (selectedProductLabel) chips.push({ label: 'Product', value: selectedProductLabel });
    if (selectedCountry) chips.push({ label: 'Country', value: selectedCountry });
    return chips;
  }, [selectedYears, selectedProductLabel, selectedCountry]);

  const metricValues = useMemo(
    () => Object.values(effectiveTotals).map(item => Math.abs(getMetricValue(item, viewMode))),
    [effectiveTotals, viewMode]
  );

  const metricMax = useMemo(
    () => Math.max(1, ...metricValues),
    [metricValues]
  );

  const legendLabels = useMemo(
    () => getLegendLabels(viewMode, metricMax),
    [viewMode, metricMax]
  );

  const tradeMagnitudeMax = useMemo(
    () => Math.max(1, ...Object.values(effectiveTotals).map(item => item.total || 0)),
    [effectiveTotals]
  );

  const exportMagnitudeMax = useMemo(
    () => Math.max(1, ...Object.values(effectiveTotals).map(item => item.exp || 0)),
    [effectiveTotals]
  );

  const importMagnitudeMax = useMemo(
    () => Math.max(1, ...Object.values(effectiveTotals).map(item => item.imp || 0)),
    [effectiveTotals]
  );

  const rankedCountries = useMemo(() => {
    return Object.entries(effectiveTotals).sort((a, b) => b[1].total - a[1].total);
  }, [effectiveTotals]);

  const flowCountries = useMemo(() => {
    if (!showFlows) return [];
    if (selectedCountry && effectiveTotals[selectedCountry]) return [selectedCountry];

    const threshold = tradeMagnitudeMax * 0.08;
    return rankedCountries
      .filter(([, totals]) => totals.total >= threshold)
      .slice(0, GLOBAL_FLOW_LIMIT)
      .map(([name]) => name);
  }, [showFlows, selectedCountry, effectiveTotals, rankedCountries, tradeMagnitudeMax]);

  const selectedCountryTotals = selectedCountry ? effectiveTotals[selectedCountry] : null;
  const hubCoords = reporterCoords || [-34.6, -58.4];

  const handleResetZoom = useCallback(() => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.transition().duration(350).call(zoomBehaviorRef.current.transform, d3.zoomIdentity);
  }, []);

  // Resize observer
  useEffect(() => {
    const container = svgRef.current?.parentElement;
    if (!container) return;

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });

    ro.observe(container);
    setContainerWidth(container.clientWidth);
    return () => ro.disconnect();
  }, []);

  // Fetch world topology once
  useEffect(() => {
    if (worldDataCache) {
      setWorldData(worldDataCache);
      return;
    }

    fetch(`${import.meta.env.BASE_URL}data/trade/world-110m.json`)
      .then(r => r.json())
      .then(d => {
        worldDataCache = d;
        setWorldData(d);
      });
  }, []);

  // Main render effect
  useEffect(() => {
    if (!worldData || !svgRef.current || !containerWidth) return;

    const svg = d3.select(svgRef.current);
    const width = containerWidth;
    const height = Math.min(width * 0.56, window.innerHeight - 210);

    svg.attr('viewBox', `0 0 ${width} ${height}`);
    svg.selectAll('*').remove();

    const projection = d3.geoNaturalEarth1()
      .center([-20, -5])
      .scale(width / 5.5)
      .translate([width / 2, height / 2]);

    const path = d3.geoPath(projection);
    const countries = topojson.feature(worldData, worldData.objects.countries);

    const zoomG = svg.append('g');

    const zoom = d3.zoom()
      .scaleExtent([1, 8])
      .on('zoom', (event) => {
        zoomG.attr('transform', event.transform);
        zoomTransformRef.current = event.transform;
      });

    zoomBehaviorRef.current = zoom;
    svg.call(zoom);

    if (zoomTransformRef.current !== d3.zoomIdentity) {
      svg.call(zoom.transform, zoomTransformRef.current);
    }

    const valueScale = d3.scaleSqrt().domain([0, metricMax]).range([0, 1]);
    const getCountryFill = (totals) => {
      if (!totals) return NO_TRADE_FILL;

      if (viewMode === 'balance') {
        const intensity = valueScale(Math.abs(totals.balance || 0));
        const targetColor = (totals.balance || 0) >= 0 ? COLORS.exports : COLORS.imports;
        return d3.interpolateLab('#f6e7cf', targetColor)(intensity);
      }

      const value = getMetricValue(totals, viewMode);
      const intensity = valueScale(value);
      const targetColor = viewMode === 'imports'
        ? COLORS.imports
        : viewMode === 'exports'
          ? COLORS.exports
          : COLORS.highlight;

      return d3.interpolateLab('#f6e7cf', targetColor)(intensity);
    };

    const countryPaths = zoomG.append('g').attr('class', 'countries-layer');

    countryPaths.selectAll('path.country')
      .data(countries.features)
      .join('path')
      .attr('class', 'country')
      .attr('d', path)
      .attr('fill', (d) => {
        const name = numIdToName[parseInt(d.id, 10)];
        if (name && effectiveTotals[name]) return getCountryFill(effectiveTotals[name]);
        if (selectedProduct && name && countryTotals[name]) return '#e8dcc0';
        return NO_TRADE_FILL;
      })
      .attr('stroke', (d) => {
        const name = numIdToName[parseInt(d.id, 10)];
        if (name && name === selectedCountry) return COLORS.highlight;
        if (name && blocHighlight.size > 0 && blocHighlight.has(name)) return COLORS.highlight;
        return NO_TRADE_STROKE;
      })
      .attr('stroke-width', (d) => {
        const name = numIdToName[parseInt(d.id, 10)];
        if (name && name === selectedCountry) return 2.5;
        if (name && blocHighlight.size > 0 && blocHighlight.has(name)) return 1.6;
        return 0.55;
      })
      .attr('opacity', (d) => {
        const name = numIdToName[parseInt(d.id, 10)];
        if (!selectedCountry) return 1;
        if (name === selectedCountry) return 1;
        if (name && effectiveTotals[name]) return 0.42;
        return 0.78;
      })
      .style('cursor', (d) => {
        const name = numIdToName[parseInt(d.id, 10)];
        return name && effectiveTotals[name] ? 'pointer' : 'default';
      })
      .on('click', (event, d) => {
        const name = numIdToName[parseInt(d.id, 10)];
        if (name && effectiveTotals[name]) onSelectCountry(name);
      })
      .on('mouseenter', (event, d) => {
        const name = numIdToName[parseInt(d.id, 10)];
        if (!name || !effectiveTotals[name]) return;

        const tooltip = tooltipRef.current;
        if (!tooltip) return;

        const totals = effectiveTotals[name];
        const productLabel = selectedProductLabel ? `<div class="tt-context">${escapeHtml(selectedProductLabel)}</div>` : '';
        tooltip.style.display = 'block';
        tooltip.innerHTML = `
          <strong>${escapeHtml(name)}</strong>
          ${productLabel}
          <div class="tt-row"><span class="tt-exp">Exports FOB</span> ${fmt(totals.exp)}</div>
          <div class="tt-row"><span class="tt-imp">Imports CIF</span> ${fmt(totals.imp)}</div>
          <div class="tt-row"><span class="tt-bal">Balance</span> ${fmt(totals.balance)}</div>
          <div class="tt-row"><span class="tt-metric">${escapeHtml(getMetricLabel(viewMode))}</span> ${fmt(Math.abs(getMetricValue(totals, viewMode)))}</div>
        `;
      })
      .on('mousemove', (event) => {
        const tooltip = tooltipRef.current;
        if (!tooltip) return;

        const container = svgRef.current.parentElement;
        const rect = container.getBoundingClientRect();
        tooltip.style.left = `${event.clientX - rect.left + 12}px`;
        tooltip.style.top = `${event.clientY - rect.top - 10}px`;
      })
      .on('mouseleave', () => {
        if (tooltipRef.current) tooltipRef.current.style.display = 'none';
      });

    const tinyCountries = countries.features.filter((feature) => {
      const name = numIdToName[parseInt(feature.id, 10)];
      return name && effectiveTotals[name] && path.area(feature) < SMALL_COUNTRY_AREA;
    });

    zoomG.append('g')
      .attr('class', 'micro-country-layer')
      .selectAll('circle')
      .data(tinyCountries)
      .join('circle')
      .attr('cx', d => path.centroid(d)[0])
      .attr('cy', d => path.centroid(d)[1])
      .attr('r', (d) => {
        const name = numIdToName[parseInt(d.id, 10)];
        const totals = effectiveTotals[name];
        return selectedCountry === name ? 5.5 : 2.8 + valueScale(getMetricValue(totals, viewMode)) * 2;
      })
      .attr('fill', (d) => {
        const name = numIdToName[parseInt(d.id, 10)];
        return getCountryFill(effectiveTotals[name]);
      })
      .attr('stroke', '#fff8eb')
      .attr('stroke-width', 1.1)
      .attr('opacity', (d) => {
        const name = numIdToName[parseInt(d.id, 10)];
        if (!selectedCountry) return 0.95;
        return name === selectedCountry ? 1 : 0.5;
      })
      .style('cursor', 'pointer')
      .on('click', (event, d) => {
        const name = numIdToName[parseInt(d.id, 10)];
        if (name && effectiveTotals[name]) onSelectCountry(name);
      });

    if (showFlows) {
      const hubProj = projection([hubCoords[1], hubCoords[0]]);
      const arcsGroup = zoomG.append('g').attr('class', 'arcs');
      const exportFlowScale = d3.scaleSqrt()
        .domain([0, exportMagnitudeMax])
        .range(selectedCountry ? [1.2, 7.2] : [0.5, 4.6]);
      const importFlowScale = d3.scaleSqrt()
        .domain([0, importMagnitudeMax])
        .range(selectedCountry ? [1.2, 7.2] : [0.5, 4.6]);
      const nodeScale = d3.scaleSqrt()
        .domain([0, tradeMagnitudeMax])
        .range(selectedCountry ? [3.6, 7] : [2.2, 4.6]);

      for (const name of flowCountries) {
        const coords = getCountryCoords(name);
        const totals = effectiveTotals[name];
        if (!coords || !totals || !hubProj) continue;

        const targetProj = projection([coords[1], coords[0]]);
        if (!targetProj) continue;

        const dx = targetProj[0] - hubProj[0];
        const dy = targetProj[1] - hubProj[1];
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 1) continue;

        const curvature = dist * 0.3;
        const midX = (hubProj[0] + targetProj[0]) / 2;
        const midY = (hubProj[1] + targetProj[1]) / 2;
        const perpX = (-dy / dist) * curvature;
        const perpY = (dx / dist) * curvature;

        if (totals.exp > 0) {
          arcsGroup.append('path')
            .attr('d', `M ${hubProj[0]},${hubProj[1]} Q ${midX + perpX},${midY + perpY} ${targetProj[0]},${targetProj[1]}`)
            .attr('fill', 'none')
            .attr('stroke', COLORS.exports)
            .attr('stroke-width', exportFlowScale(totals.exp))
            .attr('stroke-opacity', selectedCountry ? 0.82 : 0.28)
            .attr('stroke-linecap', 'round');
        }

        if (totals.imp > 0) {
          arcsGroup.append('path')
            .attr('d', `M ${targetProj[0]},${targetProj[1]} Q ${midX - perpX},${midY - perpY} ${hubProj[0]},${hubProj[1]}`)
            .attr('fill', 'none')
            .attr('stroke', COLORS.imports)
            .attr('stroke-width', importFlowScale(totals.imp))
            .attr('stroke-opacity', selectedCountry ? 0.76 : 0.24)
            .attr('stroke-linecap', 'round');
        }

        arcsGroup.append('circle')
          .attr('cx', targetProj[0])
          .attr('cy', targetProj[1])
          .attr('r', nodeScale(totals.total))
          .attr('fill', totals.balance >= 0 ? COLORS.exports : COLORS.imports)
          .attr('stroke', '#fff8eb')
          .attr('stroke-width', 1);
      }

      if (hubProj) {
        arcsGroup.append('circle')
          .attr('cx', hubProj[0])
          .attr('cy', hubProj[1])
          .attr('r', 5)
          .attr('fill', COLORS.highlight)
          .attr('stroke', '#fff8eb')
          .attr('stroke-width', 1.5);
      }
    }

    if (selectedCountry) {
      const selectedFeature = countries.features.find(
        feature => numIdToName[parseInt(feature.id, 10)] === selectedCountry
      );

      if (selectedFeature) {
        const [[x0, y0], [x1, y1]] = path.bounds(selectedFeature);
        const dx = x1 - x0;
        const dy = y1 - y0;

        if (dx > 0 && dy > 0) {
          const scale = Math.max(1.4, Math.min(5.5, 0.84 / Math.max(dx / width, dy / height)));
          const tx = width / 2 - scale * ((x0 + x1) / 2);
          const ty = height / 2 - scale * ((y0 + y1) / 2);
          const transform = d3.zoomIdentity.translate(tx, ty).scale(scale);
          svg.transition().duration(450).call(zoom.transform, transform);
        }

        const coords = getCountryCoords(selectedCountry);
        const targetProj = coords ? projection([coords[1], coords[0]]) : path.centroid(selectedFeature);
        if (targetProj) {
          const labelValue = selectedCountryTotals ? fmt(selectedCountryTotals.total) : null;
          const labelWidth = Math.max(140, (selectedCountry.length * 7.5) + 52);
          const labelG = zoomG.append('g')
            .attr('class', 'selected-country-chip')
            .attr('transform', `translate(${targetProj[0] + 10}, ${targetProj[1] - 42})`);

          labelG.append('rect')
            .attr('width', labelWidth)
            .attr('height', labelValue ? 42 : 26)
            .attr('rx', 8)
            .attr('fill', 'rgba(0, 48, 73, 0.92)')
            .attr('stroke', 'rgba(255, 248, 235, 0.35)');

          labelG.append('text')
            .attr('x', 10)
            .attr('y', 17)
            .attr('fill', '#fff8eb')
            .attr('font-size', 12)
            .attr('font-weight', 700)
            .text(selectedCountry);

          if (labelValue) {
            labelG.append('text')
              .attr('x', 10)
              .attr('y', 31)
              .attr('fill', '#dbe8ef')
              .attr('font-size', 11)
              .text(`Total: ${labelValue}`);
          }
        }
      }
    }
  }, [
    worldData,
    effectiveTotals,
    selectedCountry,
    numIdToName,
    onSelectCountry,
    hubCoords,
    selectedProduct,
    selectedProductLabel,
    blocHighlight,
    countryTotals,
    containerWidth,
    flowCountries,
    exportMagnitudeMax,
    importMagnitudeMax,
    metricMax,
    showFlows,
    selectedCountryTotals,
    tradeMagnitudeMax,
    viewMode,
  ]);

  return (
    <div className="world-map-container">
      <div className="map-overlay map-overlay-top">
        <div className="map-panel map-mode-panel">
          <span className="map-panel-title">Color by</span>
          <div className="map-segmented">
            {VIEW_MODES.map(mode => (
              <button
                key={mode.key}
                type="button"
                className={`map-segment ${viewMode === mode.key ? 'active' : ''}`}
                onClick={() => setViewMode(mode.key)}
              >
                {mode.label}
              </button>
            ))}
          </div>
        </div>

        <div className="map-panel map-actions-panel">
          <button
            type="button"
            className={`map-action-btn ${showFlows ? 'active' : ''}`}
            onClick={() => setShowFlows(prev => !prev)}
          >
            {showFlows ? 'Hide flows' : 'Show flows'}
          </button>
          <button
            type="button"
            className="map-action-btn"
            onClick={handleResetZoom}
          >
            Reset zoom
          </button>
        </div>
      </div>

      <svg ref={svgRef} className="world-map-svg" />

      <div className="map-overlay map-overlay-bottom">
        <div className="map-panel map-filters-panel">
          <span className="map-panel-title">Active filters</span>
          <div className="map-filter-chips">
            {filterChips.map(chip => (
              <span key={`${chip.label}:${chip.value}`} className="map-chip" title={`${chip.label}: ${chip.value}`}>
                <span className="map-chip-label">{chip.label}</span>
                <span className="map-chip-value">{chip.value}</span>
              </span>
            ))}
          </div>
        </div>

        <div className="map-panel map-legend-panel">
          <div className="map-legend-header">
            <span className="map-panel-title">{getMetricLabel(viewMode)}</span>
            <span className="map-legend-note">
              {showFlows
                ? selectedCountry
                  ? 'Selected-country flows'
                  : `Top ${Math.min(flowCountries.length, GLOBAL_FLOW_LIMIT)} flows`
                : 'Flows hidden'}
            </span>
          </div>
          <div
            className={`map-legend-scale ${viewMode === 'balance' ? 'balance' : ''}`}
            style={{ background: getMetricGradient(viewMode) }}
          />
          <div className="map-legend-labels">
            <span>{legendLabels.min}</span>
            <span>{legendLabels.mid}</span>
            <span>{legendLabels.max}</span>
          </div>
        </div>
      </div>

      <div ref={tooltipRef} className="map-tooltip" style={{ display: 'none' }} />
    </div>
  );
}
