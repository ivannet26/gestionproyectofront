import { useCallback, useEffect, useRef, useState } from "react";
import type { RelationKind, TaskIdentity, TaskRelation } from "../types";
import { changeDependency, createTaskRelation, removeTaskRelation, searchRelatedTasks } from "../services";
import { errorText } from "../../auth/api";
import { useTaskPage } from "./useTaskDetail";

export function useRelationMutation(target: TaskIdentity, onChanged: (otherId: number) => Promise<void>) {
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const pending = useRef(false);
  async function mutate(action: () => Promise<void>, otherId: number) {
    if (pending.current) return false;
    pending.current = true; setBusy(true); setError("");
    try { await action(); await onChanged(otherId); return true; }
    catch (failure) { setError(errorText(failure)); return false; }
    finally { pending.current = false; setBusy(false); }
  }
  function link(kind: RelationKind, otherId: number, name: string) {
    return mutate(() => kind === "custom" ? createTaskRelation(target, otherId, name.trim())
      : kind === "blocks" ? changeDependency(target.projectId, otherId, target.taskId, false)
        : changeDependency(target.projectId, target.taskId, otherId, false), otherId);
  }
  function unlink(relation: TaskRelation) {
    return mutate(() => relation.kind === "custom" ? removeTaskRelation(target, relation.relation_id!)
      : changeDependency(target.projectId, relation.successor_id!, relation.predecessor_id!, true), relation.target_id);
  }
  return { link, unlink, busy, error };
}

export function useRelationPicker(target: TaskIdentity, kind: RelationKind) {
  const [query, setQuery] = useState(""), [term, setTerm] = useState(""), [name, setName] = useState("");
  const { projectId, taskId } = target;
  useEffect(() => { const timer = window.setTimeout(() => setTerm(query.trim()), 250); return () => window.clearTimeout(timer); }, [query]);
  const results = useTaskPage(useCallback((cursor: number) => searchRelatedTasks({ projectId, taskId }, kind, term, cursor), [projectId, taskId, kind, term]));
  return { query, setQuery, name, setName, results, searching: query.trim() !== term || results.loading };
}
