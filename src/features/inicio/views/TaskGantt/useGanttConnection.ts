import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent, RefObject } from "react";
import type { IApi } from "@svar-ui/react-gantt";
import type { Task } from "../../types";
import type { ganttBarGeometry } from "./ganttSceneGeometry";

export interface ConnectionRow {
  task: Task;
  geometry: NonNullable<ReturnType<typeof ganttBarGeometry>>;
}

export function useGanttConnection(
  api: IApi | null,
  enabled: boolean,
  region: RefObject<HTMLDivElement | null>,
  rows: () => ConnectionRow[],
  onLink: (source: number, target: number, type?: import("../../types").DependencyType) => void,
  onNavigate: () => void,
  navigationKey?: string,
) {
  const [draft, setDraft] = useState<{
    source: number;
    side: "start" | "end";
    x: number;
    y: number;
    target: number | null;
  } | null>(null);
  const cancel = useRef<(() => void) | null>(null);
  const clickGuard = useRef<(() => void) | null>(null);

  useEffect(
    () => () => {
      cancel.current?.();
      clickGuard.current?.();
    },
    [api, enabled, navigationKey],
  );

  function start(
    event: ReactPointerEvent,
    source: number,
    side: "start" | "end",
  ) {
    const node = region.current;
    if (
      !enabled ||
      !api ||
      !node ||
      event.button !== 0 ||
      !event.isPrimary ||
      !rows().some((row) => row.task.id === source && row.geometry.connectable)
    )
      return;
    event.preventDefault();
    event.stopPropagation();
    cancel.current?.();
    clickGuard.current?.();

    const id = event.pointerId;
    let point = { x: event.clientX, y: event.clientY };
    let ended = false;
    let navigated = false;
    let frame = 0;

    const clear = () => {
      document.removeEventListener("click", block, true);
      document.removeEventListener("pointerdown", clear, true);
      clickGuard.current = null;
    };
    const block = (next: MouseEvent) => {
      if (next.detail === 0) return;
      next.preventDefault();
      next.stopImmediatePropagation();
      clear();
    };
    document.addEventListener("click", block, true);
    document.addEventListener("pointerdown", clear, true);
    clickGuard.current = clear;

    const targetAt = (x: number, y: number) => {
      const bounds = node.getBoundingClientRect(),
        state = api.getState();
      if (x < 0 || x >= bounds.width || y < 0 || y >= (state._chartHeight ?? 0) - (state._scales?.height ?? 56))
        return null;
      return (
        rows().find(({ task, geometry: bar }) => {
          if (
            task.id === source ||
            !bar.connectable ||
            bar.left === null ||
            bar.right === null ||
            Math.abs(y - bar.y) > 16
          )
            return false;
          return (
            (x >= Math.max(0, bar.left) &&
              x <= Math.min(bounds.width, bar.right)) ||
            [bar.startConnector, bar.endConnector].some(
              (center) => center !== null && Math.abs(x - center) <= 12,
            )
          );
        })?.task.id ?? null
      );
    };
    const draw = () => {
      const bounds = node.getBoundingClientRect();
      const x = point.x - bounds.x,
        y = point.y - bounds.y;
      setDraft({
        source,
        side,
        x,
        y,
        target: targetAt(x, y - (api.getState()._scales?.height ?? 56)),
      });
    };
    const move = (next: PointerEvent) => {
      if (next.pointerId !== id) return;
      next.preventDefault();
      point = { x: next.clientX, y: next.clientY };
      if (!next.buttons) stop();
      else draw();
    };
    const scroll = () => {
      if (ended) return;
      const bounds = node.getBoundingClientRect();
      const state = api.getState();
      const x = point.x - bounds.x;
      const delta = x < 30 ? -12 : x > bounds.width - 30 ? 12 : 0;
      const y = point.y - bounds.y - (state._scales?.height ?? 56);
      const vertical =
        y < 28 ? -10 : y > (state._chartHeight ?? 0) - (state._scales?.height ?? 56) - 28 ? 10 : 0;
      if (delta || vertical) {
        if (!navigated) {
          navigated = true;
          onNavigate();
        }
        void api.exec("scroll-chart", {
          left: Math.min(
            Math.max(0, (state._scales?.width ?? 0) - bounds.width),
            Math.max(0, state.scrollLeft + delta),
          ),
          top: Math.min(
            Math.max(
              0,
              state._tasks.length * (state.cellHeight ?? 40) -
                (state._chartHeight ?? 0),
            ),
            Math.max(0, state.scrollTop + vertical),
          ),
        });
        draw();
      }
      frame = requestAnimationFrame(scroll);
    };
    const stop = () => {
      if (ended) return;
      ended = true;
      cancelAnimationFrame(frame);
      document.removeEventListener("pointermove", move, true);
      document.removeEventListener("pointerup", up, true);
      document.removeEventListener("pointercancel", cancelPointer, true);
      document.removeEventListener("keydown", key, true);
      window.removeEventListener("blur", stop);
      node.removeEventListener("lostpointercapture", cancelPointer);
      if (node.hasPointerCapture(id)) node.releasePointerCapture(id);
      setDraft(null);
      cancel.current = null;
    };
    const cancelPointer = (next: PointerEvent) => {
      if (next.pointerId === id) stop();
    };
    const key = (next: KeyboardEvent) => {
      if (next.key === "Escape") {
        next.preventDefault();
        stop();
      }
    };
    const up = (next: PointerEvent) => {
      if (next.pointerId !== id) return;
      const bounds = node.getBoundingClientRect();
      const x = next.clientX - bounds.x;
      const y =
        next.clientY - bounds.y - (api.getState()._scales?.height ?? 56);
      const target = targetAt(x, y);
      stop();
      if (target !== null) {
        const bar = rows().find(row => row.task.id === target)?.geometry;
        const targetSide = bar && Math.abs(x - bar.left!) < Math.abs(x - bar.right!) ? "S" : "F";
        const type = ((side === "start" ? "S" : "F") + targetSide) as import("../../types").DependencyType;
        onLink(source, target, type);
      }
    };

    node.setPointerCapture(id);
    node.addEventListener("lostpointercapture", cancelPointer);
    document.addEventListener("pointermove", move, true);
    document.addEventListener("pointerup", up, true);
    document.addEventListener("pointercancel", cancelPointer, true);
    document.addEventListener("keydown", key, true);
    window.addEventListener("blur", stop);
    cancel.current = stop;
    draw();
    frame = requestAnimationFrame(scroll);
  }
  return { draft, start };
}
