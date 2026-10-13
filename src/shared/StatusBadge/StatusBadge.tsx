import type { ReactNode } from "react";

interface StatusBadgeProps {
  children: ReactNode;
  tone?: string;
}

function StatusBadge({ children, tone = "neutral" }: StatusBadgeProps) {
  const muted = tone === "neutral";
  return (
    <span
      className={`inline-flex items-center min-h-6 px-3 py-1 text-xs font-semibold whitespace-nowrap border border-neutral-200 shadow-none ${
        muted
          ? "text-neutral-600 bg-neutral-50"
          : "text-neutral-900 bg-neutral-100"
      }`}
    >
      {children}
    </span>
  );
}

export default StatusBadge;
