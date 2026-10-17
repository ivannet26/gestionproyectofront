import { useId, useState } from "react";
import ChevronDownIcon from "../../../shared/icons/ChevronDownIcon";

export default function TaskGroupExpansionControl({ expanded, disabled, controls, onToggle }: {
  expanded: boolean;
  disabled: boolean;
  controls: string;
  onToggle: () => void;
}) {
  const tooltipId = useId();
  const [dismissed, setDismissed] = useState(false);
  const label = expanded ? "Contraer grupos" : "Expandir grupos";
  return <div className="group relative flex shrink-0 items-center">
    <button type="button" aria-label={label} aria-expanded={expanded} aria-controls={controls || undefined}
      aria-describedby={disabled ? undefined : tooltipId} disabled={disabled} onClick={onToggle}
      onFocus={() => setDismissed(false)} onMouseEnter={() => setDismissed(false)}
      onKeyDown={(event) => { if (event.key === "Escape") setDismissed(true); }}
      className="inline-flex cursor-pointer touch-manipulation items-center justify-center rounded-lg p-2 text-neutral-700 hover:bg-neutral-200 hover:text-neutral-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-700 disabled:cursor-default disabled:opacity-50 [@media(pointer:coarse)]:p-3.5">
      <span aria-hidden="true" className={`relative block size-4 ${expanded ? "rotate-180" : ""}`}>
        <ChevronDownIcon className="absolute -top-1 size-4" />
        <ChevronDownIcon className="absolute top-1 size-4" />
      </span>
    </button>
    <span id={tooltipId} role="tooltip" hidden={dismissed || disabled}
      className="invisible absolute right-0 top-full z-10 mt-1 whitespace-nowrap rounded-lg border border-neutral-200 bg-white px-2 py-1 text-xs text-neutral-800 group-hover:visible group-focus-within:visible">{label}</span>
  </div>;
}
