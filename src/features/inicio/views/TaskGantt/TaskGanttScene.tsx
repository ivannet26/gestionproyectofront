import { useGanttScheduling } from "./useGanttScheduling";
import GanttSchedulingPreview from "./GanttSchedulingPreview";
import type { GanttUnit } from "./ganttViewport";
import type { useGanttCalendar } from "./useGanttCalendar";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { IApi } from "@svar-ui/react-gantt";
import type { Task } from "../../types";
import type { GanttDependency } from "./ganttQuery";
import { datePosition, dependencyPath } from "./ganttGeometry";
import { ganttBarGeometry, hasGanttInterval } from "./ganttSceneGeometry";
import { useGanttConnection } from "./useGanttConnection";
import GanttTimelineRows from "./GanttTimelineRows";
import GanttTimeHeader from "./GanttTimeHeader";
import { ganttDay } from "./ganttViewport";
import type { GanttNavigation } from "./ganttNavigation";
import { toGanttWindow } from "./ganttCalendar";

interface Props {
  api: IApi | null;
  tasks: Task[];
  dependencies: GanttDependency[];
  today: string;
  unit: GanttUnit;
  navigationKey: string;
  navigation: GanttNavigation;
  onLocate: (id: number) => void;
  calendar: ReturnType<typeof useGanttCalendar>;
  canCreate: boolean;
  onCreateAt: (start: string) => void;
  protectedView: boolean;
  onDates: (
    task: Task,
    initial?: { start_date: string; due_date: string },
  ) => void;
  onOpen: (id: number) => void;
  onNavigate: () => void;
  canLink: boolean;
  onLink: (source: number, target: number, type?: import("../../types").DependencyType) => void;
  onInspect: (source: number, target: number) => void;
}

