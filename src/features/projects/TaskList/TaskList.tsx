import type { ReactNode } from "react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import TaskProperty from "../TaskForm/TaskProperty";
import ChevronDownIcon from "../../../shared/icons/ChevronDownIcon";
import DotsIcon from "../../../shared/icons/DotsIcon";
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
  ): ReactNode {
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
          task.permissions.dependencies;
        return [
          <tr
            key={task.id}
            data-task-id={task.id}
            className="gm-task-row group/row h-12 border-b border-neutral-200 hover:bg-neutral-100"
            onClick={(event) => {
              if (
                event.target instanceof Element &&
                !event.target.closest("button, input, textarea, [popover]")
              )
                onAction("detail", task.id);
            }}
          >
            <td className="px-3 py-1">
              <div
                className="flex min-w-0 items-center gap-2"
                style={{ paddingInlineStart: `${Math.min(depth, 8) * 20}px` }}
              >
                {children.length > 0 ? (
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
                <div className={`min-w-0 flex-1 ${depth ? "pl-2" : ""}`}>
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
                          ? " · Subtarea asignada"
                          : ""}
                  </span>
                  <div className="flex min-w-0 items-center gap-1.5">
                    <button
                      type="button"
                      className="cursor-pointer truncate text-left text-sm text-neutral-800 hover:underline"
                      title={task.name}
                      onClick={() => onAction("detail", task.id)}
                    >
                      {task.name}
                    </button>
                    {children.length > 0 && (
                      <span
                        className="whitespace-nowrap text-[10px] text-neutral-500"
                        title="Subtareas visibles"
                      >
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
            <td className="py-1 pl-0 pr-2 text-center">
              {actions && (
                <div className="flex items-center justify-center opacity-0 focus-within:opacity-100 group-hover/row:opacity-100 [@media(pointer:coarse)]:opacity-100">
                  <TaskProperty
                    cell
                    id={`${listId}-${encodeURIComponent(group.key)}-task-${task.id}-actions`}
                    label={`Opciones de ${task.name}`}
                    value="Opciones"
                    icon="settings"
                    content={
                      <DotsIcon className="size-4 text-neutral-500 hover:text-neutral-800" />
                    }
                  >
                    {(close) => (
                      <div className="max-h-60 overflow-y-auto p-1">
                        {task.permissions.edit && (
                          <button
                            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs text-neutral-800 cursor-pointer hover:bg-neutral-100"
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
                            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs text-neutral-800 cursor-pointer hover:bg-neutral-100"
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
                            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs text-neutral-800 cursor-pointer hover:bg-neutral-100"
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
            </td>
          </tr>,
          ...(open ? [rows(children, group, depth + 1, next)] : []),
        ];
      });
  }

  return (
    <section
      aria-label="Lista de tareas"
      className="gm-task-list flex min-h-0 flex-1 flex-col min-w-0"
    >
      {hierarchy.roots.length === 0 && (
        <p className="my-4 text-xs text-neutral-500" role="status">
          {search
            ? "No hay tareas que coincidan con la búsqueda."
            : "No hay tareas visibles. Crea una tarea para comenzar si tienes permiso."}
        </p>
      )}
      <div
        className="min-h-0 flex-1 overflow-auto"
        role="region"
        aria-label="Tabla de tareas"
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
                    <span className="text-xs text-neutral-600">
                      {group.members.size}{" "}
                      {group.members.size === 1 ? "tarea" : "tareas"}
                    </span>
                  )}
                </button>
              </h2>
              <div id={groupId} hidden={!open} className="pl-8">
                <table
                  className="w-full table-fixed border-collapse text-xs text-neutral-800"
                  aria-label={`Tareas de ${group.name}`}
                >
                  <colgroup>
                    <col className="w-[35%]" />
                    <col className="w-[13%]" />
                    <col className="w-[13%]" />
                    <col className="w-[13%]" />
                    <col className="w-[10%]" />
                    <col className="w-[12%]" />
                    <col className="w-[4%]" />
                  </colgroup>
                  <thead className="border-b border-neutral-200 text-left font-medium text-neutral-500">
                    <tr>
                      <th scope="col" className="py-2 px-3 text-left">
                        Nombre
                      </th>
                      <th scope="col" className="py-2 px-1.5">
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
                      <th scope="col" className="py-2 px-1 text-center">
                        <span className="sr-only">Acciones</span>
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
      </div>
    </section>
  );
}
