import { projectToday } from "../TaskList/taskGrouping";

export function isPastTaskDate(value?: string | null, now = new Date()) {
  return Boolean(value && value < projectToday(now));
}
