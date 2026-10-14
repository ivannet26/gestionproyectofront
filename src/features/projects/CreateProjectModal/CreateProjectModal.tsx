import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { errorText } from "../../auth/api";
import { createProject, getWorkerCandidates } from "../services";
import { apiFieldErrors } from "../formErrors";
import type { FieldErrors } from "../formErrors";
import type {
  Project,
  ProjectCatalogs,
  ProjectDraft,
  WorkerCandidate,
} from "../types";
import AreaSelector from "../AreaSelector/AreaSelector";
import Modal from "../Modal/Modal";
import ProjectConfiguration from "./ProjectConfiguration";
import ProjectEndDateSelector from "./ProjectEndDateSelector";
const formStyles = {
  form: "flex min-h-0 flex-col",
  body: "min-h-0 overflow-y-auto overscroll-contain px-6 py-5 max-sm:p-4",
  fields: "m-0 grid min-w-0 gap-[18px] border-0 p-0",
  field: "grid min-w-0 content-start gap-1.5",
  properties: "flex flex-wrap items-start gap-2",
  footer:
    "shrink-0 border-t border-neutral-200 bg-white px-6 py-3.5 max-sm:px-4",
  actions: "flex flex-wrap items-center justify-end gap-2",
  secondary:
    "min-h-10 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 hover:bg-neutral-50 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-700",
  fieldError:
    "m-0 text-xs leading-relaxed text-red-700 [overflow-wrap:anywhere]",
  generalError: "mb-2.5 mt-0 text-[13px] text-red-700 [overflow-wrap:anywhere]",
};

interface CreateProjectModalProps {
  catalogs: ProjectCatalogs;
  onClose: () => void;
  onCreated: (project: Project) => void;
}

const projectFields: Record<string, string> = {
  name: "project-name",
  description: "project-description",
  area_ids: "project-areas",
  end_date: "project-end-date",
  worker_ids: "project-worker-search",
  mode: "project-mode",
  worker_contribute: "project-permission",
};

