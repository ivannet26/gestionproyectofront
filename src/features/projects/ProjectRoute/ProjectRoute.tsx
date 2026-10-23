import { useParams } from "react-router";
import NotAvailable from "../../layout/NotAvailable/NotAvailable";
import ProjectWorkspace from "../ProjectWorkspace/ProjectWorkspace";
import type { ProjectCatalogs, TaskCreationRequest } from "../types";

export interface ProjectRouteProps {
  catalogs: ProjectCatalogs;
  taskCreationRequest?: TaskCreationRequest | null;
  onTaskCreationHandled?: (sequence: number) => void;
}

export default function ProjectRoute({
  catalogs,
  taskCreationRequest,
  onTaskCreationHandled,
}: ProjectRouteProps) {
  const { projectId } = useParams();
  const id = Number(projectId);

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
      catalogs={catalogs}
      taskCreationSequence={
        taskCreationRequest?.projectId === id
          ? taskCreationRequest.sequence
          : undefined
      }
      onTaskCreationHandled={onTaskCreationHandled}
    />
  );
}
