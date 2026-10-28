import type { ReactNode } from "react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import ChevronDownIcon from "../../../shared/icons/ChevronDownIcon";
import PlusIcon from "../../../shared/icons/PlusIcon";
import type {
  Project,
  ProjectCatalogs,
  Task,
  TaskActionKind,
  TaskGroupingPreferences,
  TaskListGroup,
} from "../types";
import QuickTaskRow from "./QuickTaskRow";
import { taskDropPosition } from "./taskDropPosition";
import { useTaskMove } from "./useTaskMove";
import { useTaskPointerDrag } from "./useTaskPointerDrag";
import { taskDragSurface } from "./taskDragSurface";
import "./taskListInteractions.css";

export interface TaskGroupControls {
  expanded: boolean;
  disabled: boolean;
  controls: string;
  toggle: () => void;
}
import type { TaskChanges } from "./TaskCell";
import TaskCell, { StateIcon } from "./TaskCell";
import TaskGroupLabel from "./TaskGroupLabel";
import { useTaskGrouping } from "./useTaskGrouping";

interface TaskListProps extends TaskChanges {
  project: Project;
  tasks: Task[];
  catalogs: ProjectCatalogs;
  onAction: (kind: TaskActionKind, id: number) => void;
  onCreated: (task: Task) => void;
  onMoved?: (tasks: Task[]) => void;
  search: string;
  preferences: TaskGroupingPreferences;
  onCountChange?: (count: number) => void;
  onGroupControls?: (controls: TaskGroupControls | null) => void;
}

