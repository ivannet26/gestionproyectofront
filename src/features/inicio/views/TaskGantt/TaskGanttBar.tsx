import { scheduleLabel } from "../../utils/taskSchedule";
import { ganttRangeLabel } from "./ganttRangeLabel";
import { useContext } from "react";
import type { CSSProperties } from "react";
import type { ITask } from "@svar-ui/react-gantt";
import {
  GanttCalendarContext,
  GanttGestureContext,
} from "./ganttCalendarContext";

export default function TaskGanttBar({ data }: { data: ITask }) {
  const operations = useContext(GanttCalendarContext);
  const activeId = useContext(GanttGestureContext);
  const operation = operations.get(Number(data.id));
  const busy =
    operation?.status === "pending" || Boolean(data.gmCalendarPending);
  const blocked = operation && operation.status !== "success" && !(operation.status === "error" && operation.problem === null);
  const editable = Boolean(
    data.gmEditable && data.gmDueDate !== null && !blocked && !busy,
  );
  const stateColor = data.gmState?.color ?? "#737373";
  return (
    <span
      data-gantt-calendar-task={data.id}
      data-calendar-editable={editable || undefined}
      data-calendar-active={activeId === Number(data.id) || undefined}
      data-calendar-pending={busy || undefined}
      data-gantt-parent={data.gmHasChildren || undefined}
      style={{ "--gm-state-color": stateColor } as CSSProperties}
      className="gm-gantt-bar"
      title={data.gmSchedule?.precision === "hour" ? scheduleLabel({ schedule: data.gmSchedule }) : ganttRangeLabel(data.gmStartDate, data.gmDueDate)}
      aria-busy={busy || undefined}
    >
      <span className="gm-gantt-bar-text sr-only">
        {data.text}
        {busy ? " · Guardando…" : blocked ? " · Revisar" : ""}
      </span>
    </span>
  );
}
