import { useMemo, useState } from "react";
import { Link } from "react-router";
import type {
  ProjectAreaGroup,
  ProjectSummary,
} from "../../../core/interfaces/project.interface";
import { projectPath } from "../../../routes";
import Avatar from "../../../shared/Avatar";
import ChevronDownIcon from "../../../shared/Icons/ChevronIcon";
import PlusIcon from "../../../shared/Icons/PlusIcon";
import ProjectsIcon from "../../../shared/Icons/ProjectsIcon";

interface ProjectAreaNavigationProps {
  projects: ProjectSummary[];
  currentPath: string;
  canCreateTasks: boolean;
  onCreateTask: (projectId: number) => void;
}

function groupProjectsByArea(projects: ProjectSummary[]): ProjectAreaGroup[] {
  const groups = new Map<number, ProjectAreaGroup>();
  for (const project of projects) {
    if (!project.has_associated_workers || project.areas.length !== 1) continue;
    const area = project.areas[0];
    const group = groups.get(area.id) ?? { ...area, projects: [] };
    group.projects.push(project);
    groups.set(area.id, group);
  }
  return [...groups.values()];
}

export default function ProjectAreaNavigation({
  projects,
  currentPath,
  canCreateTasks,
  onCreateTask,
}: ProjectAreaNavigationProps) {
  const groups = useMemo(() => groupProjectsByArea(projects), [projects]);
  const [collapsed, setCollapsed] = useState<Record<number, boolean>>({});

  if (groups.length === 0) return null;

  return (
    <ul
      className="m-0 flex list-none flex-col gap-1 p-0"
      aria-label="Áreas con proyectos"
    >
      {groups.map((area) => {
        const expanded = !collapsed[area.id];
        return (
          <li key={area.id} className="min-w-0">
            <button
              type="button"
              aria-expanded={expanded}
              onClick={() =>
                setCollapsed((current) => ({
                  ...current,
                  [area.id]: expanded,
                }))
              }
              className="badge w-full min-w-0 text-left"
            >
              <Avatar
                name={area.name.trim().charAt(0)}
                aria-hidden="true"
                className="size-5 rounded-md text-xs font-medium"
              />
              <span className="min-w-0 flex-1 truncate">{area.name}</span>
              <ChevronDownIcon
                className={`size-4 shrink-0 ${expanded ? "" : "-rotate-90"}`}
              />
            </button>
            {expanded && (
              <ul className="m-0 ml-4 mt-1 flex list-none flex-col gap-1 p-0">
                {area.projects.map((project) => {
                  const path = projectPath(project.id);
                  const active =
                    currentPath === path || currentPath.startsWith(`${path}/`);
                  return (
                    <li
                      key={project.id}
                      className="group/project relative flex min-w-0 items-center rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800"
                    >
                      <Link
                        to={path}
                        aria-current={active ? "page" : undefined}
                        title={project.name}
                        className={`badge min-w-0 flex-1 ${
                          active
                            ? "text-neutral-800 dark:text-neutral-100"
                            : ""
                        }`}
                      >
                        <ProjectsIcon
                          className="size-4 shrink-0"
                          fill={active}
                        />
                        <span className="min-w-0 flex-1 truncate">
                          {project.name}
                        </span>
                      </Link>
                      {canCreateTasks && project.permissions.create_tasks && (
                        <button
                          type="button"
                          aria-label={`Crear tarea en ${project.name}`}
                          title="Crear tarea"
                          onClick={() => onCreateTask(project.id)}
                          className="absolute right-1.5 cursor-pointer rounded-lg p-1.5 text-neutral-700 opacity-0 hover:bg-neutral-200 hover:text-neutral-800 group-hover/project:opacity-100 group-focus-within/project:opacity-100 focus-visible:opacity-100 dark:text-neutral-300 dark:hover:bg-neutral-700 dark:hover:text-neutral-100"
                        >
                          <PlusIcon className="size-4" />
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </li>
        );
      })}
    </ul>
  );
}
