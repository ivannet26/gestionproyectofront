import { useState } from "react";
import type { FieldErrors } from "../formErrors";
import { groupTaskStates } from "../stateGroups";
import type { Label, Project, ProjectCatalogs, Task } from "../types";
import TaskOptionalProperties from "./TaskOptionalProperties";
import TaskProperty from "./TaskProperty";
import TaskIcon from "./TaskIcon";
import { propertyClasses as styles } from "../ProjectForm/formClasses";
import { taskAssignees } from "../taskAssignees";

interface TaskPropertiesProps {
  project: Project;
  catalogs: ProjectCatalogs;
  task?: Task;
  parent?: Task;
  stateCode: string;
  responsible: number[];
  dueDate: string;
  priority: number | null;
  labels: Label[];
  errors: FieldErrors;
  onState: (value: string) => void;
  onResponsible: (value: number[]) => void;
  onDate: (value: string) => void;
  onPriority: (value: number | null) => void;
  onLabels: (value: Label[]) => void;
  onConfigure: () => void;
}

export default function TaskProperties({
  project, catalogs, task, parent, stateCode, responsible, dueDate, priority, labels, errors,
  onState, onResponsible, onDate, onPriority, onLabels, onConfigure,
}: TaskPropertiesProps) {
  const [stateSearch, setStateSearch] = useState("");
  const canAssign = project.permissions.manage && (!task || task.permissions.assign);
  const canConfigure = project.permissions.manage && project.task_states.can_configure;
  const selectedState = task?.state_code ?? stateCode;
  const states = project.task_states.states.filter((state) => task || canAssign || state.category === "not_started" || !state.category && state.code === "PENDIENTE");
  const groups = groupTaskStates(states.filter((state) => state.name.toLocaleLowerCase("es").includes(stateSearch.trim().toLocaleLowerCase("es"))));
  const stateName = states.find((state) => state.code === selectedState)?.name ?? task?.state_name ?? selectedState;

  return <div className={styles.properties} aria-label="Propiedades de la tarea">
    <TaskProperty id="task-initial-state" label={task ? "Estado actual" : "Estado inicial"} value={stateName}
      icon="state" error={errors["task-initial-state"]}>
      {(close) => <>
        <label htmlFor="task-state-search">Buscar estado</label>
        <input id="task-state-search" name="state_search" type="search" placeholder="Buscar estado…"
          value={stateSearch} onChange={(event) => setStateSearch(event.target.value)} />
        <div className={styles.options}>
          {groups.map((group) => <section key={group.label} aria-label={group.label}>
            <h3 className={styles.groupTitle}>{group.label}</h3>
            {group.states.map((state) => <button key={state.code} type="button" className={styles.option}
              aria-pressed={selectedState === state.code} disabled={Boolean(task) || !canAssign}
              onClick={() => { onState(state.code); close(); }}>
              <span className="inline-flex" style={state.color ? { color: state.color } : undefined}><TaskIcon name={state.code !== "CANCELADA" && (state.category === "closed" || state.category === "done") ? "check" : "state"} /></span><span>{state.name}</span>{selectedState === state.code && <TaskIcon name="check" />}
            </button>)}
          </section>)}
          {groups.length === 0 && <p className={styles.hint} role="status">No hay estados que coincidan.</p>}
        </div>
        {(task || !canAssign) && <p className={styles.hint}>{task
          ? "Cambia el estado desde las acciones autorizadas de la tarea."
          : "Las tareas nuevas se crean pendientes."}</p>}
        {canConfigure && <button type="button" className={styles.configure}
          onClick={() => { close(); onConfigure(); }}><TaskIcon name="settings" />Configurar estados</button>}
      </>}
    </TaskProperty>
    <TaskOptionalProperties project={project} catalogs={catalogs} responsible={responsible} dueDate={dueDate}
      priority={priority} labels={labels} errors={errors} canAssign={canAssign}
      readOnlyResponsible={task ? taskAssignees(task).map((person) => person.name).join(", ") || "Sin persona asignada" : "Tú"}
      min={parent?.start_date ?? project.start_date ?? undefined} max={parent?.due_date ?? project.end_date ?? undefined}
      onResponsible={onResponsible} onDate={onDate} onPriority={onPriority} onLabels={onLabels} />
  </div>;
}
