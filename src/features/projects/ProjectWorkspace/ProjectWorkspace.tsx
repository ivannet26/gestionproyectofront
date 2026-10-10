import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Link } from "react-router";
import { errorText } from "../../auth/api";
import DashboardSection from "../../dashboard/DashboardSection/DashboardSection";
import { changeDependency, changeTaskState, createTask, getProject, getTasks, updateTask } from "../services";
import type { Project, ProjectCatalogs, ProjectTaskConfiguration, Task, TaskAction, TaskFormPayload, TaskStatePayload } from "../types";
import DependencyForm from "../DependencyForm/DependencyForm";
import LabelList from "../LabelList/LabelList";
import Modal from "../Modal/Modal";
import TaskForm from "../TaskForm/TaskForm";
import TaskStateForm from "../TaskStateForm/TaskStateForm";
import TaskTree from "../TaskTree/TaskTree";
import styles from "./ProjectWorkspace.module.css";

interface ProjectWorkspaceProps {
  projectId: number;
  catalogs: ProjectCatalogs;
  taskCreationSequence?: number;
  onTaskCreationHandled?: (sequence: number) => void;
}

export default function ProjectWorkspace({
  projectId, catalogs, taskCreationSequence, onTaskCreationHandled,
}: ProjectWorkspaceProps) {
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [creationError, setCreationError] = useState("");
  const [action, setAction] = useState<TaskAction | null>(null);
  const [busy, setBusy] = useState(false);
  const handledCreation = useRef<number | undefined>(undefined);
  const loadTasks = useCallback(async () => { setTasks(await getTasks(projectId)); }, [projectId]);

  useEffect(() => {
    let current = true;
    void Promise.all([getProject(projectId), getTasks(projectId)])
      .then(([details, items]) => { if (current) { setProject(details); setTasks(items); } })
      .catch((failure: unknown) => { if (current) setError(errorText(failure)); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [projectId]);

  useEffect(() => {
    if (!project || taskCreationSequence === undefined || handledCreation.current === taskCreationSequence) return;
    let current = true;
    void Promise.resolve().then(() => {
      if (!current) return;
      handledCreation.current = taskCreationSequence;
      if (project.permissions.create_tasks) {
        setCreationError("");
        setMessage("");
        setAction({ kind: "create" });
      } else {
        setCreationError("No tienes permiso efectivo para crear tareas en este proyecto.");
      }
      onTaskCreationHandled?.(taskCreationSequence);
    });
    return () => { current = false; };
  }, [project, taskCreationSequence, onTaskCreationHandled]);

  const activeTask = action && action.kind !== "create" ? tasks.find((task) => task.id === action.taskId) : undefined;
  const activeAction = action !== null && (action.kind === "create" || activeTask !== undefined);
  const title = action?.kind === "create" ? "Nueva tarea"
    : action?.kind === "child" ? `Nueva subtarea de ${activeTask?.name ?? ""}`
    : action?.kind === "dependencies" ? `Dependencias de ${activeTask?.name ?? ""}`
    : action?.kind === "state" ? "Cambiar estado" : "Editar datos de tarea";

  async function refreshAfterMutation(success: string) {
    setMessage(success);
    try { await loadTasks(); }
    catch (failure) { setMessage(`${success}. No se pudo actualizar la lista: ${errorText(failure)}`); }
  }

  async function save(data: TaskFormPayload) {
    setBusy(true);
    try {
      if (action?.kind === "edit" && activeTask && !("state_code" in data)) {
        await updateTask(projectId, activeTask.id, data);
      } else if ((action?.kind === "create" || action?.kind === "child") && "state_code" in data) {
        await createTask(projectId, data);
      } else { throw new Error("La acción ya no está disponible. Vuelve a abrir el formulario."); }
      setAction(null);
      await refreshAfterMutation("Tarea guardada");
    } finally { setBusy(false); }
  }

  async function state(data: TaskStatePayload) {
    if (!activeTask || action?.kind !== "state") throw new Error("La tarea ya no está disponible.");
    setBusy(true);
    try {
      await changeTaskState(projectId, activeTask.id, data);
      setAction(null);
      await refreshAfterMutation("Estado actualizado");
    } finally { setBusy(false); }
  }

  async function dependency(id: number, remove: boolean) {
    if (!activeTask || action?.kind !== "dependencies") throw new Error("La tarea ya no está disponible.");
    setBusy(true);
    try {
      await changeDependency(projectId, activeTask.id, id, remove);
      await refreshAfterMutation(remove ? "Dependencia retirada" : "Dependencia agregada");
    } finally { setBusy(false); }
  }

  function configured(configuration: ProjectTaskConfiguration) {
    setProject((current) => current ? { ...current, task_states: configuration } : current);
    setMessage("Estados del proyecto actualizados");
    void loadTasks().catch((failure: unknown) => {
      setMessage(`Estados guardados. No se pudo actualizar la lista: ${errorText(failure)}`);
    });
  }

  function actionForm(currentProject: Project): ReactNode {
    if (!action) return null;
    if (action.kind === "create") return <TaskForm project={currentProject} catalogs={catalogs}
      onSubmit={save} onConfigured={configured} onClose={() => setAction(null)} />;
    if (!activeTask) return null;
    switch (action.kind) {
      case "edit": return <TaskForm project={currentProject} catalogs={catalogs} task={activeTask}
        onSubmit={save} onConfigured={configured} onClose={() => setAction(null)} />;
      case "child": return <TaskForm project={currentProject} catalogs={catalogs} parent={activeTask}
        onSubmit={save} onConfigured={configured} onClose={() => setAction(null)} />;
      case "state": return <TaskStateForm task={activeTask} states={currentProject.task_states.states} onSubmit={state} />;
      case "dependencies": return <DependencyForm task={activeTask} tasks={tasks} onChange={dependency} />;
    }
  }

  if (loading) return <main className="dashboard" id="main-content"><p role="status">Cargando proyecto…</p></main>;
  if (error || !project) return <main className="dashboard" id="main-content">
    <p className="form-message form-message--error" role="alert">{error || "Proyecto no disponible"}</p>
    <Link to="/proyectos">Volver a proyectos</Link>
  </main>;

  return (
    <main className={`dashboard ${styles.workspace}`} id="main-content">
      <header className="page-header">
        <div className="page-header__copy">
          <nav className="breadcrumb" aria-label="Ruta de navegación">
            <ol><li><Link to="/proyectos">G. Proyectos</Link></li><li aria-current="page">{project.name}</li></ol>
          </nav>
          <h1>{project.name}</h1>
          <p>{project.description}</p>
          <p className="field-hint">{project.areas.map((area) => area.name).join(" · ")} · {
            project.available ? "Disponible dentro del sistema" : "Con participantes asignados"}</p>
          <p className="field-hint">{project.start_date ?? "Sin fecha inicial"} — {project.end_date ?? "Sin fecha final"}</p>
        </div>
        {project.permissions.create_tasks && <button className="primary-button" type="button" disabled={busy}
          onClick={() => { setMessage(""); setAction({ kind: "create" }); }}>+ Nueva tarea</button>}
      </header>
      {message && <p className="form-message" role="status">{message}</p>}
      {creationError && <p className="form-message form-message--error" role="alert">{creationError}</p>}
      {project.requirements.length > 0 && <section aria-label="Requisitos existentes del proyecto"><LabelList labels={project.requirements} /></section>}
      <DashboardSection title="Lista de trabajo" description={`${tasks.length} tareas y subtareas visibles`}>
        <div className={styles.taskList}>
          {tasks.length > 0 ? <TaskTree tasks={tasks} catalogs={catalogs}
            onAction={(kind, taskId) => { setMessage(""); setAction({ kind, taskId }); }} />
            : <p>No hay tareas disponibles para tu asignación. {project.permissions.create_tasks && "Crea la primera tarea para comenzar."}</p>}
        </div>
      </DashboardSection>
      {action && !activeAction && <p className="form-message form-message--error" role="alert">
        La tarea ya no está disponible. Vuelve a seleccionar una tarea de la lista.
      </p>}
      {activeAction && <Modal busy={busy} title={title} onClose={() => setAction(null)}>{actionForm(project)}</Modal>}
    </main>
  );
}
