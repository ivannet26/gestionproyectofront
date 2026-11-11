import { useState } from "react";
import type { Task, TaskIdentity, TaskDialogController } from "../../types";
import TaskDetailDialog from "./TaskDetailDialog";
import TaskEditDialog from "../task-dialog/TaskEditDialog";
export default function TaskDetailController({
  controller,
  taskId,
  onUpdated,
}: {
  controller: TaskDialogController;
  taskId: number;
  onUpdated: (task: Task) => void;
}) {
  const [target, setTarget] = useState<TaskIdentity>({
    projectId: controller.project.id,
    taskId,
  });
  const [editing, setEditing] = useState<Task | null>(null);
  return (
    <>
      <TaskDetailDialog
        target={target}
        project={controller.project}
        catalogs={controller.catalogs}
        onUpdated={onUpdated}
        onNavigate={setTarget}
        onClose={controller.close}
        onEdit={setEditing}
      />
      {editing && (
        <TaskEditDialog
          key={editing.id}
          controller={controller}
          task={editing}
          onUpdated={onUpdated}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );
}
