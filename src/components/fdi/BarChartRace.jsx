import React, { useRef, useEffect, useState, useCallback } from "react";
import * as d3 from "d3";
import "./BarChartRace.css";

const COUNTRY_META = {
  ARG: { label: "Argentina", color: "#1a6fa3" },
  BRA: { label: "Brasil", color: "#17a589" },
  CHL: { label: "Chile", color: "#d4a800" },
  COL: { label: "Colombia", color: "#C1121F" },
  MEX: { label: "Mexico", color: "#7d3c98" },
  PER: { label: "Peru", color: "#669BBC" },
};

function BarChartRace({ data, yearRange }) {
  const containerRef = useRef(null);
  const svgRef = useRef(null);
  const timerRef = useRef(null);
  const [currentYear, setCurrentYear] = useState(null);
  const [playing, setPlaying] = useState(false);
  const yearsRef = useRef([]);

  // Prepare data by year
  const byYear = useRef({});
  useEffect(() => {
    if (!data || !data.length) return;
    const [minY, maxY] = yearRange || d3.extent(data, (d) => d.year);
    const yrs = [];
    const map = {};
    for (let yr = minY; yr <= maxY; yr++) {
      yrs.push(yr);
      const entries = [];
      Object.keys(COUNTRY_META).forEach((iso) => {
        const row = data.find(
          (d) => (d.country_iso3 === iso || d.country === iso || d.iso3 === iso) && d.year === yr
        );
        entries.push({
          iso,
          label: COUNTRY_META[iso].label,
          color: COUNTRY_META[iso].color,
          value: row ? (row.fdi_inflow_usd_millions ?? row.fdi_inflow ?? row.value ?? 0) : 0,
        });
      });
      entries.sort((a, b) => b.value - a.value);
      map[yr] = entries;
    }
    yearsRef.current = yrs;
    byYear.current = map;
    setCurrentYear(yrs[0]);
  }, [data, yearRange]);

  const drawYear = useCallback(
    (year) => {
      if (!svgRef.current || !containerRef.current) return;
      const entries = byYear.current[year];
      if (!entries) return;

      const container = containerRef.current;
      const width = container.clientWidth;
      const height = Math.min(320, width * 0.4);
      const margin = { top: 8, right: 70, bottom: 8, left: 80 };
      const innerW = width - margin.left - margin.right;
      const innerH = height - margin.top - margin.bottom;

      const svg = d3.select(svgRef.current);
      svg.attr("width", width).attr("height", height);

      let g = svg.select(".race-g");
      if (g.empty()) {
        g = svg.append("g").attr("class", "race-g").attr("transform", `translate(${margin.left},${margin.top})`);
      }

      const y = d3
        .scaleBand()
        .domain(entries.map((d) => d.label))
        .range([0, innerH])
        .padding(0.25);

      const maxVal = d3.max(entries, (d) => Math.abs(d.value)) || 1;
      const x = d3.scaleLinear().domain([0, maxVal * 1.1]).range([0, innerW]);

      // Bars
      const bars = g.selectAll(".race-bar").data(entries, (d) => d.iso);
      bars
        .join(
          (enter) =>
            enter
              .append("rect")
              .attr("class", "race-bar")
              .attr("x", 0)
              .attr("y", (d) => y(d.label))
              .attr("height", y.bandwidth())
              .attr("width", 0)
              .attr("rx", 4)
              .attr("fill", (d) => d.color)
              .attr("opacity", (d) => (d.iso === "ARG" ? 1 : 0.7))
              .attr("stroke", (d) => (d.iso === "ARG" ? "#1a6fa3" : "none"))
              .attr("stroke-width", (d) => (d.iso === "ARG" ? 1.5 : 0)),
          (update) => update,
          (exit) => exit.remove()
        )
        .transition()
        .duration(600)
        .ease(d3.easeCubicOut)
        .attr("y", (d) => y(d.label))
        .attr("height", y.bandwidth())
        .attr("width", (d) => Math.max(0, x(Math.abs(d.value))))
        .attr("fill", (d) => d.color);

      // Labels (country names)
      const labels = g.selectAll(".race-label").data(entries, (d) => d.iso);
      labels
        .join(
          (enter) =>
            enter
              .append("text")
              .attr("class", "race-label")
              .attr("x", -8)
              .attr("text-anchor", "end")
              .attr("font-size", 12)
              .attr("dy", "0.35em"),
          (update) => update,
          (exit) => exit.remove()
        )
        .transition()
        .duration(600)
        .attr("y", (d) => y(d.label) + y.bandwidth() / 2)
        .attr("fill", (d) => (d.iso === "ARG" ? "#1a6fa3" : "var(--text-secondary)"))
        .attr("font-weight", (d) => (d.iso === "ARG" ? 600 : 400))
        .text((d) => d.label);

      // Value labels
      const vals = g.selectAll(".race-val").data(entries, (d) => d.iso);
      vals
        .join(
          (enter) =>
            enter
              .append("text")
              .attr("class", "race-val")
              .attr("font-size", 11)
              .attr("dy", "0.35em")
              .attr("fill", "var(--text-muted)"),
          (update) => update,
          (exit) => exit.remove()
        )
        .transition()
        .duration(600)
        .attr("x", (d) => Math.max(0, x(Math.abs(d.value))) + 8)
        .attr("y", (d) => y(d.label) + y.bandwidth() / 2)
        .text((d) => (d.value != null ? d.value.toLocaleString("es-AR") : "-"));

      // Year watermark
      let yearText = svg.select(".race-year-watermark");
      if (yearText.empty()) {
        yearText = svg
          .append("text")
          .attr("class", "race-year-watermark")
          .attr("text-anchor", "end")
          .attr("font-size", 64)
          .attr("font-weight", 700)
          .attr("fill", "var(--border)")
          .attr("opacity", 0.5);
      }
      yearText
        .attr("x", width - 24)
        .attr("y", height - 16)
        .text(year);
    },
    []
  );

  // Draw whenever year changes
  useEffect(() => {
    if (currentYear != null) drawYear(currentYear);
  }, [currentYear, drawYear]);

  // Auto-play
  useEffect(() => {
    if (!playing) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    const years = yearsRef.current;
    if (!years.length) return;

    timerRef.current = setInterval(() => {
      setCurrentYear((prev) => {
        const idx = years.indexOf(prev);
        if (idx >= years.length - 1) {
          setPlaying(false);
          return prev;
        }
        return years[idx + 1];
      });
    }, 1500);

    return () => clearInterval(timerRef.current);
  }, [playing]);

  // Auto-play on mount
  useEffect(() => {
    if (yearsRef.current.length > 1) {
      const t = setTimeout(() => setPlaying(true), 600);
      return () => clearTimeout(t);
    }
  }, [data]);

  const handleToggle = () => {
    if (!playing) {
      const years = yearsRef.current;
      if (currentYear === years[years.length - 1]) {
        setCurrentYear(years[0]);
      }
    }
    setPlaying((p) => !p);
  };

  return (
    <div className="bar-chart-race card">
      <div className="bar-chart-race__header">
        <h3 className="card__title">Ranking de IED en America Latina</h3>
        <button className="bar-chart-race__btn" onClick={handleToggle}>
          {playing ? "Pausa" : "Reproducir"}
        </button>
      </div>
      <div className="bar-chart-race__container" ref={containerRef}>
        <svg ref={svgRef} />
      </div>
    </div>
  );
}

export default BarChartRace;
