import type { TaskGroupingMode, TaskListGroup } from "../types";
import TaskIcon from "../TaskForm/TaskIcon";
import { PriorityLabel, StateLabel } from "./TaskCell";

export default function TaskGroupLabel({ group, mode }: { group: TaskListGroup; mode: TaskGroupingMode }) {
  if (group.stateCode) return <StateLabel code={group.stateCode} name={group.name} />;
  if (mode === "priority") return <PriorityLabel priority={group.priority} name={group.name} />;
  if (group.tokens.length) return <span className="inline-flex flex-wrap items-center gap-1.5" title={group.name}>
    {mode === "assignees" && <TaskIcon name="person" />}
    {group.tokens.slice(0, 3).map((token) => <span key={token.id} className={mode === "labels" ? "max-w-48 truncate rounded-lg border border-neutral-200 bg-neutral-50 px-2 py-0.5 text-xs text-neutral-800" : "max-w-56 truncate text-xs text-neutral-800"}>{token.name}</span>)}
    {group.tokens.length > 3 && <span className="text-xs text-neutral-600">+{group.tokens.length - 3}</span>}
  </span>;
  return <span className={group.key === "due_date:overdue" ? "text-xs text-red-700" : "text-xs text-neutral-800"}>{group.name}</span>;
}
