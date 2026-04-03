import React, { useRef, useEffect } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { getSectorColor } from "../../utils/colors";
import { fmtUsd } from "../../utils/format";
import "./ProjectMapView.css";

const ARGENTINA_CENTER = [-63.6, -38.4];
const ARGENTINA_ZOOM = 3.8;

function buildGeoJson(projects) {
  return {
    type: "FeatureCollection",
    features: projects
      .filter((p) => p.lat != null && p.lng != null)
      .map((p) => ({
        type: "Feature",
        properties: {
          id: p.id,
          project_name: p.project_name,
          company: p.company,
          sector: p.sector,
          province: p.province,
          estimated_usd_millions: p.estimated_usd_millions,
          status: p.status,
          source: p.source,
          year: p.year,
          color: getSectorColor(p.sector),
        },
        geometry: {
          type: "Point",
          coordinates: [p.lng, p.lat],
        },
      })),
  };
}

function scaleRadius(amount) {
  if (amount == null || isNaN(amount)) return 6;
  const clamped = Math.max(1, Math.min(amount, 50000));
  return 6 + (clamped / 50000) * 14;
}

function ProjectMapView({ projects, onProjectClick, selectedProject }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const popupRef = useRef(null);

  // Initialize map
  useEffect(() => {
    if (!containerRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        projection: { type: "mercator" },
        sources: {
          "carto-dark": {
            type: "raster",
            tiles: [
              "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
              "https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
            ],
            tileSize: 256,
          },
        },
        layers: [{ id: "carto-dark-layer", type: "raster", source: "carto-dark" }],
      },
      center: ARGENTINA_CENTER,
      zoom: ARGENTINA_ZOOM,
      attributionControl: false,
    });

    map.addControl(new maplibregl.NavigationControl(), "top-right");

    map.on("load", () => {
      map.addSource("projects", {
        type: "geojson",
        data: buildGeoJson([]),
        cluster: true,
        clusterMaxZoom: 10,
        clusterRadius: 50,
      });

      // Cluster circles
      map.addLayer({
        id: "clusters",
        type: "circle",
        source: "projects",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": "#1a6fa3",
          "circle-radius": [
            "step",
            ["get", "point_count"],
            16,
            5,
            22,
            15,
            28,
          ],
          "circle-opacity": 0.7,
          "circle-stroke-width": 1,
          "circle-stroke-color": "rgba(26,111,163,0.4)",
        },
      });

      // Cluster count labels
      map.addLayer({
        id: "cluster-count",
        type: "symbol",
        source: "projects",
        filter: ["has", "point_count"],
        layout: {
          "text-field": "{point_count_abbreviated}",
          "text-size": 12,
        },
        paint: {
          "text-color": "#ffffff",
        },
      });

      // Individual project circles
      map.addLayer({
        id: "project-points",
        type: "circle",
        source: "projects",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-color": ["get", "color"],
          "circle-radius": [
            "interpolate",
            ["linear"],
            ["get", "estimated_usd_millions"],
            1,
            6,
            1000,
            10,
            10000,
            16,
            50000,
            20,
          ],
          "circle-opacity": 0.85,
          "circle-stroke-width": 1.5,
          "circle-stroke-color": "rgba(255,255,255,0.25)",
        },
      });

      // Click on cluster to zoom in
      map.on("click", "clusters", (e) => {
        const features = map.queryRenderedFeatures(e.point, {
          layers: ["clusters"],
        });
        const clusterId = features[0].properties.cluster_id;
        map
          .getSource("projects")
          .getClusterExpansionZoom(clusterId)
          .then((zoom) => {
            map.easeTo({
              center: features[0].geometry.coordinates,
              zoom: zoom,
            });
          });
      });

      // Click on individual project
      map.on("click", "project-points", (e) => {
        const feature = e.features[0];
        const props = feature.properties;
        const coords = feature.geometry.coordinates.slice();

        if (popupRef.current) popupRef.current.remove();

        const statusLabel =
          props.status === "approved"
            ? "Aprobado"
            : props.status === "announced"
            ? "Anunciado"
            : props.status === "under_review"
            ? "En revision"
            : props.status || "—";

        const html = `
          <div class="map-popup">
            <div class="map-popup__name">${props.project_name}</div>
            <div class="map-popup__company">${props.company}</div>
            <div class="map-popup__row">
              <span class="map-popup__sector" style="background:${props.color}22;color:${props.color}">${props.sector}</span>
              <span class="map-popup__amount">${fmtUsd(props.estimated_usd_millions)}</span>
            </div>
            <div class="map-popup__row">
              <span class="map-popup__status">${statusLabel}</span>
              <span class="map-popup__province">${props.province || ""}</span>
            </div>
          </div>
        `;

        popupRef.current = new maplibregl.Popup({
          closeButton: true,
          closeOnClick: true,
          maxWidth: "280px",
        })
          .setLngLat(coords)
          .setHTML(html)
          .addTo(map);

        if (onProjectClick) {
          onProjectClick({
            id: props.id,
            project_name: props.project_name,
            company: props.company,
            sector: props.sector,
            province: props.province,
            estimated_usd_millions: props.estimated_usd_millions,
            status: props.status,
            source: props.source,
            year: props.year,
          });
        }
      });

      // Cursor changes
      map.on("mouseenter", "project-points", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "project-points", () => {
        map.getCanvas().style.cursor = "";
      });
      map.on("mouseenter", "clusters", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "clusters", () => {
        map.getCanvas().style.cursor = "";
      });
    });

    mapRef.current = map;

    return () => {
      if (popupRef.current) popupRef.current.remove();
      map.remove();
    };
  }, []);

  // Update data when projects change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    function updateSource() {
      const src = map.getSource("projects");
      if (src) {
        src.setData(buildGeoJson(projects));
      }
    }

    if (map.isStyleLoaded()) {
      updateSource();
    } else {
      map.once("load", updateSource);
    }
  }, [projects]);

  // Fly to selected project
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedProject) return;
    if (selectedProject.lat != null && selectedProject.lng != null) {
      map.flyTo({
        center: [selectedProject.lng, selectedProject.lat],
        zoom: Math.max(map.getZoom(), 7),
        duration: 800,
      });
    }
  }, [selectedProject]);

  return <div className="project-map-view" ref={containerRef} />;
}

export default ProjectMapView;
