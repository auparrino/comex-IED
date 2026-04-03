import React from "react";
import "./TabNav.css";

const TABS = [
  { id: "flujos", label: "Flujos Globales" },
  { id: "proyectos", label: "Proyectos Argentina" },
  { id: "sectorial", label: "Analisis Sectorial" },
  { id: "benchmark", label: "Benchmark Regional" },
  { id: "fuentes", label: "Fuentes" },
];

function TabNav({ activeTab, onTabChange }) {
  return (
    <nav className="tabnav">
      <div className="tabnav__list">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={
              "tabnav__tab" + (activeTab === tab.id ? " tabnav__tab--active" : "")
            }
            onClick={() => onTabChange(tab.id)}
          >
            {tab.icon && <span className="tabnav__icon">{tab.icon}</span>}
            {tab.label}
          </button>
        ))}
      </div>
    </nav>
  );
}

TabNav.TABS = TABS;

export default TabNav;
