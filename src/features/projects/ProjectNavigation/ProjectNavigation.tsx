import { useEffect, useState } from "react";
import { Link } from "react-router";
import { projectPath } from "../../../routes";
import ChevronDownIcon from "../../../shared/icons/ChevronDownIcon";
import PlusIcon from "../../../shared/icons/PlusIcon";
import ProjectsIcon from "../../../shared/icons/ProjectsIcon";
import type { ProjectNavigationProps } from "../types";
import { projectCreateActionClassName } from "./navigationClasses";
const styles = {
  projects: "m-0 p-0 list-none flex flex-col gap-2",
  children:
    "m-0 ml-7 mt-1 list-none p-0 hidden:hidden [&_a]:block [&_a]:rounded-lg [&_a]:px-3 [&_a]:py-1.5 [&_a]:text-xs [&_a]:text-neutral-600 [&_a]:no-underline [&_a]:cursor-pointer [&_a:hover]:bg-neutral-100 [&_a[aria-current=page]]:bg-neutral-100 [&_a[aria-current=page]]:text-neutral-800 [&_a:focus-visible]:outline-2 [&_a:focus-visible]:outline-offset-[-2px] [&_a:focus-visible]:outline-neutral-700",
  heading:
    "group/project relative flex min-w-0 items-center rounded-lg hover:bg-neutral-100",
  project:
    "flex min-w-0 flex-1 items-center gap-2 rounded-lg border-0 bg-transparent px-3 py-1.5 text-left text-xs cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-neutral-700",
  message:
    "mx-2 mb-2 mt-1 text-xs leading-relaxed text-neutral-600 [overflow-wrap:anywhere]",
  retry:
    "rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs text-neutral-800 hover:bg-neutral-100 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-700 mx-2 mb-3",
};

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
  const activeProjectId = projects.find((project) => {
    const path = projectPath(project.id);
    return currentPath === path || currentPath.startsWith(`${path}/`);
  })?.id;
  useEffect(() => {
    if (activeProjectId === undefined) return;
    let current = true;
    void Promise.resolve().then(() => {
      if (current)
        setExpandedProjects((expanded) => ({
          ...expanded,
          [activeProjectId]: true,
        }));
    });
    return () => {
      current = false;
    };
  }, [activeProjectId, currentPath]);
  return (
    <div aria-busy={loading}>
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
              <div className={styles.heading}>
                <button
                  className={`${styles.project} ${active ? "text-neutral-800" : "text-neutral-600"}`}
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
                  <span aria-hidden="true" className="shrink-0">
                    <ProjectsIcon className="size-4" fill={false} />
                  </span>
                  <span className="min-w-0 flex-1 truncate pr-9">
                    {project.name}
                  </span>
                  <span aria-hidden="true" className="shrink-0">
                    <ChevronDownIcon
                      className={`size-4 ${expanded ? "" : "-rotate-90"}`}
                    />
                  </span>
                </button>
                {canCreateTasks && project.permissions.create_tasks && (
                  <button
                    className={`${projectCreateActionClassName} absolute right-9`}
                    type="button"
                    disabled={loading}
                    aria-label={`Crear tarea en ${project.name}`}
                    title="Crear tarea"
                    onClick={() => onCreateTask(project.id)}
                  >
                    <PlusIcon className="size-4" />
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
