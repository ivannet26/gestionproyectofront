import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Task } from "../../../core/interfaces/task.interface";
import { getTasks } from "../../../core/services/taskService";
import { sessionVersion } from "../../auth/api";
import { StaleTaskResponse } from "../utils/useTaskSync";
import { errorText } from "../../auth/api";
import { useToast } from "../../../hooks/useToast";
import { reconcileTasks } from "../utils/taskCollection";

export function useProjectTasks(projectId: number) {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  const {
    data: tasks = [],
    isFetching,
    error,
  } = useQuery<Task[]>({
    queryKey: ["tasks", projectId],
    queryFn: async () => {
      const epoch = sessionVersion();
      const before = queryClient.getQueryData<Task[]>(["tasks", projectId]);
      try {
        const incoming = await getTasks(projectId);
        if (epoch !== sessionVersion()) throw new StaleTaskResponse();
        const current = queryClient.getQueryData<Task[]>(["tasks", projectId]);
        return reconcileTasks(current ?? [], incoming, current === before);
      } catch (err) {
        if (epoch !== sessionVersion()) throw err;
        addToast({
          icon: "error",
          title: "Error al cargar tareas",
          message: errorText(err),
        });
        throw err;
      }
    },
    enabled: Number.isSafeInteger(projectId) && projectId > 0,
    staleTime: 1000 * 60 * 5,
  });

  const setTasks = useCallback(
    (updater: Task[] | ((current: Task[]) => Task[])) => {
      void queryClient.invalidateQueries({
        queryKey: ["projectCharts", projectId],
      });
      queryClient.setQueryData<Task[]>(["tasks", projectId], (old = []) => {
        return typeof updater === "function" ? updater(old) : updater;
      });
    },
    [queryClient, projectId],
  );

  const acceptTask = useCallback(
    (saved: Task) => {
      setTasks((current) => reconcileTasks(current, [saved]));
    },
    [setTasks],
  );

  const refetch = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["tasks", projectId] });
  }, [queryClient, projectId]);

  return {
    tasks,
    loading: isFetching,
    error: error ? errorText(error) : "",
    setTasks,
    refetch,
    acceptTask,
  };
}
