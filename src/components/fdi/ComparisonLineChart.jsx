import React, { useRef, useEffect, useState } from "react";
import * as d3 from "d3";
import { PRESIDENTIAL_PERIODS } from "../../utils/colors";
import "./ComparisonLineChart.css";

const COUNTRY_KEYS = [
  { key: "ARG", label: "Argentina", color: "#1a6fa3" },
  { key: "BRA", label: "Brasil", color: "#17a589" },
  { key: "CHL", label: "Chile", color: "#d4a800" },
  { key: "COL", label: "Colombia", color: "#C1121F" },
  { key: "MEX", label: "Mexico", color: "#7d3c98" },
  { key: "PER", label: "Peru", color: "#669BBC" },
];

function ComparisonLineChart({ data, yearRange }) {
  const containerRef = useRef(null);
  const svgRef = useRef(null);
  const [tooltip, setTooltip] = useState(null);

  useEffect(() => {
    if (!data || !data.length || !svgRef.current || !containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = Math.min(400, width * 0.55);
    const margin = { top: 12, right: 20, bottom: 32, left: 60 };
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    const svg = d3.select(svgRef.current);
    svg.attr("width", width).attr("height", height);
    svg.selectAll("*").remove();

    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const [minY, maxY] = yearRange || d3.extent(data, (d) => d.year);
    const filtered = data.filter((d) => d.year >= minY && d.year <= maxY);

    const years = [...new Set(filtered.map((d) => d.year))].sort((a, b) => a - b);

    const byCountry = {};
    COUNTRY_KEYS.forEach(({ key }) => {
      byCountry[key] = [];
    });
    filtered.forEach((d) => {
      const k = d.country_iso3 || d.iso3 || d.country;
      if (byCountry[k]) {
        byCountry[k].push({ year: d.year, value: d.fdi_inflow_usd_millions ?? d.fdi_inflow ?? d.value ?? 0 });
      }
    });

    const allValues = Object.values(byCountry).flat().map((d) => d.value);

    const x = d3.scaleLinear().domain([minY, maxY]).range([0, innerW]);
    const y = d3
      .scaleLinear()
      .domain([Math.min(0, d3.min(allValues) || 0), d3.max(allValues) || 100])
      .nice()
      .range([innerH, 0]);

    // Presidential period bands
    PRESIDENTIAL_PERIODS.forEach((p) => {
      const pStart = Math.max(p.start, minY);
      const pEnd = Math.min(p.end, maxY);
      if (pStart < pEnd) {
        g.append("rect")
          .attr("x", x(pStart))
          .attr("y", 0)
          .attr("width", x(pEnd) - x(pStart))
          .attr("height", innerH)
          .attr("fill", p.color)
          .attr("opacity", 0.07);
        g.append("text")
          .attr("x", x((pStart + pEnd) / 2))
          .attr("y", innerH + 24)
          .attr("text-anchor", "middle")
          .attr("fill", p.color)
          .attr("font-size", 9)
          .attr("opacity", 0.7)
          .text(p.name);
      }
    });

    // Axes
    const xAxis = d3
      .axisBottom(x)
      .ticks(Math.min(years.length, 10))
      .tickFormat(d3.format("d"));
    const yAxis = d3
      .axisLeft(y)
      .ticks(6)
      .tickFormat((d) => {
        if (Math.abs(d) >= 1000) return `${(d / 1000).toFixed(0)}k`;
        return d;
      });

    g.append("g")
      .attr("transform", `translate(0,${innerH})`)
      .call(xAxis)
      .attr("color", "var(--text-muted)")
      .selectAll("text")
      .attr("font-size", 11);

    g.append("g")
      .call(yAxis)
      .attr("color", "var(--text-muted)")
      .selectAll("text")
      .attr("font-size", 11);

    // Y axis label
    g.append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", -48)
      .attr("x", -innerH / 2)
      .attr("text-anchor", "middle")
      .attr("fill", "var(--text-muted)")
      .attr("font-size", 11)
      .text("USD millones");

    // Lines
    const line = d3
      .line()
      .x((d) => x(d.year))
      .y((d) => y(d.value))
      .curve(d3.curveMonotoneX)
      .defined((d) => d.value != null);

    COUNTRY_KEYS.forEach(({ key, color }) => {
      const pts = byCountry[key].sort((a, b) => a.year - b.year);
      if (!pts.length) return;

      g.append("path")
        .datum(pts)
        .attr("fill", "none")
        .attr("stroke", color)
        .attr("stroke-width", key === "ARG" ? 3 : 1.5)
        .attr("opacity", key === "ARG" ? 1 : 0.75)
        .attr("d", line);
    });

    // Hover overlay
    const overlay = g
      .append("rect")
      .attr("width", innerW)
      .attr("height", innerH)
      .attr("fill", "none")
      .attr("pointer-events", "all");

    const hoverLine = g
      .append("line")
      .attr("y1", 0)
      .attr("y2", innerH)
      .attr("stroke", "var(--text-dim)")
      .attr("stroke-width", 1)
      .attr("stroke-dasharray", "4,3")
      .attr("display", "none");

    overlay
      .on("mousemove", (event) => {
        const [mx] = d3.pointer(event);
        const hoveredYear = Math.round(x.invert(mx));
        const clamped = Math.max(minY, Math.min(maxY, hoveredYear));

        hoverLine.attr("x1", x(clamped)).attr("x2", x(clamped)).attr("display", null);

        const values = {};
        COUNTRY_KEYS.forEach(({ key, label, color: c }) => {
          const pt = byCountry[key].find((d) => d.year === clamped);
          if (pt) values[label] = { value: pt.value, color: c };
        });

        const rect = container.getBoundingClientRect();
        setTooltip({
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
          year: clamped,
          values,
        });
      })
      .on("mouseleave", () => {
        hoverLine.attr("display", "none");
        setTooltip(null);
      });
  }, [data, yearRange]);

  return (
    <div className="comparison-line-chart card">
      <h3 className="card__title">Flujos de IED - Comparativo Regional</h3>
      <div className="comparison-line-chart__legend">
        {COUNTRY_KEYS.map(({ key, label, color }) => (
          <span key={key} className="comparison-line-chart__legend-item">
            <span
              className="comparison-line-chart__legend-swatch"
              style={{
                background: color,
                width: key === "ARG" ? 18 : 14,
                height: key === "ARG" ? 3 : 2,
              }}
            />
            {label}
          </span>
        ))}
      </div>
      <div className="comparison-line-chart__container" ref={containerRef}>
        <svg ref={svgRef} />
        {tooltip && (
          <div
            className="comparison-line-chart__tooltip"
            style={{ left: tooltip.x + 12, top: tooltip.y - 10 }}
          >
            <div className="comparison-line-chart__tooltip-year">{tooltip.year}</div>
            {Object.entries(tooltip.values).map(([label, { value, color }]) => (
              <div key={label} className="comparison-line-chart__tooltip-row">
                <span
                  className="comparison-line-chart__tooltip-dot"
                  style={{ background: color }}
                />
                <span className="comparison-line-chart__tooltip-label">{label}</span>
                <span className="comparison-line-chart__tooltip-val">
                  {value != null ? value.toLocaleString("es-AR") : "-"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default ComparisonLineChart;
