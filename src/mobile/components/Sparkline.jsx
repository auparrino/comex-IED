import { useMemo } from 'react';
import * as d3 from 'd3';

/**
 * Mobile sparkline — exports vs imports as 2 lines.
 * @param {Array<{year, exp, imp}>} data
 * @param {number} width
 * @param {number} height
 */
export default function Sparkline({ data, width = 343, height = 110 }) {
  const { paths, area, ticks, viewBox } = useMemo(() => {
    if (!data || data.length === 0) return { paths: null, area: null, ticks: [], viewBox: `0 0 ${width} ${height}` };
    const m = { top: 8, right: 6, bottom: 18, left: 6 };
    const w = width - m.left - m.right;
    const h = height - m.top - m.bottom;

    const x = d3.scalePoint().domain(data.map(d => d.year)).range([0, w]);
    const yMax = d3.max(data, d => Math.max(d.exp, d.imp)) || 1;
    const y = d3.scaleLinear().domain([0, yMax]).range([h, 0]).nice();

    const lineExp = d3.line().curve(d3.curveMonotoneX).x(d => x(d.year)).y(d => y(d.exp));
    const lineImp = d3.line().curve(d3.curveMonotoneX).x(d => x(d.year)).y(d => y(d.imp));
    const areaExp = d3.area().curve(d3.curveMonotoneX).x(d => x(d.year)).y0(h).y1(d => y(d.exp));

    // Show first, middle, last year as ticks
    const tickYears = data.length <= 3
      ? data.map(d => d.year)
      : [data[0].year, data[Math.floor(data.length / 2)].year, data[data.length - 1].year];

    return {
      paths: { exp: lineExp(data), imp: lineImp(data) },
      area: areaExp(data),
      ticks: tickYears.map(yr => ({ year: yr, x: x(yr) })),
      viewBox: `0 0 ${width} ${height}`,
      m, h,
    };
  }, [data, width, height]);

  if (!paths) {
    return <div className="m-skeleton" style={{ height, borderRadius: 12 }} />;
  }

  return (
    <svg viewBox={viewBox} width="100%" height={height} preserveAspectRatio="none" style={{ display: 'block' }}>
      <g transform="translate(6,8)">
        <path d={area} fill="var(--exports)" fillOpacity="0.12" />
        <path d={paths.exp} fill="none" stroke="var(--exports)" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" />
        <path d={paths.imp} fill="none" stroke="var(--imports)" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" />
      </g>
      {ticks.map((t, i) => {
        const isFirst = i === 0;
        const isLast = i === ticks.length - 1;
        const anchor = isFirst ? 'start' : isLast ? 'end' : 'middle';
        return (
          <text
            key={t.year}
            x={t.x + 6}
            y={height - 4}
            fontSize="10"
            fill="var(--text-muted)"
            textAnchor={anchor}
            fontFamily="Inter, system-ui, sans-serif"
          >
            {t.year}
          </text>
        );
      })}
    </svg>
  );
}
