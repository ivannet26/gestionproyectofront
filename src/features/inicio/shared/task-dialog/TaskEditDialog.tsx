import Modal from "../../../../shared/Modal/Modal";
import type { Task, TaskDialogController } from "../../types";
import TaskForm from "../task-form/TaskForm";
import CalendarEditFeedback from "../CalendarEditFeedback";
import { useTaskEdit } from "./useTaskEdit";
export default function TaskEditDialog({
  controller,
  task,
  onUpdated,
  onClose,
}: {
  controller: TaskDialogController;
  task: Task;
  onUpdated: (task: Task) => void;
  onClose: () => void;
}) {
  const edit = useTaskEdit(task, onUpdated, onClose);
  return (
    <Modal
      title="Editar datos de tarea"
      taskComposer
      busy={edit.busy}
      onClose={onClose}
    >
      <TaskForm
        project={controller.project}
        catalogs={controller.catalogs}
        task={task}
        parent={controller.tasks.find((item) => item.id === task.parent_id)}
        onSubmit={edit.save}
        onClose={onClose}
        onConfigured={controller.configuredStates}
      />
      <CalendarEditFeedback editor={edit.editor} busy={edit.busy} />
    </Modal>
  );
}
