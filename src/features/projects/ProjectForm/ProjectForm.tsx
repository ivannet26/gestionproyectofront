import { useEffect, useRef } from "react";
import type { FormEventHandler, ReactNode } from "react";
import type { FieldErrors } from "../formErrors";
import styles from "./ProjectForm.module.css";

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

export default function ProjectForm({
  children, actions, busy, error, compact = false, fieldErrors = {}, manualValidation = false, readOnly = false, onSubmit,
}: ProjectFormProps) {
  const summary = useRef<HTMLDivElement>(null);
  useEffect(() => { if (error && !busy) summary.current?.focus(); }, [error, busy]);
  return (
    <form className={`${styles.form}${compact ? ` ${styles.compact}` : ""}`} noValidate={manualValidation}
      autoComplete="off" aria-busy={busy} onSubmit={(event) => {
        onSubmit(event);
        queueMicrotask(() => summary.current?.focus());
      }}>
      {error && <div ref={summary} className="form-message form-message--error" role="alert" tabIndex={-1}>
        <p className={styles.errorHeading}>{error}</p>
        {Object.keys(fieldErrors).length > 0 && <ul className={styles.errorList}>
          {Object.entries(fieldErrors).map(([id, message]) => <li key={id}>
            <button type="button" onClick={() => document.getElementById(id)?.focus()}>{message}</button>
          </li>)}
        </ul>}
      </div>}
      <fieldset className={styles.fields} disabled={busy || readOnly}>{children}</fieldset>
      {actions && <footer className={styles.actions}>{actions}</footer>}
    </form>
  );
}
