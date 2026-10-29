import { useEffect, useState } from "react";
import { useLocation, useParams } from "react-router";
import { getProjectCatalogs } from "../../../core/services/projectService";
import { useToast } from "../../../hooks/useToast";
import { errorText } from "../../auth/api";
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
  const { addToast } = useToast();
  const [catalogs, setCatalogs] = useState<ProjectCatalogs>(defaultCatalogs);
  const [catalogError, setCatalogError] = useState(propCatalogError);

  useEffect(() => {
    if (propCatalogs) return;
    let active = true;
    getProjectCatalogs()
      .then((data) => {
        if (active) setCatalogs(data);
      })
      .catch((err) => {
        if (active) {
          const msg = errorText(err);
          setCatalogError(msg);
          addToast({
            icon: "error",
            title: "Error al cargar catálogos",
            message: msg,
          });
        }
      });
    return () => {
      active = false;
    };
  }, [propCatalogs, addToast]);

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
      catalogs={propCatalogs ?? catalogs}
      catalogLoading={propCatalogLoading}
      catalogError={catalogError}
      onRetryCatalogs={onRetryCatalogs ?? (() => {})}
      taskCreationSequence={
        creationRequest?.projectId === id ? creationRequest.sequence : undefined
      }
      onTaskCreationHandled={onTaskCreationHandled}
    />
  );
}
