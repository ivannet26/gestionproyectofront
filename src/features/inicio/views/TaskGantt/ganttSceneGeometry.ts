import type { Task } from "../../types";

export function hasGanttInterval(task: Pick<Task, "start_date" | "due_date"> & Partial<Pick<Task, "schedule">>) {
  if (task.schedule?.precision === "hour") {
    const start = Date.parse(task.schedule.start), end = task.schedule.end ? Date.parse(task.schedule.end) : NaN;
    return Number.isFinite(start) && Number.isFinite(end) && end - start >= 3600000;
  }
  return Boolean(task.start_date && task.due_date && task.start_date <= task.due_date);
}

export function missingGanttDates(task: Pick<Task, "start_date" | "due_date">) {
  if (!task.start_date && !task.due_date) return "Definir fechas";
  return !task.start_date
    ? "Falta fecha de inicio"
    : !task.due_date
      ? "Falta fecha límite"
      : "Definir fechas";
}

export function ganttBarGeometry(
  task: Task,
  row: { $x?: number; $w?: number; $y?: number },
  view: {
    scrollLeft: number;
    scrollTop: number;
    width: number;
    height: number;
    cellHeight: number;
  },
) {
  const y = (row.$y ?? -view.cellHeight) + view.cellHeight / 2 - view.scrollTop;
  if (y < 0 || y >= view.height) return null;
  const real = hasGanttInterval(task);
  const positioned =
    real && Number.isFinite(row.$x) && Number.isFinite(row.$w) && row.$w! > 0;
  const left = positioned ? row.$x! - view.scrollLeft : null;
  const right = positioned ? left! + row.$w! : null;
  const eligible =
    positioned &&
    row.$w! >= 40 &&
    task.parent_id === null &&
    task.permissions.dependencies;
  const small = positioned && row.$w! < 64;
  const inside = (center: number) => center >= 12 && center <= view.width - 12 ? center : null;
  const startVisible = positioned && left! >= 0 && left! <= view.width;
  const endVisible = positioned && right! >= 0 && right! <= view.width;
  const resizeStart = startVisible ? inside(left! + (small ? -26 : 8)) : null;
  const resizeEnd = endVisible ? inside(right! + (small ? 26 : -8)) : null;
  const startConnector = eligible && startVisible ? inside(left! - (small ? 54 : 20)) : null;
  const endConnector = eligible && endVisible ? inside(right! + (small ? 54 : 20)) : null;
  const labelLeft = right === null ? null : right + (small ? (endConnector !== null ? 74 : resizeEnd !== null ? 46 : 8) : endConnector !== null ? 40 : 8);
  return {
    y, real, left, right, small,
    outside: positioned ? right! <= 0 ? "before" as const : left! >= view.width ? "after" as const : null : null,
    connectable: Boolean(eligible), resizeStart, resizeEnd,
    moveControl: small && startVisible && endVisible ? inside((left! + right!) / 2) : null,
    startConnector, endConnector, labelLeft,
  };
}
