import { useEffect, useId, useLayoutEffect, useRef } from "react";
import type { Project, ProjectCatalogs, Task } from "../types";
import TaskOptionalProperties from "../TaskForm/TaskOptionalProperties";
import { useQuickTask } from "./useQuickTask";
import { useQuickTaskAlignment } from "./useQuickTaskAlignment";
import { StateLabel } from "./TaskCell";
import TaskIcon from "../TaskForm/TaskIcon";
import Tooltip from "../../../shared/Tooltip";

export default function QuickTaskRow({ project, catalogs, groupCode, onCreated, onClose, savingRef, onDetachedCreated }: {
  project: Project; catalogs: ProjectCatalogs; groupCode?: string; onCreated: (task: Task) => void;
  onClose: (returnFocus?: boolean) => void; savingRef?: { current: boolean };
  onDetachedCreated?: (task: Task) => void;
}) {
  const draft = useQuickTask(project, groupCode, onCreated, onDetachedCreated);
  const form = useRef<HTMLFormElement>(null);
  const name = useRef<HTMLInputElement>(null);
  const probe = useRef<HTMLSpanElement>(null);
  const pending = useRef(false);
  const composing = useRef(false);
  const insideEvents = useRef(new WeakSet<Event>());
  const id = useId();
  const alignmentState = project.task_states.states.find((state) => state.code === groupCode) ?? draft.state;
  const differentState = Boolean(groupCode && draft.state && draft.state.code !== groupCode);
  const stateHelp = `Se creará en ${draft.state?.name}. El grupo requiere datos adicionales para crear en su estado.`;
  useQuickTaskAlignment(form, probe);
  useEffect(() => {
    const outside = (event: PointerEvent) => {
      if (!pending.current && !insideEvents.current.has(event) &&
        event.target instanceof Node && !form.current?.contains(event.target)) onClose(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !event.defaultPrevented && !event.isComposing && !composing.current && !pending.current) {
        event.preventDefault();
        onClose(true);
      }
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [onClose]);
  const cancel = () => { if (!pending.current) onClose(true); };
  useLayoutEffect(() => { name.current?.focus(); }, []);
  useLayoutEffect(() => {
    if (!draft.busy && (draft.error || Object.keys(draft.errors).length)) {
      form.current?.querySelector<HTMLElement>('[aria-invalid="true"], [role="alert"]')?.focus();
    }
  }, [draft.busy, draft.errors, draft.error]);
  // React capture also reaches owned portals, unlike DOM contains().
  return <form ref={form} aria-label="Creación rápida de tarea" aria-busy={draft.busy} noValidate
    onPointerDownCapture={(event) => insideEvents.current.add(event.nativeEvent)}
    onCompositionStartCapture={() => { composing.current = true; }}
    onCompositionEndCapture={() => { composing.current = false; }}
    onKeyDownCapture={(event) => {
      if (event.nativeEvent.isComposing || composing.current || event.keyCode === 229) event.stopPropagation();
    }}
    onKeyDown={(event) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      event.preventDefault();
      event.stopPropagation();
      const panel = form.current?.querySelector<HTMLElement>(":popover-open");
      if (panel) {
        panel.hidePopover();
        document.getElementById(panel.dataset.returnFocus ?? "")?.focus();
      } else cancel();
    }}
    className="sticky left-0 grid w-[100cqw] max-w-full grid-cols-[minmax(0,1fr)_var(--quick-task-end-space,0.75rem)] border-b border-neutral-200 bg-neutral-50 py-2 pl-3 text-xs text-neutral-800"
    onSubmit={(event) => {
      event.preventDefault();
      if (pending.current || composing.current || form.current?.querySelector(':popover-open')) return;
      pending.current = true;
      if (savingRef) savingRef.current = true;
      void draft.save().then((saved) => { if (saved) onClose(true); }).finally(() => {
        pending.current = false;
        if (savingRef) savingRef.current = false;
      });
    }}>
    <fieldset disabled={draft.busy} className="col-start-1 row-start-1 m-0 flex min-w-0 flex-wrap items-center gap-2 border-0 p-0">
      <div className={`min-w-0 flex-[1_1_10rem] ${differentState ? "basis-full @[36rem]:basis-40" : ""}`}>
        <div className="flex min-w-0 items-center gap-2">
        <label htmlFor={`${id}-name`} className="sr-only">Nombre de la tarea</label>
        <input ref={name} id={`${id}-name`} name="name" autoComplete="off" maxLength={180}
          placeholder="Nombre de la tarea…" value={draft.name} onChange={(event) => draft.setName(event.target.value)}
          aria-invalid={Boolean(draft.errors["task-name"])} aria-describedby={draft.errors["task-name"] ? `${id}-error` : undefined}
          className="w-0 min-w-0 flex-1 border-0 border-b-2 border-transparent bg-transparent px-1 py-1.5 text-xs text-neutral-800 placeholder:text-neutral-600 focus-visible:border-neutral-700 focus-visible:outline-none! aria-invalid:border-red-700" />
        {differentState && <Tooltip label={stateHelp}>{(description) => <button type="button" aria-label={stateHelp} aria-describedby={description}
          className="inline-flex max-w-32 shrink-0 cursor-help items-center gap-1 rounded-lg border border-neutral-200 px-1.5 py-1 text-[10px] text-neutral-700 hover:bg-neutral-100">
          <TaskIcon name="state" /><span className="truncate">{draft.state?.name}</span>
        </button>}</Tooltip>}
        </div>
        {draft.errors["task-name"] && <p id={`${id}-error`} className="mt-1 text-red-700" role="alert">{draft.errors["task-name"]}</p>}
      </div>
      <TaskOptionalProperties compact project={project} catalogs={catalogs} responsible={draft.responsible} dueDate={draft.dueDate}
        priority={draft.priority} labels={draft.labels} errors={draft.errors} onResponsible={draft.setResponsible}
        onDate={draft.setDueDate} onPriority={draft.setPriority} onLabels={draft.setLabels} />
      <button type="button" onClick={cancel} className="cursor-pointer rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-neutral-700 hover:bg-neutral-100">Cancelar</button>
      <button type="submit" className="cursor-pointer rounded-lg bg-neutral-800 px-3 py-1.5 font-medium text-white hover:bg-neutral-700">{draft.busy ? "Guardando…" : "Guardar"}</button>
    </fieldset>
    <span ref={probe} aria-hidden="true" className="invisible pointer-events-none col-start-1 row-start-1 w-max max-w-36 justify-self-start self-center">
      {alignmentState && <StateLabel {...alignmentState} />}
    </span>
    {draft.error && <p tabIndex={-1} role="alert" className="col-start-1 mb-0 mt-1 break-words text-red-700">{draft.error}</p>}
  </form>;
}
