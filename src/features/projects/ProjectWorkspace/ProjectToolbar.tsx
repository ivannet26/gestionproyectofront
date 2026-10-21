import type { ReactNode } from "react";

export default function ProjectToolbar({ children, action }: { children?: ReactNode; action?: ReactNode }) {
  return <div role="group" aria-label="Herramientas del proyecto" className="flex min-w-0 flex-wrap items-center gap-2 border-b border-neutral-100 px-3 py-2 sm:px-5">
    {children && <div className="flex min-w-0 max-w-full flex-wrap items-center gap-1">{children}</div>}
    {action && <div className="ml-auto shrink-0">{action}</div>}
  </div>;
}
