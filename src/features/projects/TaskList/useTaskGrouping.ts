import { useEffect, useMemo, useState } from "react";
import type {
  ProjectCatalogs,
  ProjectTaskState,
  Task,
  TaskGroupingPreferences,
} from "../types";
import { groupTasks, projectToday } from "./taskGrouping";
import { taskHierarchy } from "./taskHierarchy";

export function useTaskGrouping(
  tasks: Task[],
  search: string,
  states: ProjectTaskState[],
  priorities: ProjectCatalogs["priorities"],
  preferences: TaskGroupingPreferences,
) {
  const [today, setToday] = useState(projectToday);
  useEffect(() => {
    if (preferences.mode !== "due_date") return;
    let timer: number;
    function tick() {
      setToday(projectToday());
      timer = window.setTimeout(tick, 60_000);
    }
    timer = window.setTimeout(tick, 0);
    return () => window.clearTimeout(timer);
  }, [preferences.mode]);
  const hierarchy = useMemo(
    () => taskHierarchy(tasks, search),
    [tasks, search],
  );
  const groups = useMemo(
    () => groupTasks(tasks, hierarchy, preferences, states, priorities, today),
    [tasks, hierarchy, preferences, states, priorities, today],
  );
  return { hierarchy, groups };
}
