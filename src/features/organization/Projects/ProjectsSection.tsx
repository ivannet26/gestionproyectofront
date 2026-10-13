import { useEffect, useState } from "react";
import { Link } from "react-router";
import { getProjects } from "../../projects/services";
import type { ProjectSummary } from "../../projects/types";
import { projectPath } from "../../../routes";
import EmptyState from "../../../shared/EmptyState/EmptyState";

function ProjectsSection() {
  const [data, setData] = useState<ProjectSummary[]>([]);

  useEffect(() => {
    let mounted = true;
    getProjects()
      .then((projects) => {
        if (mounted) setData(projects);
      })
      .catch((e: unknown) => {
        console.error("Error fetching projects:", e);
      });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <section aria-label="Proyectos" className="flex h-full flex-col">
      <div className="flex items-center justify-between mb-3">
        <h3 className="m-0 text-sm text-neutral-800">Proyectos</h3>
      </div>

      {data.length === 0 ? (
        <EmptyState
          iconName="projects"
          message="No hay proyectos registrados."
        />
      ) : (
        <ul className="m-0 p-0 list-none space-y-0.5">
          {data.map((project) => (
            <li
              key={project.id}
              className="px-3 py-2 rounded-md hover:bg-neutral-50 flex items-center justify-between text-xs"
            >
              <Link
                to={projectPath(project.id)}
                className="flex-1 min-w-0 text-neutral-700 hover:text-neutral-800 truncate cursor-pointer"
              >
                {project.name}
              </Link>
              <div className="flex items-center gap-1.5 flex-none ml-2">
                {project.areas.map((area, index) => (
                  <span
                    key={index}
                    className="px-2 py-0.5 text-[10px] text-neutral-600 bg-neutral-50 rounded font-medium"
                  >
                    {area.name}
                  </span>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default ProjectsSection;
