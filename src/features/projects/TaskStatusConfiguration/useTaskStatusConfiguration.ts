import { useEffect, useRef, useState } from "react";
import { errorText } from "../../auth/api";
import { configureProjectTaskStates, getProjectTaskStates, getTaskStatusTemplates, saveTaskStatusTemplate } from "../services";
import type { Project, ProjectTaskConfiguration, ProjectTaskState, StateReassignment, TaskStatusTemplate } from "../types";
import { draftError, orderedDraft, templateDraft, templateStates } from "./stateDraft";

export function useTaskStatusConfiguration(project: Project, onConfigured: (value: ProjectTaskConfiguration) => void, onClose: () => void) {
  const [configuration, setConfiguration] = useState(project.task_states);
  const [states, setStates] = useState<ProjectTaskState[]>(() => orderedDraft(project.task_states.states));
  const [templates, setTemplates] = useState<TaskStatusTemplate[]>([]);
  const [selected, setSelected] = useState<TaskStatusTemplate | null>(null);
  const [baseline, setBaseline] = useState(() => JSON.stringify(orderedDraft(project.task_states.states)));
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const [reassignments, setReassignments] = useState<Record<string, StateReassignment>>({});
  const inFlight = useRef(false);
  const alive = useRef(true);
  const dirty = JSON.stringify(states) !== baseline;

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  useEffect(() => {
    let current = true;
    alive.current = true;
    void Promise.all([getProjectTaskStates(project.id), getTaskStatusTemplates(project.id)]).then(([value, items]) => {
      if (!current) return;
      setConfiguration(value);
      setStates(orderedDraft(value.states));
      setBaseline(JSON.stringify(orderedDraft(value.states)));
      setTemplates(items);
      setSelected(null);
      setError("");
    }).catch((failure: unknown) => { if (current) setError(errorText(failure)); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; alive.current = false; };
  }, [project.id, reload]);

  function select(template: TaskStatusTemplate | null) {
    if (dirty && !window.confirm("Se descartará la edición pendiente. ¿Continuar?")) return false;
    setSelected(template);
    setStates(template ? templateDraft(template) : []);
    setReassignments({});
    setError("");
    return true;
  }

  function close() {
    if (!inFlight.current && (!dirty || window.confirm("Se descartará la edición pendiente. ¿Cerrar?"))) onClose();
  }

  async function saveTemplate(name: string, update: boolean) {
    if (inFlight.current) return false;
    const validation = draftError(states);
    if (validation) { setError(validation); return false; }
    if (!name.trim() || name.trim().length > 70) { setError("Escribe un nombre de 1 a 70 caracteres para la plantilla."); return false; }
    if (templates.some((item) => item.name.toLocaleLowerCase("es") === name.trim().toLocaleLowerCase("es") && (!update || item.id !== selected?.id))) {
      setError("Ya existe una plantilla con ese nombre."); return false;
    }
    if (update && (!selected || selected.preset || typeof selected.id !== "number")) return false;
    inFlight.current = true;
    setBusy(true);
    setError("");
    try {
      const saved = await saveTaskStatusTemplate(project.id, { name: name.trim(), states: templateStates(states), ...(update ? { revision: selected!.revision } : {}) }, update ? selected!.id as number : undefined);
      if (!alive.current) return false;
      setTemplates((items) => [...items.filter((item) => item.id !== saved.id), saved]);
      setSelected(saved);
      return true;
    } catch (failure) { if (alive.current) setError(errorText(failure)); return false; }
    finally { inFlight.current = false; if (alive.current) setBusy(false); }
  }

  async function apply() {
    if (inFlight.current || !configuration.can_configure || !project.permissions.manage) return;
    const validation = draftError(states);
    if (validation) { setError(validation); return; }
    if (removed.some((state) => !states.some((item) => item.code === reassignments[state.code]?.target))) {
      setError("Elige un destino para cada estado con tareas o subtareas."); return;
    }
    inFlight.current = true;
    setBusy(true);
    setError("");
    try {
      const result = await configureProjectTaskStates(project.id, {
        template: "custom", revision: configuration.revision,
        states: orderedDraft(states).map((state) => ({ ...state, name: state.name.trim().toLocaleUpperCase("es") })),
        reassignments: Object.values(reassignments).filter((item) => !states.some((state) => state.code === item.source)),
      });
      if (alive.current) { onConfigured(result); onClose(); }
    } catch (failure) { if (alive.current) setError(errorText(failure)); }
    finally { inFlight.current = false; if (alive.current) setBusy(false); }
  }

  const removed = Object.entries(configuration.usage ?? {}).filter(([code, count]) => count > 0 && !states.some((state) => state.code === code))
    .map(([code]) => configuration.states.find((state) => state.code === code) ?? configuration.available_states.find((state) => state.code === code) ?? { code, name: code });
  return { configuration, states, setStates, templates, selected, loading, busy, error, setError, dirty,
    reassignments, setReassignments, removed, select, close, saveTemplate, apply,
    retry: () => { if (!dirty || window.confirm("Se descartará la edición pendiente. ¿Recargar?")) { setLoading(true); setReload((value) => value + 1); } },
  };
}
