import { useId, useRef, useState } from "react";
import { errorText } from "../../auth/api";
import type {
  EditTaskPayload,
  Project,
  ProjectCatalogs,
  Task,
  TaskStatePayload,
} from "../types";
import TaskProperty from "../TaskForm/TaskProperty";
import TaskIcon from "../TaskForm/TaskIcon";
import type { TaskIconName } from "../TaskForm/TaskIcon";
import { Calendar } from "../CreateProjectModal/ProjectEndDateSelector";
import { groupTaskStates } from "../stateGroups";
import { formatTaskDate, initials } from "./taskHierarchy";
import { taskAssignees } from "../taskAssignees";

const styles = {
  // Keep the module's full-width badge override above TaskProperty's span limit.
  state: String.raw`inline-flex items-center gap-1 max-w-full! py-[3px] px-1.5 rounded-[5px] bg-[#edf0f1] text-[#46545a] text-[0.6875rem] truncate data-[state=EN\_CURSO]:bg-[#e3f1ff] data-[state=EN\_CURSO]:text-[#0861a9] data-[state=COMPLETADA]:bg-[#e4f3eb] data-[state=COMPLETADA]:text-[#17663e] data-[state=CANCELADA]:bg-[#fce9e8] data-[state=CANCELADA]:text-[#a42a28] data-[state=BLOQUEADA]:bg-[#fce9e8] data-[state=BLOQUEADA]:text-[#a42a28] data-[state=EN\_REVISION]:bg-[#f4edff] data-[state=EN\_REVISION]:text-[#6b3899] data-[state=OBSERVADA]:bg-[#f4edff] data-[state=OBSERVADA]:text-[#6b3899]`,
  editor:
    "grid gap-2.5 [&_fieldset]:min-w-0 [&_fieldset]:m-0 [&_fieldset]:p-0 [&_fieldset]:[border:0] [&_textarea]:w-full [&_textarea]:p-2 [&_textarea]:[border:1px_solid_var(--color-border)] [&_textarea]:[border-radius:var(--radius-small)] [&_textarea]:resize-y",
  options:
    "max-h-60 overflow-y-auto [&_h3]:mt-3 [&_h3]:mx-1.5 [&_h3]:mb-[5px] [&_h3]:[color:var(--color-text-muted)] [&_h3]:text-[0.75rem] [&_h3]:font-normal",
  option:
    "flex items-center gap-2 w-full min-h-9 my-0.5 mx-0 py-[7px] px-2 [border:0] [border-radius:var(--radius-small)] [background:var(--color-surface)] [color:var(--color-text)] text-left text-[0.8125rem] cursor-pointer hover:[background:var(--color-hover)] aria-pressed:[background:var(--color-brand-soft)] aria-pressed:[@media(pointer:coarse)]:min-h-11",
  check: "ml-auto",
  avatar:
    "inline-grid place-items-center flex-[0_0_26px] size-[26px] [border-radius:50%] [background:var(--color-heading)] text-white text-[0.625rem] font-semibold",
  priority:
    "inline-flex items-center gap-1.5 [&[data-priority='1']_svg]:text-[#be2937] [&[data-priority='1']_svg]:fill-[#be2937] [&[data-priority='2']_svg]:text-[#a66a08] [&[data-priority='2']_svg]:fill-[#e8b44a] [&[data-priority='3']_svg]:text-[#4267c5] [&[data-priority='3']_svg]:fill-[#4267c5] [&[data-priority='4']_svg]:text-[#707b80] [&[data-priority='4']_svg]:fill-[#c3c9cc]",
  editorActions:
    "flex justify-end gap-2 pt-2.5 [border-top:1px_solid_var(--color-border-light)] [&_button]:min-h-[34px] [&_button]:py-1.5 [&_button]:px-3 [&_button]:text-[0.8125rem] [&_button]:[border-radius:var(--radius-small)] [&_button]:cursor-pointer [&_button:not(.primary-button)]:[background:var(--color-surface)] [&_button:not(.primary-button)]:[color:var(--color-text)] [&_button:not(.primary-button)]:[border:1px_solid_var(--color-border)]",
  error: "m-0 text-red-700 text-[0.75rem] [overflow-wrap:anywhere]",
};

type Field =
  | "state_code"
  | "priority"
  | "responsible_id"
  | "start_date"
  | "due_date";
