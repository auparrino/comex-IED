import { useEffect, useRef, useMemo, useState } from 'react';
import * as d3 from 'd3';
import * as topojson from 'topojson-client';

// Module-level cache for world topology
let worldDataCache = null;

// ISO2 → numeric (subset matching desktop WorldMap)
const ISO_NUM_MAP = {
  'AF':4,'AL':8,'DZ':12,'AO':24,'AR':32,'AM':51,'AU':36,'AT':40,'AZ':31,
  'BD':50,'BY':112,'BE':56,'BO':68,'BA':70,'BR':76,'BG':100,'KH':116,
  'CM':120,'CA':124,'CL':152,'CN':156,'CO':170,'CR':188,'HR':191,'CU':192,
  'CY':196,'CZ':203,'DK':208,'DO':214,'EC':218,'EG':818,'SV':222,'EE':233,
  'ET':231,'FI':246,'FR':250,'DE':276,'GH':288,'GR':300,'GT':320,'HN':340,
  'HU':348,'IS':352,'IN':356,'ID':360,'IR':364,'IQ':368,'IE':372,'IL':376,
  'IT':380,'JM':388,'JP':392,'JO':400,'KZ':398,'KE':404,'KP':408,'KR':410,
  'KW':414,'LV':428,'LB':422,'LY':434,'LT':440,'LU':442,'MK':807,'MG':450,
  'MY':458,'ML':466,'MX':484,'MD':498,'MN':496,'ME':499,'MA':504,'MZ':508,
  'MM':104,'NA':516,'NP':524,'NL':528,'NZ':554,'NI':558,'NE':562,'NG':566,
  'NO':578,'OM':512,'PK':586,'PA':591,'PG':598,'PY':600,'PE':604,'PH':608,
  'PL':616,'PT':620,'QA':634,'RO':642,'RU':643,'SA':682,'SN':686,'RS':688,
  'SG':702,'SK':703,'SI':705,'SO':706,'ZA':710,'ES':724,'LK':144,'SD':729,
  'SE':752,'CH':756,'SY':760,'TW':158,'TZ':834,'TH':764,'TG':768,'TT':780,
  'TN':788,'TR':792,'UG':800,'UA':804,'AE':784,'GB':826,'US':840,'UY':858,
  'UZ':860,'VE':862,'VN':704,'YE':887,'ZM':894,'ZW':716,
};
const NUM_TO_ISO2 = {};
for (const [iso2, num] of Object.entries(ISO_NUM_MAP)) NUM_TO_ISO2[num] = iso2;

export default function MobileWorldMap({ summary, selectedYears, onSelectCountry, height = 360 }) {
  const ref = useRef(null);
  const [worldData, setWorldData] = useState(worldDataCache);
  const [w, setW] = useState(0);

  // Fetch world topology once
  useEffect(() => {
    if (worldDataCache) { setWorldData(worldDataCache); return; }
    fetch(`${import.meta.env.BASE_URL}data/trade/world-110m.json`)
      .then(r => r.json())
      .then(d => { worldDataCache = d; setWorldData(d); });
  }, []);

  // Width observer
  useEffect(() => {
    const node = ref.current?.parentElement;
    if (!node) return;
    const ro = new ResizeObserver(entries => {
      for (const e of entries) setW(e.contentRect.width);
    });
    ro.observe(node);
    setW(node.clientWidth);
    return () => ro.disconnect();
  }, []);

  // Country totals indexed by iso2.
  // Multiple entries can share an iso2 (e.g. "Brasil" + "Manaos (Brasil)").
  // Prefer the clean name (no parens) so map clicks open the country, not a city.
  const totalsByIso = useMemo(() => {
    if (!summary) return {};
    const result = {};
    for (const [name, info] of Object.entries(summary)) {
      if (name === 'Confidencial' || name === 'Indeterminado (continente)') continue;
      if (!info.iso2) continue;
      let exp = 0, imp = 0;
      for (const yr of selectedYears) {
        exp += info.years?.[yr]?.exp || 0;
        imp += info.years?.[yr]?.imp || 0;
      }
      if (exp <= 0 && imp <= 0) continue;

      const existing = result[info.iso2];
      const isClean = !name.includes('(');
      // First entry, OR clean name replaces a paren'd one, OR same kind keeps the bigger total
      if (!existing) {
        result[info.iso2] = { name, exp, imp, total: exp + imp, balance: exp - imp };
      } else if (isClean && existing.name.includes('(')) {
        result[info.iso2] = { name, exp, imp, total: exp + imp, balance: exp - imp };
      } else if (isClean === !existing.name.includes('(') && (exp + imp) > existing.total) {
        result[info.iso2] = { name, exp, imp, total: exp + imp, balance: exp - imp };
      }
    }
    return result;
  }, [summary, selectedYears]);

  // Render
  useEffect(() => {
    if (!worldData || !ref.current || !w) return;
    const svg = d3.select(ref.current);
    svg.selectAll('*').remove();
    svg.attr('viewBox', `0 0 ${w} ${height}`);

    const projection = d3.geoNaturalEarth1()
      .center([-20, -5])
      .scale(w / 5.5)
      .translate([w / 2, height / 2]);

    const path = d3.geoPath(projection);
    const countries = topojson.feature(worldData, worldData.objects.countries);

    const maxTrade = Math.max(1, ...Object.values(totalsByIso).map(c => c.total));
    const colorScale = d3.scaleSqrt().domain([0, maxTrade]).range([0, 1]);

    const zoomG = svg.append('g');
    const zoom = d3.zoom()
      .scaleExtent([1, 6])
      .on('zoom', (event) => zoomG.attr('transform', event.transform));
    svg.call(zoom);
    svg.style('touch-action', 'none');

    zoomG.selectAll('path.country')
      .data(countries.features)
      .join('path')
      .attr('class', 'country')
      .attr('d', path)
      .attr('fill', d => {
        const iso2 = NUM_TO_ISO2[parseInt(d.id, 10)];
        const t = totalsByIso[iso2];
        if (!t) return '#FDF0D5';
        const intensity = colorScale(t.total);
        const target = t.balance >= 0 ? '#669BBC' : '#C1121F';
        return d3.interpolate('#e8dcc0', target)(intensity);
      })
      .attr('stroke', '#d4c4a0')
      .attr('stroke-width', 0.4)
      .attr('cursor', 'pointer')
      .on('click', (_, d) => {
        const iso2 = NUM_TO_ISO2[parseInt(d.id, 10)];
        const t = totalsByIso[iso2];
        if (t && onSelectCountry) onSelectCountry(t.name);
      });
  }, [worldData, w, height, totalsByIso, onSelectCountry]);

  return <svg ref={ref} width="100%" height={height} style={{ display: 'block', background: 'var(--bg)' }} />;
}
