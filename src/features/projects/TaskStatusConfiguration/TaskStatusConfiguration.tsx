import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { errorText } from "../../auth/api";
import { configureProjectTaskStates, getProjectTaskStates } from "../services";
import type { Project, ProjectTaskConfiguration, ProjectTaskState } from "../types";
import Modal from "../Modal/Modal";
import ProjectForm from "../ProjectForm/ProjectForm";
import formStyles from "../ProjectForm/ProjectForm.module.css";
import styles from "./TaskStatusConfiguration.module.css";

interface TaskStatusConfigurationProps {
  project: Project;
  onConfigured: (configuration: ProjectTaskConfiguration) => void;
  onClose: () => void;
}

const requiredCodes = new Set(["PENDIENTE", "EN_CURSO", "COMPLETADA"]);

export default function TaskStatusConfiguration({ project, onConfigured, onClose }: TaskStatusConfigurationProps) {
  const [configuration, setConfiguration] = useState<ProjectTaskConfiguration | null>(null);
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
    void getProjectTaskStates(project.id).then((value) => {
      if (current) {
        setConfiguration(value);
        setTemplate(value.template);
        setStates(value.states);
        setError("");
      }
    }).catch((failure: unknown) => {
      if (current) setError(errorText(failure));
    }).finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [project.id, reload]);

  const available = configuration?.available_states.filter((item) => !states.some((state) => state.code === item.code)) ?? [];

  function addState() {
    const clean = newName.trim();
    if (!newCode || !clean) { setError("Selecciona el estado del catálogo y escribe su nombre."); return; }
    if (states.some((state) => state.name.trim().toLocaleLowerCase() === clean.toLocaleLowerCase())) {
      setError("Ya existe un estado con ese nombre."); return;
    }
    setStates((current) => [...current, { code: newCode, name: clean }]);
    setNewCode("");
    setNewName("");
    setError("");
  }

  function move(index: number, offset: number) {
    setStates((current) => {
      const next = [...current];
      const destination = index + offset;
      if (destination < 0 || destination >= next.length) return current;
      [next[index], next[destination]] = [next[destination]!, next[index]!];
      return next;
    });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!configuration?.can_configure) return;
    const cleanStates = states.map((state) => ({ ...state, name: state.name.trim() }));
    if (template === "custom" && (cleanStates.some((state) => !state.name)
      || new Set(cleanStates.map((state) => state.name.toLocaleLowerCase())).size !== cleanStates.length)) {
      setError("Usa nombres distintos y no vacíos."); return;
    }
    setBusy(true);
    setError("");
    try {
      const result = await configureProjectTaskStates(project.id, {
        template, revision: configuration.revision, states: template === "custom" ? cleanStates : [],
      });
      onConfigured(result);
      onClose();
    } catch (failure) { setError(errorText(failure)); }
    finally { setBusy(false); }
  }

  return (
    <Modal title={`Estados de ${project.name}`} busy={busy} onClose={onClose}>
      {loading ? <p className={styles.loading} role="status">Cargando configuración…</p> : (
        <ProjectForm compact busy={busy} error={error} onSubmit={submit} actions={
          <>
            <button type="button" className={formStyles.secondary} disabled={busy}
              onClick={() => { setLoading(true); setReload((value) => value + 1); }}>Recargar configuración</button>
            <button type="button" className={formStyles.secondary} disabled={busy} onClick={onClose}>Cancelar</button>
            <button type="submit" className="primary-button" disabled={busy || !configuration?.can_configure}>
              {busy ? "Guardando…" : "Aplicar cambios"}
            </button>
          </>
        }>
          <div className={formStyles.field}>
            <label htmlFor="task-state-template">Modelo de estados</label>
            <select id="task-state-template" value={template} disabled={!configuration?.can_configure}
              onChange={(event) => setTemplate(event.target.value === "custom" ? "custom" : "standard")}>
              <option value="standard">Estándar</option>
              <option value="custom">Personalizado para este proyecto</option>
            </select>
          </div>
          <p className="field-hint">
            PENDIENTE → EN CURSO → CERRADO. Se conservan los estados intermedios, motivos y revisión que exigen las transiciones actuales.
          </p>
          {template === "standard" ? (
            <ul className={styles.standard}>{configuration?.available_states.map((state) => <li key={state.code}>{state.name}</li>)}</ul>
          ) : (
            <>
              <p className="field-hint">Personaliza nombres y orden sobre el catálogo existente. No se crean códigos ni transiciones globales.</p>
              <ol className={styles.states}>
                {states.map((state, index) => (
                  <li key={state.code} className={styles.state}>
                    <div>
                      <label htmlFor={`custom-state-${state.code}`}>{state.code}</label>
                      <input id={`custom-state-${state.code}`} required maxLength={70} value={state.name}
                        onChange={(event) => setStates((current) => current.map((item) => item.code === state.code
                          ? { ...item, name: event.target.value } : item))} />
                    </div>
                    <div className={styles.controls}>
                      <button type="button" disabled={index === 0} aria-label={`Subir estado ${state.name}`} onClick={() => move(index, -1)}>↑</button>
                      <button type="button" disabled={index === states.length - 1} aria-label={`Bajar estado ${state.name}`} onClick={() => move(index, 1)}>↓</button>
                      <button type="button" disabled={requiredCodes.has(state.code)} aria-label={`Quitar estado ${state.name}`}
                        onClick={() => setStates((current) => current.filter((item) => item.code !== state.code))}>×</button>
                    </div>
                  </li>
                ))}
              </ol>
              {available.length > 0 && (
                <div className={styles.add}>
                  <div className={formStyles.field}>
                    <label htmlFor="new-state-code">Estado disponible</label>
                    <select id="new-state-code" value={newCode} onChange={(event) => {
                      setNewCode(event.target.value);
                      setNewName(available.find((state) => state.code === event.target.value)?.name ?? "");
                    }}>
                      <option value="">Selecciona del catálogo</option>
                      {available.map((state) => <option key={state.code} value={state.code}>{state.name}</option>)}
                    </select>
                  </div>
                  <div className={formStyles.field}>
                    <label htmlFor="new-state-name">Nombre</label>
                    <input id="new-state-name" maxLength={70} value={newName} onChange={(event) => setNewName(event.target.value)} />
                  </div>
                  <button type="button" className={formStyles.secondary} onClick={addState}>Agregar estado</button>
                </div>
              )}
            </>
          )}
          {configuration && !configuration.can_configure && <p role="status">No tienes permiso para configurar este proyecto.</p>}
        </ProjectForm>
      )}
    </Modal>
  );
}
