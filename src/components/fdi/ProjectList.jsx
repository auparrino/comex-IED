import React, { useMemo } from "react";
import { fmtUsd } from "../../utils/format";
import { getSectorColor } from "../../utils/colors";
import "./ProjectList.css";

const SOURCE_COLORS = {
  RIGI: "#17a589",
  Prensa: "#1a6fa3",
  BORA: "#d4a800",
};

function statusLabel(status) {
  if (status === "approved") return "Aprobado";
  if (status === "announced") return "Anunciado";
  if (status === "under_review") return "En revision";
  return status || "\u2014";
}

function ProjectList({
  projects,
  searchTerm,
  setSearchTerm,
  selectedProject,
  onSelectProject,
}) {
  const filtered = useMemo(() => {
    if (!projects) return [];
    if (!searchTerm.trim()) return projects;
    const q = searchTerm.toLowerCase();
    return projects.filter(
      (p) =>
        (p.project_name && p.project_name.toLowerCase().includes(q)) ||
        (p.company && p.company.toLowerCase().includes(q))
    );
  }, [projects, searchTerm]);

  const totalAmount = useMemo(() => {
    return filtered.reduce(
      (sum, p) => sum + (p.estimated_usd_millions || 0),
      0
    );
  }, [filtered]);

  return (
    <div className="project-list">
      <div className="project-list__header">
        <div className="project-list__search-wrap">
          <svg
            className="project-list__search-icon"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            className="project-list__search"
            type="text"
            placeholder="Buscar proyecto o empresa..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="project-list__summary">
          <span className="project-list__count">{filtered.length} proyectos</span>
          <span className="project-list__total">{fmtUsd(totalAmount)}</span>
        </div>
      </div>
      <div className="project-list__scroll">
        {filtered.map((p) => {
          const sectorColor = getSectorColor(p.sector);
          const sourceColor = SOURCE_COLORS[p.source] || "#64748b";
          const isSelected = selectedProject && selectedProject.id === p.id;

          return (
            <div
              key={p.id}
              className={
                "project-card" + (isSelected ? " project-card--selected" : "")
              }
              onClick={() => onSelectProject(p)}
            >
              <div className="project-card__top">
                <span className="project-card__name">{p.project_name}</span>
                <span className="project-card__amount">
                  {fmtUsd(p.estimated_usd_millions)}
                </span>
              </div>
              <div className="project-card__company">{p.company}</div>
              <div className="project-card__meta">
                <span
                  className="project-card__badge"
                  style={{
                    background: sectorColor + "22",
                    color: sectorColor,
                  }}
                >
                  {p.sector}
                </span>
                <span
                  className="project-card__badge"
                  style={{
                    background: sourceColor + "22",
                    color: sourceColor,
                  }}
                >
                  {p.source}
                </span>
                <span className="project-card__status">
                  {statusLabel(p.status)}
                </span>
              </div>
              {p.province && (
                <div className="project-card__province">{p.province}</div>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="project-list__empty">
            No se encontraron proyectos.
          </div>
        )}
      </div>
    </div>
  );
}

export default ProjectList;
