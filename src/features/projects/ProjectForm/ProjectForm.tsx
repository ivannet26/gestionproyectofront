import type { FormEventHandler, ReactNode } from "react";

interface ProjectFormProps {
  children: ReactNode;
  actions?: ReactNode;
  busy: boolean;
  error: string;
  compact?: boolean;
  onSubmit: FormEventHandler<HTMLFormElement>;
}

export const fieldClass = "grid gap-1.5 min-w-0";
export const inputClass =
  "w-full min-h-[40px] px-3 py-2 text-neutral-900 bg-white border border-neutral-200 text-sm shadow-none focus:ring-0 focus-visible:outline-none focus:border-neutral-400";
export const labelClass = "text-neutral-900 text-sm font-medium";
export const secondaryButtonClass =
  "min-h-[40px] px-3 py-2 text-neutral-900 bg-white border border-neutral-200 text-sm cursor-pointer shadow-none disabled:opacity-50 disabled:cursor-not-allowed";
export const primaryButtonClass =
  "min-h-[40px] px-4 py-2 bg-neutral-900 text-white text-sm shadow-none disabled:opacity-50 disabled:cursor-not-allowed";

export default function ProjectForm({
  children,
  actions,
  busy,
  error,
  compact = false,
  onSubmit,
}: ProjectFormProps) {
  return (
    <form
      className={`grid gap-3 ${compact ? "gap-4" : ""} p-5 max-sm:p-4`}
      onSubmit={onSubmit}
    >
      <fieldset className="grid gap-3 min-w-0 m-0 p-0 border-0" disabled={busy}>
        {children}
      </fieldset>
      {error && (
        <p
          className="border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 shadow-none"
          role="alert"
        >
          {error}
        </p>
      )}
      {actions && (
        <footer className="flex justify-end flex-wrap gap-3 mt-3 max-sm:flex-col">
          {actions}
        </footer>
      )}
    </form>
  );
}
