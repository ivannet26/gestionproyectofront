import type { ReactNode } from "react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import ProjectToolbar from "../ProjectWorkspace/ProjectToolbar";
import TaskIcon from "../TaskForm/TaskIcon";
import TaskProperty from "../TaskForm/TaskProperty";
import type { Project, ProjectCatalogs, Task, TaskActionKind, TaskListGroup } from "../types";
import QuickTaskRow from "./QuickTaskRow";
import { stateInk } from "./stateInk";
import type { TaskChanges } from "./TaskCell";
import TaskCell from "./TaskCell";
import TaskGroupExpansionControl from "./TaskGroupExpansionControl";
import TaskGroupingControl from "./TaskGroupingControl";
import TaskGroupLabel from "./TaskGroupLabel";
import "./taskListInteractions.css";
import TaskMoveControl from "./TaskMoveControl";
import TaskSearch from "./TaskSearch";
import TaskStatusSettingsControl from "./TaskStatusSettingsControl";
import { useTaskGrouping } from "./useTaskGrouping";
import { useTaskMove } from "./useTaskMove";
import { taskDropPosition } from "./taskDropPosition";

const styles = {
  list: "gm-task-list min-w-0 [&_:where(button,input):focus-visible]:outline-2 outline-neutral-700 [&_:where(button,input):focus-visible]:outline-offset-2",
  scroller:
    "relative max-h-[calc(100dvh-18rem)] overflow-auto overscroll-contain px-3 pt-0 pb-6 focus-visible:outline-2 outline-neutral-700 focus-visible:outline-offset-2 sm:px-5 [container-type:inline-size]",
  group: "gm-task-group relative min-w-[1120px] mb-6",
  // Preserve literal underscores in Tailwind attribute selectors.
  groupHeading: String.raw`mt-0 mx-0 mb-[5px] text-[0.8125rem] [&_[data-state=EN\_CURSO]]:bg-[#1678bd] [&_[data-state=EN\_CURSO]]:text-white [&_[data-state=COMPLETADA]]:bg-[#248054] [&_[data-state=COMPLETADA]]:text-white`,
  groupToggle:
    "inline-flex items-center gap-2.5 py-[7px] px-0 [border:0] bg-transparent text-neutral-800 cursor-pointer [&>span:first-child]:inline-flex",
  rotated: "[transform:rotate(90deg)]",
  groupCount: "text-neutral-600 text-[0.75rem] font-normal",
  table:
    "w-full table-fixed border-collapse text-[0.8125rem] text-neutral-800 [&_th]:text-left [&_th]:text-neutral-700 [&_th]:font-medium [&_th]:py-2 [&_th]:px-1.5 [&_th]:border-b [&_th]:border-neutral-200 [&_th]:text-xs [&_th:first-child]:pl-[63px] [&_td]:py-[3px] [&_td]:px-0 [&_td]:border-b [&_td]:border-neutral-200 [&_td]:h-14 [&_tr:hover_td]:bg-neutral-50 [&_tr:focus-within_td]:bg-neutral-50",
  nameColumn: "w-auto",
  personColumn: "w-[170px]",
  dateColumn: "w-[140px]",
  priorityColumn: "w-[110px]",
  stateColumn: "w-[155px]",
  taskName: "flex items-center gap-[7px] min-w-0",
  chevron:
    "flex-[0_0_26px] grid place-items-center w-[26px] min-h-8 [border:0] bg-transparent text-neutral-600 cursor-pointer [&>span]:inline-flex [@media(pointer:coarse)]:min-h-11",
  indent: "flex-[0_0_26px]",
  indicator: String.raw`inline-flex flex-[0_0_16px] text-neutral-600 data-[state=EN\_CURSO]:text-[#1678bd] data-[state=COMPLETADA]:text-[#248054]`,
  nameCopy: "flex-1 min-w-0",
  context: "block text-neutral-600 text-[0.6875rem] truncate my-0.5 mx-0",
  nameLine: "flex items-center gap-1.5 min-w-0",
  nameButton:
    "min-w-0 py-0.5 px-0 bg-transparent [border:0] text-left text-neutral-800 text-[0.8125rem] leading-normal truncate cursor-pointer hover:underline",
  count: "text-neutral-600 text-[0.6875rem] whitespace-nowrap",
  label:
    "max-w-[70px] truncate rounded-[8px] py-0.5 px-[5px] bg-neutral-100 text-neutral-800 text-[0.625rem]",
  rowActions: "gm-row-actions flex shrink-0 items-center gap-1 mr-1 [&_button]:p-1",
  options:
    "max-h-60 overflow-y-auto [&_h3]:mt-3 [&_h3]:mx-1.5 [&_h3]:mb-[5px] [&_h3]:text-neutral-600 [&_h3]:text-[0.75rem] [&_h3]:font-normal",
  option:
    "flex items-center gap-2 w-full min-h-9 my-0.5 mx-0 py-[7px] px-2 [border:0] rounded-lg bg-white text-neutral-800 text-left text-[0.8125rem] cursor-pointer hover:bg-neutral-100 aria-pressed:bg-neutral-100 aria-pressed:[@media(pointer:coarse)]:min-h-11",
  addTask:
    "flex items-center gap-3.5 py-2.5 px-8 min-h-10 w-full text-left text-neutral-600 [border:0] bg-transparent text-[0.8125rem] cursor-pointer [&>span:first-child]:text-[1.125rem] hover:bg-neutral-100 hover:text-neutral-800 [@media(pointer:coarse)]:min-h-11",
  empty: "my-4 mx-6 text-[0.8125rem] text-neutral-600",
  emptyGroup: "my-2.5 mx-[34px] text-neutral-600 text-[0.75rem]",
  srOnly:
    "absolute w-px h-px overflow-hidden [clip-path:inset(50%)] whitespace-nowrap",
};

