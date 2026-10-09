import type { FormEventHandler, ReactNode } from "react";
import styles from "./ProjectForm.module.css";

interface ProjectFormProps {
  children: ReactNode;
  actions?: ReactNode;
  busy: boolean;
  error: string;
  compact?: boolean;
  onSubmit: FormEventHandler<HTMLFormElement>;
}

export default function ProjectForm({
  children, actions, busy, error, compact = false, onSubmit,
}: ProjectFormProps) {
  return (
    <form className={`${styles.form}${compact ? ` ${styles.compact}` : ""}`} onSubmit={onSubmit}>
      <fieldset className={styles.fields} disabled={busy}>{children}</fieldset>
      {error && <p className="form-message form-message--error" role="alert">{error}</p>}
      {actions && <footer className={styles.actions}>{actions}</footer>}
    </form>
  );
}
