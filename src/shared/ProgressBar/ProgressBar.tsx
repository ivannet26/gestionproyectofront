import type { CSSProperties } from "react";

interface ProgressBarProps {
  value: number;
  tone?: string;
  label: string;
}

function ProgressBar({ value, label }: ProgressBarProps) {
  return (
    <div
      className="h-1.5 overflow-hidden bg-neutral-200 shadow-none"
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value}
    >
      <span
        className="block h-full bg-neutral-900"
        style={{ width: `${value}%` } as CSSProperties}
      />
    </div>
  );
}

export default ProgressBar;
