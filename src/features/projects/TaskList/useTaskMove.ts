import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import { errorText } from "../../auth/api";
import { getTasks, moveTask } from "../services";
import type { Project, Task } from "../types";

interface Movement { task: Task; state: string; before: number | null }
export interface DropPosition { state: string; before: number | null; row?: number; side?: "before" | "after" }

export function useTaskMove(project: Project, onConfirmed: ((tasks: Task[]) => void) | undefined, region: RefObject<HTMLDivElement | null>) {
  const [dragging, setDragging] = useState<Task | null>(null), [drop, setDrop] = useState<DropPosition | null>(null);
  const [confirmation, setConfirmation] = useState<Movement | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const pending = useRef(false), alive = useRef(true), activeDrag = useRef<Task | null>(null), point = useRef({ x: 0, y: 0 });
  useEffect(() => { alive.current = true; return () => { alive.current = false; activeDrag.current = null; }; }, [project.id]);
  useEffect(() => {
    if (!dragging) return;
    let frame = 0;
    const scroll = () => {
      const node = region.current;
      if (!activeDrag.current || !node) return;
      const bounds = node.getBoundingClientRect(), { x, y } = point.current;
      const delta = y < bounds.top + 36 ? -10 : y > bounds.bottom - 36 ? 10 : 0;
      const horizontal = x < bounds.left + 24 ? -8 : x > bounds.right - 24 ? 8 : 0;
      if (y >= bounds.top - 20 && y <= bounds.bottom + 20) { node.scrollTop += delta; node.scrollLeft += horizontal; }
      frame = requestAnimationFrame(scroll);
    };
    frame = requestAnimationFrame(scroll);
    return () => cancelAnimationFrame(frame);
  }, [dragging, region]);
  function permitted(task: Task, state: string) {
    return Boolean(onConfirmed && !pending.current && task.move_revision && task.permissions.state && (task.state_code === state || (task.move_targets ? task.move_targets.includes(state) : task.transitions.some((item) => item.target === state))));
  }
  function end() { activeDrag.current = null; setDragging(null); setDrop(null); }
  async function execute(movement: Movement, reason = "") {
    if (pending.current || !alive.current) return;
    pending.current = true; setBusy(true); setError("");
    try {
      const result = await moveTask(project.id, movement.task.id, { state_code: movement.state, before_id: movement.before, expected_revision: movement.task.move_revision!, reason });
      if (alive.current) {
        onConfirmed?.(result); setConfirmation(null);
        requestAnimationFrame(() => { if (alive.current && document.activeElement === document.body) document.querySelector<HTMLButtonElement>(`tr[data-task-id="${movement.task.id}"]:not([data-context]) button[aria-label^="Reubicar"]`)?.focus({ preventScroll: true }); });
      }
    } catch (failure) { if (alive.current) { setError(errorText(failure)); throw failure; } }
    finally { pending.current = false; if (alive.current) setBusy(false); }
  }
  function propose(task: Task, state: string, before: number | null) {
    if (!permitted(task, state)) return;
    const movement = { task, state, before };
    if (task.transitions.find((item) => item.target === state)?.reason_required) setConfirmation(movement);
    else void execute(movement).catch(() => undefined);
  }
  return { dragging, drop, confirmation, busy, error, permitted, propose, execute, end,
    cancel: () => { if (!pending.current) setConfirmation(null); },
    start: (task: Task, x: number, y: number) => { activeDrag.current = task; point.current = { x, y }; setDragging(task); setError(""); },
    track: (x: number, y: number) => { point.current = { x, y }; },
    over: setDrop,
    refresh: async () => { if (pending.current) return; try { const result = await getTasks(project.id); if (alive.current) { onConfirmed?.(result); setError(""); } } catch (failure) { if (alive.current) setError(errorText(failure)); } },
  };
}
