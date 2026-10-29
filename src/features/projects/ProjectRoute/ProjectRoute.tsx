import { useLocation, useParams } from "react-router";
import { getProjectCatalogs } from "../../../core/services/projectService";
import { useRemoteResource } from "../../../hooks/useRemoteResource";
import NotAvailable from "../../layout/NotAvailable/NotAvailable";
import ProjectWorkspace from "../ProjectWorkspace/ProjectWorkspace";
import type { ProjectCatalogs, TaskCreationRequest } from "../types";

export interface ProjectRouteProps {
  catalogs?: ProjectCatalogs;
  catalogLoading?: boolean;
  catalogError?: string;
  onRetryCatalogs?: () => void;
  taskCreationRequest?: TaskCreationRequest | null;
  onTaskCreationHandled?: (sequence: number) => void;
}

const defaultCatalogs: ProjectCatalogs = {
  areas: [],
  states: [],
  priorities: [],
};

export default function ProjectRoute({
  catalogs: propCatalogs,
  catalogLoading: propCatalogLoading = false,
  catalogError: propCatalogError = "",
  onRetryCatalogs,
  taskCreationRequest,
  onTaskCreationHandled,
}: ProjectRouteProps) {
  const { projectId } = useParams();
  const id = Number(projectId);
  const location = useLocation();
  const routedRequest = (
    location.state as { taskCreationRequest?: TaskCreationRequest } | null
  )?.taskCreationRequest;
  const creationRequest = taskCreationRequest ?? routedRequest;
  const resource = useRemoteResource(getProjectCatalogs, "project-catalogs", propCatalogs === undefined);

  if (
    !projectId ||
    !/^\d+$/.test(projectId) ||
    !Number.isSafeInteger(id) ||
    id < 1
  ) {
    return <NotAvailable />;
  }

  return (
    <ProjectWorkspace
      key={projectId}
      projectId={id}
      catalogs={propCatalogs ?? resource.value ?? defaultCatalogs}
      catalogLoading={propCatalogs ? propCatalogLoading : resource.pending}
      catalogError={propCatalogs ? propCatalogError : resource.error}
      onRetryCatalogs={onRetryCatalogs ?? resource.refetch}
      taskCreationSequence={
        creationRequest?.projectId === id ? creationRequest.sequence : undefined
      }
      onTaskCreationHandled={onTaskCreationHandled}
    />
  );
}
