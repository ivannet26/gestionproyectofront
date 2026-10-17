import { useState } from "react";
import type { FieldErrors } from "../formErrors";
import { groupTaskStates } from "../stateGroups";
import type { Label, Project, ProjectCatalogs, Task } from "../types";
import LabelEditor from "../LabelEditor/LabelEditor";
import ResponsiblePicker from "../ResponsiblePicker/ResponsiblePicker";
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
  priority: number;
  labels: Label[];
  errors: FieldErrors;
  onState: (value: string) => void;
  onResponsible: (value: number[]) => void;
  onDate: (value: string) => void;
  onPriority: (value: number) => void;
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
  const dateValue = dueDate ? new Intl.DateTimeFormat("es-PE", { day: "2-digit", month: "short", year: "numeric" })
    .format(new Date(`${dueDate}T12:00:00`)) : "Fecha límite";

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
    {canAssign ? <ResponsiblePicker participants={project.participants} value={responsible}
      error={errors["task-responsible"]} onChange={onResponsible} />
      : <TaskProperty id="task-responsible" label="Responsable · Asignación administrada"
        value={task ? taskAssignees(task).map((person) => person.name).join(", ") || "Sin persona asignada" : "Tú"} icon="person" disabled error={errors["task-responsible"]}>
        {() => null}
      </TaskProperty>}
    <TaskProperty id="task-due" label="Fecha límite obligatoria" value={dateValue} icon="date" error={errors["task-due"]}>
      {(close) => <>
        <label htmlFor="task-due-input">Fecha límite *</label>
        <input id="task-due-input" name="due_date" required type="date" min={project.start_date ?? undefined}
          max={parent?.due_date ?? project.end_date ?? undefined} value={dueDate}
          aria-invalid={Boolean(errors["task-due"])} aria-describedby={errors["task-due"] ? "task-due-error" : undefined}
          onChange={(event) => onDate(event.target.value)} />
        <p className={styles.hint}>Dentro del periodo del proyecto{parent ? " y de la tarea padre" : ""}.</p>
        <button type="button" className={styles.done} onClick={close}>Listo</button>
      </>}
    </TaskProperty>
    <TaskProperty id="task-priority" label="Prioridad" icon="priority" error={errors["task-priority"]}
      value={catalogs.priorities.find((item) => item.code === priority)?.name ?? "Prioridad"}>
      {(close) => <div role="group" aria-label="Prioridad">
        <h3 className={styles.groupTitle}>Prioridad</h3>
        {catalogs.priorities.map((item) => <button key={item.code} type="button" className={styles.option}
          aria-pressed={priority === item.code} onClick={() => { onPriority(item.code); close(); }}>
          <TaskIcon name="priority" /><span>{item.name}</span>{priority === item.code && <TaskIcon name="check" />}
        </button>)}
      </div>}
    </TaskProperty>
    <TaskProperty id="task-labels" label="Etiquetas" value={labels.length ? `Etiquetas · ${labels.length}` : "Etiquetas"}
      icon="labels" error={errors["task-labels"]}>
      {() => <LabelEditor title="Etiquetas de la tarea" compact labels={labels} onChange={onLabels} />}
    </TaskProperty>
  </div>;
}
