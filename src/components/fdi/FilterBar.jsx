import React, { useState, useRef, useEffect } from "react";
import "./FilterBar.css";

function FilterBar({
  yearRange,
  setYearRange,
  selectedSectors,
  toggleSector,
  clearSectors,
  metric,
  setMetric,
  availableSectors,
}) {
  const [sectorOpen, setSectorOpen] = useState(false);
  const dropdownRef = useRef(null);

  const MIN_YEAR = 2003;
  const MAX_YEAR = 2024;

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setSectorOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleMinChange(e) {
    const val = Number(e.target.value);
    if (val <= yearRange[1]) {
      setYearRange([val, yearRange[1]]);
    }
  }

  function handleMaxChange(e) {
    const val = Number(e.target.value);
    if (val >= yearRange[0]) {
      setYearRange([yearRange[0], val]);
    }
  }

  const rangePercent = (val) =>
    ((val - MIN_YEAR) / (MAX_YEAR - MIN_YEAR)) * 100;

  return (
    <div className="filterbar">
      {/* Year range */}
      <div className="filterbar__group">
        <label className="filterbar__label">
          Periodo: {yearRange[0]} &ndash; {yearRange[1]}
        </label>
        <div className="filterbar__range-wrap">
          <div
            className="filterbar__range-track"
            style={{
              left: `${rangePercent(yearRange[0])}%`,
              width: `${rangePercent(yearRange[1]) - rangePercent(yearRange[0])}%`,
            }}
          />
          <input
            type="range"
            className="filterbar__range filterbar__range--min"
            min={MIN_YEAR}
            max={MAX_YEAR}
            value={yearRange[0]}
            onChange={handleMinChange}
          />
          <input
            type="range"
            className="filterbar__range filterbar__range--max"
            min={MIN_YEAR}
            max={MAX_YEAR}
            value={yearRange[1]}
            onChange={handleMaxChange}
          />
        </div>
      </div>

      {/* Sector multi-select */}
      <div className="filterbar__group" ref={dropdownRef}>
        <label className="filterbar__label">Sector</label>
        <button
          className="filterbar__select-btn"
          onClick={() => setSectorOpen((o) => !o)}
        >
          {selectedSectors.length === 0
            ? "Todos"
            : `${selectedSectors.length} seleccionado${selectedSectors.length > 1 ? "s" : ""}`}
          <span className="filterbar__chevron">{sectorOpen ? "\u25B2" : "\u25BC"}</span>
        </button>
        {sectorOpen && (
          <div className="filterbar__dropdown">
            <button className="filterbar__clear-btn" onClick={clearSectors}>
              Limpiar
            </button>
            <ul className="filterbar__dropdown-list">
              {availableSectors.map((s) => (
                <li key={s} className="filterbar__dropdown-item">
                  <label className="filterbar__checkbox-label">
                    <input
                      type="checkbox"
                      checked={selectedSectors.includes(s)}
                      onChange={() => toggleSector(s)}
                    />
                    <span>{s}</span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Metric toggle */}
      <div className="filterbar__group">
        <label className="filterbar__label">Metrica</label>
        <div className="filterbar__toggle">
          <button
            className={
              "filterbar__toggle-btn" +
              (metric === "stock" ? " filterbar__toggle-btn--active" : "")
            }
            onClick={() => setMetric("stock")}
          >
            Stock
          </button>
          <button
            className={
              "filterbar__toggle-btn" +
              (metric === "flow" ? " filterbar__toggle-btn--active" : "")
            }
            onClick={() => setMetric("flow")}
          >
            Flow
          </button>
        </div>
      </div>
    </div>
  );
}

export default FilterBar;
