import { useState } from "react";
import type { FormEvent } from "react";
import { errorText } from "../../auth/api";
import type { ProjectTaskState, Task, TaskStatePayload } from "../types";
import ProjectForm, { fieldClass, inputClass, labelClass, primaryButtonClass } from "../ProjectForm/ProjectForm";

interface TaskStateFormProps {
  task: Task;
  states: ProjectTaskState[];
  onSubmit: (data: TaskStatePayload) => Promise<void>;
}

export default function TaskStateForm({ task, states, onSubmit }: TaskStateFormProps) {
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
      <button className={primaryButtonClass} disabled={busy || !target} type="submit">
        {busy ? "Guardando…" : "Cambiar estado"}
      </button>
    }>
      <div className={fieldClass}>
        <label htmlFor="task-target" className={labelClass}>Nuevo estado</label>
        <select id="task-target" required value={target} onChange={(event) => setTarget(event.target.value)} className={inputClass}>
          <option value="">Selecciona una transición</option>
          {task.transitions.map((item) => (
            <option value={item.target} key={item.target}>
              {states.find((state) => state.code === item.target)?.name ?? item.target}
            </option>
          ))}
        </select>
      </div>
      {task.transitions.length === 0 && <p className="m-0 text-xs text-neutral-600 leading-relaxed">No hay transiciones autorizadas desde el estado actual.</p>}
      <div className={fieldClass}>
        <label htmlFor="state-reason" className={labelClass}>Motivo {needsReason ? "*" : "(opcional)"}</label>
        <textarea id="state-reason" required={needsReason} maxLength={500} value={reason} className={inputClass}
          onChange={(event) => setReason(event.target.value)} />
      </div>
    </ProjectForm>
  );
}
