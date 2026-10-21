import { useId, useRef, useState } from "react";
import { avatarFor } from "../../../shared/avatar";
import { errorText } from "../../auth/api";
import { Calendar } from "../CreateProjectModal/ProjectEndDateSelector";
import LabelEditor from "../LabelEditor/LabelEditor";
import { labelSelection } from "../labelSelection";
import AssigneeSelector from "../ResponsiblePicker/AssigneeSelector";
import { groupTaskStates } from "../stateGroups";
import { taskAssignees } from "../taskAssignees";
import PriorityOptions from "../TaskForm/PriorityOptions";
import { isPastTaskDate } from "../TaskForm/taskDates";
import TaskDateValue from "../TaskForm/TaskDateValue";
import type { TaskIconName } from "../TaskForm/TaskIcon";
import TaskIcon from "../TaskForm/TaskIcon";
import TaskProperty from "../TaskForm/TaskProperty";
import type {
  EditTaskPayload,
  Label,
  Project,
  ProjectCatalogs,
  ProjectTaskState,
  Task,
  TaskStatePayload,
} from "../types";
import { stateInk } from "./stateInk";
import { formatTaskDate } from "./taskHierarchy";

const styles = {
  // Keep the module's full-width badge override above TaskProperty's span limit.
  state: String.raw`inline-flex items-center gap-1 max-w-full! py-[3px] px-1.5 rounded-[5px] bg-[#edf0f1] text-[#46545a] text-[0.6875rem] truncate data-[state=EN\_CURSO]:bg-[#e3f1ff] data-[state=EN\_CURSO]:text-[#0861a9] data-[state=COMPLETADA]:bg-[#e4f3eb] data-[state=COMPLETADA]:text-[#17663e] data-[state=CANCELADA]:bg-[#fce9e8] data-[state=CANCELADA]:text-[#a42a28] data-[state=BLOQUEADA]:bg-[#fce9e8] data-[state=BLOQUEADA]:text-[#a42a28] data-[state=EN\_REVISION]:bg-[#f4edff] data-[state=EN\_REVISION]:text-[#6b3899] data-[state=OBSERVADA]:bg-[#f4edff] data-[state=OBSERVADA]:text-[#6b3899]`,
  editor:
    "grid gap-2.5 [&_fieldset]:min-w-0 [&_fieldset]:m-0 [&_fieldset]:p-0 [&_fieldset]:[border:0] [&_textarea]:w-full [&_textarea]:p-2 [&_textarea]:border [&_textarea]:border-neutral-200 [&_textarea]:rounded-lg [&_textarea]:resize-y",
  options:
    "max-h-60 overflow-y-auto [&_h3]:mt-3 [&_h3]:mx-1.5 [&_h3]:mb-[5px] [&_h3]:text-neutral-600 [&_h3]:text-[0.75rem] [&_h3]:font-normal",
  option:
    "flex items-center gap-2 w-full min-h-9 my-0.5 mx-0 py-[7px] px-2 [border:0] rounded-lg bg-white text-neutral-800 text-left text-[0.8125rem] cursor-pointer hover:bg-neutral-100 aria-pressed:bg-neutral-100 aria-pressed:[@media(pointer:coarse)]:min-h-11",
  check: "ml-auto",
  avatar:
    "inline-grid place-items-center flex-[0_0_26px] size-[26px] rounded-full bg-sky-700 text-white text-[0.625rem] font-semibold",
  priority:
    "inline-flex items-center gap-1.5 [&[data-priority='1']_svg]:text-[#be2937] [&[data-priority='1']_svg]:fill-[#be2937] [&[data-priority='2']_svg]:text-[#a66a08] [&[data-priority='2']_svg]:fill-[#e8b44a] [&[data-priority='3']_svg]:text-[#4267c5] [&[data-priority='3']_svg]:fill-[#4267c5] [&[data-priority='4']_svg]:text-[#707b80] [&[data-priority='4']_svg]:fill-[#c3c9cc]",
  editorActions:
    "flex justify-end gap-2 pt-2.5 border-t border-neutral-200 [&_button]:min-h-[34px] [&_button]:py-1.5 [&_button]:px-3 [&_button]:text-[0.8125rem] [&_button]:rounded-lg [&_button]:cursor-pointer [&_button:not(.primary-button)]:bg-white [&_button:not(.primary-button)]:text-neutral-800 [&_button:not(.primary-button)]:border [&_button:not(.primary-button)]:border-neutral-200",
  error: "m-0 text-red-700 text-[0.75rem] [overflow-wrap:anywhere]",
};

