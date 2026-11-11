import { getDiffer } from "@svar-ui/gantt-store";
import { ganttDay } from "./ganttViewport";
import { formatTaskDate } from "../../utils/taskHierarchy";
export function ganttRangeLabel(start?: string, end?: string | null) {
  if (!start || !end) return "Intervalo incompleto";
  const days = getDiffer("day")(ganttDay(end), ganttDay(start)) + 1;
  return `${formatTaskDate(start)} — ${formatTaskDate(end)} (${days} ${days === 1 ? "día" : "días"})`;
}
