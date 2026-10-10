import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { errorText } from "../../auth/api";
import { createProject, getWorkerCandidates } from "../services";
import { apiFieldErrors } from "../formErrors";
import type { FieldErrors } from "../formErrors";
import type { Project, ProjectCatalogs, ProjectDraft, WorkerCandidate } from "../types";
import AreaSelector from "../AreaSelector/AreaSelector";
import Modal from "../Modal/Modal";
import ProjectForm from "../ProjectForm/ProjectForm";
import ProjectConfiguration from "./ProjectConfiguration";
import formStyles from "../ProjectForm/ProjectForm.module.css";

interface CreateProjectModalProps {
  catalogs: ProjectCatalogs;
  onClose: () => void;
  onCreated: (project: Project) => void;
}

const projectFields: Record<string, string> = {
  name: "project-name", description: "project-description", area_ids: "project-areas",
  end_date: "project-end-date", worker_ids: "project-worker-search", mode: "project-mode",
  worker_contribute: "project-permission",
};

export default function CreateProjectModal({ catalogs, onClose, onCreated }: CreateProjectModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [draft, setDraft] = useState<ProjectDraft>({
    name: "", description: "", endDate: "", areaIds: [], mode: "available",
    workerIds: [], workerContribute: false,
  });
  const [workers, setWorkers] = useState<WorkerCandidate[]>([]);
  const [search, setSearch] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [searching, setSearching] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [workerError, setWorkerError] = useState("");
  const workerRequest = useRef(0);
  const nameInput = useRef<HTMLInputElement>(null);
  const endInput = useRef<HTMLInputElement>(null);

  const loadWorkers = useCallback(async () => {
    if (step !== 2 || draft.mode !== "assigned") return;
    const request = ++workerRequest.current;
    setSearching(true);
    setWorkerError("");
    setWorkers([]);
    try {
      const result = await getWorkerCandidates(draft.areaIds, searchTerm);
      if (request === workerRequest.current) setWorkers(result);
    } catch (failure) {
      if (request === workerRequest.current) setWorkerError(errorText(failure));
    } finally {
      if (request === workerRequest.current) setSearching(false);
    }
  }, [draft.areaIds, draft.mode, searchTerm, step]);

  useEffect(() => {
    let current = true;
    void Promise.resolve().then(() => { if (current) void loadWorkers(); });
    return () => { current = false; workerRequest.current += 1; };
  }, [loadWorkers]);

  useEffect(() => { (step === 1 ? nameInput : endInput).current?.focus(); }, [step]);

  function updateDraft(changes: Partial<ProjectDraft>) {
    setDraft((current) => ({
      ...current, ...changes,
      workerIds: changes.areaIds ? [] : changes.workerIds ?? current.workerIds,
    }));
    const fields: Record<string, string> = { ...projectFields, areaIds: "project-areas",
      endDate: "project-end-date", workerIds: "project-worker-search", workerContribute: "project-permission" };
    setFieldErrors((current) => Object.fromEntries(Object.entries(current)
      .filter(([id]) => !Object.keys(changes).some((key) => fields[key] === id))));
  }

  function searchWorkers() {
    setError("");
    if (search === searchTerm) void loadWorkers();
    else setSearchTerm(search);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const invalid: FieldErrors = {};
    if (!draft.name.trim()) invalid["project-name"] = "Indica el nombre del proyecto.";
    if (draft.areaIds.length === 0) invalid["project-areas"] = "Selecciona al menos un área participante.";
    if (Object.keys(invalid).length > 0) {
      setFieldErrors(invalid);
      setStep(1);
      setError("Revisa los datos básicos del proyecto.");
      return;
    }
    setFieldErrors({});
    if (step === 1) { setStep(2); return; }
    if (!draft.endDate) invalid["project-end-date"] = "Indica la fecha de fin estimada.";
    else if (catalogs.creation_date && draft.endDate < catalogs.creation_date)
      invalid["project-end-date"] = "La fecha de fin no puede ser anterior al inicio del proyecto.";
    if (draft.mode === "assigned" && draft.workerIds.length === 0) {
      invalid["project-worker-search"] = "Selecciona al menos un trabajador.";
    }
    if (Object.keys(invalid).length > 0) {
      setFieldErrors(invalid);
      setError("Revisa la configuración antes de crear el proyecto.");
      return;
    }
    setBusy(true);
    try {
      const project = await createProject({
        name: draft.name.trim(), description: draft.description.trim(),
        end_date: draft.endDate, area_ids: draft.areaIds, mode: draft.mode,
        worker_ids: draft.mode === "assigned" ? draft.workerIds : [],
        worker_contribute: draft.workerContribute,
      });
      onCreated(project);
    } catch (failure) {
      const fields = apiFieldErrors(failure, projectFields);
      setFieldErrors(fields);
      if (["project-name", "project-description", "project-areas"].some((id) => fields[id])) setStep(1);
      setError(Object.keys(fields).length > 0 ? "Revisa los campos indicados por el servidor." : errorText(failure));
    }
    finally { setBusy(false); }
  }

  return (
    <Modal title={`Crear proyecto · Paso ${step} de 2`} onClose={onClose} busy={busy} wide>
      <ProjectForm busy={busy} error={error} fieldErrors={fieldErrors} manualValidation compact onSubmit={submit} actions={
        <>
          <button type="button" className={formStyles.secondary} disabled={busy} onClick={onClose}>Cancelar</button>
          {step === 2 && <button type="button" className={formStyles.secondary} disabled={busy}
            onClick={() => { setError(""); setStep(1); }}>Volver</button>}
          <button type="submit" className="primary-button"
            disabled={busy || catalogs.areas.length === 0 || (step === 2 && draft.mode === "assigned" && searching)}>
            {busy ? "Creando…" : step === 1 ? "Continuar" : draft.mode === "available"
              ? "Publicar dentro del sistema" : "Crear con asignados"}
          </button>
        </>
      }>
        {step === 1 ? (
          <>
            <div className={formStyles.field}>
              <label htmlFor="project-name">Nombre *</label>
              <input id="project-name" name="name" data-initial-focus ref={nameInput} value={draft.name} maxLength={180} required
                aria-invalid={Boolean(fieldErrors["project-name"])} aria-describedby={fieldErrors["project-name"] ? "project-name-error" : undefined}
                onChange={(event) => updateDraft({ name: event.target.value })} />
              {fieldErrors["project-name"] && <p id="project-name-error" className={formStyles.fieldError}>{fieldErrors["project-name"]}</p>}
            </div>
            <div className={formStyles.field}>
              <label htmlFor="project-description">Descripción <span className="field-hint">(opcional)</span></label>
              <textarea id="project-description" name="description" rows={2} maxLength={10000} value={draft.description}
                aria-invalid={Boolean(fieldErrors["project-description"])} aria-describedby={fieldErrors["project-description"] ? "project-description-error" : undefined}
                onChange={(event) => updateDraft({ description: event.target.value })} />
              {fieldErrors["project-description"] && <p id="project-description-error" className={formStyles.fieldError}>{fieldErrors["project-description"]}</p>}
            </div>
            <AreaSelector options={catalogs.areas} selected={draft.areaIds}
              error={fieldErrors["project-areas"]}
              onChange={(areaIds) => updateDraft({ areaIds })} />
          </>
        ) : (
          <ProjectConfiguration draft={draft} onChange={updateDraft} creationDate={catalogs.creation_date}
            fieldErrors={fieldErrors} workerError={workerError}
            endInput={endInput} workers={workers} searching={searching} search={search}
            onSearchChange={setSearch} onSearch={searchWorkers} />
        )}
      </ProjectForm>
    </Modal>
  );
}
