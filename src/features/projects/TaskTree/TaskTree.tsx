import { useState } from "react";
import type { ReactNode } from "react";
import StatusBadge from "../../../shared/StatusBadge/StatusBadge";
import type { ProjectCatalogs, Task, TaskActionKind } from "../types";
import LabelList from "../LabelList/LabelList";
import styles from "./TaskTree.module.css";

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

  function branch(items: Task[], ancestors: Set<number> = new Set()): ReactNode {
    return (
      <ul className={styles.tree}>
        {items.filter((task) => !ancestors.has(task.id)).map((task) => {
          const children = tasks.filter((item) => item.parent_id === task.id);
          const expanded = !collapsed.has(task.id);
          const next = new Set([...ancestors, task.id]);
          const hasActions = task.permissions.edit || task.permissions.state
            || task.permissions.create_child || task.permissions.dependencies;
          return (
            <li key={task.id}>
              <article className={styles.row}>
                <div className={styles.heading}>
                  {children.length > 0 && (
                    <button className={styles.toggle} type="button"
                      aria-label={`${expanded ? "Contraer" : "Expandir"} subtareas de ${task.name}`}
                      aria-expanded={expanded} aria-controls={`children-${task.id}`} onClick={() => toggle(task.id)}>
                      {expanded ? "−" : "+"}
                    </button>
                  )}
                  <strong>{task.name}</strong>
                  <StatusBadge>{catalogs.states.find((state) => state.code === task.state_code)?.name ?? task.state_code}</StatusBadge>
                  {hasActions && (
                    <details className={styles.menu}>
                      <summary aria-label={`Opciones de ${task.name}`}>⋯</summary>
                      <div>
                        {task.permissions.edit && <button type="button" onClick={() => onAction("edit", task.id)}>Editar datos</button>}
                        {task.permissions.state && <button type="button" onClick={() => onAction("state", task.id)}>Cambiar estado</button>}
                        {task.permissions.create_child && <button type="button" onClick={() => onAction("child", task.id)}>Nueva subtarea</button>}
                        {task.permissions.dependencies && task.parent_id === null
                          && <button type="button" onClick={() => onAction("dependencies", task.id)}>Dependencias</button>}
                      </div>
                    </details>
                  )}
                </div>
                <div className={styles.metadata}>
                  <span>{catalogs.priorities.find((item) => item.code === task.priority)?.name ?? task.priority}</span>
                  <span>Fecha límite: {task.due_date}</span>
                  <span>{task.responsible_name ?? "Sin responsable"}</span>
                  <span>Creada: {new Date(task.created_at).toLocaleDateString("es-PE")}</span>
                  {task.parent_id !== null && !ids.has(task.parent_id) && <span>Subtarea asignada</span>}
                </div>
                <LabelList labels={task.labels} />
              </article>
              {children.length > 0 && <div id={`children-${task.id}`} hidden={!expanded}>{branch(children, next)}</div>}
            </li>
          );
        })}
      </ul>
    );
  }

  return branch(tasks.filter((task) => task.parent_id === null || !ids.has(task.parent_id)));
}
