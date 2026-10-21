import { Link } from "react-router";
import { projectPath } from "../../../routes";
import FolderIcon from "../../../shared/icons/FolderIcon";
import TaskIcon from "../TaskForm/TaskIcon";
import { formatTaskDate } from "../TaskList/taskHierarchy";
import type { ProjectHeaderProps } from "../types";
import { useProjectFavorite } from "../useProjectFavorite";

const views = [["lista", "Lista"], ["tablero", "Tablero"], ["gantt", "Gantt"]] as const;
const focus = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-700";

export default function ProjectHeader({ project, view, taskCount }: Pick<ProjectHeaderProps, "project" | "view" | "taskCount">) {
  const { favorite, pending, error, toggle } = useProjectFavorite(project.id, project.is_favorite);
  const currentView = views.find(([key]) => key === view)?.[1] ?? "Vista no disponible";
  const area = project.areas[0];
  const favoriteLabel = favorite ? "Quitar proyecto de favoritos" : "Añadir proyecto a favoritos";

  return (
    <header className="mb-2 min-w-0 text-neutral-800">
      <div className="mb-3 grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-6 gap-y-2 border-b border-neutral-200 pb-3 max-sm:grid-cols-1">
        <h1 className="m-0 min-w-0 text-lg font-semibold [overflow-wrap:anywhere]">{project.name}</h1>
        <div className="flex max-w-full flex-wrap items-center gap-1.5 text-xs font-medium text-neutral-700 tabular-nums sm:text-sm" aria-label="Periodo del proyecto">
          <span aria-hidden="true"><TaskIcon name="date" /></span>
          {project.start_date
            ? <time dateTime={project.start_date} title="Inicio del proyecto" aria-label={`Inicio: ${formatTaskDate(project.start_date)}`}>{formatTaskDate(project.start_date)}</time>
            : <span>Sin fecha de inicio</span>}
          <span aria-hidden="true">→</span>
          {project.end_date
            ? <time dateTime={project.end_date} title="Fin del proyecto" aria-label={`Fin: ${formatTaskDate(project.end_date)}`}>{formatTaskDate(project.end_date)}</time>
            : <span>Sin fecha de fin</span>}
        </div>
      </div>
      <div className="flex min-w-0 items-center justify-between gap-2 sm:gap-4">
        <nav aria-label="Ruta de navegación" className="min-w-0 flex-1 text-xs sm:text-sm">
          <ol className="m-0 flex min-w-0 list-none items-center gap-1 p-0 sm:gap-2">
            <li className="flex min-w-0 max-w-[30%] shrink items-center gap-1.5 text-neutral-700">
              <span aria-hidden="true" className="shrink-0"><TaskIcon name="area" /></span>
              <span className="truncate" title={area?.name}>{area?.name ?? "Área no disponible"}</span>
            </li>
            <li className="flex min-w-0 shrink items-center gap-1 sm:gap-1.5">
              <span aria-hidden="true" className="shrink-0 text-neutral-700"><TaskIcon name="next" /></span>
              <span aria-hidden="true" className="shrink-0"><FolderIcon className="size-4" fill={false} /></span>
              <span className="m-0 min-w-0 text-xs font-semibold sm:text-sm">
                <Link to={projectPath(project.id)} title={project.name} className={`block truncate rounded hover:underline ${focus}`}>{project.name}</Link>
              </span>
            </li>
            <li aria-current="page" className="flex shrink-0 items-center gap-1 font-medium sm:gap-1.5">
              <span aria-hidden="true" className="shrink-0 text-neutral-700"><TaskIcon name="next" /></span>
              {currentView}
            </li>
            <li className="shrink-0">
              <button
                type="button"
                aria-label={favoriteLabel}
                title={favoriteLabel}
                aria-pressed={favorite}
                aria-busy={pending}
                disabled={pending}
                onClick={() => void toggle()}
                className={`flex cursor-pointer items-center rounded-lg p-1.5 text-neutral-700 hover:bg-neutral-200 hover:text-neutral-800 disabled:cursor-wait disabled:opacity-50 aria-pressed:text-neutral-800 aria-pressed:[&_svg]:fill-current [@media(pointer:coarse)]:p-2 ${focus}`}
              >
                <TaskIcon name="star" />
              </button>
            </li>
          </ol>
        </nav>
      </div>
      {error && <p role="alert" className="m-0 mt-1 text-xs text-red-700">No se pudo actualizar el favorito. {error}</p>}
      <div className="mt-1 flex min-w-0 flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
          <nav aria-label="Vistas del proyecto" className="flex shrink-0 gap-3 text-sm font-medium text-neutral-700">
            {views.map(([key, label]) => (
              <Link key={key} to={`?vista=${key}`} aria-current={view === key ? "page" : undefined}
                className={`border-b-2 border-transparent px-1 py-1.5 hover:bg-neutral-100 hover:text-neutral-800 aria-[current=page]:border-neutral-800 aria-[current=page]:text-neutral-800 ${focus}`}>{label}</Link>
            ))}
          </nav>
          <span className="text-xs text-neutral-700" title="Tareas y subtareas visibles" aria-label={`${taskCount} tareas y subtareas visibles`}>
            {taskCount} {taskCount === 1 ? "tarea" : "tareas"}
          </span>
        </div>
      </div>
    </header>
  );
}
