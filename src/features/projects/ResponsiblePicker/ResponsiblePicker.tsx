import { useState } from "react";
import type { Project } from "../types";
import TaskProperty from "../TaskForm/TaskProperty";
import TaskIcon from "../TaskForm/TaskIcon";
import { propertyClasses as styles } from "../ProjectForm/formClasses";

interface ResponsiblePickerProps {
  participants: Project["participants"];
  value: number[];
  onChange: (value: number[]) => void;
  error?: string;
}

export default function ResponsiblePicker({ participants, value, onChange, error }: ResponsiblePickerProps) {
  const [search, setSearch] = useState("");
  const selected = participants.filter((worker) => value.includes(worker.id));
  const results = participants.filter((worker) => worker.name.toLocaleLowerCase("es").includes(search.trim().toLocaleLowerCase("es")));

  return <TaskProperty id="task-responsible" label="Responsables" icon="person" error={error}
    value={value.length ? (selected.map((person) => person.name).join(", ") || "Responsables no disponibles") : "Sin persona asignada"}>
    {(close) => <>
        <label htmlFor="task-responsible-search">Buscar integrante del proyecto</label>
        <input id="task-responsible-search" name="responsible_search" type="search"
          autoComplete="off" maxLength={100} placeholder="Buscar por nombre…" value={search}
          onKeyDown={(event) => { if (event.key === "Enter") event.preventDefault(); }}
          onChange={(event) => setSearch(event.target.value)} />
        <div className={styles.options} role="group" aria-label="Integrantes elegibles">
          <button type="button" className={styles.option} aria-pressed={!value.length}
            onClick={() => onChange([])}><span>Sin persona asignada</span>{!value.length && <TaskIcon name="check" />}</button>
          {results.map((worker) => <button type="button" className={styles.option} key={worker.id}
            aria-pressed={value.includes(worker.id)} onClick={() => onChange(value.includes(worker.id) ? value.filter((id) => id !== worker.id) : [...value, worker.id])}>
            <span>{worker.name}</span>{value.includes(worker.id) && <TaskIcon name="check" />}
          </button>)}
          {results.length === 0 && <p role="status">{participants.length === 0
            ? "No hay participantes elegibles en este proyecto." : "No hay integrantes que coincidan con la búsqueda."}</p>}
        </div>
        <button type="button" className={styles.done} onClick={close}>Listo</button>
    </>}
  </TaskProperty>;
}
