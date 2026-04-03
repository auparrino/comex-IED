import React from "react";
import ComparisonLineChart from "./ComparisonLineChart";
import GdpBarChart from "./GdpBarChart";
import BarChartRace from "./BarChartRace";
import "./BenchmarkView.css";

function BenchmarkView({ data, yearRange }) {
  return (
    <div className="benchmark-view">
      <div className="benchmark-view__grid">
        <div className="benchmark-view__cell">
          <ComparisonLineChart data={data} yearRange={yearRange} />
        </div>
        <div className="benchmark-view__cell">
          <GdpBarChart data={data} yearRange={yearRange} />
        </div>
        <div className="benchmark-view__cell benchmark-view__cell--full">
          <BarChartRace data={data} yearRange={yearRange} />
        </div>
      </div>
    </div>
  );
}

export default BenchmarkView;
