import { useId } from "react";
import type { Ref } from "react";
import type { ProjectDraft, WorkerCandidate } from "../types";
import { fieldClass, inputClass, labelClass, secondaryButtonClass } from "../ProjectForm/ProjectForm";

interface ProjectConfigurationProps {
  draft: ProjectDraft;
  onChange: (changes: Partial<ProjectDraft>) => void;
  creationDate?: string;
  endInput: Ref<HTMLInputElement>;
  workers: WorkerCandidate[];
  searching: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  onSearch: () => void;
}

export default function ProjectConfiguration({
  draft, onChange, creationDate, endInput, workers, searching, search, onSearchChange, onSearch,
}: ProjectConfigurationProps) {
  const permissionHint = useId();
  const dateHint = useId();
  const workerLabel = useId();

  return (
    <>
      <div className="grid gap-1">
        <strong className="text-base text-neutral-900">{draft.name}</strong>
        <p className="m-0 text-xs text-neutral-600 leading-relaxed">No se ha guardado ningún registro. Configura cómo crear el proyecto.</p>
      </div>
      <div className="grid grid-cols-1 gap-4 items-start sm:grid-cols-[0.9fr_1.1fr]">
        <div className={fieldClass}>
          <label htmlFor="project-end-date" className={labelClass}>Fecha de fin estimada *</label>
          <input id="project-end-date" ref={endInput} type="date" value={draft.endDate} required min={creationDate} aria-describedby={dateHint} className={inputClass}
            onChange={(event) => onChange({ endDate: event.target.value })} />
          <p id={dateHint} className="m-0 text-xs text-neutral-600 leading-relaxed">La fecha de inicio se establece automáticamente al crear el proyecto.</p>
        </div>
        <div className="grid gap-2 p-3 border border-neutral-200 shadow-none text-sm text-neutral-900">
          <div className="flex items-center justify-between gap-3">
            <strong className="text-sm text-neutral-900">Permiso de Trabajador</strong>
            <button type="button" role="switch" aria-label="Permitir edición en el proyecto"
              aria-checked={draft.workerContribute} aria-describedby={permissionHint}
              className={`flex-none w-11 h-6 p-[3px] border-0 cursor-pointer shadow-none ${draft.workerContribute ? "bg-neutral-900" : "bg-neutral-300"}`} onClick={() => onChange({ workerContribute: !draft.workerContribute })}>
              <span aria-hidden="true" className={`block w-[18px] h-[18px] bg-white ${draft.workerContribute ? "ml-auto" : ""}`} />
            </button>
          </div>
          <strong className="text-sm text-neutral-900">{draft.workerContribute ? "Edición" : "Solo lectura"}</strong>
          <p id={permissionHint} className="m-0 text-xs text-neutral-600 leading-relaxed">
            {draft.workerContribute
              ? "Permite a participantes crear tareas propias y cambiar estados autorizados. No permite editar otros datos ni asignar responsables."
              : "Permite consultar la información autorizada, sin crear tareas ni cambiar estados."}
          </p>
        </div>
      </div>
      <div className={`grid gap-4 items-start ${draft.mode === "assigned" ? "sm:grid-cols-[1fr_1.3fr]" : ""}`}>
        <fieldset className="grid gap-2.5 p-3.5 border border-neutral-200 shadow-none min-w-0">
          <legend className="text-sm font-semibold text-neutral-900">Modalidad</legend>
          <label className="flex items-start gap-2 text-sm text-neutral-900">
            <input type="radio" name="project-mode" checked={draft.mode === "available"} className="accent-neutral-900"
              onChange={() => onChange({ mode: "available" })} />
            <span>Publicar proyecto disponible
              <small className="block mt-1 text-xs text-neutral-600">Visible solo dentro del sistema para trabajadores autorizados de las áreas elegidas. Sin asignaciones automáticas.</small>
            </span>
          </label>
          <label className="flex items-start gap-2 text-sm text-neutral-900">
            <input type="radio" name="project-mode" checked={draft.mode === "assigned"} className="accent-neutral-900"
              onChange={() => onChange({ mode: "assigned" })} />
            <span>Crear proyecto con trabajadores asignados</span>
          </label>
        </fieldset>
        {draft.mode === "assigned" && (
          <div className="grid gap-2 min-w-0 text-sm text-neutral-900">
            <label htmlFor="project-worker-search" className={labelClass}>Buscar trabajadores</label>
            <div className="flex gap-2 max-sm:flex-col">
              <input id="project-worker-search" type="search" value={search} maxLength={100} className={`${inputClass} flex-1 min-w-0`}
                placeholder="Buscar por nombre" onChange={(event) => onSearchChange(event.target.value)}
                onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); if (!searching) onSearch(); } }} />
              <button type="button" className={secondaryButtonClass} disabled={searching} onClick={onSearch}>Buscar</button>
            </div>
            <strong id={workerLabel} className="text-sm text-neutral-900">Trabajadores de las áreas seleccionadas</strong>
            <div className="grid gap-2 max-h-[138px] overflow-y-auto p-2.5 border border-neutral-200 shadow-none" role="group" aria-labelledby={workerLabel} aria-busy={searching} tabIndex={0}>
              {searching ? <p role="status" className="m-0 text-sm text-neutral-600">Buscando trabajadores…</p> : workers.length === 0
                ? <p className="m-0 text-sm text-neutral-600">No se encontraron trabajadores elegibles.</p>
                : workers.map((worker) => (
                  <label key={worker.id} className="flex items-start gap-2 font-normal text-sm text-neutral-900">
                    <input type="checkbox" checked={draft.workerIds.includes(worker.id)} className="accent-neutral-900"
                      onChange={(event) => onChange({
                        workerIds: event.target.checked ? [...draft.workerIds, worker.id]
                          : draft.workerIds.filter((id) => id !== worker.id),
                      })} />
                    <span>{worker.name}<small className="block mt-1 text-xs text-neutral-600">{worker.project_count} proyectos relacionados</small></span>
                  </label>
                ))}
            </div>
            <p className="m-0 text-xs text-neutral-600 leading-relaxed" role="status">
              {draft.workerIds.length} seleccionados. Hasta 100 resultados; afina la búsqueda si hace falta.
            </p>
          </div>
        )}
      </div>
    </>
  );
}
