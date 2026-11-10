import { useQueries } from "@tanstack/react-query";
import type { Task } from "../../../core/interfaces/task.interface";
import { getTasks } from "../../../core/services/taskService";
import { useProjects } from "../../inicio/hooks/useProjects";

export type PriorityTask = Task & { projectId: number };

export function usePriorityTasks(): PriorityTask[] {
  const { projects } = useProjects();
  const taskQueries = useQueries({
    queries: projects.map((project) => ({
      queryKey: ["tasks", project.id],
      queryFn: () => getTasks(project.id),
      staleTime: 1000 * 60 * 5,
      retry: false,
    })),
  });

  return taskQueries
    .flatMap((query, index) =>
      (query.data ?? [])
        .filter((task) => task.priority != null)
        .map((task) => ({ ...task, projectId: projects[index].id })),
    )
    .sort(
      (a, b) =>
        (a.priority ?? 0) - (b.priority ?? 0) || a.name.localeCompare(b.name),
    );
}
