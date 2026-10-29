import { httpClient } from "../api/httpClient";
import type {
  ProjectCatalogs,
  ProjectSummary,
} from "../interfaces/project.interface";

export async function getProjects(): Promise<ProjectSummary[]> {
  const { data } = await httpClient.get<ProjectSummary[]>("projects/");
  return data;
}

export async function getProjectCatalogs(): Promise<ProjectCatalogs> {
  const { data } = await httpClient.get<ProjectCatalogs>("projects/catalogs/");
  return data;
}
