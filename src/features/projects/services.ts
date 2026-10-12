import { apiRequest } from "../auth/api";
import type {
  CreateProjectPayload, CreateTaskPayload, EditTaskPayload, Project,
  ProjectCatalogs, ProjectSummary, ProjectTaskConfiguration, ProjectTaskConfigurationPayload,
  Task, TaskStatePayload, WorkerCandidate,
} from "./types";

function projectRequest<T>(path = "", options: RequestInit = {}): Promise<T> {
  return apiRequest<T>(path, options, true, "projects");
}

export function getProjects(): Promise<ProjectSummary[]> {
  return projectRequest();
}

export function getProjectCatalogs(): Promise<ProjectCatalogs> {
  return projectRequest("catalogs/");
}

export function getProject(projectId: number): Promise<Project> {
  return projectRequest(`${projectId}/`);
}

export function getTasks(projectId: number): Promise<Task[]> {
  return projectRequest(`${projectId}/tasks/`);
}

export function getProjectTaskStates(projectId: number): Promise<ProjectTaskConfiguration> {
  return projectRequest(`${projectId}/task-states/`);
}

export function configureProjectTaskStates(
  projectId: number, payload: ProjectTaskConfigurationPayload,
): Promise<ProjectTaskConfiguration> {
  return projectRequest(`${projectId}/task-states/`, { method: "PATCH", body: JSON.stringify(payload) });
}

export function getWorkerCandidates(areaIds: number[], search: string): Promise<WorkerCandidate[]> {
  const query = new URLSearchParams({ area_ids: areaIds.join(","), q: search });
  return projectRequest(`workers/?${query}`);
}

export function createProject(payload: CreateProjectPayload): Promise<Project> {
  return projectRequest("", { method: "POST", body: JSON.stringify(payload) });
}

export function createTask(projectId: number, payload: CreateTaskPayload): Promise<Task> {
  return projectRequest(`${projectId}/tasks/`, { method: "POST", body: JSON.stringify(payload) });
}

export function updateTask(projectId: number, taskId: number, payload: EditTaskPayload): Promise<Task> {
  return projectRequest(`${projectId}/tasks/${taskId}/`, { method: "PATCH", body: JSON.stringify(payload) });
}

export function changeTaskState(projectId: number, taskId: number, payload: TaskStatePayload): Promise<Task> {
  return projectRequest(`${projectId}/tasks/${taskId}/state/`, { method: "POST", body: JSON.stringify(payload) });
}

export async function changeDependency(projectId: number, taskId: number, predecessorId: number, remove: boolean): Promise<void> {
  await projectRequest(`${projectId}/tasks/${taskId}/dependencies/`, {
    method: remove ? "DELETE" : "POST",
    body: JSON.stringify({ predecessor_id: predecessorId }),
  });
}
