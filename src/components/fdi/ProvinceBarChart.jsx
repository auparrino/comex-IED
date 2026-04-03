import React, { useRef, useEffect, useState, useMemo } from "react";
import * as d3 from "d3";
import { getSectorColor } from "../../utils/colors";
import { fmtUsd } from "../../utils/format";
import "./ProvinceBarChart.css";

function ProvinceBarChart({ projects }) {
  const containerRef = useRef(null);
  const svgRef = useRef(null);
  const tooltipRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      setContainerWidth(entries[0].contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { provinceData, allSectors } = useMemo(() => {
    if (!projects || projects.length === 0) return { provinceData: [], allSectors: [] };

    // Aggregate by province and sector
    const nested = d3.rollup(
      projects,
      (v) => d3.sum(v, (d) => d.estimated_usd_millions || 0),
      (d) => d.province,
      (d) => d.sector
    );

    const sectors = [...new Set(projects.map((p) => p.sector))].filter(Boolean);

    const rows = [];
    nested.forEach((sectorMap, province) => {
      if (!province) return;
      const total = d3.sum([...sectorMap.values()]);
      const breakdown = {};
      sectorMap.forEach((val, sector) => {
        breakdown[sector] = val;
      });
      rows.push({ province, total, breakdown });
    });

    rows.sort((a, b) => b.total - a.total);

    return { provinceData: rows, allSectors: sectors };
  }, [projects]);

  useEffect(() => {
    if (!svgRef.current || containerWidth === 0 || provinceData.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const margin = { top: 4, right: 16, bottom: 20, left: 110 };
    const barHeight = 22;
    const barGap = 4;
    const totalH = margin.top + margin.bottom + provinceData.length * (barHeight + barGap);
    const w = containerWidth - margin.left - margin.right;

    if (w <= 0) return;

    svg.attr("width", containerWidth).attr("height", totalH);

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const xMax = d3.max(provinceData, (d) => d.total) || 1;
    const xScale = d3.scaleLinear().domain([0, xMax]).range([0, w]);

    const tooltip = d3.select(tooltipRef.current);

    // Draw bars
    provinceData.forEach((row, i) => {
      const y = i * (barHeight + barGap);

      // Province label
      g.append("text")
        .attr("x", -6)
        .attr("y", y + barHeight / 2)
        .attr("dy", "0.35em")
        .attr("text-anchor", "end")
        .attr("fill", "var(--text-muted)")
        .attr("font-size", 11)
        .text(row.province.length > 14 ? row.province.slice(0, 12) + ".." : row.province);

      // Stacked segments
      let xOffset = 0;
      allSectors.forEach((sector) => {
        const val = row.breakdown[sector] || 0;
        if (val <= 0) return;
        const segW = xScale(val);

        g.append("rect")
          .attr("x", xOffset)
          .attr("y", y)
          .attr("width", segW)
          .attr("height", barHeight)
          .attr("fill", getSectorColor(sector))
          .attr("opacity", 0.85)
          .attr("rx", 2)
          .on("mousemove", (event) => {
            tooltip
              .html(
                `<strong>${row.province}</strong><br/>` +
                `${sector}: ${fmtUsd(val)}<br/>` +
                `Total: ${fmtUsd(row.total)}`
              )
              .style("display", "block")
              .style("left", event.offsetX + 12 + "px")
              .style("top", event.offsetY - 10 + "px");
          })
          .on("mouseleave", () => tooltip.style("display", "none"));

        xOffset += segW;
      });

      // Total label at end of bar
      g.append("text")
        .attr("x", xOffset + 6)
        .attr("y", y + barHeight / 2)
        .attr("dy", "0.35em")
        .attr("fill", "var(--text-muted)")
        .attr("font-size", 10)
        .text(fmtUsd(row.total));
    });

    // X axis
    g.append("g")
      .attr(
        "transform",
        `translate(0,${provinceData.length * (barHeight + barGap)})`
      )
      .call(
        d3
          .axisBottom(xScale)
          .ticks(4)
          .tickFormat((d) =>
            d >= 1000 ? `${(d / 1000).toFixed(0)}B` : `${d.toFixed(0)}M`
          )
      )
      .call((g) => g.select(".domain").remove())
      .selectAll("text")
      .attr("fill", "var(--text-muted)")
      .attr("font-size", 11);
  }, [containerWidth, provinceData, allSectors]);

  return (
    <div className="province-bar-chart">
      <div className="province-bar-chart__title">IED por Provincia y Sector</div>
      <div className="province-bar-chart__legend">
        {allSectors.map((s) => (
          <div key={s} className="province-bar-chart__legend-item">
            <span
              className="province-bar-chart__legend-swatch"
              style={{ background: getSectorColor(s) }}
            />
            {s}
          </div>
        ))}
      </div>
      <div ref={containerRef} className="province-bar-chart__container">
        <svg ref={svgRef} className="province-bar-chart__svg" />
        <div
          ref={tooltipRef}
          className="province-bar-chart__tooltip"
          style={{ display: "none" }}
        />
      </div>
    </div>
  );
}

export default ProvinceBarChart;