export default function TaskGanttScene(props: Props) {
  const { api, tasks, dependencies, today } = props;
  const [, paint] = useState(0);
  const region = useRef<HTMLDivElement>(null);
  const [activeLink, setActiveLink] = useState<string | null>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  const scheduling = useGanttScheduling(region, {
    api,
    tasks,
    unit: props.unit,
    enabled: !props.protectedView,
    navigationKey: props.navigationKey,
    canCreate: props.canCreate,
    navigation: props.navigation,
    calendar: props.calendar,
    onDates: props.onDates,
    onCreateAt: props.onCreateAt,
  });
  const arrow = useId().replaceAll(":", "");
  const byId = useMemo(
    () => new Map(tasks.map((task) => [task.id, task])),
    [tasks],
  );
  const adjacency = useMemo(() => {
    const index = new Map<number, GanttDependency[]>();
    for (const edge of dependencies)
      for (const id of [edge.predecessor.id, edge.successor.id]) {
        const group = index.get(id) ?? [];
        group.push(edge);
        index.set(id, group);
      }
    return index;
  }, [dependencies]);
  function sceneRows() {
    if (!api) return [];
    const state = api.getState(),
      cellHeight = state.cellHeight ?? 40;
    const start = Math.max(0, Math.floor(state.scrollTop / cellHeight));
    return state._tasks
      .slice(
        start,
        start + Math.ceil((state._chartHeight ?? 0) / cellHeight) + 1,
      )
      .flatMap((row, index) => {
        const task = byId.get(Number(row.id));
        if (!task) return [];
        const proposal = props.calendar.preview?.id === task.id ? props.calendar.preview : props.calendar.snapshot.get(task.id)?.status === "pending" ? props.calendar.snapshot.get(task.id)!.proposal : undefined;
        const rendered = proposal ? { ...task, ...proposal } : task;
        const window = toGanttWindow(rendered);
        const x = hasGanttInterval(rendered) && window.start
          ? datePosition(window.start, state)
          : undefined;
        const end = hasGanttInterval(rendered) && window.end
          ? datePosition(window.end, state)
          : undefined;
        const geometry = ganttBarGeometry(
          rendered,
          {
            $x: x,
            $w: x !== undefined && end !== undefined ? end - x : undefined,
            $y: (start + index) * cellHeight,
          },
          {
            scrollLeft: state.scrollLeft,
            scrollTop: state.scrollTop,
            width: state._chartWidth ?? 0,
            height: Math.max(0, (state._chartHeight ?? 0) - (state._scales?.height ?? 56)),
            cellHeight,
          },
        );
        return geometry ? [{ task: rendered, geometry }] : [];
      });
  }
  const connection = useGanttConnection(
    api,
    props.canLink,
    region,
    sceneRows,
    props.onLink,
    props.onNavigate,
    props.navigationKey,
  );
  useEffect(() => {
    if (!api) return;
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => paint((value) => value + 1));
    };
    const tag = Symbol("gm-gantt-scene");
    const reactive = api.getReactiveState();
    const unsubscribe = [
      reactive.tasks,
      reactive._tasks,
      reactive._scales,
      reactive.scrollLeft,
      reactive.scrollTop,
      reactive.gridWidth,
      reactive._chartWidth,
      reactive._chartHeight,
    ].map((store) => store?.subscribe(update));
    for (const action of [
      "scroll-chart",
      "render-data",
      "resize-chart",
      "resize-grid",
      "open-task",
      "drag-task",
      "select-task",
    ])
      api.on(action, update, { tag });
    const node = region.current?.parentElement;
    const move = (event: globalThis.PointerEvent) => {
      const bounds = region.current?.getBoundingClientRect(),
        state = api.getState();
      if (!bounds || event.clientX < bounds.left) {
        setHovered(null);
        return;
      }
      const row =
        state._tasks[
          Math.floor(
            (event.clientY -
              bounds.top -
              (state._scales?.height ?? 56) +
              state.scrollTop) /
              (state.cellHeight ?? 40),
          )
        ];
      setHovered(row ? Number(row.id) : null);
    };
    const focus = (event: FocusEvent) => {
      if (!(event.target instanceof Element)) return;
      const bar =
        event.target.closest(
          "[data-gantt-calendar-task],[data-gantt-edit-task],[data-connector-task]",
        ) ?? event.target.querySelector("[data-gantt-calendar-task]");
      if (bar instanceof HTMLElement)
        setHovered(
          Number(bar.dataset.ganttCalendarTask ?? bar.dataset.connectorTask),
        );
    };
    node?.addEventListener("focusin", focus);
    node?.addEventListener("pointermove", move, true);
    update();
    return () => {
      for (const stop of unsubscribe) stop?.();
      cancelAnimationFrame(frame);
      api.detach(tag);
      node?.removeEventListener("pointermove", move, true);
      node?.removeEventListener("focusin", focus);
    };
  }, [api]);
  if (!api) return null;
  const state = api.getState(),
    width = state._chartWidth ?? 0,
    height = Math.max(0, (state._chartHeight ?? 0) - (state._scales?.height ?? 56)),
    header = state._scales?.height ?? 56;
  const rows = sceneRows();
  const positions = new Map(rows.map((row) => [row.task.id, row.geometry]));
  function point(id: number, end: boolean) {
    const bar = positions.get(id),
      x = end ? bar?.right : bar?.left;
    return bar?.real && x != null && x >= 0 && x <= width
      ? { x, y: bar.y }
      : null;
  }
  const edges = new Map<string, GanttDependency>();
  for (const row of rows)
    for (const edge of adjacency.get(row.task.id) ?? [])
      edges.set(edge.id, edge);
  const todayX = datePosition(ganttDay(today), state) - state.scrollLeft;
  const todayVisible =
    todayX >= 0 &&
    todayX <= width &&
    state._scales &&
    ganttDay(today) >= state._scales.start &&
    ganttDay(today) < state._scales.end;
  return (
    <div
      ref={region}
      className="gm-gantt-scene"
      onPointerLeave={() => {
        setHovered(null);
        setActiveLink(null);
      }}
      style={{
        left: state.gridWidth + 4,
        top: 0,
        width,
        height: height + header,
      }}
    >
      <GanttTimeHeader state={state} />
      {todayVisible && (
        <div
          className="gm-gantt-today"
          style={{ left: todayX, top: header }}
          role="img"
          aria-label={"Hoy: " + today}
          title={"Hoy: " + today}
        >
          <span hidden>Hoy</span>
        </div>
      )}
      <svg
        className="gm-gantt-links"
        width={width}
        height={height}
        style={{ top: header }}
        aria-label="Dependencias: origen requisito y destino condicionado"
      >
        <defs>
          <marker
            id={arrow}
            viewBox="0 0 8 8"
            refX="7"
            refY="4"
            markerWidth="7"
            markerHeight="7"
            orient="auto"
          >
            <path d="M0 0L8 4L0 8" fill="none" stroke="currentColor" />
          </marker>
        </defs>
        {[...edges.values()].map((edge) => {
          const a = point(edge.predecessor.id, edge.type ? edge.type[0] === "F" : true),
            b = point(edge.successor.id, edge.type ? edge.type[1] === "F" : false);
          if (!a || !b) return null;
          return (
            <path
              key={edge.id}
              data-gantt-link={edge.id}
              data-dependency-type={edge.type ?? "legacy"}
              strokeDasharray={edge.type ? undefined : "4 3"}
              className="gm-gantt-link"
              data-related={activeLink === edge.id || undefined}
              onPointerEnter={() => setActiveLink(edge.id)}
              onFocus={() => setActiveLink(edge.id)}
              d={dependencyPath(a.x, a.y, b.x, b.y)}
              markerEnd={`url(#${arrow})`}
              role="button"
              tabIndex={0}
              aria-label={`${edge.predecessor.name} → ${edge.successor.name} · ${edge.type ?? "Legado informativo"}`}
              onClick={() =>
                props.onInspect(edge.predecessor.id, edge.successor.id)
              }
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  props.onInspect(edge.predecessor.id, edge.successor.id);
                }
              }}
            >
              <title>
                {edge.predecessor.name} → {edge.successor.name} · {edge.type ?? "Legado informativo"}
              </title>
            </path>
          );
        })}
        {connection.draft &&
          (() => {
            const source = positions.get(connection.draft.source);
            return (
              source?.real && (
                <path
                  className="gm-gantt-link gm-gantt-link-preview"
                  d={`M${connection.draft.side === "start" ? source.left! : source.right!},${source.y}L${connection.draft.x},${connection.draft.y - header}`}
                />
              )
            );
          })()}
      </svg>
      {[...edges.values()]
        .filter((edge) => edge.id === activeLink && props.canLink)
        .map((edge) => {
          const source = point(edge.predecessor.id, true),
            target = point(edge.successor.id, false);
          if (!source || !target) return null;
          return (
            <button
              key={edge.id}
              type="button"
              data-remove-link={edge.id}
              aria-label={`Retirar dependencia ${edge.predecessor.name} → ${edge.successor.name} · ${edge.type ?? "Legado informativo"}`}
              className="gm-gantt-remove-link"
              style={{
                left: Math.max(
                  2,
                  Math.min(width - 26, (source.x + target.x) / 2 - 12),
                ),
                top:
                  header +
                  (target.x - source.x >= 24
                    ? (source.y + target.y) / 2
                    : source.y + (target.y >= source.y ? 20 : -20)) -
                  12,
              }}
              onClick={() =>
                props.onInspect(edge.predecessor.id, edge.successor.id)
              }
            >
              ×
            </button>
          );
        })}
      <GanttSchedulingPreview preview={scheduling} />
      <GanttTimelineRows
        model={{
          rows,
          header,
          width,
          hovered,
          programming: scheduling?.id ?? null,
          connection,
          canLink: props.canLink,
          protectedView: props.protectedView,
          onOpen: props.onOpen,
          onDates: props.onDates,
          onLocate: props.onLocate,
          canEdit: props.calendar.operations.canStart,
        }}
      />
    </div>
  );
}
