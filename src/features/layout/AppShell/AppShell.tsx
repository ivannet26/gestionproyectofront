import { useCallback, useEffect, useRef, useState } from "react";
import { Route, Routes, useLocation, useNavigate } from "react-router";
import type { AppRoute } from "../../../routes";
import { appRoutes, projectPath } from "../../../routes";
import type { SessionUser } from "../../auth/api";
import { errorText } from "../../auth/api";
import { useRemoteResource } from "../../../hooks/useRemoteResource";
import { useLoading } from "../../../hooks/useLoading";
import { useProjectDirectory } from "../../projects/useProjectDirectory";
import CreateProjectModal from "../../projects/CreateProjectModal/CreateProjectModal";
import DashboardPage from "../../dashboard/DashboardPage/DashboardPage";
import Modal from "../../projects/Modal/Modal";
import ProjectList from "../../projects/ProjectList/ProjectList";
import ProjectRoute from "../../projects/ProjectRoute/ProjectRoute";
import { getProjectCatalogs, getProject } from "../../projects/services";
import type {
  Project,
  ProjectCatalogs,
  TaskCreationRequest,
} from "../../projects/types";
import NotAvailable from "../NotAvailable/NotAvailable";
import Sidebar from "../Sidebar/Sidebar";

interface AppShellProps {
  user: SessionUser;
  onLogout: () => void;
  logoutError: string;
}

function AppShell({ user, onLogout, logoutError }: AppShellProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [catalogs, setCatalogs] = useState<ProjectCatalogs>({
    areas: [],
    states: [],
    priorities: [],
  });
  const [creating, setCreating] = useState(false);
  const [catalogsReady, setCatalogsReady] = useState(false);
  const [catalogError, setCatalogError] = useState("");
  const [catalogReload, setCatalogReload] = useState(0);
  const [taskCreationRequest, setTaskCreationRequest] =
    useState<TaskCreationRequest | null>(null);
  const taskCreationSequence = useRef(0);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [projectSearch, setProjectSearch] = useState("");
  const [listSearch, setListSearch] = useState("");
  const { hideLoading } = useLoading();
  const directory = useProjectDirectory({ search: projectSearch, associated: true });
  const mainDirectory = useProjectDirectory({ search: listSearch }, pathname === "/proyectos" || pathname === "/proyectos/resumen");
  const projects = directory.data, projectsLoading = directory.pending, projectError = directory.error;
  const activeId = Number(pathname.match(/^\/proyectos\/(\d+)$/)?.[1]);
  const activeOnPage = projects.find((item) => item.id === activeId);
  const active = useRemoteResource(useCallback(() => getProject(activeId), [activeId]),
    "current-project:" + activeId, Number.isSafeInteger(activeId) && activeId > 0 && !activeOnPage);
  const currentProject = activeOnPage ?? active.value;
  useEffect(() => { if (!directory.loading) hideLoading(); }, [directory.loading, hideLoading]);

  const canViewAdmin = user.permissions.manage_accounts;
  const canCreateProject = user.role === "ADMINISTRADOR";
  const canCreateTasks =
    user.role === "ADMINISTRADOR" || user.role === "TRABAJADOR";
  const creationDisabled = false;
  const projectWorkspace = /^\/proyectos\/\d+$/.test(pathname);
  const needsCatalogs = creating || projectWorkspace;
  const catalogLoading = needsCatalogs && !catalogsReady && !catalogError;

  useEffect(() => {
    if (!needsCatalogs || catalogsReady) return;
    let current = true;
    void getProjectCatalogs()
      .then((options) => {
        if (current) {
          setCatalogs(options);
          setCatalogsReady(true);
          setCatalogError("");
        }
      })
      .catch((failure: unknown) => {
        if (current) setCatalogError(errorText(failure));
      });
    return () => {
      current = false;
    };
  }, [needsCatalogs, catalogsReady, catalogReload]);

  function retryCatalogs() {
    setCatalogError("");
    setCatalogReload((current) => current + 1);
  }

  function openProjectCreation() {
    if (canCreateProject && !creationDisabled) setCreating(true);
  }

  function projectCreated(project: Project) {
    void directory.reload();
    void mainDirectory.reload();
    setCreating(false);
    void navigate(projectPath(project.id));
  }

  function taskCreationHandled(sequence: number) {
    setTaskCreationRequest((current) =>
      current?.sequence === sequence ? null : current,
    );
  }

  function openTaskCreation(projectId: number) {
    const project = projects.find((item) => item.id === projectId) ?? (currentProject?.id === projectId ? currentProject : null);
    if (
      !canCreateTasks ||
      projectsLoading ||
      !project?.permissions.create_tasks
    )
      return;
    taskCreationSequence.current += 1;
    setTaskCreationRequest({
      projectId,
      sequence: taskCreationSequence.current,
    });
    void navigate(projectPath(projectId));
  }

  function routeRoute(route: AppRoute) {
    if (route.requiresAdmin && !canViewAdmin) return <NotAvailable />;
    if (route.Component === DashboardPage) {
      return (
        <route.Component
          onCreateProject={canCreateProject ? openProjectCreation : undefined}
          creationDisabled={creationDisabled}
        />
      );
    }
    if (route.Component === ProjectList) {
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
    if (route.Component === ProjectRoute) {
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
    if (route.path === "/equipos" || route.path === "/equipos/:teamId") return <route.Component canManage={user.role === "ADMINISTRADOR"} />;
    return <route.Component />;
  }

  return (
    <div className="flex min-h-screen flex-col bg-white text-neutral-900 md:h-screen md:flex-row">
      <Sidebar
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed((current) => !current)}
        user={user}
        onLogout={onLogout}
        currentPath={pathname}
        projects={projects}
        projectsLoading={projectsLoading}
        projectError={projectError}
        onRetryProjects={directory.refetch}
        directoryNavigation={directory.navigation}
        projectSearch={projectSearch}
        onProjectSearch={setProjectSearch}
        currentProject={!activeOnPage && currentProject?.has_associated_workers ? currentProject : null}
        canCreateProject={canCreateProject}
        projectCreationDisabled={creationDisabled}
        onCreateProject={openProjectCreation}
        canCreateTasks={canCreateTasks}
        onCreateTask={openTaskCreation}
      />
      <div
        className={`min-w-0 w-full flex-1 bg-white pb-0! p-3 md:p-6 ${projectWorkspace ? "md:overflow-hidden" : "md:overflow-y-auto"}`}
      >
        {logoutError && (
          <p role="alert" className="mb-4 text-sm text-neutral-800">
            {logoutError}
          </p>
        )}
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
      </div>
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
                <button type="button" onClick={retryCatalogs}>
                  Reintentar catálogos
                </button>
              </>
            ) : (
              <p role="status">Cargando catálogos…</p>
            )}
          </Modal>
        ))}
    </div>
  );
}

export default AppShell;
