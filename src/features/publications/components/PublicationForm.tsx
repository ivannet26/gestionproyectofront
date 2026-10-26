import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import PlusIcon from "../../../shared/icons/PlusIcon";
import TrashIcon from "../../../shared/icons/TrashIcon";
import Modal from "../../projects/Modal/Modal";
import {
  publicationErrorText,
  publicationFieldErrors,
} from "../../../core/services/publicationService";
import {
  LEVEL_LABELS,
  addDaysIso,
  isoToday,
  validatePublicationDraft,
} from "../utils/publication";
import type { PublicationDraft } from "../utils/publication";
import type {
  Publication,
  PublicationCatalogs,
  PublicationCreateData,
  PublicationRequirementWriteData,
  PublicationUpdateData,
} from "../../../core/interfaces/publication.interface";

interface PublicationFormProps {
  publication?: Publication;
  catalogs: PublicationCatalogs;
  onClose: () => void;
  onSubmit: (
    payload: PublicationCreateData | PublicationUpdateData,
  ) => Promise<void>;
}

const FIELD_IDS: Record<string, string> = {
  project_id: "publication-project",
  title: "publication-title",
  description: "publication-description",
  vacancies: "publication-vacancies",
  weekly_hours: "publication-hours",
  opening_date: "publication-opening",
  closing_date: "publication-closing",
  requirements: "publication-requirements",
};

function initialDraft(publication?: Publication): PublicationDraft {
  if (publication) {
    return {
      projectId: String(publication.project.id),
      title: publication.title,
      description: publication.description,
      vacancies: String(publication.vacancies),
      weeklyHours: publication.weekly_hours,
      openingDate: publication.opening_date,
      closingDate: publication.closing_date,
      requirements: publication.requirements.map((requirement) => ({
        specialty_id: requirement.specialty_id,
        minimum_level: requirement.minimum_level,
      })),
    };
  }
  const today = isoToday();
  return {
    projectId: "",
    title: "",
    description: "",
    vacancies: "1",
    weeklyHours: "40",
    openingDate: today,
    closingDate: addDaysIso(today, 30),
    requirements: [],
  };
}

function inputClass(invalid: boolean) {
  return `w-full rounded-lg border bg-white px-3 py-1.5 text-xs text-neutral-800 placeholder:text-neutral-600 focus:outline-none disabled:cursor-not-allowed ${invalid ? "border-red-600 focus:border-red-700" : "border-neutral-200 focus:border-neutral-400"}`;
}

const labelClass = "text-xs text-neutral-600";
const errorClass = "m-0 text-[10px] leading-relaxed text-red-600";

