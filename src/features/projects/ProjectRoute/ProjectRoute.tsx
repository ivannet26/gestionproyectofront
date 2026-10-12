import { useParams } from "react-router";
import NotAvailable from "../../layout/NotAvailable/NotAvailable";
import type { ProjectCatalogs, TaskCreationRequest } from "../types";
import ProjectWorkspace from "../ProjectWorkspace/ProjectWorkspace";

export interface ProjectRouteProps {
  catalogs: ProjectCatalogs;
  catalogLoading: boolean;
  catalogError: string;
  taskCreationRequest?: TaskCreationRequest | null;
  onTaskCreationHandled?: (sequence: number) => void;
}

export default function ProjectRoute({
  catalogs, catalogLoading, catalogError, taskCreationRequest, onTaskCreationHandled,
}: ProjectRouteProps) {
  const { projectId } = useParams();
  const id = Number(projectId);
  if (!projectId || !/^\d+$/.test(projectId) || !Number.isSafeInteger(id) || id < 1) return <NotAvailable />;
  if (catalogLoading) return <main className="dashboard" id="main-content"><p role="status">Cargando catálogos…</p></main>;
  if (catalogError) return <main className="dashboard" id="main-content">
    <p className="form-message form-message--error" role="alert">{catalogError}</p>
  </main>;
  return <ProjectWorkspace key={projectId} projectId={id} catalogs={catalogs}
    taskCreationSequence={taskCreationRequest?.projectId === id ? taskCreationRequest.sequence : undefined}
    onTaskCreationHandled={onTaskCreationHandled} />;
}
