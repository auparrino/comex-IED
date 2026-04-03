import React, { useState, useMemo } from "react";
import ProjectMapView from "./ProjectMapView";
import ProjectList from "./ProjectList";
import "./ProjectMap.css";

function ProjectMap({ projects, selectedSectors, yearRange }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProject, setSelectedProject] = useState(null);

  const filteredProjects = useMemo(() => {
    if (!projects) return [];
    return projects.filter((p) => {
      const inYear = p.year >= yearRange[0] && p.year <= yearRange[1];
      const inSector =
        selectedSectors.length === 0 || selectedSectors.includes(p.sector);
      return inYear && inSector;
    });
  }, [projects, selectedSectors, yearRange]);

  const handleProjectClick = (project) => {
    setSelectedProject((prev) =>
      prev && prev.id === project.id ? null : project
    );
  };

  return (
    <div className="project-map">
      <div className="project-map__sidebar">
        <ProjectList
          projects={filteredProjects}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          selectedProject={selectedProject}
          onSelectProject={handleProjectClick}
        />
      </div>
      <div className="project-map__canvas">
        <ProjectMapView
          projects={filteredProjects}
          onProjectClick={handleProjectClick}
          selectedProject={selectedProject}
        />
      </div>
    </div>
  );
}

export default ProjectMap;
