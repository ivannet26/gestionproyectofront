import type { ReactNode } from "react";

export default function ProjectToolbar({
  children,
  action,
}: {
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div
      role="group"
      aria-label="Herramientas del proyecto"
      className="flex shrink-0 flex-wrap items-start gap-1.5 pt-1.5 pb-3"
    >
      {children}
      {action && <div className="ml-auto shrink-0">{action}</div>}
    </div>
  );
}
