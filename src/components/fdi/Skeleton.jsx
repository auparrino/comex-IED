import React from "react";
import "./Skeleton.css";

function SkeletonCard() {
  return (
    <div className="skeleton skeleton-card">
      <div className="skeleton__line skeleton__line--short" />
      <div className="skeleton__line skeleton__line--wide" />
      <div className="skeleton__line skeleton__line--medium" />
    </div>
  );
}

function SkeletonChart() {
  return (
    <div className="skeleton skeleton-chart">
      <div className="skeleton__bar-group">
        {[40, 65, 50, 80, 55, 70, 45].map((h, i) => (
          <div
            key={i}
            className="skeleton__bar"
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
    </div>
  );
}

function SkeletonMap() {
  return (
    <div className="skeleton skeleton-map">
      <div className="skeleton__circle" />
    </div>
  );
}

export default SkeletonCard;
export { SkeletonCard, SkeletonChart, SkeletonMap };
