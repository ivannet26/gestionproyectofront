import type { Task } from "../../types";
import type { useTaskView } from "../../hooks/useTaskView";
import { ganttControl } from "./GanttControl";

export default function GanttDialogActions({
  task,
  view,
  busy,
}: {
  task: Task;
  view: ReturnType<typeof useTaskView>;
  busy: boolean;
}) {
  const actions = [
    {
      kind: "edit" as const,
      label: "Editar datos",
      allowed: task.permissions.edit,
    },
    {
      kind: "state" as const,
      label: "Cambiar estado",
      allowed: task.permissions.state && task.transitions.length > 0,
    },
    {
      kind: "dependencies" as const,
      label: "Gestionar dependencias",
      allowed: task.permissions.dependencies && task.parent_id === null,
    },
  ];
  return (
    <nav
      aria-label="Acciones de la tarea"
      className="flex flex-wrap gap-2 border-t border-neutral-200 p-3 dark:border-neutral-700"
    >
      {actions
        .filter((action) => action.allowed && action.kind !== view.action?.kind)
        .map((action) => (
          <button
            key={action.kind}
            type="button"
            className={ganttControl}
            disabled={busy}
            onClick={() =>
              view.setAction({ kind: action.kind, taskId: task.id })
            }
          >
            {action.label}
          </button>
        ))}
    </nav>
  );
}