export interface TaskChanges {
  onPatch: (task: Task, data: Partial<EditTaskPayload>) => Promise<void>;
  onState: (task: Task, data: TaskStatePayload) => Promise<void>;
}
interface TaskCellProps extends TaskChanges {
  field: Field;
  task: Task;
  project: Project;
  catalogs: ProjectCatalogs;
  parent?: Task;
}
const labels: Record<Field, string> = {
  state_code: "Estado",
  priority: "Prioridad",
  responsible_id: "Persona asignada",
  start_date: "Fecha de inicio",
  due_date: "Fecha límite",
};
const icons: Record<Field, TaskIconName> = {
  state_code: "state",
  priority: "priority",
  responsible_id: "person",
  start_date: "date",
  due_date: "date",
};

export function StateLabel({ code, name }: { code: string; name: string }) {
  return (
    <span className={styles.state} data-state={code}>
      <TaskIcon name={code === "COMPLETADA" ? "check" : "state"} />
      {name}
    </span>
  );
}

export function PriorityLabel({ priority, name }: { priority?: number; name: string }) {
  return <span className={styles.priority} data-priority={priority}>
    <TaskIcon name="priority" />{name}
  </span>;
}

function Editor({
  field,
  task,
  project,
  catalogs,
  parent,
  onPatch,
  onState,
  close,
}: TaskCellProps & { close: () => void }) {
  const [value, setValue] = useState(String(task[field] ?? ""));
  const [responsibles, setResponsibles] = useState(() => field === "responsible_id" ? taskAssignees(task).map((person) => person.id) : []);
  const [search, setSearch] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const id = useId();
  const reasonInput = useRef<HTMLTextAreaElement>(null);
  const errorMessage = useRef<HTMLParagraphElement>(null);
  const requiresReason =
    field === "state_code" &&
    Boolean(
      task.transitions.find((item) => item.target === value)?.reason_required,
    );
  const isDate = field === "start_date" || field === "due_date";
  const matches = (name: string) =>
    name
      .toLocaleLowerCase("es")
      .includes(search.trim().toLocaleLowerCase("es"));
  const states = project.task_states.states.filter(
    (state) =>
      matches(state.name) &&
      (state.code === task.state_code ||
        task.transitions.some((item) => item.target === state.code)),
  );
  const participants = project.participants.filter((person) =>
    matches(person.name),
  );

  async function save() {
    if (busy) return;
    if (requiresReason && !reason.trim()) {
      setError("Indica el motivo del cambio.");
      reasonInput.current?.focus();
      return;
    }
    setBusy(true);
    setError("");
    try {
      if (field === "state_code")
        await onState(task, { state_code: value, reason: reason.trim() });
      else if (field === "responsible_id")
        await onPatch(task, { responsible_ids: responsibles });
      else
        await onPatch(task, {
          [field]:
            field === "priority"
              ? Number(value)
              : value,
        });
      close();
    } catch (failure) {
      setError(errorText(failure));
      requestAnimationFrame(() => errorMessage.current?.focus());
    } finally {
      setBusy(false);
    }
  }
  function option(key: string, name: string, content = <>{name}</>) {
    const selected = field === "responsible_id" ? (key === "" ? responsibles.length === 0 : responsibles.includes(Number(key))) : value === key;
    return (
      <button
        type="button"
        key={key}
        className={styles.option}
        aria-pressed={selected}
        onClick={() => {
          if (field === "responsible_id") setResponsibles((current) => key === "" ? [] : current.includes(Number(key)) ? current.filter((id) => id !== Number(key)) : [...current, Number(key)]);
          else setValue(key);
          setError("");
        }}
      >
        {content}
        <span className={styles.check}>
          {selected && <TaskIcon name="check" />}
        </span>
      </button>
    );
  }
  return (
    <div className={styles.editor} aria-busy={busy}>
      <fieldset disabled={busy}>
        {(field === "state_code" || field === "responsible_id") && (
          <>
            <label htmlFor={`${id}-search`}>
              {field === "state_code" ? "Buscar estado" : "Buscar por nombre"}
            </label>
            <input
              id={`${id}-search`}
              name="search"
              type="search"
              autoComplete="off"
              placeholder="Buscar…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </>
        )}
        <div className={styles.options}>
          {field === "state_code" &&
            groupTaskStates(states).map((group) => (
              <section key={group.label}>
                <h3>{group.label}</h3>
                {group.states.map((state) =>
                  option(
                    state.code,
                    state.name,
                    <StateLabel code={state.code} name={state.name} />,
                  ),
                )}
              </section>
            ))}
          {field === "state_code" && states.length === 0 && (
            <p role="status">No hay estados que coincidan.</p>
          )}
          {field === "priority" &&
            catalogs.priorities.map((priority) =>
              option(
                String(priority.code),
                priority.name,
                <PriorityLabel priority={priority.code} name={priority.name} />,
              ),
            )}
          {field === "responsible_id" && (
            <>
              {option("", "Sin responsable")}
              {participants.map((person) =>
                option(
                  String(person.id),
                  person.name,
                  <>
                    <span className={styles.avatar} aria-hidden="true">
                      {initials(person.name)}
                    </span>
                    <span>{person.name}</span>
                  </>,
                ),
              )}
              {participants.length === 0 && (
                <p role="status">
                  No hay participantes elegibles que coincidan.
                </p>
              )}
            </>
          )}
        </div>
        {isDate && (
          <Calendar
            value={value}
            label={labels[field]}
            optional={false}
            min={
              field === "due_date"
                ? task.start_date
                : (parent?.start_date ?? project.start_date ?? undefined)
            }
            max={
              field === "start_date"
                ? task.due_date
                : (parent?.due_date ?? project.end_date ?? undefined)
            }
            onChange={(next) => {
              setValue(next);
              setError("");
            }}
            close={() => undefined}
          />
        )}
        {field === "state_code" && value !== task.state_code && (
          <>
            <label htmlFor={`${id}-reason`}>
              Motivo {requiresReason ? "obligatorio" : "(opcional)"}
            </label>
            <textarea
              ref={reasonInput}
              id={`${id}-reason`}
              name="reason"
              maxLength={500}
              rows={2}
              value={reason}
              required={requiresReason}
              aria-invalid={Boolean(requiresReason && error && !reason.trim())}
              aria-describedby={error ? `${id}-error` : undefined}
              onChange={(event) => {
                setReason(event.target.value);
                setError("");
              }}
            />
          </>
        )}
      </fieldset>
      {error && (
        <p
          ref={errorMessage}
          tabIndex={-1}
          id={`${id}-error`}
          className={styles.error}
          role="alert"
        >
          {error}
        </p>
      )}
      <div className={styles.editorActions}>
        <button type="button" disabled={busy} onClick={close}>
          Cancelar
        </button>
        <button
          type="button"
          className="primary-button"
          disabled={busy || (field === "responsible_id" ? JSON.stringify([...responsibles].sort((a, b) => a - b)) === JSON.stringify(taskAssignees(task).map((person) => person.id)) : value === String(task[field] ?? ""))}
          onClick={() => {
            void save();
          }}
        >
          {busy ? "Guardando…" : error ? "Reintentar" : "Guardar"}
        </button>
      </div>
    </div>
  );
}