type Field =
  | "state_code"
  | "priority"
  | "responsible_id"
  | "start_date"
  | "due_date"
  | "labels";
export interface TaskChanges {
  onPatch: (task: Task, data: Partial<EditTaskPayload>) => Promise<void>;
  onState: (task: Task, data: TaskStatePayload) => Promise<void>;
}
interface TaskCellProps extends TaskChanges {
  appearance?: "detail";
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
  labels: "Etiquetas",
};
const icons: Record<Field, TaskIconName> = {
  state_code: "state",
  priority: "priority",
  responsible_id: "person",
  start_date: "date",
  due_date: "date",
  labels: "labels",
};

export function StateLabel({ code, name, category, color }: ProjectTaskState) {
  return (
    <span
      className={`${styles.state} border border-neutral-200 font-medium`}
      data-state={code}
      style={
        color
          ? {
            backgroundColor: color,
            color: stateInk(color),
            borderColor: "#737373",
          }
          : undefined
      }
    >
      <span className="inline-flex shrink-0">
        <TaskIcon
          name={
            code !== "CANCELADA" &&
              (category === "closed" ||
                category === "done" ||
                (!category && code === "COMPLETADA"))
              ? "check"
              : "state"
          }
        />
      </span>
      {name}
    </span>
  );
}

