import { useLayoutEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { errorText } from "../../auth/api";
import { apiFieldErrors } from "../formErrors";
import type { FieldErrors } from "../formErrors";
import type {
  EditTaskPayload, Label, Project, ProjectCatalogs, ProjectTaskConfiguration, Task, TaskFormPayload,
} from "../types";
import LabelList from "../LabelList/LabelList";
import TaskProperties from "./TaskProperties";
import TaskStatusConfiguration from "../TaskStatusConfiguration/TaskStatusConfiguration";
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

const taskFields: Record<string, string> = {
  name: "task-name", description: "task-description", state_code: "task-initial-state",
  due_date: "task-due", priority: "task-priority", responsible_id: "task-responsible",
  reason: "task-reason", labels: "task-labels", requirement_ids: "task-labels",
};

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
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const form = useRef<HTMLFormElement>(null);
  const pendingFocus = useRef(false);
  const canAssign = project.permissions.manage && (!task || task.permissions.assign);
  const canConfigure = project.permissions.manage && project.task_states.can_configure;
  const lastDate = parent?.due_date ?? project.end_date;

  useLayoutEffect(() => {
    if (busy || !pendingFocus.current) return;
    pendingFocus.current = false;
    const invalid = form.current?.querySelector<HTMLElement>('[aria-invalid="true"]:not(:disabled)');
    (invalid ?? form.current?.querySelector<HTMLElement>('[data-general-error]'))?.focus();
  }, [fieldErrors, error, busy]);

  function clearError(id: string) {
    setFieldErrors((current) => Object.fromEntries(Object.entries(current).filter(([field]) => field !== id)));
  }

  function fieldError(id: string) {
    return fieldErrors[id] ? <p id={`${id}-error`} className={styles.fieldError} role="alert">{fieldErrors[id]}</p> : null;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    pendingFocus.current = true;
    setError("");
    const invalid: FieldErrors = {};
    if (!name.trim()) invalid["task-name"] = "Indica el nombre de la tarea.";
    if (!dueDate) invalid["task-due"] = "Indica la fecha límite.";
    else if ((project.start_date && dueDate < project.start_date) || (lastDate && dueDate > lastDate))
      invalid["task-due"] = "La fecha límite debe quedar dentro del periodo permitido.";
    if (!catalogs.priorities.some((item) => item.code === priority)) invalid["task-priority"] = "Selecciona una prioridad del catálogo.";
    if (!task && ["BLOQUEADA", "CANCELADA"].includes(stateCode) && !reason.trim()) invalid["task-reason"] = "Indica un motivo para este estado.";
    if (Object.keys(invalid).length > 0) { setFieldErrors(invalid); return; }
    setBusy(true);
    setError("");
    setFieldErrors({});
    const data: EditTaskPayload = {
      name: name.trim(), priority, due_date: dueDate, requirement_ids: requirementIds, labels,
    };
    if (!task || project.permissions.manage) data.description = description.trim();
    if (canAssign) data.responsible_id = responsible ? Number(responsible) : null;
    try {
      await onSubmit(task ? data : {
        ...data, state_code: stateCode, parent_id: parent?.id ?? null, reason: reason.trim(),
      });
    } catch (failure) {
      const fields = apiFieldErrors(failure, taskFields);
      setFieldErrors(fields);
      setError(Object.keys(fields).length ? "" : errorText(failure));
    }
    finally { setBusy(false); }
  }

  function configured(configuration: ProjectTaskConfiguration) {
    if (!configuration.states.some((state) => state.code === stateCode)) setStateCode("PENDIENTE");
    onConfigured(configuration);
  }

  return (
    <>
      <form ref={form} className={styles.form} noValidate autoComplete="off" aria-busy={busy} onSubmit={submit}>
        <div className={styles.body}>
          <fieldset className={styles.fields} disabled={busy}>
            <p className={styles.context}>{project.name}{parent && ` · Subtarea de ${parent.name}`}</p>
            <div className={styles.titleField}>
              <label className={styles.srOnly} htmlFor="task-name">Nombre de tarea obligatorio</label>
              <input id="task-name" name="name" data-initial-focus className={styles.name} required maxLength={180} value={name}
                aria-invalid={Boolean(fieldErrors["task-name"])} aria-describedby={fieldErrors["task-name"] ? "task-name-error" : undefined}
                placeholder="Nombre de tarea…" onChange={(event) => { setName(event.target.value); clearError("task-name"); }} />
              {fieldError("task-name")}
            </div>
            <div className={styles.descriptionField}>
              <label className={styles.srOnly} htmlFor="task-description">Descripción (opcional)</label>
              <textarea id="task-description" name="description" rows={3} maxLength={10000} value={description}
                aria-invalid={Boolean(fieldErrors["task-description"])} aria-describedby={fieldErrors["task-description"] ? "task-description-error" : undefined}
                readOnly={Boolean(task && !project.permissions.manage)}
                placeholder="Añade una descripción (opcional)…"
                onChange={(event) => { setDescription(event.target.value); clearError("task-description"); }} />
              {fieldError("task-description")}
            </div>
            <TaskProperties project={project} catalogs={catalogs} task={task} parent={parent}
              stateCode={stateCode} responsible={responsible} dueDate={dueDate} priority={priority}
              labels={labels} errors={fieldErrors} onConfigure={() => setConfiguring(true)}
              onState={(value) => { setStateCode(value); clearError("task-initial-state"); }}
              onResponsible={(value) => { setResponsible(value); clearError("task-responsible"); }}
              onDate={(value) => { setDueDate(value); clearError("task-due"); }}
              onPriority={(value) => { setPriority(value); clearError("task-priority"); }}
              onLabels={(value) => { setLabels(value); clearError("task-labels"); }} />
            {labels.length > 0 && <div className={styles.labels} aria-label="Etiquetas seleccionadas">
              <LabelList labels={labels} onRemove={(index) => { setLabels((current) => current.filter((_, position) => position !== index)); clearError("task-labels"); }} />
            </div>}
            {!task && !canAssign && <p className={styles.metadata}>
              Se creará pendiente y asignada a ti.
            </p>}
            {canAssign && project.participants.length === 0 && <p className={styles.metadata}>
              Sin participantes elegibles. Puedes crearla pendiente y asignarla posteriormente.
            </p>}
            {!task && ["BLOQUEADA", "CANCELADA"].includes(stateCode) && (
              <div className={styles.reasonField}>
                <label htmlFor="task-reason">Motivo obligatorio</label>
                <input id="task-reason" name="reason" required maxLength={500} value={reason}
                  aria-invalid={Boolean(fieldErrors["task-reason"])} aria-describedby={fieldErrors["task-reason"] ? "task-reason-error" : undefined}
                  onChange={(event) => { setReason(event.target.value); clearError("task-reason"); }} />
                {fieldError("task-reason")}
              </div>
            )}
          </fieldset>
        </div>
        <footer className={styles.footer}>
          {error && <p className={styles.generalError} role="alert" tabIndex={-1} data-general-error>{error}</p>}
          <div className={styles.footerRow}>
            <p className={styles.metadata}>{task
              ? `Creada el ${new Date(task.created_at).toLocaleString("es-PE")}`
              : "La fecha de creación se registra al guardar."}</p>
            <div className={styles.actions}>
              <button type="button" className={styles.cancel} disabled={busy} onClick={onClose}>Cancelar</button>
              <button type="submit" className="primary-button" disabled={busy}>
                {busy ? "Guardando…" : task ? "Guardar cambios" : parent ? "Crear subtarea" : "Crear tarea"}
              </button>
            </div>
          </div>
        </footer>
      </form>
      {configuring && canConfigure && <TaskStatusConfiguration project={project} onConfigured={configured} onClose={() => setConfiguring(false)} />}
    </>
  );
}
