import { Link } from "react-router";
import SectionMenuActions from "./SectionMenuActions";
import ProjectSidebarList from "./ProjectSidebarList";
import ProjectRecentTasksList from "./ProjectRecentTasksList";
import type { ProjectSummary } from "../../../core/interfaces/project.interface";
import type { SubRoute } from "../../../routes";

interface HomeSidebarSectionsProps {
  projects: ProjectSummary[];
  activeProject: ProjectSummary | null;
  pathname: string;
  visibleItems: SubRoute[];
  activePath: string;
}

export default function HomeSidebarSections({
  activeProject,
  pathname,
  visibleItems,
  activePath,
}: HomeSidebarSectionsProps) {
  return (
    <>
      <SectionMenuActions project={activeProject} />

      <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
        {visibleItems.map((item) => {
          const Icon = item.Icon;
          const active = item.path === activePath;
          return (
            <li key={item.path}>
              <Link
                to={item.path}
                aria-current={active ? "page" : undefined}
                className={`badge ${
                  active
                    ? "bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-100"
                    : ""
                }`}
              >
                <Icon className="size-4 shrink-0" fill={false} />
                <span className="min-w-0 flex-1 truncate">{item.title}</span>
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="my-3 border-t border-neutral-200 pt-3 dark:border-neutral-800">
        <p className="m-0 mb-2 ml-1.5 text-xs text-neutral-400 dark:text-neutral-300">
          Proyectos por área
        </p>
        <ProjectSidebarList currentPath={pathname} />
      </div>

      {activeProject && (
        <div className="my-3 border-t border-neutral-200 pt-3 dark:border-neutral-800">
          <p className="m-0 mb-2 ml-1.5 text-xs text-neutral-400 dark:text-neutral-300">
            Mis últimas tareas
          </p>
          <ProjectRecentTasksList projectId={activeProject.id} />
        </div>
      )}
    </>
  );
}
