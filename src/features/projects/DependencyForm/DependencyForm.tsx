import { useState } from "react";
import type { FormEvent } from "react";
import { errorText } from "../../auth/api";
import type { Task } from "../types";
import ProjectForm from "../ProjectForm/ProjectForm";
import formStyles from "../ProjectForm/ProjectForm.module.css";
import styles from "./DependencyForm.module.css";

interface DependencyFormProps {
  task: Task;
  tasks: Task[];
  onChange: (id: number, remove: boolean) => Promise<void>;
}

export default function DependencyForm({ task, tasks, onChange }: DependencyFormProps) {
  const [selected, setSelected] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const candidates = tasks.filter((item) =>
    item.parent_id === null && item.id !== task.id && !task.dependencies.includes(item.id),
  );

  async function change(id: number, remove: boolean) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await onChange(id, remove);
      setSelected("");
      setMessage(remove ? "Dependencia retirada" : "Dependencia agregada");
    } catch (failure) { setError(errorText(failure)); }
    finally { setBusy(false); }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (selected) void change(Number(selected), false);
  }

  return (
    <ProjectForm busy={busy} error={error} onSubmit={submit}>
      <p className={styles.intro}>Elige una tarea que deba completarse antes de «{task.name}».
        El orden y las fechas no restringen esta selección.</p>
      <div className={formStyles.field}>
        <label htmlFor="dependency-source">Tarea predecesora</label>
        <select id="dependency-source" value={selected} onChange={(event) => setSelected(event.target.value)}>
          <option value="">Selecciona otra tarea principal</option>
          {candidates.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
      </div>
      <button className={formStyles.secondary} type="submit" disabled={busy || !selected}>Agregar dependencia</button>
      <ul className={styles.list}>
        {task.dependencies.map((id) => (
          <li key={id}>
            <span>{tasks.find((item) => item.id === id)?.name ?? "Tarea no disponible"}</span>
            <button className={formStyles.secondary} type="button" disabled={busy}
              aria-label={`Retirar dependencia ${tasks.find((item) => item.id === id)?.name ?? id}`}
              onClick={() => { void change(id, true); }}>Retirar</button>
          </li>
        ))}
      </ul>
      {task.dependencies.length === 0 && <p className="field-hint">No hay dependencias configuradas. No se agregan automáticamente.</p>}
      {message && <p className="form-message" role="status">{message}</p>}
    </ProjectForm>
  );
}
