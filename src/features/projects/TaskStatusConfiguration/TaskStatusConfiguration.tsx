import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { errorText } from "../../auth/api";
import { configureProjectTaskStates, getProjectTaskStates } from "../services";
<<<<<<< HEAD
import type {
  Project,
  ProjectTaskConfiguration,
  ProjectTaskState,
} from "../types";
import Modal from "../Modal/Modal";
import ProjectForm, {
  fieldClass,
  inputClass,
  labelClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "../ProjectForm/ProjectForm";
=======
import type { Project, ProjectTaskConfiguration, ProjectTaskState } from "../types";
import { groupTaskStates, stateCategory } from "../stateGroups";
import Modal from "../Modal/Modal";
import ProjectForm from "../ProjectForm/ProjectForm";
import { formClasses as formStyles } from "../ProjectForm/formClasses";
const styles = {
  "loading": "m-0 p-5 text-sm text-neutral-600",
  "groups": "grid min-w-0 gap-4 [&_h3]:mb-2 [&_h3]:text-[13px] [&_h3]:text-neutral-600",
  "standard": "m-0 flex list-none flex-wrap gap-2 p-0 [&_li]:rounded-md [&_li]:border [&_li]:border-neutral-200 [&_li]:px-2 [&_li]:py-1.5 [&_li]:text-[13px] [&_li]:break-words",
  "states": "m-0 grid list-none gap-2 p-0.5",
  "state": "flex items-end gap-2.5 rounded-md border border-neutral-200 bg-neutral-50 p-2.5 [&>div:first-child]:grid [&>div:first-child]:min-w-0 [&>div:first-child]:flex-1 [&>div:first-child]:gap-1",
  "controls": "flex gap-1 [&_button]:min-w-[34px] [&_button]:min-h-10 [&_button]:rounded-md [&_button]:border [&_button]:border-neutral-200 [&_button]:bg-white [&_button]:cursor-pointer hover:[&_button]:bg-neutral-100",
  "add": "flex flex-wrap items-end gap-2 max-sm:flex-col max-sm:items-stretch [&>div]:min-w-[140px] [&>div]:flex-1"
};
>>>>>>> 331bd8aac01bb01bd27cb5de894aadc6824d9591

interface TaskStatusConfigurationProps {
  project: Project;
  onConfigured: (configuration: ProjectTaskConfiguration) => void;
  onClose: () => void;
}

const requiredCodes = new Set(["PENDIENTE", "EN_CURSO", "COMPLETADA"]);

export default function TaskStatusConfiguration({
  project,
  onConfigured,
  onClose,
}: TaskStatusConfigurationProps) {
  const [configuration, setConfiguration] =
    useState<ProjectTaskConfiguration | null>(null);
  const [template, setTemplate] = useState<"standard" | "custom">("standard");
  const [states, setStates] = useState<ProjectTaskState[]>([]);
  const [newCode, setNewCode] = useState("");
  const [newName, setNewName] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let current = true;
    void getProjectTaskStates(project.id)
      .then((value) => {
        if (current) {
          setConfiguration(value);
          setTemplate(value.template);
          setStates(value.states);
          setError("");
        }
      })
      .catch((failure: unknown) => {
        if (current) setError(errorText(failure));
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => {
      current = false;
    };
  }, [project.id, reload]);

<<<<<<< HEAD
  const available =
    configuration?.available_states.filter(
      (item) => !states.some((state) => state.code === item.code),
    ) ?? [];
=======
  useEffect(() => { if (!loading) document.getElementById("task-state-template")?.focus(); }, [loading]);

  const available = configuration?.available_states.filter((item) => !states.some((state) => state.code === item.code)) ?? [];
>>>>>>> 331bd8aac01bb01bd27cb5de894aadc6824d9591

  function addState() {
    const clean = newName.trim();
    if (!newCode || !clean) {
      setError("Selecciona el estado del catálogo y escribe su nombre.");
      return;
    }
    if (
      states.some(
        (state) =>
          state.name.trim().toLocaleLowerCase() === clean.toLocaleLowerCase(),
      )
    ) {
      setError("Ya existe un estado con ese nombre.");
      return;
    }
    setStates((current) => [...current, { code: newCode, name: clean }]);
    setNewCode("");
    setNewName("");
    setError("");
  }

  function move(code: string, offset: number) {
    setStates((current) => {
      const next = [...current];
      const group = current.filter((state) => stateCategory(state.code) === stateCategory(code));
      const target = group[group.findIndex((state) => state.code === code) + offset];
      if (!target) return current;
      const index = current.findIndex((state) => state.code === code);
      const destination = current.findIndex((state) => state.code === target.code);
      [next[index], next[destination]] = [next[destination]!, next[index]!];
      return next;
    });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
<<<<<<< HEAD
    if (!configuration?.can_configure) return;
    const cleanStates = states.map((state) => ({
      ...state,
      name: state.name.trim(),
    }));
    if (
      template === "custom" &&
      (cleanStates.some((state) => !state.name) ||
        new Set(cleanStates.map((state) => state.name.toLocaleLowerCase()))
          .size !== cleanStates.length)
    ) {
      setError("Usa nombres distintos y no vacíos.");
      return;
=======
    if (!configuration?.can_configure || !project.permissions.manage) return;
    const cleanStates = states.map((state) => ({ ...state, name: state.name.trim() }));
    if (template === "custom" && (cleanStates.some((state) => !state.name)
      || new Set(cleanStates.map((state) => state.name.toLocaleLowerCase())).size !== cleanStates.length)) {
      setError("Usa nombres distintos y no vacíos."); return;
>>>>>>> 331bd8aac01bb01bd27cb5de894aadc6824d9591
    }
    setBusy(true);
    setError("");
    try {
      const result = await configureProjectTaskStates(project.id, {
        template,
        revision: configuration.revision,
        states: template === "custom" ? cleanStates : [],
      });
      onConfigured(result);
      onClose();
    } catch (failure) {
      setError(errorText(failure));
    } finally {
      setBusy(false);
    }
  }

  return (
<<<<<<< HEAD
    <Modal title={`Estados de ${project.name}`} busy={busy} onClose={onClose}>
      {loading ? (
        <p className="m-0 p-5 text-sm text-neutral-600" role="status">
          Cargando configuración…
        </p>
      ) : (
        <ProjectForm
          compact
          busy={busy}
          error={error}
          onSubmit={submit}
          actions={
            <>
              <button
                type="button"
                className={secondaryButtonClass}
                disabled={busy}
                onClick={() => {
                  setLoading(true);
                  setReload((value) => value + 1);
                }}
              >
                Recargar configuración
              </button>
              <button
                type="button"
                className={secondaryButtonClass}
                disabled={busy}
                onClick={onClose}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className={primaryButtonClass}
                disabled={busy || !configuration?.can_configure}
              >
                {busy ? "Guardando…" : "Aplicar cambios"}
              </button>
            </>
          }
        >
          <div className={fieldClass}>
            <label htmlFor="task-state-template" className={labelClass}>
              Modelo de estados
            </label>
            <select
              id="task-state-template"
              value={template}
              disabled={!configuration?.can_configure}
              className={inputClass}
              onChange={(event) =>
                setTemplate(
                  event.target.value === "custom" ? "custom" : "standard",
                )
              }
            >
=======
    <Modal title={`Estados de ${project.name}`} busy={busy} onClose={onClose} wide>
      {loading ? <p className={styles.loading} role="status">Cargando configuración…</p> : (
        <ProjectForm compact busy={busy} readOnly={!configuration?.can_configure || !project.permissions.manage}
          error={error} onSubmit={submit} actions={
          <>
            <button type="button" className={formStyles.secondary} disabled={busy}
              onClick={() => { setLoading(true); setReload((value) => value + 1); }}>Recargar configuración</button>
            <button type="button" className={formStyles.secondary} disabled={busy} onClick={onClose}>Cancelar</button>
            <button type="submit" className="min-h-10 rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-700" disabled={busy || !configuration?.can_configure || !project.permissions.manage}>
              {busy ? "Guardando…" : "Aplicar cambios"}
            </button>
          </>
        }>
          <div className={formStyles.field}>
            <label htmlFor="task-state-template">Modelo de estados</label>
            <select id="task-state-template" name="template" data-initial-focus value={template} disabled={!configuration?.can_configure}
              onChange={(event) => setTemplate(event.target.value === "custom" ? "custom" : "standard")}>
>>>>>>> 331bd8aac01bb01bd27cb5de894aadc6824d9591
              <option value="standard">Estándar</option>
              <option value="custom">Personalizado para este proyecto</option>
            </select>
          </div>
<<<<<<< HEAD
          <p className="m-0 text-xs text-neutral-600 leading-relaxed">
            PENDIENTE → EN CURSO → CERRADO. Se conservan los estados
            intermedios, motivos y revisión que exigen las transiciones
            actuales.
          </p>
          {template === "standard" ? (
            <ul className="flex flex-wrap gap-2 m-0 p-0 list-none">
              {configuration?.available_states.map((state) => (
                <li
                  key={state.code}
                  className="px-2.5 py-1.5 border border-neutral-200 bg-white text-sm text-neutral-900 shadow-none"
                >
                  {state.name}
                </li>
              ))}
            </ul>
          ) : (
            <>
              <p className="m-0 text-xs text-neutral-600 leading-relaxed">
                Personaliza nombres y orden sobre el catálogo existente. No se
                crean códigos ni transiciones globales.
              </p>
              <ol className="grid gap-2 max-h-[35dvh] overflow-y-auto m-0 p-0.5 list-none">
                {states.map((state, index) => (
                  <li key={state.code} className="flex items-end gap-2.5">
                    <div className="grid flex-1 min-w-0 gap-1">
                      <label
                        htmlFor={`custom-state-${state.code}`}
                        className={labelClass}
                      >
                        {state.code}
                      </label>
                      <input
                        id={`custom-state-${state.code}`}
                        required
                        maxLength={70}
                        value={state.name}
                        className={inputClass}
                        onChange={(event) =>
                          setStates((current) =>
                            current.map((item) =>
                              item.code === state.code
                                ? { ...item, name: event.target.value }
                                : item,
                            ),
                          )
                        }
                      />
                    </div>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        disabled={index === 0}
                        aria-label={`Subir estado ${state.name}`}
                        onClick={() => move(index, -1)}
                        className="min-w-[34px] min-h-[40px] border border-neutral-200  text-neutral-900 cursor-pointer shadow-none disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        disabled={index === states.length - 1}
                        aria-label={`Bajar estado ${state.name}`}
                        onClick={() => move(index, 1)}
                        className="min-w-[34px] min-h-[40px] border border-neutral-200  text-neutral-900 cursor-pointer shadow-none disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        disabled={requiredCodes.has(state.code)}
                        aria-label={`Quitar estado ${state.name}`}
                        onClick={() =>
                          setStates((current) =>
                            current.filter((item) => item.code !== state.code),
                          )
                        }
                        className="min-w-[34px] min-h-[40px] border border-neutral-200  text-neutral-900 cursor-pointer shadow-none disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        ×
                      </button>
=======
          <p className="m-0 text-xs leading-relaxed text-neutral-600">
            PENDIENTE → EN CURSO → CERRADO. Se conservan los estados intermedios, motivos y revisión que exigen las transiciones actuales.
          </p>
          {template === "standard" ? (
            <div className={styles.groups}>{groupTaskStates(configuration?.available_states ?? []).map((group) => (
              <section key={group.label} aria-label={group.label}>
                <h3>{group.label}</h3>
                <ul className={styles.standard}>{group.states.map((state) => <li key={state.code}>{state.name}</li>)}</ul>
              </section>
            ))}</div>
          ) : (
            <>
              <p className="m-0 text-xs leading-relaxed text-neutral-600">Personaliza nombres y orden sobre el catálogo existente. No se crean códigos ni transiciones globales.</p>
              <div className={styles.groups}>{groupTaskStates(states).map((group) => (
                <section key={group.label} aria-label={group.label}>
                  <h3>{group.label}</h3>
                  <ol className={styles.states}>
                {group.states.map((state, index) => (
                  <li key={state.code} className={styles.state}>
                    <div>
                      <label htmlFor={`custom-state-${state.code}`}>{configuration?.available_states.find((item) => item.code === state.code)?.name ?? state.code}</label>
                      <input id={`custom-state-${state.code}`} name={`state_${state.code}`} required maxLength={70} value={state.name}
                        onChange={(event) => setStates((current) => current.map((item) => item.code === state.code
                          ? { ...item, name: event.target.value } : item))} />
                    </div>
                    <div className={styles.controls}>
                      <button type="button" disabled={index === 0} aria-label={`Subir estado ${state.name}`} onClick={() => move(state.code, -1)}>↑</button>
                      <button type="button" disabled={index === group.states.length - 1} aria-label={`Bajar estado ${state.name}`} onClick={() => move(state.code, 1)}>↓</button>
                      <button type="button" disabled={requiredCodes.has(state.code)} aria-label={`Quitar estado ${state.name}`}
                        onClick={() => setStates((current) => current.filter((item) => item.code !== state.code))}>×</button>
>>>>>>> 331bd8aac01bb01bd27cb5de894aadc6824d9591
                    </div>
                  </li>
                ))}
                  </ol>
                </section>
              ))}</div>
              {available.length > 0 && (
<<<<<<< HEAD
                <div className="flex items-end flex-wrap gap-2 max-sm:flex-col max-sm:items-stretch">
                  <div className={`${fieldClass} flex-1 min-w-[140px]`}>
                    <label htmlFor="new-state-code" className={labelClass}>
                      Estado disponible
                    </label>
                    <select
                      id="new-state-code"
                      value={newCode}
                      onChange={(event) => {
                        setNewCode(event.target.value);
                        setNewName(
                          available.find(
                            (state) => state.code === event.target.value,
                          )?.name ?? "",
                        );
                      }}
                      className={inputClass}
                    >
=======
                <div className={styles.add}>
                  <div className={formStyles.field}>
                    <label htmlFor="new-state-code">Estado disponible</label>
                    <select id="new-state-code" value={newCode} onChange={(event) => {
                      setNewCode(event.target.value);
                      setNewName(available.find((state) => state.code === event.target.value)?.name ?? "");
                    }}>
>>>>>>> 331bd8aac01bb01bd27cb5de894aadc6824d9591
                      <option value="">Selecciona del catálogo</option>
                      {available.map((state) => (
                        <option key={state.code} value={state.code}>
                          {state.name}
                        </option>
                      ))}
                    </select>
                  </div>
<<<<<<< HEAD
                  <div className={`${fieldClass} flex-1 min-w-[140px]`}>
                    <label htmlFor="new-state-name" className={labelClass}>
                      Nombre
                    </label>
                    <input
                      id="new-state-name"
                      maxLength={70}
                      value={newName}
                      onChange={(event) => setNewName(event.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <button
                    type="button"
                    className={secondaryButtonClass}
                    onClick={addState}
                  >
                    Agregar estado
                  </button>
=======
                  <div className={formStyles.field}>
                    <label htmlFor="new-state-name">Nombre</label>
                    <input id="new-state-name" maxLength={70} value={newName} onChange={(event) => setNewName(event.target.value)} />
                  </div>
                  <button type="button" className={formStyles.secondary} onClick={addState}>Agregar estado</button>
>>>>>>> 331bd8aac01bb01bd27cb5de894aadc6824d9591
                </div>
              )}
            </>
          )}
<<<<<<< HEAD
          {configuration && !configuration.can_configure && (
            <p role="status" className="text-sm text-neutral-600">
              No tienes permiso para configurar este proyecto.
            </p>
          )}
=======
          {configuration && !configuration.can_configure && <p role="status">No tienes permiso para configurar este proyecto.</p>}
>>>>>>> 331bd8aac01bb01bd27cb5de894aadc6824d9591
        </ProjectForm>
      )}
    </Modal>
  );
}
