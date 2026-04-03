import React, { useRef, useEffect, useState, useMemo } from "react";
import * as d3 from "d3";
import { getSectorColor, COUNTRY_COLORS } from "../../utils/colors";
import { fmtUsd } from "../../utils/format";
import "./SankeyChart.css";

const PROVINCE_COLORS = [
  "#17a589", "#1abc9c", "#148f77", "#0e6655", "#117a65",
  "#17a589", "#1abc9c", "#148f77", "#0e6655", "#117a65",
];

function SankeyChart({ flows, projects }) {
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

  // Build sankey data from flows (country->sector) and projects (sector->province)
  const { nodes, links } = useMemo(() => {
    if (!flows || flows.length === 0 || !projects || projects.length === 0) {
      return { nodes: [], links: [] };
    }

    // Top 10 countries by total flow
    const countryTotals = d3.rollup(
      flows,
      (v) => d3.sum(v, (d) => Math.max(0, d.flow_usd_millions || 0)),
      (d) => d.country
    );
    const topCountries = [...countryTotals.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map((d) => d[0]);

    // Sectors present in flows
    const sectors = [...new Set(projects.map((p) => p.sector))].filter(Boolean);

    // Provinces from projects
    const provinces = [...new Set(projects.map((p) => p.province))].filter(Boolean);

    // Build nodes
    const nodeList = [];
    const nodeIndex = {};

    const addNode = (name, column, color) => {
      if (!(name in nodeIndex)) {
        nodeIndex[name] = nodeList.length;
        nodeList.push({ name, column, color });
      }
    };

    topCountries.forEach((c, i) => addNode(c, 0, COUNTRY_COLORS[i % COUNTRY_COLORS.length]));
    sectors.forEach((s) => addNode(s, 1, getSectorColor(s)));
    provinces.forEach((p, i) => addNode(p, 2, PROVINCE_COLORS[i % PROVINCE_COLORS.length]));

    // Country -> Sector links: distribute country flows proportionally by sector shares from projects
    const sectorProjectTotals = d3.rollup(
      projects,
      (v) => d3.sum(v, (d) => d.estimated_usd_millions || 0),
      (d) => d.sector
    );
    const totalProjectValue = d3.sum([...sectorProjectTotals.values()]);

    const linkList = [];

    // Country -> Sector: use country total flow, distribute to sectors by project share
    topCountries.forEach((country) => {
      const countryFlow = countryTotals.get(country) || 0;
      if (countryFlow <= 0) return;
      sectors.forEach((sector) => {
        const sectorShare = totalProjectValue > 0
          ? (sectorProjectTotals.get(sector) || 0) / totalProjectValue
          : 1 / sectors.length;
        const value = countryFlow * sectorShare;
        if (value > 0 && country in nodeIndex && sector in nodeIndex) {
          linkList.push({
            source: nodeIndex[country],
            target: nodeIndex[sector],
            value,
          });
        }
      });
    });

    // Sector -> Province links from projects
    const sectorProvince = d3.rollup(
      projects,
      (v) => d3.sum(v, (d) => d.estimated_usd_millions || 0),
      (d) => d.sector,
      (d) => d.province
    );

    sectorProvince.forEach((provMap, sector) => {
      if (!(sector in nodeIndex)) return;
      provMap.forEach((value, province) => {
        if (value > 0 && province in nodeIndex) {
          linkList.push({
            source: nodeIndex[sector],
            target: nodeIndex[province],
            value,
          });
        }
      });
    });

    return { nodes: nodeList, links: linkList };
  }, [flows, projects]);

  // Draw sankey
  useEffect(() => {
    if (!svgRef.current || dims.width === 0 || nodes.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const margin = { top: 4, right: 4, bottom: 4, left: 4 };
    const w = dims.width - margin.left - margin.right;
    const h = dims.height - margin.top - margin.bottom;
    if (w <= 0 || h <= 0) return;

    svg.attr("width", dims.width).attr("height", dims.height);

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const nodeWidth = 14;
    const nodePadding = 6;
    const colWidth = (w - nodeWidth) / 2;

    // Group nodes by column
    const columns = [[], [], []];
    nodes.forEach((n, i) => columns[n.column].push({ ...n, index: i }));

    // Compute node totals (sum of link values)
    const nodeValues = new Array(nodes.length).fill(0);
    links.forEach((l) => {
      nodeValues[l.source] += l.value;
      nodeValues[l.target] += l.value;
    });

    // Position nodes within columns
    const nodePositions = new Array(nodes.length);

    columns.forEach((col, colIdx) => {
      const x = colIdx * colWidth;
      const totalVal = d3.sum(col, (n) => nodeValues[n.index] || 1);
      const availableH = h - (col.length - 1) * nodePadding;
      let yOffset = 0;

      col.forEach((n) => {
        const val = nodeValues[n.index] || 1;
        const nodeH = Math.max(4, (val / totalVal) * availableH);
        nodePositions[n.index] = {
          x,
          y: yOffset,
          width: nodeWidth,
          height: nodeH,
          ...n,
        };
        yOffset += nodeH + nodePadding;
      });
    });

    const tooltip = d3.select(tooltipRef.current);

    // Draw links
    // Sort links by source y-position for better layout
    const sourceOffsets = new Array(nodes.length).fill(0);
    const targetOffsets = new Array(nodes.length).fill(0);

    const sortedLinks = [...links].sort((a, b) => {
      const ay = nodePositions[a.source]?.y || 0;
      const by = nodePositions[b.source]?.y || 0;
      return ay - by;
    });

    sortedLinks.forEach((link) => {
      const src = nodePositions[link.source];
      const tgt = nodePositions[link.target];
      if (!src || !tgt) return;

      const srcTotal = nodeValues[link.source] || 1;
      const tgtTotal = nodeValues[link.target] || 1;

      const srcH = (link.value / srcTotal) * src.height;
      const tgtH = (link.value / tgtTotal) * tgt.height;

      const y0 = src.y + sourceOffsets[link.source] + srcH / 2;
      const y1 = tgt.y + targetOffsets[link.target] + tgtH / 2;

      sourceOffsets[link.source] += srcH;
      targetOffsets[link.target] += tgtH;

      const x0 = src.x + nodeWidth;
      const x1 = tgt.x;

      const path = d3.linkHorizontal()({
        source: [x0, y0],
        target: [x1, y1],
      });

      g.append("path")
        .attr("d", path)
        .attr("fill", "none")
        .attr("stroke", src.color)
        .attr("stroke-width", Math.max(1, (srcH + tgtH) / 2))
        .attr("stroke-opacity", 0.25)
        .on("mousemove", (event) => {
          tooltip
            .html(
              `${src.name} → ${tgt.name}<br/>${fmtUsd(link.value)}`
            )
            .style("display", "block")
            .style("left", event.offsetX + 12 + "px")
            .style("top", event.offsetY - 10 + "px");
        })
        .on("mouseleave", () => tooltip.style("display", "none"));
    });

    // Draw nodes
    nodePositions.forEach((n) => {
      if (!n) return;
      g.append("rect")
        .attr("x", n.x)
        .attr("y", n.y)
        .attr("width", n.width)
        .attr("height", n.height)
        .attr("fill", n.color)
        .attr("rx", 2);

      // Label
      const labelX = n.column === 0 ? n.x - 4 : n.x + nodeWidth + 4;
      const anchor = n.column === 0 ? "end" : "start";
      const labelY = n.y + n.height / 2;

      if (n.height >= 10) {
        g.append("text")
          .attr("x", labelX)
          .attr("y", labelY)
          .attr("dy", "0.35em")
          .attr("text-anchor", anchor)
          .attr("fill", "var(--text-muted)")
          .attr("font-size", 9)
          .text(n.name.length > 16 ? n.name.slice(0, 14) + ".." : n.name);
      }
    });
  }, [dims, nodes, links]);

  return (
    <div className="sankey-chart">
      <div className="sankey-chart__title">Flujos: Pais → Sector → Provincia</div>
      <div ref={containerRef} className="sankey-chart__container">
        <svg ref={svgRef} className="sankey-chart__svg" />
        <div ref={tooltipRef} className="sankey-chart__tooltip" style={{ display: "none" }} />
      </div>
    </div>
  );
}

export default SankeyChart;
