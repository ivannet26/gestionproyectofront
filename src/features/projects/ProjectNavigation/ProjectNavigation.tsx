import { useState } from "react";
import { Link } from "react-router";
import { projectPath } from "../../../routes";
import type { ProjectSummary } from "../types";
const styles = {
  navigation: "mt-3 border-t border-neutral-200 pt-3",
  projects:
    "m-0 grid list-none gap-1 p-0 max-md:max-h-[40dvh] max-md:overflow-y-auto",
  children:
    "mb-2 ml-5 mt-1 grid list-none gap-1 border-l border-neutral-200 pl-2 hidden:hidden [&_a]:block [&_a]:min-h-9 [&_a]:rounded-lg [&_a]:px-2 [&_a]:py-2 [&_a]:text-[13px] [&_a]:text-neutral-600 [&_a]:no-underline hover:[&_a]:bg-neutral-50 [&_a[aria-current=page]]:bg-neutral-50 [&_a[aria-current=page]]:[&_a[aria-current=page]]:text-neutral-900 [&_a:focus-visible]:outline-2 [&_a:focus-visible]:outline-neutral-700",
  heading: "flex items-center gap-1 rounded-lg",
  active: "bg-neutral-50",
  project:
    "flex min-h-[38px] min-w-0 flex-1 items-center gap-2 rounded-lg border-0 bg-transparent p-2 text-left text-[13px] text-neutral-900 hover:bg-neutral-50 cursor-pointer [&_span:last-child]:min-w-0 [&_span:last-child]:break-words focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-700",
  chevron:
    "mx-0.5 h-2 w-2 shrink-0 -rotate-45 border-b border-r border-current",
  expanded: "rotate-45",
  create:
    "mr-1 min-h-8 w-8 shrink-0 rounded-lg border border-neutral-200 bg-white text-lg text-neutral-900 hover:bg-neutral-50 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-700",
  message:
    "mx-2 mb-2 mt-1 text-xs leading-relaxed text-neutral-600 [overflow-wrap:anywhere]",
  retry:
    "min-h-10 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 hover:bg-neutral-50 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-700 mx-2 mb-3 text-xs",
};

interface ProjectNavigationProps {
  projects: ProjectSummary[];
  currentPath: string;
  loading: boolean;
  error: string;
  canCreateTasks: boolean;
  onCreateTask: (projectId: number) => void;
  onRetry?: () => void;
}

export default function ProjectNavigation({
  projects,
  currentPath,
  loading,
  error,
  canCreateTasks,
  onCreateTask,
  onRetry,
}: ProjectNavigationProps) {
  const [expandedProjects, setExpandedProjects] = useState<
    Record<number, boolean>
  >({});
  return (
    <div className={styles.navigation} aria-busy={loading}>
      {loading && (
        <p className={styles.message} role="status">
          Cargando proyectos…
        </p>
      )}
      {error && (
        <p className={styles.message} role="alert">
          {error}
        </p>
      )}
      {error && (
        <button
          type="button"
          className={styles.retry}
          disabled={loading}
          onClick={onRetry}
        >
          Volver a cargar proyectos
        </button>
      )}
      {!loading && !error && projects.length === 0 && (
        <p className={styles.message} role="status">
          No hay proyectos autorizados.
        </p>
      )}
      <ul
        className={styles.projects}
        aria-label="Proyectos autorizados"
        hidden={loading || Boolean(error)}
      >
        {projects.map((project) => {
          const path = projectPath(project.id);
          const active =
            currentPath === path || currentPath.startsWith(`${path}/`);
          const expanded = expandedProjects[project.id] ?? active;
          const childrenId = `project-${project.id}-navigation`;
          return (
            <li key={project.id}>
              <div
                className={`${styles.heading}${active ? ` ${styles.active}` : ""}`}
              >
                <button
                  className={styles.project}
                  type="button"
                  aria-expanded={expanded}
                  aria-controls={childrenId}
                  title={project.name}
                  aria-label={`${expanded ? "Contraer" : "Expandir"} proyecto ${project.name}`}
                  onKeyDown={(event) => {
                    if (
                      event.key === "ArrowLeft" ||
                      event.key === "ArrowRight"
                    ) {
                      event.preventDefault();
                      setExpandedProjects((current) => ({
                        ...current,
                        [project.id]: event.key === "ArrowRight",
                      }));
                    }
                  }}
                  onClick={() =>
                    setExpandedProjects((current) => ({
                      ...current,
                      [project.id]: !expanded,
                    }))
                  }
                >
                  <span
                    className={`${styles.chevron}${expanded ? ` ${styles.expanded}` : ""}`}
                    aria-hidden="true"
                  />
                  <span>{project.name}</span>
                </button>
                {canCreateTasks && project.permissions.create_tasks && (
                  <button
                    className={styles.create}
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
                className={styles.children}
                hidden={!expanded}
              >
                <li>
                  <Link
                    to={path}
                    aria-label={`Lista de tareas de ${project.name}`}
                    aria-current={active ? "page" : undefined}
                  >
                    Lista de tareas
                  </Link>
                </li>
              </ul>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
