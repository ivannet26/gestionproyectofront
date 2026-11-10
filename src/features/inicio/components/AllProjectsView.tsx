import { Link } from "react-router";
import { projectPath } from "../../../routes";
import FolderIcon from "../../../shared/Icons/FolderIcon";
import type { ProjectSummary } from "../../../core/interfaces/project.interface";

export default function AllProjectsView({ projects }: { projects: ProjectSummary[] }) {
  return (
    <div className="flex flex-col gap-4">
      <header className="border-b border-neutral-200 pb-3 dark:border-neutral-800">
        <h1 className="m-0 text-lg font-medium text-neutral-900 dark:text-neutral-100">
          Todos mis proyectos
        </h1>
        <p className="m-0 mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
          {projects.length} {projects.length === 1 ? "proyecto activo" : "proyectos activos"} registrados en la organización
        </p>
      </header>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map((project) => {
          const path = projectPath(project.id);
          const areaNames = project.areas.map((a) => a.name).join(", ") || "General";

          return (
            <Link
              key={project.id}
              to={path}
              className="flex cursor-pointer flex-col justify-between gap-3 rounded-xl border border-neutral-200 bg-white p-4 hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700"
            >
              <div className="flex items-start gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                  <FolderIcon className="size-4" fill={false} />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="m-0 truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">
                    {project.name}
                  </h3>
                  <p className="m-0 truncate text-xs text-neutral-500 dark:text-neutral-400">
                    {areaNames}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-neutral-100 pt-2 text-xs text-neutral-500 dark:border-neutral-800/80 dark:text-neutral-400">
                <span className="rounded bg-neutral-100 px-2 py-0.5 font-medium dark:bg-neutral-800">
                  {project.end_date ? "Con plazo" : "Continuo"}
                </span>
                <span>Ver tablero →</span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
