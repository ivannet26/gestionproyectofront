import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { errorText } from "../../auth/api";
import { createProject, getWorkerCandidates } from "../services";
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
  const workerRequest = useRef(0);
  const nameInput = useRef<HTMLInputElement>(null);
  const endInput = useRef<HTMLInputElement>(null);

  const loadWorkers = useCallback(async () => {
    if (step !== 2 || draft.mode !== "assigned") return;
    const request = ++workerRequest.current;
    setSearching(true);
    setWorkers([]);
    try {
      const result = await getWorkerCandidates(draft.areaIds, searchTerm);
      if (request === workerRequest.current) setWorkers(result);
    } catch (failure) {
      if (request === workerRequest.current) setError(errorText(failure));
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
  }

  function searchWorkers() {
    setError("");
    if (search === searchTerm) void loadWorkers();
    else setSearchTerm(search);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!draft.name.trim() || draft.areaIds.length === 0) {
      setError("Indica el nombre y al menos un área.");
      return;
    }
    if (step === 1) { setStep(2); return; }
    if (!draft.endDate) { setError("Indica la fecha de fin estimada."); return; }
    if (catalogs.creation_date && draft.endDate < catalogs.creation_date) {
      setError("La fecha de fin no puede ser anterior al inicio del proyecto.");
      return;
    }
    if (draft.mode === "assigned" && draft.workerIds.length === 0) {
      setError("Selecciona al menos un trabajador.");
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
    } catch (failure) { setError(errorText(failure)); }
    finally { setBusy(false); }
  }

  return (
    <Modal title={`Crear proyecto · Paso ${step} de 2`} onClose={onClose} busy={busy} wide>
      <ProjectForm busy={busy} error={error} compact onSubmit={submit} actions={
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
              <input id="project-name" ref={nameInput} value={draft.name} maxLength={180} required
                onChange={(event) => updateDraft({ name: event.target.value })} />
            </div>
            <div className={formStyles.field}>
              <label htmlFor="project-description">Descripción <span className="field-hint">(opcional)</span></label>
              <textarea id="project-description" rows={2} maxLength={10000} value={draft.description}
                onChange={(event) => updateDraft({ description: event.target.value })} />
            </div>
            <AreaSelector options={catalogs.areas} selected={draft.areaIds}
              onChange={(areaIds) => updateDraft({ areaIds })} />
          </>
        ) : (
          <ProjectConfiguration draft={draft} onChange={updateDraft} creationDate={catalogs.creation_date}
            endInput={endInput} workers={workers} searching={searching} search={search}
            onSearchChange={setSearch} onSearch={searchWorkers} />
        )}
      </ProjectForm>
    </Modal>
  );
}
