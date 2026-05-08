import { useRef, useEffect } from 'react';
import * as d3 from 'd3';
import { COLORS } from '../../utils/colors';
import { fmt } from '../../utils/format';
import './TradeTimeline.css';

const COLOR_A = COLORS.exports;
const COLOR_B = '#a05195';

export default function CompareTimeline({ data, selectedYears, labelA, labelB }) {
  const svgRef = useRef();

  useEffect(() => {
    if (!svgRef.current || !data.length) return;

    const container = svgRef.current.parentElement;
    const width = container.clientWidth;
    const height = 130;
    const margin = { top: 14, right: 12, bottom: 22, left: 50 };
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    const svg = d3.select(svgRef.current).attr('viewBox', `0 0 ${width} ${height}`);
    svg.selectAll('*').remove();
    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const x = d3.scalePoint()
      .domain(data.map(d => d.year))
      .range([0, innerW])
      .padding(0.1);

    const maxVal = d3.max(data, d => Math.max(d.aTotal, d.bTotal)) || 1;
    const y = d3.scaleLinear().domain([0, maxVal * 1.1]).range([innerH, 0]);

    g.selectAll('.grid')
      .data(y.ticks(3))
      .join('line')
      .attr('x1', 0).attr('x2', innerW)
      .attr('y1', d => y(d)).attr('y2', d => y(d))
      .attr('stroke', '#d4c4a0')
      .attr('stroke-dasharray', '2,3');

    g.append('g')
      .call(d3.axisLeft(y).ticks(3).tickFormat(d => fmt(d)))
      .call(g => g.select('.domain').remove())
      .call(g => g.selectAll('.tick line').remove())
      .call(g => g.selectAll('text').attr('fill', '#4a6a7a').attr('font-size', '9px'));

    g.append('g')
      .attr('transform', `translate(0,${innerH})`)
      .call(d3.axisBottom(x).tickSize(0))
      .call(g => g.select('.domain').remove())
      .call(g => g.selectAll('text').attr('fill', '#003049').attr('font-size', '9px'));

    const lineA = d3.line()
      .x(d => x(d.year))
      .y(d => y(d.aTotal))
      .curve(d3.curveMonotoneX);

    const lineB = d3.line()
      .x(d => x(d.year))
      .y(d => y(d.bTotal))
      .curve(d3.curveMonotoneX);

    g.append('path')
      .datum(data)
      .attr('d', lineA)
      .attr('fill', 'none')
      .attr('stroke', COLOR_A)
      .attr('stroke-width', 2.2);

    g.append('path')
      .datum(data)
      .attr('d', lineB)
      .attr('fill', 'none')
      .attr('stroke', COLOR_B)
      .attr('stroke-width', 2.2)
      .attr('stroke-dasharray', '4,3');

    g.selectAll('.dot-a')
      .data(data)
      .join('circle')
      .attr('cx', d => x(d.year))
      .attr('cy', d => y(d.aTotal))
      .attr('r', d => selectedYears?.includes(d.year) ? 4 : 2.5)
      .attr('fill', COLOR_A)
      .attr('stroke', '#FDF0D5')
      .attr('stroke-width', 1);

    g.selectAll('.dot-b')
      .data(data)
      .join('circle')
      .attr('cx', d => x(d.year))
      .attr('cy', d => y(d.bTotal))
      .attr('r', d => selectedYears?.includes(d.year) ? 4 : 2.5)
      .attr('fill', COLOR_B)
      .attr('stroke', '#FDF0D5')
      .attr('stroke-width', 1);

    // Mini legend top-right
    const legend = svg.append('g').attr('transform', `translate(${margin.left}, 4)`);
    legend.append('line').attr('x1', 0).attr('x2', 14).attr('y1', 6).attr('y2', 6)
      .attr('stroke', COLOR_A).attr('stroke-width', 2.2);
    legend.append('text').attr('x', 18).attr('y', 9).attr('font-size', '9px').attr('fill', '#003049').text(labelA);
    const offset = 22 + (labelA?.length || 0) * 5.4;
    legend.append('line').attr('x1', offset).attr('x2', offset + 14).attr('y1', 6).attr('y2', 6)
      .attr('stroke', COLOR_B).attr('stroke-width', 2.2).attr('stroke-dasharray', '4,3');
    legend.append('text').attr('x', offset + 18).attr('y', 9).attr('font-size', '9px').attr('fill', '#003049').text(labelB);
  }, [data, selectedYears, labelA, labelB]);

  return (
    <div className="trade-timeline">
      <svg ref={svgRef} />
    </div>
  );
}
