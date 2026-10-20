import { useCallback, useEffect, useRef, useState } from "react";
import { errorText } from "../../auth/api";
import { changeTaskState, getTaskActivity, getTaskDetail, getTaskRelations, getTaskSubtasks, updateTask } from "../services";
import type { EditTaskPayload, Task, TaskIdentity, TaskStatePayload, TaskPage } from "../types";

export function useTaskDetailNavigation() {
  const [target, setTarget] = useState<TaskIdentity | null>(null);
  return { target, openTaskDetail: setTarget, closeTaskDetail: () => setTarget(null) };
}

export function useTaskResource<T>(load: () => Promise<T>) {
  const [state, setState] = useState<{ source: () => Promise<T>; value: T | null; error: string } | null>(null);
  const version = useRef(0);
  const refresh = useCallback(async () => {
    const request = ++version.current;
    try {
      const result = await load();
      if (request === version.current) setState({ source: load, value: result, error: "" });
    } catch (failure) {
      if (request === version.current) setState((current) => ({ source: load, value: current?.source === load ? current.value : null, error: errorText(failure) }));
    }
  }, [load]);
  useEffect(() => {
    let active = true;
    const sequence = version;
    void Promise.resolve().then(() => { if (active) void refresh(); });
    return () => { active = false; sequence.current++; };
  }, [refresh]);
  function setValue(next: T | null | ((current: T | null) => T | null)) {
    setState((current) => ({ source: load,
      value: typeof next === "function" ? (next as (value: T | null) => T | null)(current?.source === load ? current.value : null) : next,
      error: current?.source === load ? current.error : "" }));
  }
  function setError(error: string) { setState((current) => ({ source: load, value: current?.source === load ? current.value : null, error })); }
  return { value: state?.source === load ? state.value : null, setValue, loading: state?.source !== load,
    error: state?.source === load ? state.error : "", setError, refresh, version };
}

export function useTaskPage<T, P extends TaskPage<T>>(load: (cursor: number) => Promise<P>) {
  const resource = useTaskResource(useCallback(() => load(0), [load]));
  const [moreBusy, setMoreBusy] = useState(false);
  const pending = useRef(false);
  async function loadMore() {
    const cursor = resource.value?.next_cursor;
    if (pending.current || cursor == null) return;
    const request = resource.version.current;
    pending.current = true; setMoreBusy(true);
    try {
      const page = await load(cursor);
      if (request !== resource.version.current) return;
      resource.setValue((current) => current ? { ...page, items: [...current.items, ...page.items] } : page);
      resource.setError("");
    } catch (failure) { if (request === resource.version.current) resource.setError(errorText(failure)); }
    finally { pending.current = false; setMoreBusy(false); }
  }
  return { ...resource, moreBusy, loadMore };
}

export function useTaskDetail(target: TaskIdentity, onUpdated: (task: Task) => void) {
  const { projectId, taskId } = target;
  const detail = useTaskResource(useCallback(() => getTaskDetail({ projectId, taskId }), [projectId, taskId]));
  const children = useTaskPage(useCallback((cursor: number) => getTaskSubtasks({ projectId, taskId }, cursor), [projectId, taskId]));
  const activity = useTaskPage(useCallback((cursor: number) => getTaskActivity({ projectId, taskId }, cursor), [projectId, taskId]));
  const relations = useTaskPage(useCallback((cursor: number) => getTaskRelations({ projectId, taskId }, cursor), [projectId, taskId]));
  const [busy, setBusy] = useState(false);
  const pending = useRef(false), mounted = useRef(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  async function accept(saved: Task) {
    onUpdated(saved);
    if (!mounted.current) return;
    if (saved.id === taskId) detail.setValue((current) => current ? { ...current, task: saved } : current);
    void children.refresh(); void activity.refresh();
  }
  async function mutate(task: Task, data: Partial<EditTaskPayload> | TaskStatePayload) {
    if (pending.current) throw new Error("Espera a que termine el guardado.");
    pending.current = true; setBusy(true);
    try {
      const saved = "state_code" in data ? await changeTaskState(projectId, task.id, data) : await updateTask(projectId, task.id, data);
      await accept(saved);
    } finally {
      pending.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  async function relationsChanged(otherTaskId: number) {
    void relations.refresh(); void activity.refresh();
    try {
      const saved = await Promise.all([taskId, otherTaskId].map((id) => getTaskDetail({ projectId, taskId: id })));
      for (const result of saved) onUpdated(result.task);
      if (mounted.current) detail.setValue(saved[0]);
    } catch (failure) {
      if (mounted.current) detail.setError(`El vínculo se guardó. No se pudo actualizar la tarea: ${errorText(failure)}`);
    }
  }
  return { detail, children, activity, relations, busy, accept, relationsChanged,
    onPatch: (task: Task, data: Partial<EditTaskPayload>) => mutate(task, data),
    onState: (task: Task, data: TaskStatePayload) => mutate(task, data) };
}
