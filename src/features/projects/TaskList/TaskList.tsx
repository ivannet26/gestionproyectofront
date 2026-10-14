import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { Project, ProjectCatalogs, Task, TaskActionKind } from "../types";
import TaskProperty from "../TaskForm/TaskProperty";
import TaskIcon from "../TaskForm/TaskIcon";
import TaskCell, { StateLabel } from "./TaskCell";
import type { TaskChanges } from "./TaskCell";
import { taskHierarchy } from "./taskHierarchy";

const styles = {
  list: "min-w-0 [&_:where(button,input):focus-visible]:[outline:2px_solid_var(--color-focus)] [&_:where(button,input):focus-visible]:outline-offset-2",
  toolbar:
    "flex items-center justify-between gap-4 px-6 py-3 [@media(max-width:600px)]:flex-wrap [@media(max-width:600px)]:px-3 [@media(max-width:600px)]:gap-2.5",
  tools:
    "flex min-w-0 items-center gap-2.5 [&_input]:w-[230px] [&_input]:max-w-full [&_input]:min-h-[34px] [&_input]:px-2.5 [&_input]:py-1.5 [&_input]:[border:1px_solid_var(--color-border)] [&_input]:[border-radius:var(--radius-small)] [&_input]:[background:var(--color-surface)] [&_input]:text-[0.8125rem] [&>button]:whitespace-nowrap [&>button]:min-h-[34px] [&>button]:px-3 [&>button]:py-1.5 [@media(max-width:600px)]:flex-[1_1_100%] [@media(max-width:600px)]:[&_input]:flex-1 [@media(max-width:600px)]:[&_input]:min-w-0 [@media(max-width:600px)]:[&_input]:w-auto",
  legend:
    "mx-6 mt-0 mb-2.5 [color:var(--color-text-muted)] text-[0.6875rem] [@media(max-width:600px)]:mx-3",
  scroller:
    "overflow-x-auto overscroll-x-contain px-6 pt-0 pb-6 focus-visible:[outline:2px_solid_var(--color-focus)] focus-visible:outline-offset-2 [@media(max-width:600px)]:px-3",
  group: "min-w-[1120px] mb-6",
  // Preserve literal underscores in Tailwind attribute selectors.
  groupHeading: String.raw`mt-0 mx-0 mb-[5px] text-[0.8125rem] [&_[data-state=EN\_CURSO]]:bg-[#1678bd] [&_[data-state=EN\_CURSO]]:text-white [&_[data-state=COMPLETADA]]:bg-[#248054] [&_[data-state=COMPLETADA]]:text-white`,
  groupToggle:
    "inline-flex items-center gap-2.5 py-[7px] px-0 [border:0] bg-transparent [color:var(--color-text)] cursor-pointer [&>span:first-child]:inline-flex",
  rotated: "[transform:rotate(90deg)]",
  groupCount: "[color:var(--color-text-muted)] text-[0.75rem] font-normal",
  table:
    "w-full table-fixed border-collapse text-[0.8125rem] [&_th]:text-left [&_th]:[color:var(--color-text-muted)] [&_th]:font-normal [&_th]:py-2 [&_th]:px-1.5 [&_th]:[border-bottom:1px_solid_var(--color-border-light)] [&_th]:text-[0.75rem] [&_th:first-child]:pl-[34px] [&_td]:py-[3px] [&_td]:px-0 [&_td]:[border-bottom:1px_solid_var(--color-border-light)] [&_td]:h-14 [&_tr:hover_td]:[background:var(--color-surface-soft)] [&_tr:focus-within_td]:[background:var(--color-surface-soft)]",
  nameColumn: "w-auto",
  personColumn: "w-[170px]",
  dateColumn: "w-[140px]",
  priorityColumn: "w-[110px]",
  stateColumn: "w-[155px]",
  taskName: "flex items-center gap-[7px] min-w-0",
  chevron:
    "flex-[0_0_26px] grid place-items-center w-[26px] min-h-8 [border:0] bg-transparent [color:var(--color-text-muted)] cursor-pointer [&>span]:inline-flex [@media(pointer:coarse)]:min-h-11",
  indent: "flex-[0_0_26px]",
  indicator: String.raw`inline-flex flex-[0_0_16px] [color:var(--color-text-muted)] data-[state=EN\_CURSO]:text-[#1678bd] data-[state=COMPLETADA]:text-[#248054]`,
  nameCopy: "flex-1 min-w-0",
  context:
    "block [color:var(--color-text-muted)] text-[0.6875rem] truncate my-0.5 mx-0",
  nameLine: "flex items-center gap-1.5 min-w-0",
  nameButton:
    "min-w-0 py-0.5 px-0 bg-transparent [border:0] text-left [color:var(--color-heading)] text-[0.8125rem] leading-normal truncate cursor-pointer hover:underline",
  count: "[color:var(--color-text-muted)] text-[0.6875rem] whitespace-nowrap",
  label:
    "max-w-[70px] truncate rounded-[8px] py-0.5 px-[5px] [background:var(--color-brand-soft)] [color:var(--color-heading)] text-[0.625rem]",
  rowActions: "w-7 flex-[0_0_28px] mr-1 [&_button]:p-1",
  options:
    "max-h-60 overflow-y-auto [&_h3]:mt-3 [&_h3]:mx-1.5 [&_h3]:mb-[5px] [&_h3]:[color:var(--color-text-muted)] [&_h3]:text-[0.75rem] [&_h3]:font-normal",
  option:
    "flex items-center gap-2 w-full min-h-9 my-0.5 mx-0 py-[7px] px-2 [border:0] [border-radius:var(--radius-small)] [background:var(--color-surface)] [color:var(--color-text)] text-left text-[0.8125rem] cursor-pointer hover:[background:var(--color-hover)] aria-pressed:[background:var(--color-brand-soft)] aria-pressed:[@media(pointer:coarse)]:min-h-11",
  addTask:
    "flex items-center gap-3.5 py-2.5 px-8 min-h-10 w-full text-left [color:var(--color-text-muted)] [border:0] bg-transparent text-[0.8125rem] cursor-pointer [&>span:first-child]:text-[1.125rem] hover:[background:var(--color-surface-soft)] hover:[color:var(--color-heading)] [@media(pointer:coarse)]:min-h-11",
  empty: "my-4 mx-6 text-[0.8125rem] [color:var(--color-text-muted)]",
  emptyGroup: "my-2.5 mx-[34px] [color:var(--color-text-muted)] text-[0.75rem]",
  srOnly:
    "absolute w-px h-px overflow-hidden [clip-path:inset(50%)] whitespace-nowrap",
};

