import { useLayoutEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { sessionVersion } from "../auth/api";
import { createTaskSync, TaskSyncContext } from "./useTaskSync";

export default function TaskSyncProvider({ projectId, children }: { projectId: number; children: ReactNode }) {
  const [epoch, setEpoch] = useState(sessionVersion);
  const sync = useMemo(() => createTaskSync(projectId, epoch), [projectId, epoch]);
  useLayoutEffect(() => {
    sync.activate();
    function changed() {
      if (epoch !== sessionVersion()) { sync.dispose(); setEpoch(sessionVersion()); }
    }
    window.addEventListener("gm-session-expired", changed);
    window.addEventListener("gm-session-updated", changed);
    return () => {
      sync.dispose();
      window.removeEventListener("gm-session-expired", changed);
      window.removeEventListener("gm-session-updated", changed);
    };
  }, [sync, epoch]);
  return <TaskSyncContext.Provider key={`${projectId}:${epoch}`} value={sync}>{children}</TaskSyncContext.Provider>;
}
