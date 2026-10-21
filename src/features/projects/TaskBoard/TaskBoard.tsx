import { useCallback, useState } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDroppable,
  useDraggable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";

import type {
  Task,
  TaskActionKind,
  Project,
  ProjectCatalogs,
  EditTaskPayload,
  TaskStatePayload,
} from "../types";
import { formatTaskDate } from "../TaskList/taskHierarchy";
import TaskIcon from "../TaskForm/TaskIcon";
import { taskAssignees } from "../taskAssignees";
import { stateInk } from "../TaskList/stateInk";

interface TaskBoardProps {
  project: Project;
  tasks: Task[];
  catalogs: ProjectCatalogs;
  onAction: (kind: TaskActionKind, id: number) => void;
  onPatch: (task: Task, data: Partial<EditTaskPayload>) => Promise<void>;
  onState: (task: Task, data: TaskStatePayload) => Promise<void>;
}

const priorityName = (catalogs: ProjectCatalogs, code: number | null) =>
  code == null
    ? "Sin prioridad"
    : (catalogs.priorities.find((item) => item.code === code)?.name ??
      String(code));

function Card({
  task,
  catalogs,
  onAction,
  draggable,
}: {
  task: Task;
  catalogs: ProjectCatalogs;
  onAction: (kind: TaskActionKind, id: number) => void;
  draggable?: boolean;
}) {
  const { attributes, listeners, setNodeRef, isDragging } =
    useDraggable({ id: task.id, data: { task }, disabled: !draggable });
  const style = {
    transform: undefined,
    opacity: isDragging ? 0 : 1,
  };
  const people = taskAssignees(task);
  return (
    <div
      ref={setNodeRef}
      style={style}
      className="border border-neutral-200 bg-white p-2.5 text-xs rounded-lg cursor-grab active:cursor-grabbing hover:bg-neutral-50"
      onClick={() => onAction("detail", task.id)}
      {...(draggable ? listeners : {})}
      {...(draggable ? attributes : {})}
    >
      <div className="font-medium text-neutral-800 leading-snug">{task.name}</div>
      {people.length > 0 && (
        <div className="mt-1.5 flex items-center gap-1.5 text-neutral-600 truncate">
          <span className="inline-grid place-items-center size-4 rounded-full bg-sky-700 text-white text-[9px] font-medium shrink-0">
            {people[0].name.charAt(0).toUpperCase()}
          </span>
          <span className="truncate">{people.map((person) => person.name).join(", ")}</span>
        </div>
      )}
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {task.priority != null && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded bg-neutral-100 text-neutral-700">
            <TaskIcon name="priority" />
            {priorityName(catalogs, task.priority)}
          </span>
        )}
        {task.due_date && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded bg-neutral-100 text-neutral-700">
            <TaskIcon name="date" />
            {formatTaskDate(task.due_date)}
          </span>
        )}
        {task.labels.slice(0, 3).map((label) => (
          <span
            key={label.id}
            className="px-2 py-0.5 text-[10px] font-medium rounded bg-neutral-100 text-neutral-800"
          >
            {label.name}
          </span>
        ))}
        {task.labels.length > 3 && (
          <span className="px-2 py-0.5 text-[10px] font-medium rounded bg-neutral-100 text-neutral-600">
            +{task.labels.length - 3}
          </span>
        )}
      </div>
    </div>
  );
}

function Column({
  state,
  tasks,
  catalogs,
  onAction,
  isOver,
}: {
  state: { code: string; name: string; color?: string; category?: string };
  tasks: Task[];
  catalogs: ProjectCatalogs;
  onAction: (kind: TaskActionKind, id: number) => void;
  isOver: boolean;
}) {
  const { setNodeRef } = useDroppable({ id: state.code });
  const headerColor = state.color;
  const softBg = headerColor ? `${headerColor}14` : "#f5f5f5";
  const softBorder = headerColor ? `${headerColor}40` : "#e5e5e5";
  return (
    <section
      ref={setNodeRef}
      style={{ backgroundColor: softBg }}
      className={`flex flex-col min-w-[260px] w-[300px] shrink-0 rounded-xl p-2 ${
        isOver ? "ring-2 ring-neutral-400" : ""
      }`}
      aria-label={state.name}
    >
      <header className="flex items-center gap-2 px-2 py-1.5">
        <div
          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-xs font-medium"
          style={
            headerColor
              ? { backgroundColor: headerColor, color: stateInk(headerColor) }
              : { backgroundColor: "#e5e5e5", color: "#404040" }
          }
        >
          {headerColor && (
            <span
              className="inline-block size-2 rounded-full"
              style={{ backgroundColor: stateInk(headerColor) }}
              aria-hidden="true"
            />
          )}
          {state.name}
        </div>
        <span className="text-[10px] font-medium text-neutral-600 bg-white/70 px-1.5 py-0.5 rounded">
          {tasks.length}
        </span>
      </header>
      <div className="flex flex-col gap-2 min-h-[60px]">
        {tasks.map((task) => (
          <Card
            key={task.id}
            task={task}
            catalogs={catalogs}
            onAction={onAction}
            draggable={task.permissions.state}
          />
        ))}
      </div>
    </section>
  );
}

export default function TaskBoard({
  project,
  tasks,
  catalogs,
  onAction,
  onState,
}: TaskBoardProps) {
  const [activeId, setActiveId] = useState<number | null>(null);
  const [error, setError] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  );

  const states = project.task_states.states;
  const byState = new Map(states.map((state) => [state.code, [] as Task[]]));
  for (const task of tasks) {
    const bucket = byState.get(task.state_code);
    if (bucket) bucket.push(task);
    else {
      // unknown state: put in first column fallback
      if (states[0]) byState.get(states[0].code)?.push(task);
    }
  }

  const activeTask = activeId != null ? tasks.find((t) => t.id === activeId) : null;

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(Number(event.active.id));
    setError("");
  };

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveId(null);
      if (!over) return;
      const taskId = Number(active.id);
      const target = String(over.id);
      const task = tasks.find((t) => t.id === taskId);
      if (!task || task.state_code === target) return;
      if (!task.permissions.state) return;
      const transition = task.transitions.find((item) => item.target === target);
      if (!transition) return;
      try {
        await onState(task, { state_code: target, reason: "" });
      } catch (failure) {
        setError(String(failure));
      }
    },
    [tasks, onAction, onState],
  );

  const [overId, setOverId] = useState<string | null>(null);

  return (
    <section
      className="mt-3 flex-1 min-h-0 flex flex-col"
      aria-label="Tablero"
    >
      {error && (
        <p className="mb-2 text-xs text-red-700" role="alert">
          {error}
        </p>
      )}
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={(e) => void handleDragEnd(e)}
        onDragOver={(e) => setOverId(e.over ? String(e.over.id) : null)}
      >
        <div className="flex gap-3 overflow-x-auto pb-2">
          {states.map((state) => (
            <Column
              key={state.code}
              state={state}
              tasks={byState.get(state.code) ?? []}
              catalogs={catalogs}
              onAction={onAction}
              isOver={overId === state.code}
            />
          ))}
        </div>
        <DragOverlay>
          {activeTask ? (
            <div className="w-[300px]">
              <Card
                task={activeTask}
                catalogs={catalogs}
                onAction={onAction}
                draggable={false}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </section>
  );
}
