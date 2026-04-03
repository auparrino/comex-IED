import React, { useEffect, useRef, useState, useCallback } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { fmtUsd } from "../../utils/format";
import "./FlowMap.css";

const ARGENTINA = { lat: -38.4, lng: -63.6 };
const STYLE_URL = {
  version: 8,
  name: "Light",
  projection: { type: "mercator" },
  sources: {
    "carto-light": {
      type: "raster",
      tiles: [
        "https://a.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}@2x.png",
        "https://b.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}@2x.png",
      ],
      tileSize: 256,
      attribution: "&copy; CARTO &copy; OSM contributors",
    },
  },
  layers: [
    {
      id: "carto-light-layer",
      type: "raster",
      source: "carto-light",
      minzoom: 0,
      maxzoom: 20,
    },
  ],
};

/**
 * Compute a quadratic bezier control point that bows outward
 * (perpendicular to the line connecting source and target).
 */
function arcControlPoint(sx, sy, tx, ty) {
  const mx = (sx + tx) / 2;
  const my = (sy + ty) / 2;
  const dx = tx - sx;
  const dy = ty - sy;
  const dist = Math.sqrt(dx * dx + dy * dy);
  /* perpendicular offset - scale with distance */
  const offset = Math.max(dist * 0.3, 30);
  /* perpendicular direction (rotate 90 deg) */
  const nx = -dy / dist;
  const ny = dx / dist;
  return { cx: mx + nx * offset, cy: my + ny * offset };
}

/**
 * Build an SVG quadratic bezier path string.
 */
function arcPath(sx, sy, tx, ty) {
  const { cx, cy } = arcControlPoint(sx, sy, tx, ty);
  return `M${sx},${sy} Q${cx},${cy} ${tx},${ty}`;
}

function FlowMap({ countries, metric }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const svgRef = useRef(null);
  const tooltipRef = useRef(null);
  const [mapReady, setMapReady] = useState(false);

  /* Initialize the MapLibre map once */
  useEffect(() => {
    if (!containerRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: STYLE_URL,
      center: [-30, 10],
      zoom: 1.5,
      minZoom: 1,
      maxZoom: 8,
      attributionControl: false,
    });

    map.addControl(new maplibregl.NavigationControl(), "top-left");

    map.on("load", () => {
      setMapReady(true);
    });

    mapRef.current = map;

    return () => {
      setMapReady(false);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  /* Draw arcs whenever countries change or map moves */
  const drawArcs = useCallback(() => {
    const map = mapRef.current;
    const svg = svgRef.current;
    if (!map || !svg || !countries || countries.length === 0) return;

    const canvas = map.getCanvas();
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    svg.setAttribute("width", width);
    svg.setAttribute("height", height);
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);

    const maxVal = Math.max(...countries.map((c) => c.value));
    const targetPx = map.project([ARGENTINA.lng, ARGENTINA.lat]);

    /* Total for percentage */
    const total = countries.reduce((s, c) => s + c.value, 0);

    let paths = "";
    let circles = "";

    countries.forEach((c) => {
      const srcPx = map.project([c.lng, c.lat]);
      const thickness = Math.max(1, (c.value / maxVal) * 5);
      const opacity = 0.25 + (c.value / maxVal) * 0.55;
      const d = arcPath(srcPx.x, srcPx.y, targetPx.x, targetPx.y);

      paths += `<path d="${d}" fill="none" stroke="var(--accent-blue-light)"
        stroke-width="${thickness}" stroke-opacity="${opacity}"
        stroke-linecap="round" class="flow-arc"
        data-country="${c.country}" data-value="${c.value}"
        data-pct="${((c.value / total) * 100).toFixed(1)}" />`;

      /* Source dot */
      const r = Math.max(3, (c.value / maxVal) * 8);
      circles += `<circle cx="${srcPx.x}" cy="${srcPx.y}" r="${r}"
        fill="var(--accent-blue)" fill-opacity="${opacity + 0.15}"
        class="flow-dot"
        data-country="${c.country}" data-value="${c.value}"
        data-pct="${((c.value / total) * 100).toFixed(1)}" />`;
    });

    /* Argentina target dot */
    circles += `<circle cx="${targetPx.x}" cy="${targetPx.y}" r="6"
      fill="var(--accent-green)" fill-opacity="0.9" class="target-dot" />`;

    svg.innerHTML = paths + circles;
  }, [countries]);

  /* Redraw arcs on map movement */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    drawArcs();

    const handler = () => drawArcs();
    map.on("move", handler);
    map.on("resize", handler);

    return () => {
      map.off("move", handler);
      map.off("resize", handler);
    };
  }, [mapReady, drawArcs]);

  /* Tooltip handling */
  useEffect(() => {
    const svg = svgRef.current;
    const tooltip = tooltipRef.current;
    if (!svg || !tooltip) return;

    function showTooltip(e) {
      const el = e.target;
      if (!el.dataset.country) return;
      const val = parseFloat(el.dataset.value);
      const pct = el.dataset.pct;
      const metricLabel = metric === "stock" ? "Stock" : "Flujo";
      tooltip.innerHTML = `
        <div class="flow-tooltip__country">${el.dataset.country}</div>
        <div class="flow-tooltip__row">${metricLabel}: ${fmtUsd(val)}</div>
        <div class="flow-tooltip__row">${pct}% del total</div>
      `;
      tooltip.style.opacity = "1";
      tooltip.style.left = `${e.clientX + 12}px`;
      tooltip.style.top = `${e.clientY - 10}px`;
    }

    function hideTooltip() {
      tooltip.style.opacity = "0";
    }

    function moveTooltip(e) {
      if (tooltip.style.opacity === "1") {
        tooltip.style.left = `${e.clientX + 12}px`;
        tooltip.style.top = `${e.clientY - 10}px`;
      }
    }

    svg.addEventListener("mouseover", showTooltip);
    svg.addEventListener("mouseout", hideTooltip);
    svg.addEventListener("mousemove", moveTooltip);

    return () => {
      svg.removeEventListener("mouseover", showTooltip);
      svg.removeEventListener("mouseout", hideTooltip);
      svg.removeEventListener("mousemove", moveTooltip);
    };
  }, [metric]);

  return (
    <div className="flow-map-wrapper">
      <div ref={containerRef} className="flow-map__gl" />
      <svg
        ref={svgRef}
        className="flow-map__svg"
        xmlns="http://www.w3.org/2000/svg"
      />
      <div ref={tooltipRef} className="flow-tooltip" />
    </div>
  );
}

export default FlowMap;
