import { useEffect, useRef, useState } from "react";
import { Route, Routes, useLocation, useNavigate } from "react-router";
import type { SessionUser } from "../../auth/api";
import { errorText } from "../../auth/api";
import { appRoutes, projectPath } from "../../../routes";
import type { AppRoute } from "../../../routes";
import { getProjectCatalogs, getProjects } from "../../projects/services";
import type {
  Project,
  ProjectCatalogs,
  ProjectSummary,
  TaskCreationRequest,
} from "../../projects/types";
import CreateProjectModal from "../../projects/CreateProjectModal/CreateProjectModal";
import NotAvailable from "../NotAvailable/NotAvailable";
import Sidebar from "../Sidebar/Sidebar";

interface AppShellProps {
  user: SessionUser;
  onLogout: () => void;
  logoutError: string;
}

function AppShell({ user, onLogout, logoutError }: AppShellProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [catalogs, setCatalogs] = useState<ProjectCatalogs>({
    areas: [],
    states: [],
    priorities: [],
  });
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [projectError, setProjectError] = useState("");
  const [creating, setCreating] = useState(false);
  const [taskCreationRequest, setTaskCreationRequest] =
    useState<TaskCreationRequest | null>(null);
  const taskCreationSequence = useRef(0);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const canViewAdmin = user.permissions.manage_accounts;
  const canCreateProject = user.role === "ADMINISTRADOR";
  const canCreateTasks =
    user.role === "ADMINISTRADOR" || user.role === "TRABAJADOR";
  const creationDisabled = projectsLoading || Boolean(projectError);

  useEffect(() => {
    let current = true;
    void Promise.all([getProjects(), getProjectCatalogs()])
      .then(([items, options]) => {
        if (current) {
          setProjects(items);
          setCatalogs(options);
          setProjectError("");
        }
      })
      .catch((failure: unknown) => {
        if (current) setProjectError(errorText(failure));
      })
      .finally(() => {
        if (current) setProjectsLoading(false);
      });
    return () => {
      current = false;
    };
  }, [user]);

  function openProjectCreation() {
    if (canCreateProject && !creationDisabled) setCreating(true);
  }

  function projectCreated(project: Project) {
    setProjects((current) => [
      project,
      ...current.filter((item) => item.id !== project.id),
    ]);
    setCreating(false);
    void navigate(projectPath(project.id));
  }

  function openTaskCreation(projectId: number) {
    const project = projects.find((item) => item.id === projectId);
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

  function taskCreationHandled(sequence: number) {
    setTaskCreationRequest((current) =>
      current?.sequence === sequence ? null : current,
    );
  }

  function routeRoute(route: AppRoute) {
    if (route.requiresAdmin && !canViewAdmin) return <NotAvailable />;
    switch (route.kind) {
      case "dashboard":
        return (
          <route.Component
            onCreateProject={canCreateProject ? openProjectCreation : undefined}
            creationDisabled={creationDisabled}
          />
        );
      case "projectList":
        return (
          <route.Component
            projects={projects}
            loading={projectsLoading}
            error={projectError}
            canCreate={canCreateProject}
            creationDisabled={creationDisabled}
            onCreate={openProjectCreation}
          />
        );
      case "project":
        return (
          <route.Component
            catalogs={catalogs}
            catalogLoading={projectsLoading}
            catalogError={projectError}
            taskCreationRequest={taskCreationRequest}
            onTaskCreationHandled={taskCreationHandled}
          />
        );
      case "accounts":
        return <route.Component />;
    }
  }

  const gridClasses = isSidebarCollapsed
    ? "grid-cols-[82px_1fr]"
    : "grid-cols-[270px_1fr]";

  return (
    <div className={`grid min-h-screen bg-neutral-50 text-neutral-900 ${gridClasses}`}>
      <div className="flex flex-col h-full bg-white border-r border-neutral-200">
        <Sidebar
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed((current) => !current)}
          user={user}
          onLogout={onLogout}
          currentPath={pathname}
          projects={projects}
          canCreateProject={canCreateProject}
          projectCreationDisabled={creationDisabled}
          onCreateProject={openProjectCreation}
          projectsLoading={projectsLoading}
          projectError={projectError}
          canCreateTasks={canCreateTasks}
          onCreateTask={openTaskCreation}
        />
      </div>
      <div className="min-w-0 flex-1 overflow-hidden">
        {logoutError && (
          <p className="mx-6 mt-4 border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900" role="alert">
            {logoutError}
          </p>
        )}
        {pathname === "/" && projectError && (
          <p className="mx-6 mt-4 border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900" role="alert">
            Gestión de proyectos: {projectError}
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
      {creating && canCreateProject && (
        <CreateProjectModal
          catalogs={catalogs}
          onClose={() => setCreating(false)}
          onCreated={projectCreated}
        />
      )}
    </div>
  );
}

export default AppShell;