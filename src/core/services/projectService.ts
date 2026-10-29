import { httpClient } from "../api/httpClient";
import type { CursorPage } from "../interfaces/pagination.interface";
import type { ProjectArea, ProjectCatalogs, ProjectListFilters, ProjectSummary } from "../interfaces/project.interface";

export async function getProjects(filters: ProjectListFilters = {}, cursor: string | null = null, signal?: AbortSignal): Promise<CursorPage<ProjectSummary>> {
  const query = new URLSearchParams();
  if (filters.search?.trim()) query.set("search", filters.search.trim());
  for (const key of ["area_id", "project_id", "state_code", "available", "associated"] as const) {
    if (filters[key] !== undefined) query.set(key, String(filters[key]));
  }
  if (cursor) query.set("cursor", cursor);
  const response = await httpClient.get<CursorPage<ProjectSummary>>(`projects/${query.size ? "?" + query : ""}`, signal ? { signal } : undefined);
  return response.data;
}

export async function getProjectAreas(filters: Pick<ProjectListFilters, "associated"> = {}, cursor: string | null = null, signal?: AbortSignal): Promise<CursorPage<ProjectArea>> {
  const query = new URLSearchParams();
  if (filters.associated !== undefined) query.set("associated", String(filters.associated));
  if (cursor) query.set("cursor", cursor);
  const response = await httpClient.get<CursorPage<ProjectArea>>(`projects/areas/${query.size ? "?" + query : ""}`, signal ? { signal } : undefined);
  return response.data;
}

export async function getProjectCatalogs(): Promise<ProjectCatalogs> {
  const response = await httpClient.get<ProjectCatalogs>("projects/catalogs/");
  return response.data;
}
