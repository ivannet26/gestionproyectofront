import type { TaskGroupingMode, TaskListGroup } from "../types";
import UserIcon from "../../../shared/icons/UserIcon";
import { PriorityLabel, StateIcon } from "./TaskCell";

export default function TaskGroupLabel({
  group,
  mode,
}: {
  group: TaskListGroup;
  mode: TaskGroupingMode;
}) {
  if (group.stateCode)
    return (
      <span className="inline-flex min-w-0 max-w-full items-center gap-1.5 text-xs font-medium text-white">
        <StateIcon
          code={group.stateCode}
          name={group.name}
          category={group.stateCategory}
          color="#fff"
        />
        <span className="truncate">{group.name}</span>
      </span>
    );
  if (mode === "priority")
    return <PriorityLabel priority={group.priority} name={group.name} />;
  if (group.tokens.length)
    return (
      <span
        className="inline-flex flex-wrap items-center gap-1.5"
        title={group.name}
      >
        {mode === "assignees" && <UserIcon className="size-4" />}
        {group.tokens.slice(0, 3).map((token) => (
          <span
            key={token.id}
            className={
              mode === "labels"
                ? "max-w-48 truncate rounded-lg bg-neutral-100 px-2 py-0.5 text-xs text-neutral-800"
                : "max-w-56 truncate text-xs text-neutral-800"
            }
          >
            {token.name}
          </span>
        ))}
        {group.tokens.length > 3 && (
          <span className="text-xs text-neutral-600">
            +{group.tokens.length - 3}
          </span>
        )}
      </span>
    );
  return (
    <span
      className={
        group.key === "due_date:overdue"
          ? "text-xs text-red-700"
          : "text-xs text-neutral-800"
      }
    >
      {group.name}
    </span>
  );
}
