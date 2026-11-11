import CreateTaskModal from "../../home/components/CreateTaskModal";
import PublishModal from "../../home/components/PublishModal";
import { useHomeActions } from "../../home/hooks/useHomeActions";
import type { ProjectSummary } from "../../../core/interfaces/project.interface";
import TaskListIcon from "../../../shared/Icons/TaskListIcon";
import PublicationIcon from "../../../shared/Icons/PublicationIcon";

interface SectionMenuActionsProps {
  project: ProjectSummary | null;
}

export default function SectionMenuActions({
  project,
}: SectionMenuActionsProps) {
  const actions = useHomeActions(project);

  return (
    <div className="mb-1 flex flex-col gap-0.5">
      <button
        type="button"
        disabled={!project}
        onClick={() => actions.setTaskOpen(true)}
        className="badge w-full disabled:opacity-50"
      >
        <TaskListIcon className="size-4 shrink-0" />
        <span className="min-w-0 flex-1 truncate text-left">Crear tarea</span>
      </button>

      <button
        type="button"
        disabled={!project}
        onClick={() => actions.setPubOpen(true)}
        className="badge w-full disabled:opacity-50"
      >
        <PublicationIcon className="size-4 shrink-0" />
        <span className="min-w-0 flex-1 truncate text-left">
          Crear publicación
        </span>
      </button>

      {actions.isTaskOpen && project && (
        <CreateTaskModal
          projectName={project.name}
          submitting={actions.isSavingTask}
          onClose={() => actions.setTaskOpen(false)}
          onSubmit={actions.createTask}
        />
      )}

      {actions.isPubOpen && project && (
        <PublishModal
          projectName={project.name}
          submitting={actions.isSavingPublication}
          onClose={() => actions.setPubOpen(false)}
          onSubmit={actions.createPublication}
        />
      )}
    </div>
  );
}
