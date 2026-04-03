import { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import * as topojson from 'topojson-client';
import { COLORS } from '../../utils/colors';
import { fmtUsd } from '../../utils/format';
import './FdiWorldMap.css';

let worldDataCache = null;

// ISO3 -> numericId mapping for TopoJSON matching
const ISO3_TO_NUM = {
  USA: 840, BRA: 76, ESP: 724, NLD: 528, CHE: 756, GBR: 826, FRA: 250,
  DEU: 276, ITA: 380, CAN: 124, CHL: 152, MEX: 484, URY: 858, CHN: 156,
  JPN: 392, AUS: 36, KOR: 410, IND: 356, NOR: 578, SWE: 752, DNK: 208,
  FIN: 246, BEL: 56, AUT: 40, PRT: 620, IRL: 372, LUX: 442, COL: 170,
  PER: 604, BOL: 68, PRY: 600, VEN: 862, RUS: 643, ISR: 376, ARE: 784,
  ZAF: 710, SGP: 702, PAN: 591, ECU: 218, CRI: 188, DOM: 214, GTM: 320,
  HND: 340, SLV: 222, NIC: 558, CUB: 192, JAM: 388, TTO: 780, NZL: 554,
  TUR: 792, UKR: 804, GRC: 300, HRV: 191, SVN: 705, SVK: 703, CZE: 203,
  POL: 616, HUN: 348, ROU: 642, IDN: 360, MYS: 458, THA: 764, PHL: 608,
  VNM: 704, EGY: 818, MAR: 504, KWT: 414, SAU: 682, QAT: 634, BHR: 48,
  ARG: 32,
};

// Reverse: numId -> iso3
const NUM_TO_ISO3 = {};
for (const [iso3, num] of Object.entries(ISO3_TO_NUM)) {
  NUM_TO_ISO3[num] = iso3;
}

const HUB_COORDS = {
  ARG: [-63.6, -38.4],
  URY: [-56.0, -34.9],
  PRY: [-58.4, -23.4],
};

export default function FdiWorldMap({ countries, metric, reporterIso3 }) {
  const svgRef = useRef();
  const tooltipRef = useRef();
  const zoomRef = useRef(d3.zoomIdentity);
  const [worldData, setWorldData] = useState(worldDataCache);
  const [width, setWidth] = useState(0);

  // Build lookup: iso3 -> {country, value}
  const countryMap = useMemo(() => {
    const map = {};
    if (!countries) return map;
    for (const c of countries) {
      if (c.country_iso3) map[c.country_iso3] = c;
    }
    return map;
  }, [countries]);

  // ResizeObserver
  useEffect(() => {
    const container = svgRef.current?.parentElement;
    if (!container) return;
    const ro = new ResizeObserver(entries => {
      for (const e of entries) setWidth(e.contentRect.width);
    });
    ro.observe(container);
    setWidth(container.clientWidth);
    return () => ro.disconnect();
  }, []);

  // Fetch world topology
  useEffect(() => {
    if (worldDataCache) { setWorldData(worldDataCache); return; }
    fetch(`${import.meta.env.BASE_URL}data/trade/world-110m.json`)
      .then(r => r.json())
      .then(d => { worldDataCache = d; setWorldData(d); });
  }, []);

  // Main render
  useEffect(() => {
    if (!worldData || !svgRef.current || !width) return;

    const svg = d3.select(svgRef.current);
    const height = Math.min(width * 0.55, window.innerHeight - 200);
    svg.attr('viewBox', `0 0 ${width} ${height}`);
    svg.selectAll('*').remove();

    const projection = d3.geoNaturalEarth1()
      .center([-20, -5])
      .scale(width / 5.5)
      .translate([width / 2, height / 2]);

    const path = d3.geoPath(projection);
    const feats = topojson.feature(worldData, worldData.objects.countries);

    const maxVal = Math.max(1, ...countries.map(c => c.value));
    const colorScale = d3.scaleSqrt().domain([0, maxVal]).range([0, 1]);

    const zoomG = svg.append('g');

    const zoom = d3.zoom()
      .scaleExtent([1, 8])
      .on('zoom', e => {
        zoomG.attr('transform', e.transform);
        zoomRef.current = e.transform;
      });

    svg.call(zoom);
    if (zoomRef.current !== d3.zoomIdentity) {
      svg.call(zoom.transform, zoomRef.current);
    }

    // Draw countries
    zoomG.selectAll('path.country')
      .data(feats.features)
      .join('path')
      .attr('class', 'country')
      .attr('d', path)
      .attr('fill', d => {
        const iso3 = NUM_TO_ISO3[parseInt(d.id, 10)];
        if (iso3 && countryMap[iso3]) {
          const intensity = colorScale(countryMap[iso3].value);
          return d3.interpolate('#e8dcc0', '#27ae60')(intensity);
        }
        return '#e8dcc0';
      })
      .attr('stroke', function(d) {
        const iso3 = NUM_TO_ISO3[parseInt(d.id, 10)];
        if (iso3 === (reporterIso3 || 'ARG')) return COLORS.highlight || '#003049';
        const fill = d3.select(this).attr('fill');
        if (fill === '#e8dcc0') return 'none';
        return fill;
      })
      .attr('stroke-width', d => {
        const iso3 = NUM_TO_ISO3[parseInt(d.id, 10)];
        if (iso3 === (reporterIso3 || 'ARG')) return 2;
        if (iso3 && countryMap[iso3]) return 0.5;
        return 0;
      })
      .style('cursor', d => {
        const iso3 = NUM_TO_ISO3[parseInt(d.id, 10)];
        return (iso3 && countryMap[iso3]) ? 'pointer' : 'default';
      })
      .on('mouseenter', (event, d) => {
        const iso3 = NUM_TO_ISO3[parseInt(d.id, 10)];
        if (!iso3 || !countryMap[iso3]) return;
        const c = countryMap[iso3];
        const total = countries.reduce((s, x) => s + x.value, 0);
        const pct = total > 0 ? ((c.value / total) * 100).toFixed(1) : '0';
        const metricLabel = metric === 'stock' ? 'Stock IED' : 'Flujo IED';
        const tooltip = tooltipRef.current;
        if (tooltip) {
          tooltip.style.display = 'block';
          tooltip.innerHTML = `
            <strong>${c.country}</strong>
            <div class="tt-row"><span class="tt-ied">${metricLabel}:</span> ${fmtUsd(c.value)}</div>
            <div class="tt-row"><span class="tt-pct">${pct}% del total</span></div>
          `;
        }
      })
      .on('mousemove', event => {
        const tooltip = tooltipRef.current;
        if (tooltip) {
          const rect = svgRef.current.parentElement.getBoundingClientRect();
          tooltip.style.left = (event.clientX - rect.left + 12) + 'px';
          tooltip.style.top = (event.clientY - rect.top - 10) + 'px';
        }
      })
      .on('mouseleave', () => {
        if (tooltipRef.current) tooltipRef.current.style.display = 'none';
      });

    // Draw arcs from top investors to Argentina
    const hub = HUB_COORDS[reporterIso3] || HUB_COORDS.ARG;
    const hubProj = projection(hub);
    const arcsGroup = zoomG.append('g').attr('class', 'arcs');
    const topCountries = countries.slice(0, 12);

    for (const c of topCountries) {
      if (!c.lat || !c.lng) continue;
      const targetProj = projection([c.lng, c.lat]);
      if (!targetProj || !hubProj) continue;

      const dx = targetProj[0] - hubProj[0];
      const dy = targetProj[1] - hubProj[1];
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 1) continue;

      const curvature = dist * 0.3;
      const midX = (hubProj[0] + targetProj[0]) / 2;
      const midY = (hubProj[1] + targetProj[1]) / 2;
      const normX = -dy / dist;
      const normY = dx / dist;
      const ctrlX = midX + normX * curvature;
      const ctrlY = midY + normY * curvature;

      const thickness = Math.max(0.5, (c.value / maxVal) * 3);
      const opacity = 0.2 + (c.value / maxVal) * 0.5;

      // Arc from investor to Argentina
      arcsGroup.append('path')
        .attr('d', `M${targetProj[0]},${targetProj[1]} Q${ctrlX},${ctrlY} ${hubProj[0]},${hubProj[1]}`)
        .attr('fill', 'none')
        .attr('stroke', '#27ae60')
        .attr('stroke-width', thickness)
        .attr('stroke-opacity', opacity)
        .attr('stroke-linecap', 'round');

      // Dot at investor country
      const dotR = Math.max(2, (c.value / maxVal) * 5);
      arcsGroup.append('circle')
        .attr('cx', targetProj[0])
        .attr('cy', targetProj[1])
        .attr('r', dotR)
        .attr('fill', '#27ae60')
        .attr('fill-opacity', opacity + 0.15);
    }

    // Argentina hub dot
    arcsGroup.append('circle')
      .attr('cx', hubProj[0])
      .attr('cy', hubProj[1])
      .attr('r', 4)
      .attr('fill', COLORS.highlight || '#003049')
      .attr('fill-opacity', 0.9);

  }, [worldData, width, countries, metric, countryMap, reporterIso3]);

  return (
    <div className="fdi-world-map-container">
      <svg ref={svgRef} preserveAspectRatio="xMidYMid meet" style={{ width: '100%', height: '100%' }} />
      <div ref={tooltipRef} className="map-tooltip" />
    </div>
  );
}