interface TaskListProps extends TaskChanges {
  project: Project;
  tasks: Task[];
  catalogs: ProjectCatalogs;
  onAction: (kind: TaskActionKind, id: number) => void;
  onCreate: (state?: string) => void;
}

export default function TaskList({
  project,
  tasks,
  catalogs,
  onAction,
  onCreate,
  onPatch,
  onState,
}: TaskListProps) {
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const hierarchy = useMemo(
    () => taskHierarchy(tasks, search),
    [tasks, search],
  );
  const byId = useMemo(
    () => new Map(tasks.map((task) => [task.id, task])),
    [tasks],
  );
  const states = project.task_states.states;
  const groups = [
    ...states,
    ...tasks
      .filter((task) => !states.some((state) => state.code === task.state_code))
      .filter(
        (task, index, all) =>
          all.findIndex((other) => other.state_code === task.state_code) ===
          index,
      )
      .map((task) => ({ code: task.state_code, name: task.state_name })),
  ];
  const canCreateIn = (code: string) =>
    project.permissions.create_tasks &&
    states.some((state) => state.code === code) &&
    (project.permissions.manage || code === "PENDIENTE");

  function rows(
    items: Task[],
    depth = 0,
    ancestors = new Set<number>(),
  ): ReactNode {
    return items
      .filter(
        (task) => hierarchy.visible.has(task.id) && !ancestors.has(task.id),
      )
      .flatMap((task) => {
        const children = hierarchy.children.get(task.id) ?? [];
        const open = expanded.has(task.id) || Boolean(search.trim());
        const next = new Set([...ancestors, task.id]);
        const actions =
          task.permissions.edit ||
          task.permissions.create_child ||
          task.permissions.dependencies;
        return [
          <tr
            key={task.id}
            data-task-id={task.id}
            onClick={(event) => {
              if (
                event.target instanceof Element &&
                !event.target.closest("button, input, textarea, [popover]")
              )
                onAction("detail", task.id);
            }}
          >
            <td>
              <div
                className={styles.taskName}
                style={{ paddingInlineStart: `${Math.min(depth, 8) * 22}px` }}
              >
                {children.length > 0 ? (
                  <button
                    className={styles.chevron}
                    type="button"
                    aria-label={`${open ? "Contraer" : "Expandir"} subtareas de ${task.name}`}
                    aria-expanded={open}
                    disabled={Boolean(search.trim())}
                    onClick={() =>
                      setExpanded((current) => {
                        const result = new Set(current);
                        if (result.has(task.id)) result.delete(task.id);
                        else result.add(task.id);
                        return result;
                      })
                    }
                  >
                    <span className={open ? styles.rotated : undefined}>
                      <TaskIcon name="next" />
                    </span>
                  </button>
                ) : (
                  <span className={styles.indent} />
                )}
                <span
                  className={styles.indicator}
                  data-state={task.state_code}
                  title={task.state_name}
                >
                  <TaskIcon
                    name={task.state_code === "COMPLETADA" ? "check" : "state"}
                  />
                </span>
                <div
                  className={`${styles.nameCopy}${depth ? " pl-[7px] [border-left:2px_solid_var(--color-border)]" : ""}`}
                >
                  <span className={styles.context}>
                    {depth
                      ? "Subtarea"
                      : task.parent_id !== null
                        ? "Subtarea asignada"
                        : project.name}
                  </span>
                  <div className={styles.nameLine}>
                    <button
                      type="button"
                      className={styles.nameButton}
                      onClick={() => onAction("detail", task.id)}
                    >
                      {task.name}
                    </button>
                    {children.length > 0 && (
                      <span className={styles.count} title="Subtareas visibles">
                        {hierarchy.descendants(task.id)}
                      </span>
                    )}
                    {task.labels.slice(0, 2).map((label) => (
                      <span
                        key={label.id}
                        className={styles.label}
                        title={`${label.name} · ${label.kind === "technical" ? "Técnica" : "No técnica"}`}
                      >
                        {label.name}
                      </span>
                    ))}
                    {task.labels.length > 2 && (
                      <span className={styles.count}>
                        +{task.labels.length - 2}
                      </span>
                    )}
                  </div>
                </div>
                {actions && (
                  <div className={styles.rowActions}>
                    <TaskProperty
                      cell
                      id={`task-${task.id}-actions`}
                      label={`Opciones de ${task.name}`}
                      value="Opciones"
                      icon="settings"
                      content={<TaskIcon name="settings" />}
                    >
                      {(close) => (
                        <div className={styles.options}>
                          {task.permissions.edit && (
                            <button
                              className={styles.option}
                              type="button"
                              onClick={() => {
                                close();
                                onAction("edit", task.id);
                              }}
                            >
                              Editar datos
                            </button>
                          )}
                          {task.permissions.create_child && (
                            <button
                              className={styles.option}
                              type="button"
                              onClick={() => {
                                close();
                                onAction("child", task.id);
                              }}
                            >
                              Nueva subtarea
                            </button>
                          )}
                          {task.permissions.dependencies && (
                            <button
                              className={styles.option}
                              type="button"
                              onClick={() => {
                                close();
                                onAction("dependencies", task.id);
                              }}
                            >
                              Dependencias
                            </button>
                          )}
                        </div>
                      )}
                    </TaskProperty>
                  </div>
                )}
              </div>
            </td>
            {(
              [
                "responsible_id",
                "start_date",
                "due_date",
                "priority",
                "state_code",
              ] as const
            ).map((field) => (
              <td key={field}>
                <TaskCell
                  field={field}
                  task={task}
                  project={project}
                  catalogs={catalogs}
                  parent={
                    task.parent_id === null
                      ? undefined
                      : byId.get(task.parent_id)
                  }
                  onPatch={onPatch}
                  onState={onState}
                />
              </td>
            ))}
          </tr>,
          ...(open ? [rows(children, depth + 1, next)] : []),
        ];
      });
  }

  return (
    <section aria-label="Lista de tareas" className={styles.list}>
      <div className={styles.toolbar}>
        <TaskProperty
          id="task-list-grouping"
          label="Agrupación"
          value="Estado"
          icon="state"
        >
          {(close) => (
            <>
              <p>
                Las tareas principales se agrupan por estado. Sus subtareas
                permanecen debajo del padre.
              </p>
              <button
                className={styles.option}
                type="button"
                onClick={() => {
                  setCollapsed(new Set());
                  close();
                }}
              >
                Expandir todos los grupos
              </button>
              <button
                className={styles.option}
                type="button"
                onClick={() => {
                  setCollapsed(new Set(groups.map((state) => state.code)));
                  close();
                }}
              >
                Contraer todos los grupos
              </button>
            </>
          )}
        </TaskProperty>
        <div className={styles.tools}>
          <input
            aria-label="Buscar tareas por nombre, responsable o etiqueta"
            type="search"
            name="task_search"
            placeholder="Buscar tareas…"
            autoComplete="off"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          {project.permissions.create_tasks && (
            <button
              className="primary-button"
              type="button"
              onClick={() => onCreate()}
            >
              + Tarea
            </button>
          )}
        </div>
      </div>
      <p className={styles.legend}>
        Los contadores incluyen tareas principales visibles y sus subtareas,
        también las contraídas.
      </p>
      {hierarchy.roots.length === 0 && (
        <p className={styles.empty} role="status">
          {search
            ? "No hay tareas que coincidan con la búsqueda."
            : "No hay tareas visibles. Crea una tarea para comenzar si tienes permiso."}
        </p>
      )}
      <div
        className={styles.scroller}
        tabIndex={0}
        role="region"
        aria-label="Tabla de tareas con desplazamiento horizontal"
      >
        {groups.map((state) => {
          const roots = hierarchy.roots.filter(
            (task) => task.state_code === state.code,
          );
          const childrenCount = roots.reduce(
            (count, task) => count + hierarchy.descendants(task.id),
            0,
          );
          const open = !collapsed.has(state.code);
          if (search && !roots.length) return null;
          return (
            <section
              className={styles.group}
              key={state.code}
              aria-label={state.name}
            >
              <h2 className={styles.groupHeading}>
                <button
                  type="button"
                  className={styles.groupToggle}
                  aria-expanded={open}
                  aria-controls={`group-${state.code}`}
                  onClick={() =>
                    setCollapsed((current) => {
                      const next = new Set(current);
                      if (next.has(state.code)) next.delete(state.code);
                      else next.add(state.code);
                      return next;
                    })
                  }
                >
                  <span className={open ? styles.rotated : undefined}>
                    <TaskIcon name="next" />
                  </span>
                  <StateLabel code={state.code} name={state.name} />
                  <span className={styles.groupCount}>
                    {roots.length} tareas
                    {childrenCount > 0 && ` · ${childrenCount} subtareas`}
                  </span>
                </button>
              </h2>
              <div id={`group-${state.code}`} hidden={!open}>
                <table
                  className={styles.table}
                  aria-label={`Tareas de ${state.name}`}
                >
                  <colgroup>
                    <col className={styles.nameColumn} />
                    <col className={styles.personColumn} />
                    <col className={styles.dateColumn} />
                    <col className={styles.dateColumn} />
                    <col className={styles.priorityColumn} />
                    <col className={styles.stateColumn} />
                  </colgroup>
                  <thead>
                    <tr>
                      {[
                        "Nombre",
                        "Persona asignada",
                        "Fecha de inicio",
                        "Fecha límite",
                        "Prioridad",
                        "Estado",
                      ].map((label) => (
                        <th scope="col" key={label}>
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>{rows(roots)}</tbody>
                </table>
                {canCreateIn(state.code) && (
                  <button
                    className={styles.addTask}
                    type="button"
                    onClick={() => onCreate(state.code)}
                  >
                    <span aria-hidden="true">+</span> Añadir tarea
                    <span className={styles.srOnly}> en {state.name}</span>
                  </button>
                )}
                {!roots.length && !canCreateIn(state.code) && (
                  <p className={styles.emptyGroup}>
                    Sin tareas principales en este estado.
                  </p>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </section>
  );
}
