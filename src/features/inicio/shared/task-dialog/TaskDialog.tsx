import TaskDetailController from "../task-detail/TaskDetailController";
import TaskEditDialog from "./TaskEditDialog";
import type { Task } from "../../types";
import type { ReactNode } from "react";
import Modal from "../../../../shared/Modal/Modal";
import type { TaskAction, TaskDialogController } from "../../types";
import TaskForm from "../task-form/TaskForm";
import DependencyForm from "./DependencyForm";
import TaskStateForm from "./TaskStateForm";

function dialogTitle(action: TaskAction, taskName?: string) {
  switch (action.kind) {
    case "create":
      return "Nueva tarea";
    case "child":
      return "Nueva subtarea";
    case "dependencies":
      return `Dependencias de ${taskName ?? ""}`;
    case "state":
      return "Cambiar estado";
    default:
      return "Editar datos de tarea";
  }
}

export default function TaskDialog({
  controller,
  feedback,
  onUpdated = () => undefined,
}: {
  controller: TaskDialogController;
  feedback?: ReactNode;
  onUpdated?: (task: Task) => void;
}) {
  const {
    project,
    tasks,
    catalogs,
    action,
    busy,
    close,
    saveTask,
    changeState,
    changeDependency,
    configuredStates,
  } = controller;

  if (!action) return null;

  const activeTask =
    action.kind === "create"
      ? undefined
      : tasks.find((task) => task.id === action.taskId);

  if (action.kind !== "create" && !activeTask) return null;

  if (action.kind === "detail")
    return (
      <TaskDetailController
        key={project.id + ":" + action.taskId}
        controller={controller}
        taskId={action.taskId}
        onUpdated={onUpdated}
      />
    );
  if (action.kind === "edit" && activeTask)
    return (
      <TaskEditDialog
        key={project.id + ":" + activeTask.id}
        controller={controller}
        task={activeTask}
        onUpdated={onUpdated}
        onClose={close}
      />
    );

  const composed = action.kind === "create" || action.kind === "child";

  function form() {
    if (!action) return null;

    if (action.kind === "create") {
      return (
        <TaskForm
          project={project}
          catalogs={catalogs}
          initialState={action.stateCode}
          onSubmit={saveTask}
          onConfigured={configuredStates}
          onClose={close}
        />
      );
    }

    if (!activeTask) return null;

    if (action.kind === "child") {
      return (
        <TaskForm
          project={project}
          catalogs={catalogs}
          parent={activeTask}
          onSubmit={saveTask}
          onConfigured={configuredStates}
          onClose={close}
        />
      );
    }

    if (action.kind === "state") {
      return (
        <TaskStateForm
          task={activeTask}
          states={project.task_states.states}
          onSubmit={(data) => changeState(activeTask, data)}
        />
      );
    }

    return (
      <DependencyForm
        task={activeTask}
        tasks={tasks}
        onChange={changeDependency}
      />
    );
  }

  return (
    <Modal
      busy={busy}
      title={dialogTitle(action, activeTask?.name)}
      taskComposer={composed}
      onClose={close}
    >
      {form()}
      {feedback}
    </Modal>
  );
}
