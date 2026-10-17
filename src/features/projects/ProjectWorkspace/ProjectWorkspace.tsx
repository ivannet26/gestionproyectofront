import type { ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { errorText } from "../../auth/api";
import {
  changeDependency,
  changeTaskState,
  createTask,
  getProject,
  getTasks,
  updateTask,
} from "../services";
import type {
  Project,
  ProjectCatalogs,
  ProjectTaskConfiguration,
  Task,
  TaskAction,
  TaskFormPayload,
  TaskStatePayload,
} from "../types";

import DependencyForm from "../DependencyForm/DependencyForm";
import LabelList from "../LabelList/LabelList";
import Modal from "../Modal/Modal";
import TaskForm from "../TaskForm/TaskForm";
import TaskList from "../TaskList/TaskList";
import { formatTaskDate } from "../TaskList/taskHierarchy";
import TaskStateForm from "../TaskStateForm/TaskStateForm";
import ProjectHeader from "./ProjectHeader";
import { taskAssignees } from "../taskAssignees";
import TaskStatusConfiguration from "../TaskStatusConfiguration/TaskStatusConfiguration";

const styles = {
  detail:
    "grid gap-4 [&_h2]:m-0 [&_h2]:text-[1.125rem] [&_h2]:[overflow-wrap:anywhere] [&_p]:m-0 [&_p]:whitespace-pre-wrap [&_p]:[overflow-wrap:anywhere] [&_dl]:grid [&_dl]:grid-cols-[120px_1fr] [&_dl]:gap-3 [&_dl]:text-[0.875rem] [&_dt]:[color:var(--color-text-muted)] [&_dd]:m-0 [&_dd]:[overflow-wrap:anywhere]",
  detailActions:
    "flex flex-wrap gap-2 [&_button]:px-3 [&_button]:py-2 [&_button]:[border:1px_solid_var(--color-border)] [&_button]:[border-radius:var(--radius-small)] [&_button]:[background:var(--color-surface-soft)] [&_button]:[color:var(--color-text)] [&_button]:cursor-pointer",
  pending:
    "px-6 py-10 [&_h2]:text-[1.125rem] [&_p]:text-[0.875rem] [&_p]:[color:var(--color-text-muted)]",
};

interface ProjectWorkspaceProps {
  projectId: number;
  catalogs: ProjectCatalogs;
  catalogLoading: boolean;
  catalogError: string;
  onRetryCatalogs: () => void;
  taskCreationSequence?: number;
  onTaskCreationHandled?: (sequence: number) => void;
}

export default function ProjectWorkspace({
  projectId,
  catalogs,

  catalogLoading,
  catalogError,
  onRetryCatalogs,
  taskCreationSequence,
  onTaskCreationHandled,
}: ProjectWorkspaceProps) {
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [refreshError, setRefreshError] = useState("");
  const [creationError, setCreationError] = useState("");
  const [action, setAction] = useState<TaskAction | null>(null);
  const [busy, setBusy] = useState(false);
  const [configuringStates, setConfiguringStates] = useState(false);
  const [searchParams] = useSearchParams();

  const view = searchParams.get("vista") ?? "lista";
  const handledCreation = useRef<number | undefined>(undefined);

  const loadTasks = useCallback(async () => {
    setTasks(await getTasks(projectId));
  }, [projectId]);

  useEffect(() => {
    let current = true;

    void Promise.all([getProject(projectId), getTasks(projectId)])
      .then(([details, items]) => {
        if (current) {
          setProject(details);
          setTasks(items);
        }
      })
      .catch((failure: unknown) => {
        if (current) {
          setError(errorText(failure));
        }
      })
      .finally(() => {
        if (current) {
          setLoading(false);
        }
      });

    return () => {
      current = false;
    };
  }, [projectId]);

  useEffect(() => {
    if (
      !project ||
      taskCreationSequence === undefined ||
      handledCreation.current === taskCreationSequence
    ) {
      return;
    }

    let current = true;

    void Promise.resolve().then(() => {
      if (!current) {
        return;
      }

      handledCreation.current = taskCreationSequence;

      if (project.permissions.create_tasks) {
        setCreationError("");
        setMessage("");
        setAction({ kind: "create" });
      } else {
        setCreationError(
          "No tienes permiso efectivo para crear tareas en este proyecto.",
        );
      }

      onTaskCreationHandled?.(taskCreationSequence);
    });

    return () => {
      current = false;
    };
  }, [project, taskCreationSequence, onTaskCreationHandled]);

  const activeTask =
    action && action.kind !== "create"
      ? tasks.find((task) => task.id === action.taskId)
      : undefined;

  const activeAction =
    action !== null && (action.kind === "create" || activeTask !== undefined);

  const title =
    action?.kind === "create"
      ? "Nueva tarea"
      : action?.kind === "child"
        ? "Nueva subtarea"
        : action?.kind === "dependencies"
          ? `Dependencias de ${activeTask?.name ?? ""}`
          : action?.kind === "state"
            ? "Cambiar estado"
            : action?.kind === "detail"
              ? "Detalle de tarea"
              : "Editar datos de tarea";

  function acceptTask(saved: Task) {
    setTasks((current) =>
      current.some((task) => task.id === saved.id)
        ? current.map((task) => (task.id === saved.id ? saved : task))
        : [...current, saved],
    );
    setMessage(`Guardado: ${saved.name}`);
  }

  async function save(data: TaskFormPayload) {
    setBusy(true);

    try {
      if (action?.kind === "edit" && activeTask && !("state_code" in data)) {
        acceptTask(await updateTask(projectId, activeTask.id, data));
      } else if (
        (action?.kind === "create" || action?.kind === "child") &&
        "state_code" in data
      ) {
        acceptTask(await createTask(projectId, data));
      } else {
        throw new Error(
          "La acción ya no está disponible. Vuelve a abrir el formulario.",
        );
      }

      setAction(null);
    } finally {
      setBusy(false);
    }
  }

  async function state(data: TaskStatePayload) {
    if (!activeTask || action?.kind !== "state") {
      throw new Error("La tarea ya no está disponible.");
    }

    setBusy(true);

    try {
      acceptTask(await changeTaskState(projectId, activeTask.id, data));
      setAction(null);
    } finally {
      setBusy(false);
    }
  }

  async function dependency(id: number, remove: boolean) {
    if (!activeTask || action?.kind !== "dependencies") {
      throw new Error("La tarea ya no está disponible.");
    }
    setBusy(true);

    try {
      await changeDependency(projectId, activeTask.id, id, remove);

      setTasks((current) =>
        current.map((task) =>
          task.id === activeTask.id
            ? {
                ...task,
                dependencies: remove
                  ? task.dependencies.filter((item) => item !== id)
                  : [...task.dependencies, id],
              }
            : task,
        ),
      );

      setMessage(remove ? "Dependencia retirada" : "Dependencia agregada");
    } finally {
      setBusy(false);
    }
  }

  function configured(configuration: ProjectTaskConfiguration) {
    setProject((current) =>
      current ? { ...current, task_states: configuration } : current,
    );
    setMessage("Estados del proyecto actualizados");
    setRefreshError("");

    void loadTasks().catch((failure: unknown) => {
      setRefreshError(
        `Estados guardados. No se pudo actualizar la lista: ${errorText(failure)}`,
      );
    });
  }

  function actionForm(currentProject: Project): ReactNode {
    if (!action) {
      return null;
    }

    if (
      action.kind === "create" ||
      action.kind === "edit" ||
      action.kind === "child"
    ) {
      if (catalogError) {
        return (
          <>
            <p role="alert">{catalogError}</p>
            <button type="button" onClick={onRetryCatalogs}>
              Reintentar catálogos
            </button>
          </>
        );
      }

      if (catalogLoading) {
        return <p role="status">Cargando catálogos…</p>;
      }
    }

    if (action.kind === "create") {
      return (
        <TaskForm
          project={currentProject}
          catalogs={catalogs}
          initialState={action.stateCode}
          onSubmit={save}
          onConfigured={configured}
          onClose={() => setAction(null)}
        />
      );
    }

    if (!activeTask) {
      return null;
    }

    switch (action.kind) {
      case "detail":
        return (
          <div className={styles.detail}>
            <h2>{activeTask.name}</h2>
            <p>{activeTask.description || "Sin descripción"}</p>

            <dl>
              <dt>Estado</dt>
              <dd>{activeTask.state_name}</dd>

              <dt>Responsable</dt>
              <dd>{taskAssignees(activeTask).map((person) => person.name).join(", ") || "Sin persona asignada"}</dd>

              <dt>Inicio</dt>
              <dd>{formatTaskDate(activeTask.start_date)}</dd>

              <dt>Fecha límite</dt>
              <dd>{formatTaskDate(activeTask.due_date)}</dd>

              <dt>Prioridad</dt>
              <dd>
                {catalogs.priorities.find(
                  (item) => item.code === activeTask.priority,
                )?.name ?? activeTask.priority}
              </dd>
            </dl>

            <LabelList labels={activeTask.labels} />

            <div className={styles.detailActions}>
              {activeTask.permissions.edit && (
                <button
                  type="button"
                  onClick={() =>
                    setAction({ kind: "edit", taskId: activeTask.id })
                  }
                >
                  Editar datos
                </button>
              )}

              {activeTask.permissions.state && (
                <button
                  type="button"
                  onClick={() =>
                    setAction({ kind: "state", taskId: activeTask.id })
                  }
                >
                  Cambiar estado
                </button>
              )}

              {activeTask.permissions.create_child && (
                <button
                  type="button"
                  onClick={() =>
                    setAction({ kind: "child", taskId: activeTask.id })
                  }
                >
                  Nueva subtarea
                </button>
              )}
            </div>
          </div>
        );

      case "edit":
        return (
          <TaskForm
            project={currentProject}
            catalogs={catalogs}
            task={activeTask}
            onSubmit={save}
            onConfigured={configured}
            onClose={() => setAction(null)}
          />
        );
      case "child":
        return (
          <TaskForm
            project={currentProject}
            catalogs={catalogs}
            parent={activeTask}
            onSubmit={save}
            onConfigured={configured}
            onClose={() => setAction(null)}
          />
        );
      case "state":
        return (
          <TaskStateForm
            task={activeTask}
            states={currentProject.task_states.states}
            onSubmit={state}
          />
        );

      case "dependencies":
        return (
          <DependencyForm
            task={activeTask}
            tasks={tasks}
            onChange={dependency}
          />
        );
    }
  }

  if (loading) {
    return (
      <main
        className="min-h-screen bg-neutral-50 p-6 text-neutral-900"
        id="main-content"
      >
        <p role="status" className="text-sm text-neutral-600">
          Cargando proyecto…
        </p>
      </main>
    );
  }

  if (error || !project) {
    return (
      <main
        className="min-h-screen bg-neutral-50 p-6 text-neutral-900"
        id="main-content"
      >
        <p
          className="border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900"
          role="alert"
        >
          {error || "Proyecto no disponible"}
        </p>
        <Link to="/proyectos" className="text-sm text-neutral-600">
          Volver a proyectos
        </Link>
      </main>
    );
  }

  return (
    <main
      className="min-h-screen min-w-0 bg-neutral-50 p-3 text-neutral-900 sm:p-6 sm:pt-3"
      id="main-content"
    >
      <ProjectHeader
        key={project.id}
        project={project}
        view={view}
        busy={busy}
        taskCount={tasks.length}
        onCreateTask={() => {
          setMessage("");
          setAction({ kind: "create" });
        }}
      />

      <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">{message}</p>

      {refreshError && (
        <p
          className="border border-red-200 bg-white px-3 py-2 text-sm"
          role="alert"
        >
          {refreshError}
        </p>
      )}

      {catalogError && !activeAction && (
        <div>
          <p
            className="border border-red-200 bg-white px-3 py-2 text-sm"
            role="alert"
          >
            Catálogos: {catalogError}
          </p>
          <button type="button" onClick={onRetryCatalogs}>
            Reintentar catálogos
          </button>
        </div>
      )}

      {creationError && (
        <p
          className="border border-red-200 bg-white px-3 py-2 text-sm"
          role="alert"
        >
          {creationError}
        </p>
      )}

      {project.requirements.length > 0 && (
        <section aria-label="Requisitos existentes del proyecto">
          <LabelList labels={project.requirements} />
        </section>
      )}

      <section
        className="mt-3 border border-neutral-200 bg-white"
        aria-label="Lista de trabajo"
      >
        <h2 className="sr-only">Lista de trabajo</h2>

        <div className="min-w-0">
          {tasks.length > 0 || view === "lista" ? (
            <TaskList
              key={project.id}
              project={project}
              tasks={tasks}
              catalogs={catalogs}
              onConfigure={() => setConfiguringStates(true)}
              onAction={(kind, taskId) => {
                setMessage("");
                setAction({ kind, taskId });
              }}
              onCreated={acceptTask}
              onPatch={async (task, data) => {
                acceptTask(await updateTask(projectId, task.id, data));
              }}
              onState={async (task, data) => {
                acceptTask(await changeTaskState(projectId, task.id, data));
              }}
            />
          ) : (
            <p className="m-0 p-3 text-sm text-neutral-600 sm:p-5">
              No hay tareas disponibles para tu asignación.{" "}
              {project.permissions.create_tasks &&
                "Crea la primera tarea para comenzar."}
            </p>
          )}
        </div>
      </section>

      {view !== "lista" && (
        <section
          className={styles.pending}
          aria-label={view === "tablero" ? "Tablero" : "Gantt"}
        >
          <h2>
            {view === "tablero"
              ? "Tablero"
              : view === "gantt"
                ? "Gantt"
                : "Vista no disponible"}
          </h2>
          <p>
            Esta vista está pendiente de implementación. Puedes gestionar las
            tareas en Lista.
          </p>
          <Link to="?vista=lista">Volver a Lista</Link>
        </section>
      )}

      {action && !activeAction && (
        <p
          className="border border-neutral-200 bg-white px-3 py-2 text-sm"
          role="alert"
        >
          La tarea ya no está disponible. Vuelve a seleccionar una tarea de la
          lista.
        </p>
      )}

      {configuringStates && <TaskStatusConfiguration project={project} onConfigured={configured} onClose={() => setConfiguringStates(false)} />}
      {activeAction && (
        <Modal
          busy={busy}
          title={title}
          taskComposer={
            action?.kind === "create" ||
            action?.kind === "edit" ||
            action?.kind === "child"
          }
          onClose={() => setAction(null)}
        >
          {actionForm(project)}
        </Modal>
      )}
    </main>
  );
}