interface TaskListProps extends TaskChanges {
  project: Project;
  tasks: Task[];
  catalogs: ProjectCatalogs;
  onAction: (kind: TaskActionKind, id: number) => void;
  onCreated: (task: Task) => void;
  onConfigure?: () => void;
  primaryAction?: ReactNode;
  onMoved?: (tasks: Task[]) => void;
  onCountChange?: (count: number) => void;
}

export default function TaskList({
  project,
  tasks,
  catalogs,
  onAction,
  onCreated,
  onPatch,
  onState,
  onConfigure,
  primaryAction,
  onMoved,
  onCountChange,
}: TaskListProps) {
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [collapsedContext, setCollapsedContext] = useState<Set<string>>(
    new Set(),
  );
  const [draftGroup, setDraftGroup] = useState<string | null>(null);
  const pendingQuickTask = useRef(false);
  const dragClick = useRef(false);
  const touch = useRef(false);
  const dragPoint = useRef({ x: 0, y: 0 });
  const listActive = useRef(false);
  useEffect(() => {
    listActive.current = true;
    return () => {
      listActive.current = false;
    };
  }, []);
  const listId = useId();
  const region = useRef<HTMLDivElement>(null);
  const movement = useTaskMove(project, onMoved, region);
  const { hierarchy, groups, preferences, setPreferences } = useTaskGrouping(tasks, search, project.task_states.states, catalogs.priorities);
  const byId = useMemo(
    () => new Map(tasks.map((task) => [task.id, task])),
    [tasks],
  );
  const states = project.task_states.states;
  useEffect(() => { onCountChange?.(hierarchy.visible.size); }, [hierarchy.visible.size, onCountChange]);

  function updateDrop(x: number, y: number) {
    const node = region.current, task = movement.dragging;
    if (!node || !task || preferences.mode !== "state") { movement.over(null); return false; }
    const bounds = node.getBoundingClientRect();
    if (x < bounds.left || x > bounds.right || y < bounds.top || y > bounds.bottom) { movement.over(null); return false; }
    const sections = Array.from(node.querySelectorAll<HTMLElement>("[data-group-key]"));
    const section = sections.find((section, index) => {
      const r = section.getBoundingClientRect(), next = sections[index + 1]?.getBoundingClientRect();
      return y >= r.top && y < (next?.top ?? bounds.bottom);
    }) ?? sections[0];
    const group = groups.find((group) => group.key === section?.dataset.groupKey);
    if (!section || !group?.stateCode || !movement.permitted(task, group.stateCode)) { movement.over(null); return false; }
    const table = section.querySelector("table")!, tableBounds = table.getBoundingClientRect();
    const heading = section.querySelector("h2")!.getBoundingClientRect();
    const collapsed = table.getClientRects().length === 0;
    const rows = Array.from(section.querySelectorAll<HTMLTableRowElement>("tbody tr")).filter((row) => row.getClientRects().length).map((row) => {
      const r = row.getBoundingClientRect();
      return { id: row.dataset.taskId ? Number(row.dataset.taskId) : undefined, reference: row.dataset.parentReference ? Number(row.dataset.parentReference) : undefined, top: r.top, bottom: r.bottom };
    });
    const position = collapsed ? { before: null, y: heading.bottom } : taskDropPosition(task, group.stateCode, tasks, rows, y, tableBounds.bottom);
    movement.over({ state: group.stateCode, before: position.before, top: Math.max(position.y, Math.min(heading.bottom, tableBounds.bottom || heading.bottom)) - bounds.top + node.scrollTop,
      left: (collapsed ? section.getBoundingClientRect().left : tableBounds.left) - bounds.left + node.scrollLeft, width: collapsed ? section.offsetWidth : tableBounds.width });
    return true;
  }
  const allGroupsExpanded =
    groups.length > 0 && groups.every((group) => !collapsed.has(group.key));
  const canCreateIn = (code: string) =>
    project.permissions.create_tasks &&
    states.some((state) => state.code === code) &&
    (project.permissions.manage ||
      states.some(
        (state) =>
          state.code === code &&
          (state.category === "not_started" ||
            (!state.category && code === "PENDIENTE")),
      ));

  function rows(
    items: Task[],
    group: TaskListGroup,
    depth = 0,
    ancestors = new Set<number>(),
  ): ReactNode[] {
    return items
      .filter((task) => group.visible.has(task.id) && !ancestors.has(task.id))
      .flatMap((task) => {
        const children = (hierarchy.children.get(task.id) ?? []).filter(
          (child) => group.visible.has(child.id),
        );
        const context = !group.members.has(task.id);
        const contextKey = `${group.key}:${task.id}`;
        const open =
          Boolean(search.trim()) ||
          (context ? !collapsedContext.has(contextKey) : expanded.has(task.id));
        const next = new Set([...ancestors, task.id]);
        const actions =
          task.permissions.edit ||
          task.permissions.create_child ||
          task.permissions.dependencies || task.permissions.state;
        if (context && preferences.mode === "state") return [
          <tr key={`reference-${task.id}`} data-parent-reference={task.id} className="gm-parent-reference">
            <td colSpan={6}><button type="button" title={`Subtareas de ${task.name}`} className="inline-flex max-w-full cursor-pointer items-center gap-2 px-7 py-1.5 text-left text-xs text-neutral-600 hover:text-neutral-800 hover:underline"
              onClick={() => onAction("detail", task.id)}><TaskIcon name="relation" /><span className="min-w-0 truncate">Subtareas de {task.name}</span></button></td>
          </tr>, ...rows(children, group, depth, next),
        ];
        return [
          <tr
            key={task.id}
            data-task-id={task.id}
            data-context={context || undefined}
            data-dragging={movement.dragging?.id === task.id || undefined}
            className={`gm-task-row${context ? " bg-neutral-50" : ""}`}
            draggable={preferences.mode === "state" && !context && !search.trim() && !movement.busy && task.permissions.state && Boolean(task.move_revision && onMoved)}
            onPointerDown={(event) => { touch.current = event.pointerType === "touch"; }}
            onDragStart={(event) => {
              if (touch.current || !event.currentTarget.draggable || event.target instanceof Element && event.target.closest("input, textarea, select, [contenteditable=true], [popover], a")) { event.preventDefault(); return; }
              event.dataTransfer.effectAllowed = "move";
              event.dataTransfer.setData("text/plain", String(task.id));
              const preview = document.createElement("div");
              preview.className = "gm-task-drag-preview"; preview.textContent = task.name;
              preview.style.borderInlineStartColor = task.state_color ?? "#525252";
              preview.setAttribute("aria-hidden", "true"); document.body.append(preview);
              event.dataTransfer.setDragImage(preview, 16, 16);
              requestAnimationFrame(() => preview.remove());
              dragClick.current = true; movement.start(task, event.clientX, event.clientY);
            }}
            onDragEnd={() => { movement.end(); requestAnimationFrame(() => { dragClick.current = false; }); }}
            onClickCapture={(event) => { if (dragClick.current) { event.preventDefault(); event.stopPropagation(); } }}
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
                      if (context)
                        setCollapsedContext((current) => {
                          const result = new Set(current);
                          if (result.has(contextKey)) result.delete(contextKey);
                          else result.add(contextKey);
                          return result;
                        });
                      else
                        setExpanded((current) => {
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
                  style={
                    task.state_color
                      ? {
                        backgroundColor: task.state_color,
                        color: stateInk(task.state_color),
                        borderRadius: "50%",
                        outline: "1px solid #737373",
                      }
                      : undefined
                  }
                >
                  <TaskIcon
                    name={
                      task.state_code !== "CANCELADA" &&
                        (task.state_category === "closed" ||
                          task.state_category === "done" ||
                          (!task.state_category &&
                            task.state_code === "COMPLETADA"))
                        ? "check"
                        : "state"
                    }
                  />
                </span>
                <div
                  className={`${styles.nameCopy}${depth ? " pl-[7px] [border-left:2px_solid_var(--color-border)]" : ""}`}
                >
                  {(context || depth > 0 || task.parent_id !== null) && (
                    <span className={styles.context}>
                      {context
                        ? "Padre de contexto · no suma al grupo"
                        : depth
                          ? "Subtarea"
                          : "Subtarea asignada"}
                    </span>
                  )}
                  <div className={styles.nameLine}>
                    <button
                      type="button"
                      className={styles.nameButton}
                      title={task.name}
                      onClick={() => onAction("detail", task.id)}
                    >
                      {task.name}
                    </button>
                    {children.length > 0 && (
                      <span className={styles.count} title="Subtareas visibles">
                        {hierarchy.descendants(
                          task.id,
                          new Set(),
                          group.visible,
                        )}
                      </span>
                    )}
                    {task.labels.slice(0, 2).map((label) => (
                      <span
                        key={label.id}
                        className={styles.label}
                        title={label.name}
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
                    {task.permissions.edit && (
                      <TaskCell
                        field="labels"
                        task={task}
                        project={project}
                        catalogs={catalogs}
                        onPatch={onPatch}
                        onState={onState}
                      />
                    )}
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
                          {preferences.mode === "state" && !context && task.permissions.state && task.move_revision && onMoved && <TaskMoveControl key={`${task.id}:${task.state_code}`} task={task} states={states} tasks={tasks}
                            disabled={movement.busy || Boolean(search.trim())} onMove={movement.propose} onClose={close} />}
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
    <section aria-label="Lista de tareas" className={styles.list} data-moving={Boolean(movement.dragging) || undefined} aria-busy={movement.busy}>
      <ProjectToolbar action={primaryAction}>
        <fieldset className="m-0 min-w-0 border-0 p-0">
          <TaskGroupingControl
            preferences={preferences}
            onChange={setPreferences}
          />
        </fieldset>
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
        <TaskSearch value={search} onChange={setSearch} />
      </ProjectToolbar>
      {movement.error && <p role="alert" className="mx-5 text-xs text-red-700">{movement.error} <button type="button" className="cursor-pointer rounded px-2 py-1 underline" disabled={movement.busy} onClick={() => { void movement.refresh(); }}>Actualizar lista</button></p>}
      {search.trim() && preferences.mode === "state" && <p className="mx-5 text-xs text-neutral-600">Limpia la búsqueda para mover posiciones. Puedes seguir usando el selector de estado.</p>}
      {hierarchy.roots.length === 0 && (
        <p className={styles.empty} role="status">
          {search
            ? "No hay tareas que coincidan con la búsqueda."
            : "No hay tareas visibles. Crea una tarea para comenzar si tienes permiso."}
        </p>
      )}
      <div
        ref={region}
        className={styles.scroller}
        tabIndex={0}
        role="region"
        aria-label="Tabla de tareas con desplazamiento horizontal"
        onDragOver={(event) => {
          dragPoint.current = { x: event.clientX, y: event.clientY };
          movement.track(event.clientX, event.clientY);
          if (updateDrop(event.clientX, event.clientY)) { event.preventDefault(); event.dataTransfer.dropEffect = "move"; }
          else event.dataTransfer.dropEffect = "none";
        }}
        onScroll={() => { if (movement.dragging) updateDrop(dragPoint.current.x, dragPoint.current.y); }}
        onDrop={(event) => {
          if (!movement.dragging) return;
          event.preventDefault();
          if (movement.drop) movement.propose(movement.dragging, movement.drop.state, movement.drop.before);
          movement.end();
        }}
        onDragLeave={(event) => { if (!(event.relatedTarget instanceof Node) || !event.currentTarget.contains(event.relatedTarget)) movement.over(null); }}
      >
        {groups.map((group, index) => {
          const open = !collapsed.has(group.key);
          const groupId = `${listId}-group-${index}`;
          const canCreate = group.stateCode
            ? canCreateIn(group.stateCode)
            : project.permissions.create_tasks;
          return (
            <section
              className={styles.group}
              key={group.key}
              aria-label={group.name}
              data-group-key={group.key}
            >
              <h2 className={`gm-group-heading ${styles.groupHeading}`}>
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
                    {group.members.size}{" "}
                    {group.members.size === 1 ? "tarea" : "tareas"}
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
                {canCreate && draftGroup === group.key ? (
                  <QuickTaskRow
                    key={`${project.id}:${group.key}`}
                    project={project}
                    catalogs={catalogs}
                    groupCode={group.stateCode}
                    onCreated={onCreated}
                    savingRef={pendingQuickTask}
                    onClose={(returnFocus = true) => {
                      setDraftGroup(null);
                      if (returnFocus)
                        requestAnimationFrame(() =>
                          document
                            .getElementById(
                              `${listId}-${encodeURIComponent(group.key)}-create`,
                            )
                            ?.focus({ preventScroll: true }),
                        );
                    }}
                    onDetachedCreated={(task) => {
                      if (listActive.current) {
                        setDraftGroup(null);
                        onCreated(task);
                      }
                    }}
                  />
                ) : (
                  canCreate && (
                    <button
                      id={`${listId}-${encodeURIComponent(group.key)}-create`}
                      className={styles.addTask}
                      type="button"
                      onClick={() => {
                        if (!pendingQuickTask.current) setDraftGroup(group.key);
                      }}
                    >
                      <span aria-hidden="true">+</span> Añadir tarea
                      <span className={styles.srOnly}> · {group.name}</span>
                    </button>
                  )
                )}
              </div>
            </section>
          );
        })}
        {movement.dragging && movement.drop && <div className="gm-task-insertion" aria-hidden="true"
          style={{ top: movement.drop.top, left: movement.drop.left, width: movement.drop.width }} />}
      </div>
      {movement.dragging && <div role="status" className="pointer-events-none fixed bottom-4 left-1/2 z-50 max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs text-neutral-800">
        <span className="block max-w-80 truncate font-medium">{movement.dragging.name}</span>
        <span className="text-neutral-600">{movement.drop ? `Soltar en ${states.find((state) => state.code === movement.drop!.state)?.name ?? movement.drop.state}` : "Arrastra hacia un estado disponible"} · Escape para cancelar</span>
      </div>}
    </section>
  );
}
