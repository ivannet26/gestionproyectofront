import { useState } from "react";
import type { FormEvent } from "react";
import { errorText } from "../../auth/api";
import type { Task } from "../types";
import ProjectForm from "../ProjectForm/ProjectForm";
import { fieldClass, inputClass, labelClass, secondaryButtonClass } from "../ProjectForm/formClasses";

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
      <p className="m-0 text-sm leading-relaxed text-neutral-900">Elige una tarea que deba completarse antes de «{task.name}».
        El orden y las fechas no restringen esta selección.</p>
      <div className={fieldClass}>
        <label htmlFor="dependency-source" className={labelClass}>Tarea predecesora</label>
        <select id="dependency-source" value={selected} onChange={(event) => setSelected(event.target.value)} className={inputClass}>
          <option value="">Selecciona otra tarea principal</option>
          {candidates.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
      </div>
      <button className={secondaryButtonClass} type="submit" disabled={busy || !selected}>Agregar dependencia</button>
      <ul className="grid gap-2 m-0 p-0 list-none">
        {task.dependencies.map((id) => (
          <li key={id} className="flex items-center justify-between gap-3">
            <span className="min-w-0 text-sm text-neutral-900">{tasks.find((item) => item.id === id)?.name ?? "Tarea no disponible"}</span>
            <button className={secondaryButtonClass} type="button" disabled={busy}
              aria-label={`Retirar dependencia ${tasks.find((item) => item.id === id)?.name ?? id}`}
              onClick={() => { void change(id, true); }}>Retirar</button>
          </li>
        ))}
      </ul>
      {task.dependencies.length === 0 && <p className="m-0 text-xs text-neutral-600 leading-relaxed">No hay dependencias configuradas. No se agregan automáticamente.</p>}
      {message && <p className="border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-900 shadow-none" role="status">{message}</p>}
    </ProjectForm>
  );
}
