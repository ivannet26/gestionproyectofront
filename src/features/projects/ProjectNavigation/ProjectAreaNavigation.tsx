import { useEffect, useId, useState } from "react";
import ChevronDownIcon from "../../../shared/icons/ChevronDownIcon";
import type { useProjectAreaDirectory } from "../useProjectAreaDirectory";
import type { ProjectSummary } from "../types";
import ProjectAreaBranch from "./ProjectAreaBranch";
import ProjectContinuation from "./ProjectContinuation";

interface ProjectAreaNavigationProps {
  directory: ReturnType<typeof useProjectAreaDirectory>;
  currentPath?: string;
  associated?: boolean;
  enabled?: boolean;
  organization?: boolean;
  canCreateTasks?: boolean;
  onCreateTask?: (id: number, project: ProjectSummary) => void;
}

export default function ProjectAreaNavigation({ directory, currentPath = "", associated, enabled = true, organization, canCreateTasks, onCreateTask }: ProjectAreaNavigationProps) {
  const navigationId = useId();
  const [expandedAreas, setExpandedAreas] = useState<Record<number, boolean>>({});
  const activeAreaId = directory.currentProject?.areas[0]?.id;
  useEffect(() => {
    if (activeAreaId === undefined) return;
    let current = true;
    void Promise.resolve().then(() => { if (current) setExpandedAreas((expanded) => ({ ...expanded, [activeAreaId]: true })); });
    return () => { current = false; };
  }, [activeAreaId, currentPath]);
  return <div aria-busy={directory.pending}>
    {directory.currentError && <p role="alert" className="mx-3 break-words text-xs text-neutral-600">No se pudo consultar el proyecto abierto. <button type="button" className="cursor-pointer rounded px-1 underline focus-visible:outline-2 focus-visible:outline-neutral-700" onClick={() => { void directory.retryCurrent(); }}>Reintentar</button></p>}
    <ul className="m-0 flex list-none flex-col gap-2 p-0" aria-label={organization ? "Áreas de proyectos" : "Áreas con proyectos asociados"}>
      {directory.areas.map((area, index) => {
        const expanded = expandedAreas[area.id] ?? (area.id === activeAreaId || Boolean(organization && index === 0));
        const childrenId = `project-area-${navigationId}-${area.id}-navigation`;
        const toggle = (value: boolean) => setExpandedAreas((current) => ({ ...current, [area.id]: value }));
        return <li key={area.id} className="min-w-0">
          <button type="button" aria-expanded={expanded} aria-controls={childrenId} aria-label={`${expanded ? "Contraer" : "Expandir"} área ${area.name}`} title={area.name}
            className="flex w-full min-w-0 cursor-pointer items-center gap-2 rounded-lg px-3 py-1.5 text-left text-xs font-medium text-neutral-800 hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-neutral-700"
            onClick={() => toggle(!expanded)} onKeyDown={(event) => { if (event.key === "ArrowLeft" || event.key === "ArrowRight") { event.preventDefault(); toggle(event.key === "ArrowRight"); } }}>
            <span aria-hidden="true" className="grid size-5 shrink-0 place-items-center rounded-md bg-neutral-200 text-xs font-semibold text-neutral-800">{Array.from(area.name.trim())[0]?.toLocaleUpperCase("es")}</span>
            <span className="min-w-0 flex-1 truncate">{area.name}</span>
            <span aria-hidden="true" className="shrink-0"><ChevronDownIcon className={`size-4 ${expanded ? "" : "-rotate-90"}`} /></span>
          </button>
          <div id={childrenId} hidden={!expanded} className="ml-4 mt-1">
            <ProjectAreaBranch area={area} associated={associated} enabled={enabled && expanded} currentPath={currentPath}
              currentProject={directory.currentProject} organization={organization} canCreateTasks={canCreateTasks} onCreateTask={onCreateTask} />
          </div>
        </li>;
      })}
    </ul>
    {directory.ready && !directory.pending && !directory.error && !directory.areas.length && <p role="status" className="mx-3 text-xs text-neutral-600">{organization ? "No hay proyectos registrados." : "No hay proyectos autorizados con trabajadores asociados."}</p>}
    <ProjectContinuation {...directory} enabled={enabled} label="áreas" />
  </div>;
}
