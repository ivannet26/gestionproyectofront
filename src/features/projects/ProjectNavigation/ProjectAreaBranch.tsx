import { Link } from "react-router";
import { projectPath } from "../../../routes";
import ProjectsIcon from "../../../shared/icons/ProjectsIcon";
import type { ProjectArea, ProjectSummary } from "../types";
import { mergeProjectItems } from "../projectStream";
import { useProjectAreaProjects } from "../useProjectAreaDirectory";
import ProjectNavigation from "./ProjectNavigation";
import ProjectContinuation from "./ProjectContinuation";

export interface ProjectAreaBranchProps {
  area: ProjectArea;
  associated?: boolean;
  enabled: boolean;
  currentPath: string;
  currentProject?: ProjectSummary | null;
  organization?: boolean;
  canCreateTasks?: boolean;
  onCreateTask?: (id: number, project: ProjectSummary) => void;
}

export default function ProjectAreaBranch({ area, associated, enabled, currentPath, currentProject, organization, canCreateTasks, onCreateTask }: ProjectAreaBranchProps) {
  const resource = useProjectAreaProjects(area.id, associated, enabled);
  const projects = currentProject?.areas[0]?.id === area.id && !resource.data.some((item) => item.id === currentProject.id)
    ? mergeProjectItems(resource.data, [currentProject]) : resource.data;
  return <div aria-busy={resource.pending}>
    {organization ? <ul className="m-0 list-none space-y-0.5 p-0" aria-label={`Proyectos de ${area.name}`}>
      {projects.map((project) => <li key={project.id} className="flex min-w-0 items-center gap-2 rounded-lg px-3 py-2 text-xs hover:bg-neutral-100 dark:hover:bg-neutral-800">
        <span className="inline-flex text-orange-500" aria-hidden="true"><ProjectsIcon className="size-4" /></span>
        <Link to={projectPath(project.id)} className="min-w-0 flex-1 truncate text-neutral-700 dark:text-neutral-300 hover:text-neutral-800 dark:hover:text-neutral-100 cursor-pointer focus-visible:outline-2 focus-visible:outline-neutral-700" title={project.name}>{project.name}</Link>
        <span className="shrink-0 text-[10px] text-neutral-600 dark:text-neutral-400">{project.start_date}</span>
      </li>)}
    </ul> : projects.length > 0 && <ProjectNavigation projects={projects} currentPath={currentPath} loading={false} error="" canCreateTasks={Boolean(canCreateTasks)}
      onCreateTask={(id) => { const project = projects.find((item) => item.id === id); if (project) onCreateTask?.(id, project); }} />}
    {resource.ready && !resource.pending && !resource.error && !projects.length && <p role="status" className="mx-3 text-xs text-neutral-600 dark:text-neutral-400">No hay proyectos autorizados en esta área.</p>}
    <ProjectContinuation {...resource} enabled={enabled} label="proyectos" />
  </div>;
}
