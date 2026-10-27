import { projectToday } from "../TaskList/taskGrouping";

export function taskCreationDay(createdAt?: string | null): string | null {
  if (!createdAt) return null;
  const instant = new Date(createdAt);
  return Number.isFinite(instant.getTime()) ? projectToday(instant) : null;
}

export function isBeforeTaskCreation(value?: string | null, createdAt?: string | null) {
  const day = taskCreationDay(createdAt);
  return Boolean(value && day && /^\d{4}-\d{2}-\d{2}$/.test(value) && value < day);
}

export function taskCreationStart(projectStart?: string | null, parentStart?: string | null, now = new Date()) {
  return [projectToday(now), projectStart ?? "", parentStart ?? ""].sort().at(-1)!;
}
