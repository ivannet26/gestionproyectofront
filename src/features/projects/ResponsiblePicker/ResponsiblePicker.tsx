import { useState } from "react";
import type { Project } from "../types";
import TaskProperty from "../TaskForm/TaskProperty";
import TaskIcon from "../TaskForm/TaskIcon";
import { propertyClasses as styles } from "../ProjectForm/formClasses";

interface ResponsiblePickerProps {
  participants: Project["participants"];
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

export default function ResponsiblePicker({ participants, value, onChange, error }: ResponsiblePickerProps) {
  const [search, setSearch] = useState("");
  const selected = participants.find((worker) => String(worker.id) === value);
  const results = participants.filter((worker) => worker.name.toLocaleLowerCase("es").includes(search.trim().toLocaleLowerCase("es")));

  return <TaskProperty id="task-responsible" label="Responsable" icon="person" error={error}
    value={selected?.name ?? (value ? "Responsable no disponible" : "Sin responsable")}>
    {(close) => <>
        <label htmlFor="task-responsible-search">Buscar integrante del proyecto</label>
        <input id="task-responsible-search" name="responsible_search" type="search"
          autoComplete="off" maxLength={100} placeholder="Buscar por nombre…" value={search}
          onKeyDown={(event) => { if (event.key === "Enter") event.preventDefault(); }}
          onChange={(event) => setSearch(event.target.value)} />
        <div className={styles.options} role="group" aria-label="Integrantes elegibles">
          <button type="button" className={styles.option} aria-pressed={!value}
            onClick={() => { onChange(""); close(); }}><span>Sin responsable</span>{!value && <TaskIcon name="check" />}</button>
          {results.map((worker) => <button type="button" className={styles.option} key={worker.id}
            aria-pressed={value === String(worker.id)} onClick={() => { onChange(String(worker.id)); close(); }}>
            <span>{worker.name}</span>{value === String(worker.id) && <TaskIcon name="check" />}
          </button>)}
          {results.length === 0 && <p role="status">{participants.length === 0
            ? "No hay participantes elegibles en este proyecto." : "No hay integrantes que coincidan con la búsqueda."}</p>}
        </div>
    </>}
  </TaskProperty>;
}
