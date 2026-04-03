import React from "react";

function DataMissing({ source }) {
  return (
    <div
      style={{
        background: "var(--bg-card)",
        border: "1px solid #b45309",
        borderRadius: 12,
        padding: "16px 24px",
        margin: "12px 0",
        color: "var(--text-secondary)",
        fontSize: 13,
      }}
    >
      <strong style={{ color: "#d4a800" }}>Datos no disponibles</strong>
      <p style={{ margin: "6px 0 0" }}>
        Datos de <em>{source}</em> no disponibles en este momento.
      </p>
    </div>
  );
}

export default DataMissing;
