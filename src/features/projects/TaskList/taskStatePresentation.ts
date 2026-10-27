import type { Task, TaskListGroup } from "../types";

export interface PresentedTaskGroup extends TaskListGroup {
  displayed?: Set<number>;
  elsewhere?: number;
}

export function taskStatePresentation(tasks: Task[], groups: TaskListGroup[], expanded: Set<number>, searching: boolean): PresentedTaskGroup[] {
  const byId = new Map(tasks.map((task) => [task.id, task]));
  const included = new Set(groups.flatMap((group) => [...group.members]));
  const placement = new Map<number, string>();
  for (const id of included) {
    let anchor = byId.get(id);
    if (!anchor) continue;
    const visited = new Set([id]);
    while (anchor.parent_id !== null) {
      const parent = byId.get(anchor.parent_id);
      if (!parent || !included.has(parent.id) || visited.has(parent.id) || (!searching && !expanded.has(parent.id))) break;
      visited.add(parent.id);
      anchor = parent;
    }
    placement.set(id, anchor.state_code);
  }
  return groups.map((group) => {
    const displayed = new Set([...included].filter((id) => placement.get(id) === group.stateCode));
    const visible = new Set<number>();
    for (const id of displayed) {
      let current = byId.get(id);
      while (current && !visible.has(current.id)) {
        visible.add(current.id);
        current = current.parent_id === null ? undefined : byId.get(current.parent_id);
      }
    }
    const roots = tasks.filter((task) => visible.has(task.id) && (task.parent_id === null || !visible.has(task.parent_id)));
    return { ...group, displayed, visible, roots, elsewhere: [...group.members].filter((id) => !displayed.has(id)).length };
  });
}
