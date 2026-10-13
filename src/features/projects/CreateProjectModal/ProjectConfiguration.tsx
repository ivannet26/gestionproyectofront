import { useId } from "react";
import type { ProjectDraft, WorkerCandidate } from "../types";
import type { FieldErrors } from "../formErrors";
import { formClasses as formStyles } from "../ProjectForm/formClasses";
const styles = {
  "summary": "grid gap-1 [overflow-wrap:anywhere] [&>strong]:text-base",
  "permission": "grid gap-1.5 border-y border-neutral-200 py-3.5 text-[13px]",
  "permissionHeading": "flex items-center justify-between gap-3",
  "switch": "h-8 w-12 shrink-0 rounded-md border-0 bg-neutral-300 px-1 py-1.5 aria-checked:bg-neutral-900 cursor-pointer [&>span]:block [&>span]:h-5 [&>span]:w-5 [&>span]:rounded-full [&>span]:bg-white [&[aria-checked=true]>span]:ml-auto focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-700",
  "modeContent": "grid items-start gap-4",
  "assigned": "sm:grid-cols-[1fr_1.3fr]",
  "workerPicker": "grid min-w-0 gap-2 text-[13px]",
  "search": "flex gap-2 [&>input]:min-w-0 [&>input]:flex-1",
  "results": "grid max-h-[138px] gap-2 overflow-y-auto overscroll-contain rounded-md border border-neutral-200 p-2.5 [&_p]:m-0 [&_p]:text-[13px] [&_label]:flex [&_label]:items-start [&_label]:gap-2 [&_label]:py-1 [&_label]:font-normal [&_input]:accent-neutral-900 [&_small]:mt-1 [&_small]:block [&_small]:text-xs [&_small]:text-neutral-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-700"
};

interface ProjectConfigurationProps {
  draft: ProjectDraft;
  onChange: (changes: Partial<ProjectDraft>) => void;
  areaName: string;
  workers: WorkerCandidate[];
  searching: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  onSearch: () => void;
  fieldErrors: FieldErrors;
  workerError: string;
}

export default function ProjectConfiguration({
  draft, onChange, areaName, workers, searching, search, onSearchChange, onSearch, fieldErrors, workerError,
}: ProjectConfigurationProps) {
  const permissionHint = useId();
  const workerLabel = useId();

  return (
    <>
      <div className={styles.summary}>
        <strong>{draft.name}</strong>
        <p className="m-0 text-xs leading-relaxed text-neutral-600">{areaName}</p>
      </div>
      <div className={styles.permission}>
        <div className={styles.permissionHeading}>
          <strong>Permiso de Trabajador</strong>
          <button id="project-permission" type="button" role="switch" aria-label="Permitir edición en el proyecto"
            aria-checked={draft.workerContribute} aria-invalid={Boolean(fieldErrors["project-permission"])}
            aria-describedby={`${permissionHint}${fieldErrors["project-permission"] ? " project-permission-error" : ""}`}
            className={styles.switch} onClick={() => onChange({ workerContribute: !draft.workerContribute })}>
            <span aria-hidden="true" />
          </button>
        </div>
        <strong>{draft.workerContribute ? "Edición" : "Solo lectura"}</strong>
        <p id={permissionHint} className="m-0 text-xs leading-relaxed text-neutral-600">
          {draft.workerContribute
            ? "Permite a participantes crear tareas propias y cambiar estados autorizados. No permite editar otros datos ni asignar responsables."
            : "Permite consultar la información autorizada, sin crear tareas ni cambiar estados."}
        </p>
        {fieldErrors["project-permission"] && <p id="project-permission-error" className={formStyles.fieldError}>{fieldErrors["project-permission"]}</p>}
      </div>
      <div className={`${styles.modeContent}${draft.mode === "assigned" ? ` ${styles.assigned}` : ""}`}>
        <fieldset id="project-mode" tabIndex={-1} className={formStyles.options}
          aria-invalid={Boolean(fieldErrors["project-mode"])}
          aria-describedby={fieldErrors["project-mode"] ? "project-mode-error" : undefined}>
          <legend>Modalidad</legend>
          <label>
            <input type="radio" name="project-mode" checked={draft.mode === "available"}
              onChange={() => onChange({ mode: "available" })} />
            <span>Publicar proyecto disponible
              <small>Visible para trabajadores autorizados del área seleccionada. Sin asignaciones automáticas.</small>
            </span>
          </label>
          <label>
            <input type="radio" name="project-mode" checked={draft.mode === "assigned"}
              onChange={() => onChange({ mode: "assigned" })} />
            <span>Crear proyecto con trabajadores asignados</span>
          </label>
          {fieldErrors["project-mode"] && <p id="project-mode-error" className={formStyles.fieldError} role="alert">{fieldErrors["project-mode"]}</p>}
        </fieldset>
        {draft.mode === "assigned" && (
          <div className={styles.workerPicker}>
            <label htmlFor="project-worker-search">Buscar trabajadores</label>
            <div className={styles.search}>
              <input id="project-worker-search" name="worker_search" type="search" value={search} maxLength={100}
                aria-invalid={Boolean(fieldErrors["project-worker-search"])}
                aria-describedby={fieldErrors["project-worker-search"] ? "project-worker-search-error" : undefined}
                placeholder="Buscar por nombre…" onChange={(event) => onSearchChange(event.target.value)}
                onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); if (!searching) onSearch(); } }} />
              <button type="button" className={formStyles.secondary} disabled={searching} onClick={onSearch}>Buscar</button>
            </div>
            {fieldErrors["project-worker-search"] && <p id="project-worker-search-error" className={formStyles.fieldError}>{fieldErrors["project-worker-search"]}</p>}
            {workerError && <p className={formStyles.fieldError} role="alert">{workerError} Vuelve a pulsar Buscar para reintentar.</p>}
            <strong id={workerLabel}>Trabajadores del área seleccionada</strong>
            <div className={styles.results} role="group" aria-labelledby={workerLabel} aria-busy={searching} tabIndex={0}>
              {searching ? <p role="status">Buscando trabajadores…</p> : !workerError && workers.length === 0
                ? <p>No se encontraron trabajadores elegibles.</p>
                : workers.map((worker) => (
                  <label key={worker.id}>
                    <input type="checkbox" checked={draft.workerIds.includes(worker.id)}
                      onChange={(event) => onChange({
                        workerIds: event.target.checked ? [...draft.workerIds, worker.id]
                          : draft.workerIds.filter((id) => id !== worker.id),
                      })} />
                    <span>{worker.name}<small>{worker.project_count} proyectos relacionados</small></span>
                  </label>
                ))}
            </div>
            <p className="m-0 text-xs leading-relaxed text-neutral-600" role="status">
              {draft.workerIds.length} seleccionados. Hasta 100 resultados; afina la búsqueda si hace falta.
            </p>
          </div>
        )}
      </div>
    </>
  );
}