export default function TaskList({
  project,
  tasks,
  catalogs,
  onAction,
  onCreated,
  onPatch,
  onState,
  search,
  preferences,
  onMoved,
  onCountChange,
  onGroupControls,
}: TaskListProps) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [collapsedContext, setCollapsedContext] = useState<Set<string>>(
    new Set(),
  );
  const [draftGroup, setDraftGroup] = useState<string | null>(null);
  const pendingQuickTask = useRef(false);
  const listActive = useRef(false);
  useEffect(() => {
    listActive.current = true;
    return () => {
      listActive.current = false;
    };
  }, []);
  const listId = useId();
  const region = useRef<HTMLDivElement>(null);
  const movement = useTaskMove(project, onMoved, region, tasks);
  const byId = useMemo(
    () => new Map(tasks.map((task) => [task.id, task])),
    [tasks],
  );
  const states = project.task_states.states;
  const { hierarchy, groups } = useTaskGrouping(
    tasks,
    search,
    states,
    catalogs.priorities,
    preferences,
  );
  useEffect(() => { onCountChange?.(hierarchy.visible.size); }, [hierarchy.visible.size, onCountChange]);
  useEffect(() => {
    onGroupControls?.({
      expanded: groups.length > 0 && groups.every((group) => !collapsed.has(group.key)),
      disabled: groups.length === 0,
      controls: groups.map((_, index) => `${listId}-group-${index}`).join(" "),
      toggle: () => setCollapsed((current) => {
        const next = new Set(current), close = groups.every((group) => !current.has(group.key));
        for (const group of groups) { if (close) next.add(group.key); else next.delete(group.key); }
        return next;
      }),
    });
  }, [groups, collapsed, listId, onGroupControls]);
  useEffect(() => () => onGroupControls?.(null), [onGroupControls]);

  function locate(x: number, y: number, initialTask: Task) {
    const task = byId.get(initialTask.id) ?? initialTask;
    const node = region.current;
    if (!node || preferences.mode !== "state" || search.trim()) return null;
    const bounds = node.getBoundingClientRect();
    if (x < bounds.left || x > bounds.right || y < bounds.top || y > bounds.bottom) return null;
    const sections = Array.from(node.querySelectorAll<HTMLElement>("[data-group-key]"));
    const section = sections.find((section, index) => {
      const rect = section.getBoundingClientRect(), next = sections[index + 1]?.getBoundingClientRect();
      return y >= rect.top && y < (next?.top ?? bounds.bottom);
    }) ?? sections[0];
    const group = groups.find((group) => group.key === section?.dataset.groupKey);
    if (!section || !group?.stateCode) return null;
    const root = hierarchy.rootById.get(task.id) ?? task;
    const changingChild = task.parent_id !== null && group.stateCode !== root.state_code;
    const state = task.parent_id !== null && !changingChild ? task.state_code : group.stateCode;
    if (!movement.permitted(task, state)) return null;
    const placement = changingChild ? sections.find((item) => item.dataset.groupKey === `state:${root.state_code}`) : section;
    if (!placement) return null;
    const table = placement.querySelector("table")!, tableBounds = table.getBoundingClientRect();
    const heading = placement.querySelector("h2")!.getBoundingClientRect();
    const hidden = table.getClientRects().length === 0;
    const visibleRows = Array.from(placement.querySelectorAll<HTMLTableRowElement>("tbody tr")).filter((row) => row.getClientRects().length).map((row) => {
      const rect = row.getBoundingClientRect();
      return { id: row.dataset.taskId ? Number(row.dataset.taskId) : undefined, reference: row.dataset.parentReference ? Number(row.dataset.parentReference) : undefined, top: rect.top, bottom: rect.bottom };
    });
    const hovered = changingChild ? undefined : visibleRows.find((row) => y >= row.top && y < row.bottom && row.id !== undefined);
    const target = hovered?.id === undefined ? undefined : byId.get(hovered.id);
    if (target && target.id !== task.id && target.id !== task.parent_id && target.parent_id !== task.parent_id) return null;
    if (target && target.id !== task.id && target.id !== task.parent_id && target.state_code !== state) return null;
    const position = hidden ? { before: null, y: heading.bottom } : taskDropPosition(task, state, tasks, visibleRows, changingChild ? Infinity : y, tableBounds.bottom);
    return {
      state, before: position.before,
      top: Math.max(position.y, Math.min(heading.bottom, tableBounds.bottom || heading.bottom)) - bounds.top + node.scrollTop,
      left: (hidden ? placement.getBoundingClientRect().left : tableBounds.left) - bounds.left + node.scrollLeft,
      width: hidden ? placement.offsetWidth : tableBounds.width,
    };
  }
  const pointerDrag = useTaskPointerDrag({ movement, locate, region });
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
        return [
          <tr
            key={task.id}
            data-task-id={task.id}
            data-context={context || undefined}
            data-depth={depth}
            data-own-state={task.state_code}
            data-nested-state={preferences.mode === "state" && task.state_code !== group.stateCode || undefined}
            data-dragging={movement.dragging?.id === task.id || undefined}
            data-drag-enabled={preferences.mode === "state" && !context && !search.trim() && task.permissions.state && Boolean(task.move_revision && onMoved) || undefined}
            className="gm-task-row group/row h-12 border-b border-neutral-200 hover:bg-neutral-100"
            onClick={(event) => {
              if (
                event.target instanceof Element &&
                !event.target.closest("button, input, textarea, select, a, summary, [contenteditable=true], [popover]")
              )
                onAction("detail", task.id);
            }}
          >
            <td className="px-3 py-1">
              <div
                className="flex min-w-0 items-center gap-2"
                style={{ paddingInlineStart: `${Math.min(depth, 8) * 20}px` }}
              >
                {(hierarchy.children.get(task.id) ?? []).some((child) => hierarchy.visible.has(child.id)) ? (
                  <button
                    className="inline-flex size-5 shrink-0 cursor-pointer items-center justify-center text-neutral-500 hover:text-neutral-800"
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
                    <ChevronDownIcon
                      className={`size-4 ${open ? "" : "-rotate-90"}`}
                    />
                  </button>
                ) : (
                  <span className="w-5 shrink-0" />
                )}
                <span className="inline-flex shrink-0" title={task.state_name}>
                  <StateIcon
                    code={task.state_code}
                    name={task.state_name}
                    category={task.state_category}
                    color={task.state_color}
                  />
                </span>
                <div className="min-w-0 flex-1">
                  <span
                    className="block truncate text-xs leading-4 text-neutral-600"
                    title={project.name}
                  >
                    {project.name}
                    {context
                      ? " · Padre de contexto"
                      : depth > 0
                        ? " · Subtarea"
                        : task.parent_id !== null
                          ? " · Subtarea"
                          : ""}
                  </span>
                  <div className="flex min-w-0 items-center gap-1.5">
                    <button
                      type="button"
                      data-task-drag-surface
                      className="cursor-pointer truncate text-left text-sm text-neutral-800 hover:underline"
                      title={task.name}
                      onClick={() => onAction("detail", task.id)}
                    >
                      {task.name}
                    </button>
                    {(hierarchy.children.get(task.id) ?? []).length > 0 && (
                      <span
                        className="whitespace-nowrap text-[10px] text-neutral-500"
                        title="Subtareas visibles"
                      >
                        {hierarchy.descendants(
                          task.id,
                          new Set(),
                          hierarchy.visible,
                        )}
                      </span>
                    )}
                    {task.labels.slice(0, 2).map((label) => (
                      <span
                        key={label.id}
                        className="max-w-20 truncate rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] text-neutral-600"
                        title={label.name}
                      >
                        {label.name}
                      </span>
                    ))}
                    {task.labels.length > 2 && (
                      <span className="whitespace-nowrap text-[10px] text-neutral-500">
                        +{task.labels.length - 2}
                      </span>
                    )}
                  </div>
                </div>
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
              <td key={field} className="py-1 px-1.5">
                <div className="flex min-w-0 items-center gap-1">
                  {field === "responsible_id" && <span className="gm-row-labels inline-flex w-8 shrink-0 items-center justify-center">{task.permissions.edit && <TaskCell field="labels" task={task} project={project} catalogs={catalogs} onPatch={onPatch} onState={onState} />}</span>}
                  <div className="min-w-0 flex-1">
                    <TaskCell
                      field={field}
                      task={task}
                      project={project}
                      catalogs={catalogs}
                      parent={task.parent_id === null ? undefined : byId.get(task.parent_id)}
                      onPatch={onPatch}
                      onState={onState}
                    />
                  </div>
                </div>
              </td>
            ))}
          </tr>,
          ...(open ? [rows(children, group, depth + 1, next)] : []),
        ];
      });
  }

  return (
    <section
      aria-label="Lista de tareas"
      data-moving={Boolean(movement.dragging) || undefined}
      data-drop-valid={movement.dragging ? Boolean(movement.drop) : undefined}
      aria-busy={movement.busy}
      className="gm-task-list flex min-h-0 flex-1 flex-col min-w-0"
    >
      {movement.busy && <p role="status" className="my-1 text-xs text-neutral-600">Sincronizando movimiento…{movement.queued ? ` ${movement.queued} en espera.` : ""}</p>}
      {movement.error && <div role="alert" className="flex flex-wrap items-center gap-2 py-2 text-xs text-red-700"><span>{movement.error}</span><button type="button" disabled={movement.busy} className="cursor-pointer rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-neutral-800 hover:bg-neutral-100" onClick={() => { void movement.refresh(); }}>Actualizar lista</button></div>}
      {search.trim() && preferences.mode === "state" && <p className="my-1 text-xs text-neutral-600">Limpia la búsqueda para mover posiciones. Puedes seguir usando el selector de estado.</p>}
      {hierarchy.roots.length === 0 && (
        <p className="my-4 text-xs text-neutral-500" role="status">
          {search
            ? "No hay tareas que coincidan con la búsqueda."
            : "No hay tareas visibles. Crea una tarea para comenzar si tienes permiso."}
        </p>
      )}
      <div
        ref={region}
        onPointerDownCapture={(event) => {
          const row = taskDragSurface(event.currentTarget, event.target, event.clientX, event.clientY);
          const task = row && byId.get(Number(row.dataset.taskId));
          if (task) pointerDrag.onPointerDown(event, task, true, row);
        }}
        onClickCapture={pointerDrag.onClickCapture}
        onDragStart={pointerDrag.onDragStart}
        className="relative min-h-0 flex-1 overflow-auto overscroll-contain"
        role="region"
        aria-label="Tabla de tareas con desplazamiento horizontal"
      >
        {groups.map((group, index) => {
          const open = !collapsed.has(group.key);
          const groupId = `${listId}-group-${index}`;
          const canCreate = group.stateCode
            ? canCreateIn(group.stateCode)
            : project.permissions.create_tasks;
          return (
            <section
              className="gm-task-group relative mb-4 min-w-[760px]"
              key={group.key}
              aria-label={group.name}
              data-group-key={group.key}
            >
              <h2 className="gm-group-heading sticky top-0 z-10 mb-1 bg-white px-3 py-2 text-xs">
                <button
                  type="button"
                  className="inline-flex cursor-pointer items-center gap-2 text-xs font-medium text-neutral-800"
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
                  <ChevronDownIcon
                    className={`size-4 ${open ? "" : "-rotate-90"}`}
                  />
                  {group.stateCode ? (
                    <>
                      <span
                        className="inline-flex items-center rounded-lg px-2 py-1 text-xs font-medium text-white"
                        style={{
                          backgroundColor: group.stateColor ?? "#737373",
                        }}
                      >
                        <TaskGroupLabel
                          group={group}
                          mode={preferences.mode}
                        />
                      </span>
                      <span className="text-xs text-neutral-600">
                        {group.members.size}{" "}
                        {group.members.size === 1 ? "tarea" : "tareas"}
                      </span>
                    </>
                  ) : (
                    <><TaskGroupLabel group={group} mode={preferences.mode} /><span className="text-xs text-neutral-600">
                      {group.members.size}{" "}
                      {group.members.size === 1 ? "tarea" : "tareas"}
                    </span></>
                  )}
                </button>
              </h2>
              <div id={groupId} hidden={!open} className="pl-8">
                <table
                  className="w-full table-fixed border-collapse text-xs text-neutral-800"
                  aria-label={`Tareas de ${group.name}`}
                >
                  <colgroup>
                    <col className="w-[39%]" />
                    <col className="w-[13%]" />
                    <col className="w-[13%]" />
                    <col className="w-[13%]" />
                    <col className="w-[10%]" />
                    <col className="w-[12%]" />
                  </colgroup>
                  <thead className="border-b border-neutral-200 text-left font-medium text-neutral-500">
                    <tr>
                      <th scope="col" className="py-2 px-3 text-left">
                        Nombre
                      </th>
                      <th scope="col" className="py-2 pl-10 pr-1.5">
                        Persona asignada
                      </th>
                      <th scope="col" className="py-2 px-1.5">
                        Fecha de inicio
                      </th>
                      <th scope="col" className="py-2 px-1.5">
                        Fecha límite
                      </th>
                      <th scope="col" className="py-2 px-1.5">
                        Prioridad
                      </th>
                      <th scope="col" className="py-2 px-1.5">
                        Estado
                      </th>
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
                      className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-xs text-neutral-600 hover:bg-neutral-100 hover:text-neutral-800"
                      type="button"
                      onClick={() => {
                        if (!pendingQuickTask.current) setDraftGroup(group.key);
                      }}
                    >
                      <PlusIcon className="size-4" /> Añadir tarea
                      <span className="sr-only"> · {group.name}</span>
                    </button>
                  )
                )}
              </div>
            </section>
          );
        })}
        {movement.drop && <div className="gm-task-insertion" aria-hidden="true" style={{ top: movement.drop.top, left: movement.drop.left, width: movement.drop.width }} />}
      </div>
    </section>
  );
}
