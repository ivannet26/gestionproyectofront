import { useState } from "react";
import type { FormEvent } from "react";
import { errorText } from "../../auth/api";
import type { EditTaskPayload, Label, Project, ProjectCatalogs, Task, TaskFormPayload } from "../types";
import LabelEditor from "../LabelEditor/LabelEditor";
import ProjectForm from "../ProjectForm/ProjectForm";
import formStyles from "../ProjectForm/ProjectForm.module.css";
import styles from "./TaskForm.module.css";

interface TaskFormProps {
  project: Project;
  catalogs: ProjectCatalogs;
  task?: Task;
  parent?: Task;
  onSubmit: (data: TaskFormPayload) => Promise<void>;
  onClose: () => void;
}

export default function TaskForm({ project, catalogs, task, parent, onSubmit, onClose }: TaskFormProps) {
  const [name, setName] = useState(task?.name ?? "");
  const [stateCode, setStateCode] = useState("PENDIENTE");
  const [priority, setPriority] = useState(task?.priority ?? 3);
  const [dueDate, setDueDate] = useState(task?.due_date ?? parent?.due_date ?? project.end_date ?? "");
  const [responsible, setResponsible] = useState(task?.responsible_id?.toString() ?? "");
  const [requirementIds, setRequirementIds] = useState<number[]>(
    task?.labels.flatMap((label) => label.requirement_id === null ? [] : [label.requirement_id]) ?? [],
  );
  const [labels, setLabels] = useState<Label[]>(
    task?.labels.filter((label) => label.requirement_id === null).map(({ name, kind }) => ({ name, kind })) ?? [],
  );
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const canAssign = project.permissions.manage && (!task || task.permissions.assign);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) { setError("Indica el nombre de la tarea."); return; }
    setBusy(true);
    setError("");
    const data: EditTaskPayload = {
      name: name.trim(), priority, due_date: dueDate, requirement_ids: requirementIds, labels,
    };
    if (canAssign) data.responsible_id = responsible ? Number(responsible) : null;
    try {
      await onSubmit(task ? data : {
        ...data, state_code: stateCode, parent_id: parent?.id ?? null, reason: reason.trim(),
      });
    } catch (failure) { setError(errorText(failure)); }
    finally { setBusy(false); }
  }

  return (
    <ProjectForm busy={busy} error={error} onSubmit={submit} actions={
      <>
        <button type="button" className={formStyles.secondary} disabled={busy} onClick={onClose}>Cancelar</button>
        <button type="submit" className="primary-button" disabled={busy}>{busy ? "Guardando…" : "Guardar tarea"}</button>
      </>
    }>
      <div className={formStyles.field}>
        <label htmlFor="task-name">Nombre *</label>
        <input id="task-name" required maxLength={180} value={name} onChange={(event) => setName(event.target.value)} />
      </div>
      {!task && (
        <>
          <div className={formStyles.field}>
            <label htmlFor="task-initial-state">Estado inicial</label>
            <select id="task-initial-state" disabled={!canAssign} value={stateCode}
              onChange={(event) => setStateCode(event.target.value)}>
              {catalogs.states.filter((state) => canAssign || state.code === "PENDIENTE")
                .map((state) => <option value={state.code} key={state.code}>{state.name}</option>)}
            </select>
          </div>
          {!canAssign && <p className={styles.metadata}>La tarea nace pendiente. Después podrás usar los cambios de estado autorizados.</p>}
          {["BLOQUEADA", "CANCELADA"].includes(stateCode) && (
            <div className={formStyles.field}>
              <label htmlFor="task-reason">Motivo obligatorio</label>
              <input id="task-reason" required maxLength={500} value={reason} onChange={(event) => setReason(event.target.value)} />
            </div>
          )}
        </>
      )}
      <div className={formStyles.row}>
        <div>
          <label htmlFor="task-priority">Prioridad</label>
          <select id="task-priority" value={priority} onChange={(event) => setPriority(Number(event.target.value))}>
            {catalogs.priorities.map((item) => <option key={item.code} value={item.code}>{item.name}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="task-due">Fecha límite *</label>
          <input id="task-due" required type="date" min={project.start_date ?? undefined}
            max={parent?.due_date ?? project.end_date ?? undefined} value={dueDate}
            onChange={(event) => setDueDate(event.target.value)} />
        </div>
      </div>
      {canAssign ? (
        <div className={formStyles.field}>
          <label htmlFor="task-responsible">Responsable del proyecto</label>
          <select id="task-responsible" value={responsible} onChange={(event) => setResponsible(event.target.value)}>
            <option value="">Sin responsable</option>
            {project.participants.map((worker) => <option key={worker.id} value={worker.id}>{worker.name}</option>)}
          </select>
          {project.participants.length === 0 && <p className={styles.metadata}>
            Este proyecto no tiene participantes. Puedes crear tareas pendientes sin responsable; la asignación estará disponible posteriormente.
          </p>}
        </div>
      ) : <p className={styles.metadata}>{task
        ? `Responsable: ${task.responsible_name ?? "Sin responsable"}. Solo el Administrador puede modificar la asignación.`
        : "La tarea quedará asignada a ti. Solo el Administrador puede asignar otros responsables."}</p>}
      <p className={styles.metadata}>Creación: {task
        ? new Date(task.created_at).toLocaleString("es-PE")
        : "La fecha será asignada por el servidor al guardar."}</p>
      {project.requirements.length > 0 && (
        <fieldset className={formStyles.options}>
          <legend>Requisitos existentes del proyecto</legend>
          {project.requirements.map((item) => (
            <label key={item.id}>
              <input type="checkbox" checked={requirementIds.includes(item.id)}
                onChange={() => setRequirementIds((current) => current.includes(item.id)
                  ? current.filter((id) => id !== item.id) : [...current, item.id])} />
              {item.name} · {item.kind === "technical" ? "Técnica" : "No técnica"}
            </label>
          ))}
        </fieldset>
      )}
      <LabelEditor title="Etiquetas propias de la tarea" labels={labels} onChange={setLabels} />
    </ProjectForm>
  );
}
