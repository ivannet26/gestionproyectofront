import { useState } from "react";
import { Link } from "react-router";
import { projectPath } from "../../../routes";
import type { ProjectSummary } from "../types";
const styles = {
  "navigation": "mt-3 border-t border-neutral-200 pt-3",
  "projects": "m-0 grid list-none gap-1 p-0 max-md:max-h-[40dvh] max-md:overflow-y-auto",
  "children": "mb-2 ml-5 mt-1 grid list-none gap-1 border-l border-neutral-200 pl-2 hidden:hidden [&_a]:block [&_a]:min-h-9 [&_a]:rounded-md [&_a]:px-2 [&_a]:py-2 [&_a]:text-[13px] [&_a]:text-neutral-600 [&_a]:no-underline hover:[&_a]:bg-neutral-50 [&_a[aria-current=page]]:bg-neutral-100 [&_a[aria-current=page]]:font-semibold [&_a[aria-current=page]]:text-neutral-900 [&_a:focus-visible]:outline-2 [&_a:focus-visible]:outline-neutral-700",
  "heading": "flex items-center gap-1 rounded-md",
  "active": "bg-neutral-100",
  "project": "flex min-h-[38px] min-w-0 flex-1 items-center gap-2 rounded-md border-0 bg-transparent p-2 text-left text-[13px] font-semibold text-neutral-900 hover:bg-neutral-50 cursor-pointer [&_span:last-child]:min-w-0 [&_span:last-child]:break-words focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-700",
  "chevron": "mx-0.5 h-2 w-2 shrink-0 -rotate-45 border-b border-r border-current",
  "expanded": "rotate-45",
  "create": "mr-1 min-h-8 w-8 shrink-0 rounded-md border border-neutral-200 bg-white text-lg text-neutral-900 hover:bg-neutral-50 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-700",
  "message": "mx-2 mb-2 mt-1 text-xs leading-relaxed text-neutral-600 [overflow-wrap:anywhere]",
  "retry": "min-h-10 rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 hover:bg-neutral-50 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-700 mx-2 mb-3 text-xs"
};

interface ProjectNavigationProps {
  projects: ProjectSummary[];
  currentPath: string;
  loading: boolean;
  error: string;
  canCreateTasks: boolean;
  onCreateTask: (projectId: number) => void;
  onRetry: () => void;
}

