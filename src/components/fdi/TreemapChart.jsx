import React, { useRef, useEffect, useState, useMemo } from "react";
import * as d3 from "d3";
import { getSectorColor } from "../../utils/colors";
import { fmtUsd } from "../../utils/format";
import "./TreemapChart.css";

function TreemapChart({ data, yearRange }) {
  const containerRef = useRef(null);
  const svgRef = useRef(null);
  const tooltipRef = useRef(null);
  const [dims, setDims] = useState({ width: 0, height: 0 });

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

  const sectorData = useMemo(() => {
    if (!data || data.length === 0) return [];
    const maxYear = yearRange ? yearRange[1] : d3.max(data, (d) => d.year);
    const latestYear = data.filter((d) => d.year === maxYear);
    return latestYear
      .filter((d) => d.stock_usd_millions > 0)
      .sort((a, b) => b.stock_usd_millions - a.stock_usd_millions);
  }, [data, yearRange]);

  useEffect(() => {
    if (!svgRef.current || dims.width === 0 || sectorData.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const w = dims.width;
    const h = dims.height;
    if (w <= 0 || h <= 0) return;

    svg.attr("width", w).attr("height", h);

    const root = d3
      .hierarchy({ children: sectorData })
      .sum((d) => d.stock_usd_millions || 0);

    d3.treemap()
      .size([w, h])
      .padding(2)
      .round(true)(root);

    const tooltip = d3.select(tooltipRef.current);

    const cell = svg
      .selectAll("g")
      .data(root.leaves())
      .enter()
      .append("g")
      .attr("transform", (d) => `translate(${d.x0},${d.y0})`);

    cell
      .append("rect")
      .attr("width", (d) => d.x1 - d.x0)
      .attr("height", (d) => d.y1 - d.y0)
      .attr("fill", (d) => getSectorColor(d.data.sector))
      .attr("opacity", 0.85)
      .attr("rx", 3)
      .on("mousemove", (event, d) => {
        const total = d3.sum(sectorData, (s) => s.stock_usd_millions);
        const pct = total > 0 ? ((d.data.stock_usd_millions / total) * 100).toFixed(1) : 0;
        tooltip
          .html(
            `<strong>${d.data.sector}</strong><br/>` +
            `Stock: ${fmtUsd(d.data.stock_usd_millions)}<br/>` +
            `${pct}% del total`
          )
          .style("display", "block")
          .style("left", event.offsetX + 12 + "px")
          .style("top", event.offsetY - 10 + "px");
      })
      .on("mouseleave", () => {
        tooltip.style("display", "none");
      });

    // Labels inside rectangles (only if large enough)
    cell
      .append("text")
      .attr("x", 4)
      .attr("y", 14)
      .attr("fill", "#fff")
      .attr("font-size", 11)
      .attr("font-weight", 500)
      .attr("pointer-events", "none")
      .text((d) => {
        const cellW = d.x1 - d.x0;
        const cellH = d.y1 - d.y0;
        if (cellW < 60 || cellH < 28) return "";
        return d.data.sector;
      });

    cell
      .append("text")
      .attr("x", 4)
      .attr("y", 28)
      .attr("fill", "rgba(255,255,255,0.7)")
      .attr("font-size", 10)
      .attr("pointer-events", "none")
      .text((d) => {
        const cellW = d.x1 - d.x0;
        const cellH = d.y1 - d.y0;
        if (cellW < 60 || cellH < 40) return "";
        return fmtUsd(d.data.stock_usd_millions);
      });
  }, [dims, sectorData]);

  return (
    <div className="treemap-chart">
      <div className="treemap-chart__title">Composicion Sectorial del Stock de IED</div>
      <div ref={containerRef} className="treemap-chart__container">
        <svg ref={svgRef} className="treemap-chart__svg" />
        <div ref={tooltipRef} className="treemap-chart__tooltip" style={{ display: "none" }} />
      </div>
    </div>
  );
}

export default TreemapChart;
