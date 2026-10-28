import { useEffect, useRef } from "react";
import type { DragEvent, MouseEvent, PointerEvent, RefObject } from "react";
import type { Task } from "../types";
import type { DropPosition, useTaskMove } from "./useTaskMove";
import { taskDragPreview } from "./taskDragPreview";

interface PointerDragOptions {
  movement: ReturnType<typeof useTaskMove>;
  locate: (x: number, y: number, task: Task) => DropPosition | null;
  region: RefObject<HTMLDivElement | null>;
}

export function useTaskPointerDrag({ movement, locate, region }: PointerDragOptions) {
  const latest = useRef({ movement, locate, region });
  const cancel = useRef<(() => void) | null>(null);
  const suppressClick = useRef(false);
  const clearClickGuard = useRef<(() => void) | null>(null);

  useEffect(() => { latest.current = { movement, locate, region }; }, [movement, locate, region]);
  useEffect(() => () => {
    cancel.current?.();
    clearClickGuard.current?.();
  }, [region]);

  function onPointerDown(event: PointerEvent<HTMLElement>, task: Task, enabled: boolean, row?: HTMLTableRowElement) {
    if (!enabled || event.pointerType !== "mouse" || !event.isPrimary || event.button !== 0) return;
    const target = event.target;
    if (!(target instanceof Element) || !event.currentTarget.contains(target) || target.closest("[popover], [role=menu], [role=dialog], dialog, input, textarea, select, [contenteditable]:not([contenteditable=false])")) return;

    clearClickGuard.current?.();
    suppressClick.current = false;
    cancel.current?.();
    latest.current.movement.prepare?.();

    const pointerId = event.pointerId;
    const origin = { x: event.clientX, y: event.clientY };
    let point = origin, started = false, active = true;
    let preview: ReturnType<typeof taskDragPreview> | undefined;
    const scroller = region.current;

    function guardClick() {
      let timer: ReturnType<typeof setTimeout> | null = null;
      const clear = () => {
        document.removeEventListener("click", block, true);
        document.removeEventListener("pointerup", release, true);
        document.removeEventListener("pointerdown", clear, true);
        window.removeEventListener("blur", clear);
        if (timer !== null) clearTimeout(timer);
        if (clearClickGuard.current === clear) {
          suppressClick.current = false;
          clearClickGuard.current = null;
        }
      };
      const block = (next: globalThis.MouseEvent) => {
        if (clearClickGuard.current !== clear || next.detail === 0 || ("pointerId" in next && next.pointerId !== pointerId)) return;
        next.preventDefault();
        next.stopImmediatePropagation();
        clear();
      };
      const release = (next: globalThis.PointerEvent) => {
        if (next.pointerId === pointerId) timer = setTimeout(clear, 0);
      };
      clearClickGuard.current = clear;
      document.addEventListener("click", block, true);
      document.addEventListener("pointerup", release, true);
      document.addEventListener("pointerdown", clear, true);
      window.addEventListener("blur", clear);
    }

    function remove() {
      if (!active) return;
      active = false;
      document.removeEventListener("pointermove", move, true);
      document.removeEventListener("pointerup", up, true);
      document.removeEventListener("pointercancel", pointerCancel, true);
      document.removeEventListener("keydown", keydown, true);
      window.removeEventListener("blur", windowBlur);
      scroller?.removeEventListener("scroll", scroll);
      scroller?.removeEventListener("lostpointercapture", pointerCancel);
      if (scroller?.hasPointerCapture?.(pointerId)) scroller.releasePointerCapture(pointerId);
      preview?.remove();
      if (cancel.current === abort) cancel.current = null;
    }

    function abort() {
      if (!active) return;
      remove();
      if (started) latest.current.movement.end();
    }
    function windowBlur(next: FocusEvent) { if (next.target === window) abort(); }

    function scroll() {
      if (active && started) latest.current.movement.over(latest.current.locate(point.x, point.y, task));
    }

    function move(next: globalThis.PointerEvent) {
      if (!active || next.pointerId !== pointerId) return;
      if (next.buttons === 0) { abort(); return; }
      point = { x: next.clientX, y: next.clientY };
      if (!started && Math.hypot(point.x - origin.x, point.y - origin.y) < 6) return;
      next.preventDefault();
      if (!started) {
        started = true;
        suppressClick.current = true;
        guardClick();
        document.getSelection()?.removeAllRanges();
        if (row) preview = taskDragPreview(row, origin);
        scroller?.addEventListener("lostpointercapture", pointerCancel);
        scroller?.setPointerCapture?.(pointerId);
        latest.current.movement.start(task, point.x, point.y);
      }
      preview?.move(point.x, point.y);
      latest.current.movement.track(point.x, point.y);
      latest.current.movement.over(latest.current.locate(point.x, point.y, task));
    }

    function up(next: globalThis.PointerEvent) {
      if (!active || next.pointerId !== pointerId) return;
      const current = latest.current;
      const drop = started ? current.locate(next.clientX, next.clientY, task) : null;
      remove();
      if (!started) return;
      current.movement.end();
      if (drop) current.movement.propose(task, drop.state, drop.before);
    }

    function pointerCancel(next: globalThis.PointerEvent) {
      if (next.pointerId === pointerId && (next.type !== "lostpointercapture" || next.target === scroller && started && !scroller?.hasPointerCapture?.(pointerId))) abort();
    }
    function keydown(next: KeyboardEvent) {
      if (next.key !== "Escape") return;
      if (started) { next.preventDefault(); next.stopPropagation(); }
      abort();
    }

    cancel.current = abort;
    document.addEventListener("pointermove", move, true);
    document.addEventListener("pointerup", up, true);
    document.addEventListener("pointercancel", pointerCancel, true);
    document.addEventListener("keydown", keydown, true);
    window.addEventListener("blur", windowBlur);
    scroller?.addEventListener("scroll", scroll);
  }

  function onClickCapture(event: MouseEvent) {
    if (!suppressClick.current || event.detail === 0) return;
    suppressClick.current = false;
    event.preventDefault();
    event.stopPropagation();
  }

  return { onPointerDown, onClickCapture, onDragStart: (event: DragEvent) => event.preventDefault() };
}
