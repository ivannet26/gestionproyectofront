import { Suspense, lazy, useEffect, useRef, useState } from "react";
import { Route, Routes, useLocation, useNavigate } from "react-router";
import type { AppRoute } from "../../../routes";
import { appRoutes, projectPath } from "../../../routes";
import type { SessionUser } from "../../auth/api";
import { useRemoteResource } from "../../../hooks/useRemoteResource";
import { useLoading } from "../../../hooks/useLoading";
import { useProjectDirectory } from "../../projects/useProjectDirectory";
import { projectDirectoryChanged } from "../../projects/projectDirectoryEvents";
import Modal from "../../projects/Modal/Modal";
import { getProjectCatalogs } from "../../projects/services";
import type {
  Project,
  ProjectSummary,
  ProjectCatalogs,
  TaskCreationRequest,
} from "../../projects/types";
import NotAvailable from "../NotAvailable/NotAvailable";
import Sidebar from "../Sidebar/Sidebar";

const CreateProjectModal = lazy(() => import("../../projects/CreateProjectModal/CreateProjectModal"));

interface AppShellProps {
  user: SessionUser;
  onLogout: () => void;
  logoutError?: string;
}

export default function AppShell({ user, onLogout, logoutError }: AppShellProps) {
  const [creating, setCreating] = useState(false);
  const [taskCreationRequest, setTaskCreationRequest] =
    useState<TaskCreationRequest | null>(null);
  const taskCreationSequence = useRef(0);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [listSearch, setListSearch] = useState("");
  const { hideLoading } = useLoading();
  const mainDirectory = useProjectDirectory({ search: listSearch }, pathname === "/proyectos" || pathname === "/proyectos/resumen");
  useEffect(() => { hideLoading(); }, [hideLoading]);

  const canViewAdmin = user.permissions.manage_accounts;
  const canCreateProject = user.role === "ADMINISTRADOR";
  const canCreateTasks =
    user.role === "ADMINISTRADOR" || user.role === "TRABAJADOR";
  const creationDisabled = false;
  const projectWorkspace = /^\/proyectos\/\d+$/.test(pathname);
  const needsCatalogs = creating || projectWorkspace;
  const catalogResource = useRemoteResource(getProjectCatalogs, "project-catalogs", needsCatalogs);
  const catalogs: ProjectCatalogs = catalogResource.value ?? { areas: [], states: [], priorities: [] };
  const catalogsReady = catalogResource.ready;
  const catalogLoading = catalogResource.pending;
  const catalogError = catalogResource.error;
  const retryCatalogs = catalogResource.refetch;

  function openProjectCreation() {
    if (canCreateProject && !creationDisabled) setCreating(true);
  }

  function projectCreated(project: Project) {
    projectDirectoryChanged(project.areas.map((area) => area.id));
    void mainDirectory.reload();
    setCreating(false);
    void navigate(projectPath(project.id));
  }

  function taskCreationHandled(sequence: number) {
    setTaskCreationRequest((current) =>
      current?.sequence === sequence ? null : current,
    );
  }

  function openTaskCreation(projectId: number, project: ProjectSummary) {
    if (!canCreateTasks || project.id !== projectId || !project.permissions.create_tasks) return;
    taskCreationSequence.current += 1;
    setTaskCreationRequest({
      projectId,
      sequence: taskCreationSequence.current,
    });
    void navigate(projectPath(projectId));
  }

  function routeRoute(route: AppRoute) {
    if (route.requiresAdmin && !canViewAdmin) return <NotAvailable />;
    if (route.path === "/") {
      return (
        <route.Component
          onCreateProject={canCreateProject ? openProjectCreation : undefined}
          creationDisabled={creationDisabled}
        />
      );
    }
    if ((route.path === "/proyectos" || route.path === "/proyectos/resumen")) {
      return (
        <route.Component
          directory={mainDirectory}
          search={listSearch}
          onSearch={setListSearch}
          canCreate={canCreateProject}
          creationDisabled={creationDisabled}
          onCreate={openProjectCreation}
        />
      );
    }
    if (route.path === "/proyectos/:projectId") {
      return (
        <route.Component
          catalogs={catalogs}
          catalogLoading={catalogLoading}
          catalogError={catalogError}
          onRetryCatalogs={retryCatalogs}
          taskCreationRequest={taskCreationRequest}
          onTaskCreationHandled={taskCreationHandled}
        />
      );
    }
    if (route.path === "/publicaciones" || route.path === "/equipos" || route.path === "/equipos/:teamId") return <route.Component canManage={user.role === "ADMINISTRADOR"} />;
    if (route.path === "/configuracion") return <route.Component user={user} />;
    return <route.Component />;
  }

  return (
    <div className="flex min-h-screen flex-col bg-white text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100 md:h-screen md:flex-row">
      <Sidebar
        user={user}
        onLogout={onLogout}
        canCreateProject={canCreateProject}
        projectCreationDisabled={creationDisabled}
        onCreateProject={openProjectCreation}
        canCreateTasks={canCreateTasks}
        onCreateTask={openTaskCreation}
      />
      <div
        className={`min-w-0 w-full flex-1 bg-white dark:bg-neutral-900 pb-0! p-3 md:p-6 ${
          projectWorkspace ? "md:overflow-hidden" : "md:overflow-y-auto"
        }`}
      >
        {logoutError && (
          <p
            role="alert"
            className="mb-4 text-sm text-neutral-800 dark:text-neutral-200"
          >
            {logoutError}
          </p>
        )}
        <Suspense fallback={<p role="status" className="text-xs text-neutral-600 dark:text-neutral-400">Cargando…</p>}>
          <Routes>
            {appRoutes.map((route) => (
              <Route
                key={route.path}
                path={route.path}
                element={routeRoute(route)}
              />
            ))}
            <Route path="*" element={<NotAvailable />} />
          </Routes>
        </Suspense>
      </div>
      <Suspense fallback={<p role="status">Cargando formulario…</p>}>
      {creating &&
        canCreateProject &&
        (catalogsReady ? (
          <CreateProjectModal
            catalogs={catalogs}
            onClose={() => setCreating(false)}
            onCreated={projectCreated}
          />
        ) : (
          <Modal
            title="Crear proyecto"
            onClose={() => setCreating(false)}
            projectComposer
          >
            {catalogError ? (
              <>
                <p role="alert">{catalogError}</p>
                <button type="button" onClick={() => { void retryCatalogs(); }}>
                  Reintentar catálogos
                </button>
              </>
            ) : (
              <p role="status">Cargando catálogos…</p>
            )}
          </Modal>
        ))}
      </Suspense>
    </div>
  );
}
