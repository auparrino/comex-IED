import React from "react";
import ErrorBoundary from "./ErrorBoundary";
import TimelineChart from "./TimelineChart";
import TreemapChart from "./TreemapChart";
import SankeyChart from "./SankeyChart";
import ProvinceBarChart from "./ProvinceBarChart";
import "./SectorAnalysis.css";

function SectorAnalysis({ flows, sectors, projects, yearRange }) {
  return (
    <div className="sector-analysis">
      <ErrorBoundary fallbackMessage="Error al cargar el grafico de linea temporal.">
        <TimelineChart data={flows} yearRange={yearRange} />
      </ErrorBoundary>
      <ErrorBoundary fallbackMessage="Error al cargar el treemap sectorial.">
        <TreemapChart data={sectors} yearRange={yearRange} />
      </ErrorBoundary>
      <ErrorBoundary fallbackMessage="Error al cargar el diagrama Sankey.">
        <SankeyChart flows={flows} projects={projects} />
      </ErrorBoundary>
      <ErrorBoundary fallbackMessage="Error al cargar el grafico de provincias.">
        <ProvinceBarChart projects={projects} />
      </ErrorBoundary>
    </div>
  );
}

export default SectorAnalysis;
