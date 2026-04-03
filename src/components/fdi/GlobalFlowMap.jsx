import React, { useMemo } from "react";
import FlowMap from "./FlowMap";
import CountryRanking from "./CountryRanking";
import "./GlobalFlowMap.css";

/* Country centroid coordinates (ISO3 -> [lat, lng]) */
const COUNTRY_COORDS = {
  USA: [39.8, -98.5],
  BRA: [-14.2, -51.9],
  ESP: [40.5, -3.7],
  NLD: [52.1, 5.3],
  CHL: [-35.7, -71.5],
  GBR: [55.4, -3.4],
  DEU: [51.2, 10.5],
  FRA: [46.2, 2.2],
  CHE: [46.8, 8.2],
  ITA: [41.9, 12.6],
  CAN: [56.1, -106.3],
  MEX: [23.6, -102.6],
  URY: [-32.5, -55.8],
  CHN: [35.9, 104.2],
  JPN: [36.2, 138.3],
  KOR: [35.9, 127.8],
  AUS: [-25.3, 133.8],
  COL: [4.6, -74.3],
  PER: [-9.2, -75.0],
  PAN: [8.5, -80.8],
  LUX: [49.8, 6.1],
  BEL: [50.5, 4.5],
  AUT: [47.5, 14.6],
  SWE: [60.1, 18.6],
  NOR: [60.5, 8.5],
  DNK: [56.3, 9.5],
  FIN: [61.9, 25.7],
  IRL: [53.1, -8.2],
  PRT: [39.4, -8.2],
  ISR: [31.0, 34.9],
  IND: [20.6, 78.9],
  ZAF: [-30.6, 22.9],
  SGP: [1.4, 103.8],
  HKG: [22.4, 114.1],
  ARE: [23.4, 53.8],
  SAU: [23.9, 45.1],
  RUS: [61.5, 105.3],
  BOL: [-16.3, -63.6],
  PRY: [-23.4, -58.4],
  ECU: [-1.8, -78.2],
  VEN: [6.4, -66.6],
  CRI: [9.7, -83.8],
  NZL: [-40.9, 174.9],
  TWN: [23.7, 121.0],
  MYS: [4.2, 101.0],
  THA: [15.9, 100.9],
  PHL: [12.9, 121.8],
  IDN: [-0.8, 113.9],
  EGY: [26.8, 30.8],
  NGA: [9.1, 8.7],
  KEN: [-0.0, 37.9],
  TUR: [38.9, 35.2],
  GRC: [39.1, 21.8],
  POL: [51.9, 19.1],
  CZE: [49.8, 15.5],
  HUN: [47.2, 19.5],
  ROU: [45.9, 24.9],
  BGR: [42.7, 25.5],
  HRV: [45.1, 15.2],
  BMU: [32.3, -64.8],
  CYM: [19.5, -80.6],
  VGB: [18.4, -64.6],
  BHS: [25.0, -77.4],
  CUW: [12.2, -68.9],
  BLZ: [17.2, -88.5],
  ANT: [12.2, -68.9],
};

function GlobalFlowMap({ data, yearRange, metric, selectedSectors }) {
  const aggregated = useMemo(() => {
    if (!data || data.length === 0) return [];

    /* Filter by year range */
    let filtered = data.filter(
      (d) => d.year >= yearRange[0] && d.year <= yearRange[1]
    );

    /* Filter by sectors if any selected */
    if (selectedSectors && selectedSectors.length > 0) {
      filtered = filtered.filter((d) => selectedSectors.includes(d.sector));
    }

    /* Aggregate by country:
       - Stock: use the latest year's value (it's a position, not cumulative)
       - Flow: sum across years */
    const byCountry = {};
    filtered.forEach((d) => {
      const key = d.country_iso3 || d.country;
      if (!byCountry[key]) {
        byCountry[key] = {
          country: d.country,
          country_iso3: d.country_iso3 || key,
          stock: 0,
          stockYear: 0,
          flow: 0,
        };
      }
      const stockVal = d.stock_usd_millions || d.stock || 0;
      const year = d.year || 0;
      if (year >= byCountry[key].stockYear && stockVal > 0) {
        byCountry[key].stock = stockVal;
        byCountry[key].stockYear = year;
      }
      byCountry[key].flow += d.flow_usd_millions || d.flow || 0;
    });

    /* Build array with coordinates */
    return Object.values(byCountry)
      .map((c) => {
        const coords = COUNTRY_COORDS[c.country_iso3];
        if (!coords) return null;
        return {
          country: c.country,
          country_iso3: c.country_iso3,
          lat: coords[0],
          lng: coords[1],
          value: metric === "stock" ? c.stock : c.flow,
        };
      })
      .filter((c) => c !== null && c.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [data, yearRange, metric, selectedSectors]);

  return (
    <div className="global-flow-map">
      <div className="map-container">
        <FlowMap countries={aggregated} metric={metric} />
      </div>
      <div className="ranking-panel">
        <CountryRanking countries={aggregated.slice(0, 15)} metric={metric} />
      </div>
    </div>
  );
}

export default GlobalFlowMap;
