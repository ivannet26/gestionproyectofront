import type { Label } from "../types";

interface LabelListProps {
  labels: (Label & { id?: number })[];
  onRemove?: (index: number) => void;
}

export default function LabelList({ labels, onRemove }: LabelListProps) {
  if (labels.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-2 p-0 my-2 list-none">
      {labels.map((label, index) => (
        <li
          key={label.id ?? `${label.kind}:${label.name}`}
          className="flex items-center gap-2 px-2 py-1 border border-neutral-200 bg-neutral-50 text-xs text-neutral-900 shadow-none"
        >
          <span>
            {label.name} ·{" "}
            {label.kind === "technical" ? "Técnica" : "No técnica"}
          </span>
          {onRemove && (
            <button
              type="button"
              aria-label={`Retirar ${label.name}`}
              onClick={() => onRemove(index)}
              className="min-w-6 min-h-6 border-0 bg-white text-neutral-900 cursor-pointer text-base"
            >
              ×
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
