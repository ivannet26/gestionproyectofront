import FlagIcon from "../../../shared/icons/FlagIcon";
import SuccessIcon from "../../../shared/icons/SuccessIcon";
import type { ProjectCatalogs } from "../types";

export const priorityTones: Record<number, string> = {
  1: "text-[#be2937]",
  2: "text-[#a66a08]",
  3: "text-[#4267c5]",
  4: "text-[#707b80]",
};

export default function PriorityOptions({
  priorities,
  value,
  onChange,
}: {
  priorities: ProjectCatalogs["priorities"];
  value: number | null;
  onChange: (value: number | null) => void;
}) {
  return (
    <div
      role="group"
      aria-label="Prioridad"
      className="grid gap-1 [&_button]:flex [&_button]:cursor-pointer [&_button]:items-center [&_button]:gap-2 [&_button]:rounded-lg [&_button]:px-2 [&_button]:py-2 [&_button]:text-left [&_button]:text-xs [&_button:hover]:bg-neutral-100 [&_button[aria-pressed=true]]:bg-neutral-100 [&_span]:flex-1"
    >
      {[{ code: null, name: "Sin prioridad" }, ...priorities].map((item) => (
        <button
          key={String(item.code)}
          type="button"
          aria-pressed={value === item.code}
          onClick={() => onChange(item.code)}
        >
          <FlagIcon
            className={`size-4 shrink-0 ${priorityTones[item.code ?? 0] ?? "text-neutral-500"}`}
            fill
          />
          <span>{item.name}</span>
          {value === item.code && <SuccessIcon className="size-4 shrink-0" />}
        </button>
      ))}
    </div>
  );
}
