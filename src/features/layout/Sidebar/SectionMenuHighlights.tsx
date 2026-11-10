import FlagIcon from "../../../shared/Icons/FlagIcon";
import { getIcon } from "../../../shared/Icons/icon-catalog";
import { usePriorityTasks } from "./usePriorityTasks";

export default function SectionMenuHighlights() {
  const tasks = usePriorityTasks();
  const label = tasks.length === 1 ? "Prioridad" : "Prioridades";

  return (
    <footer className="flex min-w-0 shrink-0 items-center gap-2 border-t border-neutral-200 bg-white p-2 dark:border-neutral-800 dark:bg-neutral-950">
      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-neutral-200 bg-neutral-100 px-2 py-1 text-xs text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400">
        <FlagIcon className="size-4 shrink-0 text-neutral-500 dark:text-neutral-400" />
        <span>
          <span className="font-medium">{tasks.length}</span> {label}
        </span>
      </span>

      <ul className="m-0 flex min-w-0 flex-1 list-none items-center gap-2 overflow-x-auto p-0">
        {tasks.map((task) => {
          const Icon = getIcon(task.state_tema?.icono);
          const color = task.state_tema?.color ?? "#525252";

          return (
            <li
              key={`${task.projectId}-${task.id}`}
              title={task.state_name}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-neutral-200 bg-neutral-100 px-2 py-1 text-xs text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400"
            >
              <span style={{ color }} className="inline-flex shrink-0">
                <Icon className="size-4" fill />
              </span>
              <span className="max-w-40 truncate">{task.name}</span>
            </li>
          );
        })}
      </ul>
    </footer>
  );
}
