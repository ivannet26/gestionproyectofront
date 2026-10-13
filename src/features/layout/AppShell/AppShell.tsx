import { useEffect, useState } from "react";
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
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const canViewAdmin = user.permissions.manage_accounts;
  const canCreateProject = user.role === "ADMINISTRADOR";
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

  return (
    <div className="flex min-h-screen bg-white text-neutral-900">
      <Sidebar
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed((current) => !current)}
        user={user}
        onLogout={onLogout}
        currentPath={pathname}
      />
      <div className="w-full flex-1 p-10 bg-white">
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
