import React, { useRef, useEffect } from "react";
import * as d3 from "d3";
import "./GdpBarChart.css";

const COUNTRY_META = {
  ARG: { label: "Argentina", color: "#1a6fa3" },
  BRA: { label: "Brasil", color: "#17a589" },
  CHL: { label: "Chile", color: "#d4a800" },
  COL: { label: "Colombia", color: "#C1121F" },
  MEX: { label: "Mexico", color: "#7d3c98" },
  PER: { label: "Peru", color: "#669BBC" },
};

function GdpBarChart({ data, yearRange }) {
  const containerRef = useRef(null);
  const svgRef = useRef(null);

  useEffect(() => {
    if (!data || !data.length || !svgRef.current || !containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = Math.min(380, width * 0.6);
    const margin = { top: 12, right: 40, bottom: 12, left: 80 };
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    const svg = d3.select(svgRef.current);
    svg.attr("width", width).attr("height", height);
    svg.selectAll("*").remove();

    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const [, maxY] = yearRange || d3.extent(data, (d) => d.year);
    const latestYear = maxY;

    // Get latest year data for each country
    const entries = [];
    Object.keys(COUNTRY_META).forEach((iso) => {
      const row = data.find(
        (d) => (d.country_iso3 === iso || d.country === iso || d.iso3 === iso) && d.year === latestYear
      );
      const pctGdp = row?.fdi_inflow_pct_gdp ?? row?.fdi_pct_gdp;
      if (row && pctGdp != null) {
        entries.push({
          iso,
          label: COUNTRY_META[iso].label,
          color: COUNTRY_META[iso].color,
          value: pctGdp,
        });
      }
    });

    entries.sort((a, b) => b.value - a.value);

    if (!entries.length) return;

    const y = d3
      .scaleBand()
      .domain(entries.map((d) => d.label))
      .range([0, innerH])
      .padding(0.3);

    const x = d3
      .scaleLinear()
      .domain([0, d3.max(entries, (d) => d.value) * 1.15])
      .range([0, innerW]);

    // Y axis
    g.append("g")
      .call(d3.axisLeft(y).tickSize(0).tickPadding(8))
      .attr("color", "var(--text-muted)")
      .selectAll("text")
      .attr("font-size", 12)
      .attr("fill", (d) => {
        const e = entries.find((en) => en.label === d);
        return e && e.iso === "ARG" ? "#1a6fa3" : "var(--text-secondary)";
      })
      .attr("font-weight", (d) => {
        const e = entries.find((en) => en.label === d);
        return e && e.iso === "ARG" ? 600 : 400;
      });

    g.select(".domain").remove();

    // Bars
    g.selectAll(".gdp-bar")
      .data(entries)
      .join("rect")
      .attr("class", "gdp-bar")
      .attr("x", 0)
      .attr("y", (d) => y(d.label))
      .attr("height", y.bandwidth())
      .attr("rx", 4)
      .attr("fill", (d) => d.color)
      .attr("opacity", (d) => (d.iso === "ARG" ? 1 : 0.7))
      .attr("stroke", (d) => (d.iso === "ARG" ? "#60a5fa" : "none"))
      .attr("stroke-width", (d) => (d.iso === "ARG" ? 1.5 : 0))
      .attr("width", 0)
      .transition()
      .duration(700)
      .ease(d3.easeCubicOut)
      .attr("width", (d) => x(d.value));

    // Value labels
    g.selectAll(".gdp-label")
      .data(entries)
      .join("text")
      .attr("class", "gdp-label")
      .attr("x", (d) => x(d.value) + 8)
      .attr("y", (d) => y(d.label) + y.bandwidth() / 2)
      .attr("dy", "0.35em")
      .attr("font-size", 12)
      .attr("font-weight", 500)
      .attr("fill", "var(--text-secondary)")
      .text((d) => `${d.value.toFixed(1)}%`);

    // Year annotation
    g.append("text")
      .attr("x", innerW)
      .attr("y", innerH + 4)
      .attr("text-anchor", "end")
      .attr("fill", "var(--text-dim)")
      .attr("font-size", 11)
      .text(latestYear);
  }, [data, yearRange]);

  return (
    <div className="gdp-bar-chart card">
      <h3 className="card__title">IED como % del PBI</h3>
      <div className="gdp-bar-chart__container" ref={containerRef}>
        <svg ref={svgRef} />
      </div>
    </div>
  );
}

export default GdpBarChart;