export default function ProjectNavigation({
<<<<<<< HEAD
  projects,
  currentPath,
  loading,
  error,
  canCreateTasks,
  onCreateTask,
=======
  projects, currentPath, loading, error, canCreateTasks, onCreateTask, onRetry,
>>>>>>> 331bd8aac01bb01bd27cb5de894aadc6824d9591
}: ProjectNavigationProps) {
  const [expandedProjects, setExpandedProjects] = useState<
    Record<number, boolean>
  >({});
  return (
<<<<<<< HEAD
    <div className="mt-3 pt-3 border-t border-neutral-200" aria-busy={loading}>
      {loading && (
        <p
          className="mx-2 my-1 text-neutral-600 text-xs leading-relaxed"
          role="status"
        >
          Cargando proyectos…
        </p>
      )}
      {error && (
        <p
          className="mx-2 my-1 text-neutral-600 text-xs leading-relaxed"
          role="alert"
        >
          {error}
        </p>
      )}
      {!loading && !error && projects.length === 0 && (
        <p className="mx-2 my-1 text-neutral-600 text-xs leading-relaxed">
          No hay proyectos autorizados.
        </p>
      )}
      <ul
        className="grid gap-1 m-0 p-0 list-none"
        aria-label="Proyectos autorizados"
      >
=======
    <div className={styles.navigation} aria-busy={loading}>
      {loading && <p className={styles.message} role="status">Cargando proyectos…</p>}
      {error && <p className={styles.message} role="alert">{error}</p>}
      {error && <button type="button" className={styles.retry} disabled={loading} onClick={onRetry}>Volver a cargar proyectos</button>}
      {!loading && !error && projects.length === 0 && <p className={styles.message} role="status">No hay proyectos autorizados.</p>}
      <ul className={styles.projects} aria-label="Proyectos autorizados" hidden={loading || Boolean(error)}>
>>>>>>> 331bd8aac01bb01bd27cb5de894aadc6824d9591
        {projects.map((project) => {
          const path = projectPath(project.id);
          const active =
            currentPath === path || currentPath.startsWith(`${path}/`);
          const expanded = expandedProjects[project.id] ?? active;
          const childrenId = `project-${project.id}-navigation`;
          return (
            <li key={project.id}>
<<<<<<< HEAD
              <div
                className={`flex items-center gap-1 shadow-none ${active ? "bg-neutral-200" : ""}`}
              >
                <button
                  className="flex items-center gap-2 flex-1 min-w-0 min-h-[38px] p-2 border-0 bg-white text-neutral-900 text-left text-sm font-semibold cursor-pointer shadow-none focus-visible:outline-none"
                  type="button"
                  aria-expanded={expanded}
                  aria-controls={childrenId}
                  aria-label={`${expanded ? "Contraer" : "Expandir"} proyecto ${project.name}`}
                  onClick={() =>
                    setExpandedProjects((current) => ({
                      ...current,
                      [project.id]: !expanded,
                    }))
                  }
                >
                  <span
                    className="w-3 flex-none text-center text-base"
                    aria-hidden="true"
                  >
                    {expanded ? "⌄" : "›"}
                  </span>
                  <span className="min-w-0">{project.name}</span>
                </button>
                {canCreateTasks && project.permissions.create_tasks && (
                  <button
                    className="w-7 min-h-7 mr-1 p-0 border border-neutral-200  text-neutral-900 text-base cursor-pointer shadow-none disabled:opacity-50 disabled:cursor-not-allowed"
                    type="button"
                    disabled={loading}
                    aria-label={`Crear tarea en ${project.name}`}
                    title="Crear tarea"
                    onClick={() => onCreateTask(project.id)}
                  >
                    +
                  </button>
                )}
              </div>
              <ul
                id={childrenId}
                className="grid gap-1 m-1 ml-5 pl-2 border-l border-neutral-200 list-none"
                hidden={!expanded}
              >
                <li>
                  <Link
                    to={path}
                    aria-current={active ? "page" : undefined}
                    className={`block min-h-9 px-2 py-2 no-underline text-sm shadow-none ${active ? "bg-neutral-100 text-neutral-900 font-semibold" : "text-neutral-600 bg-white"}`}
                  >
                    Lista de tareas
                  </Link>
                </li>
=======
              <div className={`${styles.heading}${active ? ` ${styles.active}` : ""}`}>
                <button className={styles.project} type="button" aria-expanded={expanded} aria-controls={childrenId}
                  title={project.name}
                  aria-label={`${expanded ? "Contraer" : "Expandir"} proyecto ${project.name}`}
                  onKeyDown={(event) => {
                    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
                      event.preventDefault();
                      setExpandedProjects((current) => ({ ...current, [project.id]: event.key === "ArrowRight" }));
                    }
                  }}
                  onClick={() => setExpandedProjects((current) => ({ ...current, [project.id]: !expanded }))}>
                  <span className={`${styles.chevron}${expanded ? ` ${styles.expanded}` : ""}`} aria-hidden="true" />
                  <span>{project.name}</span>
                </button>
                {canCreateTasks && project.permissions.create_tasks && <button className={styles.create}
                  type="button" disabled={loading} aria-label={`Crear tarea en ${project.name}`}
                  title="Crear tarea" onClick={() => onCreateTask(project.id)}>+</button>}
              </div>
              <ul id={childrenId} className={styles.children} hidden={!expanded}>
                <li><Link to={path} aria-label={`Lista de tareas de ${project.name}`} aria-current={active ? "page" : undefined}>Lista de tareas</Link></li>
>>>>>>> 331bd8aac01bb01bd27cb5de894aadc6824d9591
              </ul>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
