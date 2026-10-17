import type { ProjectCatalogs } from "../types";
import TaskIcon from "./TaskIcon";

export default function PriorityOptions({ priorities, value, onChange }: {
  priorities: ProjectCatalogs["priorities"];
  value: number | null;
  onChange: (value: number | null) => void;
}) {
  return <div role="group" aria-label="Prioridad" className="grid gap-1 [&_button]:flex [&_button]:cursor-pointer [&_button]:items-center [&_button]:gap-2 [&_button]:rounded-lg [&_button]:px-2 [&_button]:py-2 [&_button]:text-left [&_button]:text-xs [&_button:hover]:bg-neutral-50 [&_button[aria-pressed=true]]:bg-neutral-100 [&_span]:flex-1">
    {[{ code: null, name: "Sin prioridad" }, ...priorities].map((item) => <button key={String(item.code)} type="button"
      aria-pressed={value === item.code} onClick={() => onChange(item.code)}>
      <TaskIcon name="priority" /><span>{item.name}</span>{value === item.code && <TaskIcon name="check" />}
    </button>)}
  </div>;
}