export default function PublicationForm({
  publication,
  catalogs,
  onClose,
  onSubmit,
}: PublicationFormProps) {
  const [draft, setDraft] = useState<PublicationDraft>(() =>
    initialDraft(publication),
  );
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  const generalError = useRef<HTMLParagraphElement>(null);
  const focusRequested = useRef(false);
  const editing = publication !== undefined;
  const projectUnavailable =
    !editing && catalogs.projects.length === 0;
  const levels = catalogs.levels.length > 0 ? catalogs.levels : [1, 2, 3];
  const closingMin =
    publication?.state === "ABIERTA" && draft.openingDate < isoToday()
      ? isoToday()
      : draft.openingDate || undefined;

  useEffect(() => {
    if (!focusRequested.current) return;
    focusRequested.current = false;
    const firstInvalid = form.current?.querySelector<HTMLElement>(
      '[aria-invalid="true"]',
    );
    if (firstInvalid) firstInvalid.focus();
    else if (error) generalError.current?.focus();
  }, [busy, error, fieldErrors]);

  function errorFor(field: string) {
    return fieldErrors[field];
  }

  function updateField<K extends keyof PublicationDraft>(
    field: K,
    value: PublicationDraft[K],
  ) {
    setDraft((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => {
      const key = String(field);
      if (!(key in current)) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  function updateRequirements(requirements: PublicationRequirementWriteData[]) {
    setDraft((current) => ({ ...current, requirements }));
    setFieldErrors((current) => {
      if (!("requirements" in current)) return current;
      const next = { ...current };
      delete next.requirements;
      return next;
    });
  }

  function addRequirement() {
    const used = new Set(
      draft.requirements.map((requirement) => requirement.specialty_id),
    );
    const next = catalogs.specialties.find((item) => !used.has(item.id));
    if (!next) return;
    updateRequirements([
      ...draft.requirements,
      { specialty_id: next.id, minimum_level: 1 },
    ]);
  }

  function availableSpecialties(index: number, currentId: number) {
    const used = new Set(
      draft.requirements
        .filter((_, position) => position !== index)
        .map((requirement) => requirement.specialty_id),
    );
    return catalogs.specialties.filter(
      (item) => item.id === currentId || !used.has(item.id),
    );
  }

  function apiErrors(failure: unknown) {
    const byId = publicationFieldErrors(failure, FIELD_IDS);
    const byField: Record<string, string> = {};
    for (const [field, id] of Object.entries(FIELD_IDS))
      if (byId[id]) byField[field] = byId[id];
    return byField;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const validation = validatePublicationDraft(draft, {
      requireProject: !editing,
      state: publication?.state,
      today: isoToday(),
    });
    if (Object.keys(validation).length > 0) {
      focusRequested.current = true;
      setFieldErrors(validation);
      return;
    }
    setFieldErrors({});

    const base: PublicationUpdateData = {
      title: draft.title.trim(),
      description: draft.description.trim(),
      vacancies: Number(draft.vacancies),
      weekly_hours: Number(draft.weeklyHours).toFixed(2),
      opening_date: draft.openingDate,
      closing_date: draft.closingDate,
      requirements: draft.requirements.map((requirement) => ({
        specialty_id: requirement.specialty_id,
        minimum_level: requirement.minimum_level,
      })),
    };
    const payload: PublicationCreateData | PublicationUpdateData = editing
      ? base
      : { ...base, project_id: Number(draft.projectId) };

    setBusy(true);
    try {
      await onSubmit(payload);
      onClose();
    } catch (failure) {
      const fields = apiErrors(failure);
      setFieldErrors(fields);
      setError(
        Object.keys(fields).length > 0 ? "" : publicationErrorText(failure),
      );
      focusRequested.current = true;
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      title={editing ? "Editar publicación" : "Nueva publicación"}
      onClose={onClose}
      busy={busy}
      projectComposer
    >
      <form
        ref={form}
        className="flex min-h-0 flex-1 flex-col"
        noValidate
        aria-busy={busy}
        onSubmit={submit}
      >
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-5 max-sm:px-4">
          <fieldset
            className="m-0 grid min-w-0 gap-5 border-0 p-0"
            disabled={busy}
          >
            <section className="grid min-w-0 gap-1.5">
              <label htmlFor="publication-project" className={labelClass}>
                Proyecto
              </label>
              {editing ? (
                <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-xs font-medium text-neutral-800">
                  {publication.project.name}
                </div>
              ) : (
                <select
                  id="publication-project"
                  name="project_id"
                  data-initial-focus
                  value={draft.projectId}
                  aria-invalid={Boolean(errorFor("project_id"))}
                  aria-describedby={
                    errorFor("project_id")
                      ? "publication-project-error"
                      : undefined
                  }
                  onChange={(event) =>
                    updateField("projectId", event.target.value)
                  }
                  className={inputClass(Boolean(errorFor("project_id")))}
                >
                  <option value="">Selecciona un proyecto</option>
                  {catalogs.projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              )}
              {!editing && catalogs.projects.length === 0 && (
                <p className="m-0 text-[10px] text-neutral-600">
                  No hay proyectos abiertos disponibles para publicar.
                </p>
              )}
              {errorFor("project_id") && (
                <p id="publication-project-error" className={errorClass} role="alert">
                  {errorFor("project_id")}
                </p>
              )}
            </section>

            <section className="grid min-w-0 gap-4">
              <h3 className="m-0 text-sm font-medium text-neutral-800">
                Información de la oferta
              </h3>

              <div className="grid min-w-0 gap-1.5">
                <label htmlFor="publication-title" className={labelClass}>
                  Título *
                </label>
                <input
                  id="publication-title"
                  name="title"
                  type="text"
                  required
                  maxLength={180}
                  autoComplete="off"
                  value={draft.title}
                  aria-invalid={Boolean(errorFor("title"))}
                  aria-describedby={
                    errorFor("title") ? "publication-title-error" : undefined
                  }
                  onChange={(event) =>
                    updateField("title", event.target.value)
                  }
                  className={inputClass(Boolean(errorFor("title")))}
                  placeholder="Ej. Ingeniero civil de obra"
                />
                {errorFor("title") && (
                  <p id="publication-title-error" className={errorClass} role="alert">
                    {errorFor("title")}
                  </p>
                )}
              </div>

              <div className="grid min-w-0 gap-1.5">
                <label htmlFor="publication-description" className={labelClass}>
                  Descripción *
                </label>
                <textarea
                  id="publication-description"
                  name="description"
                  rows={4}
                  required
                  maxLength={10_000}
                  value={draft.description}
                  aria-invalid={Boolean(errorFor("description"))}
                  aria-describedby={
                    errorFor("description")
                      ? "publication-description-error"
                      : undefined
                  }
                  onChange={(event) =>
                    updateField("description", event.target.value)
                  }
                  className={`${inputClass(Boolean(errorFor("description")))} resize-y`}
                  placeholder="Describe las funciones, el contexto del proyecto y lo que ofrece la posición."
                />
                {errorFor("description") && (
                  <p
                    id="publication-description-error"
                    className={errorClass}
                    role="alert"
                  >
                    {errorFor("description")}
                  </p>
                )}
              </div>

              <div className="grid min-w-0 gap-4 sm:grid-cols-2">
                <div className="grid min-w-0 gap-1.5">
                  <label htmlFor="publication-vacancies" className={labelClass}>
                    Vacantes *
                  </label>
                  <input
                    id="publication-vacancies"
                    name="vacancies"
                    type="number"
                    required
                    min={1}
                    max={65_535}
                    step={1}
                    value={draft.vacancies}
                    aria-invalid={Boolean(errorFor("vacancies"))}
                    aria-describedby={
                      errorFor("vacancies")
                        ? "publication-vacancies-error"
                        : undefined
                    }
                    onChange={(event) =>
                      updateField("vacancies", event.target.value)
                    }
                    className={inputClass(Boolean(errorFor("vacancies")))}
                  />
                  {errorFor("vacancies") && (
                    <p
                      id="publication-vacancies-error"
                      className={errorClass}
                      role="alert"
                    >
                      {errorFor("vacancies")}
                    </p>
                  )}
                </div>

                <div className="grid min-w-0 gap-1.5">
                  <label htmlFor="publication-hours" className={labelClass}>
                    Horas semanales *
                  </label>
                  <input
                    id="publication-hours"
                    name="weekly_hours"
                    type="number"
                    required
                    min={0.01}
                    max={168}
                    step={0.01}
                    value={draft.weeklyHours}
                    aria-invalid={Boolean(errorFor("weekly_hours"))}
                    aria-describedby={
                      errorFor("weekly_hours")
                        ? "publication-hours-error"
                        : undefined
                    }
                    onChange={(event) =>
                      updateField("weeklyHours", event.target.value)
                    }
                    className={inputClass(Boolean(errorFor("weekly_hours")))}
                  />
                  {errorFor("weekly_hours") && (
                    <p
                      id="publication-hours-error"
                      className={errorClass}
                      role="alert"
                    >
                      {errorFor("weekly_hours")}
                    </p>
                  )}
                </div>

                <div className="grid min-w-0 gap-1.5">
                  <label htmlFor="publication-opening" className={labelClass}>
                    Apertura *
                  </label>
                  <input
                    id="publication-opening"
                    name="opening_date"
                    type="date"
                    required
                    value={draft.openingDate}
                    aria-invalid={Boolean(errorFor("opening_date"))}
                    aria-describedby={
                      errorFor("opening_date")
                        ? "publication-opening-error"
                        : undefined
                    }
                    onChange={(event) =>
                      updateField("openingDate", event.target.value)
                    }
                    className={inputClass(Boolean(errorFor("opening_date")))}
                  />
                  {errorFor("opening_date") && (
                    <p
                      id="publication-opening-error"
                      className={errorClass}
                      role="alert"
                    >
                      {errorFor("opening_date")}
                    </p>
                  )}
                </div>

                <div className="grid min-w-0 gap-1.5">
                  <label htmlFor="publication-closing" className={labelClass}>
                    Cierre *
                  </label>
                  <input
                    id="publication-closing"
                    name="closing_date"
                    type="date"
                    required
                    min={closingMin}
                    value={draft.closingDate}
                    aria-invalid={Boolean(errorFor("closing_date"))}
                    aria-describedby={
                      errorFor("closing_date")
                        ? "publication-closing-error"
                        : undefined
                    }
                    onChange={(event) =>
                      updateField("closingDate", event.target.value)
                    }
                    className={inputClass(Boolean(errorFor("closing_date")))}
                  />
                  {errorFor("closing_date") && (
                    <p
                      id="publication-closing-error"
                      className={errorClass}
                      role="alert"
                    >
                      {errorFor("closing_date")}
                    </p>
                  )}
                </div>
              </div>
            </section>

            <section className="grid min-w-0 gap-3 border-t border-neutral-200 pt-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="m-0 text-sm font-medium text-neutral-800">
                    Requisitos de especialidad
                  </h3>
                  <p className="m-0 mt-0.5 text-[10px] text-neutral-600">
                    Define las especialidades y el nivel mínimo requerido.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addRequirement}
                  disabled={
                    draft.requirements.length >= 50 ||
                    draft.requirements.length >= catalogs.specialties.length
                  }
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-800 hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <PlusIcon className="size-4" />
                  Agregar requisito
                </button>
              </div>

              {catalogs.specialties.length === 0 && (
                <p className="m-0 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-[10px] text-neutral-600">
                  No hay especialidades registradas. Puedes crear la publicación
                  sin requisitos.
                </p>
              )}

              {draft.requirements.length === 0 ? (
                <p className="m-0 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs text-neutral-600">
                  Sin requisitos: la oferta quedará abierta a cualquier
                  especialidad.
                </p>
              ) : (
                <ul className="m-0 grid list-none gap-2 p-0">
                  {draft.requirements.map((requirement, index) => (
                    <li
                      key={index}
                      className="grid min-w-0 items-start gap-2 sm:grid-cols-[minmax(0,1fr)_150px_auto]"
                    >
                      <select
                        aria-label={`Especialidad del requisito ${index + 1}`}
                        value={requirement.specialty_id || ""}
                        onChange={(event) => {
                          const next = [...draft.requirements];
                          next[index] = {
                            ...next[index],
                            specialty_id: Number(event.target.value),
                          };
                          updateRequirements(next);
                        }}
                        className={inputClass(Boolean(errorFor("requirements")))}
                      >
                        <option value="">Selecciona una especialidad</option>
                        {availableSpecialties(
                          index,
                          requirement.specialty_id,
                        ).map((specialty) => (
                          <option key={specialty.id} value={specialty.id}>
                            {specialty.name}
                          </option>
                        ))}
                      </select>
                      <select
                        aria-label={`Nivel mínimo del requisito ${index + 1}`}
                        value={requirement.minimum_level}
                        onChange={(event) => {
                          const next = [...draft.requirements];
                          next[index] = {
                            ...next[index],
                            minimum_level: Number(event.target.value),
                          };
                          updateRequirements(next);
                        }}
                        className={inputClass(Boolean(errorFor("requirements")))}
                      >
                        {levels.map((level) => (
                          <option key={level} value={level}>
                            {LEVEL_LABELS[level] ?? `Nivel ${level}`}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() =>
                          updateRequirements(
                            draft.requirements.filter(
                              (_, position) => position !== index,
                            ),
                          )
                        }
                        aria-label={`Quitar requisito ${index + 1}`}
                        title="Quitar requisito"
                        className="cursor-pointer rounded-lg p-1.5 text-neutral-700 hover:bg-neutral-200 hover:text-neutral-800"
                      >
                        <TrashIcon className="size-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <p
                id="publication-requirements"
                className={errorClass}
                role={errorFor("requirements") ? "alert" : undefined}
              >
                {errorFor("requirements")}
              </p>
            </section>
          </fieldset>
        </div>

        <footer className="shrink-0 border-t border-neutral-200 bg-white px-6 py-3 max-sm:px-4">
          {error && (
            <p
              ref={generalError}
              tabIndex={-1}
              className="m-0 mb-2 text-xs text-red-600"
              role="alert"
            >
              {error}
            </p>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="m-0 text-[10px] text-neutral-500">
              {editing
                ? "Los cambios se aplican de inmediato."
                : "La publicación se crea como borrador."}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={busy}
                className="cursor-pointer rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-800 hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={busy || projectUnavailable}
                className="cursor-pointer rounded-lg bg-neutral-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy
                  ? editing
                    ? "Guardando…"
                    : "Creando…"
                  : editing
                    ? "Guardar cambios"
                    : "Crear publicación"}
              </button>
            </div>
          </div>
        </footer>
      </form>
    </Modal>
  );
}
