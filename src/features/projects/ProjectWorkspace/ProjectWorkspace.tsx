import type { ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";

import { errorText } from "../../auth/api";
<<<<<<< HEAD
import DashboardSection from "../../dashboard/DashboardSection/DashboardSection";
=======
>>>>>>> 331bd8aac01bb01bd27cb5de894aadc6824d9591
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
<<<<<<< HEAD
=======

>>>>>>> 331bd8aac01bb01bd27cb5de894aadc6824d9591
import DependencyForm from "../DependencyForm/DependencyForm";
import LabelList from "../LabelList/LabelList";
import Modal from "../Modal/Modal";
import TaskForm from "../TaskForm/TaskForm";
import TaskList from "../TaskList/TaskList";
import { formatTaskDate } from "../TaskList/taskHierarchy";
import TaskStateForm from "../TaskStateForm/TaskStateForm";

const styles = {
  detail: "grid gap-4 [&_h2]:m-0 [&_h2]:text-[1.125rem] [&_h2]:[overflow-wrap:anywhere] [&_p]:m-0 [&_p]:whitespace-pre-wrap [&_p]:[overflow-wrap:anywhere] [&_dl]:grid [&_dl]:grid-cols-[120px_1fr] [&_dl]:gap-3 [&_dl]:text-[0.875rem] [&_dt]:[color:var(--color-text-muted)] [&_dd]:m-0 [&_dd]:[overflow-wrap:anywhere]",
  detailActions: "flex flex-wrap gap-2 [&_button]:px-3 [&_button]:py-2 [&_button]:[border:1px_solid_var(--color-border)] [&_button]:[border-radius:var(--radius-small)] [&_button]:[background:var(--color-surface-soft)] [&_button]:[color:var(--color-text)] [&_button]:cursor-pointer",
  tabs: "flex gap-6 [&_a]:px-0.5 [&_a]:py-2.5 [&_a]:border-b-2 [&_a]:border-transparent [&_a]:no-underline [&_a]:[color:var(--color-text-muted)] [&_a]:text-[0.8125rem] [&_a[aria-current=page]]:[border-color:var(--color-heading)] [&_a[aria-current=page]]:[color:var(--color-heading)] [&_a[aria-current=page]]:font-semibold [&_a:hover]:[color:var(--color-heading)] [&_a:hover]:[background:var(--color-surface-soft)] [&_a:focus-visible]:[outline:2px_solid_var(--color-focus)] [&_a:focus-visible]:outline-offset-[-2px]",
  pending: "px-6 py-10 [&_h2]:text-[1.125rem] [&_p]:text-[0.875rem] [&_p]:[color:var(--color-text-muted)]",
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
<<<<<<< HEAD
=======
  catalogLoading,
  catalogError,
  onRetryCatalogs,
>>>>>>> 331bd8aac01bb01bd27cb5de894aadc6824d9591
  taskCreationSequence,
  onTaskCreationHandled,
}: ProjectWorkspaceProps) {
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [creationError, setCreationError] = useState("");
  const [action, setAction] = useState<TaskAction | null>(null);
  const [busy, setBusy] = useState(false);
<<<<<<< HEAD
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
        if (current) setError(errorText(failure));
      })
      .finally(() => {
        if (current) setLoading(false);
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
    )
      return;
=======
  const [searchParams] = useSearchParams();

  const view = searchParams.get("vista") ?? "lista";
  const handledCreation = useRef<number | undefined>(undefined);

  const loadTasks = useCallback(async () => {
    setTasks(await getTasks(projectId));
  }, [projectId]);

  useEffect(() => {
>>>>>>> 331bd8aac01bb01bd27cb5de894aadc6824d9591
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
<<<<<<< HEAD
=======

>>>>>>> 331bd8aac01bb01bd27cb5de894aadc6824d9591
    return () => {
      current = false;
    };
  }, [project, taskCreationSequence, onTaskCreationHandled]);

  const activeTask =
    action && action.kind !== "create"
      ? tasks.find((task) => task.id === action.taskId)
      : undefined;
<<<<<<< HEAD
  const activeAction =
    action !== null && (action.kind === "create" || activeTask !== undefined);
  const title =
    action?.kind === "create"
      ? "Nueva tarea"
      : action?.kind === "child"
        ? `Nueva subtarea de ${activeTask?.name ?? ""}`
        : action?.kind === "dependencies"
          ? `Dependencias de ${activeTask?.name ?? ""}`
          : action?.kind === "state"
            ? "Cambiar estado"
            : "Editar datos de tarea";

  async function refreshAfterMutation(success: string) {
    setMessage(success);
    try {
      await loadTasks();
    } catch (failure) {
      setMessage(
        `${success}. No se pudo actualizar la lista: ${errorText(failure)}`,
      );
    }
=======

  const activeAction =
    action !== null &&
    (action.kind === "create" || activeTask !== undefined);

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
>>>>>>> 331bd8aac01bb01bd27cb5de894aadc6824d9591
  }

  async function save(data: TaskFormPayload) {
    setBusy(true);

    try {
<<<<<<< HEAD
      if (action?.kind === "edit" && activeTask && !("state_code" in data)) {
        await updateTask(projectId, activeTask.id, data);
=======
      if (
        action?.kind === "edit" &&
        activeTask &&
        !("state_code" in data)
      ) {
        acceptTask(await updateTask(projectId, activeTask.id, data));
>>>>>>> 331bd8aac01bb01bd27cb5de894aadc6824d9591
      } else if (
        (action?.kind === "create" || action?.kind === "child") &&
        "state_code" in data
      ) {
<<<<<<< HEAD
        await createTask(projectId, data);
=======
        acceptTask(await createTask(projectId, data));
>>>>>>> 331bd8aac01bb01bd27cb5de894aadc6824d9591
      } else {
        throw new Error(
          "La acción ya no está disponible. Vuelve a abrir el formulario.",
        );
      }
<<<<<<< HEAD
      setAction(null);
      await refreshAfterMutation("Tarea guardada");
=======

      setAction(null);
>>>>>>> 331bd8aac01bb01bd27cb5de894aadc6824d9591
    } finally {
      setBusy(false);
    }
  }

  async function state(data: TaskStatePayload) {
<<<<<<< HEAD
    if (!activeTask || action?.kind !== "state")
      throw new Error("La tarea ya no está disponible.");
=======
    if (!activeTask || action?.kind !== "state") {
      throw new Error("La tarea ya no está disponible.");
    }

>>>>>>> 331bd8aac01bb01bd27cb5de894aadc6824d9591
    setBusy(true);

    try {
      acceptTask(await changeTaskState(projectId, activeTask.id, data));
      setAction(null);
<<<<<<< HEAD
      await refreshAfterMutation("Estado actualizado");
=======
>>>>>>> 331bd8aac01bb01bd27cb5de894aadc6824d9591
    } finally {
      setBusy(false);
    }
  }

  async function dependency(id: number, remove: boolean) {
<<<<<<< HEAD
    if (!activeTask || action?.kind !== "dependencies")
      throw new Error("La tarea ya no está disponible.");
=======
    if (!activeTask || action?.kind !== "dependencies") {
      throw new Error("La tarea ya no está disponible.");
    }

>>>>>>> 331bd8aac01bb01bd27cb5de894aadc6824d9591
    setBusy(true);

    try {
      await changeDependency(projectId, activeTask.id, id, remove);
<<<<<<< HEAD
      await refreshAfterMutation(
=======

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

      setMessage(
>>>>>>> 331bd8aac01bb01bd27cb5de894aadc6824d9591
        remove ? "Dependencia retirada" : "Dependencia agregada",
      );
    } finally {
      setBusy(false);
    }
  }

  function configured(configuration: ProjectTaskConfiguration) {
    setProject((current) =>
      current ? { ...current, task_states: configuration } : current,
    );
    setMessage("Estados del proyecto actualizados");

    void loadTasks().catch((failure: unknown) => {
      setMessage(
        `Estados guardados. No se pudo actualizar la lista: ${errorText(failure)}`,
      );
    });
  }

  function actionForm(currentProject: Project): ReactNode {
<<<<<<< HEAD
    if (!action) return null;
    if (action.kind === "create")
=======
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
>>>>>>> 331bd8aac01bb01bd27cb5de894aadc6824d9591
      return (
        <TaskForm
          project={currentProject}
          catalogs={catalogs}
<<<<<<< HEAD
=======
          initialState={action.stateCode}
>>>>>>> 331bd8aac01bb01bd27cb5de894aadc6824d9591
          onSubmit={save}
          onConfigured={configured}
          onClose={() => setAction(null)}
        />
      );
<<<<<<< HEAD
    if (!activeTask) return null;
    switch (action.kind) {
=======
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
              <dd>{activeTask.responsible_name ?? "Sin responsable"}</dd>

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

>>>>>>> 331bd8aac01bb01bd27cb5de894aadc6824d9591
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
<<<<<<< HEAD
=======

>>>>>>> 331bd8aac01bb01bd27cb5de894aadc6824d9591
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
<<<<<<< HEAD
=======

>>>>>>> 331bd8aac01bb01bd27cb5de894aadc6824d9591
      case "state":
        return (
          <TaskStateForm
            task={activeTask}
            states={currentProject.task_states.states}
            onSubmit={state}
          />
        );
<<<<<<< HEAD
=======

>>>>>>> 331bd8aac01bb01bd27cb5de894aadc6824d9591
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

<<<<<<< HEAD
  if (loading)
    return (
      <main className="min-h-screen  text-neutral-900 p-6" id="main-content">
=======
  if (loading) {
    return (
      <main
        className="min-h-screen bg-neutral-50 p-6 text-neutral-900"
        id="main-content"
      >
>>>>>>> 331bd8aac01bb01bd27cb5de894aadc6824d9591
        <p role="status" className="text-sm text-neutral-600">
          Cargando proyecto…
        </p>
      </main>
    );
<<<<<<< HEAD
  if (error || !project)
    return (
      <main className="min-h-screen  text-neutral-900 p-6" id="main-content">
        <p
          className="border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 shadow-none"
=======
  }

  if (error || !project) {
    return (
      <main
        className="min-h-screen bg-neutral-50 p-6 text-neutral-900"
        id="main-content"
      >
        <p
          className="border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900"
>>>>>>> 331bd8aac01bb01bd27cb5de894aadc6824d9591
          role="alert"
        >
          {error || "Proyecto no disponible"}
        </p>
        <Link
          to="/proyectos"
<<<<<<< HEAD
          className="text-sm text-neutral-600 font-semibold"
=======
          className="text-sm font-semibold text-neutral-600"
>>>>>>> 331bd8aac01bb01bd27cb5de894aadc6824d9591
        >
          Volver a proyectos
        </Link>
      </main>
    );
<<<<<<< HEAD

  return (
    <main className="min-h-screen  text-neutral-900 p-6" id="main-content">
      <header className="flex flex-wrap items-end justify-between gap-4 mb-6">
=======
  }

  return (
    <main
      className="min-h-screen bg-neutral-50 p-6 text-neutral-900"
      id="main-content"
    >
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
>>>>>>> 331bd8aac01bb01bd27cb5de894aadc6824d9591
        <div className="min-w-0 max-w-3xl">
          <nav
            className="text-xs text-neutral-600"
            aria-label="Ruta de navegación"
          >
<<<<<<< HEAD
            <ol className="flex flex-wrap gap-2 m-0 p-0 list-none">
=======
            <ol className="m-0 flex list-none flex-wrap gap-2 p-0">
>>>>>>> 331bd8aac01bb01bd27cb5de894aadc6824d9591
              <li>
                <Link to="/proyectos" className="text-neutral-600">
                  G. Proyectos
                </Link>
              </li>
              <li aria-current="page" className="text-neutral-900">
                {project.name}
              </li>
            </ol>
<<<<<<< HEAD
          </nav>
          <h1 className="m-0 mt-1 text-xl font-semibold text-neutral-900">
            {project.name}
          </h1>
          <p className="m-0 mt-1 text-sm text-neutral-600">
            {project.description}
          </p>
          <p className="m-0 mt-1 text-xs text-neutral-600">
            {project.areas.map((area) => area.name).join(" · ")} ·{" "}
            {project.available
              ? "Disponible dentro del sistema"
              : "Con participantes asignados"}
          </p>
          <p className="m-0 mt-1 text-xs text-neutral-600">
            {project.start_date ?? "Sin fecha inicial"} —{" "}
            {project.end_date ?? "Sin fecha final"}
          </p>
        </div>
        {project.permissions.create_tasks && (
          <button
            className="px-4 py-2 bg-neutral-900 text-white text-sm shadow-none disabled:opacity-50 disabled:cursor-not-allowed"
            type="button"
            disabled={busy}
            onClick={() => {
              setMessage("");
              setAction({ kind: "create" });
            }}
          >
            + Nueva tarea
          </button>
        )}
      </header>
      {message && (
        <p
          className="border border-neutral-200  px-3 py-2 text-sm text-neutral-900 shadow-none"
=======
          </nav>

          <h1 className="m-0 mt-1 text-xl font-semibold text-neutral-900">
            {project.name}
          </h1>
          <p className="m-0 mt-1 text-sm text-neutral-600">
            {project.description}
          </p>
          <p className="m-0 mt-1 text-xs text-neutral-600">
            {project.areas.map((area) => area.name).join(" · ")} ·{" "}
            {project.available
              ? "Disponible dentro del sistema"
              : "Con participantes asignados"}
          </p>
          <p className="m-0 mt-1 text-xs text-neutral-600">
            {project.start_date ?? "Sin fecha inicial"} —{" "}
            {project.end_date ?? "Sin fecha final"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          {project.permissions.create_tasks && (
            <button
              className="bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
              type="button"
              disabled={busy}
              onClick={() => {
                setMessage("");
                setAction({ kind: "create" });
              }}
            >
              + Nueva tarea
            </button>
          )}

          <nav className={styles.tabs} aria-label="Vistas del proyecto">
            {(
              [
                ["lista", "Lista"],
                ["tablero", "Tablero"],
                ["gantt", "Gantt"],
              ] as const
            ).map(([key, label]) => (
              <Link
                key={key}
                to={`?vista=${key}`}
                aria-current={view === key ? "page" : undefined}
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      {message && (
        <p
          className="border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm"
>>>>>>> 331bd8aac01bb01bd27cb5de894aadc6824d9591
          role="status"
        >
          {message}
        </p>
      )}
<<<<<<< HEAD
      {creationError && (
        <p
          className="border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 shadow-none"
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
      <DashboardSection
        title="Lista de trabajo"
        description={`${tasks.length} tareas y subtareas visibles`}
      >
        <div className="p-5 min-w-0 max-sm:p-3">
          {tasks.length > 0 ? (
            <TaskTree
              tasks={tasks}
              catalogs={catalogs}
              onAction={(kind, taskId) => {
                setMessage("");
                setAction({ kind, taskId });
              }}
            />
          ) : (
            <p className="m-0 text-sm text-neutral-600">
              No hay tareas disponibles para tu asignación.{" "}
              {project.permissions.create_tasks &&
                "Crea la primera tarea para comenzar."}
            </p>
          )}
        </div>
      </DashboardSection>
      {action && !activeAction && (
        <p
          className="border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 shadow-none"
=======

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
        className="mt-6 border border-neutral-200 bg-white"
        aria-label="Lista de trabajo"
      >
        <header className="border-b border-neutral-200 px-5 py-4">
          <h2 className="m-0 text-base font-semibold text-neutral-900">
            Lista de trabajo
          </h2>
          <p className="m-0 mt-1 text-sm text-neutral-600">
            {tasks.length} tareas y subtareas visibles
          </p>
        </header>

        <div className="min-w-0 p-5 max-sm:p-3">
          {tasks.length > 0 ? (
            <TaskList
              project={project}
              tasks={tasks}
              catalogs={catalogs}
              onAction={(kind, taskId) => {
                setMessage("");
                setAction({ kind, taskId });
              }}
              onCreate={(stateCode) => {
                setMessage("");
                setAction({ kind: "create", stateCode });
              }}
              onPatch={async (task, data) => {
                acceptTask(await updateTask(projectId, task.id, data));
              }}
              onState={async (task, data) => {
                acceptTask(
                  await changeTaskState(projectId, task.id, data),
                );
              }}
            />
          ) : (
            <p className="m-0 text-sm text-neutral-600">
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
>>>>>>> 331bd8aac01bb01bd27cb5de894aadc6824d9591
          role="alert"
        >
          La tarea ya no está disponible. Vuelve a seleccionar una tarea de la
          lista.
        </p>
      )}
<<<<<<< HEAD
      {activeAction && (
        <Modal busy={busy} title={title} onClose={() => setAction(null)}>
=======

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
>>>>>>> 331bd8aac01bb01bd27cb5de894aadc6824d9591
          {actionForm(project)}
        </Modal>
      )}
    </main>
  );
}
