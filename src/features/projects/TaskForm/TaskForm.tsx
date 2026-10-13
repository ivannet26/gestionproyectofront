import { useState } from "react";
import type { FormEvent } from "react";
import { errorText } from "../../auth/api";
import type {
  EditTaskPayload, Label, Project, ProjectCatalogs, ProjectTaskConfiguration, Task, TaskFormPayload,
} from "../types";
import LabelEditor from "../LabelEditor/LabelEditor";
import ProjectForm, { fieldClass, inputClass, labelClass, primaryButtonClass, secondaryButtonClass } from "../ProjectForm/ProjectForm";
import TaskStatusConfiguration from "../TaskStatusConfiguration/TaskStatusConfiguration";

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
          <button type="button" className={secondaryButtonClass} disabled={busy} onClick={onClose}>Cancelar</button>
          <button type="submit" className={primaryButtonClass} disabled={busy}>
            {busy ? "Guardando…" : task ? "Guardar cambios" : parent ? "Crear subtarea" : "Crear tarea"}
          </button>
        </>
      }>
        <p className="m-0 text-xs text-neutral-600">{project.name}{parent && ` · Subtarea de ${parent.name}`}</p>
        <div className={fieldClass}>
          <label htmlFor="task-name" className={labelClass}>Nombre de tarea *</label>
          <input id="task-name" className={`${inputClass} font-semibold`} required maxLength={180} value={name}
            placeholder="Nombre de tarea" onChange={(event) => setName(event.target.value)} />
        </div>
        <div className={fieldClass}>
          <label htmlFor="task-description" className={labelClass}>Descripción (opcional)</label>
          <textarea id="task-description" rows={2} maxLength={10000} value={description} className={inputClass}
            readOnly={Boolean(task && !project.permissions.manage)}
            placeholder="Añade una descripción breve" onChange={(event) => setDescription(event.target.value)} />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className={fieldClass}>
            <label htmlFor="task-initial-state" className={labelClass}>{task ? "Estado actual" : "Estado inicial"}</label>
            <div className="flex gap-1.5 items-center">
              <select id="task-initial-state" disabled={Boolean(task) || !canAssign} className={`${inputClass} flex-1 min-w-0`}
                value={task?.state_code ?? stateCode} onChange={(event) => setStateCode(event.target.value)}>
                {states.filter((state) => task || canAssign || state.code === "PENDIENTE")
                  .map((state) => <option value={state.code} key={state.code}>{state.name}</option>)}
              </select>
              {project.task_states.can_configure && <button type="button" className="flex-none w-10 min-h-[40px] border border-neutral-200 bg-neutral-50 text-neutral-900 cursor-pointer shadow-none"
                aria-label="Configurar estados del proyecto" title="Configurar estados del proyecto"
                onClick={() => setConfiguring(true)}>⚙</button>}
            </div>
          </div>
          <div className={fieldClass}>
            <label htmlFor="task-responsible" className={labelClass}>Responsable</label>
            {canAssign ? (
              <select id="task-responsible" value={responsible} onChange={(event) => setResponsible(event.target.value)} className={inputClass}>
                <option value="">Sin responsable</option>
                {project.participants.map((worker) => <option key={worker.id} value={worker.id}>{worker.name}</option>)}
              </select>
            ) : <p className="m-0 py-2.5 min-h-[40px] text-sm text-neutral-600">{task?.responsible_name ?? "Tú"} · Asignación administrada</p>}
          </div>
          <div className={fieldClass}>
            <label htmlFor="task-due" className={labelClass}>Fecha límite *</label>
            <input id="task-due" required type="date" min={project.start_date ?? undefined} className={inputClass}
              max={parent?.due_date ?? project.end_date ?? undefined} value={dueDate}
              onChange={(event) => setDueDate(event.target.value)} />
          </div>
          <div className={fieldClass}>
            <label htmlFor="task-priority" className={labelClass}>Prioridad</label>
            <select id="task-priority" value={priority} onChange={(event) => setPriority(Number(event.target.value))} className={inputClass}>
              {catalogs.priorities.map((item) => <option key={item.code} value={item.code}>{item.name}</option>)}
            </select>
          </div>
        </div>
        {!task && !canAssign && <p className="m-0 text-xs text-neutral-600 leading-relaxed">
          La tarea nace pendiente y asignada a ti. Después podrás usar las transiciones autorizadas.
        </p>}
        {canAssign && project.participants.length === 0 && <p className="m-0 text-xs text-neutral-600 leading-relaxed">
          Sin participantes confirmados: puedes crear tareas pendientes sin responsable. La asignación estará disponible posteriormente.
        </p>}
        {!task && ["BLOQUEADA", "CANCELADA"].includes(stateCode) && (
          <div className={fieldClass}>
            <label htmlFor="task-reason" className={labelClass}>Motivo obligatorio</label>
            <input id="task-reason" required maxLength={500} value={reason} onChange={(event) => setReason(event.target.value)} className={inputClass} />
          </div>
        )}
        <LabelEditor title="Etiquetas de la tarea" labels={labels} onChange={setLabels} />
        <p className="m-0 text-xs text-neutral-600 leading-relaxed">Creación: {task
          ? new Date(task.created_at).toLocaleString("es-PE")
          : "La fecha será asignada por el servidor al guardar."}</p>
      </ProjectForm>
      {configuring && <TaskStatusConfiguration project={project} onConfigured={configured} onClose={() => setConfiguring(false)} />}
    </>
  );
}
