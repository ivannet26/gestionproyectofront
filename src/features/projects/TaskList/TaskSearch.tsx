import { useEffect, useId, useRef, useState } from "react";
import SearchIcon from "../../../shared/icons/SearchIcon";
import XIcon from "../../../shared/icons/XIcon";
import Tooltip from "../../../shared/Tooltip";

const button = "inline-flex cursor-pointer touch-manipulation items-center justify-center rounded-lg p-1.5 text-neutral-700 hover:bg-neutral-200 hover:text-neutral-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-700 [@media(pointer:coarse)]:p-3.5";

export default function TaskSearch({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  const input = useRef<HTMLInputElement>(null), trigger = useRef<HTMLButtonElement>(null);
  const id = useId(), expanded = open || value !== "";
  useEffect(() => { if (open) input.current?.focus(); }, [open]);
  return <div className={`flex min-w-0 max-w-full items-center gap-1 ${expanded ? "w-44 sm:w-64" : ""}`}
    onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget) && !value) setOpen(false); }}
    onKeyDown={(event) => {
      if (event.key !== "Escape" || event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229) return;
      event.preventDefault(); event.stopPropagation(); onChange(""); setOpen(false); trigger.current?.focus();
    }}>
    <Tooltip label="Buscar tareas" disabled={expanded}>{(description) => <button ref={trigger} type="button" className={button}
      aria-label="Buscar tareas" aria-describedby={description} aria-expanded={expanded} aria-controls={expanded ? id : undefined}
      onClick={() => { setOpen(true); input.current?.focus(); }}><span aria-hidden="true"><SearchIcon className="size-4" /></span></button>}</Tooltip>
    {expanded && <>
      <input ref={input} id={id} aria-label="Buscar tareas por nombre, responsable o etiqueta" type="search" name="task_search" placeholder="Buscar tareas…"
        autoComplete="off" value={value} onChange={(event) => onChange(event.target.value)}
        className="min-w-0 flex-1 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs text-neutral-800 placeholder:text-neutral-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-700 [&::-webkit-search-cancel-button]:hidden" />
      {value && <Tooltip label="Limpiar búsqueda">{(description) => <button type="button" className={button} aria-label="Limpiar búsqueda" aria-describedby={description}
        onClick={() => { onChange(""); setOpen(true); input.current?.focus(); }}><span aria-hidden="true"><XIcon className="size-4" /></span></button>}</Tooltip>}
    </>}
  </div>;
}
