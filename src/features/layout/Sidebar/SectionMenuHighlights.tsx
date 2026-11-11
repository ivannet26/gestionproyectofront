import FlagIcon from "../../../shared/Icons/FlagIcon";
import { getIcon } from "../../../shared/Icons/icon-catalog";
import { usePriorityTasks } from "./usePriorityTasks";

export default function SectionMenuHighlights() {
  const tasks = usePriorityTasks();

  return (
    <footer className="flex min-w-0 shrink-0 items-center gap-2 bg-white p-1.5 dark:bg-neutral-950">
      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-neutral-100 px-2 py-1.5 text-xs text-neutral-600 dark:bg-neutral-900 dark:text-neutral-400">
        <FlagIcon className="size-4 shrink-0 text-neutral-500 dark:text-neutral-400" />
        <span>
          <span className="font-medium">{tasks.length}</span>{" "}
          {tasks.length === 1 ? "Prioridad" : "Prioridades"}
        </span>
      </span>

      <ul className="m-0 flex min-w-0 flex-1 list-none items-center gap-2 overflow-x-auto p-0">
        {tasks.map(({ id, projectId, name, state_name, state_tema }) => {
          const Icon = getIcon(state_tema?.icono);

          return (
            <li
              key={`${projectId}-${id}`}
              title={state_name}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-neutral-100 px-2 py-1.5 text-xs text-neutral-600 dark:bg-neutral-900 dark:text-neutral-400"
            >
              <span
                style={{ color: state_tema?.color ?? "#525252" }}
                className="inline-flex shrink-0"
              >
                <Icon className="size-4" fill />
              </span>
              <span className="max-w-40 truncate">{name}</span>
            </li>
          );
        })}
      </ul>
    </footer>
  );
}
