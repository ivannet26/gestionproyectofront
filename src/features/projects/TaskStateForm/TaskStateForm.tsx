import { useState } from "react";
import type { FormEvent } from "react";
import { errorText } from "../../auth/api";
import type { ProjectCatalogs, Task, TaskStatePayload } from "../types";
import ProjectForm from "../ProjectForm/ProjectForm";
import formStyles from "../ProjectForm/ProjectForm.module.css";

interface TaskStateFormProps {
  task: Task;
  catalogs: ProjectCatalogs;
  onSubmit: (data: TaskStatePayload) => Promise<void>;
}

export default function TaskStateForm({ task, catalogs, onSubmit }: TaskStateFormProps) {
  const [target, setTarget] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const needsReason = task.transitions.find((item) => item.target === target)?.reason_required ?? false;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try { await onSubmit({ state_code: target, reason: reason.trim() }); }
    catch (failure) { setError(errorText(failure)); }
    finally { setBusy(false); }
  }

  return (
    <ProjectForm busy={busy} error={error} onSubmit={submit} actions={
      <button className="primary-button" disabled={busy || !target} type="submit">
        {busy ? "Guardando…" : "Cambiar estado"}
      </button>
    }>
      <div className={formStyles.field}>
        <label htmlFor="task-target">Nuevo estado</label>
        <select id="task-target" required value={target} onChange={(event) => setTarget(event.target.value)}>
          <option value="">Selecciona una transición</option>
          {task.transitions.map((item) => (
            <option value={item.target} key={item.target}>
              {catalogs.states.find((state) => state.code === item.target)?.name ?? item.target}
            </option>
          ))}
        </select>
      </div>
      {task.transitions.length === 0 && <p className="field-hint">No hay transiciones autorizadas desde el estado actual.</p>}
      <div className={formStyles.field}>
        <label htmlFor="state-reason">Motivo {needsReason ? "*" : "(opcional)"}</label>
        <textarea id="state-reason" required={needsReason} maxLength={500} value={reason}
          onChange={(event) => setReason(event.target.value)} />
      </div>
    </ProjectForm>
  );
}
