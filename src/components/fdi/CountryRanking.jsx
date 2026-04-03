import React from "react";
import { fmtUsd } from "../../utils/format";
import "./CountryRanking.css";

function CountryRanking({ countries, metric }) {
  if (!countries || countries.length === 0) {
    return (
      <div className="country-ranking">
        <h3 className="country-ranking__title">Top Inversores</h3>
        <p className="country-ranking__empty">Sin datos para el periodo seleccionado</p>
      </div>
    );
  }

  const maxVal = countries[0]?.value || 1;
  const metricLabel = metric === "stock" ? "Stock IED" : "Flujo IED";

  return (
    <div className="country-ranking">
      <h3 className="country-ranking__title">
        Top Inversores
        <span className="country-ranking__metric">{metricLabel}</span>
      </h3>
      <ul className="country-ranking__list">
        {countries.map((c, i) => {
          const pct = (c.value / maxVal) * 100;
          return (
            <li key={c.country_iso3} className="country-ranking__item">
              <span className="country-ranking__rank">{i + 1}</span>
              <div className="country-ranking__info">
                <div className="country-ranking__row">
                  <span className="country-ranking__name">{c.country}</span>
                  <span className="country-ranking__value">
                    {fmtUsd(c.value)}
                  </span>
                </div>
                <div className="country-ranking__bar-bg">
                  <div
                    className="country-ranking__bar"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default CountryRanking;
