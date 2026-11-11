import { useEffect, useEffectEvent, useMemo } from "react";
import type { RefObject } from "react";
import type { IApi } from "@svar-ui/react-gantt";
import type { TaskGanttProps } from "./types";

import { ganttTreeDestination } from "./ganttTreeMove";
import type { Task } from "../../types";
import { useTaskMove } from "../../hooks/useTaskMove";
import { useTaskPointerDrag } from "../../hooks/useTaskPointerDrag";

export function useGanttTreeMove(
  props: TaskGanttProps,
  api: IApi | null,
  region: RefObject<HTMLDivElement | null>,
  filtered: boolean,
  visible: Set<number>,
) {
  const movement = useTaskMove(
    props.project,
    props.onMoved,
    region,
    props.tasks,
    true,
  );
  const byId = useMemo(
    () => new Map(props.tasks.map((task) => [task.id, task])),
    [props.tasks],
  );
  function locate(x: number, y: number, source: Task) {
    const node = region.current?.querySelector(".gm-task-gantt");
    if (!api || !node) return null;
    const state = api.getState(),
      bounds = node.getBoundingClientRect(),
      header = state._scales?.height ?? 56;
    if (
      x < bounds.left ||
      x >= bounds.left + state.gridWidth ||
      y < bounds.top + header ||
      y >= bounds.bottom
    )
      return null;
    const offset = y - bounds.top - header + state.scrollTop,
      index = Math.floor(offset / 40);
    const target = byId.get(Number(state._tasks[index]?.id));
    if (!target) return null;
    const fraction = (offset % 40) / 40;
    const edge =
      source.parent_id !== null &&
      target.parent_id === null &&
      fraction > 0.25 &&
      fraction < 0.75
        ? "inside"
        : fraction < 0.5
          ? "before"
          : "after";
    const destination = ganttTreeDestination(
      props.tasks,
      visible,
      source,
      target,
      edge,
      filtered,
    );
    if (!destination) return null;
    return {
      ...destination,
      state: source.state_code,
      top:
        bounds.top +
        header +
        (index + (edge === "before" ? 0 : 1)) * 40 -
        state.scrollTop,
      left: bounds.left,
      width: state.gridWidth,
    };
  }
  const pointer = useTaskPointerDrag({ movement, locate, region });
  const refreshDrop = useEffectEvent((x: number, y: number) => {
    if (movement.dragging) movement.over(locate(x, y, movement.dragging));
  });
  useEffect(() => {
    if (!movement.dragging || !api) return;
    let frame = 0,
      x = 0,
      y = 0;
    const point = (event: PointerEvent) => {
      x = event.clientX;
      y = event.clientY;
    };
    const scroll = () => {
      const node = region.current?.querySelector(".gm-task-gantt");
      if (node && y) {
        const bounds = node.getBoundingClientRect(),
          state = api.getState();
        const delta =
          y < bounds.top + (state._scales?.height ?? 56) + 30
            ? -10
            : y > bounds.bottom - 30
              ? 10
              : 0;
        if (delta) {
          void api.exec("scroll-chart", {
            top: Math.max(0, state.scrollTop + delta),
          });
          refreshDrop(x, y);
        }
      }
      frame = requestAnimationFrame(scroll);
    };
    document.addEventListener("pointermove", point, true);
    frame = requestAnimationFrame(scroll);
    return () => {
      document.removeEventListener("pointermove", point, true);
      cancelAnimationFrame(frame);
    };
  }, [movement.dragging, api, region]);
  return { movement, pointer, byId };
}
