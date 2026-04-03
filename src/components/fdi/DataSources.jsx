import React from "react";
import "./DataSources.css";

const SOURCES = [
  {
    id: "bcra",
    name: "BCRA",
    description: "Posicion y flujos de IED por pais y sector",
    url: "https://www.bcra.gob.ar/estadisticas-estandarizadas-sobre-inversion-extranjera-directa/",
  },
  {
    id: "indec",
    name: "INDEC",
    description: "Balanza de pagos - Cuenta financiera",
    url: "https://www.indec.gob.ar/indec/web/Nivel4-Tema-3-35-45",
  },
  {
    id: "unctad",
    name: "UNCTAD",
    description: "FDI flows and stocks",
    url: "https://unctadstat.unctad.org/datacentre/",
  },
  {
    id: "rigi",
    name: "RIGI",
    description: "Registro de proyectos RIGI",
    url: "https://www.argentina.gob.ar/economia/rigi",
  },
  {
    id: "bora",
    name: "BORA",
    description: "Normas de inversion en Boletin Oficial",
    url: "https://www.boletinoficial.gob.ar",
  },
  {
    id: "prensa",
    name: "Prensa",
    description: "Anuncios de inversion en medios",
    url: null,
  },
];

function freshnessClass(ts) {
  if (!ts) return "gray";
  const diff = (Date.now() - new Date(ts).getTime()) / (1000 * 60 * 60 * 24);
  if (diff < 7) return "green";
  if (diff < 30) return "yellow";
  return "red";
}

function freshnessLabel(ts) {
  if (!ts) return "Sin datos";
  const d = new Date(ts);
  return d.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function handleDownload() {
  const files = ["bcra", "indec", "unctad", "rigi", "bora", "prensa"];
  files.forEach((f) => {
    const a = document.createElement("a");
    a.href = `/data/${f}.json`;
    a.download = `${f}.json`;
    a.click();
  });
}

function DataSources({ freshness = {}, errors = [] }) {
  const errorSet = new Set(errors);

  return (
    <div className="data-sources">
      <div className="data-sources__grid">
        {SOURCES.map((src) => {
          const ts = freshness[src.id];
          const fc = freshnessClass(ts);
          const hasError = errorSet.has(src.id);

          return (
            <div
              key={src.id}
              className={`data-sources__card${hasError ? " data-sources__card--error" : ""}`}
            >
              <div className="data-sources__card-header">
                <span className={`data-sources__freshness data-sources__freshness--${fc}`} />
                <span className="data-sources__name">{src.name}</span>
              </div>
              <p className="data-sources__desc">{src.description}</p>
              <p className="data-sources__ts">{freshnessLabel(ts)}</p>
              {src.url && (
                <a
                  className="data-sources__link"
                  href={src.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Fuente original
                </a>
              )}
              {hasError && (
                <p className="data-sources__error-msg">Fuente no disponible</p>
              )}
            </div>
          );
        })}
      </div>

      <div className="data-sources__methodology">
        <h3 className="card__title">Metodologia</h3>
        <p className="data-sources__methodology-text">
          Los flujos de IED se reportan segun la metodologia del FMI (BPM6). Los datos
          del BCRA corresponden a posiciones y transacciones de inversion directa, mientras
          que INDEC reporta la cuenta financiera de la balanza de pagos. UNCTAD provee
          datos comparativos internacionales. Los anuncios de proyectos (RIGI, BORA, Prensa)
          son recopilados de fuentes publicas y pueden no reflejar desembolsos efectivos.
        </p>
      </div>

      <div className="data-sources__footer">
        <button className="data-sources__download-btn" onClick={handleDownload}>
          Descargar Datos
        </button>
        <p className="data-sources__disclaimer">
          Los datos presentados provienen de fuentes publicas oficiales. Las cifras pueden
          diferir entre fuentes debido a diferencias metodologicas.
        </p>
      </div>
    </div>
  );
}

export default DataSources;
