import { useState } from "react";
import type { FormEvent } from "react";
import { errorText } from "../../auth/api";
import type {
  EditTaskPayload, Label, Project, ProjectCatalogs, ProjectTaskConfiguration, Task, TaskFormPayload,
} from "../types";
import LabelEditor from "../LabelEditor/LabelEditor";
import ProjectForm from "../ProjectForm/ProjectForm";
import TaskStatusConfiguration from "../TaskStatusConfiguration/TaskStatusConfiguration";
import formStyles from "../ProjectForm/ProjectForm.module.css";
import styles from "./TaskForm.module.css";

interface TaskFormProps {
  project: Project;
  catalogs: ProjectCatalogs;
  task?: Task;
  parent?: Task;
  onSubmit: (data: TaskFormPayload) => Promise<void>;
  onConfigured: (configuration: ProjectTaskConfiguration) => void;
  onClose: () => void;
}

export default function TaskForm({ project, catalogs, task, parent, onSubmit, onConfigured, onClose }: TaskFormProps) {
  const [name, setName] = useState(task?.name ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [stateCode, setStateCode] = useState("PENDIENTE");
  const [priority, setPriority] = useState(task?.priority ?? 3);
  const [dueDate, setDueDate] = useState(task?.due_date ?? parent?.due_date ?? project.end_date ?? "");
  const [responsible, setResponsible] = useState(task?.responsible_id?.toString() ?? "");
  const requirementIds = task?.labels.flatMap((label) => label.requirement_id === null ? [] : [label.requirement_id]) ?? [];
  const [labels, setLabels] = useState<Label[]>(
    task?.labels.filter((label) => label.requirement_id === null).map(({ name, kind }) => ({ name, kind })) ?? [],
  );
  const [reason, setReason] = useState("");
  const [configuring, setConfiguring] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const canAssign = project.permissions.manage && (!task || task.permissions.assign);
  const states = project.task_states.states;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) { setError("Indica el nombre de la tarea."); return; }
    setBusy(true);
    setError("");
    const data: EditTaskPayload = {
      name: name.trim(), priority, due_date: dueDate, requirement_ids: requirementIds, labels,
    };
    if (!task || project.permissions.manage) data.description = description.trim();
    if (canAssign) data.responsible_id = responsible ? Number(responsible) : null;
    try {
      await onSubmit(task ? data : {
        ...data, state_code: stateCode, parent_id: parent?.id ?? null, reason: reason.trim(),
      });
    } catch (failure) { setError(errorText(failure)); }
    finally { setBusy(false); }
  }

  function configured(configuration: ProjectTaskConfiguration) {
    if (!configuration.states.some((state) => state.code === stateCode)) setStateCode("PENDIENTE");
    onConfigured(configuration);
  }

  return (
    <>
      <ProjectForm compact busy={busy} error={error} onSubmit={submit} actions={
        <>
          <button type="button" className={formStyles.secondary} disabled={busy} onClick={onClose}>Cancelar</button>
          <button type="submit" className="primary-button" disabled={busy}>
            {busy ? "Guardando…" : task ? "Guardar cambios" : parent ? "Crear subtarea" : "Crear tarea"}
          </button>
        </>
      }>
        <p className={styles.context}>{project.name}{parent && ` · Subtarea de ${parent.name}`}</p>
        <div className={formStyles.field}>
          <label htmlFor="task-name">Nombre de tarea *</label>
          <input id="task-name" className={styles.name} required maxLength={180} value={name}
            placeholder="Nombre de tarea" onChange={(event) => setName(event.target.value)} />
        </div>
        <div className={formStyles.field}>
          <label htmlFor="task-description">Descripción (opcional)</label>
          <textarea id="task-description" rows={2} maxLength={10000} value={description}
            readOnly={Boolean(task && !project.permissions.manage)}
            placeholder="Añade una descripción breve" onChange={(event) => setDescription(event.target.value)} />
        </div>
        <div className={styles.controls}>
          <div className={formStyles.field}>
            <label htmlFor="task-initial-state">{task ? "Estado actual" : "Estado inicial"}</label>
            <div className={styles.state}>
              <select id="task-initial-state" disabled={Boolean(task) || !canAssign}
                value={task?.state_code ?? stateCode} onChange={(event) => setStateCode(event.target.value)}>
                {states.filter((state) => task || canAssign || state.code === "PENDIENTE")
                  .map((state) => <option value={state.code} key={state.code}>{state.name}</option>)}
              </select>
              {project.task_states.can_configure && <button type="button" className={styles.configure}
                aria-label="Configurar estados del proyecto" title="Configurar estados del proyecto"
                onClick={() => setConfiguring(true)}>⚙</button>}
            </div>
          </div>
          <div className={formStyles.field}>
            <label htmlFor="task-responsible">Responsable</label>
            {canAssign ? (
              <select id="task-responsible" value={responsible} onChange={(event) => setResponsible(event.target.value)}>
                <option value="">Sin responsable</option>
                {project.participants.map((worker) => <option key={worker.id} value={worker.id}>{worker.name}</option>)}
              </select>
            ) : <p className={styles.readonly}>{task?.responsible_name ?? "Tú"} · Asignación administrada</p>}
          </div>
          <div className={formStyles.field}>
            <label htmlFor="task-due">Fecha límite *</label>
            <input id="task-due" required type="date" min={project.start_date ?? undefined}
              max={parent?.due_date ?? project.end_date ?? undefined} value={dueDate}
              onChange={(event) => setDueDate(event.target.value)} />
          </div>
          <div className={formStyles.field}>
            <label htmlFor="task-priority">Prioridad</label>
            <select id="task-priority" value={priority} onChange={(event) => setPriority(Number(event.target.value))}>
              {catalogs.priorities.map((item) => <option key={item.code} value={item.code}>{item.name}</option>)}
            </select>
          </div>
        </div>
        {!task && !canAssign && <p className={styles.metadata}>
          La tarea nace pendiente y asignada a ti. Después podrás usar las transiciones autorizadas.
        </p>}
        {canAssign && project.participants.length === 0 && <p className={styles.metadata}>
          Sin participantes confirmados: puedes crear tareas pendientes sin responsable. La asignación estará disponible posteriormente.
        </p>}
        {!task && ["BLOQUEADA", "CANCELADA"].includes(stateCode) && (
          <div className={formStyles.field}>
            <label htmlFor="task-reason">Motivo obligatorio</label>
            <input id="task-reason" required maxLength={500} value={reason} onChange={(event) => setReason(event.target.value)} />
          </div>
        )}
        <LabelEditor title="Etiquetas de la tarea" labels={labels} onChange={setLabels} />
        <p className={styles.metadata}>Creación: {task
          ? new Date(task.created_at).toLocaleString("es-PE")
          : "La fecha será asignada por el servidor al guardar."}</p>
      </ProjectForm>
      {configuring && <TaskStatusConfiguration project={project} onConfigured={configured} onClose={() => setConfiguring(false)} />}
    </>
  );
}
