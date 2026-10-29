import { useEffect, useRef, useState } from "react";
import { addTeamMember } from "../../../core/services/organizationService";
import { listWorkers } from "../../../core/services/workerService";
import { errorText, sessionVersion } from "../../auth/api";

export function useTeamMemberAddition(teamId: number, onChanged: () => void) {
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const generation = useRef(0), pending = useRef(false);
  useEffect(() => {
    const version = generation;
    return () => { version.current++; pending.current = false; };
  }, [teamId]);

  async function add(code: string, joinedDate: string): Promise<boolean> {
    const trimmed = code.trim();
    if (pending.current || !trimmed || !joinedDate) return false;
    const request = generation.current, epoch = sessionVersion();
    const current = () => request === generation.current && epoch === sessionVersion();
    pending.current = true; setBusy(true); setError("");
    try {
      const matches = await listWorkers({ search: trimmed });
      if (!current()) return false;
      const worker = matches.find((candidate) => candidate.code.toLowerCase() === trimmed.toLowerCase())
        ?? (matches.length === 1 ? matches[0] : undefined);
      if (!worker) { setError("No existe un trabajador con ese código."); return false; }
      await addTeamMember(teamId, { worker_id: worker.id, joined_date: joinedDate });
      if (!current()) return false;
      onChanged();
      return true;
    } catch (failure) {
      if (current()) setError(errorText(failure));
      return false;
    } finally {
      if (request === generation.current) {
        pending.current = false;
        if (current()) setBusy(false);
      }
    }
  }
  return { busy, error, add };
}
