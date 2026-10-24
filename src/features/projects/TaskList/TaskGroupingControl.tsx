import { useId } from "react";
import type { ComponentType } from "react";
import AlertIcon from "../../../shared/icons/AlertIcon";
import ChevronDownIcon from "../../../shared/icons/ChevronDownIcon";
import ClockIcon from "../../../shared/icons/ClockIcon";
import HashIcon from "../../../shared/icons/HashIcon";
import StackIcon from "../../../shared/icons/StackIcon";
import SuccessIcon from "../../../shared/icons/SuccessIcon";
import UserIcon from "../../../shared/icons/UserIcon";
import TaskProperty from "../TaskForm/TaskProperty";
import type { TaskGroupingMode, TaskGroupingPreferences } from "../types";

type GroupingIcon = ComponentType<{ className?: string }>;

const groupingOptions: {
  value: TaskGroupingMode;
  label: string;
  Icon: GroupingIcon;
}[] = [
  { value: "state", label: "Estado", Icon: StackIcon },
  { value: "assignees", label: "Persona asignada", Icon: UserIcon },
  { value: "priority", label: "Prioridad", Icon: AlertIcon },
  { value: "labels", label: "Etiquetas", Icon: HashIcon },
  { value: "due_date", label: "Fecha límite", Icon: ClockIcon },
];

export default function TaskGroupingControl({
  preferences,
  onChange,
}: {
  preferences: TaskGroupingPreferences;
  onChange: (next: TaskGroupingPreferences) => void;
}) {
  const id = useId();
  const selected =
    groupingOptions.find((option) => option.value === preferences.mode) ??
    groupingOptions[0];
  const SelectedIcon = selected.Icon;
  const separateKey =
    preferences.mode === "assignees" ? "separatePeople" : "separateLabels";
  const custom =
    preferences.mode === "assignees" || preferences.mode === "labels";
  return (
    <div className="min-w-0 [&_[popover]]:w-80 [&_[popover]]:rounded-xl [&_[popover]]:p-0">
      <TaskProperty
        id="task-list-grouping"
        label="Agrupar por"
        value={selected.label}
        compact
        appearance="toolbar"
        content={<StackIcon className="size-4" />}

      >
        {() => (
          <>
            <div className="flex flex-col gap-2 p-3 text-xs text-neutral-800">
              <span className="font-medium text-neutral-600">Agrupar por</span>
              <div className="grid min-w-0 grid-cols-[minmax(0,5fr)_minmax(0,3fr)] items-center gap-2">
                <div className="flex-1 min-w-0 [&>div>button]:w-full [&>div>button]:text-xs [&>div>button[aria-expanded=true]_.group-chevron]:rotate-180 [&>div>[popover]]:p-1">
                  <TaskProperty
                    id={`${id}-mode`}
                    label="Opciones de agrupación"
                    value={selected.label}
                    icon="settings"
                    content={
                      <>
                        <SelectedIcon className="size-4" />
                        <span className="min-w-0 flex-1 text-left">
                          {selected.label}
                        </span>
                        <ChevronDownIcon className="group-chevron ml-auto size-4 shrink-0" />
                      </>
                    }
                  >
                    {(close) => (
                      <div
                        role="menu"
                        aria-label="Agrupaciones"
                        onFocus={(event) => {
                          if (
                            !(event.relatedTarget instanceof Node) ||
                            !event.currentTarget.contains(event.relatedTarget)
                          )
                            event.currentTarget
                              .querySelector<HTMLButtonElement>(
                                '[aria-checked="true"]',
                              )
                              ?.focus();
                        }}
                        onKeyDown={(event) => {
                          if (
                            !["ArrowDown", "ArrowUp", "Home", "End"].includes(
                              event.key,
                            )
                          )
                            return;
                          event.preventDefault();
                          const options = Array.from(
                            event.currentTarget.querySelectorAll<HTMLButtonElement>(
                              '[role="menuitemradio"]',
                            ),
                          );
                          const index = options.indexOf(
                            document.activeElement as HTMLButtonElement,
                          );
                          const next =
                            event.key === "Home"
                              ? 0
                              : event.key === "End"
                                ? options.length - 1
                                : (index +
                                    (event.key === "ArrowDown" ? 1 : -1) +
                                    options.length) %
                                  options.length;
                          options[next]?.focus();
                        }}
                      >
                        {groupingOptions.map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            role="menuitemradio"
                            aria-checked={preferences.mode === option.value}
                            tabIndex={
                              preferences.mode === option.value ? 0 : -1
                            }
                            className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs text-neutral-700 hover:bg-neutral-100 aria-checked:bg-neutral-100 aria-checked:font-medium aria-checked:text-neutral-800"
                            onClick={() => {
                              onChange({ ...preferences, mode: option.value });
                              close();
                            }}
                          >
                            <option.Icon className="size-4" />
                            <span className="min-w-0 flex-1 truncate">
                              {option.label}
                            </span>
                            {preferences.mode === option.value ? (
                              <SuccessIcon className="size-4" />
                            ) : (
                              <span
                                className="size-4 shrink-0"
                                aria-hidden="true"
                              />
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </TaskProperty>
                </div>
                <label htmlFor={`${id}-order`} className="sr-only">
                  Orden de los grupos
                </label>
                <select
                  id={`${id}-order`}
                  name="task_group_order"
                  value={preferences.order}
                  title="Orden de los grupos; no cambia el orden de las tareas"
                  className="cursor-pointer rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-xs text-neutral-800 hover:bg-neutral-100 focus:border-neutral-400 focus:outline-none"
                  onChange={(event) =>
                    onChange({
                      ...preferences,
                      order: event.target.value === "desc" ? "desc" : "asc",
                    })
                  }
                >
                  <option value="asc">Ascendente</option>
                  <option value="desc">Descendente</option>
                </select>
              </div>
            </div>
            {custom && (
              <button
                type="button"
                role="switch"
                aria-checked={preferences[separateKey]}
                onClick={() =>
                  onChange({
                    ...preferences,
                    [separateKey]: !preferences[separateKey],
                  })
                }
                className="flex w-full cursor-pointer items-center justify-between gap-3 border-t border-neutral-200 px-3 py-2 text-left text-xs text-neutral-800 hover:bg-neutral-100"
              >
                <span>
                  {preferences.mode === "assignees"
                    ? "Una persona por grupo"
                    : "Una etiqueta por grupo"}
                </span>
                <span
                  aria-hidden="true"
                  className={`inline-flex w-8 shrink-0 rounded-full border p-0.5 ${preferences[separateKey] ? "border-neutral-800 bg-neutral-800" : "border-neutral-300 bg-neutral-200"}`}
                >
                  <span
                    className={`size-3 rounded-full bg-white ${preferences[separateKey] ? "translate-x-3.5" : ""}`}
                  />
                </span>
              </button>
            )}
          </>
        )}
      </TaskProperty>
    </div>
  );
}
