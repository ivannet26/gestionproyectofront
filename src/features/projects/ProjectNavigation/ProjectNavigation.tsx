import { useState } from "react";
import { Link } from "react-router";
import { projectPath } from "../../../routes";
import type { ProjectSummary } from "../types";

interface ProjectNavigationProps {
  projects: ProjectSummary[];
  currentPath: string;
  loading: boolean;
  error: string;
  canCreateTasks: boolean;
  onCreateTask: (projectId: number) => void;
}

export default function ProjectNavigation({
  projects, currentPath, loading, error, canCreateTasks, onCreateTask,
}: ProjectNavigationProps) {
  const [expandedProjects, setExpandedProjects] = useState<Record<number, boolean>>({});
  return (
    <div className="mt-3 pt-3 border-t border-neutral-200" aria-busy={loading}>
      {loading && <p className="mx-2 my-1 text-neutral-600 text-xs leading-relaxed" role="status">Cargando proyectos…</p>}
      {error && <p className="mx-2 my-1 text-neutral-600 text-xs leading-relaxed" role="alert">{error}</p>}
      {!loading && !error && projects.length === 0 && <p className="mx-2 my-1 text-neutral-600 text-xs leading-relaxed">No hay proyectos autorizados.</p>}
      <ul className="grid gap-1 m-0 p-0 list-none" aria-label="Proyectos autorizados">
        {projects.map((project) => {
          const path = projectPath(project.id);
          const active = currentPath === path || currentPath.startsWith(`${path}/`);
          const expanded = expandedProjects[project.id] ?? active;
          const childrenId = `project-${project.id}-navigation`;
          return (
            <li key={project.id}>
              <div className={`flex items-center gap-1 shadow-none ${active ? "bg-neutral-200" : ""}`}>
                <button className="flex items-center gap-2 flex-1 min-w-0 min-h-[38px] p-2 border-0 bg-white text-neutral-900 text-left text-sm font-semibold cursor-pointer shadow-none focus-visible:outline-none" type="button" aria-expanded={expanded} aria-controls={childrenId}
                  aria-label={`${expanded ? "Contraer" : "Expandir"} proyecto ${project.name}`}
                  onClick={() => setExpandedProjects((current) => ({ ...current, [project.id]: !expanded }))}>
                  <span className="w-3 flex-none text-center text-base" aria-hidden="true">{expanded ? "⌄" : "›"}</span>
                  <span className="min-w-0">{project.name}</span>
                </button>
                {canCreateTasks && project.permissions.create_tasks && <button className="w-7 min-h-7 mr-1 p-0 border border-neutral-200 bg-neutral-50 text-neutral-900 text-base cursor-pointer shadow-none disabled:opacity-50 disabled:cursor-not-allowed"
                  type="button" disabled={loading} aria-label={`Crear tarea en ${project.name}`}
                  title="Crear tarea" onClick={() => onCreateTask(project.id)}>+</button>}
              </div>
              <ul id={childrenId} className="grid gap-1 m-1 ml-5 pl-2 border-l border-neutral-200 list-none" hidden={!expanded}>
                <li><Link to={path} aria-current={active ? "page" : undefined} className={`block min-h-9 px-2 py-2 no-underline text-sm shadow-none ${active ? "bg-neutral-100 text-neutral-900 font-semibold" : "text-neutral-600 bg-white"}`}>Lista de tareas</Link></li>
              </ul>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
