import { useId, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { Project, ProjectCatalogs, Task, TaskActionKind, TaskListGroup } from "../types";
import TaskProperty from "../TaskForm/TaskProperty";
import TaskIcon from "../TaskForm/TaskIcon";
import TaskCell from "./TaskCell";
import type { TaskChanges } from "./TaskCell";
import { useTaskGrouping } from "./useTaskGrouping";
import TaskGroupingControl from "./TaskGroupingControl";
import TaskGroupExpansionControl from "./TaskGroupExpansionControl";
import TaskGroupLabel from "./TaskGroupLabel";
import TaskStatusSettingsControl from "./TaskStatusSettingsControl";

const styles = {
  list: "min-w-0 [&_:where(button,input):focus-visible]:[outline:2px_solid_var(--color-focus)] [&_:where(button,input):focus-visible]:outline-offset-2",
  toolbar:
    "flex min-w-0 flex-wrap items-center justify-between gap-2 border-b border-neutral-100 px-3 py-2 sm:px-5",
  tools:
    "min-w-0 basis-44 sm:basis-56 [&_input]:w-full [&_input]:min-w-0 [&_input]:rounded-lg [&_input]:border [&_input]:border-neutral-200 [&_input]:bg-white [&_input]:px-3 [&_input]:py-1.5 [&_input]:text-xs [&_input]:text-neutral-800 [&_input]:placeholder:text-neutral-600 [&_input:focus-visible]:outline-2 [&_input:focus-visible]:outline-offset-2 [&_input:focus-visible]:outline-neutral-700",
  legend:
    "mx-3 mt-2 mb-2.5 text-xs text-neutral-600 sm:mx-5",
  scroller:
    "overflow-x-auto overscroll-x-contain px-3 pt-0 pb-6 focus-visible:[outline:2px_solid_var(--color-focus)] focus-visible:outline-offset-2 sm:px-5",
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
  onConfigure?: () => void;
}

export default function TaskList({
  project,
  tasks,
  catalogs,
  onAction,
  onCreate,
  onPatch,
  onState,
  onConfigure,
}: TaskListProps) {
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [collapsedContext, setCollapsedContext] = useState<Set<string>>(new Set());
  const listId = useId();
  const { hierarchy, groups, preferences, setPreferences } = useTaskGrouping(tasks, search, project.task_states.states, catalogs.priorities);
  const byId = useMemo(
    () => new Map(tasks.map((task) => [task.id, task])),
    [tasks],
  );
  const states = project.task_states.states;
  const allGroupsExpanded = groups.length > 0 && groups.every((group) => !collapsed.has(group.key));
  const canCreateIn = (code: string) =>
    project.permissions.create_tasks &&
    states.some((state) => state.code === code) &&
    (project.permissions.manage || states.some((state) => state.code === code && (state.category === "not_started" || !state.category && code === "PENDIENTE")));

  function rows(
    items: Task[],
    group: TaskListGroup,
    depth = 0,
    ancestors = new Set<number>(),
  ): ReactNode {
    return items
      .filter(
        (task) => group.visible.has(task.id) && !ancestors.has(task.id),
      )
      .flatMap((task) => {
        const children = (hierarchy.children.get(task.id) ?? []).filter((child) => group.visible.has(child.id));
        const context = !group.members.has(task.id);
        const contextKey = `${group.key}:${task.id}`;
        const open = Boolean(search.trim()) || (context ? !collapsedContext.has(contextKey) : expanded.has(task.id));
        const next = new Set([...ancestors, task.id]);
        const actions =
          task.permissions.edit ||
          task.permissions.create_child ||
          task.permissions.dependencies;
        return [
          <tr
            key={task.id}
            data-task-id={task.id}
            data-context={context || undefined}
            className={context ? "bg-neutral-50" : undefined}
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
                    onClick={() => {
                      if (context) setCollapsedContext((current) => {
                        const result = new Set(current);
                        if (result.has(contextKey)) result.delete(contextKey); else result.add(contextKey);
                        return result;
                      });
                      else setExpanded((current) => {
                        const result = new Set(current);
                        if (result.has(task.id)) result.delete(task.id);
                        else result.add(task.id);
                        return result;
                      });
                    }}
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
                  style={task.state_color ? { color: task.state_color } : undefined}
                >
                  <TaskIcon
                    name={task.state_code !== "CANCELADA" && (task.state_category === "closed" || task.state_category === "done" || !task.state_category && task.state_code === "COMPLETADA") ? "check" : "state"}
                  />
                </span>
                <div
                  className={`${styles.nameCopy}${depth ? " pl-[7px] [border-left:2px_solid_var(--color-border)]" : ""}`}
                >
                  {(context || depth > 0 || task.parent_id !== null) && (
                    <span className={styles.context}>
                      {context ? "Padre de contexto · no suma al grupo" : depth ? "Subtarea" : "Subtarea asignada"}
                    </span>
                  )}
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
                        {hierarchy.descendants(task.id, new Set(), group.visible)}
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
                      id={`${listId}-${encodeURIComponent(group.key)}-task-${task.id}-actions`}
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
          ...(open ? [rows(children, group, depth + 1, next)] : []),
        ];
      });
  }

  return (
    <section aria-label="Lista de tareas" className={styles.list}>
      <div className={styles.toolbar}>
        <TaskGroupingControl preferences={preferences} onChange={setPreferences} />
        <div className="ml-auto flex min-w-0 items-center justify-end gap-2 max-sm:flex-1">
          {project.permissions.manage && project.task_states.can_configure && onConfigure && <TaskStatusSettingsControl onClick={onConfigure} />}
          <TaskGroupExpansionControl expanded={allGroupsExpanded} disabled={!groups.length}
            controls={groups.map((_, index) => `${listId}-group-${index}`).join(" ")}
            onToggle={() => setCollapsed((current) => {
              const next = new Set(current);
              for (const group of groups) {
                if (allGroupsExpanded) next.add(group.key); else next.delete(group.key);
              }
              return next;
            })} />
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
          </div>
        </div>
      </div>
      <p className={styles.legend}>
        {hierarchy.visible.size} tareas únicas visibles. Los contadores incluyen subtareas contraídas, no padres de contexto.
        {preferences.mode === "assignees" && preferences.separatePeople || preferences.mode === "labels" && preferences.separateLabels
          ? " Una tarea puede aparecer en varios grupos sin duplicarse en el total." : ""}
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
        {groups.map((group, index) => {
          const open = !collapsed.has(group.key);
          const groupId = `${listId}-group-${index}`;
          const canCreate = group.stateCode ? canCreateIn(group.stateCode) : project.permissions.create_tasks;
          return (
            <section
              className={styles.group}
              key={group.key}
              aria-label={group.name}
              data-group-key={group.key}
            >
              <h2 className={styles.groupHeading}>
                <button
                  type="button"
                  className={styles.groupToggle}
                  aria-expanded={open}
                  aria-controls={groupId}
                  onClick={() =>
                    setCollapsed((current) => {
                      const next = new Set(current);
                      if (next.has(group.key)) next.delete(group.key);
                      else next.add(group.key);
                      return next;
                    })
                  }
                >
                  <span className={open ? styles.rotated : undefined}>
                    <TaskIcon name="next" />
                  </span>
                  <TaskGroupLabel group={group} mode={preferences.mode} />
                  <span className={styles.groupCount}>
                    {group.members.size} {group.members.size === 1 ? "tarea" : "tareas"}
                  </span>
                </button>
              </h2>
              <div id={groupId} hidden={!open}>
                <table
                  className={styles.table}
                  aria-label={`Tareas de ${group.name}`}
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
                  <tbody>{rows(group.roots, group)}</tbody>
                </table>
                {canCreate && (
                  <button
                    className={styles.addTask}
                    type="button"
                    onClick={() => onCreate(group.stateCode)}
                  >
                    <span aria-hidden="true">+</span> Añadir tarea
                    <span className={styles.srOnly}> · {group.name}</span>
                  </button>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </section>
  );
}