export function PriorityLabel({
  priority,
  name,
}: {
  priority?: number | null;
  name: string;
}) {
  return (
    <span className={styles.priority} data-priority={priority}>
      <TaskIcon name="priority" />
      {name}
    </span>
  );
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
  const [responsibles, setResponsibles] = useState(() =>
    field === "responsible_id"
      ? taskAssignees(task).map((person) => person.id)
      : [],
  );
  const [search, setSearch] = useState("");
  const [taskLabels, setTaskLabels] = useState<Label[]>(task.labels);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const id = useId();
  const errorMessage = useRef<HTMLParagraphElement>(null);
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

  async function save() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      if (field === "state_code")
        await onState(task, { state_code: value, reason: "" });
      else if (field === "responsible_id")
        await onPatch(task, { responsible_ids: responsibles });
      else if (field === "labels") {
        await onPatch(task, labelSelection(taskLabels));
      }
      else
        await onPatch(task, {
          [field]:
            field === "priority"
              ? value
                ? Number(value)
                : null
              : value || null,
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
    const selected =
      field === "responsible_id"
        ? key === ""
          ? responsibles.length === 0
          : responsibles.includes(Number(key))
        : value === key;
    return (
      <button
        type="button"
        key={key}
        className={styles.option}
        aria-pressed={selected}
        onClick={() => {
          if (field === "responsible_id")
            setResponsibles((current) =>
              key === ""
                ? []
                : current.includes(Number(key))
                  ? current.filter((id) => id !== Number(key))
                  : [...current, Number(key)],
            );
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
        {field === "state_code" && (
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
        <div className={field === "responsible_id" ? undefined : styles.options}>
          {field === "labels" && <LabelEditor title="Etiquetas de la tarea" compact labels={taskLabels} onChange={setTaskLabels} specialties={catalogs.specialties} />}
          {field === "state_code" &&
            groupTaskStates(states).map((group) => (
              <section key={group.label}>
                <h3>{group.label}</h3>
                {group.states.map((state) =>
                  option(state.code, state.name, <StateLabel {...state} />),
                )}
              </section>
            ))}
          {field === "state_code" && states.length === 0 && (
            <p role="status">No hay estados que coincidan.</p>
          )}
          {field === "priority" && <PriorityOptions priorities={catalogs.priorities} value={value ? Number(value) : null}
            onChange={(next) => setValue(next === null ? "" : String(next))} />}
          {field === "responsible_id" && <AssigneeSelector project={project} value={responsibles} onChange={setResponsibles} />}
        </div>
        {isDate && (
          <Calendar
            value={value}
            label={labels[field]}
            optional={field === "due_date"}
            min={
              field === "due_date"
                ? task.start_date
                : (parent?.start_date ?? project.start_date ?? undefined)
            }
            max={
              field === "start_date"
                ? (task.due_date ?? undefined)
                : (parent?.due_date ?? project.end_date ?? undefined)
            }
            onChange={(next) => {
              setValue(next);
              setError("");
            }}
            close={() => undefined}
          />
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
          className="primary-button bg-neutral-800 font-medium text-white hover:bg-neutral-700"
          disabled={busy || (field === "labels" ? JSON.stringify(labelSelection(taskLabels)) === JSON.stringify(labelSelection(task.labels)) : field === "responsible_id" ? JSON.stringify([...responsibles].sort((a, b) => a - b)) === JSON.stringify(taskAssignees(task).map((person) => person.id)) : value === String(task[field] ?? ""))}
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
        ? people.map((person) => person.name).join(", ") ||
        "Sin persona asignada"
        : field === "priority"
          ? task.priority == null
            ? "Sin prioridad"
            : (catalogs.priorities.find((item) => item.code === task.priority)
              ?.name ?? String(task.priority))
          : field === "labels"
            ? `${task.labels.length} etiquetas`
            : formatTaskDate(task[field]);
  const content =
    field === "state_code" ? (
      <StateLabel
        code={task.state_code}
        name={value}
        category={task.state_category}
        color={task.state_color}
      />
    ) : field === "responsible_id" && people.length > 0 ? (
      <span className="flex min-w-0 flex-wrap items-center gap-1">
        {people.slice(0, 3).map((person) => <span key={person.id} title={person.name} className="inline-grid size-7 shrink-0 place-items-center rounded-full bg-sky-700 text-xs font-medium text-white" aria-hidden="true">{avatarFor(person.name)}</span>)}
        {people.length > 3 && <span className="text-xs text-neutral-700">+{people.length - 3}</span>}
      </span>
    ) : field === "responsible_id" && props.appearance !== "detail" ? (
      <TaskIcon name="person" />
    ) : field === "labels" ? (props.appearance === "detail" ? <span>{task.labels.length ? "Editar etiquetas" : permitted ? "Añadir etiquetas" : "Sin etiquetas"}</span> : <TaskIcon name="labels" />) : field === "priority" ? (
      <PriorityLabel priority={task.priority} name={value} />
    ) : (
      <>
        {props.appearance !== "detail" && <TaskIcon name={icons[field]} />}
        {field === "start_date" || field === "due_date" ? <TaskDateValue value={task[field]} /> : <span>{value}</span>}
      </>
    );
  return (
    <TaskProperty
      appearance={props.appearance ?? "list"}
      cell
      id={`${instanceId}-task-${task.id}-${field}`}
      label={`${props.appearance === "detail" ? labels[field] : `${labels[field]} · ${task.name}`}${(field === "start_date" || field === "due_date") && isPastTaskDate(task[field]) ? " · Fecha anterior a hoy" : ""}`}
      value={value}
      icon={icons[field]}
      disabled={!permitted}
      content={content}
      triggers={field === "responsible_id" && props.appearance === "detail" ? (people.length ? people.map((person) => ({
        label: person.name,
        content: <span className="inline-grid size-7 shrink-0 place-items-center rounded-full bg-sky-700 text-xs font-medium text-white" aria-hidden="true">{avatarFor(person.name)}</span>,
      })) : [{ label: "Asignar responsable", content: props.appearance === "detail" ? <span className="px-1 text-sm">{permitted ? "Asignar responsable" : "Sin persona asignada"}</span> : <TaskIcon name="person" /> }]) : undefined}
    >
      {(close) => <>{props.appearance === "detail" && !["start_date", "due_date", "labels"].includes(field) && <h3 className="m-0 mb-3 text-sm font-semibold">{labels[field]}</h3>}<Editor {...props} close={close} /></>}
    </TaskProperty>
  );
}
