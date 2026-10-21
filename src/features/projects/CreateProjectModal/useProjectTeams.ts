import { useCallback, useEffect, useRef, useState } from "react";
import { errorText } from "../../auth/api";
import { getProjectTeamCandidates } from "../services";
import type { TeamOption } from "../types";

export function useProjectTeams(areaId: number | undefined, enabled: boolean) {
  const [items, setItems] = useState<TeamOption[]>([]), [error, setError] = useState(""), [loading, setLoading] = useState(false);
  const generation = useRef(0);
  const load = useCallback(async () => {
    const request = ++generation.current;
    if (!enabled || areaId === undefined) { setItems([]); setLoading(false); return; }
    setLoading(true); setError(""); setItems([]);
    try { const result = await getProjectTeamCandidates(areaId); if (generation.current === request) setItems(result); }
    catch (failure) { if (generation.current === request) setError(errorText(failure)); }
    finally { if (generation.current === request) setLoading(false); }
  }, [areaId, enabled]);
  const invalidate = useCallback(() => { generation.current++; }, []);
  useEffect(() => { let active = true; void Promise.resolve().then(() => { if (active) void load(); }); return () => { active = false; invalidate(); }; }, [load, invalidate]);
  return { items, error, loading, retry: load };
}
