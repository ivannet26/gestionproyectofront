import { useEffect, useRef, useState } from "react";
import { errorText } from "../../auth/api";
import { configureProjectTaskStates, getProjectTaskStates, getTaskStatusTemplates, saveTaskStatusTemplate } from "../services";
import type { Project, ProjectTaskConfiguration, ProjectTaskState, StateReassignment, TaskStatusTemplate } from "../types";
import { draftError, orderedDraft, templateDraft, templateStates } from "./stateDraft";
import { categoryValue } from "../stateGroups";

export interface TaskFlowDraft {
  states: ProjectTaskState[];
  templates: TaskStatusTemplate[];
  onApply: (states: ProjectTaskState[], name: string) => void;
}

export function useTaskStatusConfiguration(project: Project | undefined, onConfigured: (value: ProjectTaskConfiguration) => void, onClose: () => void, draft?: TaskFlowDraft) {
  const initial = project?.task_states ?? { template: "custom", states: draft?.states ?? [], available_states: [], revision: "", can_configure: true } as ProjectTaskConfiguration;
  const [configuration, setConfiguration] = useState(initial);
  const [states, setStates] = useState<ProjectTaskState[]>(() => orderedDraft(initial.states));
  const [templates, setTemplates] = useState<TaskStatusTemplate[]>([]);
  const [selected, setSelected] = useState<TaskStatusTemplate | null>(null);
  const [baseline, setBaseline] = useState(() => JSON.stringify(orderedDraft(initial.states)));
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const [reassignments, setReassignments] = useState<Record<string, StateReassignment>>({});
  const source = useRef({ initial, draft });
  const projectId = project?.id;
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
    const starting = source.current;
    const request = starting.draft ? Promise.resolve([starting.initial, starting.draft.templates] as const) : Promise.all([getProjectTaskStates(projectId!), getTaskStatusTemplates(projectId!)]);
    void request.then(([value, items]) => {
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
  }, [projectId, reload]);

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
    if (!project || draft) return false;
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
    if (inFlight.current || !configuration.can_configure || (!draft && !project?.permissions.manage)) return;
    const validation = draftError(states);
    if (validation) { setError(validation); return; }
    if (draft) {
      const categories = new Set(states.map(categoryValue));
      if (!["not_started", "active", "closed"].every((category) => categories.has(category as "not_started" | "active" | "closed"))) {
        setError("El flujo necesita al menos un estado No iniciado, Activo y Cerrado."); return;
      }
      draft.onApply(orderedDraft(states).map((state) => ({ ...state, name: state.name.trim().toLocaleUpperCase("es") })), selected?.name ?? "Personalizado");
      onClose();
      return;
    }
    if (removed.some((state) => !states.some((item) => item.code === reassignments[state.code]?.target))) {
      setError("Elige un destino para cada estado con tareas o subtareas."); return;
    }
    inFlight.current = true;
    setBusy(true);
    setError("");
    try {
      const result = await configureProjectTaskStates(project!.id, {
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
