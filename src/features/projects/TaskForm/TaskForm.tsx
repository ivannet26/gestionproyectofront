import { useLayoutEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { errorText } from "../../auth/api";
import { apiFieldErrors } from "../formErrors";
import type { FieldErrors } from "../formErrors";
import type {
  EditTaskPayload,
  Label,
  Project,
  ProjectCatalogs,
  ProjectTaskConfiguration,
  Task,
  TaskFormPayload,
} from "../types";
import LabelList from "../LabelList/LabelList";
import TaskProperties from "./TaskProperties";
import TaskStatusConfiguration from "../TaskStatusConfiguration/TaskStatusConfiguration";
const styles = {
  form: "flex min-h-0 flex-col text-neutral-900 [&_[aria-invalid=true]]:border-red-700 [&_:focus-visible]:outline-2 [&_:focus-visible]:outline-offset-2 [&_:focus-visible]:outline-neutral-700",
  body: "min-h-0 overflow-y-auto overscroll-contain px-7 pb-7 pt-[22px] max-sm:p-4",
  fields: "m-0 grid min-w-0 gap-[18px] border-0 p-0",
  context:
    "m-0 text-xs leading-relaxed text-neutral-600 [overflow-wrap:anywhere]",
  titleField: "grid min-w-0 gap-1",
  descriptionField:
    "grid min-w-0 gap-1 [&_textarea]:w-full [&_textarea]:min-h-[88px] [&_textarea]:max-h-[180px] [&_textarea]:resize-y [&_textarea]:rounded-lg [&_textarea]:border [&_textarea]:border-transparent [&_textarea]:bg-white [&_textarea]:px-1 [&_textarea]:py-2 [&_textarea]:text-[15px] [&_textarea]:leading-relaxed [&_textarea]:placeholder:text-neutral-600 hover:[&_textarea]:border-neutral-200",
  reasonField:
    "grid min-w-0 gap-1 [&_label]:text-xs [&_label]:text-neutral-600 [&_input]:min-h-9 [&_input]:w-full [&_input]:rounded-lg [&_input]:border [&_input]:border-neutral-200 [&_input]:px-2 [&_input]:py-1.5 [&_input]:text-[13px]",
  name: "min-h-11 w-full rounded-lg border border-transparent border-b-neutral-200 bg-white px-1 py-2 text-[22px] leading-snug font-medium tracking-tight text-neutral-900 placeholder:text-neutral-600 hover:border-neutral-200",
  fieldError:
    "m-0 px-1 text-xs leading-relaxed text-red-700 [overflow-wrap:anywhere]",
  metadata:
    "m-0 text-[11px] leading-relaxed text-neutral-600 [overflow-wrap:anywhere]",
  labels: "min-w-0",
  footer:
    "shrink-0 border-t border-neutral-200 bg-white px-7 py-3.5 max-sm:px-4",
  footerRow: "flex items-center justify-between gap-3 max-sm:flex-wrap",
  actions: "flex shrink-0 items-center gap-2 max-sm:ml-auto",
  cancel:
    "min-h-9 rounded-lg border border-transparent bg-white px-3 py-2 text-[13px] text-neutral-600 hover:border-neutral-200 hover:bg-neutral-50 hover:text-neutral-900 cursor-pointer disabled:opacity-50",
  generalError:
    "mb-2.5 mt-0 text-[13px] leading-relaxed text-red-700 [overflow-wrap:anywhere]",
  srOnly: "sr-only",
};

interface TaskFormProps {
  project: Project;
  catalogs: ProjectCatalogs;
  task?: Task;
  parent?: Task;
  initialState?: string;
  onSubmit: (data: TaskFormPayload) => Promise<void>;
  onConfigured: (configuration: ProjectTaskConfiguration) => void;
  onClose: () => void;
}

const taskFields: Record<string, string> = {
  name: "task-name",
  description: "task-description",
  state_code: "task-initial-state",
  due_date: "task-due",
  priority: "task-priority",
  responsible_id: "task-responsible",
  reason: "task-reason",
  labels: "task-labels",
  requirement_ids: "task-labels",
};

export default function TaskForm({
  project,
  catalogs,
  task,
  parent,
  initialState,
  onSubmit,
  onConfigured,
  onClose,
}: TaskFormProps) {
  const [name, setName] = useState(task?.name ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [stateCode, setStateCode] = useState(initialState ?? "PENDIENTE");
  const [priority, setPriority] = useState(task?.priority ?? 3);
  const [dueDate, setDueDate] = useState(
    task?.due_date ?? parent?.due_date ?? project.end_date ?? "",
  );
  const [responsible, setResponsible] = useState(
    task?.responsible_id?.toString() ?? "",
  );
  const requirementIds =
    task?.labels.flatMap((label) =>
      label.requirement_id === null ? [] : [label.requirement_id],
    ) ?? [];
  const [labels, setLabels] = useState<Label[]>(
    task?.labels
      .filter((label) => label.requirement_id === null)
      .map(({ name, kind }) => ({ name, kind })) ?? [],
  );
  const [reason, setReason] = useState("");
  const [configuring, setConfiguring] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const form = useRef<HTMLFormElement>(null);
  const pendingFocus = useRef(false);
  const canAssign =
    project.permissions.manage && (!task || task.permissions.assign);
  const canConfigure =
    project.permissions.manage && project.task_states.can_configure;
  const lastDate = parent?.due_date ?? project.end_date;

  useLayoutEffect(() => {
    if (busy || !pendingFocus.current) return;
    pendingFocus.current = false;
    const invalid = form.current?.querySelector<HTMLElement>(
      '[aria-invalid="true"]:not(:disabled)',
    );
    (
      invalid ??
      form.current?.querySelector<HTMLElement>("[data-general-error]")
    )?.focus();
  }, [fieldErrors, error, busy]);

  function clearError(id: string) {
    setFieldErrors((current) =>
      Object.fromEntries(
        Object.entries(current).filter(([field]) => field !== id),
      ),
    );
  }

  function fieldError(id: string) {
    return fieldErrors[id] ? (
      <p id={`${id}-error`} className={styles.fieldError} role="alert">
        {fieldErrors[id]}
      </p>
    ) : null;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    pendingFocus.current = true;
    setError("");
    const invalid: FieldErrors = {};
    if (!name.trim()) invalid["task-name"] = "Indica el nombre de la tarea.";
    if (!dueDate) invalid["task-due"] = "Indica la fecha límite.";
    else if (
      (project.start_date && dueDate < project.start_date) ||
      (lastDate && dueDate > lastDate)
    )
      invalid["task-due"] =
        "La fecha límite debe quedar dentro del periodo permitido.";
    if (!catalogs.priorities.some((item) => item.code === priority))
      invalid["task-priority"] = "Selecciona una prioridad del catálogo.";
    if (
      !task &&
      ["BLOQUEADA", "CANCELADA"].includes(stateCode) &&
      !reason.trim()
    )
      invalid["task-reason"] = "Indica un motivo para este estado.";
    if (Object.keys(invalid).length > 0) {
      setFieldErrors(invalid);
      return;
    }
    setBusy(true);
    setError("");
    setFieldErrors({});
    const data: EditTaskPayload = {
      name: name.trim(),
      priority,
      due_date: dueDate,
      requirement_ids: requirementIds,
      labels,
    };
    if (!task || project.permissions.manage)
      data.description = description.trim();
    if (canAssign)
      data.responsible_id = responsible ? Number(responsible) : null;
    try {
      await onSubmit(
        task
          ? data
          : {
              ...data,
              state_code: stateCode,
              parent_id: parent?.id ?? null,
              reason: reason.trim(),
            },
      );
    } catch (failure) {
      const fields = apiFieldErrors(failure, taskFields);
      setFieldErrors(fields);
      setError(Object.keys(fields).length ? "" : errorText(failure));
    } finally {
      setBusy(false);
    }
  }

  function configured(configuration: ProjectTaskConfiguration) {
    if (!configuration.states.some((state) => state.code === stateCode))
      setStateCode("PENDIENTE");
    onConfigured(configuration);
  }

  return (
    <>
      <form
        ref={form}
        className={styles.form}
        noValidate
        autoComplete="off"
        aria-busy={busy}
        onSubmit={submit}
      >
        <div className={styles.body}>
          <fieldset className={styles.fields} disabled={busy}>
            <p className={styles.context}>
              {project.name}
              {parent && ` · Subtarea de ${parent.name}`}
            </p>
            <div className={styles.titleField}>
              <label className={styles.srOnly} htmlFor="task-name">
                Nombre de tarea obligatorio
              </label>
              <input
                id="task-name"
                name="name"
                data-initial-focus
                className={styles.name}
                required
                maxLength={180}
                value={name}
                aria-invalid={Boolean(fieldErrors["task-name"])}
                aria-describedby={
                  fieldErrors["task-name"] ? "task-name-error" : undefined
                }
                placeholder="Nombre de tarea…"
                onChange={(event) => {
                  setName(event.target.value);
                  clearError("task-name");
                }}
              />
              {fieldError("task-name")}
            </div>
            <div className={styles.descriptionField}>
              <label className={styles.srOnly} htmlFor="task-description">
                Descripción (opcional)
              </label>
              <textarea
                id="task-description"
                name="description"
                rows={3}
                maxLength={10000}
                value={description}
                aria-invalid={Boolean(fieldErrors["task-description"])}
                aria-describedby={
                  fieldErrors["task-description"]
                    ? "task-description-error"
                    : undefined
                }
                readOnly={Boolean(task && !project.permissions.manage)}
                placeholder="Añade una descripción (opcional)…"
                onChange={(event) => {
                  setDescription(event.target.value);
                  clearError("task-description");
                }}
              />
              {fieldError("task-description")}
            </div>
            <TaskProperties
              project={project}
              catalogs={catalogs}
              task={task}
              parent={parent}
              stateCode={stateCode}
              responsible={responsible}
              dueDate={dueDate}
              priority={priority}
              labels={labels}
              errors={fieldErrors}
              onConfigure={() => setConfiguring(true)}
              onState={(value) => {
                setStateCode(value);
                clearError("task-initial-state");
              }}
              onResponsible={(value) => {
                setResponsible(value);
                clearError("task-responsible");
              }}
              onDate={(value) => {
                setDueDate(value);
                clearError("task-due");
              }}
              onPriority={(value) => {
                setPriority(value);
                clearError("task-priority");
              }}
              onLabels={(value) => {
                setLabels(value);
                clearError("task-labels");
              }}
            />
            {labels.length > 0 && (
              <div
                className={styles.labels}
                aria-label="Etiquetas seleccionadas"
              >
                <LabelList
                  labels={labels}
                  onRemove={(index) => {
                    setLabels((current) =>
                      current.filter((_, position) => position !== index),
                    );
                    clearError("task-labels");
                  }}
                />
              </div>
            )}
            {!task && !canAssign && (
              <p className={styles.metadata}>
                Se creará pendiente y asignada a ti.
              </p>
            )}
            {canAssign && project.participants.length === 0 && (
              <p className={styles.metadata}>
                Sin participantes elegibles. Puedes crearla pendiente y
                asignarla posteriormente.
              </p>
            )}
            {!task && ["BLOQUEADA", "CANCELADA"].includes(stateCode) && (
              <div className={styles.reasonField}>
                <label htmlFor="task-reason">Motivo obligatorio</label>
                <input
                  id="task-reason"
                  name="reason"
                  required
                  maxLength={500}
                  value={reason}
                  aria-invalid={Boolean(fieldErrors["task-reason"])}
                  aria-describedby={
                    fieldErrors["task-reason"] ? "task-reason-error" : undefined
                  }
                  onChange={(event) => {
                    setReason(event.target.value);
                    clearError("task-reason");
                  }}
                />
                {fieldError("task-reason")}
              </div>
            )}
          </fieldset>
        </div>
        <footer className={styles.footer}>
          {error && (
            <p
              className={styles.generalError}
              role="alert"
              tabIndex={-1}
              data-general-error
            >
              {error}
            </p>
          )}
          <div className={styles.footerRow}>
            <p className={styles.metadata}>
              {task
                ? `Creada el ${new Date(task.created_at).toLocaleString("es-PE")}`
                : "La fecha de creación se registra al guardar."}
            </p>
            <div className={styles.actions}>
              <button
                type="button"
                className={styles.cancel}
                disabled={busy}
                onClick={onClose}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="min-h-10 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-700"
                disabled={busy}
              >
                {busy
                  ? "Guardando…"
                  : task
                    ? "Guardar cambios"
                    : parent
                      ? "Crear subtarea"
                      : "Crear tarea"}
              </button>
            </div>
          </div>
        </footer>
      </form>
      {configuring && canConfigure && (
        <TaskStatusConfiguration
          project={project}
          onConfigured={configured}
          onClose={() => setConfiguring(false)}
        />
      )}
    </>
  );
}
