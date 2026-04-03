import React from "react";
import "./Header.css";

function Header({ activeTabName, onExportCsv }) {
  return (
    <header className="header">
      <div className="header__left">
        <h1 className="header__title">
          Pisubi{" "}
          <span className="header__title-sep">&mdash;</span>{" "}
          <span className="header__title-sub">
            Monitor de Inversion Extranjera Directa en Argentina
          </span>
        </h1>
      </div>
      <div className="header__right">
        {activeTabName && (
          <span className="header__active-tab">{activeTabName}</span>
        )}
        {onExportCsv && (
          <button className="header__export-btn" onClick={onExportCsv}>
            Exportar CSV
          </button>
        )}
      </div>
    </header>
  );
}

export default Header;
