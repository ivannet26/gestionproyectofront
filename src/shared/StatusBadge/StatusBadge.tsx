import type { ReactNode } from "react";

interface StatusBadgeProps {
  children: ReactNode;
  tone?: string;
}

const toneStyles: Record<string, string> = {
  green: "border-green-400 bg-green-50 text-green-800",
  blue: "border-blue-200 bg-blue-50 text-blue-800",
  yellow: "border-yellow-200 bg-yellow-50 text-yellow-800",
  red: "border-red-200 bg-red-50 text-red-800",
  neutral: "border-neutral-200 bg-neutral-100 text-neutral-600",
};

const dotStyles: Record<string, string> = {
  green: "bg-green-600",
  blue: "bg-blue-600",
  yellow: "bg-yellow-500",
  red: "bg-red-600",
  neutral: "bg-neutral-400",
};

function StatusBadge({ children, tone = "neutral" }: StatusBadgeProps) {
  const style = toneStyles[tone] ?? toneStyles.neutral;
  const dot = dotStyles[tone] ?? dotStyles.neutral;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold whitespace-nowrap ${style}`}
    >
      {children}
    </span>
  );
}

export default StatusBadge;
