import { useEffect, useRef } from "react";
import type { FormEventHandler, ReactNode } from "react";
import type { FieldErrors } from "../formErrors";

interface ProjectFormProps {
  children: ReactNode;
  actions?: ReactNode;
  busy: boolean;
  error: string;
  compact?: boolean;
  fieldErrors?: FieldErrors;
  manualValidation?: boolean;
  readOnly?: boolean;
  onSubmit: FormEventHandler<HTMLFormElement>;
}

export default function ProjectForm({ children, actions, busy, error, compact = false,
  fieldErrors = {}, manualValidation = false, readOnly = false, onSubmit }: ProjectFormProps) {
  const message = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (busy) return;
    const first = Object.keys(fieldErrors)[0];
    if (first) document.getElementById(first)?.focus();
    else if (error) message.current?.focus();
  }, [busy, error, fieldErrors]);
  return <form className={`grid min-w-0 gap-3 p-5 max-sm:p-4 ${compact ? "gap-4" : ""} [&_label]:text-sm [&_legend]:text-sm [&_label]:font-medium [&_input:not([type=radio]):not([type=checkbox])]:w-full [&_select]:w-full [&_textarea]:w-full [&_input:not([type=radio]):not([type=checkbox])]:min-h-10 [&_select]:min-h-10 [&_textarea]:min-h-16 [&_input:not([type=radio]):not([type=checkbox])]:rounded-md [&_select]:rounded-md [&_textarea]:rounded-md [&_input:not([type=radio]):not([type=checkbox])]:border [&_select]:border [&_textarea]:border [&_input]:border-neutral-200 [&_select]:border-neutral-200 [&_textarea]:border-neutral-200 [&_input:not([type=radio]):not([type=checkbox])]:px-3 [&_select]:px-3 [&_textarea]:px-3 [&_input:not([type=radio]):not([type=checkbox])]:py-2 [&_select]:py-2 [&_textarea]:py-2 [&_input]:text-sm [&_select]:text-sm [&_textarea]:text-sm [&_[aria-invalid=true]]:border-red-700 [&_:focus-visible]:outline-2 [&_:focus-visible]:outline-offset-2 [&_:focus-visible]:outline-neutral-700`}
    noValidate={manualValidation} autoComplete="off" aria-busy={busy} onSubmit={onSubmit}>
    <fieldset className="m-0 grid min-w-0 gap-3 border-0 p-0" disabled={busy || readOnly}>{children}</fieldset>
    {error && <p ref={message} className="m-0 text-sm text-red-700" role="alert" tabIndex={-1}>{error}</p>}
    {actions && <footer className="mt-2 flex flex-wrap justify-end gap-2 border-t border-neutral-200 pt-3">{actions}</footer>}
  </form>;
}
