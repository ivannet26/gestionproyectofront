import { useState } from "react";
import { Link } from "react-router";
import { projectPath } from "../../../routes";
import type { ProjectSummary } from "../types";
import styles from "./ProjectNavigation.module.css";

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
    <div className={styles.navigation} aria-busy={loading}>
      {loading && <p className={styles.message} role="status">Cargando proyectos…</p>}
      {error && <p className={styles.message} role="alert">{error}</p>}
      {!loading && !error && projects.length === 0 && <p className={styles.message}>No hay proyectos autorizados.</p>}
      <ul className={styles.projects} aria-label="Proyectos autorizados">
        {projects.map((project) => {
          const path = projectPath(project.id);
          const active = currentPath === path || currentPath.startsWith(`${path}/`);
          const expanded = expandedProjects[project.id] ?? active;
          const childrenId = `project-${project.id}-navigation`;
          return (
            <li key={project.id}>
              <div className={`${styles.heading}${active ? ` ${styles.active}` : ""}`}>
                <button className={styles.project} type="button" aria-expanded={expanded} aria-controls={childrenId}
                  aria-label={`${expanded ? "Contraer" : "Expandir"} proyecto ${project.name}`}
                  onClick={() => setExpandedProjects((current) => ({ ...current, [project.id]: !expanded }))}>
                  <span className={styles.chevron} aria-hidden="true">{expanded ? "⌄" : "›"}</span>
                  <span>{project.name}</span>
                </button>
                {canCreateTasks && project.permissions.create_tasks && <button className={styles.create}
                  type="button" disabled={loading} aria-label={`Crear tarea en ${project.name}`}
                  title="Crear tarea" onClick={() => onCreateTask(project.id)}>+</button>}
              </div>
              <ul id={childrenId} className={styles.children} hidden={!expanded}>
                <li><Link to={path} aria-current={active ? "page" : undefined}>Lista de tareas</Link></li>
              </ul>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