export default function TaskCell(props: TaskCellProps) {
  const { field, task, catalogs } = props;
  const instanceId = useId();
  const people = field === "responsible_id" ? taskAssignees(task) : [];
  const permitted =
    field === "state_code"
      ? task.permissions.state && task.transitions.length > 0
      : field === "responsible_id"
        ? task.permissions.assign
        : task.permissions.edit;
  const value =
    field === "state_code"
      ? task.state_name
      : field === "responsible_id"
        ? (people.map((person) => person.name).join(", ") || "Sin persona asignada")
        : field === "priority"
          ? (task.priority == null ? "Sin prioridad" : catalogs.priorities.find((item) => item.code === task.priority)
              ?.name ?? String(task.priority))
          : formatTaskDate(task[field]);
  const content =
    field === "state_code" ? (
      <StateLabel code={task.state_code} name={value} />
    ) : field === "responsible_id" && people.length > 0 ? (
      <>
        <span className={styles.avatar} aria-hidden="true">
          {initials(people[0].name)}
        </span>
        {people.length > 1 && <span aria-hidden="true" className="text-[10px] text-neutral-600">+{people.length - 1}</span>}
        <span>{value}</span>
      </>
    ) : field === "priority" ? (
      <PriorityLabel priority={task.priority} name={value} />
    ) : (
      <>
        <TaskIcon name={icons[field]} />
        <span>{value}</span>
      </>
    );
  return (
    <TaskProperty
      cell
      id={`${instanceId}-task-${task.id}-${field}`}
      label={`${labels[field]} · ${task.name}`}
      value={value}
      icon={icons[field]}
      disabled={!permitted}
      content={content}
    >
      {(close) => <Editor {...props} close={close} />}
    </TaskProperty>
  );
}
