import type { Task } from "./types";

function compareCalendarRevision(left?: string, right?: string) {
  const a = /^[1-9]\d*$/.test(left ?? "") ? left! : "0";
  const b = /^[1-9]\d*$/.test(right ?? "") ? right! : "0";
  return a.length - b.length || a.localeCompare(b);
}

export function reconcileTask(previous: Task | undefined, incoming: Task, fields?: string[]): Task {
  if (!previous) return incoming;
  const newer = !(previous.updated_at && incoming.updated_at && previous.updated_at > incoming.updated_at);
  let result = previous;
  if (newer && !incoming.calendar_receipt?.replayed) {
    if (!fields) result = incoming;
    else {
      const names = new Set(fields);
      if (names.has("responsible_id") || names.has("responsible_ids"))
        for (const key of ["assignees", "responsible_id", "responsible_name"]) names.add(key);
      if (["labels", "requirement_ids", "specialty_ids", "retained_label_ids"].some((key) => names.has(key))) names.add("labels");
      names.add("updated_at");
      names.add("move_revision");
      result = { ...previous, ...Object.fromEntries(Object.entries(incoming).filter(([key]) => names.has(key))) };
    }
  }
  const calendar = compareCalendarRevision(incoming.calendar_revision, previous.calendar_revision) >= 0 ? incoming : previous;
  return { ...result, start_date: calendar.start_date, due_date: calendar.due_date,
    ...(calendar.calendar_revision ? { calendar_revision: calendar.calendar_revision } : {}),
    ...(incoming.calendar_receipt ? { calendar_receipt: incoming.calendar_receipt } : {}) };
}

export function reconcileTasks(current: Task[], incoming: Task[], replace = false): Task[] {
  const saved = new Map(incoming.map((task) => [task.id, task]));
  const previous = new Map(current.map((task) => [task.id, task]));
  const latest = (tasks: Task[]) => tasks.reduce((value, task) => task.updated_at && task.updated_at > value ? task.updated_at : value, "");
  const stale = Boolean(incoming.length && latest(incoming) < latest(current));
  const revision = stale ? undefined : incoming[0]?.move_revision;
  return [...(replace && !stale ? saved : new Map([...previous, ...saved])).values()].map((task) => {
    const old = previous.get(task.id);
    const next = reconcileTask(old, task);
    return revision ? { ...next, move_revision: revision } : old?.move_revision ? { ...next, move_revision: old.move_revision } : next;
  });
}
