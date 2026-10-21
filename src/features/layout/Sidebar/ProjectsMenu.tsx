import { useId, useState } from "react";
import ChevronDownIcon from "../../../shared/icons/ChevronDownIcon";
import PlusIcon from "../../../shared/icons/PlusIcon";
import ProjectAreaNavigation from "../../projects/ProjectNavigation/ProjectAreaNavigation";
import { projectCreateActionClassName } from "../../projects/ProjectNavigation/navigationClasses";
import type { ProjectsMenuProps } from "../../projects/types";

export default function ProjectsMenu({
  isCollapsed,
  currentPath,
  projects,
  projectsLoading,
  projectError,
  onRetryProjects,
  canCreateProject,
  projectCreationDisabled,
  onCreateProject,
  canCreateTasks,
  onCreateTask,
}: ProjectsMenuProps) {
  const [open, setOpen] = useState(true);
  const itemsId = useId();

  return (
    <div className="mt-3" hidden={isCollapsed}>
      <div className="group/project relative mb-2 flex items-center rounded-lg hover:bg-neutral-100">
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          aria-expanded={open}
          aria-controls={itemsId}
          className="flex min-w-0 flex-1 items-center justify-between rounded-lg px-3 py-2.5 text-xs font-semibold text-neutral-600 hover:bg-neutral-100 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-neutral-700"
        >
          <span className="min-w-0 flex-1 truncate pr-9 text-left">
            Proyectos
          </span>
          <span aria-hidden="true">
            <ChevronDownIcon className={`size-4 ${open ? "" : "-rotate-90"}`} />
          </span>
        </button>
        {canCreateProject && (
          <button
            type="button"
            aria-label="Crear proyecto"
            title="Crear proyecto"
            disabled={projectCreationDisabled}
            onClick={onCreateProject}
            className={`${projectCreateActionClassName} absolute right-9`}
          >
            <PlusIcon className="size-4" />
          </button>
        )}
      </div>
      <div id={itemsId} hidden={!open}>
        <ProjectAreaNavigation
          projects={projects}
          currentPath={currentPath}
          loading={projectsLoading}
          error={projectError}
          onRetry={onRetryProjects}
          canCreateTasks={canCreateTasks}
          onCreateTask={onCreateTask}
        />
      </div>
    </div>
  );
}
