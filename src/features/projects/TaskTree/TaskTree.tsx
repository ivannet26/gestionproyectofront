import { useState } from "react";
import type { ReactNode } from "react";
import StatusBadge from "../../../shared/StatusBadge/StatusBadge";
import type { ProjectCatalogs, Task, TaskActionKind } from "../types";
import LabelList from "../LabelList/LabelList";

interface TaskTreeProps {
  tasks: Task[];
  catalogs: ProjectCatalogs;
  onAction: (kind: TaskActionKind, taskId: number) => void;
}

export default function TaskTree({ tasks, catalogs, onAction }: TaskTreeProps) {
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set());
  const ids = new Set(tasks.map((task) => task.id));

  function toggle(id: number) {
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function branch(
    items: Task[],
    ancestors: Set<number> = new Set(),
  ): ReactNode {
    return (
      <ul className="grid gap-2 m-0 p-0 list-none">
        {items
          .filter((task) => !ancestors.has(task.id))
          .map((task) => {
            const children = tasks.filter((item) => item.parent_id === task.id);
            const expanded = !collapsed.has(task.id);
            const next = new Set([...ancestors, task.id]);
            const hasActions =
              task.permissions.edit ||
              task.permissions.state ||
              task.permissions.create_child ||
              task.permissions.dependencies;
            return (
              <li key={task.id}>
                <article className="p-3 border border-neutral-200  shadow-none">
                  <div className="flex items-center gap-2.5 min-w-0 max-sm:flex-wrap">
                    {children.length > 0 && (
                      <button
                        className="w-[27px] h-[27px] border border-neutral-200 bg-neutral-50 text-neutral-900 cursor-pointer shadow-none"
                        type="button"
                        aria-label={`${expanded ? "Contraer" : "Expandir"} subtareas de ${task.name}`}
                        aria-expanded={expanded}
                        aria-controls={`children-${task.id}`}
                        onClick={() => toggle(task.id)}
                      >
                        {expanded ? "−" : "+"}
                      </button>
                    )}
                    <strong className="min-w-0 text-sm text-neutral-900">
                      {task.name}
                    </strong>
                    <StatusBadge>{task.state_name}</StatusBadge>
                    {hasActions && (
                      <details className="relative ml-auto">
                        <summary
                          aria-label={`Opciones de ${task.name}`}
                          className="grid w-8 h-[30px] place-items-center list-none cursor-pointer border border-neutral-200 bg-white shadow-none"
                        >
                          ⋯
                        </summary>
                        <div className="absolute z-[5] right-0 top-[34px] grid min-w-[174px] p-1  border border-neutral-200 shadow-none">
                          {task.permissions.edit && (
                            <button
                              type="button"
                              className="px-2.5 py-2 text-neutral-900 border-0 bg-white text-left text-sm cursor-pointer shadow-none"
                              onClick={() => onAction("edit", task.id)}
                            >
                              Editar datos
                            </button>
                          )}
                          {task.permissions.state && (
                            <button
                              type="button"
                              className="px-2.5 py-2 text-neutral-900 border-0 bg-white text-left text-sm cursor-pointer shadow-none"
                              onClick={() => onAction("state", task.id)}
                            >
                              Cambiar estado
                            </button>
                          )}
                          {task.permissions.create_child && (
                            <button
                              type="button"
                              className="px-2.5 py-2 text-neutral-900 border-0 bg-white text-left text-sm cursor-pointer shadow-none"
                              onClick={() => onAction("child", task.id)}
                            >
                              Nueva subtarea
                            </button>
                          )}
                          {task.permissions.dependencies &&
                            task.parent_id === null && (
                              <button
                                type="button"
                                className="px-2.5 py-2 text-neutral-900 border-0 bg-white text-left text-sm cursor-pointer shadow-none"
                                onClick={() =>
                                  onAction("dependencies", task.id)
                                }
                              >
                                Dependencias
                              </button>
                            )}
                        </div>
                      </details>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1.5 my-2 text-neutral-600 text-xs">
                    <span>
                      {catalogs.priorities.find(
                        (item) => item.code === task.priority,
                      )?.name ?? task.priority}
                    </span>
                    <span>Fecha límite: {task.due_date}</span>
                    <span>{task.responsible_name ?? "Sin responsable"}</span>
                    <span>
                      Creada:{" "}
                      {new Date(task.created_at).toLocaleDateString("es-PE")}
                    </span>
                    {task.parent_id !== null && !ids.has(task.parent_id) && (
                      <span>Subtarea asignada</span>
                    )}
                  </div>
                  {task.description && (
                    <p className="flex flex-wrap gap-x-4 gap-y-1.5 my-2 text-neutral-600 text-xs">
                      {task.description}
                    </p>
                  )}
                  <LabelList labels={task.labels} />
                </article>
                {children.length > 0 && (
                  <div
                    id={`children-${task.id}`}
                    hidden={!expanded}
                    className="mt-2 ml-5 pl-3 border-l border-neutral-200 max-sm:ml-2 max-sm:pl-2"
                  >
                    {branch(children, next)}
                  </div>
                )}
              </li>
            );
          })}
      </ul>
    );
  }

  return branch(
    tasks.filter((task) => task.parent_id === null || !ids.has(task.parent_id)),
  );
}
