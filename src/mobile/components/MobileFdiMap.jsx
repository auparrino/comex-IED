import { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import * as topojson from 'topojson-client';

let worldDataCache = null;

// ISO numeric → ISO3 (subset of common countries)
const NUM_TO_ISO3 = {
  4:'AFG',8:'ALB',12:'DZA',24:'AGO',32:'ARG',51:'ARM',36:'AUS',40:'AUT',31:'AZE',
  50:'BGD',112:'BLR',56:'BEL',68:'BOL',70:'BIH',76:'BRA',100:'BGR',116:'KHM',
  120:'CMR',124:'CAN',152:'CHL',156:'CHN',170:'COL',188:'CRI',191:'HRV',192:'CUB',
  196:'CYP',203:'CZE',208:'DNK',214:'DOM',218:'ECU',818:'EGY',222:'SLV',233:'EST',
  231:'ETH',246:'FIN',250:'FRA',276:'DEU',288:'GHA',300:'GRC',320:'GTM',340:'HND',
  348:'HUN',352:'ISL',356:'IND',360:'IDN',364:'IRN',368:'IRQ',372:'IRL',376:'ISR',
  380:'ITA',388:'JAM',392:'JPN',400:'JOR',398:'KAZ',404:'KEN',408:'PRK',410:'KOR',
  414:'KWT',428:'LVA',422:'LBN',434:'LBY',440:'LTU',442:'LUX',807:'MKD',450:'MDG',
  458:'MYS',466:'MLI',484:'MEX',498:'MDA',496:'MNG',499:'MNE',504:'MAR',508:'MOZ',
  104:'MMR',516:'NAM',524:'NPL',528:'NLD',554:'NZL',558:'NIC',562:'NER',566:'NGA',
  578:'NOR',512:'OMN',586:'PAK',591:'PAN',598:'PNG',600:'PRY',604:'PER',608:'PHL',
  616:'POL',620:'PRT',634:'QAT',642:'ROU',643:'RUS',682:'SAU',686:'SEN',688:'SRB',
  702:'SGP',703:'SVK',705:'SVN',706:'SOM',710:'ZAF',724:'ESP',144:'LKA',729:'SDN',
  752:'SWE',756:'CHE',760:'SYR',158:'TWN',834:'TZA',764:'THA',768:'TGO',780:'TTO',
  788:'TUN',792:'TUR',800:'UGA',804:'UKR',784:'ARE',826:'GBR',840:'USA',858:'URY',
  860:'UZB',862:'VEN',704:'VNM',887:'YEM',894:'ZMB',716:'ZWE',
};

export default function MobileFdiMap({ valuesByIso3, height = 360 }) {
  const ref = useRef(null);
  const [worldData, setWorldData] = useState(worldDataCache);
  const [w, setW] = useState(0);

  useEffect(() => {
    if (worldDataCache) { setWorldData(worldDataCache); return; }
    fetch(`${import.meta.env.BASE_URL}data/trade/world-110m.json`)
      .then(r => r.json())
      .then(d => { worldDataCache = d; setWorldData(d); });
  }, []);

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

  const maxVal = useMemo(
    () => Math.max(1, ...Object.values(valuesByIso3 || {}).map(v => Math.abs(v))),
    [valuesByIso3]
  );

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
    const colorScale = d3.scaleSqrt().domain([0, maxVal]).range([0, 1]);

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
        const iso3 = NUM_TO_ISO3[parseInt(d.id, 10)];
        const v = iso3 ? valuesByIso3?.[iso3] : null;
        if (!v) return '#FDF0D5';
        const intensity = colorScale(Math.abs(v));
        const target = v >= 0 ? '#27ae60' : '#C1121F';
        return d3.interpolate('#e8dcc0', target)(intensity);
      })
      .attr('stroke', '#d4c4a0')
      .attr('stroke-width', 0.4);
  }, [worldData, w, height, valuesByIso3, maxVal]);

  return <svg ref={ref} width="100%" height={height} style={{ display: 'block', background: 'var(--bg)' }} />;
}
