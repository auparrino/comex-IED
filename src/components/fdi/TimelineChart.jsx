import React, { useRef, useEffect, useState, useMemo } from "react";
import * as d3 from "d3";
import { PRESIDENTIAL_PERIODS, COUNTRY_COLORS } from "../../utils/colors";
import { fmtUsd } from "../../utils/format";
import "./TimelineChart.css";

function TimelineChart({ data, yearRange }) {
  const containerRef = useRef(null);
  const svgRef = useRef(null);
  const tooltipRef = useRef(null);
  const [dims, setDims] = useState({ width: 0, height: 0 });

  // Observe container size
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setDims({ width, height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Prepare series: Total + top 5 countries
  const { series, years, countryNames } = useMemo(() => {
    if (!data || data.length === 0) return { series: [], years: [], countryNames: [] };

    const [minY, maxY] = yearRange;
    const filtered = data.filter((d) => d.year >= minY && d.year <= maxY);

    // Aggregate total flow per country
    const countryTotals = d3.rollup(
      filtered,
      (v) => d3.sum(v, (d) => d.flow_usd_millions || 0),
      (d) => d.country
    );
    const top5 = [...countryTotals.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map((d) => d[0]);

    // Build year list
    const allYears = [...new Set(filtered.map((d) => d.year))].sort((a, b) => a - b);

    // Build total series
    const totalByYear = d3.rollup(
      filtered,
      (v) => d3.sum(v, (d) => d.flow_usd_millions || 0),
      (d) => d.year
    );

    const totalSeries = {
      name: "Total",
      values: allYears.map((y) => ({ year: y, value: totalByYear.get(y) || 0 })),
    };

    // Build per-country series
    const countrySeries = top5.map((country) => {
      const byYear = d3.rollup(
        filtered.filter((d) => d.country === country),
        (v) => d3.sum(v, (d) => d.flow_usd_millions || 0),
        (d) => d.year
      );
      return {
        name: country,
        values: allYears.map((y) => ({ year: y, value: byYear.get(y) || 0 })),
      };
    });

    return {
      series: [totalSeries, ...countrySeries],
      years: allYears,
      countryNames: ["Total", ...top5],
    };
  }, [data, yearRange]);

  // Draw chart
  useEffect(() => {
    if (!svgRef.current || dims.width === 0 || series.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const margin = { top: 8, right: 16, bottom: 28, left: 52 };
    const w = dims.width - margin.left - margin.right;
    const h = dims.height - margin.top - margin.bottom;
    if (w <= 0 || h <= 0) return;

    const g = svg
      .attr("width", dims.width)
      .attr("height", dims.height)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const xScale = d3.scaleLinear().domain(d3.extent(years)).range([0, w]);
    const yMax = d3.max(series, (s) => d3.max(s.values, (v) => v.value)) || 1;
    const yScale = d3.scaleLinear().domain([0, yMax * 1.05]).range([h, 0]);

    // Presidential period bands
    const [minY, maxY] = yearRange;
    PRESIDENTIAL_PERIODS.forEach((p) => {
      const x0 = Math.max(p.start, minY);
      const x1 = Math.min(p.end, maxY);
      if (x1 <= x0) return;
      g.append("rect")
        .attr("x", xScale(x0))
        .attr("y", 0)
        .attr("width", xScale(x1) - xScale(x0))
        .attr("height", h)
        .attr("fill", p.color)
        .attr("opacity", 0.1);
      g.append("text")
        .attr("x", xScale((x0 + x1) / 2))
        .attr("y", 10)
        .attr("text-anchor", "middle")
        .attr("fill", p.color)
        .attr("opacity", 0.5)
        .attr("font-size", 9)
        .text(p.name);
    });

    // Grid lines
    const yTicks = yScale.ticks(5);
    g.selectAll(".grid-line")
      .data(yTicks)
      .enter()
      .append("line")
      .attr("x1", 0)
      .attr("x2", w)
      .attr("y1", (d) => yScale(d))
      .attr("y2", (d) => yScale(d))
      .attr("stroke", "var(--border)")
      .attr("stroke-opacity", 0.5);

    // Axes
    g.append("g")
      .attr("transform", `translate(0,${h})`)
      .call(
        d3.axisBottom(xScale).ticks(Math.min(years.length, 10)).tickFormat(d3.format("d"))
      )
      .call((g) => g.select(".domain").remove())
      .selectAll("text")
      .attr("fill", "var(--text-muted)")
      .attr("font-size", 11);

    g.append("g")
      .call(d3.axisLeft(yScale).ticks(5).tickFormat((d) => `${d >= 1000 ? (d / 1000).toFixed(0) + "B" : d.toFixed(0) + "M"}`))
      .call((g) => g.select(".domain").remove())
      .selectAll("text")
      .attr("fill", "var(--text-muted)")
      .attr("font-size", 11);

    // Lines
    const lineGen = d3
      .line()
      .x((d) => xScale(d.year))
      .y((d) => yScale(d.value))
      .curve(d3.curveMonotoneX);

    const colorScale = (i) => {
      if (i === 0) return "#e2e8f0"; // Total = white-ish
      return COUNTRY_COLORS[(i - 1) % COUNTRY_COLORS.length];
    };

    series.forEach((s, i) => {
      g.append("path")
        .datum(s.values)
        .attr("fill", "none")
        .attr("stroke", colorScale(i))
        .attr("stroke-width", i === 0 ? 2.5 : 1.5)
        .attr("stroke-dasharray", i === 0 ? "none" : "none")
        .attr("opacity", i === 0 ? 1 : 0.8)
        .attr("d", lineGen);
    });

    // Hover overlay
    const bisect = d3.bisector((d) => d).left;
    const overlay = g
      .append("rect")
      .attr("width", w)
      .attr("height", h)
      .attr("fill", "none")
      .attr("pointer-events", "all");

    const hoverLine = g
      .append("line")
      .attr("y1", 0)
      .attr("y2", h)
      .attr("stroke", "var(--text-dim)")
      .attr("stroke-width", 1)
      .attr("opacity", 0);

    const tooltip = d3.select(tooltipRef.current);

    overlay
      .on("mousemove", (event) => {
        const [mx] = d3.pointer(event);
        const yearVal = xScale.invert(mx);
        const idx = bisect(years, yearVal);
        const yr = years[Math.min(idx, years.length - 1)];
        if (yr == null) return;

        hoverLine.attr("x1", xScale(yr)).attr("x2", xScale(yr)).attr("opacity", 1);

        let html = `<div class="timeline-chart__tooltip-title">${yr}</div>`;
        series.forEach((s, i) => {
          const pt = s.values.find((v) => v.year === yr);
          const val = pt ? pt.value : 0;
          html += `<div class="timeline-chart__tooltip-row">
            <span style="color:${colorScale(i)}">${s.name}</span>
            <span>${fmtUsd(val)}</span>
          </div>`;
        });

        tooltip
          .html(html)
          .style("display", "block")
          .style("left", event.offsetX + 16 + "px")
          .style("top", event.offsetY - 10 + "px");
      })
      .on("mouseleave", () => {
        hoverLine.attr("opacity", 0);
        tooltip.style("display", "none");
      });
  }, [dims, series, years, yearRange]);

  return (
    <div className="timeline-chart">
      <div className="timeline-chart__title">Evolucion de Flujos de IED</div>
      <div className="timeline-chart__legend">
        {countryNames.map((name, i) => (
          <div key={name} className="timeline-chart__legend-item">
            <span
              className="timeline-chart__legend-swatch"
              style={{
                background: i === 0 ? "#e2e8f0" : COUNTRY_COLORS[(i - 1) % COUNTRY_COLORS.length],
              }}
            />
            {name}
          </div>
        ))}
      </div>
      <div ref={containerRef} style={{ flex: 1, position: "relative", minHeight: 0 }}>
        <svg ref={svgRef} className="timeline-chart__svg" />
        <div ref={tooltipRef} className="timeline-chart__tooltip" style={{ display: "none" }} />
      </div>
    </div>
  );
}

export default TimelineChart;