export default function CreateProjectModal({
  catalogs,
  onClose,
  onCreated,
}: CreateProjectModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [draft, setDraft] = useState<ProjectDraft>({
    name: "",
    description: "",
    endDate: "",
    areaIds: [],
    mode: "available",
    workerIds: [],
    workerContribute: false,
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
  const form = useRef<HTMLFormElement>(null);
  const generalError = useRef<HTMLParagraphElement>(null);
  const focusRequested = useRef(false);
  const nameInput = useRef<HTMLInputElement>(null);

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
    void Promise.resolve().then(() => {
      if (current) void loadWorkers();
    });
    return () => {
      current = false;
      workerRequest.current += 1;
    };
  }, [loadWorkers]);

  useEffect(() => {
    if (step === 1) nameInput.current?.focus();
    else
      form.current?.querySelector<HTMLElement>("#project-permission")?.focus();
  }, [step]);

  useEffect(() => {
    if (busy || !focusRequested.current) return;
    focusRequested.current = false;
    const firstInvalid = form.current?.querySelector<HTMLElement>(
      '[aria-invalid="true"]',
    );
    if (firstInvalid) firstInvalid.focus();
    else if (error) generalError.current?.focus();
  }, [busy, error, fieldErrors, step]);

  function updateDraft(changes: Partial<ProjectDraft>) {
    setDraft((current) => ({
      ...current,
      ...changes,
      workerIds: changes.areaIds
        ? []
        : (changes.workerIds ?? current.workerIds),
    }));
    const fields: Record<string, string> = {
      ...projectFields,
      areaIds: "project-areas",
      endDate: "project-end-date",
      workerIds: "project-worker-search",
      workerContribute: "project-permission",
    };
    setFieldErrors((current) =>
      Object.fromEntries(
        Object.entries(current).filter(
          ([id]) => !Object.keys(changes).some((key) => fields[key] === id),
        ),
      ),
    );
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
    if (!draft.name.trim())
      invalid["project-name"] = "Indica el nombre del proyecto.";
    if (draft.areaIds.length !== 1)
      invalid["project-areas"] = "Selecciona un área.";
    if (draft.endDate && !/^\d{4}-\d{2}-\d{2}$/.test(draft.endDate))
      invalid["project-end-date"] = "Indica una fecha válida.";
    else if (
      draft.endDate &&
      catalogs.creation_date &&
      draft.endDate < catalogs.creation_date
    )
      invalid["project-end-date"] =
        "La fecha no puede preceder al inicio del proyecto.";
    if (Object.keys(invalid).length > 0) {
      focusRequested.current = true;
      setFieldErrors(invalid);
      setStep(1);
      return;
    }
    setFieldErrors({});
    if (step === 1) {
      setStep(2);
      return;
    }
    if (draft.mode === "assigned" && draft.workerIds.length === 0) {
      invalid["project-worker-search"] = "Selecciona al menos un trabajador.";
    }
    if (Object.keys(invalid).length > 0) {
      focusRequested.current = true;
      setFieldErrors(invalid);
      return;
    }
    setBusy(true);
    try {
      const project = await createProject({
        name: draft.name.trim(),
        description: draft.description.trim(),
        end_date: draft.endDate || null,
        area_ids: draft.areaIds,
        mode: draft.mode,
        worker_ids: draft.mode === "assigned" ? draft.workerIds : [],
        worker_contribute: draft.workerContribute,
      });
      onCreated(project);
    } catch (failure) {
      focusRequested.current = true;
      const fields = apiFieldErrors(failure, projectFields);
      setFieldErrors(fields);
      if (
        [
          "project-name",
          "project-description",
          "project-areas",
          "project-end-date",
        ].some((id) => fields[id])
      )
        setStep(1);
      setError(Object.keys(fields).length > 0 ? "" : errorText(failure));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      title={`Crear proyecto · Paso ${step} de 2`}
      onClose={onClose}
      busy={busy}
      projectComposer
    >
      <form
        ref={form}
        className={`${formStyles.form} [&_label]:text-[13px] [&_label]:[&_input:not([type=radio]):not([type=checkbox])]:min-h-10 [&_input:not([type=radio]):not([type=checkbox])]:w-full [&_input:not([type=radio]):not([type=checkbox])]:rounded-lg [&_input:not([type=radio]):not([type=checkbox])]:border [&_input]:border-neutral-200 [&_input:not([type=radio]):not([type=checkbox])]:px-3 [&_input:not([type=radio]):not([type=checkbox])]:py-2 [&_input]:text-sm [&_textarea]:min-h-[74px] [&_textarea]:w-full [&_textarea]:rounded-lg [&_textarea]:border [&_textarea]:border-neutral-200 [&_textarea]:px-3 [&_textarea]:py-2 [&_textarea]:text-sm [&_select]:w-full [&_select]:min-h-9 [&_select]:rounded-lg [&_select]:border [&_select]:border-neutral-200 [&_select]:px-2 [&_select]:py-1 [&_select]:text-sm [&_[aria-invalid=true]]:border-red-700 [&_:focus-visible]:outline-2 [&_:focus-visible]:outline-offset-2 [&_:focus-visible]:outline-neutral-700`}
        noValidate
        aria-busy={busy}
        onSubmit={submit}
      >
        <div className={formStyles.body}>
          <fieldset className={formStyles.fields} disabled={busy}>
            {step === 1 ? (
              <>
                <div className={formStyles.field}>
                  <label htmlFor="project-name">Nombre *</label>
                  <input
                    id="project-name"
                    name="name"
                    data-initial-focus
                    ref={nameInput}
                    value={draft.name}
                    maxLength={180}
                    required
                    aria-invalid={Boolean(fieldErrors["project-name"])}
                    aria-describedby={
                      fieldErrors["project-name"]
                        ? "project-name-error"
                        : undefined
                    }
                    onChange={(event) =>
                      updateDraft({ name: event.target.value })
                    }
                  />
                  {fieldErrors["project-name"] && (
                    <p
                      id="project-name-error"
                      className={formStyles.fieldError}
                      role="alert"
                    >
                      {fieldErrors["project-name"]}
                    </p>
                  )}
                </div>
                <div className={formStyles.field}>
                  <label htmlFor="project-description">
                    Descripción{" "}
                    <span className="m-0 text-xs leading-relaxed text-neutral-600">
                      (opcional)
                    </span>
                  </label>
                  <textarea
                    id="project-description"
                    name="description"
                    rows={2}
                    maxLength={10000}
                    value={draft.description}
                    aria-invalid={Boolean(fieldErrors["project-description"])}
                    aria-describedby={
                      fieldErrors["project-description"]
                        ? "project-description-error"
                        : undefined
                    }
                    onChange={(event) =>
                      updateDraft({ description: event.target.value })
                    }
                  />
                  {fieldErrors["project-description"] && (
                    <p
                      id="project-description-error"
                      className={formStyles.fieldError}
                      role="alert"
                    >
                      {fieldErrors["project-description"]}
                    </p>
                  )}
                </div>
                <div
                  className={formStyles.properties}
                  aria-label="Características del proyecto"
                >
                  <AreaSelector
                    options={catalogs.areas}
                    selected={draft.areaIds}
                    error={fieldErrors["project-areas"]}
                    onChange={(areaIds) => updateDraft({ areaIds })}
                  />
                  <ProjectEndDateSelector
                    value={draft.endDate}
                    min={catalogs.creation_date}
                    error={fieldErrors["project-end-date"]}
                    onChange={(endDate) => updateDraft({ endDate })}
                  />
                </div>
              </>
            ) : (
              <ProjectConfiguration
                draft={draft}
                onChange={updateDraft}
                areaName={
                  catalogs.areas.find((area) => area.id === draft.areaIds[0])
                    ?.name ?? ""
                }
                fieldErrors={fieldErrors}
                workerError={workerError}
                workers={workers}
                searching={searching}
                search={search}
                onSearchChange={setSearch}
                onSearch={searchWorkers}
              />
            )}
          </fieldset>
        </div>
        <footer className={formStyles.footer}>
          {error && (
            <p
              ref={generalError}
              className={formStyles.generalError}
              role="alert"
              tabIndex={-1}
            >
              {error}
            </p>
          )}
          <div className={formStyles.actions}>
            {step === 2 && (
              <button
                type="button"
                className={formStyles.secondary}
                disabled={busy}
                onClick={() => {
                  setError("");
                  setStep(1);
                }}
              >
                Volver
              </button>
            )}
            <button
              type="submit"
              className="min-h-10 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-700"
              disabled={
                busy ||
                catalogs.areas.length === 0 ||
                (step === 2 && draft.mode === "assigned" && searching)
              }
            >
              {busy
                ? "Creando…"
                : step === 1
                  ? "Continuar"
                  : draft.mode === "available"
                    ? "Publicar dentro del sistema"
                    : "Crear con asignados"}
            </button>
          </div>
        </footer>
      </form>
    </Modal>
  );
}
